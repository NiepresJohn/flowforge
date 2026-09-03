import { useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
	addEdge,
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	type NodeTypes,
	type OnConnect,
	useEdgesState,
	useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import {
	type ApiNode,
	type ConfigFieldSchema,
	type IntegrationManifest,
	type NodeDefinition,
	useAddNode,
	useDeleteNode,
	useFlow,
	useIntegrations,
	useRunFlow,
	useUpdateNode,
} from "../lib/api.js";
import CredentialsModal from "./CredentialsModal.js";
import ExecutionMonitor from "./ExecutionMonitor.js";

interface NodeData {
	label: string;
	operationKey: string;
	integrationId: string;
	nodeType: "trigger" | "action";
	config: Record<string, unknown>;
}

const nodeTypes: NodeTypes = {
	default: ({ data }: { data: NodeData }) => (
		<div className="px-3 py-2 text-sm">
			<div className="font-medium">{data.label}</div>
			<div className="text-xs text-slate-500">{data.operationKey}</div>
		</div>
	),
};

function toRfNode(n: ApiNode): Node<NodeData> {
	return {
		id: n.id,
		type: "default",
		position: n.position,
		data: {
			label: n.operationKey,
			operationKey: n.operationKey,
			integrationId: n.integrationId,
			nodeType: n.type,
			config: n.config,
		},
	};
}

export default function FlowBuilder() {
	const { flowId } = useParams({ from: "/flows/$flowId" });
	const { data: flow } = useFlow(flowId as string);
	const { data: manifests = [] } = useIntegrations();

	const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<unknown>([]);
	const [selected, setSelected] = useState<Node<NodeData> | null>(null);
	const [monitorOpen, setMonitorOpen] = useState(false);
	const [credentialsOpen, setCredentialsOpen] = useState(false);
	const [jobId, setJobId] = useState("");

	const addNodeMut = useAddNode();
	const updateNodeMut = useUpdateNode();
	const deleteNodeMut = useDeleteNode();
	const runMut = useRunFlow();

	// Sync RF state when the flow loads or refetches.
	useEffect(() => {
		if (!flow) return;
		const rfNodes: Node<NodeData>[] = flow.nodes.map(toRfNode);
		const rfEdges: Edge[] = flow.edges.map((e) => ({
			id: e.id,
			source: e.sourceNodeId,
			target: e.targetNodeId,
			type: "smoothstep",
		}));
		setNodes(rfNodes);
		setEdges(rfEdges);
		setSelected(null);
	}, [flow, setNodes, setEdges]);

	const onConnect: OnConnect = (params) =>
		setEdges((eds) => addEdge(params, eds));

	const selectedNodeDef = useMemo(() => {
		if (!selected) return null;
		return findOperation(
			manifests,
			selected.data.integrationId,
			selected.data.operationKey,
		);
	}, [selected, manifests]);

	const addAction = async (def: NodeDefinition) => {
		const created = await addNodeMut.mutateAsync({
			flowId: flowId as string,
			node: {
				integrationId: def.integrationId,
				operationKey: def.operationKey,
				config: {},
				position: { x: 200, y: 200 },
			},
		});
		setNodes((prev) => [...prev, toRfNode(created)]);
	};

	const run = async () => {
		const res = await runMut.mutateAsync({
			flowId: flowId as string,
			triggerData: { hello: "world" },
		});
		setJobId(res.jobId);
		setMonitorOpen(true);
	};

	if (!flow) {
		return <p className="text-slate-500">Loading flow…</p>;
	}

	const triggerNode = flow.nodes.find((n) => n.type === "trigger");

	return (
		<div className="flex h-[calc(100vh-12rem)] gap-4">
			<div className="flex-1 rounded-md border border-slate-200 bg-white">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onSelectionChange={(selection) =>
						setSelected(selection.nodes[0] ?? null)
					}
					onPaneClick={() => setSelected(null)}
				>
					<Background />
					<Controls />
					<MiniMap />
				</ReactFlow>
			</div>

			{/* Sidebar: config editor or node palette */}
			<div className="w-72 overflow-y-auto rounded-md border border-slate-200 bg-white p-4">
				{selected ? (
					<div>
						<h2 className="mb-2 text-sm font-semibold text-slate-500">
							{selected.data.nodeType === "trigger" ? "Trigger" : "Action"}
						</h2>
						<p className="mb-3 text-xs text-slate-400">
							{selected.data.integrationId} · {selected.data.operationKey}
						</p>
						{flow?.webhookPath &&
							selected.data.nodeType === "trigger" &&
							flow.triggerType === "webhook" && (
								<div className="mb-3 rounded bg-slate-50 p-2">
									<div className="mb-1 text-xs font-medium text-slate-500">
										Webhook URL
									</div>
									<div className="flex items-center gap-1">
										<code className="flex-1 truncate text-xs text-slate-700">
											{window.location.origin}/webhook/{flow.webhookPath}
										</code>
										<button
											type="button"
											className="text-xs text-[var(--color-accent)]"
											onClick={() =>
												navigator.clipboard.writeText(
													`${window.location.origin}/webhook/${flow.webhookPath}`,
												)
											}
										>
											Copy
										</button>
									</div>
								</div>
							)}
						{renderConfigFields(selectedNodeDef, selected.data, (cfg) => {
							const nextConfig = { ...selected.data.config, ...cfg };
							setNodes((prev) =>
								prev.map((n) =>
									n.id === selected.id
										? {
												...n,
												data: { ...n.data, config: nextConfig },
											}
										: n,
								),
							);
							void updateNodeMut.mutateAsync({
								flowId: flowId as string,
								nodeId: selected.id,
								patch: { config: nextConfig },
							});
						})}
						{!triggerNode && (
							<button
								type="button"
								className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								onClick={() =>
									deleteNodeMut.mutateAsync({
										flowId: flowId as string,
										nodeId: selected.id,
									})
								}
							>
								Delete node
							</button>
						)}
					</div>
				) : (
					<div>
						<h2 className="mb-2 text-sm font-semibold text-slate-500">
							Add action
						</h2>
						{manifests.length === 0 && (
							<p className="text-xs text-slate-400">Loading integrations…</p>
						)}
						<div className="space-y-2">
							{manifests.map((m) =>
								m.actions.map((a) => (
									<button
										key={`${m.id}.${a.operationKey}`}
										type="button"
										className="w-full cursor-pointer rounded-md border border-slate-200 p-2 text-left text-sm transition hover:border-blue-400"
										onClick={() => addAction(a)}
									>
										<span className="mr-1">{m.icon}</span>
										{a.name}
									</button>
								)),
							)}
						</div>
					</div>
				)}
			</div>

			<button
				type="button"
				className="fixed bottom-6 right-6 rounded-full bg-[var(--color-accent)] px-5 py-3 font-medium text-white shadow-lg"
				onClick={run}
				disabled={runMut.isPending}
			>
				{runMut.isPending ? "Running…" : "Run flow"}
			</button>

			<button
				type="button"
				className="fixed bottom-6 left-6 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-lg"
				onClick={() => setCredentialsOpen(true)}
			>
				Credentials
			</button>

			{monitorOpen && (
				<ExecutionMonitor jobId={jobId} onClose={() => setMonitorOpen(false)} />
			)}

			{credentialsOpen && (
				<CredentialsModal onClose={() => setCredentialsOpen(false)} />
			)}
		</div>
	);
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

function renderConfigFields(
	def: NodeDefinition | null,
	data: NodeData,
	onChange: (cfg: Record<string, unknown>) => void,
) {
	if (!def) {
		return (
			<p className="text-xs text-slate-400">No config schema available.</p>
		);
	}
	const schema = def.configSchema;
	const fields = Object.entries(schema);
	return (
		<div className="space-y-3">
			{fields.map(([key, field]) => (
				<ConfigField
					key={key}
					label={key}
					field={field}
					value={data.config[key]}
					onChange={(val) => onChange({ [key]: val })}
				/>
			))}
		</div>
	);
}

interface ConfigFieldProps {
	label: string;
	field: ConfigFieldSchema;
	value: unknown;
	onChange: (val: unknown) => void;
}

function ConfigField({ label, field, value, onChange }: ConfigFieldProps) {
	switch (field.type) {
		case "string":
			return textInput(label, field, value, onChange, false);
		case "secret":
			return textInput(label, field, value, onChange, true);
		case "number":
			return (
				<div>
					<label htmlFor={label} className="text-xs text-slate-500">
						{field.label || label}
					</label>
					<input
						id={label}
						type="number"
						className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
						value={String(value ?? field.default ?? "")}
						onChange={(e) =>
							onChange(e.target.value ? Number(e.target.value) : undefined)
						}
					/>
				</div>
			);
		case "boolean":
			return (
				<div className="flex items-center gap-2">
					<input
						id={label}
						type="checkbox"
						checked={Boolean(value ?? field.default ?? false)}
						onChange={(e) => onChange(e.target.checked)}
					/>
					<label htmlFor={label} className="text-xs text-slate-500">
						{field.label || label}
					</label>
				</div>
			);
		case "select":
			return (
				<div>
					<label htmlFor={label} className="text-xs text-slate-500">
						{field.label || label}
					</label>
					<select
						id={label}
						className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
						value={String(value ?? field.default ?? "")}
						onChange={(e) => onChange(e.target.value)}
					>
						{field.options?.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</div>
			);
		case "object":
			return textInput(label, field, value, onChange, false);
		default:
			return textInput(label, field, value, onChange, false);
	}
}

function textInput(
	label: string,
	field: ConfigFieldSchema,
	value: unknown,
	onChange: (val: unknown) => void,
	password: boolean,
) {
	return (
		<div>
			<label htmlFor={label} className="text-xs text-slate-500">
				{field.label || label}
			</label>
			<input
				id={label}
				type={password ? "password" : "text"}
				className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
				value={
					typeof value === "string"
						? value
						: value === undefined
							? ((field.default as string | undefined) ?? "")
							: String(value)
				}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}
