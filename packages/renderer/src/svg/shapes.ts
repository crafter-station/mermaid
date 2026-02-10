import type { PositionedNode } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

type ShapeRenderer = (node: PositionedNode, ctx: RenderContext) => string;

function rectangle(node: PositionedNode, ctx: RenderContext): string {
	return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="0"/>`;
}

function rounded(node: PositionedNode, ctx: RenderContext): string {
	return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="8"/>`;
}

function diamond(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const hw = node.width / 2;
	const hh = node.height / 2;
	const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function stadium(node: PositionedNode, ctx: RenderContext): string {
	const rx = Math.min(node.height / 2, node.width / 2);
	return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="${rx}"/>`;
}

function circle(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const r = Math.min(node.width, node.height) / 2;
	return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function subroutine(node: PositionedNode, ctx: RenderContext): string {
	const outer = `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="0"/>`;
	const inset = 4;
	const inner = `<rect x="${node.x + inset}" y="${node.y + inset}" width="${node.width - inset * 2}" height="${node.height - inset * 2}" fill="none" stroke="var(--_node-stroke)" stroke-width="1.5" rx="0"/>`;
	return outer + inner;
}

function doublecircle(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const r = Math.min(node.width, node.height) / 2;
	const innerR = r - 4;
	return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function hexagon(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const hw = node.width / 2;
	const hh = node.height / 2;
	const offset = hw * 0.3;
	const points = `${cx - hw + offset},${cy - hh} ${cx + hw - offset},${cy - hh} ${cx + hw},${cy} ${cx + hw - offset},${cy + hh} ${cx - hw + offset},${cy + hh} ${cx - hw},${cy}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function cylinder(node: PositionedNode, ctx: RenderContext): string {
	const topH = node.height * 0.1;
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;

	const path = `M ${x} ${y + topH}
		Q ${x} ${y}, ${x + w / 2} ${y}
		T ${x + w} ${y + topH}
		L ${x + w} ${y + h - topH}
		Q ${x + w} ${y + h}, ${x + w / 2} ${y + h}
		T ${x} ${y + h - topH}
		Z`;

	const ellipse = `<ellipse cx="${x + w / 2}" cy="${y + topH}" rx="${w / 2}" ry="${topH}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
	const body = `<path d="${path}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;

	return body + ellipse;
}

function asymmetric(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const offset = w * 0.15;
	const points = `${x},${y + h / 2} ${x + offset},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x},${y + h}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function trapezoid(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const offset = w * 0.15;
	const points = `${x + offset},${y} ${x + w - offset},${y} ${x + w},${y + h} ${x},${y + h}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function trapezoidAlt(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const offset = w * 0.15;
	const points = `${x},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x + offset},${y + h}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function parallelogram(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const offset = w * 0.15;
	const points = `${x + offset},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x},${y + h}`;
	return `<polygon points="${points}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function note(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const fold = Math.min(w, h) * 0.15;
	const path = `M ${x} ${y} L ${x + w - fold} ${y} L ${x + w} ${y + fold} L ${x + w} ${y + h} L ${x} ${y + h} Z M ${x + w - fold} ${y} L ${x + w - fold} ${y + fold} L ${x + w} ${y + fold}`;
	return `<path d="${path}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function cloud(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;

	const path = `M ${x + w * 0.25} ${y + h * 0.4}
		Q ${x} ${y + h * 0.4}, ${x} ${y + h * 0.6}
		Q ${x} ${y + h}, ${x + w * 0.2} ${y + h}
		Q ${x + w * 0.3} ${y + h}, ${x + w * 0.5} ${y + h * 0.95}
		Q ${x + w * 0.7} ${y + h}, ${x + w * 0.8} ${y + h}
		Q ${x + w} ${y + h}, ${x + w} ${y + h * 0.6}
		Q ${x + w} ${y + h * 0.4}, ${x + w * 0.75} ${y + h * 0.4}
		Q ${x + w * 0.8} ${y}, ${x + w * 0.5} ${y}
		Q ${x + w * 0.2} ${y}, ${x + w * 0.25} ${y + h * 0.4}
		Z`;
	return `<path d="${path}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5"/>`;
}

function stateStart(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const r = Math.min(node.width, node.height) / 4;
	return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--_text)" stroke="none"/>`;
}

function stateEnd(node: PositionedNode, ctx: RenderContext): string {
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const r = Math.min(node.width, node.height) / 3;
	const innerR = r * 0.6;
	return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--_text)" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="var(--_text)" stroke="none"/>`;
}

const PIE_COLORS = [
	"#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
	"#59a14f", "#edc948", "#b07aa1", "#ff9da7",
	"#9c755f", "#bab0ac",
];

function pieSlice(node: PositionedNode, _ctx: RenderContext): string {
	if (!node.inlineStyle) return "";
	const cx = parseFloat(node.inlineStyle.cx);
	const cy = parseFloat(node.inlineStyle.cy);
	const r = parseFloat(node.inlineStyle.radius);
	const start = parseFloat(node.inlineStyle.startAngle);
	const end = parseFloat(node.inlineStyle.endAngle);
	const idx = parseInt(node.inlineStyle.index);
	const color = PIE_COLORS[idx % PIE_COLORS.length];

	const x1 = cx + r * Math.cos(start);
	const y1 = cy + r * Math.sin(start);
	const x2 = cx + r * Math.cos(end);
	const y2 = cy + r * Math.sin(end);
	const largeArc = end - start > Math.PI ? 1 : 0;

	const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
	return `<path d="${path}" fill="${color}" stroke="var(--bg)" stroke-width="2"/>`;
}

function pieTitle(node: PositionedNode, ctx: RenderContext): string {
	return "";
}

function ganttSection(node: PositionedNode, _ctx: RenderContext): string {
	return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="var(--_group-fill)" stroke="none" rx="2"/>`;
}

function ganttBar(node: PositionedNode, _ctx: RenderContext): string {
	const status = node.inlineStyle?.status || "default";
	let fill = "var(--_node-fill)";
	let stroke = "var(--_node-stroke)";
	if (status === "done") fill = "var(--_muted)";
	if (status === "active") fill = "var(--_node-stroke)";
	if (status === "crit") { fill = "#e15759"; stroke = "#c44040"; }

	return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${fill}" stroke="${stroke}" stroke-width="1" rx="4"/>`;
}

function ganttTitle(node: PositionedNode, _ctx: RenderContext): string {
	return "";
}

function erEntity(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const attrCount = parseInt(node.inlineStyle?.attrCount || "0");

	let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="0"/>`;

	if (attrCount > 0) {
		const headerH = 14 * 1.2 + 16;
		const y1 = y + headerH;
		svg += `<line x1="${x}" y1="${y1}" x2="${x + w}" y2="${y1}" stroke="var(--_node-stroke)" stroke-width="1"/>`;
	}

	return svg;
}

function classBox(node: PositionedNode, ctx: RenderContext): string {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const lineHeight = 16;
	const padding = 12;
	const attrCount = parseInt(node.inlineStyle?.attrCount || "0");
	const methodCount = parseInt(node.inlineStyle?.methodCount || "0");

	let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="1.5" rx="0"/>`;

	const nameHeight = lineHeight + padding;
	const attrHeight = attrCount > 0 ? attrCount * lineHeight + padding : 0;

	if (attrCount > 0 || methodCount > 0) {
		const y1 = y + nameHeight;
		svg += `<line x1="${x}" y1="${y1}" x2="${x + w}" y2="${y1}" stroke="var(--_node-stroke)" stroke-width="1"/>`;
	}

	if (methodCount > 0 && attrCount > 0) {
		const y2 = y + nameHeight + attrHeight;
		svg += `<line x1="${x}" y1="${y2}" x2="${x + w}" y2="${y2}" stroke="var(--_node-stroke)" stroke-width="1"/>`;
	}

	return svg;
}

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
	rectangle,
	rounded,
	diamond,
	stadium,
	circle,
	subroutine,
	doublecircle,
	hexagon,
	cylinder,
	asymmetric,
	trapezoid,
	"trapezoid-alt": trapezoidAlt,
	parallelogram,
	note,
	cloud,
	"state-start": stateStart,
	"state-end": stateEnd,
	"pie-slice": pieSlice,
	"pie-title": pieTitle,
	"gantt-section": ganttSection,
	"gantt-bar": ganttBar,
	"gantt-title": ganttTitle,
	"class-box": classBox,
	"er-entity": erEntity,
};

export function renderShape(node: PositionedNode, ctx: RenderContext): string {
	const renderer = SHAPE_RENDERERS[node.shape];
	if (!renderer) {
		return rounded(node, ctx);
	}
	return renderer(node, ctx);
}
