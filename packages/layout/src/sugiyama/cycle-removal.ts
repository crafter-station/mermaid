import type { DirectedGraph } from "../graph";

interface ReversedEdge {
	source: string;
	target: string;
}

export function removeCycles<N, E>(
	graph: DirectedGraph<N, E>,
): ReversedEdge[] {
	const visited = new Set<string>();
	const inStack = new Set<string>();
	const reversedEdges: ReversedEdge[] = [];

	function dfs(nodeId: string): void {
		visited.add(nodeId);
		inStack.add(nodeId);

		const successors = graph.successors(nodeId);
		for (const successor of successors) {
			if (!visited.has(successor)) {
				dfs(successor);
			} else if (inStack.has(successor)) {
				graph.reverseEdge(nodeId, successor);
				reversedEdges.push({ source: nodeId, target: successor });
			}
		}

		inStack.delete(nodeId);
	}

	const sources = graph.sources();
	if (sources.length === 0) {
		const allNodes = graph.nodeIds();
		if (allNodes.length > 0) {
			dfs(allNodes[0]);
		}
	} else {
		for (const source of sources) {
			if (!visited.has(source)) {
				dfs(source);
			}
		}
	}

	for (const nodeId of graph.nodeIds()) {
		if (!visited.has(nodeId)) {
			dfs(nodeId);
		}
	}

	return reversedEdges;
}

export function restoreCycles<N, E>(
	graph: DirectedGraph<N, E>,
	reversedEdges: ReversedEdge[],
): void {
	for (const edge of reversedEdges) {
		graph.reverseEdge(edge.target, edge.source);
	}
}
