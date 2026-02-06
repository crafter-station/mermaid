import type { DiagramTheme, ResolvedColors } from "./types";

export function generateCssVars(theme: DiagramTheme): string {
	const vars: string[] = [];

	vars.push(`--bg: ${theme.bg};`);
	vars.push(`--fg: ${theme.fg};`);

	if (theme.line) vars.push(`--line: ${theme.line};`);
	if (theme.accent) vars.push(`--accent: ${theme.accent};`);
	if (theme.muted) vars.push(`--muted: ${theme.muted};`);
	if (theme.surface) vars.push(`--surface: ${theme.surface};`);
	if (theme.border) vars.push(`--border: ${theme.border};`);

	vars.push(`--_text: var(--fg);`);
	vars.push(`--_line: var(--line, color-mix(in srgb, var(--fg) 30%, var(--bg)));`);
	vars.push(`--_arrow: var(--accent, color-mix(in srgb, var(--fg) 50%, var(--bg)));`);
	vars.push(`--_node-fill: var(--surface, color-mix(in srgb, var(--fg) 3%, var(--bg)));`);
	vars.push(`--_node-stroke: var(--border, color-mix(in srgb, var(--fg) 20%, var(--bg)));`);
	vars.push(`--_muted: var(--muted, color-mix(in srgb, var(--fg) 50%, var(--bg)));`);
	vars.push(`--_group-fill: color-mix(in srgb, var(--fg) 5%, var(--bg));`);
	vars.push(`--_group-stroke: color-mix(in srgb, var(--fg) 15%, var(--bg));`);
	vars.push(`--_group-text: color-mix(in srgb, var(--fg) 60%, var(--bg));`);

	return vars.join("\n\t\t\t");
}

export function generateInlineStyle(theme: DiagramTheme): string {
	const vars: string[] = [];

	vars.push(`--bg: ${theme.bg}`);
	vars.push(`--fg: ${theme.fg}`);

	if (theme.line) vars.push(`--line: ${theme.line}`);
	if (theme.accent) vars.push(`--accent: ${theme.accent}`);
	if (theme.muted) vars.push(`--muted: ${theme.muted}`);
	if (theme.surface) vars.push(`--surface: ${theme.surface}`);
	if (theme.border) vars.push(`--border: ${theme.border}`);

	vars.push(`--_text: var(--fg)`);
	vars.push(`--_line: var(--line, color-mix(in srgb, var(--fg) 30%, var(--bg)))`);
	vars.push(`--_arrow: var(--accent, color-mix(in srgb, var(--fg) 50%, var(--bg)))`);
	vars.push(`--_node-fill: var(--surface, color-mix(in srgb, var(--fg) 3%, var(--bg)))`);
	vars.push(`--_node-stroke: var(--border, color-mix(in srgb, var(--fg) 20%, var(--bg)))`);
	vars.push(`--_muted: var(--muted, color-mix(in srgb, var(--fg) 50%, var(--bg)))`);
	vars.push(`--_group-fill: color-mix(in srgb, var(--fg) 5%, var(--bg))`);
	vars.push(`--_group-stroke: color-mix(in srgb, var(--fg) 15%, var(--bg))`);
	vars.push(`--_group-text: color-mix(in srgb, var(--fg) 60%, var(--bg))`);

	return vars.join("; ");
}

function hexMix(fg: string, bg: string, fgPercent: number): string {
	const fgRgb = hexToRgb(fg);
	const bgRgb = hexToRgb(bg);
	const factor = fgPercent / 100;
	const r = Math.round(fgRgb.r * factor + bgRgb.r * (1 - factor));
	const g = Math.round(fgRgb.g * factor + bgRgb.g * (1 - factor));
	const b = Math.round(fgRgb.b * factor + bgRgb.b * (1 - factor));
	return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const normalized = hex.replace("#", "");
	const r = Number.parseInt(normalized.slice(0, 2), 16);
	const g = Number.parseInt(normalized.slice(2, 4), 16);
	const b = Number.parseInt(normalized.slice(4, 6), 16);
	return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function resolveColors(theme: DiagramTheme): ResolvedColors {
	const bg = theme.bg;
	const fg = theme.fg;
	const accent = theme.accent ?? hexMix(fg, bg, 50);

	return {
		bg,
		fg,
		text: fg,
		line: theme.line ?? hexMix(fg, bg, 30),
		arrow: accent,
		muted: theme.muted ?? hexMix(fg, bg, 50),
		nodeFill: theme.surface ?? hexMix(fg, bg, 12),
		nodeStroke: theme.border ?? hexMix(accent, bg, 65),
		groupFill: hexMix(fg, bg, 5),
		groupStroke: hexMix(fg, bg, 15),
		groupText: hexMix(fg, bg, 60),
		font: theme.font ?? "ui-sans-serif, system-ui, sans-serif",
		monoFont: theme.monoFont ?? "ui-monospace, monospace",
	};
}
