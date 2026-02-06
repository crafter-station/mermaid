import type {
	Direction,
	EdgeStyle,
	FlowchartAST,
	FlowchartEdge,
	FlowchartNode,
	FlowchartSubgraph,
	NodeShape,
	ParseDiagnostic,
	ParseResult,
	SourceSpan,
} from "../types";
import { createError, createSpan, createSpanForLine, createWarning } from "../errors";

interface ParserState {
	nodes: Map<string, FlowchartNode>;
	edges: FlowchartEdge[];
	subgraphs: FlowchartSubgraph[];
	classDefs: Map<string, Record<string, string>>;
	classAssignments: Map<string, string>;
	nodeStyles: Map<string, Record<string, string>>;
	diagnostics: ParseDiagnostic[];
	direction: Direction;
	subgraphStack: FlowchartSubgraph[];
	startCount: number;
	endCount: number;
}

const NODE_PATTERNS: Array<{ regex: RegExp; shape: NodeShape }> = [
	{ regex: /^([\w-]+)\(\(\((.+?)\)\)\)/, shape: "doublecircle" },
	{ regex: /^([\w-]+)\(\[(.+?)\]\)/, shape: "stadium" },
	{ regex: /^([\w-]+)\(\((.+?)\)\)/, shape: "circle" },
	{ regex: /^([\w-]+)\[\[(.+?)\]\]/, shape: "subroutine" },
	{ regex: /^([\w-]+)\[\((.+?)\)\]/, shape: "cylinder" },
	{ regex: /^([\w-]+)\[\/(.+?)\\\]/, shape: "trapezoid" },
	{ regex: /^([\w-]+)\[\\(.+?)\/\]/, shape: "trapezoid-alt" },
	{ regex: /^([\w-]+)>(.+?)\]/, shape: "asymmetric" },
	{ regex: /^([\w-]+)\{\{(.+?)\}\}/, shape: "hexagon" },
	{ regex: /^([\w-]+)\[(.+?)\]/, shape: "rectangle" },
	{ regex: /^([\w-]+)\((.+?)\)/, shape: "rounded" },
	{ regex: /^([\w-]+)\{(.+?)\}/, shape: "diamond" },
];

const BARE_NODE_REGEX = /^([\w-]+)/;
const CLASS_SHORTHAND_REGEX = /^:::([\w][\w-]*)/;
const ARROW_REGEX = /^(<)?(-->|-.->|==>|---|-\.-|===)(?:\|([^|]*)\|)?/;

export function parseFlowchart(
	source: string,
	isStateDiagram = false,
): ParseResult<FlowchartAST> {
	const lines = source
		.split(/[\n;]/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith("%%"));

	if (lines.length === 0) {
		return {
			ast: null,
			diagnostics: [createError("Empty diagram", createSpan(1, 1, 0, 0))],
		};
	}

	const state: ParserState = {
		nodes: new Map(),
		edges: [],
		subgraphs: [],
		classDefs: new Map(),
		classAssignments: new Map(),
		nodeStyles: new Map(),
		diagnostics: [],
		direction: "TD",
		subgraphStack: [],
		startCount: 0,
		endCount: 0,
	};

	const header = lines[0]!;

	if (isStateDiagram) {
		parseStateDiagramBody(lines, state, source);
	} else {
		const headerMatch = header.match(
			/^(?:graph|flowchart)\s+(TD|TB|LR|BT|RL)\s*$/i,
		);
		if (headerMatch) {
			state.direction = headerMatch[1]!.toUpperCase() as Direction;
		} else {
			state.diagnostics.push(
				createWarning(
					`Invalid header: "${header}". Expected "graph TD", "flowchart LR", etc.`,
					createSpanForLine(source, 0),
				),
			);
		}
		parseFlowchartBody(lines, state, source);
	}

	if (state.subgraphStack.length > 0) {
		state.diagnostics.push(
			createWarning(
				`Unclosed subgraph: ${state.subgraphStack[state.subgraphStack.length - 1]!.id}`,
				createSpan(1, 1, 0, 0),
			),
		);
		while (state.subgraphStack.length > 0) {
			const completed = state.subgraphStack.pop()!;
			if (state.subgraphStack.length > 0) {
				state.subgraphStack[state.subgraphStack.length - 1]!.children.push(completed);
			} else {
				state.subgraphs.push(completed);
			}
		}
	}

	return {
		ast: {
			type: "flowchart",
			direction: state.direction,
			nodes: state.nodes,
			edges: state.edges,
			subgraphs: state.subgraphs,
			classDefs: state.classDefs,
			classAssignments: state.classAssignments,
			nodeStyles: state.nodeStyles,
			span: createSpan(1, 1, 0, source.length),
		},
		diagnostics: state.diagnostics,
	};
}

