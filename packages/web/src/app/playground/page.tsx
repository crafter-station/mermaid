"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useQueryState, parseAsString } from "nuqs";
import Script from "next/script";
import { codeToHtml } from "shiki";
import { useDiagramTheme, THEME_NAMES, type ThemeName } from "@/components/theme-context";
import { ChatPanel, type ChatPanelRef } from "@/components/chat/chat-panel";

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
		label: "Agent Flow",
		category: "agent-flow",
		source: `graph TD
  Domain([Domain]) --> QueryBilling[Query billing, costs, performance]
  Codebase[Codebase] --> ScanRoutes[Scan routes, deps, config]
  subgraph COLLECT
    QueryBilling --> DeepDive[Deep-dive top cost drivers]
    ScanRoutes --> Exploration[Exploration agents survey codebase]
    ScanRoutes --> LoadDocs[Load relevant, up-to-date docs]
  end
  DeepDive --> AgentPerDO[1 agent per DO issue]
  Exploration --> AgentPerDO
  LoadDocs --> AgentPerDO`,
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
  CUSTOMER {
    int id PK
    string name
    string email UK
  }
  ORDER {
    int id PK
    int customer_id FK
    date created_at
    float total
  }
  PRODUCT {
    int id PK
    string name
    float price
  }
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  LINE_ITEM }o--|| PRODUCT : references`,
	},
	{
		label: "State",
		category: "state",
		source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Processing : submit
  state Processing {
    [*] --> Parse
    Parse --> Validate
    Validate --> Execute
    Execute --> [*]
  }
  Processing --> Complete : done
  Processing --> Error : fail
  Error --> Idle : retry
  Complete --> [*]`,
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
	{
		label: "ISR Cache",
		category: "isr-cache",
		source: `graph LR
  Req1[Request to ISR Page A] --> Cache1[Caches]
  Cache1 -->|Miss| Fn1[Function 1 invoked]
  Same[Same time] --> Req2[Request to ISR Page A]
  Req2 --> Cache2[Caches]
  Cache2 -->|Miss| Fn2[Fulfilled by Function 1]
  Same --> Req3[Request to ISR Page A]
  Req3 --> Cache3[Caches]
  Cache3 -->|Miss| Fn3[Fulfilled by Function 1]`,
	},
	{
		label: "Infra",
		category: "infra",
		source: `graph TD
  Agent[Coding agent making<br>application improvements] -->|Pull requests| App[Your Application]
  App -->|Framework-defined Infrastructure| Infra[Infrastructure]
  Infra -->|Realtime observability| AIM[Agentic Infrastructure<br>Management]
  AIM -->|Production insights| Agent
  subgraph Self-Driving Infrastructure
    AIM
  end`,
	},
	{
		label: "AI Agent",
		category: "ai-agent",
		source: `graph LR
  Q[What is ShipAI] --> Accept([Accept])
  Accept --> Reason[Reason]
  Reason --> Return([Return])
  Return --> Output[Output]
  Reason --> Plan([Plan and act])
  Plan --> Search[Web search]
  Plan --> Fact[Fact]
  Plan --> Act[Act]`,
	},
];

interface Step {
	type: "node" | "edge" | "group";
	id: string;
	label: string;
	sourceLine?: number;
	edgeIndex?: number;
}

interface LayerStep {
	items: Step[];
	label: string;
}

interface SubgraphInfo {
	id: string;
	label: string;
	nodeIds: string[];
	children: SubgraphInfo[];
}

