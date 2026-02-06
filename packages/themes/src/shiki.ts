import type { DiagramColors } from "./types";

export interface ShikiThemeLike {
	colors?: Record<string, string>;
	type?: "dark" | "light";
}

export function fromShikiTheme(theme: ShikiThemeLike): DiagramColors {
	const colors = theme.colors ?? {};

	const bg =
		colors["editor.background"] ?? (theme.type === "light" ? "#ffffff" : "#1e1e1e");
	const fg = colors["editor.foreground"] ?? (theme.type === "light" ? "#333333" : "#d4d4d4");

	const accent = colors["focusBorder"] ?? colors["button.background"];
	const line = colors["editorLineNumber.foreground"] ?? colors["editorIndentGuide.background"];
	const surface = colors["editor.lineHighlightBackground"] ?? colors["editorWidget.background"];
	const border = colors["panel.border"] ?? colors["editorGroup.border"];
	const muted = colors["editorLineNumber.activeForeground"];

	return {
		bg,
		fg,
		...(accent && { accent }),
		...(line && { line }),
		...(surface && { surface }),
		...(border && { border }),
		...(muted && { muted }),
	};
}
