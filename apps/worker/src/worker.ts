import { RedisBus } from "@flowforge/bus";
import { config } from "@flowforge/config";
import { getDb } from "@flowforge/db";
import { ExecutionError, runFlow } from "@flowforge/executor";
import { type ExecutionJobData, redisConnection } from "@flowforge/queue";
import { type Job, Worker } from "bullmq";

const db = getDb();
const bus = new RedisBus();

/**
 * Worker process: pulls execution jobs off the queue and runs the flow via
 * the shared executor. Events are published to the Redis bus, which the API
 * forwards to any subscribed WebSocket clients.
 */
const worker = new Worker<ExecutionJobData>(
	config.queueName,
	async (job: Job<ExecutionJobData>) => {
		await runFlow(db, job.data.flowId, {
			triggerData: job.data.triggerData,
			jobId: job.id ?? undefined,
			bus,
		});
	},
	{ connection: redisConnection, concurrency: config.executionConcurrency },
);

worker.on("failed", (job, err) => {
	const reason = err instanceof ExecutionError ? err.message : String(err);
	console.error(`[worker] job ${job?.id ?? "?"} failed: ${reason}`);
});

worker.on("error", (err) => {
	console.error("[worker] worker error", err);
});

console.log(
	`[worker] consuming "${config.queueName}" (concurrency=${config.executionConcurrency})`,
);

// Graceful shutdown
process.on("SIGTERM", async () => {
	await worker.close();
	bus.disconnect();
	process.exit(0);
});
