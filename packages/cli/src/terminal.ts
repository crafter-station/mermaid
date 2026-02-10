import { parse } from "@crafter/mermaid-parser";
import { layout } from "@crafter/mermaid-layout";
import type { DiagramTheme } from "@crafter/mermaid-themes";
import { DEFAULTS, resolveColors } from "@crafter/mermaid-themes";
import { TerminalCanvas } from "./canvas";
import type { PositionedGraph, PositionedNode, PositionedEdge } from "@crafter/mermaid-layout";

interface RenderOptions {
	theme?: DiagramTheme;
	width?: number;
	compact?: boolean;
}

function getArrowChar(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): string {
	const dx = toX - fromX;
	const dy = toY - fromY;

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? "→" : "←";
	}
	return dy > 0 ? "↓" : "↑";
}

function drawNode(
	canvas: TerminalCanvas,
	node: PositionedNode,
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	const x = node.x * scale;
	const y = node.y * scale;
	const w = node.width * scale;
	const h = node.height * scale;

	const nodeColor = node.inlineStyle?.stroke ?? colors.nodeStroke;
	const textColor = node.inlineStyle?.color ?? colors.text;

	switch (node.shape) {
		case "state-start": {
			const cxs = Math.round(x + w / 2);
			const cys = Math.round(y + h / 2);
			canvas.set(cxs, cys, "\u25CF", nodeColor);
			return;
		}
		case "state-end": {
			const cxe = Math.round(x + w / 2);
			const cye = Math.round(y + h / 2);
			canvas.set(cxe, cye, "\u25C9", nodeColor);
			return;
		}
		case "rounded":
		case "stadium":
			canvas.roundedBox(x, y, w, h, nodeColor);
			break;
		case "diamond":
			canvas.diamond(x + w / 2, y + h / 2, w, h, nodeColor);
			break;
		case "circle":
			canvas.roundedBox(x, y, w, h, nodeColor);
			canvas.text(x + 1, y, "(", nodeColor);
			canvas.text(x + w - 2, y, ")", nodeColor);
			canvas.text(x + 1, y + h - 1, "(", nodeColor);
			canvas.text(x + w - 2, y + h - 1, ")", nodeColor);
			break;
		case "hexagon":
			canvas.diamond(x + w / 2, y + h / 2, w, h, nodeColor);
			break;
		default:
			canvas.box(x, y, w, h, nodeColor);
			break;
	}

	const label = node.label || node.id;
	const labelLines = label.split("\n");
	const startY = y + Math.floor(h / 2) - Math.floor(labelLines.length / 2);

	for (let i = 0; i < labelLines.length; i++) {
		const line = labelLines[i]!;
		const textX = x + Math.floor(w / 2) - Math.floor(line.length / 2);
		const textY = startY + i;
		canvas.text(textX, textY, line, textColor);
	}
}

function drawEdge(
	canvas: TerminalCanvas,
	edge: PositionedEdge,
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	if (edge.points.length < 2) return;

	const lineColor = colors.line;
	const arrowColor = colors.arrow;

	for (let i = 0; i < edge.points.length - 1; i++) {
		const p1 = edge.points[i]!;
		const p2 = edge.points[i + 1]!;

		const x1 = p1.x * scale;
		const y1 = p1.y * scale;
		const x2 = p2.x * scale;
		const y2 = p2.y * scale;

		canvas.line(x1, y1, x2, y2, edge.style === "dotted" ? "·" : "─", lineColor);
	}

	if (edge.hasArrowEnd && edge.points.length >= 2) {
		const lastPoint = edge.points[edge.points.length - 1]!;
		const secondLastPoint = edge.points[edge.points.length - 2]!;

		const arrowX = lastPoint.x * scale;
		const arrowY = lastPoint.y * scale;
		const fromX = secondLastPoint.x * scale;
		const fromY = secondLastPoint.y * scale;

		const arrow = getArrowChar(fromX, fromY, arrowX, arrowY);
		canvas.set(arrowX, arrowY, arrow, arrowColor);
	}

	if (edge.hasArrowStart && edge.points.length >= 2) {
		const firstPoint = edge.points[0]!;
		const secondPoint = edge.points[1]!;

		const arrowX = firstPoint.x * scale;
		const arrowY = firstPoint.y * scale;
		const fromX = secondPoint.x * scale;
		const fromY = secondPoint.y * scale;

		const arrow = getArrowChar(fromX, fromY, arrowX, arrowY);
		canvas.set(arrowX, arrowY, arrow, arrowColor);
	}

	if (edge.label && edge.labelPosition) {
		const labelX = edge.labelPosition.x * scale;
		const labelY = edge.labelPosition.y * scale;
		canvas.text(labelX, labelY, edge.label, colors.muted);
	}
}

function drawGroup(
	canvas: TerminalCanvas,
	group: PositionedGraph["groups"][number],
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	const x = group.x * scale;
	const y = group.y * scale;
	const w = group.width * scale;
	const h = group.height * scale;

	canvas.roundedBox(x, y, w, h, colors.groupStroke);

	if (group.label) {
		const labelX = x + 2;
		const labelY = y;
		canvas.text(labelX, labelY, group.label, colors.groupText);
	}

	for (const child of group.children) {
		drawGroup(canvas, child, scale, colors);
	}
}

export function renderToTerminal(
	text: string,
	options: RenderOptions = {},
): string {
	const parseResult = parse(text);

	if (!parseResult.ast) {
		const errors = parseResult.diagnostics.map((d) => d.message).join("\n");
		throw new Error(`Parse error:\n${errors}`);
	}

	const ast = parseResult.ast;
	const graph = layout(ast);

	const terminalWidth = options.width ?? process.stdout.columns ?? 80;
	const scale = options.compact
		? Math.min(0.1, terminalWidth / graph.width)
		: Math.min(0.15, terminalWidth / graph.width);

	const canvasWidth = Math.ceil(graph.width * scale);
	const canvasHeight = Math.ceil(graph.height * scale);

	const canvas = new TerminalCanvas(canvasWidth, canvasHeight);

	const theme = options.theme ?? DEFAULTS;
	const colors = resolveColors(theme);

	for (const group of graph.groups) {
		drawGroup(canvas, group, scale, colors);
	}

	for (const edge of graph.edges) {
		drawEdge(canvas, edge, scale, colors);
	}

	for (const node of graph.nodes) {
		drawNode(canvas, node, scale, colors);
	}

	return canvas.toString();
}
