const ROWS = [
	{ label: "Bundle size", theirs: "~2 MB", ours: "16.8 KB", highlight: true },
	{ label: "Dependencies", theirs: "50+", ours: "Zero", highlight: true },
	{ label: "API", theirs: "Async", ours: "Sync", highlight: false },
	{ label: "Output", theirs: "SVG string", ours: "SVG + DOM + Terminal", highlight: false },
	{ label: "Interactivity", theirs: "None", ours: "Zoom, pan, keyboard, search", highlight: false },
	{ label: "Playability", theirs: "None", ours: "Step-through animation", highlight: false },
	{ label: "Themes", theirs: "1", ours: "32", highlight: true },
	{ label: "Extensibility", theirs: "Limited", ours: "Plugin system", highlight: false },
];

export function Comparison() {
	return (
		<section className="py-24 px-6">
			<div className="mx-auto max-w-4xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Why switch
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					125x lighter than mermaid.js
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-12 max-w-lg mx-auto">
					Same diagrams, fraction of the size. No dependencies, no async, no bloat.
				</p>

				<div className="rounded-xl border border-[var(--border)] overflow-hidden">
					<div className="grid grid-cols-3 text-sm font-medium border-b border-[var(--border)] bg-[var(--bg-secondary)]">
						<div className="px-5 py-3" />
						<div className="px-5 py-3 text-[var(--text-muted)] text-center">mermaid.js</div>
						<div className="px-5 py-3 text-[var(--accent-green)] text-center font-mono">@crafter/mermaid</div>
					</div>

					{ROWS.map((row) => (
						<div
							key={row.label}
							className="grid grid-cols-3 text-sm border-b last:border-b-0 border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
						>
							<div className="px-5 py-3.5 text-[var(--text-secondary)]">{row.label}</div>
							<div className="px-5 py-3.5 text-center text-[var(--text-muted)] font-mono">{row.theirs}</div>
							<div className={`px-5 py-3.5 text-center font-mono font-medium ${row.highlight ? "text-[var(--accent-green)]" : "text-[var(--text-primary)]"}`}>
								{row.ours}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
