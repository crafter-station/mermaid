import { describe, expect, test } from "bun:test";
import { detectDiagramType, parse } from "./index";

describe("detectDiagramType", () => {
	test("detects flowchart", () => {
		expect(detectDiagramType("graph TD")).toBe("flowchart");
		expect(detectDiagramType("flowchart LR")).toBe("flowchart");
		expect(detectDiagramType("  graph TB  ")).toBe("flowchart");
	});

	test("detects sequence diagram", () => {
		expect(detectDiagramType("sequenceDiagram")).toBe("sequence");
	});

	test("detects class diagram", () => {
		expect(detectDiagramType("classDiagram")).toBe("class");
	});

	test("detects ER diagram", () => {
		expect(detectDiagramType("erDiagram")).toBe("er");
	});

	test("detects state diagram", () => {
		expect(detectDiagramType("stateDiagram-v2")).toBe("state");
	});

	test("returns null for unknown", () => {
		expect(detectDiagramType("invalid")).toBe(null);
		expect(detectDiagramType("")).toBe(null);
	});
});

describe("flowchart parser", () => {
	test("parses basic flowchart", () => {
		const source = `graph TD
			A[Start] --> B[End]`;

		const result = parse(source);
		expect(result.ast).not.toBe(null);
		expect(result.ast?.type).toBe("flowchart");
		expect(result.diagnostics.length).toBe(0);

		const ast = result.ast!;
		expect(ast.nodes.size).toBe(2);
		expect(ast.edges.length).toBe(1);
		expect(ast.nodes.get("A")?.label).toBe("Start");
		expect(ast.edges[0].source).toBe("A");
		expect(ast.edges[0].target).toBe("B");
	});

	test("parses node shapes", () => {
		const source = `flowchart LR
			A[Rectangle]
			B(Rounded)
			C{Diamond}
			D([Stadium])
			E((Circle))`;

		const result = parse(source);
		expect(result.ast?.type).toBe("flowchart");

		const ast = result.ast!;
		expect(ast.nodes.get("A")?.shape).toBe("rectangle");
		expect(ast.nodes.get("B")?.shape).toBe("rounded");
		expect(ast.nodes.get("C")?.shape).toBe("diamond");
		expect(ast.nodes.get("D")?.shape).toBe("stadium");
		expect(ast.nodes.get("E")?.shape).toBe("circle");
	});

	test("parses edge styles", () => {
		const source = `graph TD
			A --> B
			B -.-> C
			C ==> D`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.edges[0].style).toBe("solid");
		expect(ast.edges[1].style).toBe("dotted");
		expect(ast.edges[2].style).toBe("thick");
	});

	test("parses edge labels", () => {
		const source = `graph TD
			A -->|Yes| B
			B -->|No| C`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.edges[0].label).toBe("Yes");
		expect(ast.edges[1].label).toBe("No");
	});

	test("parses subgraphs", () => {
		const source = `graph TD
			A --> B
			subgraph Processing
				B
				C
			end`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.subgraphs.length).toBe(1);
		expect(ast.subgraphs[0].id).toBe("Processing");
		expect(ast.subgraphs[0].nodeIds.length).toBeGreaterThan(0);
	});

	test("parses classDef and class assignments", () => {
		const source = `graph TD
			A --> B
			classDef highlight fill:#f9f,stroke:#333
			class A,B highlight`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.classDefs.has("highlight")).toBe(true);
		expect(ast.classAssignments.get("A")).toBe("highlight");
		expect(ast.classAssignments.get("B")).toBe("highlight");
	});
});

