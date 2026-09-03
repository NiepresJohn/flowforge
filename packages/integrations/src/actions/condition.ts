import type { ExecutionContext, Integration } from "@flowforge/shared";

/**
 * Conditional branch: evaluates a condition against the input and returns
 * `{ matched: boolean }`. The executor uses this to skip downstream nodes
 * when the condition is false.
 *
 * Supported operators: equals, not_equals, contains, gt, lt, exists, is_empty
 */
export const condition: Integration = {
	manifest: {
		id: "flowforge.core",
		name: "Core",
		description: "Built-in flow control and utilities.",
		icon: "⚙️",
		version: "0.1.0",
		author: "flowforge",
		triggers: [],
		actions: [
			{
				integrationId: "flowforge.core",
				operationKey: "condition",
				name: "Condition",
				description: "Branch based on a condition.",
				type: "action",
				configSchema: {
					field: {
						type: "string",
						label: "Field",
						description: "Dot-notation path, e.g. 'data.status'",
					},
					operator: {
						type: "select",
						label: "Operator",
						options: [
							{ value: "equals", label: "Equals" },
							{ value: "not_equals", label: "Not Equals" },
							{ value: "contains", label: "Contains" },
							{ value: "gt", label: "Greater Than" },
							{ value: "lt", label: "Less Than" },
							{ value: "exists", label: "Exists" },
							{ value: "is_empty", label: "Is Empty" },
						],
					},
					value: {
						type: "string",
						label: "Value",
						description: "Comparison value (ignored for exists/is_empty).",
						optional: true,
					},
				},
			},
		],
	},
	execute: async (ctx: ExecutionContext) => {
		const { field, operator, value } = ctx.config;
		const actual = resolvePath(ctx.input, String(field ?? ""));

		const matched = evaluate(actual, String(operator), value as string);
		return { matched, field, operator, expected: value, actual };
	},
};

function resolvePath(obj: unknown, path: string): unknown {
	if (!path) return obj;
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function evaluate(
	actual: unknown,
	operator: string,
	expected: string,
): boolean {
	switch (operator) {
		case "equals":
			return String(actual) === expected;
		case "not_equals":
			return String(actual) !== expected;
		case "contains":
			return String(actual).includes(expected);
		case "gt":
			return Number(actual) > Number(expected);
		case "lt":
			return Number(actual) < Number(expected);
		case "exists":
			return actual !== undefined && actual !== null;
		case "is_empty":
			if (actual == null) return true;
			if (typeof actual === "string") return actual.length === 0;
			if (Array.isArray(actual)) return actual.length === 0;
			if (typeof actual === "object") return Object.keys(actual).length === 0;
			return false;
		default:
			return false;
	}
}
