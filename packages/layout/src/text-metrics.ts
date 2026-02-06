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
