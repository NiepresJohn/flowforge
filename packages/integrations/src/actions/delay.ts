import type { Integration } from "@flowforge/shared";

/**
 * Delay action: pauses the flow for a configured duration.
 * Demonstrates a node that yields control back to the worker via setTimeout.
 */
export const delay: Integration = {
	manifest: {
		id: "flowforge.core",
		name: "Core utilities",
		description: "Built-in helpers.",
		icon: "⚙️",
		version: "0.1.0",
		author: "flowforge",
		triggers: [],
		actions: [
			{
				integrationId: "flowforge.core",
				operationKey: "delay",
				name: "Delay",
				description: "Wait for a number of seconds before continuing.",
				type: "action",
				configSchema: {
					seconds: {
						type: "number",
						label: "Seconds to wait",
						optional: true,
						default: 5,
					},
				},
			},
		],
	},
	execute: async (ctx) => {
		const { seconds } = ctx.config as { seconds?: number };
		const ms = Math.max(0, Math.floor((seconds ?? 5) * 1000));
		await new Promise((resolve) => setTimeout(resolve, ms));
		return { waited: ms };
	},
};
