const FONT_RATIOS: Record<string, number> = {
	normal: 0.52,
	medium: 0.55,
	bold: 0.58,
};

export function estimateTextWidth(
	text: string,
	fontSize: number,
	fontWeight = 400,
): number {
	const ratio =
		fontWeight >= 600
			? FONT_RATIOS.bold
			: fontWeight >= 500
				? FONT_RATIOS.medium
				: FONT_RATIOS.normal;

	return text.length * fontSize * ratio;
}

export function estimateNodeSize(
	label: string,
	shape: string,
	fontSize = 14,
): { width: number; height: number } {
	const lines = label.split("\n");
	const maxLineWidth = Math.max(
		...lines.map((line) => estimateTextWidth(line, fontSize)),
	);
	const textHeight = lines.length * fontSize * 1.2;

	let width: number;
	let height: number;

	switch (shape) {
		case "state-start": {
			width = 28;
			height = 28;
			break;
		}
		case "state-end": {
			width = 32;
			height = 32;
			break;
		}
		case "diamond":
		case "rhombus": {
			width = maxLineWidth * 1.6 + 32;
			height = textHeight * 1.6 + 24;
			break;
		}
		case "circle":
		case "doublecircle": {
			const diameter = Math.max(maxLineWidth, textHeight) + 32;
			width = diameter;
			height = diameter;
			break;
		}
		case "stadium":
		case "pill": {
			width = maxLineWidth + textHeight + 16;
			height = textHeight + 16;
			break;
		}
		case "hexagon": {
			width = maxLineWidth + 48;
			height = textHeight + 24;
			break;
		}
		case "trapezoid":
		case "inv-trapezoid": {
			width = maxLineWidth + 56;
			height = textHeight + 24;
			break;
		}
		case "odd":
		case "lean-right":
		case "lean-left": {
			width = maxLineWidth + 40;
			height = textHeight + 24;
			break;
		}
		case "class-box": {
			width = maxLineWidth + 32;
			height = textHeight + 24;
			break;
		}
		case "er-entity": {
			const entityLines = label.split("\n");
			const hasAttrs = entityLines.includes("---");
			const headerH = fontSize * 1.2 + 16;
			if (hasAttrs) {
				const attrLines = entityLines.filter((l) => l !== "---" && l !== entityLines[0]);
				const nameWidth = estimateTextWidth(entityLines[0] || "", fontSize, 600);
				const attrWidths = attrLines.map((l) => estimateTextWidth(l, fontSize - 2));
				const maxAttrWidth = attrWidths.length > 0 ? Math.max(...attrWidths) : 0;
				width = Math.max(nameWidth, maxAttrWidth) + 48;
				const attrsH = attrLines.length * (fontSize - 2) * 1.4 + 12;
				height = headerH + attrsH;
			} else {
				const nameWidth = estimateTextWidth(entityLines[0] || "", fontSize, 600);
				width = Math.max(nameWidth + 40, 120);
				height = headerH + 24;
			}
			break;
		}
		case "rect":
		case "rectangle":
		case "rounded":
		case "square":
		default: {
			width = maxLineWidth + 24;
			height = textHeight + 16;
			break;
		}
	}

	return { width, height };
}
