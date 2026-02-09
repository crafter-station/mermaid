import { parse } from "@crafter/mermaid-parser";
import { layout } from "@crafter/mermaid-layout";
import type { PositionedGraph, PositionedNode, PositionedEdge } from "@crafter/mermaid-layout";
import type { DiagramTheme } from "@crafter/mermaid-themes";
import { DEFAULTS, resolveColors } from "@crafter/mermaid-themes";

interface Cell {
	char: string;
	color?: string;
}

class AsciiCanvas {
	private buffer: Cell[][];
	public readonly width: number;
	public readonly height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.buffer = Array.from({ length: height }, () =>
			Array.from({ length: width }, () => ({ char: " " })),
		);
	}

	set(x: number, y: number, char: string, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		if (xi < 0 || xi >= this.width || yi < 0 || yi >= this.height) return;
		this.buffer[yi]![xi] = { char, color };
	}

	line(x1: number, y1: number, x2: number, y2: number, char?: string, color?: string): void {
		const x1i = Math.round(x1);
		const y1i = Math.round(y1);
		const x2i = Math.round(x2);
		const y2i = Math.round(y2);

		const dx = Math.abs(x2i - x1i);
		const dy = Math.abs(y2i - y1i);
		const sx = x1i < x2i ? 1 : -1;
		const sy = y1i < y2i ? 1 : -1;
		let err = dx - dy;
		let x = x1i;
		let y = y1i;

		while (true) {
			const lineChar = char ?? (dx > dy ? "─" : dy > dx ? "│" : "─");
			this.set(x, y, lineChar, color);
			if (x === x2i && y === y2i) break;
			const e2 = 2 * err;
			if (e2 > -dy) { err -= dy; x += sx; }
			if (e2 < dx) { err += dx; y += sy; }
		}
	}

	box(x: number, y: number, w: number, h: number, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		const wi = Math.round(w);
		const hi = Math.round(h);

		this.set(xi, yi, "┌", color);
		this.set(xi + wi - 1, yi, "┐", color);
		this.set(xi, yi + hi - 1, "└", color);
		this.set(xi + wi - 1, yi + hi - 1, "┘", color);

		for (let i = 1; i < wi - 1; i++) {
			this.set(xi + i, yi, "─", color);
			this.set(xi + i, yi + hi - 1, "─", color);
		}
		for (let i = 1; i < hi - 1; i++) {
			this.set(xi, yi + i, "│", color);
			this.set(xi + wi - 1, yi + i, "│", color);
		}
	}

	roundedBox(x: number, y: number, w: number, h: number, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		const wi = Math.round(w);
		const hi = Math.round(h);

		this.set(xi, yi, "╭", color);
		this.set(xi + wi - 1, yi, "╮", color);
		this.set(xi, yi + hi - 1, "╰", color);
		this.set(xi + wi - 1, yi + hi - 1, "╯", color);

		for (let i = 1; i < wi - 1; i++) {
			this.set(xi + i, yi, "─", color);
			this.set(xi + i, yi + hi - 1, "─", color);
		}
		for (let i = 1; i < hi - 1; i++) {
			this.set(xi, yi + i, "│", color);
			this.set(xi + wi - 1, yi + i, "│", color);
		}
	}

	diamond(cx: number, cy: number, w: number, h: number, color?: string): void {
		const cxi = Math.round(cx);
		const cyi = Math.round(cy);
		const halfW = Math.max(1, Math.floor(Math.round(w) / 2));
		const halfH = Math.max(1, Math.floor(Math.round(h) / 2));

		const x = cxi - halfW;
		const y = cyi - halfH;
		const bw = halfW * 2 + 1;
		const bh = halfH * 2 + 1;

		this.set(x, y, "◆", color);
		this.set(x + bw - 1, y, "◆", color);
		this.set(x, y + bh - 1, "◆", color);
		this.set(x + bw - 1, y + bh - 1, "◆", color);

		for (let i = 1; i < bw - 1; i++) {
			this.set(x + i, y, "─", color);
			this.set(x + i, y + bh - 1, "─", color);
		}
		for (let i = 1; i < bh - 1; i++) {
			this.set(x, y + i, "│", color);
			this.set(x + bw - 1, y + i, "│", color);
		}
	}

	text(x: number, y: number, text: string, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		for (let i = 0; i < text.length; i++) {
			this.set(xi + i, yi, text[i]!, color);
		}
	}

	toHtml(): string {
		const lines: string[] = [];
		for (const row of this.buffer) {
			let line = "";
			let currentColor: string | undefined;

			for (const cell of row) {
				const escaped = cell.char === "<" ? "&lt;" : cell.char === ">" ? "&gt;" : cell.char === "&" ? "&amp;" : cell.char;

				if (cell.color !== currentColor) {
					if (currentColor) line += "</span>";
					currentColor = cell.color;
					if (cell.color) {
						line += `<span style="color:${cell.color}">`;
					}
				}
				line += escaped;
			}

			if (currentColor) line += "</span>";
			lines.push(line);
		}
		return lines.join("\n");
	}
}

