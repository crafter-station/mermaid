"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Script from "next/script";
import { codeToHtml } from "shiki";
import { useDiagramTheme, THEME_NAMES, type ThemeName } from "@/components/theme-context";

const PRESETS: { label: string; category: string; source: string }[] = [
	{
		label: "Flowchart",
		category: "flowchart",
		source: `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[Alternative]
  C --> E[Result]
  D --> E
  E --> F{Another?}
  F -->|Yes| B
  F -->|No| G[End]`,
	},
	{
		label: "Sequence",
		category: "sequence",
		source: `sequenceDiagram
  participant C as Client
  participant S as Server
  participant D as Database
  C->>S: POST /api/login
  activate S
  S->>D: SELECT user
  activate D
  D-->>S: User record
  deactivate D
  S-->>C: 200 JWT Token
  deactivate S
  C->>S: GET /api/data
  S->>D: Query data
  D-->>S: Results
  S-->>C: 200 JSON`,
	},
	{
		label: "Class",
		category: "class",
		source: `classDiagram
  class Animal {
    +String name
    +int age
    +speak()
    +move()
  }
  class Dog {
    +String breed
    +fetch()
    +bark()
  }
  class Cat {
    +bool indoor
    +purr()
    +scratch()
  }
  Animal <|-- Dog
  Animal <|-- Cat
  Dog *-- Leg
  Cat --> Mouse`,
	},
	{
		label: "ER Diagram",
		category: "er",
		source: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  LINE_ITEM }o--|| PRODUCT : references
  PRODUCT }o--|| CATEGORY : belongs_to
  CUSTOMER ||--o{ REVIEW : writes
  REVIEW }o--|| PRODUCT : about`,
	},
	{
		label: "State",
		category: "state",
		source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch
  Loading --> Success : resolve
  Loading --> Error : reject
  Success --> Idle : reset
  Error --> Loading : retry
  Error --> Idle : dismiss
  Success --> [*]`,
	},
	{
		label: "Pie Chart",
		category: "pie",
		source: `pie title Tech Stack
  "TypeScript" : 45
  "Rust" : 25
  "Go" : 15
  "Python" : 10
  "Other" : 5`,
	},
	{
		label: "Gantt",
		category: "gantt",
		source: `gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Design
    Wireframes     :a1, 2025-01-01, 3d
    UI Design      :a2, after a1, 2d
  section Dev
    Frontend       :b1, after a2, 5d
    Backend        :b2, after a2, 4d
  section QA
    Testing        :c1, after b1, 3d`,
	},
	{
		label: "Mindmap",
		category: "mindmap",
		source: `mindmap
  root((Architecture))
    Frontend
      React
      Next.js
      Tailwind
    Backend
      Node.js
      PostgreSQL
      Redis
    DevOps
      Docker
      CI/CD
      Monitoring`,
	},
];

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
	return window.crafterMermaid.renderToString(
		{
			width: fg.width, height: fg.height,
			nodes: fg.nodes.filter((n) => visibleNodeIds.has(n.id)),
			edges: fg.edges.filter((e) => visibleEdgeIds.has(`${e.source}->${e.target}`)),
			groups: fg.groups,
		},
		{ theme, transparent: true },
	);
}

type OutputTab = "svg" | "ascii" | "code";

