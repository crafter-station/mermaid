"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { codeToHtml } from "shiki";
import { useDiagramTheme } from "./theme-context";

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
	for (const node of ast.nodes) nodeMap.set(node.id, node);

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
	if (roots.length === 0 && ast.nodes.length > 0) roots.push(ast.nodes[0]!.id);

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
		steps.push({ type: "node", id, label: node?.label || id, sourceLine: findSourceLine(id, "node") });
	}

	const queue: string[] = [...roots];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const nodeId = queue.shift()!;
		if (visited.has(nodeId)) continue;
		visited.add(nodeId);
		emitNode(nodeId);

		for (const { target, edgeIndex } of adjacency.get(nodeId) || []) {
			const edgeKey = `${nodeId}->${target}`;
			if (emittedEdges.has(edgeKey)) continue;
			emittedEdges.add(edgeKey);
			const edge = ast.edges[edgeIndex]!;
			steps.push({ type: "edge", id: edgeKey, label: edge.label || `${nodeId} -> ${target}`, sourceLine: findSourceLine(nodeId, "edge", target) });
			emitNode(target);
			if (!visited.has(target)) queue.push(target);
		}
	}

	for (const node of ast.nodes) emitNode(node.id);
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
		width: number; height: number;
		nodes: { id: string; [k: string]: unknown }[];
		edges: { source: string; target: string; [k: string]: unknown }[];
		groups: unknown[];
	};

	const filteredGraph = {
		width: fg.width, height: fg.height,
		nodes: fg.nodes.filter((n) => visibleNodeIds.has(n.id)),
		edges: fg.edges.filter((e) => visibleEdgeIds.has(`${e.source}->${e.target}`)),
		groups: fg.groups,
	};

	return window.crafterMermaid.renderToString(filteredGraph, { theme });
}

interface SampleCardProps {
	title: string;
	description: string;
	category: string;
	source: string;
	renderTimeRef?: (ms: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
	flowchart: "var(--accent-blue)",
	sequence: "var(--accent-cyan)",
	class: "var(--accent-green)",
	er: "var(--accent-orange)",
	state: "#a855f7",
	pie: "#ec4899",
	gantt: "#f59e0b",
	mindmap: "#14b8a6",
};

export function SampleCard({ title, description, category, source, renderTimeRef }: SampleCardProps) {
	const { themeName, getThemeObject } = useDiagramTheme();
	const svgRef = useRef<HTMLDivElement>(null);
	const [highlightedHtml, setHighlightedHtml] = useState("");
	const [ready, setReady] = useState(false);

	const [mode, setMode] = useState<"view" | "play">("view");
	const [steps, setSteps] = useState<Step[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const fullGraphRef = useRef<Record<string, unknown> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (window.crafterMermaid) { setReady(true); return; }
		const check = setInterval(() => {
			if (window.crafterMermaid) { clearInterval(check); setReady(true); }
		}, 100);
		return () => clearInterval(check);
	}, []);

	useEffect(() => {
		codeToHtml(source, {
			lang: "mermaid",
			themes: { light: "github-light", dark: "tokyo-night" },
			defaultColor: false,
		}).then(setHighlightedHtml).catch(() => {});
	}, [source]);

	useEffect(() => {
		if (!ready || !svgRef.current || !window.crafterMermaid || mode !== "view") return;
		const start = performance.now();
		try {
			const svg = window.crafterMermaid.render(source, {
				theme: window.crafterMermaid.THEMES[themeName],
			});
			svgRef.current.innerHTML = svg;
			renderTimeRef?.(performance.now() - start);
		} catch {
			svgRef.current.innerHTML = '<span class="text-xs text-[var(--accent-orange)] font-mono">Render error</span>';
		}
	}, [ready, source, themeName, mode, renderTimeRef]);

	const enterPlayMode = useCallback(() => {
		if (!window.crafterMermaid || !ready) return;
		const result = window.crafterMermaid.parse(source);
		if (!result.ast) return;
		const graph = window.crafterMermaid.layout(result.ast);
		fullGraphRef.current = graph as Record<string, unknown>;
		const fg = graph as { nodes: { id: string; label: string }[]; edges: { source: string; target: string; label?: string }[] };
		const decomposed = smartDecompose(fg, source.split("\n"));
		setSteps(decomposed);
		setCurrentStep(-1);
		setMode("play");
		setTimeout(() => setPlaying(true), 100);
	}, [source, ready]);

