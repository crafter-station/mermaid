import type { DirectedGraph } from "../graph";

function countCrossings<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
): number {
	let crossings = 0;

	for (let i = 0; i < layerArrays.length - 1; i++) {
		const currentLayer = layerArrays[i];
		const nextLayer = layerArrays[i + 1];

		const positions = new Map<string, number>();
		for (let j = 0; j < nextLayer.length; j++) {
			positions.set(nextLayer[j], j);
		}

		for (let a = 0; a < currentLayer.length; a++) {
			const nodeA = currentLayer[a];
			const successorsA = graph.successors(nodeA);

			for (let b = a + 1; b < currentLayer.length; b++) {
				const nodeB = currentLayer[b];
				const successorsB = graph.successors(nodeB);

				for (const succA of successorsA) {
					const posA = positions.get(succA);
					if (posA === undefined) continue;

					for (const succB of successorsB) {
						const posB = positions.get(succB);
						if (posB === undefined) continue;

						if (posA > posB) {
							crossings++;
						}
					}
				}
			}
		}
	}

	return crossings;
}

function barycenter<N, E>(
	graph: DirectedGraph<N, E>,
	layer: string[],
	prevLayer: string[],
	isDownward: boolean,
): string[] {
	const positions = new Map<string, number>();
	for (let i = 0; i < prevLayer.length; i++) {
		positions.set(prevLayer[i], i);
	}

	const weights = layer.map((nodeId) => {
		const neighbors = isDownward
			? graph.predecessors(nodeId)
			: graph.successors(nodeId);

		const validNeighbors = neighbors.filter((n) => positions.has(n));
		if (validNeighbors.length === 0) return { nodeId, weight: 0 };

		const sum = validNeighbors.reduce((acc, n) => acc + positions.get(n)!, 0);
		return { nodeId, weight: sum / validNeighbors.length };
	});

	weights.sort((a, b) => {
		if (a.weight !== b.weight) return a.weight - b.weight;
		return a.nodeId.localeCompare(b.nodeId);
	});

	return weights.map((w) => w.nodeId);
}

export function minimizeCrossings<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
): string[][] {
	let bestLayers = layerArrays.map((layer) => [...layer]);
	let bestCrossings = countCrossings(graph, bestLayers);

	if (bestCrossings === 0) return bestLayers;

	const maxIterations = 24;
	let currentLayers = bestLayers.map((layer) => [...layer]);

	for (let iter = 0; iter < maxIterations; iter++) {
		const isDownward = iter % 2 === 0;

		if (isDownward) {
			for (let i = 1; i < currentLayers.length; i++) {
				currentLayers[i] = barycenter(
					graph,
					currentLayers[i],
					currentLayers[i - 1],
					true,
				);
			}
		} else {
			for (let i = currentLayers.length - 2; i >= 0; i--) {
				currentLayers[i] = barycenter(
					graph,
					currentLayers[i],
					currentLayers[i + 1],
					false,
				);
			}
		}

		const crossings = countCrossings(graph, currentLayers);
		if (crossings < bestCrossings) {
			bestCrossings = crossings;
			bestLayers = currentLayers.map((layer) => [...layer]);

			if (bestCrossings === 0) break;
		}
	}

	return bestLayers;
}