function decomposeSequence(ast: {
	nodes: { id: string; label: string }[];
	edges: { source: string; target: string; label?: string }[];
}): LayerStep[] {
	const steps: LayerStep[] = [];

	const participantSteps: Step[] = ast.nodes.map((n) => ({
		type: "node" as const, id: n.id, label: n.label,
	}));
	if (participantSteps.length > 0) {
		steps.push({ items: participantSteps, label: participantSteps.map((s) => s.label).join(", ") });
	}

	const lifelineSteps: Step[] = [];
	const messageSteps: { step: Step; index: number }[] = [];

	for (let i = 0; i < ast.edges.length; i++) {
		const e = ast.edges[i]!;
		if (e.source === e.target) {
			lifelineSteps.push({
				type: "edge" as const, id: `${e.source}->${e.target}`, label: `${e.source} lifeline`, edgeIndex: i,
			});
		} else {
			messageSteps.push({
				step: { type: "edge" as const, id: `${e.source}->${e.target}`, label: e.label || `${e.source} -> ${e.target}`, edgeIndex: i },
				index: i,
			});
		}
	}

	if (lifelineSteps.length > 0) {
		steps.push({ items: lifelineSteps, label: "Lifelines" });
	}

	for (const { step } of messageSteps) {
		steps.push({ items: [step], label: step.label });
	}

	return steps;
}

function smartDecompose(ast: {
	nodes: { id: string; label: string }[];
	edges: { source: string; target: string; label?: string }[];
	subgraphs?: SubgraphInfo[];
	astType?: string;
}, sourceLines: string[]): LayerStep[] {
	if (ast.astType === "sequence") {
		return decomposeSequence(ast);
	}
	const layerSteps: LayerStep[] = [];

	const groupNodes = new Map<string, Set<string>>();

	function mapSubgraphs(subs: SubgraphInfo[]): void {
		for (const sg of subs) {
			const allNodes = new Set<string>();
			function collectAll(sub: SubgraphInfo) {
				for (const nodeId of sub.nodeIds) allNodes.add(nodeId);
				for (const child of sub.children) collectAll(child);
			}
			collectAll(sg);
			groupNodes.set(sg.id, allNodes);
			if (sg.children.length > 0) mapSubgraphs(sg.children);
		}
	}
	if (ast.subgraphs) mapSubgraphs(ast.subgraphs);

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
	const emittedGroups = new Set<string>();
	const emittedNodes = new Set<string>();

	function isInnerEdge(source: string, target: string): boolean {
		for (const [, members] of groupNodes) {
			if (members.has(source) && members.has(target)) return true;
		}
		return false;
	}

	for (const layer of layers) {
		const nodeSteps: Step[] = [];
		for (const nodeId of layer) {
			if (emittedNodes.has(nodeId)) continue;
			emittedNodes.add(nodeId);
			const node = nodeMap.get(nodeId);
			nodeSteps.push({ type: "node", id: nodeId, label: node?.label || nodeId, sourceLine: findSourceLine(nodeId, "node") });
		}
		if (nodeSteps.length > 0) {
			const labels = nodeSteps.map((s) => s.label).join(", ");
			layerSteps.push({ items: nodeSteps, label: labels });
		}

		const innerEdgeSteps: Step[] = [];
		const outerEdgeSteps: Step[] = [];
		for (const nodeId of layer) {
			for (const target of fullAdj.get(nodeId) || []) {
				const edgeKey = `${nodeId}->${target}`;
				if (emittedEdges.has(edgeKey)) continue;
				emittedEdges.add(edgeKey);
				const edge = ast.edges.find((e) => e.source === nodeId && e.target === target);
				const step: Step = { type: "edge", id: edgeKey, label: edge?.label || `${nodeId} -> ${target}`, sourceLine: findSourceLine(nodeId, "edge", target) };
				if (isInnerEdge(nodeId, target)) {
					innerEdgeSteps.push(step);
				} else {
					outerEdgeSteps.push(step);
				}
			}
		}
		if (innerEdgeSteps.length > 0) {
			layerSteps.push({ items: innerEdgeSteps, label: `${innerEdgeSteps.length} edge${innerEdgeSteps.length > 1 ? "s" : ""}` });
		}

		const groupSteps: Step[] = [];
		for (const [groupId, members] of groupNodes) {
			if (emittedGroups.has(groupId)) continue;
			const allEmitted = [...members].every((id) => emittedNodes.has(id));
			if (allEmitted) {
				emittedGroups.add(groupId);
				groupSteps.push({ type: "group", id: groupId, label: groupId });
			}
		}
		if (groupSteps.length > 0) {
			const labels = groupSteps.map((s) => s.label).join(", ");
			layerSteps.push({ items: groupSteps, label: labels });
		}

		if (outerEdgeSteps.length > 0) {
			layerSteps.push({ items: outerEdgeSteps, label: `${outerEdgeSteps.length} edge${outerEdgeSteps.length > 1 ? "s" : ""}` });
		}
	}

	return layerSteps;
}

