import type { ExecutionContext } from "@flowforge/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpRequest } from "./http-request.js";

function ctx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
	return {
		flowId: "flow-1",
		nodeId: "node-1",
		executionId: "exec-1",
		config: {},
		input: {},
		secrets: {},
		...overrides,
	};
}

describe("httpRequest", () => {
	const originalFetch = globalThis.fetch;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("sends a GET request with an interpolated URL", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				statusText: "OK",
				headers: { "Content-Type": "application/json" },
			}),
		);

		const result = await httpRequest.execute(
			ctx({
				config: {
					method: "GET",
					url: "https://api.example.com/users/{{ userId }}",
				},
				input: { userId: 42 },
			}),
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.example.com/users/42",
			expect.objectContaining({ method: "GET" }),
		);
		const out = result as { status: number; body: unknown };
		expect(out.status).toBe(200);
		expect(out.body).toEqual({ ok: true });
	});

	it("interpolates headers from prior output", async () => {
		fetchMock.mockResolvedValue(new Response("ok", { status: 201 }));

		await httpRequest.execute(
			ctx({
				config: {
					method: "POST",
					url: "https://api.example.com/hook",
					headers: { Authorization: "Bearer {{ token }}" },
					body: "{}",
				},
				input: { token: "abc123" },
			}),
		);

		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe("https://api.example.com/hook");
		expect((init as RequestInit).headers).toEqual({
			Authorization: "Bearer abc123",
		});
	});

	it("resolves a missing variable to an empty string", async () => {
		fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

		await httpRequest.execute(
			ctx({
				config: { method: "GET", url: "https://x.test/{{ missing }}" },
				input: {},
			}),
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://x.test/",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("stores parsed JSON under a custom responseOutput key", async () => {
		fetchMock.mockResolvedValue(new Response("[1, 2, 3]", { status: 200 }));

		const result = await httpRequest.execute(
			ctx({
				config: {
					method: "GET",
					url: "https://api.example.com/items",
					responseOutput: "items",
				},
			}),
		);

		expect(result).toBeDefined();
		const out = result as { items: unknown; status: number };
		expect(out.items).toEqual([1, 2, 3]);
		expect(out.status).toBe(200);
	});
});