function parseFlowchartBody(
	lines: string[],
	state: ParserState,
	source: string,
): void {
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]!;
		const span = createSpanForLine(source, i);

		const classDefMatch = line.match(/^classDef\s+(\w+)\s+(.+)$/);
		if (classDefMatch) {
			state.classDefs.set(classDefMatch[1]!, parseStyleProps(classDefMatch[2]!));
			continue;
		}

		const classAssignMatch = line.match(/^class\s+([\w,-]+)\s+(\w+)$/);
		if (classAssignMatch) {
			for (const id of classAssignMatch[1]!.split(",").map((s) => s.trim())) {
				state.classAssignments.set(id, classAssignMatch[2]!);
			}
			continue;
		}

		const styleMatch = line.match(/^style\s+([\w,-]+)\s+(.+)$/);
		if (styleMatch) {
			const props = parseStyleProps(styleMatch[2]!);
			for (const id of styleMatch[1]!.split(",").map((s) => s.trim())) {
				state.nodeStyles.set(id, { ...state.nodeStyles.get(id), ...props });
			}
			continue;
		}

		const dirMatch = line.match(/^direction\s+(TD|TB|LR|BT|RL)\s*$/i);
		if (dirMatch && state.subgraphStack.length > 0) {
			state.subgraphStack[state.subgraphStack.length - 1]!.direction =
				dirMatch[1]!.toUpperCase() as Direction;
			continue;
		}

		const subgraphMatch = line.match(/^subgraph\s+(.+)$/);
		if (subgraphMatch) {
			const rest = subgraphMatch[1]!.trim();
			const bracketMatch = rest.match(/^([\w-]+)\s*\[(.+)\]$/);
			let id: string;
			let label: string;
			if (bracketMatch) {
				id = bracketMatch[1]!;
				label = bracketMatch[2]!;
			} else {
				label = rest;
				id = rest.replace(/\s+/g, "_").replace(/[^\w]/g, "");
			}
			const sg: FlowchartSubgraph = { id, label, nodeIds: [], children: [], span };
			state.subgraphStack.push(sg);
			continue;
		}

		if (line === "end") {
			const completed = state.subgraphStack.pop();
			if (completed) {
				if (state.subgraphStack.length > 0) {
					state.subgraphStack[state.subgraphStack.length - 1]!.children.push(completed);
				} else {
					state.subgraphs.push(completed);
				}
			}
			continue;
		}

		parseEdgeLine(line, span, state);
	}
}

function parseStateDiagramBody(
	lines: string[],
	state: ParserState,
	source: string,
): void {
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]!;
		const span = createSpanForLine(source, i);

		const dirMatch = line.match(/^direction\s+(TD|TB|LR|BT|RL)\s*$/i);
		if (dirMatch) {
			if (state.subgraphStack.length > 0) {
				state.subgraphStack[state.subgraphStack.length - 1]!.direction =
					dirMatch[1]!.toUpperCase() as Direction;
			} else {
				state.direction = dirMatch[1]!.toUpperCase() as Direction;
			}
			continue;
		}

		const compositeMatch = line.match(/^state\s+(?:"([^"]+)"\s+as\s+)?(\w+)\s*\{$/);
		if (compositeMatch) {
			const label = compositeMatch[1] ?? compositeMatch[2]!;
			const id = compositeMatch[2]!;
			const sg: FlowchartSubgraph = { id, label, nodeIds: [], children: [], span };
			state.subgraphStack.push(sg);
			continue;
		}

		if (line === "}") {
			const completed = state.subgraphStack.pop();
			if (completed) {
				if (state.subgraphStack.length > 0) {
					state.subgraphStack[state.subgraphStack.length - 1]!.children.push(completed);
				} else {
					state.subgraphs.push(completed);
				}
			}
			continue;
		}

		const stateAliasMatch = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)\s*$/);
		if (stateAliasMatch) {
			registerNode(state, { id: stateAliasMatch[2]!, label: stateAliasMatch[1]!, shape: "rounded", span });
			continue;
		}

		const transitionMatch = line.match(
			/^(\[\*\]|[\w-]+)\s*(-->)\s*(\[\*\]|[\w-]+)(?:\s*:\s*(.+))?$/,
		);
		if (transitionMatch) {
			let sourceId = transitionMatch[1]!;
			let targetId = transitionMatch[3]!;
			const edgeLabel = transitionMatch[4]?.trim() || undefined;

			if (sourceId === "[*]") {
				state.startCount++;
				sourceId = `_start${state.startCount > 1 ? state.startCount : ""}`;
				registerNode(state, { id: sourceId, label: "", shape: "state-start", span });
			} else {
				ensureStateNode(state, sourceId, span);
			}

			if (targetId === "[*]") {
				state.endCount++;
				targetId = `_end${state.endCount > 1 ? state.endCount : ""}`;
				registerNode(state, { id: targetId, label: "", shape: "state-end", span });
			} else {
				ensureStateNode(state, targetId, span);
			}

			state.edges.push({
				source: sourceId,
				target: targetId,
				label: edgeLabel,
				style: "solid",
				hasArrowStart: false,
				hasArrowEnd: true,
				span,
			});
			continue;
		}

		const stateDescMatch = line.match(/^([\w-]+)\s*:\s*(.+)$/);
		if (stateDescMatch) {
			registerNode(state, {
				id: stateDescMatch[1]!,
				label: stateDescMatch[2]!.trim(),
				shape: "rounded",
				span,
			});
			continue;
		}
	}
}

