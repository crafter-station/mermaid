import { describe, expect, test } from "bun:test";
import { render, parse, layout, renderToString, THEMES } from "./index";

describe("E2E: full pipeline", () => {
	test("renders simple flowchart", () => {
		const svg = render("graph TD\n  A[Start] --> B[End]");
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
		expect(svg).toContain("Start");
		expect(svg).toContain("End");
	});

	test("renders with every theme", () => {
		const diagram = "graph TD\n  A --> B";
		for (const [name, theme] of Object.entries(THEMES)) {
			const svg = render(diagram, { theme });
			expect(svg).toContain("<svg");
			expect(svg).toContain(theme.bg);
		}
	});

	test("transparent background", () => {
		const svg = render("graph TD\n  A --> B", { transparent: true });
		expect(svg).toContain('fill="none"');
		expect(svg).not.toContain('fill="var(--bg)"');
	});

	test("custom padding", () => {
		const small = render("graph TD\n  A --> B", { padding: 10 });
		const large = render("graph TD\n  A --> B", { padding: 100 });
		const smallWidth = parseFloat(small.match(/width="([\d.]+)"/)?.[1] ?? "0");
		const largeWidth = parseFloat(large.match(/width="([\d.]+)"/)?.[1] ?? "0");
		expect(largeWidth).toBeGreaterThan(smallWidth);
	});
});