function getArrowChar(fromX: number, fromY: number, toX: number, toY: number): string {
	const dx = toX - fromX;
	const dy = toY - fromY;
	return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
}

function drawNode(
	canvas: AsciiCanvas,
	node: PositionedNode,
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	const x = node.x * scale;
	const y = node.y * scale;
	const w = node.width * scale;
	const h = node.height * scale;
	const nodeColor = colors.nodeStroke;
	const textColor = colors.text;

	switch (node.shape) {
		case "rounded":
		case "stadium":
			canvas.roundedBox(x, y, w, h, nodeColor);
			break;
		case "diamond":
			canvas.diamond(x + w / 2, y + h / 2, w, h, nodeColor);
			break;
		case "circle":
			canvas.roundedBox(x, y, w, h, nodeColor);
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
		canvas.text(textX, startY + i, line, textColor);
	}
}

function drawEdge(
	canvas: AsciiCanvas,
	edge: PositionedEdge,
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	if (edge.points.length < 2) return;

	for (let i = 0; i < edge.points.length - 1; i++) {
		const p1 = edge.points[i]!;
		const p2 = edge.points[i + 1]!;
		canvas.line(
			p1.x * scale, p1.y * scale,
			p2.x * scale, p2.y * scale,
			edge.style === "dotted" ? "·" : undefined,
			colors.line,
		);
	}

	if (edge.hasArrowEnd && edge.points.length >= 2) {
		const last = edge.points[edge.points.length - 1]!;
		const prev = edge.points[edge.points.length - 2]!;
		canvas.set(
			last.x * scale, last.y * scale,
			getArrowChar(prev.x * scale, prev.y * scale, last.x * scale, last.y * scale),
			colors.arrow,
		);
	}

	if (edge.label && edge.labelPosition) {
		canvas.text(edge.labelPosition.x * scale, edge.labelPosition.y * scale, edge.label, colors.muted);
	}
}

function drawGroup(
	canvas: AsciiCanvas,
	group: PositionedGraph["groups"][number],
	scale: number,
	colors: ReturnType<typeof resolveColors>,
): void {
	canvas.roundedBox(group.x * scale, group.y * scale, group.width * scale, group.height * scale, colors.groupStroke);

	if (group.label) {
		canvas.text(group.x * scale + 2, group.y * scale, group.label, colors.groupText);
	}

	for (const child of group.children) {
		drawGroup(canvas, child, scale, colors);
	}
}

export interface AsciiRenderOptions {
	theme?: DiagramTheme;
	width?: number;
}

export function renderToAscii(text: string, options: AsciiRenderOptions = {}): string {
	const result = parse(text);
	if (!result.ast) {
		const errors = result.diagnostics.map((d) => d.message).join("\n");
		throw new Error(`Parse error:\n${errors}`);
	}

	const graph = layout(result.ast);
	const targetWidth = options.width ?? 80;
	const scale = Math.min(0.15, targetWidth / graph.width);

	const canvasWidth = Math.ceil(graph.width * scale);
	const canvasHeight = Math.ceil(graph.height * scale);
	const canvas = new AsciiCanvas(canvasWidth, canvasHeight);

	const theme = options.theme ?? DEFAULTS;
	const colors = resolveColors(theme);

	for (const group of graph.groups) drawGroup(canvas, group, scale, colors);
	for (const edge of graph.edges) drawEdge(canvas, edge, scale, colors);
	for (const node of graph.nodes) drawNode(canvas, node, scale, colors);

	return canvas.toHtml();
}
