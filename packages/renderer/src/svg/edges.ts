import type { PositionedEdge } from "@crafter/mermaid-layout";
import type { RenderContext } from "../types";

export function roundedPathData(points: { x: number; y: number }[], radius: number): string {
	if (points.length < 2) return "";
	if (points.length === 2 || radius <= 0) {
		return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
	}

	const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		const next = points[i + 1]!;

		const dxIn = curr.x - prev.x;
		const dyIn = curr.y - prev.y;
		const dxOut = next.x - curr.x;
		const dyOut = next.y - curr.y;

		const lenIn = Math.sqrt(dxIn * dxIn + dyIn * dyIn);
		const lenOut = Math.sqrt(dxOut * dxOut + dyOut * dyOut);

		if (lenIn < 1 || lenOut < 1) {
			parts.push(`L ${curr.x} ${curr.y}`);
			continue;
		}

		const cross = dxIn * dyOut - dyIn * dxOut;
		if (Math.abs(cross) < 0.1) {
			parts.push(`L ${curr.x} ${curr.y}`);
			continue;
		}

		const r = Math.min(radius, lenIn / 2, lenOut / 2);

		const p1x = curr.x - (dxIn / lenIn) * r;
		const p1y = curr.y - (dyIn / lenIn) * r;
		const p2x = curr.x + (dxOut / lenOut) * r;
		const p2y = curr.y + (dyOut / lenOut) * r;

		const sweep = cross > 0 ? 1 : 0;

		parts.push(`L ${p1x} ${p1y}`);
		parts.push(`A ${r} ${r} 0 0 ${sweep} ${p2x} ${p2y}`);
	}

	const last = points[points.length - 1]!;
	parts.push(`L ${last.x} ${last.y}`);

	return parts.join(" ");
}

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

	const pathData = roundedPathData(points, 8);

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
