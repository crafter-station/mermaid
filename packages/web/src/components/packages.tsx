const PACKAGES = [
	{ name: "@crafter/mermaid", size: "~1KB", desc: "Umbrella package — recommended entry point" },
	{ name: "@crafter/mermaid-parser", size: "~3KB", desc: "Text → AST with source spans" },
	{ name: "@crafter/mermaid-layout", size: "~7KB", desc: "AST → positioned graph (custom Sugiyama)" },
	{ name: "@crafter/mermaid-renderer", size: "~5KB", desc: "Positioned graph → SVG string or DOM" },
	{ name: "@crafter/mermaid-themes", size: "~2KB", desc: "32 theme presets + CSS custom properties" },
	{ name: "@crafter/mermaid-cli", size: "~4KB", desc: "Terminal renderer with ANSI colors" },
	{ name: "@crafter/mermaid-player", size: "~3KB", desc: "Step-through animation system" },
];

export function Packages() {
	return (
		<section id="packages" className="py-24 px-6">
			<div className="mx-auto max-w-4xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Install what you need
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					7 packages, pay for what you use
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-12 max-w-lg mx-auto">
					Need just the parser? Import it. Want everything? One umbrella package. Each one independently versioned.
				</p>

				<div className="space-y-2">
					{PACKAGES.map((pkg) => (
						<div
							key={pkg.name}
							className="flex items-center justify-between px-5 py-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all group"
						>
							<div className="flex items-center gap-4 min-w-0">
								<code className="text-sm font-mono text-[var(--accent-blue)] shrink-0">
									{pkg.name}
								</code>
								<span className="text-sm text-[var(--text-muted)] truncate hidden sm:block">
									{pkg.desc}
								</span>
							</div>
							<span className="text-xs font-mono text-[var(--accent-green)] shrink-0 ml-4">
								{pkg.size}
							</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
