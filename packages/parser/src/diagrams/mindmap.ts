import type {
	MindmapAST,
	MindmapNode,
	ParseDiagnostic,
	ParseResult,
} from "../types";
import {
	createError,
	createSpan,
	createSpanForLine,
	createWarning,
} from "../errors";

interface ParserState {
	root: MindmapNode | null;
	nodeStack: Array<{ node: MindmapNode; indent: number }>;
	diagnostics: ParseDiagnostic[];
	nodeIdCounter: number;
}

export function parseMindmap(source: string): ParseResult<MindmapAST> {
	const state: ParserState = {
		root: null,
		nodeStack: [],
		diagnostics: [],
		nodeIdCounter: 0,
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^mindmap\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);
		const indent = getIndentLevel(line);

		const node = parseNode(trimmed, lineSpan, state);
		if (!node) {
			continue;
		}

		if (state.root === null) {
			state.root = node;
			state.nodeStack = [{ node, indent }];
		} else {
			addNodeToHierarchy(node, indent, state);
		}
	}

	if (!state.root) {
		state.diagnostics.push(
			createError(
				"Mindmap must have at least one root node",
				createSpan(1, 1, 0, 0),
			),
		);

		return {
			ast: null,
			diagnostics: state.diagnostics,
		};
	}

	const ast: MindmapAST = {
		type: "mindmap",
		root: state.root,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}

function parseNode(
	line: string,
	span: SourceSpan,
	state: ParserState,
): MindmapNode | null {
	const shapes: Record<string, MindmapNode["shape"]> = {
		"((": "circle",
		"(": "rounded",
		"))": "bang",
		")": "cloud",
		"{{": "hexagon",
	};

	let label = line;
	let shape: MindmapNode["shape"] = "default";

	for (const [opener, nodeShape] of Object.entries(shapes)) {
		const closer = opener.split("").reverse().join("");
		const regex = new RegExp(`^\\${opener.split("").join("\\")}(.+?)\\${closer.split("").join("\\")}$`);
		const match = line.match(regex);

		if (match) {
			label = match[1];
			shape = nodeShape;
			break;
		}
	}

	if (!label) {
		state.diagnostics.push(
			createWarning(`Empty node label: ${line}`, span),
		);
		return null;
	}

	return {
		id: `node-${state.nodeIdCounter++}`,
		label,
		shape,
		children: [],
		span,
	};
}

function getIndentLevel(line: string): number {
	let indent = 0;
	for (const char of line) {
		if (char === " ") {
			indent++;
		} else if (char === "\t") {
			indent += 2;
		} else {
			break;
		}
	}
	return indent;
}

function addNodeToHierarchy(
	node: MindmapNode,
	indent: number,
	state: ParserState,
): void {
	while (
		state.nodeStack.length > 0 &&
		state.nodeStack[state.nodeStack.length - 1].indent >= indent
	) {
		state.nodeStack.pop();
	}

	if (state.nodeStack.length === 0) {
		state.diagnostics.push(
			createWarning(
				`Node at same or lower indent than root: ${node.label}`,
				node.span,
			),
		);
		return;
	}

	const parent = state.nodeStack[state.nodeStack.length - 1].node;
	parent.children.push(node);
	state.nodeStack.push({ node, indent });
}