export default function PlaygroundPage() {
	const [source, setSource] = useState(PRESETS[0]!.source);
	const { themeName, setThemeName, getThemeObject } = useDiagramTheme();
	const { resolvedTheme, setTheme } = useTheme();
	const [error, setError] = useState<string | null>(null);
	const [renderTime, setRenderTime] = useState<number | null>(null);
	const [ready, setReady] = useState(false);
	const [mounted, setMounted] = useState(false);
	const svgRef = useRef<HTMLDivElement>(null);
	const domSvgRef = useRef<SVGSVGElement | null>(null);

	const [outputTab, setOutputTab] = useState<OutputTab>("svg");
	const [asciiHtml, setAsciiHtml] = useState("");
	const [svgCode, setSvgCode] = useState("");

	const [mode, setMode] = useState<"edit" | "play">("edit");
	const [steps, setSteps] = useState<Step[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const fullGraphRef = useRef<Record<string, unknown> | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [interactions, setInteractions] = useState<Set<string>>(new Set());
	const cleanupsRef = useRef<Map<string, () => void>>(new Map());

	const [nodeCount, setNodeCount] = useState(0);
	const [edgeCount, setEdgeCount] = useState(0);
	const [copied, setCopied] = useState(false);
	const [highlightedHtml, setHighlightedHtml] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const highlightRef = useRef<HTMLDivElement>(null);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		codeToHtml(source, {
			lang: "mermaid",
			themes: { light: "github-light", dark: "tokyo-night" },
			defaultColor: false,
		}).then(setHighlightedHtml).catch(() => {});
	}, [source]);

	const syncScroll = useCallback(() => {
		if (textareaRef.current && highlightRef.current) {
			highlightRef.current.scrollTop = textareaRef.current.scrollTop;
			highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
		}
	}, []);

	const handleScriptReady = useCallback(() => {
		setReady(true);
	}, []);

	const clearInteractions = useCallback(() => {
		for (const cleanup of cleanupsRef.current.values()) cleanup();
		cleanupsRef.current.clear();
		setInteractions(new Set());
	}, []);

	const renderDiagram = useCallback(() => {
		if (!svgRef.current || !window.crafterMermaid || !ready || mode !== "edit") return;
		clearInteractions();

		const start = performance.now();
		try {
			const result = window.crafterMermaid.parse(source);
			if (!result.ast) {
				setError("Parse error");
				return;
			}

			const ast = result.ast as {
				type?: string;
				nodes?: Map<string, unknown>;
				edges?: unknown[];
				messages?: unknown[];
				participants?: unknown[];
				classes?: Map<string, unknown>;
				relations?: unknown[];
				entities?: Map<string, unknown>;
				slices?: unknown[];
				sections?: unknown[];
				root?: unknown;
			};
			if (ast.type === "class") {
				setNodeCount(ast.classes?.size || 0);
				setEdgeCount(ast.relations?.length || 0);
			} else if (ast.type === "er") {
				setNodeCount(ast.entities?.size || 0);
				setEdgeCount(ast.relations?.length || 0);
			} else if (ast.type === "sequence") {
				setNodeCount(ast.participants?.length || 0);
				setEdgeCount(ast.messages?.length || 0);
			} else if (ast.type === "pie") {
				setNodeCount(ast.slices?.length || 0);
				setEdgeCount(0);
			} else {
				setNodeCount(ast.nodes?.size || 0);
				setEdgeCount(ast.edges?.length || 0);
			}

			const graph = window.crafterMermaid.layout(result.ast);
			const svg = window.crafterMermaid.renderToDOM(graph, {
				theme: window.crafterMermaid.THEMES[themeName],
				transparent: true,
			});
			svg.removeAttribute("width");
			svg.removeAttribute("height");
			svg.style.width = "100%";
			svg.style.height = "100%";
			svg.style.objectFit = "contain";

			svgRef.current.replaceChildren(svg);
			domSvgRef.current = svg;
			setError(null);
			setRenderTime(performance.now() - start);

			const svgString = window.crafterMermaid.render(source, {
				theme: window.crafterMermaid.THEMES[themeName],
				transparent: true,
			});
			setSvgCode(svgString);

			try {
				const ascii = window.crafterMermaid.renderToAscii(source, {
					theme: window.crafterMermaid.THEMES[themeName],
					width: 80,
				});
				setAsciiHtml(ascii);
			} catch {
				setAsciiHtml("");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Render error");
			setRenderTime(null);
		}
	}, [source, themeName, ready, mode, clearInteractions]);

	useEffect(() => {
		if (mode !== "edit") return;
		const timer = setTimeout(renderDiagram, 150);
		return () => clearTimeout(timer);
	}, [renderDiagram, mode]);

	const toggleInteraction = useCallback((key: string) => {
		const svg = domSvgRef.current;
		if (!svg || !window.crafterMermaid) return;

		setInteractions((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				const cleanup = cleanupsRef.current.get(key);
				if (cleanup) { cleanup(); cleanupsRef.current.delete(key); }
				next.delete(key);
			} else {
				const enableFn = window.crafterMermaid[key as keyof typeof window.crafterMermaid] as ((svg: SVGSVGElement) => () => void) | undefined;
				if (enableFn) {
					const cleanup = enableFn(svg);
					cleanupsRef.current.set(key, cleanup);
				}
				next.add(key);
			}
			return next;
		});
	}, []);

	const enterPlayMode = useCallback(() => {
		if (!window.crafterMermaid || !ready) return;
		clearInteractions();
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
	}, [source, ready, clearInteractions]);

	const exitPlayMode = useCallback(() => {
		setPlaying(false);
		if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
		setMode("edit");
		setCurrentStep(-1);
		setSteps([]);
	}, []);

	useEffect(() => {
		if (mode !== "play" || !svgRef.current || !fullGraphRef.current) return;
		if (currentStep === -1) {
			const fg = fullGraphRef.current as { width: number; height: number; groups: unknown[] };
			svgRef.current.innerHTML = window.crafterMermaid.renderToString(
				{ width: fg.width, height: fg.height, nodes: [], edges: [], groups: fg.groups },
				{ theme: getThemeObject(), transparent: true },
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

	const handleCopy = useCallback(async () => {
		const text = outputTab === "svg" ? svgCode : outputTab === "code" ? svgCode : source;
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [outputTab, svgCode, source]);

	const handleDownload = useCallback(() => {
		const blob = new Blob([svgCode], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "diagram.svg";
		a.click();
		URL.revokeObjectURL(url);
	}, [svgCode]);

	const currentStepInfo = currentStep >= 0 ? steps[currentStep] : null;
	const highlightedLine = currentStepInfo?.sourceLine;
	const sourceLines = source.split("\n");

	if (!mounted) return null;

	return (
		<>
			<Script src="/crafter-mermaid.browser.global.js" strategy="afterInteractive" onReady={handleScriptReady} />
			<div className="h-screen flex flex-col bg-[var(--bg-primary)]">
				<header className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
					<div className="flex items-center gap-4">
						<a href="/" className="font-mono text-sm font-semibold tracking-tight hover:text-[var(--accent-cyan)] transition-colors">
							@crafter/mermaid
						</a>
						<span className="text-xs font-mono text-[var(--text-muted)]">/</span>
						<span className="text-xs font-mono text-[var(--accent-cyan)]">playground</span>
					</div>

					<div className="flex items-center gap-3">
						{renderTime !== null && mode === "edit" && (
							<span className="text-xs font-mono text-[var(--accent-green)] tabular-nums">
								{renderTime.toFixed(1)}ms
							</span>
						)}
						{mode === "play" && (
							<span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
								{currentStep + 1}/{steps.length}
							</span>
						)}
						<div className="h-4 w-px bg-[var(--border)]" />
						<span className="text-xs font-mono text-[var(--text-muted)]">
							{nodeCount}N {edgeCount}E
						</span>
						<div className="h-4 w-px bg-[var(--border)]" />
						<select
							value={themeName}
							onChange={(e) => setThemeName(e.target.value as ThemeName)}
							className="text-[11px] font-mono bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] cursor-pointer"
						>
							{THEME_NAMES.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
						<button
							onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
							className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
						>
							{resolvedTheme === "dark" ? (
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
									<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
							) : (
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<path d="M14 8.5A6.5 6.5 0 017.5 2 5.5 5.5 0 1014 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							)}
						</button>
						<a
							href="https://github.com/crafter-station/mermaid"
							target="_blank"
							rel="noopener noreferrer"
							className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]"
						>
							<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
						</a>
					</div>
				</header>

				<div className="flex items-center gap-1 px-4 h-10 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 overflow-x-auto">
					{PRESETS.map((preset) => (
						<button
							key={preset.label}
							onClick={() => { setSource(preset.source); setMode("edit"); }}
							className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
								source === preset.source
									? "bg-[var(--accent-blue)] text-white"
									: "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
							}`}
						>
							{preset.label}
						</button>
					))}
					<div className="flex-1" />
					{mode === "edit" ? (
						<button
							onClick={enterPlayMode}
							className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/20 transition-colors cursor-pointer"
						>
							<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
							Animate
						</button>
					) : (
						<>
							<button
								onClick={() => { setPlaying(false); setCurrentStep((p) => Math.max(p - 1, -1)); }}
								className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
							</button>
							{playing ? (
								<button
									onClick={() => setPlaying(false)}
									className="p-1 rounded bg-[var(--accent-cyan)] text-white cursor-pointer"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
								</button>
							) : (
								<button
									onClick={() => {
										if (currentStep >= steps.length - 1) { setCurrentStep(-1); setTimeout(() => setPlaying(true), 50); }
										else setPlaying(true);
									}}
									className="p-1 rounded bg-[var(--accent-cyan)] text-white cursor-pointer"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
								</button>
							)}
							<button
								onClick={() => { setPlaying(false); setCurrentStep((p) => Math.min(p + 1, steps.length - 1)); }}
								className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
							</button>
							<button
								onClick={exitPlayMode}
								className="px-2 py-1 rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
							>
								Exit
							</button>
						</>
					)}
				</div>

				<div className="flex-1 flex min-h-0">
					<div className="w-[400px] shrink-0 flex flex-col border-r border-[var(--border)]">
						<div className="flex items-center justify-between px-3 h-8 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
							<span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Source</span>
							<span className="text-[10px] font-mono text-[var(--text-muted)]">{sourceLines.length} lines</span>
						</div>
						{mode === "edit" ? (
							<div className="flex-1 relative overflow-hidden">
								<div
									ref={highlightRef}
									className="absolute inset-0 overflow-auto p-4 pointer-events-none [&_pre]:!bg-transparent [&_code]:text-[13px] [&_code]:leading-6 [&_code]:font-mono"
									aria-hidden="true"
									dangerouslySetInnerHTML={{ __html: highlightedHtml }}
								/>
								<textarea
									ref={textareaRef}
									value={source}
									onChange={(e) => setSource(e.target.value)}
									onScroll={syncScroll}
									spellCheck={false}
									className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-6 bg-transparent text-transparent caret-[var(--text-primary)] resize-none focus:outline-none selection:bg-[var(--accent-blue)]/20"
									placeholder="Type mermaid diagram syntax..."
								/>
							</div>
						) : (
							<div className="flex-1 overflow-auto bg-[var(--code-bg)]">
								<pre className="p-4 font-mono text-[13px] leading-6">
									{sourceLines.map((line, i) => (
										<div
											key={i}
											className={`px-2 -mx-2 rounded transition-colors duration-300 ${
												highlightedLine === i
													? "bg-[var(--accent-cyan)]/15 text-[var(--text-primary)]"
													: "text-[var(--text-muted)]"
											}`}
										>
											<span className="inline-block w-6 mr-3 text-right text-[var(--text-muted)] opacity-40 select-none text-xs">{i + 1}</span>
											{line || " "}
										</div>
									))}
								</pre>
							</div>
						)}
						{error && mode === "edit" && (
							<div className="px-4 py-2 border-t border-[var(--accent-orange)]/30 bg-[var(--accent-orange)]/5">
								<p className="text-xs font-mono text-[var(--accent-orange)]">{error}</p>
							</div>
						)}
					</div>

					<div className="flex-1 flex flex-col min-w-0">
						<div className="flex items-center justify-between px-3 h-8 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
							<div className="flex items-center gap-1">
								{(["svg", "ascii", "code"] as OutputTab[]).map((tab) => (
									<button
										key={tab}
										onClick={() => setOutputTab(tab)}
										className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
											outputTab === tab
												? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
												: "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
										}`}
									>
										{tab === "svg" ? "Preview" : tab === "ascii" ? "Terminal" : "SVG Code"}
									</button>
								))}
							</div>
							<div className="flex items-center gap-1">
								<button
									onClick={handleCopy}
									className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
								>
									{copied ? "Copied" : "Copy"}
								</button>
								<button
									onClick={handleDownload}
									className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
								>
									Download SVG
								</button>
							</div>
						</div>

						{outputTab === "svg" && (
							<div className="flex-1 relative bg-[var(--bg-card)] overflow-hidden">
								<div
									ref={svgRef}
									className="w-full h-full p-8 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
								/>
								{mode === "play" && steps.length > 0 && (
									<div className="absolute bottom-4 left-4 right-4">
										<div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
											<div
												className="h-full bg-[var(--accent-cyan)] rounded-full transition-all duration-300"
												style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
											/>
										</div>
										{currentStepInfo && (
											<p className="mt-2 text-[11px] font-mono text-[var(--accent-cyan)]">
												{currentStepInfo.type === "node" ? "+" : "\u2192"} {currentStepInfo.label}
											</p>
										)}
									</div>
								)}
							</div>
						)}

						{outputTab === "ascii" && (
							<div className="flex-1 overflow-auto bg-[var(--code-bg)]">
								{asciiHtml ? (
									<pre
										className="p-6 font-mono text-[11px] leading-[15px] whitespace-pre"
										dangerouslySetInnerHTML={{ __html: asciiHtml }}
									/>
								) : (
									<div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm font-mono">
										No ASCII output
									</div>
								)}
							</div>
						)}

						{outputTab === "code" && (
							<div className="flex-1 overflow-auto bg-[var(--code-bg)]">
								<pre className="p-6 font-mono text-[11px] leading-5 text-[var(--text-secondary)] whitespace-pre-wrap break-all">
									{svgCode || "No SVG output"}
								</pre>
							</div>
						)}
					</div>
				</div>

				{mode === "edit" && (
					<div className="flex items-center gap-2 px-4 h-8 border-t border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
						<span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mr-2">Interact:</span>
						{[
							{ key: "enableZoomPan", label: "Zoom & Pan" },
							{ key: "enableKeyboard", label: "Keyboard" },
							{ key: "enableSearch", label: "Search" },
							{ key: "enableHover", label: "Hover" },
							{ key: "enableMinimap", label: "Minimap" },
						].map(({ key, label }) => (
							<button
								key={key}
								onClick={() => toggleInteraction(key)}
								className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
									interactions.has(key)
										? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
										: "text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--border-hover)]"
								}`}
							>
								{label}
							</button>
						))}
					</div>
				)}
			</div>
		</>
	);
}
