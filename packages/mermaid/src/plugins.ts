import type { ParseResult } from "@crafter/mermaid-parser";
import type { PositionedNode, PositionedGraph, LayoutOptions } from "@crafter/mermaid-layout";
import type { DiagramTheme } from "@crafter/mermaid-themes";
import type { RenderContext } from "@crafter/mermaid-renderer";

export interface ShapePlugin {
	name: string;
	render: (node: PositionedNode, ctx: RenderContext) => string;
	estimateSize?: (label: string) => { width: number; height: number };
}

export interface DiagramPlugin {
	type: string;
	parse: (source: string) => ParseResult<any>;
	detect: (firstLine: string) => boolean;
	layout?: (ast: any, options: LayoutOptions) => PositionedGraph;
}

export interface ThemePlugin {
	name: string;
	theme: DiagramTheme;
}

export interface MermaidPlugin {
	name: string;
	shapes?: ShapePlugin[];
	diagrams?: DiagramPlugin[];
	themes?: ThemePlugin[];
}

const registry = {
	shapes: new Map<string, ShapePlugin>(),
	diagrams: new Map<string, DiagramPlugin>(),
	themes: new Map<string, ThemePlugin>(),
};

export function use(plugin: MermaidPlugin): void {
	if (plugin.shapes) {
		for (const shape of plugin.shapes) {
			registry.shapes.set(shape.name, shape);
		}
	}
	if (plugin.diagrams) {
		for (const diagram of plugin.diagrams) {
			registry.diagrams.set(diagram.type, diagram);
		}
	}
	if (plugin.themes) {
		for (const theme of plugin.themes) {
			registry.themes.set(theme.name, theme);
		}
	}
}

export function getRegistry() {
	return registry;
}

export function resetRegistry(): void {
	registry.shapes.clear();
	registry.diagrams.clear();
	registry.themes.clear();
}
