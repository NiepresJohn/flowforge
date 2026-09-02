import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateFlow, useFlows } from "../lib/api.js";

export default function FlowList() {
	const navigate = useNavigate();
	const { data: flows = [], isLoading, isError } = useFlows();
	const createFlow = useCreateFlow();
	const [name, setName] = useState("");

	const create = async () => {
		const flow = await createFlow.mutateAsync({
			name: name || "Untitled flow",
			description: "",
		});
		setName("");
		navigate({ to: `/flows/${flow.id}` });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-end justify-between">
				<div>
					<h1 className="text-2xl font-bold">My flows</h1>
					<p className="text-sm text-slate-500">
						{flows.length} active workflow{flows.length === 1 ? "" : "s"}
					</p>
				</div>
				<div className="flex items-end gap-2">
					<input
						className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
						placeholder="Flow name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<button
						type="button"
						className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
						disabled={createFlow.isPending}
						onClick={create}
					>
						Create flow
					</button>
				</div>
			</div>

			{isError && <p className="text-sm text-red-600">Failed to load flows.</p>}

			{isLoading ? (
				<p className="text-slate-500">Loading…</p>
			) : flows.length === 0 ? (
				<p className="text-slate-500">No flows yet. Create one above.</p>
			) : (
				<div className="divide-y divide-slate-200 rounded-md border border-slate-200">
					{flows.map((f) => (
						<div key={f.id} className="flex items-center justify-between p-4">
							<div>
								<Link
									to="/flows/$flowId"
									params={{ flowId: f.id }}
									className="font-medium text-[var(--color-accent)] hover:underline"
								>
									{f.name}
								</Link>
								{f.description && (
									<p className="text-sm text-slate-500">{f.description}</p>
								)}
							</div>
							<div className="flex items-center gap-3 text-xs text-slate-500">
								{f.webhookPath && (
									<span className="font-mono">wh: {f.webhookPath}</span>
								)}
								<span
									className={f.active ? "text-green-600" : "text-slate-400"}
								>
									{f.active ? "Active" : "Inactive"}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
