import { parse, detectDiagramType } from "@crafter/mermaid-parser";
import { layout } from "@crafter/mermaid-layout";
import { renderToString } from "@crafter/mermaid-renderer";
import { THEMES, DEFAULTS } from "@crafter/mermaid-themes";
import type { DiagramAST, ParseResult } from "@crafter/mermaid-parser";
import type { PositionedGraph, LayoutOptions } from "@crafter/mermaid-layout";
import type { RenderOptions } from "@crafter/mermaid-renderer";
import type { DiagramColors, DiagramTheme } from "@crafter/mermaid-themes";

export interface CrafterMermaidOptions extends LayoutOptions {
	theme?: DiagramTheme;
	padding?: number;
	transparent?: boolean;
	debug?: boolean;
}

export function render(text: string, options: CrafterMermaidOptions = {}): string {
	const { theme, padding, transparent, debug, ...layoutOpts } = options;

	const result = parse(text);
	if (!result.ast) {
		const errors = result.diagnostics.map((d) => d.message).join("\n");
		throw new Error(`Failed to parse diagram:\n${errors}`);
	}

	const positioned = layout(result.ast, {
		direction: layoutOpts.direction,
		nodeSpacing: layoutOpts.nodeSpacing,
		layerSpacing: layoutOpts.layerSpacing,
		padding: padding,
	});

	return renderToString(positioned, { theme, padding, transparent, debug });
}

export {
	parse,
	detectDiagramType,
	layout,
	renderToString,
	THEMES,
	DEFAULTS,
};

export type {
	DiagramAST,
	ParseResult,
	PositionedGraph,
	LayoutOptions,
	RenderOptions,
	DiagramColors,
	DiagramTheme,
};