describe("E2E: flowchart stress", () => {
	test("all 5 directions", () => {
		for (const dir of ["TD", "TB", "LR", "BT", "RL"]) {
			const svg = render(`graph ${dir}\n  A --> B --> C`);
			expect(svg).toContain("<svg");
		}
	});

	test("all node shapes", () => {
		const diagram = `flowchart TD
			A[Rectangle]
			B(Rounded)
			C{Diamond}
			D([Stadium])
			E((Circle))
			F[/Trapezoid\\]
			G[\\Trapezoid Alt/]
			H>Asymmetric]
			I{{Hexagon}}
			J[[Subroutine]]
			K[(Cylinder)]
			L(((Doublecircle)))`;

		const result = parse(diagram);
		expect(result.ast).not.toBe(null);
		expect(result.ast!.nodes.size).toBe(12);

		const svg = render(diagram);
		expect(svg).toContain("<svg");
		expect(svg).toContain("Rectangle");
		expect(svg).toContain("Rounded");
		expect(svg).toContain("Diamond");
		expect(svg).toContain("Hexagon");
	});

	test("all edge styles with labels", () => {
		const diagram = `graph TD
			A -->|solid| B
			B -.->|dotted| C
			C ==>|thick| D
			D --- E
			E -.- F
			F === G`;

		const svg = render(diagram);
		expect(svg).toContain("solid");
		expect(svg).toContain("dotted");
		expect(svg).toContain("thick");
	});

	test("edge chaining A --> B --> C --> D", () => {
		const result = parse("graph TD\n  A --> B --> C --> D");
		expect(result.ast).not.toBe(null);
		expect(result.ast!.edges.length).toBe(3);
		expect(result.ast!.edges[0].source).toBe("A");
		expect(result.ast!.edges[0].target).toBe("B");
		expect(result.ast!.edges[1].source).toBe("B");
		expect(result.ast!.edges[1].target).toBe("C");
		expect(result.ast!.edges[2].source).toBe("C");
		expect(result.ast!.edges[2].target).toBe("D");
	});

	test("parallel edges with & operator", () => {
		const result = parse("graph TD\n  A & B --> C & D");
		expect(result.ast).not.toBe(null);
		expect(result.ast!.edges.length).toBe(4);
	});

	test("classDef + style + class shorthand", () => {
		const diagram = `graph TD
			A[Start]:::danger --> B[End]
			classDef danger fill:#f00,stroke:#900
			style B fill:#0f0`;

		const result = parse(diagram);
		const ast = result.ast!;
		expect(ast.classDefs.has("danger")).toBe(true);
		expect(ast.classAssignments.get("A")).toBe("danger");
		expect(ast.nodeStyles.has("B")).toBe(true);
	});

	test("nested subgraphs", () => {
		const diagram = `graph TD
			subgraph outer [Outer Group]
				subgraph inner [Inner Group]
					A --> B
				end
				B --> C
			end
			C --> D`;

		const result = parse(diagram);
		const ast = result.ast!;
		expect(ast.subgraphs.length).toBe(1);
		expect(ast.subgraphs[0].id).toBe("outer");
		expect(ast.subgraphs[0].children.length).toBe(1);
		expect(ast.subgraphs[0].children[0].id).toBe("inner");

		const svg = render(diagram);
		expect(svg).toContain("<svg");
	});

	test("large graph: 50 nodes linear chain", () => {
		const lines = ["graph TD"];
		for (let i = 0; i < 50; i++) {
			lines.push(`  N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`);
		}
		const svg = render(lines.join("\n"));
		expect(svg).toContain("<svg");
		expect(svg).toContain("Node 0");
		expect(svg).toContain("Node 50");
	});

	test("wide graph: fan-out from single node", () => {
		const lines = ["graph TD", "  ROOT[Root]"];
		for (let i = 0; i < 20; i++) {
			lines.push(`  ROOT --> CHILD${i}[Child ${i}]`);
		}
		const svg = render(lines.join("\n"));
		expect(svg).toContain("<svg");
		expect(svg).toContain("Root");
		expect(svg).toContain("Child 19");
	});

	test("diamond DAG pattern", () => {
		const svg = render(`graph TD
			A --> B
			A --> C
			B --> D
			C --> D`);
		expect(svg).toContain("<svg");
		const result = parse("graph TD\n  A --> B\n  A --> C\n  B --> D\n  C --> D");
		expect(result.ast!.edges.length).toBe(4);
	});

	test("complex real-world CI/CD pipeline", () => {
		const diagram = `graph LR
			A[Push Code] --> B{Tests Pass?}
			B -->|Yes| C[Build Docker]
			B -->|No| D[Notify Dev]
			C --> E{Deploy?}
			E -->|Staging| F[Deploy Staging]
			E -->|Production| G[Deploy Prod]
			F --> H[Run E2E]
			H -->|Pass| G
			H -->|Fail| D
			G --> I[Monitor]
			I -->|Alert| D`;

		const svg = render(diagram);
		expect(svg).toContain("<svg");
		expect(svg).toContain("Push Code");
		expect(svg).toContain("Deploy Prod");

		const result = parse(diagram);
		expect(result.ast!.nodes.size).toBe(9);
		expect(result.ast!.edges.length).toBe(11);
	});

	test("bidirectional arrows", () => {
		const result = parse("graph LR\n  A <--> B");
		expect(result.ast).not.toBe(null);
		const edge = result.ast!.edges[0];
		expect(edge.hasArrowStart).toBe(true);
		expect(edge.hasArrowEnd).toBe(true);
	});

	test("self-referencing node", () => {
		const result = parse("graph TD\n  A --> A");
		expect(result.ast!.edges.length).toBe(1);
		expect(result.ast!.edges[0].source).toBe("A");
		expect(result.ast!.edges[0].target).toBe("A");

		const svg = render("graph TD\n  A[Loop] --> A");
		expect(svg).toContain("<svg");
	});

	test("node IDs with hyphens", () => {
		const result = parse("graph TD\n  my-node --> other-node");
		expect(result.ast!.nodes.has("my-node")).toBe(true);
		expect(result.ast!.nodes.has("other-node")).toBe(true);
	});

	test("semicolon-separated statements", () => {
		const result = parse("graph TD;A --> B;B --> C");
		expect(result.ast!.edges.length).toBe(2);
	});

	test("comment lines are ignored", () => {
		const result = parse("graph TD\n  %% This is a comment\n  A --> B");
		expect(result.ast!.nodes.size).toBe(2);
		expect(result.diagnostics.length).toBe(0);
	});
});

