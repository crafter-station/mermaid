import type { PositionedNode, PositionedEdge, PositionedGroup } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

function splitLabel(label: string): string[] {
	return label.split(/<br\s*\/?>|\n/);
}

export function renderNodeLabel(node: PositionedNode, ctx: RenderContext): string {
	const lines = splitLabel(node.label);
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const lineHeight = 16;
	const totalHeight = lines.length * lineHeight;
	const startY = cy - totalHeight / 2 + lineHeight / 2;

	const tspans = lines
		.map((line, i) => {
			const y = startY + i * lineHeight;
			return `<tspan x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
		})
		.join("");

	return `<text fill="var(--_text)" font-family="${ctx.font}" font-size="14" font-weight="400">${tspans}</text>`;
}

export function renderEdgeLabel(edge: PositionedEdge, ctx: RenderContext): string {
	if (!edge.label || !edge.labelPosition) return "";

	const { x, y } = edge.labelPosition;
	const lines = splitLabel(edge.label);
	const lineHeight = 14;
	const totalHeight = lines.length * lineHeight;
	const padding = 4;

	const bgWidth = Math.max(...lines.map((l) => l.length * 7)) + padding * 2;
	const bgHeight = totalHeight + padding * 2;
	const bgX = x - bgWidth / 2;
	const bgY = y - bgHeight / 2;

	const bg = `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" fill="var(--bg)" stroke="var(--_line)" stroke-width="0.75" rx="3"/>`;

	const startY = y - totalHeight / 2 + lineHeight / 2;
	const tspans = lines
		.map((line, i) => {
			const lineY = startY + i * lineHeight;
			return `<tspan x="${x}" y="${lineY}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</tspan>`;
		})
		.join("");

	const text = `<text fill="var(--_text)" font-family="${ctx.font}" font-size="11" font-weight="500">${tspans}</text>`;

	return bg + text;
}

export function renderGroupLabel(group: PositionedGroup, ctx: RenderContext): string {
	const lines = splitLabel(group.label);
	const x = group.x + 8;
	const y = group.y + 8;
	const lineHeight = 14;

	const tspans = lines
		.map((line, i) => {
			const lineY = y + i * lineHeight;
			return `<tspan x="${x}" y="${lineY}">${escapeXml(line)}</tspan>`;
		})
		.join("");

	return `<text fill="var(--_group-text)" font-family="${ctx.font}" font-size="12" font-weight="600">${tspans}</text>`;
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
