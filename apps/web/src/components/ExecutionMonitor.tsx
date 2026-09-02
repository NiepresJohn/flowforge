import { useEffect, useState } from "react";
import type { ExecutionEvent } from "../lib/api.js";
import { subscribeExecution } from "../lib/api.js";

interface Props {
	jobId: string;
	onClose: () => void;
}

export default function ExecutionMonitor({ jobId, onClose }: Props) {
	const [events, setEvents] = useState<ExecutionEvent[]>([]);
	const [status, setStatus] = useState<
		"connected" | "connecting" | "disconnected"
	>("connecting");

	useEffect(() => {
		if (!jobId) return;
		const ws = subscribeExecution(jobId, (ev) => {
			setStatus("connected");
			setEvents((prev) => [...prev, ev]);
		});
		ws.onclose = () => setStatus("disconnected");
		return () => ws.close();
	}, [jobId]);

	const summary = events[events.length - 1];
	const finalStatus = summary?.type;
	const failedPayload =
		summary?.type === "execution.failed" ? summary.payload : undefined;
	const failedError =
		failedPayload !== undefined &&
		"error" in (failedPayload as object) &&
		typeof (failedPayload as { error?: unknown }).error === "string"
			? String((failedPayload as { error: string }).error)
			: "Execution failed";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="flex h-[520px] w-[420px] flex-col rounded-md bg-white shadow-xl">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<div>
						<h3 className="font-medium">Run monitor</h3>
						<p className="text-xs text-slate-500">
							Job <span className="font-mono">{jobId}</span> · {status}
						</p>
					</div>
					<button
						type="button"
						className="text-sm text-slate-500 hover:text-slate-800"
						onClick={onClose}
					>
						✕
					</button>
				</div>
				<div className="flex-1 space-y-1 overflow-y-auto p-3">
					{events.length === 0 && (
						<p className="py-4 text-center text-sm text-slate-400">
							Waiting for events…
						</p>
					)}
					{events.map((ev, i) => (
						<EventRow key={`${ev.type}-${i}`} event={ev} />
					))}
				</div>
				{finalStatus === "execution.completed" && (
					<div className="border-t bg-green-50 px-3 py-2 text-sm text-green-800">
						Execution succeeded ✓
					</div>
				)}
				{finalStatus === "execution.failed" && (
					<div className="border-t bg-red-50 px-3 py-2 text-sm text-red-800">
						{failedError}
					</div>
				)}
			</div>
		</div>
	);
}

function EventRow({ event }: { event: ExecutionEvent }) {
	const p = event.payload;
	const isStep = "stepId" in p;
	const icon =
		event.type === "step.failed" || event.type === "execution.failed"
			? "✗"
			: event.type === "execution.completed"
				? "✓"
				: "•";
	return (
		<div className="flex items-center gap-2 rounded px-2 py-1 text-sm">
			<span className="text-slate-400">{icon}</span>
			<span className="w-36 text-xs text-slate-500">{event.type}</span>
			{isStep && (
				<span className="font-mono text-xs text-slate-600">
					{(p as { operationKey: string }).operationKey}
				</span>
			)}
			{"status" in p && (
				<span
					className={
						"ml-auto text-xs font-medium " +
						(p.status === "failed"
							? "text-red-600"
							: p.status === "success"
								? "text-green-600"
								: p.status === "running"
									? "text-amber-600"
									: "text-slate-500")
					}
				>
					{p.status}
				</span>
			)}
		</div>
	);
}