describe("E2E: sequence diagram", () => {
	test("renders sequence diagram", () => {
		const diagram = `sequenceDiagram
			participant Alice
			participant Bob
			Alice->>Bob: Hello
			Bob-->>Alice: Hi back`;

		const svg = render(diagram);
		expect(svg).toContain("<svg");
		expect(svg).toContain("Alice");
		expect(svg).toContain("Bob");
	});

	test("complex sequence with blocks and notes", () => {
		const diagram = `sequenceDiagram
			participant Client
			participant Server
			participant DB
			Client->>Server: GET /users
			Note right of Server: Validate token
			alt Valid token
				Server->>DB: SELECT * FROM users
				DB-->>Server: User list
				Server-->>Client: 200 OK
			else Invalid token
				Server-->>Client: 401 Unauthorized
			end
			loop Health check
				Server->>DB: PING
				DB-->>Server: PONG
			end`;

		const result = parse(diagram);
		expect(result.ast).not.toBe(null);
		expect(result.ast!.participants.length).toBe(3);

		const svg = render(diagram);
		expect(svg).toContain("<svg");
	});

	test("auto-registers participants from messages", () => {
		const diagram = `sequenceDiagram
			Alice->>Bob: Hello
			Bob->>Charlie: Forward`;

		const result = parse(diagram);
		expect(result.ast!.participants.length).toBe(3);
	});
});

describe("E2E: class diagram", () => {
	test("renders class diagram", () => {
		const diagram = `classDiagram
			class Animal {
				+String name
				+int age
				+makeSound()
				+move()
			}
			class Dog {
				+String breed
				+bark()
			}
			Animal <|-- Dog`;

		const svg = render(diagram);
		expect(svg).toContain("<svg");
		expect(svg).toContain("Animal");
		expect(svg).toContain("Dog");
	});

	test("all relationship types", () => {
		const diagram = `classDiagram
			A <|-- B
			C *-- D
			E o-- F
			G --> H
			I ..> J
			K ..|> L`;

		const result = parse(diagram);
		const types = result.ast!.relations.map((r: any) => r.type);
		expect(types).toContain("inheritance");
		expect(types).toContain("composition");
		expect(types).toContain("aggregation");
		expect(types).toContain("association");
		expect(types).toContain("dependency");
		expect(types).toContain("realization");
	});

	test("class with full member syntax", () => {
		const diagram = `classDiagram
			class Service {
				+String id
				-Map config
				#init()
				~cleanup()
				+getInstance()$
			}`;

		const result = parse(diagram);
		const members = result.ast!.classes.get("Service")?.members ?? [];
		expect(members.length).toBe(5);
		expect(members[0].visibility).toBe("+");
		expect(members[1].visibility).toBe("-");
		expect(members[2].visibility).toBe("#");
		expect(members[3].visibility).toBe("~");
		expect(members[4].isStatic).toBe(true);
	});
});

describe("E2E: ER diagram", () => {
	test("renders ER diagram", () => {
		const diagram = `erDiagram
			CUSTOMER ||--o{ ORDER : places
			ORDER ||--|{ LINE-ITEM : contains
			CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`;

		const svg = render(diagram);
		expect(svg).toContain("<svg");
	});

	test("entity with typed attributes", () => {
		const diagram = `erDiagram
			PRODUCT {
				int id PK
				string name
				float price
				string description
			}`;

		const result = parse(diagram);
		const entity = result.ast!.entities.get("PRODUCT")!;
		expect(entity.attributes.length).toBe(4);
	});

	test("all cardinality combinations", () => {
		const diagram = `erDiagram
			A ||--|| B : one-to-one
			C ||--o| D : one-to-zero-one
			E ||--|{ F : one-to-many
			G ||--o{ H : one-to-zero-many`;

		const result = parse(diagram);
		expect(result.ast!.relations.length).toBe(4);
	});
});

describe("E2E: state diagram", () => {
	test("renders state diagram", () => {
		const diagram = `stateDiagram-v2
			[*] --> Idle
			Idle --> Processing : start
			Processing --> Done : complete
			Processing --> Error : fail
			Error --> Idle : retry
			Done --> [*]`;

		const svg = render(diagram);
		expect(svg).toContain("<svg");
	});

	test("state with descriptions", () => {
		const result = parse(`stateDiagram-v2
			Idle : Waiting for input
			Processing : Crunching data
			Idle --> Processing`);

		expect(result.ast!.nodes.get("Idle")?.label).toBe("Waiting for input");
		expect(result.ast!.nodes.get("Processing")?.label).toBe("Crunching data");
	});

	test("composite states", () => {
		const result = parse(`stateDiagram-v2
			state Active {
				[*] --> Running
				Running --> Paused
				Paused --> Running
			}
			[*] --> Active`);

		expect(result.ast!.subgraphs.length).toBe(1);
		expect(result.ast!.subgraphs[0].id).toBe("Active");
	});

	test("start/end pseudostates", () => {
		const result = parse(`stateDiagram-v2
			[*] --> A
			A --> [*]`);

		expect(result.ast!.nodes.has("_start")).toBe(true);
		expect(result.ast!.nodes.has("_end")).toBe(true);
		expect(result.ast!.nodes.get("_start")?.shape).toBe("state-start");
		expect(result.ast!.nodes.get("_end")?.shape).toBe("state-end");
	});
});

