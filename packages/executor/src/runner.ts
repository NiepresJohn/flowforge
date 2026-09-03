import type { Db } from "@flowforge/db";
import {
	executionSteps,
	executions,
	flowEdges,
	flowNodes,
	flows,
} from "@flowforge/db";
import { getIntegration } from "@flowforge/integrations";
import {
	type Execution,
	type ExecutionBus,
	type ExecutionEvent,
	type ExecutionStep,
	type Flow,
	type FlowEdge,
	type FlowNode,
	NullBus,
} from "@flowforge/shared";
import { eq } from "drizzle-orm";
import { resolveCreds } from "./credentials.js";
import { orderNodes, reachableNodes } from "./graph.js";

export class ExecutionError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message, { cause });
		this.name = "ExecutionError";
	}
}

export interface RunOptions {
	/** Trigger payload (e.g. the incoming webhook body). */
	triggerData: Record<string, unknown>;
	/** BullMQ job id, echoed on events so clients can monitor by jobId. */
	jobId: string | undefined;
	bus?: ExecutionBus;
}

/**
 * Execute a flow end-to-end. Loads the graph, runs each node in dependency
 * order, persists step IO, and publishes progress events to the bus.
 */
export async function runFlow(
	db: Db,
	flowId: string,
	opts: RunOptions,
): Promise<Execution> {
	const bus = opts.bus ?? new NullBus();
	const flow = await loadFlow(db, flowId);
	const nodes = await loadNodes(db, flowId);
	const edges = await loadEdges(db, flowId);
	const jobId = opts.jobId;

	const ordered = orderNodes(nodes, edges, flow.triggerNodeId);
	await assertReachable(ordered, edges, flow.triggerNodeId);

	// Create the execution record.
	const [execution] = await db
		.insert(executions)
		.values({
			flowId: flow.id,
			status: "running",
			triggerData: opts.triggerData,
		})
		.returning();
	if (!execution) throw new ExecutionError("failed to create execution row");

	await bus.publish({
		executionId: execution.id,
		jobId,
		flowId: flow.id,
		type: "execution.started",
		payload: { status: "running" },
	});

	const context: Record<string, unknown> = {};

	// Track which nodes are skipped due to conditional branching.
	const skippedNodes = new Set<string>();

	try {
		for (const node of ordered) {
			// Skip nodes that are children of a failed condition branch.
			if (skippedNodes.has(node.id)) {
				await skipNode(db, bus, node, execution.id, jobId, flow.id);
				continue;
			}

			const result = await runNode(
				db,
				bus,
				node,
				execution.id,
				jobId,
				flow.id,
				{ input: { ...context, ...opts.triggerData } },
			);

			// If this is a condition node that returned false, mark all
			// downstream nodes (that aren't also reachable via another path)
			// as skipped.
			if (
				node.integrationId === "flowforge.core" &&
				node.operationKey === "condition" &&
				(result.output as Record<string, unknown> | undefined)?.["matched"] ===
					false
			) {
				const descendants = getDescendants(node.id, edges);
				for (const id of descendants) {
					if (!hasAlternatePath(id, node.id, edges, ordered)) {
						skippedNodes.add(id);
					}
				}
			}

			// Merge node output into shared context so downstream nodes can
			// reference prior outputs by operationKey.
			Object.assign(context, result.output ?? {});
		}
	} catch (err) {
		await bus.publish({
			executionId: execution.id,
			jobId,
			flowId: flow.id,
			type: "execution.failed",
			payload: {
				status: "failed",
				error: err instanceof Error ? err.message : String(err),
			},
		});
		await db
			.update(executions)
			.set({ status: "failed", finishedAt: new Date().toISOString() })
			.where(eq(executions.id, execution.id));
		throw err;
	}

	await db
		.update(executions)
		.set({ status: "success", finishedAt: new Date().toISOString() })
		.where(eq(executions.id, execution.id));

	await bus.publish({
		executionId: execution.id,
		jobId,
		flowId: flow.id,
		type: "execution.completed",
		payload: { status: "success" },
	});

	return {
		id: execution.id,
		flowId: flow.id,
		status: "success",
		triggerData: opts.triggerData,
		createdAt: new Date(execution.createdAt),
		startedAt: execution.startedAt ? new Date(execution.startedAt) : null,
		finishedAt: new Date(),
	};
}

interface NodeInput {
	input: Record<string, unknown>;
}

async function runNode(
	db: Db,
	bus: ExecutionBus,
	node: FlowNode,
	executionId: string,
	jobId: string | undefined,
	flowId: string,
	{ input }: NodeInput,
) {
	// Create the pending step row so progress can be tracked even on failure.
	const [step] = await db
		.insert(executionSteps)
		.values({
			executionId,
			nodeId: node.id,
			operationKey: node.operationKey,
			status: "pending",
			config: node.config,
			input,
		})
		.returning();
	if (!step) throw new ExecutionError("failed to create execution step row");

	await bus.publish(
		stepEvent(executionId, jobId, flowId, step.id, node, "running"),
	);

	const integration = getIntegration(node.integrationId);
	if (!integration) {
		await finishStep(db, bus, step.id, node, executionId, jobId, flowId, {
			status: "failed",
			error: { message: `unknown integration: ${node.integrationId}` },
		});
		throw new ExecutionError(`unknown integration: ${node.integrationId}`);
	}

	await db
		.update(executionSteps)
		.set({ status: "running", startedAt: new Date().toISOString() })
		.where(eq(executionSteps.id, step.id));

	const secrets = await resolveCreds(db, node.integrationId, node.config);

	try {
		const output = await integration.execute({
			flowId,
			nodeId: node.id,
			executionId,
			config: node.config,
			input,
			secrets,
		});
		await finishStep(db, bus, step.id, node, executionId, jobId, flowId, {
			status: "success",
			output,
		});
		return { output };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await finishStep(db, bus, step.id, node, executionId, jobId, flowId, {
			status: "failed",
			error: { message },
		});
		throw new ExecutionError(
			`node ${node.operationKey} failed: ${message}`,
			err,
		);
	}
}

