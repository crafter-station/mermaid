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

interface Step {
	type: "node" | "edge";
	id: string;
	label: string;
	sourceLine?: number;
}

function smartDecompose(ast: {
	nodes: { id: string; label: string }[];
	edges: { source: string; target: string; label?: string }[];
}, sourceLines: string[]): Step[] {
	const steps: Step[] = [];
	const emittedNodes = new Set<string>();
	const emittedEdges = new Set<string>();

	const nodeMap = new Map<string, { id: string; label: string }>();
	for (const node of ast.nodes) {
		nodeMap.set(node.id, node);
	}

	const adjacency = new Map<string, { target: string; edgeIndex: number }[]>();
	for (let i = 0; i < ast.edges.length; i++) {
		const e = ast.edges[i]!;
		if (!adjacency.has(e.source)) adjacency.set(e.source, []);
		adjacency.get(e.source)!.push({ target: e.target, edgeIndex: i });
	}

	const targetSet = new Set(ast.edges.map((e) => e.target));
	const roots: string[] = [];
	for (const node of ast.nodes) {
		if (!targetSet.has(node.id)) roots.push(node.id);
	}
	if (roots.length === 0 && ast.nodes.length > 0) {
		roots.push(ast.nodes[0]!.id);
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

	function emitNode(id: string): void {
		if (emittedNodes.has(id)) return;
		emittedNodes.add(id);
		const node = nodeMap.get(id);
		steps.push({
			type: "node",
			id,
			label: node?.label || id,
			sourceLine: findSourceLine(id, "node"),
		});
	}

	const queue: string[] = [...roots];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const nodeId = queue.shift()!;
		if (visited.has(nodeId)) continue;
		visited.add(nodeId);

		emitNode(nodeId);

		const neighbors = adjacency.get(nodeId) || [];
		for (const { target, edgeIndex } of neighbors) {
			const edgeKey = `${nodeId}->${target}`;
			if (emittedEdges.has(edgeKey)) continue;
			emittedEdges.add(edgeKey);

			const edge = ast.edges[edgeIndex]!;
			steps.push({
				type: "edge",
				id: edgeKey,
				label: edge.label || `${nodeId} → ${target}`,
				sourceLine: findSourceLine(nodeId, "edge", target),
			});

			emitNode(target);

			if (!visited.has(target)) {
				queue.push(target);
			}
		}
	}

	for (const node of ast.nodes) {
		emitNode(node.id);
	}

	return steps;
}

function renderAtStep(
	fullGraph: Record<string, unknown>,
	steps: Step[],
	stepIndex: number,
	theme: Record<string, string>,
): string {
	if (!window.crafterMermaid) return "";

	const visibleNodeIds = new Set<string>();
	const visibleEdgeIds = new Set<string>();

	for (let i = 0; i <= stepIndex; i++) {
		const step = steps[i];
		if (!step) continue;
		if (step.type === "node") visibleNodeIds.add(step.id);
		else visibleEdgeIds.add(step.id);
	}

	const fg = fullGraph as {
		width: number;
		height: number;
		nodes: { id: string; label: string; [k: string]: unknown }[];
		edges: { source: string; target: string; label?: string; [k: string]: unknown }[];
		groups: unknown[];
	};

	const filteredGraph = {
		width: fg.width,
		height: fg.height,
		nodes: fg.nodes.filter((n) => visibleNodeIds.has(n.id)),
		edges: fg.edges.filter((e) => visibleEdgeIds.has(`${e.source}->${e.target}`)),
		groups: fg.groups,
	};

	return window.crafterMermaid.renderToString(filteredGraph, { theme });
}

type Mode = "edit" | "play";

