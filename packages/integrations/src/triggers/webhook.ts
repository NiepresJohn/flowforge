import type { Integration } from "@flowforge/shared";

/**
 * Webhook trigger: exposes a public POST endpoint per flow. Upstream
 * services POST a payload here to start an execution run.
 *
 * At runtime the API matches the `webhook_token` config against a stored
 * `webhookEndpoints` row and hydrates `ctx.input` with the incoming body.
 */
export const webhookTrigger: Integration = {
	manifest: {
		id: "flowforge.webhook",
		name: "Webhook",
		description: "Trigger a flow when an HTTP request hits a public endpoint.",
		icon: "🔗",
		version: "0.1.0",
		author: "flowforge",
		triggers: [
			{
				integrationId: "flowforge.webhook",
				operationKey: "webhook_received",
				name: "Webhook Received",
				description:
					"Starts a flow. POST to the generated /webhook/:path endpoint.",
				type: "trigger",
				configSchema: {
					method: {
						type: "select",
						label: "HTTP Method",
						options: [
							{ value: "POST", label: "POST" },
							{ value: "PUT", label: "PUT" },
							{ value: "PATCH", label: "PATCH" },
						],
					},
					responseStatus: {
						type: "number",
						label: "Response status",
						description: "Status code returned to the caller.",
						optional: true,
						default: 200,
					},
				},
			},
		],
		actions: [],
	},
	execute: async (ctx) => {
		// The trigger is a no-op at execution time — the API hydrates the
		// incoming HTTP body into ctx.input before enqueueing the worker.
		// We return the payload so downstream nodes can consume it.
		return ctx.input;
	},
};
