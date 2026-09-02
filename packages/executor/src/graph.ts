import type { FlowEdge, FlowNode } from "@flowforge/shared";

/**
 * Resolve the execution order of a flow's nodes via topological sort
 * (Kahn's algorithm). Returns nodes ordered trigger → first action → ….
 *
 * Throws if the graph is cyclic or disconnected from the trigger, which
 * would indicate a malformed flow that can't be executed.
 */
export function orderNodes(
	nodes: FlowNode[],
	edges: FlowEdge[],
	triggerNodeId: string,
): FlowNode[] {
	const byId = new Map<string, FlowNode>();
	for (const node of nodes) byId.set(node.id, node);

	const out = new Map<string, string[]>(); // source -> [target]
	const inDegree = new Map<string, number>();
	for (const node of nodes) {
		out.set(node.id, []);
		inDegree.set(node.id, 0);
	}

	for (const edge of edges) {
		const from = out.get(edge.sourceNodeId);
		if (from) from.push(edge.targetNodeId);
		inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
	}

	const queue: string[] = [];
	// Seed with the trigger (must have in-degree 0).
	if ((inDegree.get(triggerNodeId) ?? 1) !== 0) {
		throw new Error("trigger node must have no incoming edges");
	}
	queue.push(triggerNodeId);
	// Also seed any other zero in-degree nodes for a stable, deterministic order.
	for (const [id, deg] of inDegree) {
		if (deg === 0 && id !== triggerNodeId) queue.push(id);
	}

	const result: FlowNode[] = [];
	while (queue.length > 0) {
		const id = queue.shift()!;
		const node = byId.get(id);
		if (node) result.push(node);
		for (const target of out.get(id) ?? []) {
			const deg = inDegree.get(target)! - 1;
			inDegree.set(target, deg);
			if (deg === 0) queue.push(target);
		}
	}

	if (result.length !== nodes.length) {
		throw new Error("flow graph contains a cycle — cannot determine order");
	}

	return result;
}

/** Collect every node id reachable from `start`, for validation. */
export function reachableNodes(
	nodes: FlowNode[],
	edges: FlowEdge[],
	start: string,
): Set<string> {
	const adj = new Map<string, string[]>();
	for (const node of nodes) adj.set(node.id, []);
	for (const edge of edges) {
		const list = adj.get(edge.sourceNodeId);
		if (list) list.push(edge.targetNodeId);
	}
	const seen = new Set<string>();
	const stack = [start];
	while (stack.length > 0) {
		const id = stack.pop()!;
		if (seen.has(id)) continue;
		seen.add(id);
		for (const next of adj.get(id) ?? []) stack.push(next);
	}
	return seen;
}