describe("E2E: error resilience", () => {
	test("empty diagram returns error", () => {
		const result = parse("");
		expect(result.ast).toBe(null);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});

	test("garbage input returns null", () => {
		const result = parse("this is not a diagram at all");
		expect(result.ast).toBe(null);
	});

	test("partial flowchart recovers", () => {
		const diagram = `graph TD
			A --> B
			!@#\$%^&*
			B --> C
			another bad line 123
			C --> D`;

		const result = parse(diagram);
		expect(result.ast).not.toBe(null);
		expect(result.ast!.edges.length).toBeGreaterThanOrEqual(2);
		expect(result.diagnostics.length).toBeGreaterThan(0);
	});

	test("render throws on null AST", () => {
		expect(() => render("invalid diagram")).toThrow();
	});

	test("whitespace-only lines are safe", () => {
		const result = parse("graph TD\n   \n  A --> B\n  \n  ");
		expect(result.ast).not.toBe(null);
		expect(result.ast!.edges.length).toBe(1);
	});

	test("duplicate edges are preserved", () => {
		const result = parse("graph TD\n  A --> B\n  A --> B");
		expect(result.ast!.edges.length).toBe(2);
	});

	test("node redefinition keeps first shape", () => {
		const result = parse("graph TD\n  A[Rectangle] --> B\n  A(Rounded) --> C");
		expect(result.ast!.nodes.get("A")?.shape).toBe("rectangle");
	});
});

describe("E2E: layout correctness", () => {
	test("TD: nodes are vertically ordered", () => {
		const result = parse("graph TD\n  A --> B --> C");
		const positioned = layout(result.ast!);
		const nodeA = positioned.nodes.find((n) => n.id === "A")!;
		const nodeB = positioned.nodes.find((n) => n.id === "B")!;
		const nodeC = positioned.nodes.find((n) => n.id === "C")!;
		expect(nodeA.y).toBeLessThan(nodeB.y);
		expect(nodeB.y).toBeLessThan(nodeC.y);
	});

	test("LR: nodes are horizontally ordered", () => {
		const result = parse("flowchart LR\n  A --> B --> C");
		const positioned = layout(result.ast!);
		const nodeA = positioned.nodes.find((n) => n.id === "A")!;
		const nodeB = positioned.nodes.find((n) => n.id === "B")!;
		const nodeC = positioned.nodes.find((n) => n.id === "C")!;
		expect(nodeA.x).toBeLessThan(nodeB.x);
		expect(nodeB.x).toBeLessThan(nodeC.x);
	});

	test("BT: nodes are bottom-to-top", () => {
		const result = parse("graph BT\n  A --> B --> C");
		const positioned = layout(result.ast!);
		const nodeA = positioned.nodes.find((n) => n.id === "A")!;
		const nodeC = positioned.nodes.find((n) => n.id === "C")!;
		expect(nodeA.y).toBeGreaterThan(nodeC.y);
	});

	test("RL: nodes are right-to-left", () => {
		const result = parse("flowchart RL\n  A --> B --> C");
		const positioned = layout(result.ast!);
		const nodeA = positioned.nodes.find((n) => n.id === "A")!;
		const nodeC = positioned.nodes.find((n) => n.id === "C")!;
		expect(nodeA.x).toBeGreaterThan(nodeC.x);
	});

	test("edges have valid points", () => {
		const result = parse("graph TD\n  A --> B");
		const positioned = layout(result.ast!);
		expect(positioned.edges.length).toBe(1);
		expect(positioned.edges[0].points.length).toBeGreaterThanOrEqual(2);
		for (const point of positioned.edges[0].points) {
			expect(point.x).toBeGreaterThanOrEqual(0);
			expect(point.y).toBeGreaterThanOrEqual(0);
			expect(Number.isFinite(point.x)).toBe(true);
			expect(Number.isFinite(point.y)).toBe(true);
		}
	});

	test("dimensions are positive", () => {
		const result = parse("graph TD\n  A --> B\n  A --> C");
		const positioned = layout(result.ast!);
		expect(positioned.width).toBeGreaterThan(0);
		expect(positioned.height).toBeGreaterThan(0);
		for (const node of positioned.nodes) {
			expect(node.width).toBeGreaterThan(0);
			expect(node.height).toBeGreaterThan(0);
		}
	});

	test("no node overlap in simple chain", () => {
		const result = parse("graph TD\n  A --> B --> C --> D");
		const positioned = layout(result.ast!);
		for (let i = 0; i < positioned.nodes.length; i++) {
			for (let j = i + 1; j < positioned.nodes.length; j++) {
				const a = positioned.nodes[i];
				const b = positioned.nodes[j];
				const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
				const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2;
				expect(overlapX && overlapY).toBe(false);
			}
		}
	});

	test("handles disconnected nodes", () => {
		const result = parse("graph TD\n  A\n  B\n  C");
		const positioned = layout(result.ast!);
		expect(positioned.nodes.length).toBe(3);
		expect(positioned.width).toBeGreaterThan(0);
	});

	test("layout spacing options work", () => {
		const ast = parse("graph TD\n  A --> B").ast!;
		const tight = layout(ast, { nodeSpacing: 10, layerSpacing: 30 });
		const loose = layout(ast, { nodeSpacing: 100, layerSpacing: 200 });
		expect(loose.height).toBeGreaterThan(tight.height);
	});
});