function stepEvent(
	executionId: string,
	jobId: string | undefined,
	flowId: string,
	stepId: string,
	node: FlowNode,
	status: ExecutionStep["status"],
): ExecutionEvent {
	return {
		executionId,
		jobId,
		flowId,
		type: status === "running" ? "step.started" : "step.completed",
		payload: {
			stepId,
			nodeId: node.id,
			operationKey: node.operationKey,
			status,
		},
	};
}

async function finishStep(
	db: Db,
	bus: ExecutionBus,
	stepId: string,
	node: FlowNode,
	executionId: string,
	jobId: string | undefined,
	flowId: string,
	upd: {
		status: ExecutionStep["status"];
		output?: Record<string, unknown>;
		error?: { message: string; code?: string };
	},
) {
	await db
		.update(executionSteps)
		.set({
			status: upd.status,
			output: upd.output ?? null,
			error: upd.error ?? null,
			finishedAt: new Date().toISOString(),
		})
		.where(eq(executionSteps.id, stepId));
	await bus.publish({
		executionId,
		jobId,
		flowId,
		type:
			upd.status === "success"
				? "step.completed"
				: upd.status === "failed"
					? "step.failed"
					: "step.started",
		payload: {
			stepId,
			nodeId: node.id,
			operationKey: node.operationKey,
			status: upd.status,
		},
	});
}

// --- DB loaders -----------------------------------------------------------

async function loadFlow(db: Db, flowId: string): Promise<Flow> {
	const rows = await db.select().from(flows).where(eq(flows.id, flowId));
	if (rows.length === 0) throw new ExecutionError(`flow not found: ${flowId}`);
	const row = rows[0];
	if (!row) throw new ExecutionError(`flow not found: ${flowId}`);
	if (!row.triggerNodeId) {
		throw new ExecutionError(`flow ${flowId} has no trigger node configured`);
	}
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		active: row.active,
		triggerNodeId: row.triggerNodeId,
		createdAt: new Date(row.createdAt),
		updatedAt: new Date(row.updatedAt),
	};
}

async function loadNodes(db: Db, flowId: string): Promise<FlowNode[]> {
	const rows = await db
		.select()
		.from(flowNodes)
		.where(eq(flowNodes.flowId, flowId));
	return rows.map(
		(r): FlowNode => ({
			id: r.id,
			flowId: r.flowId,
			type: r.type,
			integrationId: r.integrationId,
			operationKey: r.operationKey,
			config: (r.config ?? {}) as Record<string, unknown>,
			position: { x: Number(r.positionX), y: Number(r.positionY) },
		}),
	);
}

async function loadEdges(db: Db, flowId: string): Promise<FlowEdge[]> {
	const rows = await db
		.select()
		.from(flowEdges)
		.where(eq(flowEdges.flowId, flowId));
	return rows.map(
		(r): FlowEdge => ({
			id: r.id,
			flowId: r.flowId,
			sourceNodeId: r.sourceNodeId,
			targetNodeId: r.targetNodeId,
		}),
	);
}

async function assertReachable(
	ordered: FlowNode[],
	edges: FlowEdge[],
	triggerNodeId: string,
): Promise<void> {
	const reachable = reachableNodes(ordered, edges, triggerNodeId);
	for (const node of ordered) {
		if (!reachable.has(node.id)) {
			throw new ExecutionError(
				`node ${node.id} is not reachable from the trigger`,
			);
		}
	}
}

// --- Conditional branching helpers ----------------------------------------

/** Mark a node as skipped in the execution steps. */
async function skipNode(
	db: Db,
	bus: ExecutionBus,
	node: FlowNode,
	executionId: string,
	jobId: string | undefined,
	flowId: string,
): Promise<void> {
	await db.insert(executionSteps).values({
		executionId,
		nodeId: node.id,
		operationKey: node.operationKey,
		status: "skipped",
		config: node.config,
		input: {},
	});
	await bus.publish({
		executionId,
		jobId,
		flowId,
		type: "step.completed",
		payload: {
			stepId: "",
			nodeId: node.id,
			operationKey: node.operationKey,
			status: "skipped",
		},
	});
}

/** Get all descendant node ids reachable from `startId` via edges. */
function getDescendants(startId: string, edges: FlowEdge[]): Set<string> {
	const adj = new Map<string, string[]>();
	for (const edge of edges) {
		const list = adj.get(edge.sourceNodeId) ?? [];
		list.push(edge.targetNodeId);
		adj.set(edge.sourceNodeId, list);
	}

	const seen = new Set<string>();
	const stack = [startId];
	while (stack.length > 0) {
		const id = stack.pop()!;
		for (const next of adj.get(id) ?? []) {
			if (!seen.has(next)) {
				seen.add(next);
				stack.push(next);
			}
		}
	}
	return seen;
}

/**
 * Check if `nodeId` has an incoming edge from a node other than `excludeSource`.
 * Used to determine if a node should still be executed even if one parent
 * branch is skipped.
 */
function hasAlternatePath(
	nodeId: string,
	excludeSource: string,
	edges: FlowEdge[],
	ordered: FlowNode[],
): boolean {
	const orderedIds = new Set(ordered.map((n) => n.id));
	for (const edge of edges) {
		if (edge.targetNodeId === nodeId && edge.sourceNodeId !== excludeSource) {
			if (orderedIds.has(edge.sourceNodeId)) return true;
		}
	}
	return false;
}