const BASE_DURATION_NODE = 500;
const BASE_DURATION_EDGE = 650;
const BASE_DURATION_GROUP = 400;
const BASE_GAP = 150;

const SPEED_PRESETS = [
	{ label: "0.5x", value: 2 },
	{ label: "1x", value: 1 },
	{ label: "1.5x", value: 1 / 1.5 },
	{ label: "2x", value: 0.5 },
] as const;

function getAnimDurations(multiplier: number) {
	return {
		node: Math.round(BASE_DURATION_NODE * multiplier),
		edge: Math.round(BASE_DURATION_EDGE * multiplier),
		group: Math.round(BASE_DURATION_GROUP * multiplier),
		gap: Math.round(BASE_GAP * multiplier),
		edgeLabel: Math.round(200 * multiplier),
	};
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
			const origDash = path.getAttribute("stroke-dasharray");
			if (origDash) path.setAttribute("data-original-dasharray", origDash);
			try {
				const length = path.getTotalLength();
				path.style.strokeDasharray = String(length);
				path.style.strokeDashoffset = String(length);
			} catch {}
			const markerEnd = path.getAttribute("marker-end");
			const markerStart = path.getAttribute("marker-start");
			if (markerEnd) {
				path.setAttribute("data-marker-end", markerEnd);
				path.removeAttribute("marker-end");
			}
			if (markerStart) {
				path.setAttribute("data-marker-start", markerStart);
				path.removeAttribute("marker-start");
			}
		}
	});

	svg.querySelectorAll("[data-edge-label-source]").forEach((el) => {
		(el as SVGGElement).style.opacity = "0";
	});

	svg.querySelectorAll("[data-group-id]").forEach((el) => {
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

function selectEdge(svg: SVGSVGElement, source: string, target: string, edgeIndex?: number): SVGGElement | null {
	if (edgeIndex !== undefined) {
		return svg.querySelector(`[data-edge-index="${edgeIndex}"]`) as SVGGElement | null;
	}
	return svg.querySelector(`[data-edge-source="${source}"][data-edge-target="${target}"]`) as SVGGElement | null;
}

function selectEdgeLabel(svg: SVGSVGElement, source: string, target: string, edgeIndex?: number): SVGGElement | null {
	if (edgeIndex !== undefined) {
		return svg.querySelector(`[data-edge-label-index="${edgeIndex}"]`) as SVGGElement | null;
	}
	return svg.querySelector(`[data-edge-label-source="${source}"][data-edge-label-target="${target}"]`) as SVGGElement | null;
}

function animateEdgeIn(svg: SVGSVGElement, source: string, target: string, edgeIndex: number | undefined, dur: number, labelDur: number): Promise<void> {
	const el = selectEdge(svg, source, target, edgeIndex);
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

			const originalDash = path.getAttribute("data-original-dasharray");
			if (originalDash) {
				path.style.strokeDasharray = originalDash;
			} else {
				path.style.strokeDasharray = "";
			}
			path.style.strokeDashoffset = "";
			path.style.transition = "";

			const label = selectEdgeLabel(svg, source, target, edgeIndex);
			if (label) {
				label.style.transition = `opacity ${labelDur}ms ease-out`;
				label.getBoundingClientRect();
				label.style.opacity = "1";
			}

			resolve();
		}, dur);
	});
}

