import type { Integration } from "@flowforge/shared";

/**
 * HTTP Request action: performs an outbound request using a Mustache-like
 * template for the URL, headers and body. Templates interpolate prior
 * node outputs via `{{ nodeKey }}`.
 */
export const httpRequest: Integration = {
	manifest: {
		id: "flowforge.http",
		name: "HTTP Request",
		description: "Make an outbound HTTP request from your flow.",
		icon: "🌐",
		version: "0.1.0",
		author: "flowforge",
		actions: [
			{
				integrationId: "flowforge.http",
				operationKey: "request",
				name: "Request",
				description: "Send an HTTP request and capture the response.",
				type: "action",
				configSchema: {
					method: {
						type: "select",
						label: "Method",
						options: ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({
							value: m,
							label: m,
						})),
						default: "GET",
					},
					url: {
						type: "string",
						label: "URL",
						description: "May use {{ variables }} from prior steps.",
					},
					headers: {
						type: "object",
						label: "Headers (JSON object)",
						optional: true,
					},
					body: {
						type: "string",
						label: "Body (JSON or raw string)",
						optional: true,
					},
					responseOutput: {
						type: "string",
						label: "Output variable",
						description: "Key under which the parsed response is stored.",
						optional: true,
						default: "body",
					},
				},
			},
		],
		triggers: [],
	},
	execute: async (ctx) => {
		const { method, url, headers, body, responseOutput } = ctx.config as {
			method: string;
			url: string;
			headers?: Record<string, string>;
			body?: string;
			responseOutput?: string;
		};

		const resolvedUrl = interpolate(ctx, url);
		const resolvedHeaders = resolveHeaders(ctx, headers);
		const resolvedBody = body ? interpolate(ctx, body) : undefined;

		const init: RequestInit = { method, headers: resolvedHeaders };
		if (resolvedBody !== undefined) init.body = resolvedBody;

		const res = await fetch(resolvedUrl, init);

		const text = await res.text();
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = text;
		}

		return {
			[responseOutput ?? "body"]: parsed,
			status: res.status,
			statusText: res.statusText,
		};
	},
};

function interpolate(
	ctx: { input: Record<string, unknown> },
	template: string,
): string {
	return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
		const value = getPath(ctx.input, path);
		return value === undefined ? "" : String(value);
	});
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((acc, key) => {
		if (acc && typeof acc === "object" && key in acc) {
			return (acc as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj);
}

function resolveHeaders(
	ctx: { input: Record<string, unknown> },
	headers?: Record<string, string>,
): Record<string, string> {
	if (!headers) return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(headers)) {
		out[k] = interpolate(ctx, String(v));
	}
	return out;
}
