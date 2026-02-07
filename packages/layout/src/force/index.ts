import { computeLabelPosition } from "../edge-routing";
import { estimateNodeSize } from "../text-metrics";
import type {
	LayoutOptions,
	Point,
	PositionedEdge,
	PositionedGraph,
	PositionedNode,
} from "../types";

interface ForceNode {
	id: string;
	label: string;
	shape: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	width: number;
	height: number;
}

export function forceLayout(
	nodes: Array<{ id: string; label: string; shape: string }>,
	edges: Array<{
		source: string;
		target: string;
		label?: string;
		style: string;
		hasArrowStart: boolean;
		hasArrowEnd: boolean;
	}>,
	options: LayoutOptions,
): PositionedGraph {
	const padding = options.padding ?? 20;
	const nodeSpacing = options.nodeSpacing ?? 80;

	const forceNodes: ForceNode[] = nodes.map((n, i) => {
		const size = estimateNodeSize(n.label, n.shape);
		const angle = (i / nodes.length) * Math.PI * 2;
		const radius = nodeSpacing * Math.sqrt(nodes.length);
		return {
			id: n.id,
			label: n.label,
			shape: n.shape,
			x: radius * Math.cos(angle),
			y: radius * Math.sin(angle),
			vx: 0,
			vy: 0,
			width: size.width,
			height: size.height,
		};
	});

	const nodeMap = new Map(forceNodes.map((n) => [n.id, n]));
	const iterations = 100;
	const repulsionStrength = 5000;
	const attractionStrength = 0.01;
	const damping = 0.9;

	for (let iter = 0; iter < iterations; iter++) {
		for (let i = 0; i < forceNodes.length; i++) {
			for (let j = i + 1; j < forceNodes.length; j++) {
				const a = forceNodes[i]!;
				const b = forceNodes[j]!;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
				const force = repulsionStrength / (dist * dist);
				const fx = (dx / dist) * force;
				const fy = (dy / dist) * force;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
			}
		}

		for (const edge of edges) {
			const source = nodeMap.get(edge.source);
			const target = nodeMap.get(edge.target);
			if (!source || !target) continue;
			const dx = target.x - source.x;
			const dy = target.y - source.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const force = (dist - nodeSpacing) * attractionStrength;
			const fx = (dx / Math.max(dist, 1)) * force;
			const fy = (dy / Math.max(dist, 1)) * force;
			source.vx += fx;
			source.vy += fy;
			target.vx -= fx;
			target.vy -= fy;
		}

		for (const node of forceNodes) {
			node.vx *= damping;
			node.vy *= damping;
			node.x += node.vx;
			node.y += node.vy;
		}
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const n of forceNodes) {
		minX = Math.min(minX, n.x - n.width / 2);
		minY = Math.min(minY, n.y - n.height / 2);
		maxX = Math.max(maxX, n.x + n.width / 2);
		maxY = Math.max(maxY, n.y + n.height / 2);
	}

	const shiftX = padding - minX;
	const shiftY = padding - minY;

	const positionedNodes: PositionedNode[] = forceNodes.map((n) => ({
		id: n.id,
		label: n.label,
		shape: n.shape,
		x: n.x - n.width / 2 + shiftX,
		y: n.y - n.height / 2 + shiftY,
		width: n.width,
		height: n.height,
	}));

	const posNodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

	const positionedEdges: PositionedEdge[] = edges.map((edge) => {
		const source = posNodeMap.get(edge.source);
		const target = posNodeMap.get(edge.target);
		if (!source || !target) {
			return {
				source: edge.source,
				target: edge.target,
				label: edge.label,
				style: edge.style,
				hasArrowStart: edge.hasArrowStart,
				hasArrowEnd: edge.hasArrowEnd,
				points: [],
			};
		}

		const points: Point[] = [
			{
				x: source.x + source.width / 2,
				y: source.y + source.height / 2,
			},
			{
				x: target.x + target.width / 2,
				y: target.y + target.height / 2,
			},
		];

		return {
			source: edge.source,
			target: edge.target,
			label: edge.label,
			style: edge.style,
			hasArrowStart: edge.hasArrowStart,
			hasArrowEnd: edge.hasArrowEnd,
			points,
			labelPosition: edge.label ? computeLabelPosition(points) : undefined,
		};
	});

	const width = maxX - minX + padding * 2;
	const height = maxY - minY + padding * 2;

	return { width, height, nodes: positionedNodes, edges: positionedEdges, groups: [] };
}
