import type { RenderContext } from "../types";

export function renderMarkers(ctx: RenderContext): string {
	return `
		<defs>
			<marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M1,1 L11,4 L1,7 z" fill="var(--_arrow)" />
			</marker>
			<marker id="arrowhead-start" markerWidth="12" markerHeight="8" refX="1" refY="4" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M11,1 L1,4 L11,7 z" fill="var(--_arrow)" />
			</marker>
			<marker id="arrowhead-open" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M1,1 L11,4 L1,7" fill="none" stroke="var(--_arrow)" stroke-width="1.5" stroke-linejoin="round" />
			</marker>
			<marker id="arrowhead-cross" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M3,3 L9,9 M9,3 L3,9" stroke="var(--_arrow)" stroke-width="1.5" stroke-linecap="round" />
			</marker>
		</defs>
	`;
}
