const STEPS = [
	{
		number: "01",
		title: "Parse",
		package: "@crafter/mermaid-parser",
		size: "~3KB",
		input: "Text",
		output: "AST",
		description: "Regex-based parser turns Mermaid syntax into a typed AST with source spans for every node and edge.",
	},
	{
		number: "02",
		title: "Layout",
		package: "@crafter/mermaid-layout",
		size: "~7KB",
		input: "AST",
		output: "Graph",
		description: "Custom Sugiyama algorithm computes coordinates, edge routing, and layer assignment. No dagre, no d3.",
	},
	{
		number: "03",
		title: "Render",
		package: "@crafter/mermaid-renderer",
		size: "~5KB",
		input: "Graph",
		output: "SVG",
		description: "Positioned graph becomes an SVG string or DOM element. Supports themes, zoom, pan, and keyboard nav.",
	},
];

export function Architecture() {
	return (
		<section className="py-24 px-6">
			<div className="mx-auto max-w-6xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					How it works
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Text in, SVG out
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-16 max-w-lg mx-auto">
					Three steps, three packages. Use the umbrella or import only what you need.
				</p>

				<div className="grid sm:grid-cols-3 gap-4">
					{STEPS.map((step) => (
						<div
							key={step.number}
							className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-[var(--border-hover)] transition-colors overflow-hidden group"
						>
							<span className="absolute top-4 right-4 text-[64px] font-bold leading-none text-[var(--text-primary)] opacity-[0.04] select-none pointer-events-none font-mono">
								{step.number}
							</span>

							<div className="relative">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-xs font-mono text-[var(--accent-cyan)]">
										{step.number}
									</span>
									<span className="text-xs font-mono text-[var(--text-muted)]">
										{step.input} → {step.output}
									</span>
								</div>

								<h3 className="text-xl font-bold mb-3">{step.title}</h3>

								<p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
									{step.description}
								</p>

								<div className="flex items-center justify-between">
									<code className="text-xs font-mono text-[var(--accent-blue)]">
										{step.package}
									</code>
									<span className="text-xs font-mono text-[var(--accent-green)]">
										{step.size}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-8 flex justify-center gap-6 text-xs text-[var(--text-muted)] font-mono">
					<span>+ themes (~2KB)</span>
					<span>+ cli (~4KB)</span>
					<span>+ player (~3KB)</span>
				</div>
			</div>
		</section>
	);
}
