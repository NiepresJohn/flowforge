import { config } from "@flowforge/config";
import { type Job, Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

export const executionQueue = new Queue(config.queueName, { connection });

/** Payload for a single "run this flow" job. */
export interface ExecutionJobData {
	flowId: string;
	triggerData: Record<string, unknown>;
	/** Bypasses webhook HMAC when true (manual test runs from the UI). */
	manualRun?: boolean;
}

export function enqueueExecution(
	flowId: string,
	triggerData: Record<string, unknown>,
	opts: { manualRun?: boolean } = {},
): Promise<Job<ExecutionJobData>> {
	return executionQueue.add(
		"run",
		{ flowId, triggerData, manualRun: opts.manualRun ?? false },
		{
			// Retry transient failures with a small exponential backoff.
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
			removeOnComplete: true,
			removeOnFail: true,
		},
	);
}

export { connection as redisConnection };
