import type { PositionedNode, PositionedEdge, PositionedGroup } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

function splitLabel(label: string): string[] {
	return label.split(/<br\s*\/?>|\n/);
}

export function renderNodeLabel(node: PositionedNode, ctx: RenderContext): string {
	if (node.shape === "pie-slice") {
		const cx = node.x + node.width / 2;
		const cy = node.y + node.height / 2;
		const percent = node.inlineStyle?.percent || "";
		return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="11" font-weight="600">${escapeXml(node.label)} ${percent}%</text>`;
	}

	if (node.shape === "pie-title") {
		const cx = node.x + node.width / 2;
		const cy = node.y + node.height / 2;
		return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="16" font-weight="600">${escapeXml(node.label)}</text>`;
	}

	if (node.shape === "gantt-title") {
		const cx = node.x + node.width / 2;
		const cy = node.y + node.height / 2;
		return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="16" font-weight="600">${escapeXml(node.label)}</text>`;
	}

	if (node.shape === "gantt-section") {
		const x = node.x + 8;
		const cy = node.y + node.height / 2;
		return `<text x="${x}" y="${cy}" dominant-baseline="middle" fill="var(--_group-text)" font-family="${ctx.font}" font-size="12" font-weight="600">${escapeXml(node.label)}</text>`;
	}

	if (node.shape === "gantt-bar") {
		const labelX = parseFloat(node.inlineStyle?.labelX || "0") + 4;
		const cy = node.y + node.height / 2;
		const barLabel = `<text x="${node.x + 6}" y="${cy}" dominant-baseline="middle" fill="var(--bg)" font-family="${ctx.font}" font-size="11" font-weight="500">${escapeXml(node.label)}</text>`;
		const sideLabel = `<text x="${labelX}" y="${cy}" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="11" font-weight="400">${escapeXml(node.label)}</text>`;
		return sideLabel + barLabel;
	}

	if (node.shape === "class-box") {
		return renderClassBoxLabel(node, ctx);
	}

	if (node.shape === "er-entity") {
		return renderEREntityLabel(node, ctx);
	}

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

function renderClassBoxLabel(node: PositionedNode, ctx: RenderContext): string {
	const parts = node.label.split("\n");
	const lineHeight = 16;
	const padding = 12;
	const x = node.x;
	const cx = node.x + node.width / 2;
	let currentY = node.y;

	let svg = "";

	let idx = 0;
	const className = parts[idx] || "";
	currentY += padding / 2 + lineHeight / 2;
	svg += `<text x="${cx}" y="${currentY}" text-anchor="middle" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="14" font-weight="600">${escapeXml(className)}</text>`;
	idx++;

	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		currentY = node.y + lineHeight + padding;

		while (idx < parts.length && parts[idx] !== "---") {
			currentY += lineHeight * 0.8;
			svg += `<text x="${x + padding}" y="${currentY}" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="12" font-weight="400">${escapeXml(parts[idx])}</text>`;
			idx++;
		}
	}

	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		const attrCount = parseInt(node.inlineStyle?.attrCount || "0");
		const attrHeight = attrCount > 0 ? attrCount * lineHeight + padding : 0;
		currentY = node.y + lineHeight + padding + attrHeight;

		while (idx < parts.length) {
			currentY += lineHeight * 0.8;
			svg += `<text x="${x + padding}" y="${currentY}" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="12" font-weight="400">${escapeXml(parts[idx])}</text>`;
			idx++;
		}
	}

	return svg;
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

function renderEREntityLabel(node: PositionedNode, ctx: RenderContext): string {
	const parts = node.label.split("\n");
	const x = node.x;
	const w = node.width;
	const cx = x + w / 2;
	const fontSize = 14;
	const attrFontSize = 12;
	const headerH = fontSize * 1.2 + 16;

	let svg = "";

	const entityName = parts[0] || "";
	const nameY = node.y + headerH / 2;
	svg += `<text x="${cx}" y="${nameY}" text-anchor="middle" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="${fontSize}" font-weight="600">${escapeXml(entityName)}</text>`;

	let idx = 1;
	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		const attrStartY = node.y + headerH + 8;
		const lineH = attrFontSize * 1.4;

		let attrIdx = 0;
		while (idx < parts.length && parts[idx] !== "---") {
			const attrLine = parts[idx] || "";
			const attrY = attrStartY + attrIdx * lineH + attrFontSize / 2;

			const keyMatch = attrLine.match(/^(PK|FK|UK|PK,FK|FK,PK)\s+/);
			if (keyMatch) {
				const keyText = keyMatch[1]!;
				const rest = attrLine.slice(keyMatch[0].length);
				svg += `<text x="${x + 8}" y="${attrY}" dominant-baseline="middle" fill="var(--_node-stroke)" font-family="${ctx.font}" font-size="10" font-weight="600">${escapeXml(keyText)}</text>`;
				svg += `<text x="${x + 34}" y="${attrY}" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="${attrFontSize}" font-weight="400">${escapeXml(rest)}</text>`;
			} else {
				svg += `<text x="${x + 34}" y="${attrY}" dominant-baseline="middle" fill="var(--_text)" font-family="${ctx.font}" font-size="${attrFontSize}" font-weight="400">${escapeXml(attrLine)}</text>`;
			}

			attrIdx++;
			idx++;
		}
	}

	const attrCount = parseInt(node.inlineStyle?.attrCount || "0");
	if (attrCount === 0) {
		const noAttrY = node.y + headerH + 10;
		svg += `<text x="${cx}" y="${noAttrY}" text-anchor="middle" dominant-baseline="middle" fill="var(--_muted)" font-family="${ctx.font}" font-size="11" font-style="italic">(no attributes)</text>`;
	}

	return svg;
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
