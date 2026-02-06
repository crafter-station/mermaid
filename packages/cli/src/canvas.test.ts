import { test, expect } from "bun:test";
import { TerminalCanvas } from "./canvas";

test("TerminalCanvas - basic set and get", () => {
	const canvas = new TerminalCanvas(10, 5);
	canvas.set(0, 0, "X");
	const output = canvas.toString();
	expect(output).toContain("X");
});

test("TerminalCanvas - box drawing", () => {
	const canvas = new TerminalCanvas(10, 5);
	canvas.box(0, 0, 10, 5);
	const output = canvas.toString();
	expect(output).toContain("┌");
	expect(output).toContain("┐");
	expect(output).toContain("└");
	expect(output).toContain("┘");
});

test("TerminalCanvas - rounded box", () => {
	const canvas = new TerminalCanvas(10, 5);
	canvas.roundedBox(0, 0, 10, 5);
	const output = canvas.toString();
	expect(output).toContain("╭");
	expect(output).toContain("╮");
	expect(output).toContain("╰");
	expect(output).toContain("╯");
});

test("TerminalCanvas - text rendering", () => {
	const canvas = new TerminalCanvas(20, 5);
	canvas.text(5, 2, "Hello");
	const output = canvas.toString();
	expect(output).toContain("Hello");
});

test("TerminalCanvas - line drawing", () => {
	const canvas = new TerminalCanvas(10, 10);
	canvas.line(0, 0, 9, 0);
	const output = canvas.toString();
	expect(output).toContain("─");
});

test("TerminalCanvas - fill", () => {
	const canvas = new TerminalCanvas(5, 5);
	canvas.fill(0, 0, 5, 5, "█");
	const output = canvas.toString();
	const lines = output.split("\n");
	expect(lines.every((line) => line.includes("█"))).toBe(true);
});
