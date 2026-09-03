import type { Integration } from "@flowforge/shared";

/**
 * Cron trigger: runs a flow on a schedule. The API's scheduler evaluates
 * the cron expression and enqueues an execution when it fires. At runtime
 * this trigger simply returns the scheduled trigger time.
 */
export const cronTrigger: Integration = {
	manifest: {
		id: "flowforge.cron",
		name: "Schedule",
		description: "Trigger a flow on a recurring schedule (cron expression).",
		icon: "⏰",
		version: "0.1.0",
		author: "flowforge",
		triggers: [
			{
				integrationId: "flowforge.cron",
				operationKey: "schedule_trigger",
				name: "Schedule Trigger",
				description: "Runs the flow on a cron schedule.",
				type: "trigger",
				configSchema: {
					expression: {
						type: "string",
						label: "Cron Expression",
						description: "e.g. '*/5 * * * *' for every 5 minutes",
					},
					timezone: {
						type: "string",
						label: "Timezone",
						description: "IANA timezone, e.g. 'America/New_York'. Optional.",
						optional: true,
					},
				},
			},
		],
		actions: [],
	},
	execute: async () => {
		return { triggeredAt: new Date().toISOString(), source: "cron" };
	},
};
