import type { DiagramAST } from "@crafter/mermaid-parser";
import type { PositionedGraph } from "@crafter/mermaid-layout";
import type { StepInfo } from "./timeline";

export function createSnapshot(
	fullGraph: PositionedGraph,
	steps: StepInfo[],
	currentStep: number,
	ast: DiagramAST,
): PositionedGraph {
	const visibleSteps = steps.slice(0, currentStep + 1);
	const visibleNodeIds = new Set<string>();
	const visibleEdgeIds = new Set<string>();

	for (const step of visibleSteps) {
		if (step.type === "node") {
			visibleNodeIds.add(step.id);
		} else if (step.type === "edge") {
			visibleEdgeIds.add(step.id);
		}
	}

	const filteredNodes = fullGraph.nodes.filter((node) =>
		visibleNodeIds.has(node.id),
	);

	const filteredEdges = fullGraph.edges.filter((edge) => {
		const edgeId = `${edge.source}->${edge.target}`;
		return visibleEdgeIds.has(edgeId);
	});

	const lifelines: typeof fullGraph.edges = [];
	if (ast.type === "sequence") {
		lifelines.push(
			...fullGraph.edges.filter(
				(edge) => edge.source === edge.target && edge.style === "dotted",
			),
		);
	}

	return {
		width: fullGraph.width,
		height: fullGraph.height,
		nodes: filteredNodes,
		edges: [...lifelines, ...filteredEdges],
		groups: fullGraph.groups,
	};
}
