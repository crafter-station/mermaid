import type { PositionedGraph, PositionedGroup } from "@crafter/mermaid-layout";
import { DEFAULTS, resolveColors } from "@crafter/mermaid-themes";
import type { RenderOptions, RenderContext } from "../types";
import { renderEdge } from "./edges";
import { renderEdgeLabel, renderGroupLabel, renderNodeLabel } from "./labels";
import { renderMarkers } from "./markers";
import { renderShape } from "./shapes";

function renderGroupBackground(group: PositionedGroup, _ctx: RenderContext): string {
	return `<rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" fill="var(--_group-fill)" stroke="var(--_group-stroke)" stroke-width="1.5" rx="4"/>`;
}

function renderGroups(groups: PositionedGroup[], ctx: RenderContext): string {
	return groups
		.flatMap((group) => {
			const children = group.children.length > 0 ? renderGroups(group.children, ctx) : "";
			return renderGroupBackground(group, ctx) + renderGroupLabel(group, ctx) + children;
		})
		.join("");
}

function renderDebugOverlays(graph: PositionedGraph, ctx: RenderContext): string {
	if (!ctx.debug) return "";

	const parts: string[] = [];

	const gridSize = 50;
	const maxX = graph.width + ctx.padding * 2;
	const maxY = graph.height + ctx.padding * 2;

	for (let x = 0; x <= maxX; x += gridSize) {
		parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${maxY}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`);
		parts.push(`<text x="${x + 2}" y="10" fill="rgba(255,255,255,0.3)" font-size="8" font-family="monospace">${x}</text>`);
	}
	for (let y = 0; y <= maxY; y += gridSize) {
		parts.push(`<line x1="0" y1="${y}" x2="${maxX}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`);
		parts.push(`<text x="2" y="${y - 2}" fill="rgba(255,255,255,0.3)" font-size="8" font-family="monospace">${y}</text>`);
	}

	for (const node of graph.nodes) {
		parts.push(`<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="none" stroke="rgba(239,68,68,0.5)" stroke-width="0.5" stroke-dasharray="3 2"/>`);
		parts.push(`<text x="${node.x}" y="${node.y - 4}" fill="rgba(239,68,68,0.7)" font-size="9" font-family="monospace">${node.id}</text>`);
	}

	for (const edge of graph.edges) {
		for (const point of edge.points) {
			parts.push(`<circle cx="${point.x}" cy="${point.y}" r="3" fill="rgba(59,130,246,0.6)" stroke="rgba(59,130,246,0.8)" stroke-width="0.5"/>`);
		}
	}

	return `<g class="debug-overlays">${parts.join("")}</g>`;
}

export function renderToString(graph: PositionedGraph, options?: RenderOptions): string {
	const theme = options?.theme ?? DEFAULTS;
	const padding = options?.padding ?? 16;
	const transparent = options?.transparent ?? false;
	const debug = options?.debug ?? false;

	const colors = resolveColors(theme);
	const ctx: RenderContext = {
		colors,
		padding,
		transparent,
		debug,
		font: colors.font,
	};

	const width = graph.width + padding * 2;
	const height = graph.height + padding * 2;

	const bgFill = transparent ? "none" : colors.bg;

	const svgId = `cm-${Math.random().toString(36).slice(2, 8)}`;
	const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap";
	const styleBlock = `
		<style>
			@import url('${fontUrl}');
			#${svgId} {
				--bg: ${colors.bg};
				--fg: ${colors.fg};
				--_text: ${colors.text};
				--_line: ${colors.line};
				--_arrow: ${colors.arrow};
				--_node-fill: ${colors.nodeFill};
				--_node-stroke: ${colors.nodeStroke};
				--_muted: ${colors.muted};
				--_group-fill: ${colors.groupFill};
				--_group-stroke: ${colors.groupStroke};
				--_group-text: ${colors.groupText};
			}
		</style>
	`;

	const markers = renderMarkers(ctx);
	const groupsMarkup = renderGroups(graph.groups, ctx);
	const edgesMarkup = graph.edges.map((edge) => renderEdge(edge, ctx)).join("");
	const edgeLabelsMarkup = graph.edges.map((edge) => renderEdgeLabel(edge, ctx)).join("");
	const nodesMarkup = graph.nodes
		.map((node) => {
			const shape = renderShape(node, ctx);
			const label = renderNodeLabel(node, ctx);
			return shape + label;
		})
		.join("");

	const debugMarkup = renderDebugOverlays(graph, ctx);

	const content = `
		<svg id="${svgId}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${styleBlock}
			<rect width="${width}" height="${height}" fill="${bgFill}"/>
			${markers}
			<g transform="translate(${padding}, ${padding})">
				${groupsMarkup}
				${edgesMarkup}
				${edgeLabelsMarkup}
				${nodesMarkup}
			</g>
			${debugMarkup}
		</svg>
	`
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join("\n");

	return content;
}
