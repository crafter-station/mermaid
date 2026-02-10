import type { DirectedGraph } from "../graph";
import type { Direction } from "../types";

export interface CoordinateAssignment {
	positions: Map<string, { x: number; y: number }>;
	width: number;
	height: number;
}

function isHorizontal(direction: Direction): boolean {
	return direction === "LR" || direction === "RL";
}

function assignLayerCoordinates<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	layerSpacing: number,
	isHoriz: boolean,
): Map<number, number> {
	const layerCoords = new Map<number, number>();
	let coord = 0;

	for (let i = 0; i < layerArrays.length; i++) {
		layerCoords.set(i, coord);

		const maxSize = Math.max(
			...layerArrays[i].map((nodeId) => {
				const node = graph.getNode(nodeId);
				if (!node) return 0;
				return isHoriz ? node.width : node.height;
			}),
		);

		coord += maxSize + layerSpacing;
	}

	return layerCoords;
}

function assignWithinLayerPositions<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	nodeSpacing: number,
	isHoriz: boolean,
): Map<string, number> {
	const positions = new Map<string, number>();

	for (const layer of layerArrays) {
		let position = 0;

		for (const nodeId of layer) {
			const node = graph.getNode(nodeId);
			if (!node) continue;

			const size = isHoriz ? node.height : node.width;
			positions.set(nodeId, position + size / 2);
			position += size + nodeSpacing;
		}

		const totalSize = position - nodeSpacing;
		const offset = totalSize / 2;

		for (const nodeId of layer) {
			positions.set(nodeId, positions.get(nodeId)! - offset);
		}
	}

	return positions;
}

function resolveCollisions<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	positions: Map<string, number>,
	nodeSpacing: number,
	isHoriz: boolean,
): void {
	for (const layer of layerArrays) {
		const sorted = layer
			.map((nodeId) => ({
				nodeId,
				pos: positions.get(nodeId)!,
			}))
			.sort((a, b) => a.pos - b.pos);

		for (let i = 1; i < sorted.length; i++) {
			const prevNode = graph.getNode(sorted[i - 1].nodeId);
			const currNode = graph.getNode(sorted[i].nodeId);
			if (!prevNode || !currNode) continue;

			const prevSize = isHoriz ? prevNode.height : prevNode.width;
			const currSize = isHoriz ? currNode.height : currNode.width;
			const minPos =
				sorted[i - 1].pos + prevSize / 2 + nodeSpacing + currSize / 2;

			if (sorted[i].pos < minPos) {
				sorted[i].pos = minPos;
				positions.set(sorted[i].nodeId, minPos);
			}
		}
	}
}

function refinePositions<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	layerPositions: Map<string, number>,
	nodeSpacing: number,
	isHoriz: boolean,
): Map<string, number> {
	const positions = new Map(layerPositions);
	const iterations = 24;
	const damping = 0.5;
	const isVirtual = (id: string) => id.startsWith("__virtual_");
	const virtualWeight = 0.2;

	for (let iter = 0; iter < iterations; iter++) {
		const newPositions = new Map<string, number>();

		for (const layer of layerArrays) {
			for (const nodeId of layer) {
				const neighbors = [
					...graph.predecessors(nodeId),
					...graph.successors(nodeId),
				];

				if (neighbors.length === 0) {
					newPositions.set(nodeId, positions.get(nodeId)!);
					continue;
				}

				let weightedSum = 0;
				let totalWeight = 0;
				for (const n of neighbors) {
					const w = isVirtual(n) && !isVirtual(nodeId) ? virtualWeight : 1;
					weightedSum += (positions.get(n) ?? 0) * w;
					totalWeight += w;
				}
				const avgNeighborPos = weightedSum / totalWeight;

				const currentPos = positions.get(nodeId)!;
				const targetPos =
					currentPos + (avgNeighborPos - currentPos) * damping;

				newPositions.set(nodeId, targetPos);
			}
		}

		resolveCollisions(graph, layerArrays, newPositions, nodeSpacing, isHoriz);

		positions.clear();
		for (const [nodeId, pos] of newPositions) {
			positions.set(nodeId, pos);
		}
	}

	return positions;
}

