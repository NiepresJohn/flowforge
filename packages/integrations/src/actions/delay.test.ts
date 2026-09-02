import type { ExecutionContext } from "@flowforge/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { delay } from "./delay.js";

function ctx(config: Record<string, unknown>): ExecutionContext {
	return {
		flowId: "flow-1",
		nodeId: "node-1",
		executionId: "exec-1",
		config,
		input: {},
		secrets: {},
	};
}

/** Replace setTimeout so the delay promise resolves immediately. */
function mockImmediateTimers() {
	return vi.spyOn(globalThis, "setTimeout").mockImplementation(((
		fn: () => void,
	) => {
		fn();
		return 0 as unknown as NodeJS.Timeout;
	}) as typeof setTimeout);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("delay", () => {
	it("defaults to 5 seconds when no config is given", async () => {
		const setTimeoutSpy = mockImmediateTimers();
		const result = await delay.execute(ctx({}));
		expect(result).toEqual({ waited: 5000 });
		expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
	});

	it("waits the configured number of seconds", async () => {
		const setTimeoutSpy = mockImmediateTimers();
		const result = await delay.execute(ctx({ seconds: 2 }));
		const out = result as { waited: number };
		expect(out.waited).toBe(2000);
		expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
	});

	it("clamps negative seconds to zero", async () => {
		const result = await delay.execute(ctx({ seconds: -10 }));
		const out = result as { waited: number };
		expect(out.waited).toBe(0);
	});
});
