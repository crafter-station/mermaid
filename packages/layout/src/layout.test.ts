import { describe, test, expect } from "bun:test";
import type { FlowchartAST } from "@crafter/mermaid-parser";
import { layout } from "./index";

describe("Layout Engine", () => {
	test("lays out simple flowchart", () => {
		const ast: FlowchartAST = {
			type: "flowchart",
			direction: "TB",
			nodes: new Map([
				[
					"A",
					{
						id: "A",
						label: "Start",
						shape: "rectangle",
						span: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 1, offset: 1 } },
					},
				],
				[
					"B",
					{
						id: "B",
						label: "End",
						shape: "rectangle",
						span: { start: { line: 2, column: 0, offset: 2 }, end: { line: 2, column: 1, offset: 3 } },
					},
				],
			]),
			edges: [
				{
					source: "A",
					target: "B",
					style: "solid",
					hasArrowStart: false,
					hasArrowEnd: true,
					span: { start: { line: 3, column: 0, offset: 4 }, end: { line: 3, column: 1, offset: 5 } },
				},
			],
			subgraphs: [],
			classDefs: new Map(),
			classAssignments: new Map(),
			nodeStyles: new Map(),
			span: { start: { line: 1, column: 0, offset: 0 }, end: { line: 3, column: 1, offset: 5 } },
		};

		const result = layout(ast);

		expect(result.nodes.length).toBe(2);
		expect(result.edges.length).toBe(1);
		expect(result.width).toBeGreaterThan(0);
		expect(result.height).toBeGreaterThan(0);

		const nodeA = result.nodes.find((n) => n.id === "A");
		const nodeB = result.nodes.find((n) => n.id === "B");

		expect(nodeA).toBeDefined();
		expect(nodeB).toBeDefined();
		expect(nodeA!.y).toBeLessThan(nodeB!.y);
	});

	test("handles horizontal layout", () => {
		const ast: FlowchartAST = {
			type: "flowchart",
			direction: "LR",
			nodes: new Map([
				[
					"A",
					{
						id: "A",
						label: "Left",
						shape: "rectangle",
						span: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 1, offset: 1 } },
					},
				],
				[
					"B",
					{
						id: "B",
						label: "Right",
						shape: "rectangle",
						span: { start: { line: 2, column: 0, offset: 2 }, end: { line: 2, column: 1, offset: 3 } },
					},
				],
			]),
			edges: [
				{
					source: "A",
					target: "B",
					style: "solid",
					hasArrowStart: false,
					hasArrowEnd: true,
					span: { start: { line: 3, column: 0, offset: 4 }, end: { line: 3, column: 1, offset: 5 } },
				},
			],
			subgraphs: [],
			classDefs: new Map(),
			classAssignments: new Map(),
			nodeStyles: new Map(),
			span: { start: { line: 1, column: 0, offset: 0 }, end: { line: 3, column: 1, offset: 5 } },
		};

		const result = layout(ast);

		const nodeA = result.nodes.find((n) => n.id === "A");
		const nodeB = result.nodes.find((n) => n.id === "B");

		expect(nodeA).toBeDefined();
		expect(nodeB).toBeDefined();
		expect(nodeA!.x).toBeLessThan(nodeB!.x);
	});
});
