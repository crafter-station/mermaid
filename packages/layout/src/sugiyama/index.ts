import type { LayoutOptions, Point } from "../types";
import { DirectedGraph } from "../graph";
import { removeCycles, restoreCycles } from "./cycle-removal";
import { assignLayers, insertVirtualNodes, buildLayerArrays } from "./layer-assign";
import { minimizeCrossings } from "./crossing-min";
import { assignCoordinates } from "./coordinate";

export interface SugiyamaResult {
	nodePositions: Map<string, Point>;
	edgeRoutes: Map<string, Point[]>;
	width: number;
	height: number;
}

export function sugiyamaLayout(
	nodes: Array<{ id: string; width: number; height: number }>,
	edges: Array<{ source: string; target: string; weight?: number }>,
	options: LayoutOptions,
): SugiyamaResult {
	const graph = new DirectedGraph<unknown, unknown>();

	for (const node of nodes) {
		graph.addNode(node.id, {}, node.width, node.height);
	}

	for (const edge of edges) {
		graph.addEdge(edge.source, edge.target, {}, edge.weight ?? 1);
	}

	const reversedEdges = removeCycles(graph);

	const { layers, maxLayer } = assignLayers(graph);

	const edgeVirtualNodes = insertVirtualNodes(graph, layers);

	const layerArrays = buildLayerArrays(layers, maxLayer);

	const optimizedLayers = minimizeCrossings(graph, layerArrays);

	const direction = options.direction ?? "TB";
	const nodeSpacing = options.nodeSpacing ?? 50;
	const layerSpacing = options.layerSpacing ?? 100;
	const padding = options.padding ?? 20;

	const { positions, width, height } = assignCoordinates(
		graph,
		optimizedLayers,
		nodeSpacing,
		layerSpacing,
		padding,
		direction,
	);

	restoreCycles(graph, reversedEdges);

	const nodePositions = new Map<string, Point>();
	for (const node of nodes) {
		const pos = positions.get(node.id);
		if (pos) {
			nodePositions.set(node.id, pos);
		}
	}

	const edgeRoutes = new Map<string, Point[]>();

	for (const edge of edges) {
		const sourcePos = positions.get(edge.source);
		const targetPos = positions.get(edge.target);

		if (!sourcePos || !targetPos) continue;

		const virtuals = edgeVirtualNodes.get(`${edge.source}->${edge.target}`) ?? [];

		const waypoints: Point[] = [sourcePos];

		for (const virtualId of virtuals) {
			const virtualPos = positions.get(virtualId);
			if (virtualPos) {
				waypoints.push(virtualPos);
			}
		}

		waypoints.push(targetPos);

		edgeRoutes.set(`${edge.source}->${edge.target}`, waypoints);
	}

	return { nodePositions, edgeRoutes, width, height };
}
