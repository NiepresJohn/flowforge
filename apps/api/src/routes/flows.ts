import {
	flowEdges,
	flowNodes,
	flows,
	getDb,
	webhookEndpoints,
} from "@flowforge/db";
import { listManifests } from "@flowforge/integrations";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const db = getDb();
const router = Router();

const createFlowSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	triggerType: z.enum(["webhook", "cron"]).default("webhook"),
});

const updateFlowSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	active: z.boolean().optional(),
});

router.get("/", async (_req, res, next) => {
	try {
		const all = await db.select().from(flows).orderBy(flows.createdAt);
		res.json(all);
	} catch (e) {
		next(e);
	}
});

router.post("/", async (req, res, next) => {
	try {
		const { name, description, triggerType } = createFlowSchema.parse(req.body);

		// Find the appropriate trigger integration.
		const triggerOp = listManifests()
			.flatMap((m) => m.triggers)
			.find((t) => {
				if (triggerType === "cron") return t.integrationId === "flowforge.cron";
				return t.integrationId === "flowforge.webhook";
			});
		if (!triggerOp)
			throw new Error(`${triggerType} trigger integration not registered`);

		const [flow] = await db
			.insert(flows)
			.values({ name, description: description ?? "", triggerType })
			.returning();
		if (!flow) throw new Error("failed to create flow");

		// Insert the flow, its trigger node, and the webhook endpoint in one
		// transaction, then wire the trigger node id onto the flow row.
		await db.transaction(async (tx) => {
			const triggerNode = await tx
				.insert(flowNodes)
				.values({
					flowId: flow.id,
					type: "trigger",
					integrationId: triggerOp.integrationId,
					operationKey: triggerOp.operationKey,
					config: {},
					positionX: "0",
					positionY: "0",
				})
				.returning();
			if (!triggerNode[0]) throw new Error("failed to create trigger node");

			await tx
				.update(flows)
				.set({ triggerNodeId: triggerNode[0].id })
				.where(eq(flows.id, flow.id));

			// Only webhook triggers get a webhook endpoint.
			if (triggerType === "webhook") {
				const { randomUUID, randomBytes } = await import("node:crypto");
				await tx.insert(webhookEndpoints).values({
					flowId: flow.id,
					path: randomUUID().slice(0, 12),
					secret: randomBytes(32).toString("hex"),
				});
			}
		});

		res.status(201).json(flow);
	} catch (e) {
		next(e);
	}
});

router.get("/:id", async (req, res, next) => {
	try {
		const rows = await db
			.select()
			.from(flows)
			.where(eq(flows.id, req.params.id));
		const f = rows[0];
		if (!f) {
			res.status(404).json({ error: "flow not found" });
			return;
		}

		const dbNodes = await db
			.select()
			.from(flowNodes)
			.where(eq(flowNodes.flowId, f.id));
		const dbEdges = await db
			.select()
			.from(flowEdges)
			.where(eq(flowEdges.flowId, f.id));
		const dbHooks = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.flowId, f.id));

		const triggerNode = dbNodes.find((n) => n.type === "trigger");
		res.json({
			id: f.id,
			name: f.name,
			description: f.description,
			active: f.active,
			triggerType: f.triggerType,
			triggerNodeId: triggerNode?.id ?? f.triggerNodeId,
			createdAt: f.createdAt,
			updatedAt: f.updatedAt,
			nodes: dbNodes.map((n) => ({
				id: n.id,
				flowId: n.flowId,
				type: n.type,
				integrationId: n.integrationId,
				operationKey: n.operationKey,
				config: n.config,
				position: { x: Number(n.positionX), y: Number(n.positionY) },
			})),
			edges: dbEdges.map((e) => ({
				id: e.id,
				flowId: e.flowId,
				sourceNodeId: e.sourceNodeId,
				targetNodeId: e.targetNodeId,
			})),
			webhookPath: dbHooks[0]?.path ?? null,
		});
	} catch (e) {
		next(e);
	}
});

router.patch("/:id", async (req, res, next) => {
	try {
		const patch = updateFlowSchema.parse(req.body);
		const [updated] = await db
			.update(flows)
			.set(patch)
			.where(eq(flows.id, req.params.id))
			.returning();
		if (!updated) {
			res.status(404).json({ error: "flow not found" });
			return;
		}
		res.json(updated);
	} catch (e) {
		next(e);
	}
});

router.delete("/:id", async (req, res, next) => {
	try {
		await db.delete(flows).where(eq(flows.id, req.params.id));
		res.status(204).send();
	} catch (e) {
		next(e);
	}
});

export default router;
