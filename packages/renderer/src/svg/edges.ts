import type { PositionedEdge } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

export function renderEdge(edge: PositionedEdge, ctx: RenderContext): string {
	const { points, style, hasArrowStart, hasArrowEnd } = edge;

	if (points.length < 2) return "";

	const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

	let strokeDasharray = "";
	let strokeWidth = "1.5";

	if (style === "dotted") {
		strokeDasharray = 'stroke-dasharray="6 4"';
	} else if (style === "thick") {
		strokeWidth = "2.5";
	}

	const markerStart = hasArrowStart ? 'marker-start="url(#arrowhead-start)"' : "";
	const markerEnd = hasArrowEnd ? 'marker-end="url(#arrowhead)"' : "";

	return `<path d="${pathData}" stroke="var(--_line)" stroke-width="${strokeWidth}" fill="none" stroke-linejoin="round" stroke-linecap="round" ${strokeDasharray} ${markerStart} ${markerEnd}/>`;
}
