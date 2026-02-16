"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDiagramTheme, THEME_NAMES, type ThemeName } from "./theme-context";

const DEFAULT_SOURCE = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Success]
  B -->|No| D[Failure]
  C --> E[Deploy]
  D --> F[Fix]
  F --> B`;

const PANEL_HEIGHT = "h-[400px] md:h-[480px]";

const BASE_NODE = 500;
const BASE_EDGE = 650;
const BASE_GAP = 150;

const SPEED_PRESETS = [
	{ label: "0.5x", value: 2 },
	{ label: "1x", value: 1 },
	{ label: "1.5x", value: 1 / 1.5 },
	{ label: "2x", value: 0.5 },
] as const;

interface Step {
	type: "node" | "edge";
	id: string;
	label: string;
	sourceLine?: number;
	edgeIndex?: number;
}

interface LayerStep {
	items: Step[];
	label: string;
}

function smartDecompose(ast: {
	nodes: { id: string; label: string }[];
	edges: { source: string; target: string; label?: string }[];
}, sourceLines: string[]): LayerStep[] {
	const layerSteps: LayerStep[] = [];
	const nodeMap = new Map<string, { id: string; label: string }>();
	for (const node of ast.nodes) nodeMap.set(node.id, node);

	const fullAdj = new Map<string, string[]>();
	for (const e of ast.edges) {
		if (!fullAdj.has(e.source)) fullAdj.set(e.source, []);
		fullAdj.get(e.source)!.push(e.target);
	}

	const backEdges = new Set<string>();
	const visited = new Set<string>();
	const inStack = new Set<string>();
	function dfs(node: string): void {
		visited.add(node);
		inStack.add(node);
		for (const neighbor of fullAdj.get(node) || []) {
			if (inStack.has(neighbor)) {
				backEdges.add(`${node}->${neighbor}`);
			} else if (!visited.has(neighbor)) {
				dfs(neighbor);
			}
		}
		inStack.delete(node);
	}
	for (const node of ast.nodes) {
		if (!visited.has(node.id)) dfs(node.id);
	}

	const inDegree = new Map<string, number>();
	const adjacency = new Map<string, string[]>();
	for (const node of ast.nodes) inDegree.set(node.id, 0);
	for (const e of ast.edges) {
		if (!inDegree.has(e.source) || !inDegree.has(e.target)) continue;
		if (backEdges.has(`${e.source}->${e.target}`)) continue;
		if (!adjacency.has(e.source)) adjacency.set(e.source, []);
		adjacency.get(e.source)!.push(e.target);
		inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
	}

	const layers: string[][] = [];
	const remaining = new Map(inDegree);
	const assigned = new Set<string>();
	while (assigned.size < ast.nodes.length) {
		const layer: string[] = [];
		for (const [id, deg] of remaining) {
			if (deg === 0 && !assigned.has(id)) layer.push(id);
		}
		if (layer.length === 0) {
			for (const node of ast.nodes) {
				if (!assigned.has(node.id)) layer.push(node.id);
			}
		}
		for (const id of layer) {
			assigned.add(id);
			remaining.delete(id);
			for (const target of adjacency.get(id) || []) {
				if (remaining.has(target)) {
					remaining.set(target, remaining.get(target)! - 1);
				}
			}
		}
		layers.push(layer);
	}

	function findSourceLine(id: string, type: "node" | "edge", edgeTarget?: string): number | undefined {
		const idPattern = new RegExp(`\\b${id}(?:[\\[\\{\\(]|\\s|$)`);
		for (let i = 0; i < sourceLines.length; i++) {
			const line = sourceLines[i]!;
			if (type === "node" && idPattern.test(line)) return i;
			if (type === "edge" && edgeTarget) {
				const arrowIdx = line.indexOf("-->");
				if (arrowIdx === -1) continue;
				const before = line.slice(0, arrowIdx);
				const after = line.slice(arrowIdx);
				if (before.includes(id) && after.includes(edgeTarget)) return i;
			}
		}
		return undefined;
	}

	const emittedEdges = new Set<string>();
	const emittedNodes = new Set<string>();

	for (const layer of layers) {
		const nodeSteps: Step[] = [];
		for (const nodeId of layer) {
			if (emittedNodes.has(nodeId)) continue;
			emittedNodes.add(nodeId);
			const node = nodeMap.get(nodeId);
			nodeSteps.push({ type: "node", id: nodeId, label: node?.label || nodeId, sourceLine: findSourceLine(nodeId, "node") });
		}
		if (nodeSteps.length > 0) {
			layerSteps.push({ items: nodeSteps, label: nodeSteps.map((s) => s.label).join(", ") });
		}

		const edgeSteps: Step[] = [];
		for (const nodeId of layer) {
			for (const target of fullAdj.get(nodeId) || []) {
				const edgeKey = `${nodeId}->${target}`;
				if (emittedEdges.has(edgeKey)) continue;
				emittedEdges.add(edgeKey);
				const edge = ast.edges.find((e) => e.source === nodeId && e.target === target);
				edgeSteps.push({ type: "edge", id: edgeKey, label: edge?.label || `${nodeId} -> ${target}`, sourceLine: findSourceLine(nodeId, "edge", target) });
			}
		}
		if (edgeSteps.length > 0) {
			layerSteps.push({ items: edgeSteps, label: `${edgeSteps.length} edge${edgeSteps.length > 1 ? "s" : ""}` });
		}
	}

	return layerSteps;
}

function hideAllElements(svg: SVGSVGElement): void {
	svg.querySelectorAll("[data-node-id]").forEach((el) => {
		const g = el as SVGGElement;
		g.style.opacity = "0";
		g.style.transform = "scale(0.92)";
		g.style.transformOrigin = "center center";
		g.style.transformBox = "fill-box";
	});
	svg.querySelectorAll("[data-edge-source]").forEach((el) => {
		const g = el as SVGGElement;
		g.style.opacity = "0";
		const path = g.querySelector("path") as SVGPathElement | null;
		if (path) {
			try {
				const length = path.getTotalLength();
				path.style.strokeDasharray = String(length);
				path.style.strokeDashoffset = String(length);
			} catch {}
			const markerEnd = path.getAttribute("marker-end");
			const markerStart = path.getAttribute("marker-start");
			if (markerEnd) { path.setAttribute("data-marker-end", markerEnd); path.removeAttribute("marker-end"); }
			if (markerStart) { path.setAttribute("data-marker-start", markerStart); path.removeAttribute("marker-start"); }
		}
	});
	svg.querySelectorAll("[data-edge-label-source]").forEach((el) => {
		(el as SVGGElement).style.opacity = "0";
	});
}

function animateNodeIn(svg: SVGSVGElement, nodeId: string, dur: number): Promise<void> {
	const el = svg.querySelector(`[data-node-id="${nodeId}"]`) as SVGGElement | null;
	if (!el) return Promise.resolve();
	return new Promise((resolve) => {
		el.style.transition = `opacity ${dur}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${dur}ms cubic-bezier(0.16, 1, 0.3, 1)`;
		el.getBoundingClientRect();
		el.style.opacity = "1";
		el.style.transform = "scale(1)";
		setTimeout(resolve, dur);
	});
}

function animateEdgeIn(svg: SVGSVGElement, source: string, target: string, dur: number, labelDur: number): Promise<void> {
	const el = svg.querySelector(`[data-edge-source="${source}"][data-edge-target="${target}"]`) as SVGGElement | null;
	if (!el) return Promise.resolve();
	const path = el.querySelector("path") as SVGPathElement | null;
	if (!path) { el.style.opacity = "1"; return Promise.resolve(); }

	return new Promise((resolve) => {
		el.style.opacity = "1";
		path.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(0.33, 1, 0.68, 1)`;
		path.getBoundingClientRect();
		path.style.strokeDashoffset = "0";

		setTimeout(() => {
			const savedEnd = path.getAttribute("data-marker-end");
			const savedStart = path.getAttribute("data-marker-start");
			if (savedEnd) path.setAttribute("marker-end", savedEnd);
			if (savedStart) path.setAttribute("marker-start", savedStart);
			path.style.strokeDasharray = "";
			path.style.strokeDashoffset = "";
			path.style.transition = "";

			const label = svg.querySelector(`[data-edge-label-source="${source}"][data-edge-label-target="${target}"]`) as SVGGElement | null;
			if (label) {
				label.style.transition = `opacity ${labelDur}ms ease-out`;
				label.getBoundingClientRect();
				label.style.opacity = "1";
			}
			resolve();
		}, dur);
	});
}

