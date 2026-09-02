import { Outlet } from "@tanstack/react-router";

export default function Root() {
	return (
		<div className="min-h-screen bg-[var(--color-base)] text-[var(--color-fg)]">
			<header className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
				<div className="container mx-auto flex h-14 items-center justify-between px-4">
					<a
						href="/"
						className="text-xl font-semibold text-[var(--color-accent)]"
					>
						FlowForge
					</a>
					<span className="text-sm text-slate-500">
						self-hosted workflow automation
					</span>
				</div>
			</header>
			<main className="container mx-auto p-6">
				<Outlet />
			</main>
		</div>
	);
}