function animateGroupIn(svg: SVGSVGElement, groupId: string, dur: number): Promise<void> {
	const el = svg.querySelector(`[data-group-id="${groupId}"]`) as SVGGElement | null;
	if (!el) return Promise.resolve();
	return new Promise((resolve) => {
		el.style.transition = `opacity ${dur}ms ease-out`;
		el.getBoundingClientRect();
		el.style.opacity = "1";
		setTimeout(resolve, dur);
	});
}

function revealInstantly(svg: SVGSVGElement, step: Step): void {
	if (step.type === "node") {
		const el = svg.querySelector(`[data-node-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "1"; el.style.transform = "scale(1)"; }
	} else if (step.type === "edge") {
		const [src, tgt] = step.id.split("->");
		const el = selectEdge(svg, src!, tgt!, step.edgeIndex);
		if (el) {
			el.style.transition = "none"; el.style.opacity = "1";
			const path = el.querySelector("path") as SVGPathElement | null;
			if (path) {
				path.style.transition = "none"; path.style.strokeDashoffset = "0";
				const originalDash = path.getAttribute("data-original-dasharray");
				path.style.strokeDasharray = originalDash || "";
				const savedEnd = path.getAttribute("data-marker-end");
				const savedStart = path.getAttribute("data-marker-start");
				if (savedEnd) path.setAttribute("marker-end", savedEnd);
				if (savedStart) path.setAttribute("marker-start", savedStart);
			}
			const label = selectEdgeLabel(svg, src!, tgt!, step.edgeIndex);
			if (label) { label.style.transition = "none"; label.style.opacity = "1"; }
		}
	} else if (step.type === "group") {
		const el = svg.querySelector(`[data-group-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "1"; }
	}
}

function hideInstantly(svg: SVGSVGElement, step: Step): void {
	if (step.type === "node") {
		const el = svg.querySelector(`[data-node-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "0"; el.style.transform = "scale(0.92)"; }
	} else if (step.type === "edge") {
		const [src, tgt] = step.id.split("->");
		const el = selectEdge(svg, src!, tgt!, step.edgeIndex);
		if (el) {
			el.style.transition = "none"; el.style.opacity = "0";
			const path = el.querySelector("path") as SVGPathElement | null;
			if (path) {
				path.style.transition = "none";
				try {
					const length = path.getTotalLength();
					path.style.strokeDasharray = String(length);
					path.style.strokeDashoffset = String(length);
				} catch {}
				const end = path.getAttribute("data-marker-end");
				if (end) path.removeAttribute("marker-end");
				const start = path.getAttribute("data-marker-start");
				if (start) path.removeAttribute("marker-start");
			}
			const label = selectEdgeLabel(svg, src!, tgt!, step.edgeIndex);
			if (label) { label.style.transition = "none"; label.style.opacity = "0"; }
		}
	} else if (step.type === "group") {
		const el = svg.querySelector(`[data-group-id="${step.id}"]`) as SVGGElement | null;
		if (el) { el.style.transition = "none"; el.style.opacity = "0"; }
	}
}

type OutputTab = "svg" | "ascii" | "code";

export default function PlaygroundPage() {
	return (
		<Suspense>
			<PlaygroundContent />
		</Suspense>
	);
}

function PlaygroundContent() {
	const [tab, setTab] = useQueryState("tab", parseAsString.withDefault(PRESETS[0]!.category));
	const activePreset = PRESETS.find((p) => p.category === tab) || PRESETS[0]!;
	const [source, setSource] = useState(activePreset.source);
	const { themeName, setThemeName, getThemeObject } = useDiagramTheme();
	const { resolvedTheme, setTheme } = useTheme();
	const [error, setError] = useState<string | null>(null);
	const [renderTime, setRenderTime] = useState<number | null>(null);
	const [ready, setReady] = useState(false);
	const [mounted, setMounted] = useState(false);
	const svgRef = useRef<HTMLDivElement>(null);
	const domSvgRef = useRef<SVGSVGElement | null>(null);

	const [outputTab, setOutputTab] = useQueryState("output", parseAsString.withDefault("svg") as ReturnType<typeof parseAsString.withDefault<OutputTab>>);
	const [asciiHtml, setAsciiHtml] = useState("");
	const [svgCode, setSvgCode] = useState("");

	const [mode, setMode] = useState<"edit" | "play">("edit");
	const [steps, setSteps] = useState<LayerStep[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [playing, setPlaying] = useState(false);
	const [speedIndex, setSpeedIndex] = useState(1);
	const speedRef = useRef(SPEED_PRESETS[1]!.value);
	const animControlRef = useRef<{ cancel: boolean }>({ cancel: false });

	const [showChat, setShowChat] = useState(false);
	const chatPanelRef = useRef<ChatPanelRef>(null);
	const [interactions, setInteractions] = useState<Set<string>>(new Set());
	const cleanupsRef = useRef<Map<string, () => void>>(new Map());

	const [nodeCount, setNodeCount] = useState(0);
	const [edgeCount, setEdgeCount] = useState(0);
	const [copied, setCopied] = useState(false);
	const [highlightedHtml, setHighlightedHtml] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const highlightRef = useRef<HTMLDivElement>(null);

	const stepsRef = useRef<LayerStep[]>([]);
	stepsRef.current = steps;

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "i") {
				e.preventDefault();
				setShowChat((prev) => {
					const next = !prev;
					if (next) {
						setTimeout(() => chatPanelRef.current?.focusInput(), 0);
					}
					return next;
				});
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		const preset = PRESETS.find((p) => p.category === tab);
		if (preset && source !== preset.source) {
			setSource(preset.source);
		}
	}, [tab]);

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

			const graph = window.crafterMermaid.layout(result.ast, { nodeSpacing: 30, layerSpacing: 45 });
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

	const seekToStep = useCallback((targetStep: number) => {
		const svg = domSvgRef.current;
		if (!svg) return;
		animControlRef.current.cancel = true;
		setPlaying(false);

		const allSteps = stepsRef.current;
		for (let i = 0; i <= targetStep && i < allSteps.length; i++) {
			for (const item of allSteps[i]!.items) revealInstantly(svg, item);
		}
		for (let i = targetStep + 1; i < allSteps.length; i++) {
			for (const item of allSteps[i]!.items) hideInstantly(svg, item);
		}
		setCurrentStep(targetStep);
	}, []);

	const enterPlayMode = useCallback(() => {
		if (!window.crafterMermaid || !ready || !svgRef.current) return;
		clearInteractions();
		const result = window.crafterMermaid.parse(source);
		if (!result.ast) return;
		const graph = window.crafterMermaid.layout(result.ast, { nodeSpacing: 30, layerSpacing: 45 });

		const ast = result.ast as { type: string; subgraphs?: SubgraphInfo[] };
		const decomposed = smartDecompose({
			nodes: graph.nodes.map((n: { id: string; label: string }) => ({ id: n.id, label: n.label })),
			edges: graph.edges.map((e: { source: string; target: string; label?: string }) => ({ source: e.source, target: e.target, label: e.label })),
			subgraphs: ast.type === "flowchart" ? ast.subgraphs : undefined,
			astType: ast.type,
		}, source.split("\n"));
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

		svgRef.current.replaceChildren(svg);
		domSvgRef.current = svg;
		hideAllElements(svg);

		setTimeout(() => setPlaying(true), 150);
	}, [source, ready, clearInteractions, themeName]);

	const exitPlayMode = useCallback(() => {
		animControlRef.current.cancel = true;
		setPlaying(false);
		setMode("edit");
		setCurrentStep(-1);
		setSteps([]);
	}, []);

	useEffect(() => {
		if (!playing || !domSvgRef.current) return;

		const control = { cancel: false };
		animControlRef.current = control;
		const svg = domSvgRef.current;
		let step = currentStep;
		const allSteps = stepsRef.current;

		async function animateItem(item: Step): Promise<void> {
			const d = getAnimDurations(speedRef.current);
			if (item.type === "node") {
				await animateNodeIn(svg, item.id, d.node);
			} else if (item.type === "edge") {
				const [src, tgt] = item.id.split("->");
				await animateEdgeIn(svg, src!, tgt!, item.edgeIndex, d.edge, d.edgeLabel);
			} else if (item.type === "group") {
				await animateGroupIn(svg, item.id, d.group);
			}
		}

		async function runPlayback() {
			while (step < allSteps.length - 1 && !control.cancel) {
				step++;
				setCurrentStep(step);
				const layerStep = allSteps[step]!;

				await Promise.all(layerStep.items.map((item) => animateItem(item)));

				if (!control.cancel) {
					const d = getAnimDurations(speedRef.current);
					await new Promise((r) => setTimeout(r, d.gap));
				}
			}
			if (!control.cancel) {
				setPlaying(false);
			}
		}

		runPlayback();
		return () => { control.cancel = true; };
	}, [playing]);

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

	const currentLayerStep = currentStep >= 0 ? steps[currentStep] : null;
	const highlightedLine = currentLayerStep?.items[0]?.sourceLine;
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
								{Math.max(0, currentStep + 1)}/{steps.length}
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
							onClick={() => {
								const next = !showChat;
								setShowChat(next);
								if (next) {
									setTimeout(() => chatPanelRef.current?.focusInput(), 0);
								}
							}}
							className={`px-2 h-7 flex items-center justify-center gap-1 rounded-md border text-[11px] font-mono transition-colors cursor-pointer ${
								showChat
									? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30"
									: "border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
							}`}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5.2 7.4.4.1.6.5.5.9l-.4 1.7a.5.5 0 0 0 .7.6l2.5-1.2c.2-.1.5-.1.7 0A8 8 0 1 0 12 2z"/>
								<path d="M8 10h.01M12 10h.01M16 10h.01"/>
							</svg>
							AI
						</button>
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
							key={preset.category}
							onClick={() => { setTab(preset.category); setSource(preset.source); if (mode === "play") exitPlayMode(); else setMode("edit"); }}
							className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
								tab === preset.category
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
								onClick={() => seekToStep(Math.max(currentStep - 1, -1))}
								className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
							</button>
							{playing ? (
								<button
									onClick={() => { animControlRef.current.cancel = true; setPlaying(false); }}
									className="p-1 rounded bg-[var(--accent-cyan)] text-white cursor-pointer"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
								</button>
							) : (
								<button
									onClick={() => {
										if (currentStep >= steps.length - 1) {
											seekToStep(-1);
											setTimeout(() => setPlaying(true), 50);
										} else {
											setPlaying(true);
										}
									}}
									className="p-1 rounded bg-[var(--accent-cyan)] text-white cursor-pointer"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
								</button>
							)}
							<button
								onClick={() => seekToStep(Math.min(currentStep + 1, steps.length - 1))}
								className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-pointer"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
							</button>
							<div className="flex items-center gap-0.5 mx-1 px-1 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)]">
								{SPEED_PRESETS.map((preset, i) => (
									<button
										key={preset.label}
										onClick={() => { setSpeedIndex(i); speedRef.current = preset.value; }}
										className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
											speedIndex === i
												? "bg-[var(--accent-cyan)] text-white"
												: "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
										}`}
									>
										{preset.label}
									</button>
								))}
							</div>
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
												style={{ width: `${((Math.max(0, currentStep) + 1) / steps.length) * 100}%` }}
											/>
										</div>
										{currentLayerStep && (
											<p className="mt-2 text-[11px] font-mono text-[var(--accent-cyan)]">
												{currentLayerStep.items[0]?.type === "node" ? "+" : currentLayerStep.items[0]?.type === "group" ? "\u25A1" : "\u2192"} {currentLayerStep.label}
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

					{showChat && (
						<div className="w-[350px] shrink-0">
							<ChatPanel ref={chatPanelRef} source={source} onSourceChange={setSource} />
						</div>
					)}
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
