import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	useCreateFlow,
	useFlows,
	useToggleFlowActive,
} from "../lib/api.js";

export default function FlowList() {
	const navigate = useNavigate();
	const { data: flows = [], isLoading, isError } = useFlows();
	const createFlow = useCreateFlow();
	const toggleActive = useToggleFlowActive();
	const [name, setName] = useState("");
	const [triggerType, setTriggerType] = useState<"webhook" | "cron">(
		"webhook",
	);

	const create = async () => {
		const flow = await createFlow.mutateAsync({
			name: name || "Untitled flow",
			description: "",
			triggerType,
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
						{flows.length} workflow{flows.length === 1 ? "" : "s"}
					</p>
				</div>
				<div className="flex items-end gap-2">
					<input
						className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
						placeholder="Flow name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<select
						className="rounded-md border border-slate-300 px-3 py-2 text-sm"
						value={triggerType}
						onChange={(e) =>
							setTriggerType(e.target.value as "webhook" | "cron")
						}
					>
						<option value="webhook">Webhook</option>
						<option value="cron">Schedule (cron)</option>
					</select>
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
								<div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
									<span className="rounded bg-slate-100 px-1.5 py-0.5">
										{f.triggerType === "cron" ? "⏰ cron" : "🔗 webhook"}
									</span>
									{f.webhookPath && (
										<span className="font-mono">/webhook/{f.webhookPath}</span>
									)}
								</div>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
										f.active ? "bg-green-500" : "bg-slate-300"
									}`}
									onClick={() =>
										toggleActive.mutate({
											flowId: f.id,
											active: !f.active,
										})
									}
									disabled={toggleActive.isPending}
								>
									<span
										className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
											f.active ? "translate-x-4" : "translate-x-0"
										}`}
									/>
								</button>
								<span className="text-xs text-slate-500">
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
