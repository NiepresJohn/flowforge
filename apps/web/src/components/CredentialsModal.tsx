import { useState } from "react";
import {
	useCreateCredential,
	useCredentials,
	useDeleteCredential,
} from "../lib/api.js";

interface Props {
	onClose: () => void;
}

export default function CredentialsModal({ onClose }: Props) {
	const { data: credentials = [], isLoading } = useCredentials();
	const createCred = useCreateCredential();
	const deleteCred = useDeleteCredential();

	const [name, setName] = useState("");
	const [integrationId, setIntegrationId] = useState("flowforge.http");
	const [fields, setFields] = useState<Record<string, string>>({});

	const submit = async () => {
		if (!name) return;
		await createCred.mutateAsync({ name, integrationId, data: fields });
		setName("");
		setFields({});
	};

	const updateField = (key: string, value: string) => {
		setFields((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">Credentials</h2>
					<button
						type="button"
						className="text-slate-400 hover:text-slate-600"
						onClick={onClose}
					>
						✕
					</button>
				</div>

				{isLoading ? (
					<p className="text-sm text-slate-500">Loading…</p>
				) : credentials.length === 0 ? (
					<p className="mb-4 text-sm text-slate-500">
						No credentials yet. Create one below.
					</p>
				) : (
					<div className="mb-4 space-y-2">
						{credentials.map((c) => (
							<div
								key={c.id}
								className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
							>
								<div>
									<div className="text-sm font-medium">{c.name}</div>
									<div className="text-xs text-slate-500">
										{c.integrationId}
									</div>
								</div>
								<button
									type="button"
									className="text-xs text-red-500 hover:text-red-700"
									onClick={() => deleteCred.mutate(c.id)}
								>
									Delete
								</button>
							</div>
						))}
					</div>
				)}

				<div className="border-t border-slate-200 pt-4">
					<h3 className="mb-3 text-sm font-medium">Add credential</h3>
					<div className="space-y-3">
						<input
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							placeholder="Name (e.g. My API Key)"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<select
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							value={integrationId}
							onChange={(e) => setIntegrationId(e.target.value)}
						>
							<option value="flowforge.http">HTTP Request</option>
						</select>
						<input
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							placeholder="API Key / Token"
							value={fields["apiKey"] ?? ""}
							onChange={(e) => updateField("apiKey", e.target.value)}
						/>
						<button
							type="button"
							className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
							disabled={createCred.isPending || !name}
							onClick={submit}
						>
							{createCred.isPending ? "Creating…" : "Create credential"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