export function Playground() {
	const [source, setSource] = useState(DEFAULT_SOURCE);
	const { themeName, setThemeName, getThemeObject } = useDiagramTheme();
	const [error, setError] = useState<string | null>(null);
	const [renderTime, setRenderTime] = useState<number | null>(null);
	const [ready, setReady] = useState(false);
	const outputRef = useRef<HTMLDivElement>(null);

	const [mode, setMode] = useState<Mode>("edit");
	const [steps, setSteps] = useState<Step[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const fullGraphRef = useRef<Record<string, unknown> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!window.crafterMermaid) {
			const check = setInterval(() => {
				if (window.crafterMermaid) {
					clearInterval(check);
					setReady(true);
				}
			}, 100);
			return () => clearInterval(check);
		}
		setReady(true);
	}, []);

	const renderDiagram = useCallback(() => {
		if (!outputRef.current || !window.crafterMermaid || !ready) return;

		const start = performance.now();
		try {
			const svg = window.crafterMermaid.render(source, {
				theme: window.crafterMermaid.THEMES[themeName],
			});
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
		if (!window.crafterMermaid || !ready) return;

		const result = window.crafterMermaid.parse(source);
		if (!result.ast) return;

		const graph = window.crafterMermaid.layout(result.ast);
		fullGraphRef.current = graph as Record<string, unknown>;

		const fg = graph as { nodes: { id: string; label: string }[]; edges: { source: string; target: string; label?: string }[] };
		const sourceLines = source.split("\n");
		const decomposed = smartDecompose(fg, sourceLines);
		setSteps(decomposed);
		setCurrentStep(-1);
		setMode("play");
		setTimeout(() => {
			setPlaying(true);
		}, 100);
	}, [source, ready]);

	const exitPlayMode = useCallback(() => {
		setPlaying(false);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		setMode("edit");
		setCurrentStep(-1);
		setSteps([]);
	}, []);

	const renderCurrentStep = useCallback(() => {
		if (!outputRef.current || !fullGraphRef.current || steps.length === 0 || mode !== "play") return;

		if (currentStep === -1) {
			const fg = fullGraphRef.current as { width: number; height: number; groups: unknown[] };
			const emptyGraph = { width: fg.width, height: fg.height, nodes: [], edges: [], groups: fg.groups };
			outputRef.current.innerHTML = window.crafterMermaid.renderToString(emptyGraph, { theme: getThemeObject() });
			return;
		}

		const svg = renderAtStep(fullGraphRef.current, steps, currentStep, getThemeObject());
		outputRef.current.innerHTML = svg;
	}, [currentStep, steps, getThemeObject, mode]);

	useEffect(() => {
		if (mode === "play") renderCurrentStep();
	}, [renderCurrentStep, mode]);

	useEffect(() => {
		if (!playing) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		intervalRef.current = setInterval(() => {
			setCurrentStep((prev) => {
				if (prev >= steps.length - 1) {
					setPlaying(false);
					return prev;
				}
				return prev + 1;
			});
		}, 600);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [playing, steps.length]);

	const handlePlay = () => {
		if (currentStep >= steps.length - 1) {
			setCurrentStep(-1);
			setTimeout(() => setPlaying(true), 50);
		} else {
			setPlaying(true);
		}
	};

	const handlePause = () => setPlaying(false);

	const handleStepForward = () => {
		setPlaying(false);
		setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
	};

	const handleStepBackward = () => {
		setPlaying(false);
		setCurrentStep((prev) => Math.max(prev - 1, -1));
	};

	const handleReset = () => {
		setPlaying(false);
		setCurrentStep(-1);
	};

	const currentStepInfo = currentStep >= 0 ? steps[currentStep] : null;
	const highlightedLine = currentStepInfo?.sourceLine;

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
							{mode === "play" && (
								<>
									{currentStepInfo && (
										<span className="text-xs font-mono text-[var(--accent-cyan)] hidden sm:block">
											{currentStepInfo.type === "node" ? "+" : "→"} {currentStepInfo.label}
										</span>
									)}
									<span className="text-xs font-mono text-[var(--text-muted)]">
										{currentStep + 1}/{steps.length}
									</span>
								</>
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
										onClick={handleReset}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Reset"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<rect x="3" y="3" width="18" height="18" rx="2" />
										</svg>
									</button>

									<button
										onClick={handleStepBackward}
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
											onClick={handlePause}
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
										onClick={handleStepForward}
										className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
										title="Step forward"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<polygon points="5 4 15 12 5 20 5 4" />
											<line x1="19" y1="5" x2="19" y2="19" />
										</svg>
									</button>
								</div>

								<div className="flex-1 mx-4">
									<div className="relative h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
										<div
											className="absolute left-0 top-0 h-full bg-[var(--accent-blue)] rounded-full transition-all duration-300"
											style={{
												width: steps.length > 0
													? `${((currentStep + 1) / steps.length) * 100}%`
													: "0%",
											}}
										/>
									</div>
								</div>

								<span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
									{currentStep >= 0 ? steps[currentStep]?.type : "ready"}
								</span>
							</>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