function revealInstantly(svg: SVGSVGElement, step: Step): void {
	if (step.type === "node") {
		const el = svg.querySelector(`[data-node-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "1"; el.style.transform = "scale(1)"; }
	} else if (step.type === "edge") {
		const [src, tgt] = step.id.split("->");
		const el = svg.querySelector(`[data-edge-source="${src}"][data-edge-target="${tgt}"]`) as SVGGElement | null;
		if (el) {
			el.style.transition = "none"; el.style.opacity = "1";
			const path = el.querySelector("path") as SVGPathElement | null;
			if (path) {
				path.style.transition = "none"; path.style.strokeDashoffset = "0"; path.style.strokeDasharray = "";
				const savedEnd = path.getAttribute("data-marker-end");
				const savedStart = path.getAttribute("data-marker-start");
				if (savedEnd) path.setAttribute("marker-end", savedEnd);
				if (savedStart) path.setAttribute("marker-start", savedStart);
			}
			const label = svg.querySelector(`[data-edge-label-source="${src}"][data-edge-label-target="${tgt}"]`) as SVGGElement | null;
			if (label) { label.style.transition = "none"; label.style.opacity = "1"; }
		}
	}
}

function hideInstantly(svg: SVGSVGElement, step: Step): void {
	if (step.type === "node") {
		const el = svg.querySelector(`[data-node-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "0"; el.style.transform = "scale(0.92)"; }
	} else if (step.type === "edge") {
		const [src, tgt] = step.id.split("->");
		const el = svg.querySelector(`[data-edge-source="${src}"][data-edge-target="${tgt}"]`) as SVGGElement | null;
		if (el) {
			el.style.transition = "none"; el.style.opacity = "0";
			const path = el.querySelector("path") as SVGPathElement | null;
			if (path) {
				path.style.transition = "none";
				try { const l = path.getTotalLength(); path.style.strokeDasharray = String(l); path.style.strokeDashoffset = String(l); } catch {}
				const end = path.getAttribute("data-marker-end"); if (end) path.removeAttribute("marker-end");
				const start = path.getAttribute("data-marker-start"); if (start) path.removeAttribute("marker-start");
			}
			const label = svg.querySelector(`[data-edge-label-source="${src}"][data-edge-label-target="${tgt}"]`) as SVGGElement | null;
			if (label) { label.style.transition = "none"; label.style.opacity = "0"; }
		}
	}
}

type Mode = "edit" | "play";

export function Playground() {
	const [source, setSource] = useState(DEFAULT_SOURCE);
	const { themeName, setThemeName, getThemeObject } = useDiagramTheme();
	const [error, setError] = useState<string | null>(null);
	const [renderTime, setRenderTime] = useState<number | null>(null);
	const [ready, setReady] = useState(false);
	const outputRef = useRef<HTMLDivElement>(null);
	const domSvgRef = useRef<SVGSVGElement | null>(null);

	const [mode, setMode] = useState<Mode>("edit");
	const [steps, setSteps] = useState<LayerStep[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const [speedIndex, setSpeedIndex] = useState(1);
	const speedRef = useRef(SPEED_PRESETS[1]!.value);
	const animControlRef = useRef<{ cancel: boolean }>({ cancel: false });
	const stepsRef = useRef<LayerStep[]>([]);
	stepsRef.current = steps;

	useEffect(() => {
		if (!window.crafterMermaid) {
			const check = setInterval(() => {
				if (window.crafterMermaid) { clearInterval(check); setReady(true); }
			}, 100);
			return () => clearInterval(check);
		}
		setReady(true);
	}, []);

	const renderDiagram = useCallback(() => {
		if (!outputRef.current || !window.crafterMermaid || !ready) return;
		const start = performance.now();
		try {
			const svg = window.crafterMermaid.render(source, { theme: window.crafterMermaid.THEMES[themeName] });
			outputRef.current.innerHTML = svg;
			setError(null);
			setRenderTime(performance.now() - start);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Render error");
			setRenderTime(null);
		}
	}, [source, themeName, ready]);

	useEffect(() => {
		if (mode !== "edit") return;
		const timer = setTimeout(renderDiagram, 150);
		return () => clearTimeout(timer);
	}, [renderDiagram, mode]);

	const enterPlayMode = useCallback(() => {
		if (!window.crafterMermaid || !ready || !outputRef.current) return;
		const result = window.crafterMermaid.parse(source);
		if (!result.ast) return;
		const graph = window.crafterMermaid.layout(result.ast);
		const fg = graph as { nodes: { id: string; label: string }[]; edges: { source: string; target: string; label?: string }[] };
		const decomposed = smartDecompose(fg, source.split("\n"));
		setSteps(decomposed);
		setCurrentStep(-1);
		setMode("play");

		const svg = window.crafterMermaid.renderToDOM(graph, {
			theme: window.crafterMermaid.THEMES[themeName],
			transparent: true,
		});
		svg.removeAttribute("width");
		svg.removeAttribute("height");
		svg.style.width = "100%";
		svg.style.height = "100%";
		svg.style.objectFit = "contain";
		outputRef.current.replaceChildren(svg);
		domSvgRef.current = svg;
		hideAllElements(svg);

		setTimeout(() => setPlaying(true), 150);
	}, [source, ready, themeName]);

	const exitPlayMode = useCallback(() => {
		animControlRef.current.cancel = true;
		setPlaying(false);
		setMode("edit");
		setCurrentStep(-1);
		setSteps([]);
	}, []);

	const seekToStep = useCallback((target: number) => {
		if (!domSvgRef.current) return;
		const svg = domSvgRef.current;
		const allSteps = stepsRef.current;
		const clamped = Math.max(-1, Math.min(target, allSteps.length - 1));

		for (let i = 0; i < allSteps.length; i++) {
			for (const item of allSteps[i]!.items) {
				if (i <= clamped) revealInstantly(svg, item);
				else hideInstantly(svg, item);
			}
		}
		setCurrentStep(clamped);
	}, []);

	useEffect(() => {
		if (!playing || !domSvgRef.current) return;
		const control = { cancel: false };
		animControlRef.current = control;
		const svg = domSvgRef.current;
		let step = currentStep;
		const allSteps = stepsRef.current;

		async function animateItem(item: Step): Promise<void> {
			const m = speedRef.current;
			const nodeDur = Math.round(BASE_NODE * m);
			const edgeDur = Math.round(BASE_EDGE * m);
			const labelDur = Math.round(200 * m);
			if (item.type === "node") {
				await animateNodeIn(svg, item.id, nodeDur);
			} else if (item.type === "edge") {
				const [src, tgt] = item.id.split("->");
				await animateEdgeIn(svg, src!, tgt!, edgeDur, labelDur);
			}
		}

		async function runPlayback() {
			while (step < allSteps.length - 1 && !control.cancel) {
				step++;
				setCurrentStep(step);
				const layerStep = allSteps[step]!;
				await Promise.all(layerStep.items.map((item) => animateItem(item)));
				if (!control.cancel) {
					const gap = Math.round(BASE_GAP * speedRef.current);
					await new Promise((r) => setTimeout(r, gap));
				}
			}
			if (!control.cancel) setPlaying(false);
		}

		runPlayback();
		return () => { control.cancel = true; };
	}, [playing]);

	const handlePlay = () => {
		if (currentStep >= steps.length - 1) {
			seekToStep(-1);
			setTimeout(() => setPlaying(true), 50);
		} else {
			setPlaying(true);
		}
	};

	const currentLayerStep = currentStep >= 0 ? steps[currentStep] : null;
	const highlightedLine = currentLayerStep?.items[0]?.sourceLine;
	const sourceLines = source.split("\n");

	return (
		<section id="playground" className="py-24 px-6">
			<div className="mx-auto max-w-6xl">
				<p className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--accent-cyan)] mb-3 text-center">
					Try it now
				</p>
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
					Edit. Render. Animate.
				</h2>
				<p className="text-[var(--text-muted)] text-center mb-12 max-w-lg mx-auto">
					Type diagram syntax on the left, see the SVG on the right. Hit play to watch it build step by step.
				</p>

				<div className="rounded-xl border border-[var(--border)] overflow-hidden">
					<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
						<div className="flex items-center gap-3">
							<div className="flex gap-1.5">
								<div className="w-3 h-3 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30" />
								<div className="w-3 h-3 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/30" />
								<div className="w-3 h-3 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30" />
							</div>
							<span className="text-xs text-[var(--text-muted)] font-mono">playground</span>
						</div>

						<div className="flex items-center gap-3">
							{mode === "edit" && renderTime !== null && (
								<span className="text-xs font-mono text-[var(--accent-green)]">
									{renderTime.toFixed(1)}ms
								</span>
							)}
							{mode === "play" && currentLayerStep && (
								<span className="text-xs font-mono text-[var(--accent-cyan)] hidden sm:block">
									{currentLayerStep.items[0]?.type === "node" ? "+" : "\u2192"} {currentLayerStep.label}
								</span>
							)}
							<select
								value={themeName}
								onChange={(e) => setThemeName(e.target.value as ThemeName)}
								className="text-xs font-mono bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] cursor-pointer"
							>
								{THEME_NAMES.map((t) => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid md:grid-cols-2 divide-x divide-[var(--border)]">
						<div className="relative">
							{mode === "edit" ? (
								<textarea
									value={source}
									onChange={(e) => setSource(e.target.value)}
									spellCheck={false}
									className={`w-full ${PANEL_HEIGHT} p-4 font-mono text-sm bg-[var(--code-bg)] text-[var(--text-primary)] resize-none focus:outline-none`}
									placeholder="Type mermaid diagram syntax..."
								/>
							) : (
								<div className={`w-full ${PANEL_HEIGHT} overflow-auto bg-[var(--code-bg)]`}>
									<pre className="p-4 font-mono text-sm leading-6">
										{sourceLines.map((line, i) => (
											<div
												key={i}
												className={`px-2 -mx-2 rounded transition-colors duration-300 ${
													highlightedLine === i
														? "bg-[var(--accent-blue)]/15 text-[var(--text-primary)]"
														: "text-[var(--text-muted)]"
												}`}
											>
												<span className="inline-block w-6 mr-3 text-right text-[var(--text-muted)] opacity-40 select-none text-xs">
													{i + 1}
												</span>
												{line || " "}
											</div>
										))}
									</pre>
								</div>
							)}
						</div>

						<div className={`relative ${PANEL_HEIGHT} bg-[var(--bg-card)] flex items-center justify-center p-4`}>
							{error && mode === "edit" ? (
								<div className="text-sm font-mono text-[var(--accent-orange)] text-center max-w-sm">
									{error}
								</div>
							) : (
								<div
									ref={outputRef}
									className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
								/>
							)}
							{mode === "play" && steps.length > 0 && (
								<div className="absolute bottom-4 left-4 right-4">
									<div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
										<div
											className="h-full bg-[var(--accent-blue)] rounded-full transition-all duration-300"
											style={{ width: `${((Math.max(0, currentStep) + 1) / steps.length) * 100}%` }}
										/>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
						{mode === "edit" ? (
							<>
								<button
									onClick={enterPlayMode}
									className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
										<polygon points="5 3 19 12 5 21 5 3" />
									</svg>
									Animate
								</button>
								<span className="text-xs text-[var(--text-muted)] font-mono">
									Edit source to update diagram
								</span>
							</>
						) : (
							<>
								<div className="flex items-center gap-1">
									<button
										onClick={exitPlayMode}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Back to editor"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M19 12H5" />
											<polyline points="12 19 5 12 12 5" />
										</svg>
									</button>

									<button
										onClick={() => { animControlRef.current.cancel = true; setPlaying(false); seekToStep(-1); }}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Reset"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<rect x="3" y="3" width="18" height="18" rx="2" />
										</svg>
									</button>

									<button
										onClick={() => { animControlRef.current.cancel = true; setPlaying(false); seekToStep(currentStep - 1); }}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Step backward"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<polygon points="19 20 9 12 19 4 19 20" />
											<line x1="5" y1="19" x2="5" y2="5" />
										</svg>
									</button>

									{playing ? (
										<button
											onClick={() => { animControlRef.current.cancel = true; setPlaying(false); }}
											className="p-2 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer"
											title="Pause"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<rect x="6" y="4" width="4" height="16" />
												<rect x="14" y="4" width="4" height="16" />
											</svg>
										</button>
									) : (
										<button
											onClick={handlePlay}
											className="p-2 rounded-md bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity cursor-pointer"
											title="Play"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
												<polygon points="5 3 19 12 5 21 5 3" />
											</svg>
										</button>
									)}

									<button
										onClick={() => { animControlRef.current.cancel = true; setPlaying(false); seekToStep(currentStep + 1); }}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Step forward"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<polygon points="5 4 15 12 5 20 5 4" />
											<line x1="19" y1="5" x2="19" y2="19" />
										</svg>
									</button>
								</div>

								<div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)]">
									{SPEED_PRESETS.map((preset, i) => (
										<button
											key={preset.label}
											onClick={() => { setSpeedIndex(i); speedRef.current = preset.value; }}
											className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
												speedIndex === i
													? "bg-[var(--accent-blue)] text-white"
													: "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
											}`}
										>
											{preset.label}
										</button>
									))}
								</div>

								<span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
									{Math.max(0, currentStep + 1)}/{steps.length}
								</span>
							</>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