function parseEdgeLine(line: string, span: SourceSpan, state: ParserState): void {
	let remaining = line.trim();

	const firstGroup = consumeNodeGroup(remaining, span, state);
	if (!firstGroup || firstGroup.ids.length === 0) {
		if (remaining.length > 0) {
			state.diagnostics.push(createWarning(`Skipping unrecognized line: ${line}`, span));
		}
		return;
	}

	remaining = firstGroup.remaining.trim();
	let prevGroupIds = firstGroup.ids;
	let hasEdge = false;

	while (remaining.length > 0) {
		const arrowMatch = remaining.match(ARROW_REGEX);
		if (!arrowMatch) break;

		const hasArrowStart = Boolean(arrowMatch[1]);
		const arrowOp = arrowMatch[2]!;
		const edgeLabel = arrowMatch[3]?.trim() || undefined;
		remaining = remaining.slice(arrowMatch[0].length).trim();

		const style = arrowStyleFromOp(arrowOp);
		const hasArrowEnd = arrowOp.endsWith(">");

		const nextGroup = consumeNodeGroup(remaining, span, state);
		if (!nextGroup || nextGroup.ids.length === 0) break;

		remaining = nextGroup.remaining.trim();

		for (const sourceId of prevGroupIds) {
			for (const targetId of nextGroup.ids) {
				state.edges.push({
					source: sourceId,
					target: targetId,
					label: edgeLabel,
					style,
					hasArrowStart,
					hasArrowEnd,
					span,
				});
			}
		}

		hasEdge = true;
		prevGroupIds = nextGroup.ids;
	}

	if (remaining.length > 0 || (!hasEdge && firstGroup.remaining.trim().length > 0)) {
		state.diagnostics.push(createWarning(`Skipping unrecognized line: ${line}`, span));
	}
}

interface ConsumedNodeGroup {
	ids: string[];
	remaining: string;
}

function consumeNodeGroup(
	text: string,
	span: SourceSpan,
	state: ParserState,
): ConsumedNodeGroup | null {
	const first = consumeNode(text, span, state);
	if (!first) return null;

	const ids = [first.id];
	let remaining = first.remaining.trim();

	while (remaining.startsWith("&")) {
		remaining = remaining.slice(1).trim();
		const next = consumeNode(remaining, span, state);
		if (!next) break;
		ids.push(next.id);
		remaining = next.remaining.trim();
	}

	return { ids, remaining };
}

interface ConsumedNode {
	id: string;
	remaining: string;
}

function consumeNode(
	text: string,
	span: SourceSpan,
	state: ParserState,
): ConsumedNode | null {
	let id: string | null = null;
	let remaining = text;

	for (const { regex, shape } of NODE_PATTERNS) {
		const match = text.match(regex);
		if (match) {
			id = match[1]!;
			const label = match[2]!;
			registerNode(state, { id, label, shape, span });
			remaining = text.slice(match[0].length);
			break;
		}
	}

	if (id === null) {
		const bareMatch = text.match(BARE_NODE_REGEX);
		if (bareMatch) {
			id = bareMatch[1]!;
			if (!state.nodes.has(id)) {
				registerNode(state, { id, label: id, shape: "rectangle", span });
			} else {
				trackInSubgraph(state, id);
			}
			remaining = text.slice(bareMatch[0].length);
		}
	}

	if (id === null) return null;

	const classMatch = remaining.match(CLASS_SHORTHAND_REGEX);
	if (classMatch) {
		state.classAssignments.set(id, classMatch[1]!);
		remaining = remaining.slice(classMatch[0].length);
	}

	return { id, remaining };
}

function registerNode(state: ParserState, node: FlowchartNode): void {
	if (!state.nodes.has(node.id)) {
		state.nodes.set(node.id, node);
	}
	trackInSubgraph(state, node.id);
}

function trackInSubgraph(state: ParserState, nodeId: string): void {
	if (state.subgraphStack.length > 0) {
		const current = state.subgraphStack[state.subgraphStack.length - 1]!;
		if (!current.nodeIds.includes(nodeId)) {
			current.nodeIds.push(nodeId);
		}
	}
}

function ensureStateNode(
	state: ParserState,
	id: string,
	span: SourceSpan,
): void {
	if (!state.nodes.has(id)) {
		registerNode(state, { id, label: id, shape: "rounded", span });
	} else {
		trackInSubgraph(state, id);
	}
}

function arrowStyleFromOp(op: string): EdgeStyle {
	if (op === "-.->" || op === "-.-") return "dotted";
	if (op === "==>" || op === "===") return "thick";
	return "solid";
}

function parseStyleProps(propsStr: string): Record<string, string> {
	const props: Record<string, string> = {};
	for (const pair of propsStr.split(",")) {
		const colonIdx = pair.indexOf(":");
		if (colonIdx > 0) {
			const key = pair.slice(0, colonIdx).trim();
			const val = pair.slice(colonIdx + 1).trim();
			if (key && val) {
				props[key] = val;
			}
		}
	}
	return props;
}
