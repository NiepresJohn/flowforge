/**
 * Core domain types shared between API, worker, web, and integrations.
 * These are the canonical shapes; the DB schema (packages/db) maps to them.
 */

export type NodeId = string;
export type FlowId = string;
export type ExecutionId = string;
export type IntegrationId = string;
export type ExecutionStepId = string;

/** A node in a flow graph, either a trigger (entry point) or an action (work). */
export interface FlowNode {
	id: NodeId;
	flowId: FlowId;
	type: "trigger" | "action";
	/** References {@link Integration.id} */
	integrationId: IntegrationId;
	/** Stable key within the integration, e.g. "http-request" or "delay" */
	operationKey: string;
	/** User-provided config for this node, validated against the integration's schema */
	config: Record<string, unknown>;
	/** Canvas position */
	position: { x: number; y: number };
}

/** Directed edge from one node's output to another node's input. */
export interface FlowEdge {
	id: string;
	flowId: FlowId;
	sourceNodeId: NodeId;
	targetNodeId: NodeId;
}

/** A complete flow definition: trigger + chain of actions. */
export interface Flow {
	id: FlowId;
	name: string;
	description: string;
	active: boolean;
	/** The trigger node (entry point). Flows have exactly one trigger. */
	triggerNodeId: NodeId;
	createdAt: Date;
	updatedAt: Date;
}

export type Trigger = { input: Record<string, unknown> } | undefined;

/** Status of a single node's execution within a run. */
export type ExecutionStepStatus =
	| "pending"
	| "running"
	| "success"
	| "failed"
	| "skipped"
	| "cancelled";

/** Result of executing one node inside an execution run. */
export interface ExecutionStep {
	id: ExecutionStepId;
	executionId: ExecutionId;
	nodeId: NodeId;
	status: ExecutionStepStatus;
	/** Input payload handed to the node */
	input: Record<string, unknown>;
	/** Output returned by the node */
	output: Record<string, unknown> | null;
	error: { message: string; code?: string } | null;
	/** Resolved config used at runtime */
	config: Record<string, unknown>;
	startedAt: Date | null;
	finishedAt: Date | null;
}

/** Top-level execution run of a flow. */
export interface Execution {
	id: ExecutionId;
	flowId: FlowId;
	triggerData: Record<string, unknown>;
	status: "running" | "success" | "failed" | "cancelled";
	createdAt: Date;
	startedAt: Date | null;
	finishedAt: Date | null;
}

/** JSON Schema describing configuration fields an integration accepts. */
export interface ConfigFieldSchema {
	type: "string" | "number" | "boolean" | "select" | "secret" | "object";
	label: string;
	description?: string;
	optional?: boolean;
	default?: unknown;
	options?: { value: string; label: string }[];
}

export interface NodeDefinition {
	integrationId: IntegrationId;
	operationKey: string;
	name: string;
	description: string;
	type: "trigger" | "action";
	/** Maps field -> config schema */
	configSchema: Record<string, ConfigFieldSchema>;
}

export interface IntegrationManifest {
	id: IntegrationId;
	name: string;
	description: string;
	icon: string;
	version: string;
	author: string;
	/** Trigger(s) this integration can serve as a flow entry point */
	triggers: NodeDefinition[];
	/** Actions this integration exposes */
	actions: NodeDefinition[];
}

/** The live context handed to an integration node at execution time. */
export interface ExecutionContext {
	flowId: FlowId;
	nodeId: NodeId;
	executionId: ExecutionId;
	/** Resolved config for this specific node */
	config: Record<string, unknown>;
	/** Input payload: output of the previous node(s), or trigger payload */
	input: Record<string, unknown>;
	/**
	 * Secrets resolved from the credential store for this node
	 * (already decrypted for the running process only).
	 */
	secrets: Record<string, string>;
}

export interface Integration {
	manifest: IntegrationManifest;
	/**
	 * Execute this node. Must throw on failure with a serializable error.
	 * Return value becomes the node's `output` and the input to downstream nodes.
	 */
	execute: (ctx: ExecutionContext) => Promise<Record<string, unknown>>;
}
