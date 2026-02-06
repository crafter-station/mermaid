import { test, expect } from "bun:test";
import { renderToTerminal } from "./terminal";
import { THEMES } from "@crafter/mermaid-themes";

test("renderToTerminal - simple flowchart", () => {
	const diagram = `
graph TD
  A[Start] --> B[Process]
  B --> C[End]
`;

	const output = renderToTerminal(diagram, {
		theme: THEMES["one-hunter"],
		width: 60,
	});

	expect(output).toBeTruthy();
	expect(output).toContain("Start");
	expect(output).toContain("Process");
	expect(output).toContain("End");
});

test("renderToTerminal - compact mode", () => {
	const diagram = `
graph LR
  A --> B
  B --> C
`;

	const output = renderToTerminal(diagram, {
		theme: THEMES["zinc-dark"],
		width: 40,
		compact: true,
	});

	expect(output).toBeTruthy();
});

test("renderToTerminal - sequence diagram", () => {
	const diagram = `
sequenceDiagram
  Alice->>Bob: Hello
  Bob->>Alice: Hi there
`;

	const output = renderToTerminal(diagram, {
		theme: THEMES["tokyo-night"],
		width: 80,
	});

	expect(output).toBeTruthy();
	expect(output).toContain("Alice");
	expect(output).toContain("Bob");
});

test("renderToTerminal - invalid diagram", () => {
	const diagram = "invalid mermaid syntax !!!";

	expect(() => {
		renderToTerminal(diagram);
	}).toThrow();
});
