import { getColorCode, reset } from "./colors";

interface Cell {
	char: string;
	color?: string;
}

export class TerminalCanvas {
	private buffer: Cell[][];
	public readonly width: number;
	public readonly height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.buffer = Array.from({ length: height }, () =>
			Array.from({ length: width }, () => ({ char: " " })),
		);
	}

	set(x: number, y: number, char: string, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		if (xi < 0 || xi >= this.width || yi < 0 || yi >= this.height) return;
		this.buffer[yi]![xi] = { char, color };
	}

	line(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		char = "─",
		color?: string,
	): void {
		const x1i = Math.round(x1);
		const y1i = Math.round(y1);
		const x2i = Math.round(x2);
		const y2i = Math.round(y2);

		const dx = Math.abs(x2i - x1i);
		const dy = Math.abs(y2i - y1i);
		const sx = x1i < x2i ? 1 : -1;
		const sy = y1i < y2i ? 1 : -1;
		let err = dx - dy;

		let x = x1i;
		let y = y1i;

		while (true) {
			let lineChar = char;
			if (dx > dy) {
				lineChar = "─";
			} else if (dy > dx) {
				lineChar = "│";
			}

			this.set(x, y, lineChar, color);

			if (x === x2i && y === y2i) break;

			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				x += sx;
			}
			if (e2 < dx) {
				err += dx;
				y += sy;
			}
		}
	}

	box(x: number, y: number, w: number, h: number, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		const wi = Math.round(w);
		const hi = Math.round(h);

		this.set(xi, yi, "┌", color);
		this.set(xi + wi - 1, yi, "┐", color);
		this.set(xi, yi + hi - 1, "└", color);
		this.set(xi + wi - 1, yi + hi - 1, "┘", color);

		for (let i = 1; i < wi - 1; i++) {
			this.set(xi + i, yi, "─", color);
			this.set(xi + i, yi + hi - 1, "─", color);
		}

		for (let i = 1; i < hi - 1; i++) {
			this.set(xi, yi + i, "│", color);
			this.set(xi + wi - 1, yi + i, "│", color);
		}
	}

	roundedBox(x: number, y: number, w: number, h: number, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		const wi = Math.round(w);
		const hi = Math.round(h);

		this.set(xi, yi, "╭", color);
		this.set(xi + wi - 1, yi, "╮", color);
		this.set(xi, yi + hi - 1, "╰", color);
		this.set(xi + wi - 1, yi + hi - 1, "╯", color);

		for (let i = 1; i < wi - 1; i++) {
			this.set(xi + i, yi, "─", color);
			this.set(xi + i, yi + hi - 1, "─", color);
		}

		for (let i = 1; i < hi - 1; i++) {
			this.set(xi, yi + i, "│", color);
			this.set(xi + wi - 1, yi + i, "│", color);
		}
	}

	diamond(cx: number, cy: number, w: number, h: number, color?: string): void {
		const cxi = Math.round(cx);
		const cyi = Math.round(cy);
		const wi = Math.round(w);
		const hi = Math.round(h);

		const halfW = Math.floor(wi / 2);
		const halfH = Math.floor(hi / 2);

		const top = cyi - halfH;
		const bottom = cyi + halfH;
		const left = cxi - halfW;
		const right = cxi + halfW;

		this.line(cxi, top, left, cyi, "/", color);
		this.line(left, cyi, cxi, bottom, "\\", color);
		this.line(cxi, bottom, right, cyi, "/", color);
		this.line(right, cyi, cxi, top, "\\", color);
	}

	text(x: number, y: number, text: string, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		for (let i = 0; i < text.length; i++) {
			this.set(xi + i, yi, text[i]!, color);
		}
	}

	fill(x: number, y: number, w: number, h: number, char: string, color?: string): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		const wi = Math.round(w);
		const hi = Math.round(h);

		for (let dy = 0; dy < hi; dy++) {
			for (let dx = 0; dx < wi; dx++) {
				this.set(xi + dx, yi + dy, char, color);
			}
		}
	}

	toString(): string {
		const lines: string[] = [];
		for (const row of this.buffer) {
			let line = "";
			let currentColor: string | undefined;

			for (const cell of row) {
				if (cell.color !== currentColor) {
					if (currentColor) line += reset();
					currentColor = cell.color;
					if (cell.color) {
						line += getColorCode(cell.color);
					}
				}
				line += cell.char;
			}

			if (currentColor) line += reset();
			lines.push(line);
		}
		return lines.join("\n");
	}
}
