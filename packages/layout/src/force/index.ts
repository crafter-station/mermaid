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
	inlineStyle?: Record<string, string>;
}

function clipToRect(cx: number, cy: number, w: number, h: number, targetX: number, targetY: number): Point {
	const dx = targetX - cx;
	const dy = targetY - cy;
	if (dx === 0 && dy === 0) return { x: cx, y: cy };

	const hw = w / 2;
	const hh = h / 2;
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);

	let t: number;
	if (absDx * hh > absDy * hw) {
		t = hw / absDx;
	} else {
		t = hh / absDy;
	}

	return { x: cx + dx * t, y: cy + dy * t };
}

export function forceLayout(
	nodes: Array<{ id: string; label: string; shape: string; inlineStyle?: Record<string, string> }>,
	edges: Array<{
		source: string;
		target: string;
		label?: string;
		style: string;
		hasArrowStart: boolean;
		hasArrowEnd: boolean;
		inlineStyle?: Record<string, string>;
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
			inlineStyle: n.inlineStyle,
		};
	});

	const nodeMap = new Map(forceNodes.map((n) => [n.id, n]));
	const iterations = 150;
	const repulsionStrength = 8000;
	const attractionStrength = 0.008;
	const damping = 0.85;
	const overlapPadding = 20;

	for (let iter = 0; iter < iterations; iter++) {
		for (let i = 0; i < forceNodes.length; i++) {
			for (let j = i + 1; j < forceNodes.length; j++) {
				const a = forceNodes[i]!;
				const b = forceNodes[j]!;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
				const minDist = (a.width + b.width) / 2 + overlapPadding;
				const effectiveDist = Math.max(dist, 1);
				const force = repulsionStrength / (effectiveDist * effectiveDist);
				const overlapForce = dist < minDist ? (minDist - dist) * 0.5 : 0;
				const totalForce = force + overlapForce;
				const fx = (dx / dist) * totalForce;
				const fy = (dy / dist) * totalForce;
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
			const idealDist = (source.width + target.width) / 2 + nodeSpacing;
			const force = (dist - idealDist) * attractionStrength;
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
		inlineStyle: n.inlineStyle,
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
				inlineStyle: edge.inlineStyle,
			};
		}

		const srcCx = source.x + source.width / 2;
		const srcCy = source.y + source.height / 2;
		const tgtCx = target.x + target.width / 2;
		const tgtCy = target.y + target.height / 2;

		const points: Point[] = [
			clipToRect(srcCx, srcCy, source.width, source.height, tgtCx, tgtCy),
			clipToRect(tgtCx, tgtCy, target.width, target.height, srcCx, srcCy),
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
			inlineStyle: edge.inlineStyle,
		};
	});

	const width = maxX - minX + padding * 2;
	const height = maxY - minY + padding * 2;

	return { width, height, nodes: positionedNodes, edges: positionedEdges, groups: [] };
}
