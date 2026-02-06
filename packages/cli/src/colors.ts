function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const normalized = hex.replace("#", "");
	const r = Number.parseInt(normalized.slice(0, 2), 16);
	const g = Number.parseInt(normalized.slice(2, 4), 16);
	const b = Number.parseInt(normalized.slice(4, 6), 16);
	return { r, g, b };
}

function rgbDistance(
	r1: number,
	g1: number,
	b1: number,
	r2: number,
	g2: number,
	b2: number,
): number {
	return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const ANSI_256_PALETTE: [number, number, number][] = [
	[0, 0, 0],
	[128, 0, 0],
	[0, 128, 0],
	[128, 128, 0],
	[0, 0, 128],
	[128, 0, 128],
	[0, 128, 128],
	[192, 192, 192],
	[128, 128, 128],
	[255, 0, 0],
	[0, 255, 0],
	[255, 255, 0],
	[0, 0, 255],
	[255, 0, 255],
	[0, 255, 255],
	[255, 255, 255],
];

for (let r = 0; r < 6; r++) {
	for (let g = 0; g < 6; g++) {
		for (let b = 0; b < 6; b++) {
			ANSI_256_PALETTE.push([
				r === 0 ? 0 : 55 + r * 40,
				g === 0 ? 0 : 55 + g * 40,
				b === 0 ? 0 : 55 + b * 40,
			]);
		}
	}
}

for (let i = 0; i < 24; i++) {
	const gray = 8 + i * 10;
	ANSI_256_PALETTE.push([gray, gray, gray]);
}

export function ansi256(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	let bestIndex = 0;
	let bestDistance = Infinity;

	for (let i = 0; i < ANSI_256_PALETTE.length; i++) {
		const [pr, pg, pb] = ANSI_256_PALETTE[i]!;
		const distance = rgbDistance(r, g, b, pr, pg, pb);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = i;
		}
	}

	return `\x1b[38;5;${bestIndex}m`;
}

export function truecolor(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	return `\x1b[38;2;${r};${g};${b}m`;
}

export function bg(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	return `\x1b[48;2;${r};${g};${b}m`;
}

export function reset(): string {
	return "\x1b[0m";
}

export function bold(): string {
	return "\x1b[1m";
}

export function dim(): string {
	return "\x1b[2m";
}

export function detectColorSupport(): "truecolor" | "256" | "none" {
	if (process.env.NO_COLOR) return "none";
	if (process.env.COLORTERM === "truecolor") return "truecolor";
	if (process.env.TERM?.includes("256")) return "256";
	return "256";
}

export function getColorCode(hex: string): string {
	const support = detectColorSupport();
	if (support === "none") return "";
	const colorFn = support === "truecolor" ? truecolor : ansi256;
	return colorFn(hex);
}

export function colorize(text: string, hex: string): string {
	const support = detectColorSupport();
	if (support === "none") return text;
	const colorFn = support === "truecolor" ? truecolor : ansi256;
	return `${colorFn(hex)}${text}${reset()}`;
}