	const exitPlayMode = useCallback(() => {
		setPlaying(false);
		if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
		setMode("view");
		setCurrentStep(-1);
		setSteps([]);
	}, []);

	useEffect(() => {
		if (mode !== "play" || !svgRef.current || !fullGraphRef.current) return;
		if (currentStep === -1) {
			const fg = fullGraphRef.current as { width: number; height: number; groups: unknown[] };
			svgRef.current.innerHTML = window.crafterMermaid.renderToString(
				{ width: fg.width, height: fg.height, nodes: [], edges: [], groups: fg.groups },
				{ theme: getThemeObject() },
			);
			return;
		}
		svgRef.current.innerHTML = renderAtStep(fullGraphRef.current, steps, currentStep, getThemeObject());
	}, [currentStep, steps, getThemeObject, mode]);

	useEffect(() => {
		if (!playing) {
			if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
			return;
		}
		intervalRef.current = setInterval(() => {
			setCurrentStep((prev) => {
				if (prev >= steps.length - 1) { setPlaying(false); return prev; }
				return prev + 1;
			});
		}, 500);
		return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
	}, [playing, steps.length]);

	const currentStepInfo = currentStep >= 0 ? steps[currentStep] : null;
	const highlightedLine = currentStepInfo?.sourceLine;
	const sourceLines = source.split("\n");
	const accentColor = CATEGORY_COLORS[category] || "var(--accent-blue)";

	return (
		<div className="rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--border-hover)] transition-colors">
			<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
				<div className="flex items-center gap-3 min-w-0">
					<span
						className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
						style={{ color: accentColor, borderColor: accentColor + "40" }}
					>
						{category}
					</span>
					<span className="text-sm font-medium truncate">{title}</span>
				</div>
				<div className="flex items-center gap-2">
					{mode === "play" && (
						<span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
							{currentStep + 1}/{steps.length}
						</span>
					)}
					{mode === "view" ? (
						<button
							onClick={enterPlayMode}
							className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
							style={{ color: accentColor }}
						>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							Play
						</button>
					) : (
						<div className="flex items-center gap-1">
							{playing ? (
								<button
									onClick={() => setPlaying(false)}
									className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
									style={{ color: accentColor }}
								>
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<rect x="6" y="4" width="4" height="16" />
										<rect x="14" y="4" width="4" height="16" />
									</svg>
								</button>
							) : (
								<button
									onClick={() => {
										if (currentStep >= steps.length - 1) {
											setCurrentStep(-1);
											setTimeout(() => setPlaying(true), 50);
										} else {
											setPlaying(true);
										}
									}}
									className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
									style={{ color: accentColor }}
								>
									<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
										<polygon points="5 3 19 12 5 21 5 3" />
									</svg>
								</button>
							)}
							<button
								onClick={exitPlayMode}
								className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] cursor-pointer"
							>
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<rect x="3" y="3" width="18" height="18" rx="2" />
								</svg>
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
				<div className="relative h-[240px] overflow-auto bg-[var(--code-bg)]">
					{mode === "play" ? (
						<pre className="p-4 font-mono text-xs leading-5">
							{sourceLines.map((line, i) => (
								<div
									key={i}
									className={`px-2 -mx-2 rounded transition-colors duration-300 ${
										highlightedLine === i
											? "bg-[var(--accent-blue)]/15 text-[var(--text-primary)]"
											: "text-[var(--text-muted)]"
									}`}
								>
									{line || " "}
								</div>
							))}
						</pre>
					) : highlightedHtml ? (
						<div
							className="p-4 [&_pre]:!bg-transparent [&_code]:text-xs [&_code]:leading-5"
							dangerouslySetInnerHTML={{ __html: highlightedHtml }}
						/>
					) : (
						<pre className="p-4 font-mono text-xs leading-5 text-[var(--text-secondary)]">
							{source}
						</pre>
					)}
				</div>

				<div className="relative h-[240px] bg-[var(--bg-card)] flex items-center justify-center p-4">
					<div
						ref={svgRef}
						className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
					/>
					{mode === "play" && steps.length > 0 && (
						<div className="absolute bottom-2 left-2 right-2">
							<div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-300"
									style={{
										width: `${((currentStep + 1) / steps.length) * 100}%`,
										backgroundColor: accentColor,
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
				<p className="text-xs text-[var(--text-muted)]">{description}</p>
			</div>
		</div>
	);
}
