import { executionSteps, executions, getDb } from "@flowforge/db";
import { desc, eq, sql, and } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { enqueueExecution } from "../queue.js";

const db = getDb();
const router = Router({ mergeParams: true });

const listQuerySchema = z.object({
	status: z.enum(["running", "success", "failed", "cancelled"]).optional(),
	limit: z.coerce.number().min(1).max(100).default(20),
	offset: z.coerce.number().min(0).default(0),
});

/** List executions for a flow with pagination and optional status filter. */
router.get("/:flowId/executions", async (req, res, next) => {
	try {
		const { status, limit, offset } = listQuerySchema.parse(req.query);

		const conditions = [eq(executions.flowId, req.params.flowId)];
		if (status) conditions.push(eq(executions.status, status));

		const [items, total] = await Promise.all([
			db
				.select()
				.from(executions)
				.where(and(...conditions))
				.orderBy(desc(executions.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(executions)
				.where(and(...conditions)),
		]);

		res.json({
			items,
			total: total[0]?.count ?? 0,
			limit,
			offset,
		});
	} catch (e) {
		next(e);
	}
});

/** Get a single execution with its steps. */
router.get("/:flowId/executions/:executionId", async (req, res, next) => {
	try {
		const execRows = await db
			.select()
			.from(executions)
			.where(eq(executions.id, req.params.executionId));
		const execution = execRows[0];
		if (!execution) {
			res.status(404).json({ error: "execution not found" });
			return;
		}
		const steps = await db
			.select()
			.from(executionSteps)
			.where(eq(executionSteps.executionId, req.params.executionId));
		res.json({ execution, steps });
	} catch (e) {
		next(e);
	}
});

/** Manually trigger a flow run (for testing from the UI). */
router.post("/:flowId/run", async (req, res, next) => {
	try {
		const job = await enqueueExecution(req.params.flowId, req.body ?? {}, {
			manualRun: true,
		});
		res.status(202).json({ jobId: job.id });
	} catch (e) {
		next(e);
	}
});

export default router;
