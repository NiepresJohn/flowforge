/** Loading skeleton components for better UX */

interface SkeletonProps {
	className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse rounded-md bg-slate-200 ${className}`}
			aria-hidden="true"
		/>
	);
}

export function FlowListSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-end justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>
				<div className="flex items-end gap-2">
					<Skeleton className="h-10 w-56" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			<div className="divide-y divide-slate-200 rounded-md border border-slate-200">
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex items-center justify-between p-4">
						<div className="space-y-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-60" />
						</div>
						<Skeleton className="h-4 w-16" />
					</div>
				))}
			</div>
		</div>
	);
}

export function FlowBuilderSkeleton() {
	return (
		<div className="flex h-[calc(100vh-12rem)] gap-4">
			<div className="flex-1 rounded-md border border-slate-200 bg-white p-4">
				<div className="flex h-full items-center justify-center">
					<Skeleton className="h-32 w-32 rounded-full" />
				</div>
			</div>
			<div className="w-72 space-y-4 rounded-md border border-slate-200 bg-white p-4">
				<Skeleton className="h-6 w-24" />
				<Skeleton className="h-4 w-32" />
				<div className="space-y-3 pt-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</div>
		</div>
	);
}
