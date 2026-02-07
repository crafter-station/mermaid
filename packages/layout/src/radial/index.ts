import type { MindmapAST, MindmapNode, PieAST } from "@crafter/mermaid-parser";
import type {
	LayoutOptions,
	PositionedEdge,
	PositionedGraph,
	PositionedNode,
} from "../types";

export function layoutPieDiagram(
	ast: PieAST,
	options: LayoutOptions,
): PositionedGraph {
	const padding = options.padding ?? 20;
	const radius = 120;
	const cx = padding + radius;
	const titleHeight = ast.title ? 30 : 0;
	const cy = padding + titleHeight + radius;

	const total = ast.slices.reduce((sum, s) => sum + s.value, 0);
	if (total === 0) {
		return { width: padding * 2, height: padding * 2, nodes: [], edges: [], groups: [] };
	}

	const positionedNodes: PositionedNode[] = [];
	let startAngle = -Math.PI / 2;

	for (let i = 0; i < ast.slices.length; i++) {
		const slice = ast.slices[i]!;
		const sliceAngle = (slice.value / total) * Math.PI * 2;
		const midAngle = startAngle + sliceAngle / 2;

		const labelRadius = radius * 0.65;
		const labelX = cx + labelRadius * Math.cos(midAngle);
		const labelY = cy + labelRadius * Math.sin(midAngle);

		positionedNodes.push({
			id: `slice-${i}`,
			label: slice.label,
			shape: "pie-slice",
			x: labelX - 30,
			y: labelY - 12,
			width: 60,
			height: 24,
			inlineStyle: {
				cx: String(cx),
				cy: String(cy),
				radius: String(radius),
				startAngle: String(startAngle),
				endAngle: String(startAngle + sliceAngle),
				value: String(slice.value),
				percent: String(Math.round((slice.value / total) * 100)),
				index: String(i),
			},
		});

		startAngle += sliceAngle;
	}

	if (ast.title) {
		positionedNodes.unshift({
			id: "pie-title",
			label: ast.title,
			shape: "pie-title",
			x: cx - 80,
			y: padding,
			width: 160,
			height: 24,
		});
	}

	const width = cx + radius + padding;
	const height = cy + radius + padding;

	return { width, height, nodes: positionedNodes, edges: [], groups: [] };
}

function layoutMindmapNode(
	node: MindmapNode,
	cx: number,
	cy: number,
	angle: number,
	spread: number,
	depth: number,
	positionedNodes: PositionedNode[],
	positionedEdges: PositionedEdge[],
): void {
	const labelWidth = Math.max(node.label.length * 9 + 20, 60);
	const labelHeight = 32;
	const shapeMap: Record<string, string> = {
		default: "rounded",
		rounded: "rounded",
		circle: "circle",
		bang: "hexagon",
		cloud: "cloud",
		hexagon: "hexagon",
	};

	positionedNodes.push({
		id: node.id,
		label: node.label,
		shape: shapeMap[node.shape] || "rounded",
		x: cx - labelWidth / 2,
		y: cy - labelHeight / 2,
		width: labelWidth,
		height: labelHeight,
	});

	if (node.children.length === 0) return;

	const childSpread = spread / Math.max(node.children.length, 1);
	const startAngle = angle - spread / 2 + childSpread / 2;
	const ringRadius = 120 + depth * 30;

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i]!;
		const childAngle = startAngle + i * childSpread;
		const childX = cx + ringRadius * Math.cos(childAngle);
		const childY = cy + ringRadius * Math.sin(childAngle);

		positionedEdges.push({
			source: node.id,
			target: child.id,
			style: "solid",
			hasArrowStart: false,
			hasArrowEnd: false,
			points: [
				{ x: cx, y: cy },
				{ x: childX, y: childY },
			],
		});

		layoutMindmapNode(
			child,
			childX,
			childY,
			childAngle,
			childSpread * 1.2,
			depth + 1,
			positionedNodes,
			positionedEdges,
		);
	}
}

export function layoutMindmapDiagram(
	ast: MindmapAST,
	options: LayoutOptions,
): PositionedGraph {
	const padding = options.padding ?? 40;

	const positionedNodes: PositionedNode[] = [];
	const positionedEdges: PositionedEdge[] = [];

	const cx = 300;
	const cy = 300;

	layoutMindmapNode(
		ast.root,
		cx,
		cy,
		0,
		Math.PI * 2,
		0,
		positionedNodes,
		positionedEdges,
	);

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const n of positionedNodes) {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	}

	const shiftX = padding - minX;
	const shiftY = padding - minY;

	for (const n of positionedNodes) {
		n.x += shiftX;
		n.y += shiftY;
	}
	for (const e of positionedEdges) {
		for (const p of e.points) {
			p.x += shiftX;
			p.y += shiftY;
		}
	}

	const width = maxX - minX + padding * 2;
	const height = maxY - minY + padding * 2;

	return { width, height, nodes: positionedNodes, edges: positionedEdges, groups: [] };
}
