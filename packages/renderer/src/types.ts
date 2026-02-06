import type { DiagramTheme, ResolvedColors } from "@crafter/mermaid-themes";

export interface RenderOptions {
	theme?: DiagramTheme;
	padding?: number;
	transparent?: boolean;
	debug?: boolean;
}

export interface RenderContext {
	colors: ResolvedColors;
	padding: number;
	transparent: boolean;
	debug: boolean;
	font: string;
}
