"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDiagramTheme } from "./theme-context";

const DEMO_DIAGRAM = `graph TD
  Gateway[API Gateway] --> Auth{Auth Service}
  Auth -->|Valid| Users[(Users DB)]
  Auth -->|Invalid| Error[Error Handler]
  Gateway --> Products[Product Service]
  Products --> Cache[(Redis Cache)]
  Products --> Catalog[(Catalog DB)]
  Gateway --> Orders[Order Service]
  Orders --> Queue[Message Queue]
  Queue --> Notify[Notification Service]
  Notify --> Email[Email]
  Notify --> Push[Push]`;

interface Feature {
	id: string;
	label: string;
	hint: string;
	enableKey: "enableZoomPan" | "enableKeyboard" | "enableSearch" | "enableHover" | "enableMinimap";
}

const FEATURES: Feature[] = [
	{ id: "zoom", label: "Zoom & Pan", hint: "Scroll to zoom. Drag to pan. Double-click to reset.", enableKey: "enableZoomPan" },
	{ id: "keyboard", label: "Keyboard", hint: "Tab through nodes. Arrow keys to navigate. Enter to select.", enableKey: "enableKeyboard" },
	{ id: "search", label: "Search", hint: "Press Cmd+F (or Ctrl+F) to search nodes by name.", enableKey: "enableSearch" },
	{ id: "hover", label: "Hover", hint: "Hover over a node to see connections highlighted.", enableKey: "enableHover" },
	{ id: "minimap", label: "Minimap", hint: "A minimap appears in the corner. Click it to navigate.", enableKey: "enableMinimap" },
];

export function InteractiveDemo() {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const cleanupsRef = useRef<Map<string, () => void>>(new Map());
	const [ready, setReady] = useState(false);
	const [active, setActive] = useState<Set<string>>(new Set());
	const { themeName } = useDiagramTheme();

	useEffect(() => {
		if (window.crafterMermaid) { setReady(true); return; }
		const check = setInterval(() => {
			if (window.crafterMermaid) { clearInterval(check); setReady(true); }
		}, 100);
		return () => clearInterval(check);
	}, []);

	const renderDiagram = useCallback(() => {
		if (!ready || !containerRef.current || !window.crafterMermaid) return;

		for (const cleanup of cleanupsRef.current.values()) cleanup();
		cleanupsRef.current.clear();
		setActive(new Set());

		try {
			const result = window.crafterMermaid.parse(DEMO_DIAGRAM);
			if (!result.ast) return;
			const graph = window.crafterMermaid.layout(result.ast);
			const svg = window.crafterMermaid.renderToDOM(graph, {
				theme: window.crafterMermaid.THEMES[themeName],
			});
			svg.style.width = "100%";
			svg.style.height = "100%";
			svg.style.maxHeight = "100%";
			containerRef.current.replaceChildren(svg);
			svgRef.current = svg;
		} catch {
			// silently ignore
		}
	}, [ready, themeName]);

	useEffect(() => {
		renderDiagram();
		return () => {
			for (const cleanup of cleanupsRef.current.values()) cleanup();
			cleanupsRef.current.clear();
		};
	}, [renderDiagram]);

	const toggleFeature = useCallback((feature: Feature) => {
		const svg = svgRef.current;
		if (!svg || !window.crafterMermaid) return;

		setActive((prev) => {
			const next = new Set(prev);
			if (next.has(feature.id)) {
				const cleanup = cleanupsRef.current.get(feature.id);
				if (cleanup) { cleanup(); cleanupsRef.current.delete(feature.id); }
				next.delete(feature.id);
			} else {
				const enableFn = window.crafterMermaid[feature.enableKey];
				if (enableFn) {
					const cleanup = enableFn(svg);
					cleanupsRef.current.set(feature.id, cleanup);
				}
				next.add(feature.id);
			}
			return next;
		});
	}, []);

	const enableAll = useCallback(() => {
		const svg = svgRef.current;
		if (!svg || !window.crafterMermaid) return;

		for (const cleanup of cleanupsRef.current.values()) cleanup();
		cleanupsRef.current.clear();

		const allIds = new Set<string>();
		for (const feature of FEATURES) {
			const enableFn = window.crafterMermaid[feature.enableKey];
			if (enableFn) {
				const cleanup = enableFn(svg);
				cleanupsRef.current.set(feature.id, cleanup);
				allIds.add(feature.id);
			}
		}
		setActive(allIds);
	}, []);

	const activeFeatures = FEATURES.filter((f) => active.has(f.id));
	const hintText = activeFeatures.length > 0
		? activeFeatures.map((f) => f.hint).join(" ")
		: "Toggle features above to interact with the diagram.";

	return (
		<section id="interactive-demo" className="py-24 px-6">
			<div className="mx-auto max-w-5xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Not smoke. Proof.
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Every interaction. Live.
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-8 max-w-lg mx-auto">
					This isn&apos;t a screenshot. Toggle each feature and interact with the diagram below.
				</p>

				<div className="rounded-xl border border-[var(--border)] overflow-hidden">
					<div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
						{FEATURES.map((feature) => (
							<button
								key={feature.id}
								onClick={() => toggleFeature(feature)}
								className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all cursor-pointer ${
									active.has(feature.id)
										? "border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10"
										: "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]"
								}`}
							>
								{feature.label}
							</button>
						))}
						<button
							onClick={enableAll}
							className="px-3 py-1.5 rounded-md text-xs font-mono border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-all cursor-pointer ml-auto"
						>
							Enable all
						</button>
					</div>

					<div className="relative" style={{ height: "420px" }}>
						<div
							ref={containerRef}
							className="w-full h-full bg-[var(--bg-card)] [&>svg]:w-full [&>svg]:h-full"
							style={{ touchAction: active.has("zoom") ? "none" : "auto" }}
						/>
					</div>

					<div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
						<p className="text-xs text-[var(--text-muted)] font-mono">
							{hintText}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
