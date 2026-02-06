import type { DirectedGraph } from "../graph";

interface LayerAssignment {
	layers: Map<string, number>;
	maxLayer: number;
}

function topologicalSort<N, E>(graph: DirectedGraph<N, E>): string[] {
	const inDegree = new Map<string, number>();
	const queue: string[] = [];
	const result: string[] = [];

	for (const nodeId of graph.nodeIds()) {
		const degree = graph.predecessors(nodeId).length;
		inDegree.set(nodeId, degree);
		if (degree === 0) {
			queue.push(nodeId);
		}
	}

	while (queue.length > 0) {
		queue.sort();
		const current = queue.shift()!;
		result.push(current);

		for (const successor of graph.successors(current)) {
			const degree = inDegree.get(successor)! - 1;
			inDegree.set(successor, degree);
			if (degree === 0) {
				queue.push(successor);
			}
		}
	}

	return result;
}

export function assignLayers<N, E>(
	graph: DirectedGraph<N, E>,
): LayerAssignment {
	const layers = new Map<string, number>();
	const sorted = topologicalSort(graph);

	for (const nodeId of sorted) {
		const predecessors = graph.predecessors(nodeId);
		if (predecessors.length === 0) {
			layers.set(nodeId, 0);
		} else {
			const maxPredLayer = Math.max(
				...predecessors.map((pred) => layers.get(pred) ?? 0),
			);
			layers.set(nodeId, maxPredLayer + 1);
		}
	}

	const maxLayer = Math.max(...Array.from(layers.values()));

	return { layers, maxLayer };
}

export function insertVirtualNodes<N, E>(
	graph: DirectedGraph<N, E>,
	layers: Map<string, number>,
): Map<string, string[]> {
	const edgeVirtualNodes = new Map<string, string[]>();
	const edges = graph.getEdges();
	let virtualCounter = 0;

	for (const edge of edges) {
		const sourceLayer = layers.get(edge.source) ?? 0;
		const targetLayer = layers.get(edge.target) ?? 0;
		const layerSpan = targetLayer - sourceLayer;

		if (layerSpan > 1) {
			const virtuals: string[] = [];
			let prevNode = edge.source;

			for (let i = 1; i < layerSpan; i++) {
				const virtualId = `__virtual_${virtualCounter++}`;
				graph.addNode(virtualId, edge.data as N, 0, 0);
				layers.set(virtualId, sourceLayer + i);

				graph.addEdge(prevNode, virtualId, edge.data, edge.weight);
				virtuals.push(virtualId);
				prevNode = virtualId;
			}

			graph.addEdge(prevNode, edge.target, edge.data, edge.weight);
			graph.removeEdge(edge.source, edge.target);

			edgeVirtualNodes.set(`${edge.source}->${edge.target}`, virtuals);
		}
	}

	return edgeVirtualNodes;
}

export function buildLayerArrays(
	layers: Map<string, number>,
	maxLayer: number,
): string[][] {
	const layerArrays: string[][] = Array.from({ length: maxLayer + 1 }, () => []);

	for (const [nodeId, layer] of layers) {
		layerArrays[layer].push(nodeId);
	}

	for (const layer of layerArrays) {
		layer.sort();
	}

	return layerArrays;
}