function alignChains<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	positions: Map<string, number>,
	nodeSpacing: number,
	isHoriz: boolean,
): Map<string, number> {
	const aligned = new Map(positions);

	for (let iter = 0; iter < 4; iter++) {
		for (const layer of layerArrays) {
			for (const nodeId of layer) {
				const preds = graph.predecessors(nodeId);
				const succs = graph.successors(nodeId);

				let targetPos: number | null = null;

				if (preds.length === 1) {
					const parent = preds[0];
					const parentSuccs = graph.successors(parent);
					if (parentSuccs.length === 1) {
						targetPos = aligned.get(parent)!;
					}
				}

				if (targetPos === null && succs.length === 1) {
					const child = succs[0];
					const childPreds = graph.predecessors(child);
					if (childPreds.length === 1) {
						targetPos = aligned.get(child)!;
					}
				}

				if (targetPos !== null) {
					aligned.set(nodeId, targetPos);
				}
			}
		}

		resolveCollisions(graph, layerArrays, aligned, nodeSpacing, isHoriz);
	}

	return aligned;
}

function centerSubtrees<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	positions: Map<string, number>,
	nodeSpacing: number,
	isHoriz: boolean,
): Map<string, number> {
	const centered = new Map(positions);
	const isVirtual = (id: string) => id.startsWith("__virtual_");

	for (let iter = 0; iter < 8; iter++) {
		const isDownward = iter % 2 === 0;

		if (isDownward) {
			for (let li = 0; li < layerArrays.length; li++) {
				const layer = layerArrays[li];

				for (const nodeId of layer) {
					const succs = graph.successors(nodeId);
					if (succs.length < 2) continue;

					const nextLayer = layerArrays[li + 1];
					if (!nextLayer) continue;
					const childrenInNextLayer = succs.filter((s) =>
						nextLayer.includes(s),
					);
					if (childrenInNextLayer.length < 2) continue;

					const realChildren = childrenInNextLayer.filter(
						(c) => !isVirtual(c),
					);
					const centerTargets =
						realChildren.length >= 2
							? realChildren
							: childrenInNextLayer;

					const parentPos = centered.get(nodeId)!;
					const childPositions = centerTargets.map(
						(c) => centered.get(c)!,
					);
					const childCenter =
						(Math.min(...childPositions) +
							Math.max(...childPositions)) /
						2;
					const shift = parentPos - childCenter;

					if (Math.abs(shift) < 1) continue;

					for (const child of childrenInNextLayer) {
						centered.set(child, centered.get(child)! + shift);
					}
				}
			}
		} else {
			for (let li = layerArrays.length - 1; li >= 0; li--) {
				const layer = layerArrays[li];

				for (const nodeId of layer) {
					if (isVirtual(nodeId)) continue;

					const preds = graph.predecessors(nodeId);
					if (preds.length < 2) continue;

					const prevLayer = layerArrays[li - 1];
					if (!prevLayer) continue;
					const parentsInPrevLayer = preds.filter((p) =>
						prevLayer.includes(p),
					);

					const realParents = parentsInPrevLayer.filter(
						(p) => !isVirtual(p),
					);
					const centerTargets =
						realParents.length >= 2
							? realParents
							: parentsInPrevLayer;
					if (centerTargets.length < 2) continue;

					const parentPositions = centerTargets.map(
						(p) => centered.get(p)!,
					);
					const parentCenter =
						(Math.min(...parentPositions) +
							Math.max(...parentPositions)) /
						2;

					centered.set(nodeId, parentCenter);
				}
			}
		}

		resolveCollisions(graph, layerArrays, centered, nodeSpacing, isHoriz);
	}

	return centered;
}

