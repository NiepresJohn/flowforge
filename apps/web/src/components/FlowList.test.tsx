import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiFlow } from "../lib/api.js";

const listFlowsMock = vi.fn();

vi.mock("../lib/api.js", () => ({
	useFlows: () => listFlowsMock(),
	useCreateFlow: () => ({
		isPending: false,
		mutateAsync: vi.fn().mockResolvedValue({
			id: "flow-new",
			name: "New flow",
			description: "",
			active: false,
			triggerNodeId: null,
			createdAt: "",
			updatedAt: "",
			webhookPath: null,
			nodes: [],
			edges: [],
		}),
	}),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
	useNavigate: () => vi.fn(),
}));

import FlowList from "./FlowList.js";

const flow: ApiFlow = {
	id: "flow-1",
	name: "My first flow",
	description: "A test flow",
	active: true,
	triggerNodeId: "trigger-1",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	webhookPath: "abc123",
	nodes: [],
	edges: [],
};

describe("FlowList", () => {
	beforeEach(() => {
		listFlowsMock.mockReset();
	});

	it("shows the empty state when there are no flows", () => {
		listFlowsMock.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		});
		render(<FlowList />);
		expect(screen.getByText("My flows")).toBeInTheDocument();
		expect(screen.getByText(/No flows yet/)).toBeInTheDocument();
	});

	it("renders a list of flows", () => {
		listFlowsMock.mockReturnValue({
			data: [flow],
			isLoading: false,
			isError: false,
		});
		render(<FlowList />);
		expect(screen.getByText("My first flow")).toBeInTheDocument();
		expect(screen.getByText(/1 active workflow/)).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("wh: abc123")).toBeInTheDocument();
	});

	it("shows an error message when the query fails", () => {
		listFlowsMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		render(<FlowList />);
		expect(screen.getByText("Failed to load flows.")).toBeInTheDocument();
	});

	it("shows a loading indicator while fetching", () => {
		listFlowsMock.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		render(<FlowList />);
		expect(screen.getByText("Loading…")).toBeInTheDocument();
	});
});
