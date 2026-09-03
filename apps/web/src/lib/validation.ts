import type { IntegrationManifest, NodeDefinition } from "@flowforge/shared";
import type { Edge, Node } from "reactflow";

export interface ValidationError {
	type: "error" | "warning";
	message: string;
	nodeId?: string;
}

export interface FlowValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

interface NodeData {
	label: string;
	operationKey: string;
	integrationId: string;
	nodeType: "trigger" | "action";
	config: Record<string, unknown>;
}

/**
 * Validate a flow before execution.
 * Checks for common issues that would cause execution failures.
 */
export function validateFlow(
	nodes: Node<NodeData>[],
	edges: Edge[],
	manifests: IntegrationManifest[],
): FlowValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];

	// Check for empty flow
	if (nodes.length === 0) {
		errors.push({
			type: "error",
			message: "Flow has no nodes. Add at least a trigger node.",
		});
		return { valid: false, errors, warnings };
	}

	// Check for trigger node
	const triggerNodes = nodes.filter((n) => n.data.nodeType === "trigger");
	if (triggerNodes.length === 0) {
		errors.push({
			type: "error",
			message: "Flow must have a trigger node.",
		});
	} else if (triggerNodes.length > 1) {
		errors.push({
			type: "error",
			message: "Flow can only have one trigger node.",
		});
	}

	// Check for disconnected nodes
	const connectedNodeIds = new Set<string>();
	for (const edge of edges) {
		connectedNodeIds.add(edge.source);
		connectedNodeIds.add(edge.target);
	}

	for (const node of nodes) {
		if (node.data.nodeType === "action" && !connectedNodeIds.has(node.id)) {
			warnings.push({
				type: "warning",
				message: `"${node.data.label}" is not connected to any other node and will be skipped.`,
				nodeId: node.id,
			});
		}
	}

	// Check for cycles (simple DFS)
	if (hasCycle(nodes, edges)) {
		errors.push({
			type: "error",
			message: "Flow contains a cycle. Flows must be acyclic.",
		});
	}

	// Validate node configurations
	for (const node of nodes) {
		const def = findOperation(
			manifests,
			node.data.integrationId,
			node.data.operationKey,
		);
		if (!def) {
			errors.push({
				type: "error",
				message: `Unknown operation: ${node.data.integrationId}/${node.data.operationKey}`,
				nodeId: node.id,
			});
			continue;
		}

		// Check required config fields
		const configErrors = validateNodeConfig(def, node.data.config);
		for (const msg of configErrors) {
			errors.push({
				type: "error",
				message: `${node.data.label}: ${msg}`,
				nodeId: node.id,
			});
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

function findOperation(
	manifests: IntegrationManifest[],
	integrationId: string,
	operationKey: string,
): NodeDefinition | null {
	for (const m of manifests) {
		if (m.id !== integrationId) continue;
		const op = [...m.actions, ...m.triggers].find(
			(o) => o.operationKey === operationKey,
		);
		if (op) return op;
	}
	return null;
}

function validateNodeConfig(
	def: NodeDefinition,
	config: Record<string, unknown>,
): string[] {
	const errors: string[] = [];
	const schema = def.configSchema;

	for (const [key, field] of Object.entries(schema)) {
		const value = config[key];
		const isMissing = value === undefined || value === null || value === "";

		if (!field.optional && isMissing) {
			errors.push(`Missing required field: ${field.label || key}`);
		}
	}

	return errors;
}

function hasCycle(nodes: Node[], edges: Edge[]): boolean {
	const adjacency = new Map<string, string[]>();
	for (const node of nodes) {
		adjacency.set(node.id, []);
	}
	for (const edge of edges) {
		adjacency.get(edge.source)?.push(edge.target);
	}

	const visited = new Set<string>();
	const recursionStack = new Set<string>();

	function dfs(nodeId: string): boolean {
		visited.add(nodeId);
		recursionStack.add(nodeId);

		for (const neighbor of adjacency.get(nodeId) ?? []) {
			if (!visited.has(neighbor)) {
				if (dfs(neighbor)) return true;
			} else if (recursionStack.has(neighbor)) {
				return true;
			}
		}

		recursionStack.delete(nodeId);
		return false;
	}

	for (const node of nodes) {
		if (!visited.has(node.id)) {
			if (dfs(node.id)) return true;
		}
	}

	return false;
}