function balanceGraph<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	positions: Map<string, number>,
	nodeSpacing: number,
	isHoriz: boolean,
): Map<string, number> {
	const result = new Map(positions);
	const isVirtual = (id: string) => id.startsWith("__virtual_");

	for (let iter = 0; iter < 8; iter++) {
		for (let li = 0; li < layerArrays.length; li++) {
			const layer = layerArrays[li];

			for (const nodeId of layer) {
				if (isVirtual(nodeId)) continue;

				const succs = graph.successors(nodeId);
				const realSuccs = succs.filter(
					(s) =>
						!isVirtual(s) &&
						layerArrays[li + 1]?.includes(s),
				);

				if (realSuccs.length >= 2) {
					const parentPos = result.get(nodeId)!;
					const childPositions = realSuccs.map(
						(c) => result.get(c)!,
					);
					const childCenter =
						(Math.min(...childPositions) +
							Math.max(...childPositions)) /
						2;
					const shift = parentPos - childCenter;

					if (Math.abs(shift) > 1) {
						for (const child of realSuccs) {
							result.set(child, result.get(child)! + shift);
						}
					}
				}
			}
		}

		for (let li = layerArrays.length - 1; li >= 0; li--) {
			const layer = layerArrays[li];

			for (const nodeId of layer) {
				if (isVirtual(nodeId)) continue;

				const preds = graph.predecessors(nodeId);
				const realPreds = preds.filter(
					(p) =>
						!isVirtual(p) &&
						layerArrays[li - 1]?.includes(p),
				);

				if (realPreds.length >= 2) {
					const parentPositions = realPreds.map(
						(p) => result.get(p)!,
					);
					const parentCenter =
						(Math.min(...parentPositions) +
							Math.max(...parentPositions)) /
						2;
					result.set(nodeId, parentCenter);
				}

				if (layer.length === 1) {
					const allPreds = preds.filter((p) => !isVirtual(p));
					const allSuccs = graph
						.successors(nodeId)
						.filter((s) => !isVirtual(s));
					const connected = [...allPreds, ...allSuccs];
					if (connected.length > 0) {
						const avg =
							connected.reduce(
								(sum, n) => sum + (result.get(n) ?? 0),
								0,
							) / connected.length;
						const current = result.get(nodeId)!;
						result.set(
							nodeId,
							current + (avg - current) * 0.5,
						);
					}
				}
			}
		}

		resolveCollisions(graph, layerArrays, result, nodeSpacing, isHoriz);
	}

	return result;
}

function normalizePositions(
	positions: Map<string, number>,
	padding: number,
): Map<string, number> {
	const values = Array.from(positions.values());
	const min = Math.min(...values);

	const normalized = new Map<string, number>();
	for (const [nodeId, pos] of positions) {
		normalized.set(nodeId, pos - min + padding);
	}

	return normalized;
}

export function assignCoordinates<N, E>(
	graph: DirectedGraph<N, E>,
	layerArrays: string[][],
	nodeSpacing: number,
	layerSpacing: number,
	padding: number,
	direction: Direction,
): CoordinateAssignment {
	const isHoriz = isHorizontal(direction);

	const layerCoords = assignLayerCoordinates(
		graph,
		layerArrays,
		layerSpacing,
		isHoriz,
	);

	const withinLayerPositions = assignWithinLayerPositions(
		graph,
		layerArrays,
		nodeSpacing,
		isHoriz,
	);

	const refinedPositions = refinePositions(
		graph,
		layerArrays,
		withinLayerPositions,
		nodeSpacing,
		isHoriz,
	);

	const chainAligned = alignChains(
		graph,
		layerArrays,
		refinedPositions,
		nodeSpacing,
		isHoriz,
	);

	const subtreeCentered = centerSubtrees(
		graph,
		layerArrays,
		chainAligned,
		nodeSpacing,
		isHoriz,
	);

	const finalPositions = balanceGraph(
		graph,
		layerArrays,
		subtreeCentered,
		nodeSpacing,
		isHoriz,
	);

	const normalizedPositions = normalizePositions(finalPositions, padding);

	const positions = new Map<string, { x: number; y: number }>();

	for (let i = 0; i < layerArrays.length; i++) {
		const layerCoord = layerCoords.get(i)! + padding;

		for (const nodeId of layerArrays[i]) {
			const withinLayerPos = normalizedPositions.get(nodeId)!;

			if (isHoriz) {
				positions.set(nodeId, { x: layerCoord, y: withinLayerPos });
			} else {
				positions.set(nodeId, { x: withinLayerPos, y: layerCoord });
			}
		}
	}

	if (direction === "BT" || direction === "RL") {
		const maxCoord = isHoriz
			? Math.max(
					...Array.from(positions.values()).map((p) => p.x),
				)
			: Math.max(
					...Array.from(positions.values()).map((p) => p.y),
				);

		for (const [nodeId, pos] of positions) {
			if (isHoriz) {
				positions.set(nodeId, {
					x: maxCoord - pos.x + 2 * padding,
					y: pos.y,
				});
			} else {
				positions.set(nodeId, {
					x: pos.x,
					y: maxCoord - pos.y + 2 * padding,
				});
			}
		}
	}

	let width = 0;
	let height = 0;

	for (const [nodeId, pos] of positions) {
		const node = graph.getNode(nodeId);
		if (!node) continue;

		const right = pos.x + node.width / 2 + padding;
		const bottom = pos.y + node.height / 2 + padding;

		if (right > width) width = right;
		if (bottom > height) height = bottom;
	}

	return { positions, width, height };
}
