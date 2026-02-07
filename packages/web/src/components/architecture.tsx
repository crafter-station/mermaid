const STEPS = [
	{ label: "Text", package: null, size: null },
	{ label: "Parser", package: "@crafter/mermaid-parser", size: "~3KB" },
	{ label: "AST", package: null, size: null },
	{ label: "Layout", package: "@crafter/mermaid-layout", size: "~7KB" },
	{ label: "Graph", package: null, size: null },
	{ label: "Renderer", package: "@crafter/mermaid-renderer", size: "~5KB" },
	{ label: "SVG", package: null, size: null },
];

export function Architecture() {
	return (
		<section className="py-24 px-6">
			<div className="mx-auto max-w-6xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Architecture
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Clean pipeline, zero magic
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-16 max-w-lg mx-auto">
					Each step is a separate package. Use the umbrella or pick only what you need.
				</p>

				<div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
					{STEPS.map((step, i) => (
						<div key={step.label} className="flex items-center gap-1 sm:gap-2">
							<div className={`group relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-center ${
								step.package
									? "border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent-blue)] transition-colors cursor-default"
									: "text-[var(--text-muted)]"
							}`}>
								<span className={`text-xs sm:text-sm font-mono font-medium ${step.package ? "text-[var(--text-primary)]" : ""}`}>
									{step.label}
								</span>
								{step.package && (
									<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
										<span className="text-[10px] font-mono text-[var(--accent-cyan)]">
											{step.package} ({step.size})
										</span>
									</div>
								)}
							</div>
							{i < STEPS.length - 1 && (
								<span className="text-[var(--text-muted)] text-xs">→</span>
							)}
						</div>
					))}
				</div>

				<div className="mt-16 flex justify-center gap-6 text-xs text-[var(--text-muted)] font-mono">
					<span>+ themes (~2KB)</span>
					<span>+ cli (~4KB)</span>
					<span>+ player (~3KB)</span>
				</div>
			</div>
		</section>
	);
}
