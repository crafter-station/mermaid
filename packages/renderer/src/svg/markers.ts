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
			<marker id="er-one" markerWidth="20" markerHeight="16" refX="18" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="18" y1="2" x2="18" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<line x1="14" y1="2" x2="14" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="er-one-start" markerWidth="20" markerHeight="16" refX="2" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<line x1="6" y1="2" x2="6" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="er-many" markerWidth="20" markerHeight="16" refX="18" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="18" y1="2" x2="18" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<path d="M18,8 L6,2 M18,8 L6,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>
			</marker>
			<marker id="er-many-start" markerWidth="20" markerHeight="16" refX="2" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<path d="M2,8 L14,2 M2,8 L14,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>
			</marker>
			<marker id="er-zero-one" markerWidth="24" markerHeight="16" refX="22" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="22" y1="2" x2="22" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<circle cx="14" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="er-zero-one-start" markerWidth="24" markerHeight="16" refX="2" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/>
				<circle cx="10" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="er-zero-many" markerWidth="24" markerHeight="16" refX="22" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M22,8 L10,2 M22,8 L10,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>
				<circle cx="6" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="er-zero-many-start" markerWidth="24" markerHeight="16" refX="2" refY="8" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M2,8 L14,2 M2,8 L14,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>
				<circle cx="18" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
			<marker id="cls-inheritance" markerWidth="16" markerHeight="14" refX="1" refY="7" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M15,1 L1,7 L15,13 z" fill="var(--_node-fill)" stroke="var(--_line)" stroke-width="1.5" stroke-linejoin="round"/>
			</marker>
			<marker id="cls-composition" markerWidth="14" markerHeight="14" refX="1" refY="7" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M1,7 L7,1 L13,7 L7,13 z" fill="var(--_line)" stroke="var(--_line)" stroke-width="1"/>
			</marker>
			<marker id="cls-aggregation" markerWidth="14" markerHeight="14" refX="1" refY="7" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M1,7 L7,1 L13,7 L7,13 z" fill="var(--_node-fill)" stroke="var(--_line)" stroke-width="1.5"/>
			</marker>
		</defs>
	`;
}
