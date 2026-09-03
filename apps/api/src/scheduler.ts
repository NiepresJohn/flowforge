import { flows, getDb } from "@flowforge/db";
import { Cron } from "croner";
import { eq, and } from "drizzle-orm";
import { enqueueExecution } from "./queue.js";

const db = getDb();

interface CronJob {
	flowId: string;
	expression: string;
	timezone?: string;
	cron: Cron;
}

let jobs: CronJob[] = [];
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Load all active cron flows and register their schedules.
 * Called on startup and can be called again to refresh.
 */
async function loadCronJobs(): Promise<void> {
	// Stop existing cron jobs.
	for (const job of jobs) job.cron.stop();
	jobs = [];

	const cronFlows = await db
		.select()
		.from(flows)
		.where(and(eq(flows.triggerType, "cron"), eq(flows.active, true)));

	for (const flow of cronFlows) {
		const node = flow.triggerNodeId;
		if (!node) continue;

		// We need to get the cron expression from the trigger node config.
		// The trigger node is loaded separately.
		const { flowNodes } = await import("@flowforge/db");
		const [triggerNode] = await db
			.select()
			.from(flowNodes)
			.where(eq(flowNodes.id, flow.triggerNodeId));

		const expression = triggerNode?.config?.expression as string | undefined;
		if (!expression) continue;

		try {
			const cron = new Cron(expression, {
				timezone: (triggerNode?.config?.timezone as string) ?? undefined,
				protect: true,
			});
			jobs.push({
				flowId: flow.id,
				expression,
				timezone: triggerNode?.config?.timezone as string,
				cron,
			});
		} catch (e) {
			console.error(`[scheduler] invalid cron for flow ${flow.id}:`, e);
		}
	}

	console.log(`[scheduler] loaded ${jobs.length} cron job(s)`);
}

/**
 * Evaluate all cron jobs and enqueue executions for any that should fire.
 */
function tick(): void {
	const now = new Date();
	for (const job of jobs) {
		try {
			const next = job.cron.msToNext(now);
			// If next fire is within the next 30 seconds, trigger now.
			if (next !== null && next <= 30_000) {
				console.log(`[scheduler] firing cron for flow ${job.flowId}`);
				enqueueExecution(job.flowId, {
					triggeredAt: new Date().toISOString(),
					source: "cron",
				}).catch((e) => {
					console.error(
						`[scheduler] failed to enqueue flow ${job.flowId}:`,
						e,
					);
				});
			}
		} catch (e) {
			console.error(`[scheduler] error evaluating cron ${job.flowId}:`, e);
		}
	}
}

/** Start the scheduler — runs every 30s. Returns a stop function. */
export function startScheduler(): () => void {
	if (intervalId) return stopScheduler;

	loadCronJobs().catch((e) => {
		console.error("[scheduler] failed to load cron jobs:", e);
	});

	intervalId = setInterval(tick, 30_000);

	return stopScheduler;
}

export function stopScheduler(): void {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
	for (const job of jobs) job.cron.stop();
	jobs = [];
}

/** Re-read flows and rebuild cron jobs (after flow create/update/delete). */
export async function refreshScheduler(): Promise<void> {
	await loadCronJobs();
}
