import { flowEdges, flowNodes, getDb } from "@flowforge/db";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

const db = getDb();
const router = Router({ mergeParams: true });

const nodeSchema = z.object({
	integrationId: z.string(),
	operationKey: z.string(),
	config: z.record(z.any()).optional(),
	position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const edgeSchema = z.object({
	sourceNodeId: z.string(),
	targetNodeId: z.string(),
});

router.post("/:flowId/nodes", async (req, res, next) => {
	try {
		const { integrationId, operationKey, config, position } = nodeSchema.parse(
			req.body,
		);
		const nodeType =
			integrationId === "flowforge.webhook" ? "trigger" : "action";
		const [node] = await db
			.insert(flowNodes)
			.values({
				flowId: req.params.flowId,
				type: nodeType,
				integrationId,
				operationKey,
				config: config ?? {},
				positionX: String(position?.x ?? 0),
				positionY: String(position?.y ?? 0),
			})
			.returning();
		if (!node) {
			res.status(500).json({ error: "failed to create node" });
			return;
		}
		res.status(201).json(node);
	} catch (e) {
		next(e);
	}
});

router.patch("/:flowId/nodes/:nodeId", async (req, res, next) => {
	try {
		const patch = nodeSchema.partial().parse(req.body);
		const updates: {
			config?: Record<string, unknown>;
			positionX?: string;
			positionY?: string;
		} = {};
		if (patch.config !== undefined) updates.config = patch.config;
		if (patch.position) {
			updates.positionX = String(patch.position.x);
			updates.positionY = String(patch.position.y);
		}
		const [updated] = await db
			.update(flowNodes)
			.set(updates)
			.where(eq(flowNodes.id, req.params.nodeId))
			.returning();
		if (!updated) {
			res.status(404).json({ error: "node not found" });
			return;
		}
		res.json(updated);
	} catch (e) {
		next(e);
	}
});

router.delete("/:flowId/nodes/:nodeId", async (req, res, next) => {
	try {
		await db.delete(flowNodes).where(eq(flowNodes.id, req.params.nodeId));
		res.status(204).send();
	} catch (e) {
		next(e);
	}
});

router.post("/:flowId/edges", async (req, res, next) => {
	try {
		const { sourceNodeId, targetNodeId } = edgeSchema.parse(req.body);
		const [edge] = await db
			.insert(flowEdges)
			.values({ flowId: req.params.flowId, sourceNodeId, targetNodeId })
			.returning();
		if (!edge) {
			res.status(500).json({ error: "failed to create edge" });
			return;
		}
		res.status(201).json(edge);
	} catch (e) {
		next(e);
	}
});

router.delete("/:flowId/edges/:edgeId", async (req, res, next) => {
	try {
		await db.delete(flowEdges).where(eq(flowEdges.id, req.params.edgeId));
		res.status(204).send();
	} catch (e) {
		next(e);
	}
});

export default router;
