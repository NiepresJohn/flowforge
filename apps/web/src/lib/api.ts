import type { ExecutionEvent } from "@flowforge/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const base = "/api";

export interface ApiNode {
	id: string;
	flowId: string;
	type: "trigger" | "action";
	integrationId: string;
	operationKey: string;
	config: Record<string, unknown>;
	position: { x: number; y: number };
}

export interface ApiEdge {
	id: string;
	flowId: string;
	sourceNodeId: string;
	targetNodeId: string;
}

export interface ApiFlow {
	id: string;
	name: string;
	description: string;
	active: boolean;
	triggerNodeId: string | null;
	createdAt: string;
	updatedAt: string;
	webhookPath: string | null;
	nodes: ApiNode[];
	edges: ApiEdge[];
}

export interface ConfigFieldSchema {
	type: "string" | "number" | "boolean" | "select" | "secret" | "object";
	label: string;
	description?: string;
	optional?: boolean;
	default?: unknown;
	options?: { value: string; label: string }[];
}

export interface NodeDefinition {
	integrationId: string;
	operationKey: string;
	name: string;
	description: string;
	type: "trigger" | "action";
	configSchema: Record<string, ConfigFieldSchema>;
}

export interface IntegrationManifest {
	id: string;
	name: string;
	description: string;
	icon: string;
	version: string;
	author: string;
	triggers: NodeDefinition[];
	actions: NodeDefinition[];
}

export interface JobRef {
	jobId: string;
}

export async function fetchJson<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(`${base}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...((init?.headers ?? {}) as Record<string, string>),
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HTTP ${res.status}: ${text}`);
	}
	return res.json() as T;
}

export const api = {
	listFlows: () => fetchJson<ApiFlow[]>("/flows"),
	getFlow: (id: string) => fetchJson<ApiFlow>(`/flows/${id}`),
	createFlow: (data: { name: string; description?: string }) =>
		fetchJson<ApiFlow>("/flows", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateFlow: (
		id: string,
		data: { name?: string; description?: string; active?: boolean },
	) =>
		fetchJson<ApiFlow>(`/flows/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	deleteFlow: (id: string) =>
		fetchJson<void>(`/flows/${id}`, { method: "DELETE" }),
	listIntegrations: () => fetchJson<IntegrationManifest[]>("/integrations"),

	addNode: (
		flowId: string,
		node: {
			integrationId: string;
			operationKey: string;
			config?: Record<string, unknown>;
			position?: { x: number; y: number };
		},
	) =>
		fetchJson<ApiNode>(`/flows/${flowId}/nodes`, {
			method: "POST",
			body: JSON.stringify(node),
		}),
	updateNode: (
		flowId: string,
		nodeId: string,
		patch: {
			config?: Record<string, unknown>;
			position?: { x: number; y: number };
		},
	) =>
		fetchJson<ApiNode>(`/flows/${flowId}/nodes/${nodeId}`, {
			method: "PATCH",
			body: JSON.stringify(patch),
		}),
	deleteNode: (flowId: string, nodeId: string) =>
		fetchJson<void>(`/flows/${flowId}/nodes/${nodeId}`, { method: "DELETE" }),

	addEdge: (
		flowId: string,
		edge: { sourceNodeId: string; targetNodeId: string },
	) =>
		fetchJson<ApiEdge>(`/flows/${flowId}/edges`, {
			method: "POST",
			body: JSON.stringify(edge),
		}),
	deleteEdge: (flowId: string, edgeId: string) =>
		fetchJson<void>(`/flows/${flowId}/edges/${edgeId}`, { method: "DELETE" }),

	runFlow: (flowId: string, triggerData?: Record<string, unknown>) =>
		fetchJson<JobRef>(`/flows/${flowId}/run`, {
			method: "POST",
			body: JSON.stringify(triggerData ?? {}),
		}),
};

// --- React Query hooks -----------------------------------------------------

export function useFlows() {
	return useQuery({ queryKey: ["flows"], queryFn: () => api.listFlows() });
}

export function useFlow(id: string) {
	return useQuery({
		queryKey: ["flow", id],
		queryFn: () => api.getFlow(id),
		enabled: id.length > 0,
	});
}

export function useIntegrations() {
	return useQuery({
		queryKey: ["integrations"],
		queryFn: () => api.listIntegrations(),
	});
}

export function useCreateFlow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; description?: string }) =>
			api.createFlow(data),
		onSuccess: (flow) => {
			qc.setQueryData(["flows"], (prev: ApiFlow[] | undefined) =>
				prev ? [...prev, flow] : [flow],
			);
		},
	});
}

export function useUpdateNode() {
	return useMutation({
		mutationFn: ({
			flowId,
			nodeId,
			patch,
		}: {
			flowId: string;
			nodeId: string;
			patch: {
				config?: Record<string, unknown>;
				position?: { x: number; y: number };
			};
		}) => api.updateNode(flowId, nodeId, patch),
	});
}

export function useAddNode() {
	return useMutation({
		mutationFn: ({
			flowId,
			node,
		}: {
			flowId: string;
			node: {
				integrationId: string;
				operationKey: string;
				config?: Record<string, unknown>;
				position?: { x: number; y: number };
			};
		}) => api.addNode(flowId, node),
	});
}

export function useDeleteNode() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ flowId, nodeId }: { flowId: string; nodeId: string }) =>
			api.deleteNode(flowId, nodeId),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ["flow", vars.flowId] });
		},
	});
}

export function useAddEdge() {
	return useMutation({
		mutationFn: ({
			flowId,
			edge,
		}: {
			flowId: string;
			edge: { sourceNodeId: string; targetNodeId: string };
		}) => api.addEdge(flowId, edge),
	});
}

export function useDeleteEdge() {
	return useMutation({
		mutationFn: ({ flowId, edgeId }: { flowId: string; edgeId: string }) =>
			api.deleteEdge(flowId, edgeId),
	});
}

export function useRunFlow() {
	return useMutation({
		mutationFn: ({
			flowId,
			triggerData,
		}: {
			flowId: string;
			triggerData?: Record<string, unknown>;
		}) => api.runFlow(flowId, triggerData),
	});
}

// --- WebSocket live monitor ------------------------------------------------

export function subscribeExecution(
	jobId: string,
	onEvent: (event: ExecutionEvent) => void,
): WebSocket {
	const proto = location.protocol === "https:" ? "wss" : "ws";
	const ws = new WebSocket(`${proto}://${location.host}/ws`);
	ws.onopen = () =>
		ws.send(JSON.stringify({ type: "subscribe", executionId: jobId }));
	ws.onmessage = (ev) => {
		try {
			onEvent(JSON.parse(ev.data) as ExecutionEvent);
		} catch {
			// ignore malformed messages
		}
	};
	ws.onerror = (ev) => console.error("[ws] error", ev);
	return ws;
}

export type { ExecutionEvent };
