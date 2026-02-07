"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

const TABS = [
	{
		label: "Quick Start",
		lang: "typescript",
		code: `import { render } from "@crafter/mermaid";

const svg = render(\`
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Success]
  B -->|No| D[Failure]
\`);

document.getElementById("diagram").innerHTML = svg;`,
	},
	{
		label: "Themes",
		lang: "typescript",
		code: `import { render, THEMES } from "@crafter/mermaid";

const svg = render(source, {
  theme: THEMES["tokyo-night"],
});`,
	},
	{
		label: "Browser",
		lang: "typescript",
		code: `import { parse, layout } from "@crafter/mermaid";
import { renderToDOM, enableZoomPan } from "@crafter/mermaid-renderer";

const ast = parse("graph TD; A-->B").ast;
const graph = layout(ast);
const svg = renderToDOM(graph, {
  container: document.getElementById("diagram"),
});

enableZoomPan(svg);`,
	},
	{
		label: "Terminal",
		lang: "typescript",
		code: `import { renderToTerminal } from "@crafter/mermaid-cli";

const output = renderToTerminal("graph TD; A-->B");
console.log(output);`,
	},
	{
		label: "Plugins",
		lang: "typescript",
		code: `import { use, render } from "@crafter/mermaid";

use({
  name: "my-plugin",
  diagrams: [{
    type: "custom",
    detect: (line) => line.startsWith("custom"),
    parse: (source) => ({ ast: myParse(source), diagnostics: [] }),
    layout: (ast, opts) => myLayout(ast, opts),
  }],
});`,
	},
];

export function CodeExamples() {
	const [activeTab, setActiveTab] = useState(0);
	const [highlightedHtml, setHighlightedHtml] = useState<Record<number, string>>({});

	useEffect(() => {
		const tab = TABS[activeTab];
		if (!tab || highlightedHtml[activeTab]) return;

		codeToHtml(tab.code, {
			lang: tab.lang,
			themes: {
				light: "github-light",
				dark: "tokyo-night",
			},
			defaultColor: false,
		}).then((html) => {
			setHighlightedHtml((prev) => ({ ...prev, [activeTab]: html }));
		});
	}, [activeTab, highlightedHtml]);

	return (
		<section className="py-24 px-6">
			<div className="mx-auto max-w-4xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Usage
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Simple API, powerful output
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-12 max-w-lg mx-auto">
					From SSR to browser interactivity to terminal rendering, one consistent API.
				</p>

				<div className="rounded-xl border border-[var(--border)] overflow-hidden">
					<div className="flex gap-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto">
						{TABS.map((tab, i) => (
							<button
								key={tab.label}
								onClick={() => setActiveTab(i)}
								className={`px-4 py-2.5 text-xs font-mono whitespace-nowrap transition-colors cursor-pointer ${
									i === activeTab
										? "text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)] -mb-px"
										: "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>

					<div className="relative">
						{highlightedHtml[activeTab] ? (
							<div
								className="p-5 overflow-x-auto [&_pre]:!bg-transparent [&_code]:text-sm [&_code]:leading-relaxed"
								dangerouslySetInnerHTML={{ __html: highlightedHtml[activeTab] }}
							/>
						) : (
							<pre className="p-5 overflow-x-auto">
								<code className="font-mono text-sm leading-relaxed text-[var(--text-secondary)]">
									{TABS[activeTab]?.code}
								</code>
							</pre>
						)}
						<button
							onClick={() => navigator.clipboard.writeText(TABS[activeTab]?.code ?? "")}
							className="absolute top-3 right-3 p-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] cursor-pointer"
							title="Copy to clipboard"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
								<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
