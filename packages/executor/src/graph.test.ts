import type { FlowEdge, FlowNode } from "@flowforge/shared";
import { describe, expect, it } from "vitest";
import { orderNodes, reachableNodes } from "./graph.js";

function node(id: string): FlowNode {
	return {
		id,
		flowId: "flow-1",
		type: "action",
		integrationId: "flowforge.core",
		operationKey: "delay",
		config: {},
		position: { x: 0, y: 0 },
	};
}

function trigger(id: string): FlowNode {
	return { ...node(id), type: "trigger" };
}

function edge(sourceNodeId: string, targetNodeId: string): FlowEdge {
	return {
		id: `${sourceNodeId}->${targetNodeId}`,
		flowId: "flow-1",
		sourceNodeId,
		targetNodeId,
	};
}

describe("orderNodes", () => {
	it("orders a single trigger node", () => {
		const n = trigger("t");
		const result = orderNodes([n], [], "t");
		expect(result.map((x) => x.id)).toEqual(["t"]);
	});

	it("orders a linear chain trigger -> a -> b", () => {
		const t = trigger("t");
		const a = node("a");
		const b = node("b");
		const result = orderNodes([b, a, t], [edge("t", "a"), edge("a", "b")], "t");
		expect(result.map((x) => x.id)).toEqual(["t", "a", "b"]);
	});

	it("orders a branching graph deterministically", () => {
		const t = trigger("t");
		const a = node("a");
		const b = node("b");
		const result = orderNodes([b, a, t], [edge("t", "a"), edge("t", "b")], "t");
		const ids = result.map((x) => x.id);
		expect(ids[0]).toBe("t");
		expect(new Set(ids)).toEqual(new Set(["t", "a", "b"]));
	});

	it("throws when a non-trigger subgraph contains a cycle", () => {
		const t = trigger("t");
		const a = node("a");
		const b = node("b");
		// t -> a -> b -> a: the a/b subgraph cycles and never drains.
		expect(() =>
			orderNodes(
				[t, a, b],
				[edge("t", "a"), edge("a", "b"), edge("b", "a")],
				"t",
			),
		).toThrow(/cycle/);
	});

	it("throws when the trigger has incoming edges", () => {
		const t = trigger("t");
		const a = node("a");
		expect(() => orderNodes([a, t], [edge("a", "t")], "t")).toThrow(
			/trigger node must have no incoming edges/,
		);
	});

	it("seeds disconnected zero-in-degree nodes (deterministic order)", () => {
		const t = trigger("t");
		const a = node("a");
		const orphan = node("orphan");
		const result = orderNodes([t, a, orphan], [edge("t", "a")], "t");
		const ids = result.map((x) => x.id);
		expect(ids.length).toBe(3);
		expect(ids[0]).toBe("t");
		expect(new Set(ids)).toEqual(new Set(["t", "a", "orphan"]));
	});
});

describe("reachableNodes", () => {
	it("returns every node on a simple path", () => {
		const t = trigger("t");
		const a = node("a");
		const b = node("b");
		const seen = reachableNodes(
			[t, a, b],
			[edge("t", "a"), edge("a", "b")],
			"t",
		);
		expect([...seen].sort()).toEqual(["a", "b", "t"]);
	});

	it("excludes disconnected nodes", () => {
		const t = trigger("t");
		const a = node("a");
		const orphan = node("orphan");
		const seen = reachableNodes([t, a, orphan], [edge("t", "a")], "t");
		expect(seen.has("orphan")).toBe(false);
		expect(seen.has("a")).toBe(true);
	});

	it("handles multiple downstream targets", () => {
		const t = trigger("t");
		const a = node("a");
		const b = node("b");
		const seen = reachableNodes(
			[t, a, b],
			[edge("t", "a"), edge("t", "b")],
			"t",
		);
		expect(seen.size).toBe(3);
	});
});
