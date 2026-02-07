import { HeroDiagram } from "./hero-diagram";

export function Hero() {
	return (
		<section className="relative pt-32 pb-24 px-6 overflow-hidden">
			<div className="mx-auto max-w-6xl">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					<div>
						<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-4">
							Zero dependencies. 16.8KB gzipped.
						</p>

						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
							Diagrams that don&apos;t bloat{" "}
							<span className="text-[var(--accent-blue)]">your bundle</span>
						</h1>

						<p className="text-lg text-[var(--text-secondary)] mb-8 max-w-lg">
							Ultra-lightweight Mermaid rendering engine. Parse, lay out, and render
							8 diagram types with a synchronous API, 32 themes, and full
							interactivity.
						</p>

						<div className="flex flex-wrap gap-3">
							<a
								href="#playground"
								className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity"
							>
								Try the Playground
							</a>
							<a
								href="https://github.com/crafter-station/mermaid"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all"
							>
								<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
								View on GitHub
							</a>
						</div>

						<div className="mt-8 flex items-center gap-6 text-sm text-[var(--text-muted)]">
							<div className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
								110 tests passing
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]" />
								MIT licensed
							</div>
						</div>
					</div>

					<HeroDiagram />
				</div>
			</div>
		</section>
	);
}
