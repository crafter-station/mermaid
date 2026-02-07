const FEATURES = [
	{
		icon: "0",
		title: "Zero Dependencies",
		description: "No dagre, no d3, no external packages. Pure TypeScript from parser to renderer.",
	},
	{
		icon: "fn",
		title: "Synchronous API",
		description: "render() returns a string. No promises, no callbacks, no async/await ceremony.",
	},
	{
		icon: "8",
		title: "8 Diagram Types",
		description: "Flowchart, sequence, class, ER, state, pie, gantt, and mindmap. Extensible via plugins.",
	},
	{
		icon: "32",
		title: "32 Themes",
		description: "Tokyo Night, Catppuccin, Dracula, Nord, One Hunter, and 27 more. CSS custom properties.",
	},
	{
		icon: "&#x21C5;",
		title: "Interactive",
		description: "Zoom, pan, keyboard navigation, Cmd+F search, hover tooltips, minimap, and click events.",
	},
	{
		icon: "+",
		title: "Extensible",
		description: "Plugin system for custom diagram types, node shapes, and themes. use() to register.",
	},
];

export function Features() {
	return (
		<section id="features" className="py-24 px-6">
			<div className="mx-auto max-w-6xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Features
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Everything you need, nothing you don&apos;t
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-12 max-w-lg mx-auto">
					Built from scratch. Every byte justified.
				</p>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{FEATURES.map((feature) => (
						<div
							key={feature.title}
							className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all duration-200"
						>
							<div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center font-mono text-sm font-bold text-[var(--accent-cyan)] mb-4">
								{feature.icon}
							</div>
							<h3 className="text-base font-semibold mb-2">{feature.title}</h3>
							<p className="text-sm text-[var(--text-muted)] leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
