import type { PositionedEdge } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

const ER_MARKER_MAP: Record<string, { start: string; end: string }> = {
	one: { start: "er-one-start", end: "er-one" },
	many: { start: "er-many-start", end: "er-many" },
	"zero-one": { start: "er-zero-one-start", end: "er-zero-one" },
	"zero-many": { start: "er-zero-many-start", end: "er-zero-many" },
};

const CLASS_SOURCE_MARKERS: Record<string, string> = {
	inheritance: "cls-inheritance",
	realization: "cls-inheritance",
	composition: "cls-composition",
	aggregation: "cls-aggregation",
};

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

	const fromCard = edge.inlineStyle?.fromCardinality;
	const toCard = edge.inlineStyle?.toCardinality;
	const relationType = edge.inlineStyle?.relationType;

	let markerStart = "";
	let markerEnd = "";

	if (relationType && CLASS_SOURCE_MARKERS[relationType]) {
		markerStart = `marker-start="url(#${CLASS_SOURCE_MARKERS[relationType]!})"`;
	} else if (fromCard && ER_MARKER_MAP[fromCard]) {
		markerStart = `marker-start="url(#${ER_MARKER_MAP[fromCard]!.start})"`;
	} else if (hasArrowStart) {
		markerStart = 'marker-start="url(#arrowhead-start)"';
	}

	if (toCard && ER_MARKER_MAP[toCard]) {
		markerEnd = `marker-end="url(#${ER_MARKER_MAP[toCard]!.end})"`;
	} else if (hasArrowEnd) {
		markerEnd = 'marker-end="url(#arrowhead)"';
	}

	return `<path d="${pathData}" stroke="var(--_line)" stroke-width="${strokeWidth}" fill="none" stroke-linejoin="round" stroke-linecap="round" ${strokeDasharray} ${markerStart} ${markerEnd}/>`;
}