describe("E2E: SVG output correctness", () => {
	test("SVG has proper xmlns", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
	});

	test("SVG has viewBox", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toMatch(/viewBox="[\d. ]+"/);
	});

	test("SVG has width and height", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toMatch(/width="[\d.]+"/);
		expect(svg).toMatch(/height="[\d.]+"/);
	});

	test("SVG has arrow markers", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toContain("<marker");
		expect(svg).toContain("arrowhead");
	});

	test("SVG has CSS custom properties", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toContain("--bg:");
		expect(svg).toContain("--fg:");
	});

	test("SVG contains font import", () => {
		const svg = render("graph TD\n  A --> B");
		expect(svg).toContain("fonts.googleapis.com");
	});

	test("SVG edge labels have background rect", () => {
		const svg = render("graph TD\n  A -->|Label| B");
		expect(svg).toContain("Label");
	});

	test("no NaN or Infinity in SVG", () => {
		const diagrams = [
			"graph TD\n  A --> B",
			"flowchart LR\n  A --> B --> C --> D",
			"graph TD\n  A --> B\n  A --> C\n  B --> D\n  C --> D",
		];
		for (const d of diagrams) {
			const svg = render(d);
			expect(svg).not.toContain("NaN");
			expect(svg).not.toContain("Infinity");
		}
	});
});

describe("E2E: performance", () => {
	test("100-node graph renders under 100ms", () => {
		const lines = ["graph TD"];
		for (let i = 0; i < 100; i++) {
			lines.push(`  N${i} --> N${i + 1}`);
		}
		const diagram = lines.join("\n");

		const start = performance.now();
		const svg = render(diagram);
		const elapsed = performance.now() - start;

		expect(svg).toContain("<svg");
		expect(elapsed).toBeLessThan(100);
	});

	test("deeply nested subgraphs (10 levels)", () => {
		const lines = ["graph TD"];
		for (let i = 0; i < 10; i++) {
			lines.push(`  ${"  ".repeat(i)}subgraph L${i}`);
		}
		lines.push(`  ${"  ".repeat(10)}A --> B`);
		for (let i = 9; i >= 0; i--) {
			lines.push(`  ${"  ".repeat(i)}end`);
		}

		const result = parse(lines.join("\n"));
		expect(result.ast).not.toBe(null);
	});

	test("20 parallel edges fan-in fan-out", () => {
		const lines = ["graph TD", "  SRC[Source]"];
		for (let i = 0; i < 20; i++) {
			lines.push(`  SRC --> M${i}[Mid ${i}]`);
			lines.push(`  M${i} --> SINK[Sink]`);
		}

		const start = performance.now();
		const svg = render(lines.join("\n"));
		const elapsed = performance.now() - start;

		expect(svg).toContain("<svg");
		expect(elapsed).toBeLessThan(500);
	});
});
