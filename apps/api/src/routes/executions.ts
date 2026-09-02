import { executionSteps, executions, getDb } from "@flowforge/db";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { enqueueExecution } from "../queue.js";

const db = getDb();
const router = Router({ mergeParams: true });

/** List executions for a flow (or all). */
router.get("/:flowId/executions", async (req, res, next) => {
	try {
		const rows = await db
			.select()
			.from(executions)
			.where(eq(executions.flowId, req.params.flowId))
			.orderBy(desc(executions.createdAt))
			.limit(50);
		res.json(rows);
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
