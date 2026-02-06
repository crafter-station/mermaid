import { parse, detectDiagramType } from "@crafter/mermaid-parser";
import { layout } from "@crafter/mermaid-layout";
import { renderToString } from "@crafter/mermaid-renderer";
import { THEMES, DEFAULTS } from "@crafter/mermaid-themes";
import type { DiagramAST, ParseResult } from "@crafter/mermaid-parser";
import type { PositionedGraph, LayoutOptions } from "@crafter/mermaid-layout";
import type { RenderOptions } from "@crafter/mermaid-renderer";
import type { DiagramColors, DiagramTheme } from "@crafter/mermaid-themes";
import { getRegistry } from "./plugins";

export interface CrafterMermaidOptions extends LayoutOptions {
	theme?: DiagramTheme;
	padding?: number;
	transparent?: boolean;
	debug?: boolean;
}

export function render(text: string, options: CrafterMermaidOptions = {}): string {
	const { theme, padding, transparent, debug, ...layoutOpts } = options;
	const pluginRegistry = getRegistry();

	let result: ParseResult<any> | null = null;
	let positioned: PositionedGraph | null = null;

	const firstLine = text.split(/[\n;]/)[0]?.trim() || "";

	for (const [, plugin] of pluginRegistry.diagrams) {
		if (plugin.detect(firstLine)) {
			result = plugin.parse(text);
			if (result?.ast) {
				if (plugin.layout) {
					positioned = plugin.layout(result.ast, {
						direction: layoutOpts.direction,
						nodeSpacing: layoutOpts.nodeSpacing,
						layerSpacing: layoutOpts.layerSpacing,
						padding: padding,
					});
				}
				break;
			}
		}
	}

	if (!result) {
		result = parse(text);
		if (!result.ast) {
			const errors = result.diagnostics.map((d) => d.message).join("\n");
			throw new Error(`Failed to parse diagram:\n${errors}`);
		}
	}

	if (!positioned) {
		positioned = layout(result.ast, {
			direction: layoutOpts.direction,
			nodeSpacing: layoutOpts.nodeSpacing,
			layerSpacing: layoutOpts.layerSpacing,
			padding: padding,
		});
	}

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

export { use, resetRegistry, getRegistry } from "./plugins";

export type {
	DiagramAST,
	ParseResult,
	PositionedGraph,
	LayoutOptions,
	RenderOptions,
	DiagramColors,
	DiagramTheme,
};

export type {
	MermaidPlugin,
	ShapePlugin,
	DiagramPlugin,
	ThemePlugin,
} from "./plugins";