describe("sequence diagram parser", () => {
	test("parses basic sequence", () => {
		const source = `sequenceDiagram
			participant Alice
			Alice->>Bob: Hello`;

		const result = parse(source);
		expect(result.ast?.type).toBe("sequence");

		const ast = result.ast!;
		expect(ast.participants.length).toBeGreaterThanOrEqual(1);
		expect(ast.messages.length).toBe(1);
	});

	test("parses arrow types", () => {
		const source = `sequenceDiagram
			Alice->>Bob: Solid
			Alice-->>Bob: Dashed
			Alice-)Bob: Open
			Alice-xBob: Cross`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.messages[0]).toMatchObject({ arrowType: "solid" });
		expect(ast.messages[1]).toMatchObject({ arrowType: "dashed" });
		expect(ast.messages[2]).toMatchObject({ arrowType: "open" });
		expect(ast.messages[3]).toMatchObject({ arrowType: "cross" });
	});

	test("parses blocks", () => {
		const source = `sequenceDiagram
			loop Every minute
				Alice->>Bob: Ping
				Bob-->>Alice: Pong
			end`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.messages.length).toBe(1);
		expect(ast.messages[0]).toMatchObject({ type: "loop" });
	});

	test("parses notes", () => {
		const source = `sequenceDiagram
			Note left of Alice: Left note
			Note right of Bob: Right note
			Note over Alice,Bob: Over note`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.messages.length).toBe(3);
		expect(ast.messages[0]).toMatchObject({ placement: "left" });
		expect(ast.messages[1]).toMatchObject({ placement: "right" });
		expect(ast.messages[2]).toMatchObject({ placement: "over" });
	});
});

describe("class diagram parser", () => {
	test("parses basic class", () => {
		const source = `classDiagram
			class Animal {
				+String name
				+makeSound()
			}`;

		const result = parse(source);
		expect(result.ast?.type).toBe("class");

		const ast = result.ast!;
		expect(ast.classes.has("Animal")).toBe(true);
		expect(ast.classes.get("Animal")?.members.length).toBe(2);
	});

	test("parses relationships", () => {
		const source = `classDiagram
			Animal <|-- Dog
			Owner *-- Pet
			Car o-- Engine`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.relations.length).toBe(3);
		expect(ast.relations[0].type).toBe("inheritance");
		expect(ast.relations[1].type).toBe("composition");
		expect(ast.relations[2].type).toBe("aggregation");
	});

	test("parses member visibility", () => {
		const source = `classDiagram
			class Test {
				+public
				-private
				#protected
				~package
			}`;

		const result = parse(source);
		const ast = result.ast!;
		const members = ast.classes.get("Test")?.members ?? [];

		expect(members[0].visibility).toBe("+");
		expect(members[1].visibility).toBe("-");
		expect(members[2].visibility).toBe("#");
		expect(members[3].visibility).toBe("~");
	});
});

describe("ER diagram parser", () => {
	test("parses basic ER", () => {
		const source = `erDiagram
			CUSTOMER ||--o{ ORDER : places`;

		const result = parse(source);
		expect(result.ast?.type).toBe("er");

		const ast = result.ast!;
		expect(ast.relations.length).toBe(1);
		expect(ast.relations[0].from).toBe("CUSTOMER");
		expect(ast.relations[0].to).toBe("ORDER");
		expect(ast.relations[0].fromCardinality).toBe("one");
		expect(ast.relations[0].toCardinality).toBe("zero-many");
	});

	test("parses entity attributes", () => {
		const source = `erDiagram
			CUSTOMER {
				string name PK
				string email UK
			}`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.entities.has("CUSTOMER")).toBe(true);
		const entity = ast.entities.get("CUSTOMER")!;
		expect(entity.attributes.length).toBe(2);
		expect(entity.attributes[0].keys).toContain("PK");
		expect(entity.attributes[1].keys).toContain("UK");
	});

	test("parses identifying vs non-identifying", () => {
		const source = `erDiagram
			A ||--|| B : identifying
			C ||..|| D : non-identifying`;

		const result = parse(source);
		const ast = result.ast!;

		expect(ast.relations[0].identifying).toBe(true);
		expect(ast.relations[1].identifying).toBe(false);
	});
});

describe("error handling", () => {
	test("recovers from invalid lines", () => {
		const source = `graph TD
			A --> B
			invalid line here
			B --> C`;

		const result = parse(source);
		expect(result.ast).not.toBe(null);
		expect(result.diagnostics.length).toBeGreaterThan(0);
		expect(result.diagnostics[0].severity).toBe("warning");
	});

	test("detects unclosed subgraphs", () => {
		const source = `graph TD
			subgraph Test
				A --> B`;

		const result = parse(source);
		expect(result.diagnostics.some((d) => d.message.includes("Unclosed"))).toBe(
			true,
		);
	});

	test("reports unknown diagram types", () => {
		const source = "invalid diagram";
		const result = parse(source);

		expect(result.ast).toBe(null);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});
});
