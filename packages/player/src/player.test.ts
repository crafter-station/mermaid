import { describe, expect, it } from "bun:test";
import { createPlayer } from "./player";
import { decompose } from "./timeline";
import { parse } from "@crafter/mermaid-parser";

describe("Player", () => {
	const simpleFlowchart = `
graph TD
  A[Start] --> B[Process]
  B --> C[End]
`;

	it("creates a player from valid diagram text", () => {
		const player = createPlayer(simpleFlowchart);
		expect(player.totalSteps()).toBeGreaterThan(0);
		expect(player.currentStep()).toBe(-1);
		expect(player.isPlaying()).toBe(false);
		player.destroy();
	});

	it("advances steps forward", () => {
		const player = createPlayer(simpleFlowchart);
		const total = player.totalSteps();

		player.step("forward");
		expect(player.currentStep()).toBe(0);

		player.step("forward");
		expect(player.currentStep()).toBe(1);

		player.destroy();
	});

	it("steps backward", () => {
		const player = createPlayer(simpleFlowchart);

		player.step("forward");
		player.step("forward");
		expect(player.currentStep()).toBe(1);

		player.step("backward");
		expect(player.currentStep()).toBe(0);

		player.destroy();
	});

	it("seeks to specific step", () => {
		const player = createPlayer(simpleFlowchart);

		player.seek(2);
		expect(player.currentStep()).toBe(2);

		player.seek(0);
		expect(player.currentStep()).toBe(0);

		player.destroy();
	});

	it("generates SVG snapshot", () => {
		const player = createPlayer(simpleFlowchart);

		player.step("forward");
		const svg = player.snapshot();
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");

		player.destroy();
	});

	it("plays automatically when autoPlay is true", async () => {
		let stepCount = 0;
		const player = createPlayer(simpleFlowchart, {
			autoPlay: true,
			stepDuration: 50,
			onStep: () => {
				stepCount++;
			},
		});

		expect(player.isPlaying()).toBe(true);

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(stepCount).toBeGreaterThan(0);
		player.destroy();
	});

	it("pauses playback", async () => {
		let stepCount = 0;
		const player = createPlayer(simpleFlowchart, {
			autoPlay: true,
			stepDuration: 50,
			onStep: () => {
				stepCount++;
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		player.pause();

		const countAtPause = stepCount;
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(stepCount).toBe(countAtPause);
		player.destroy();
	});

	it("stops and resets playback", () => {
		const player = createPlayer(simpleFlowchart);

		player.step("forward");
		player.step("forward");
		expect(player.currentStep()).toBe(1);

		player.stop();
		expect(player.currentStep()).toBe(-1);

		player.destroy();
	});

	it("calls onComplete when playback finishes", async () => {
		let completed = false;
		const player = createPlayer(simpleFlowchart, {
			autoPlay: true,
			stepDuration: 50,
			onComplete: () => {
				completed = true;
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 500));

		expect(completed).toBe(true);
		player.destroy();
	});
});

describe("Timeline decomposition", () => {
	it("decomposes flowchart with smart BFS order (node->edge->node)", () => {
		const diagram = `
graph TD
  A[Start] --> B[Process]
  B --> C[End]
`;
		const result = parse(diagram);
		expect(result.ast).toBeTruthy();

		if (result.ast) {
			const steps = decompose(result.ast);
			expect(steps.length).toBe(5);

			expect(steps[0]?.type).toBe("node");
			expect(steps[0]?.id).toBe("A");
			expect(steps[1]?.type).toBe("edge");
			expect(steps[1]?.id).toBe("A->B");
			expect(steps[2]?.type).toBe("node");
			expect(steps[2]?.id).toBe("B");
			expect(steps[3]?.type).toBe("edge");
			expect(steps[3]?.id).toBe("B->C");
			expect(steps[4]?.type).toBe("node");
			expect(steps[4]?.id).toBe("C");
		}
	});

	it("decomposes sequence diagram participants then messages", () => {
		const diagram = `
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi
`;
		const result = parse(diagram);
		expect(result.ast).toBeTruthy();

		if (result.ast) {
			const steps = decompose(result.ast);
			expect(steps.length).toBe(4);

			expect(steps[0]?.type).toBe("node");
			expect(steps[0]?.id).toBe("Alice");
			expect(steps[1]?.type).toBe("node");
			expect(steps[1]?.id).toBe("Bob");
			expect(steps[2]?.type).toBe("edge");
			expect(steps[3]?.type).toBe("edge");
		}
	});

	it("decomposes class diagram with on-demand node emit", () => {
		const diagram = `
classDiagram
  class Animal
  class Dog
  Animal <|-- Dog
`;
		const result = parse(diagram);
		expect(result.ast).toBeTruthy();

		if (result.ast) {
			const steps = decompose(result.ast);
			expect(steps.length).toBe(3);

			expect(steps[0]?.type).toBe("node");
			expect(steps[0]?.id).toBe("Animal");
			expect(steps[1]?.type).toBe("node");
			expect(steps[1]?.id).toBe("Dog");
			expect(steps[2]?.type).toBe("edge");
		}
	});

	it("decomposes ER diagram with on-demand entity emit", () => {
		const diagram = `
erDiagram
  CUSTOMER ||--o{ ORDER : places
`;
		const result = parse(diagram);
		expect(result.ast).toBeTruthy();

		if (result.ast) {
			const steps = decompose(result.ast);
			expect(steps.length).toBe(3);

			expect(steps[0]?.type).toBe("node");
			expect(steps[0]?.id).toBe("CUSTOMER");
			expect(steps[1]?.type).toBe("node");
			expect(steps[1]?.id).toBe("ORDER");
			expect(steps[2]?.type).toBe("edge");
		}
	});
});
