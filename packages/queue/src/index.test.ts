import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The real module constructs a Redis connection + BullMQ Queue at import
// time, so stub both before importing anything from the queue package.
const addMock = vi.fn();

vi.mock("bullmq", () => ({
	Queue: vi.fn().mockImplementation(() => ({ add: addMock })),
}));

vi.mock("ioredis", () => {
	return {
		Redis: vi.fn().mockImplementation(() => ({
			status: "wait",
			connect: vi.fn(),
			disconnect: vi.fn(),
			duplicate: vi.fn(),
		})),
	};
});

const { enqueueExecution } = await import("./index.js");
type ExecutionJobData = {
	flowId: string;
	triggerData: Record<string, unknown>;
	manualRun?: boolean;
};

describe("enqueueExecution", () => {
	beforeEach(() => {
		addMock.mockReset();
		addMock.mockResolvedValue({ id: "job-1" } as Job<ExecutionJobData>);
	});

	it("adds a run job with flowId and triggerData", async () => {
		const job = await enqueueExecution("flow-1", { hello: "world" });

		expect(job.id).toBe("job-1");
		expect(addMock).toHaveBeenCalledTimes(1);
		expect(addMock).toHaveBeenCalledWith(
			"run",
			{ flowId: "flow-1", triggerData: { hello: "world" }, manualRun: false },
			expect.objectContaining({
				attempts: 3,
				backoff: { type: "exponential", delay: 1000 },
				removeOnComplete: true,
				removeOnFail: true,
			}),
		);
	});

	it("marks manual runs when requested", async () => {
		await enqueueExecution("flow-2", {}, { manualRun: true });

		expect(addMock).toHaveBeenCalledWith(
			"run",
			{ flowId: "flow-2", triggerData: {}, manualRun: true },
			expect.any(Object),
		);
	});
});
