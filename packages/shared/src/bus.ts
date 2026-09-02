import type { ExecutionStepStatus } from "./types.js";

/** Events published by the executor, bridged to WebSocket clients by the API. */
export interface ExecutionEvent {
	executionId: string;
	jobId: string | undefined;
	flowId: string;
	type:
		| "execution.started"
		| "execution.completed"
		| "execution.failed"
		| "step.started"
		| "step.completed"
		| "step.failed";
	payload: StepEvent | ExecutionLifecyclePayload;
}

export interface StepEvent {
	stepId: string;
	nodeId: string;
	operationKey: string;
	status: ExecutionStepStatus;
}

/** Lifecycle events for an entire execution run. */
export interface ExecutionLifecyclePayload {
	status: "running" | "success" | "failed" | "cancelled";
	error?: string;
}

/**
 * Minimal bus the executor depends on. The API implements it with Redis
 * pub/sub; a no-op/null bus is available for unit testing.
 */
export interface ExecutionBus {
	publish(event: ExecutionEvent): Promise<void> | void;
}

export class NullBus implements ExecutionBus {
	publish(_event: ExecutionEvent): void {}
}
