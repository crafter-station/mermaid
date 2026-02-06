import type {
	DiagramAST,
	FlowchartAST,
	FlowchartSubgraph,
	SequenceAST,
	ClassAST,
	ERAST,
} from "@crafter/mermaid-parser";
import type {
	LayoutOptions,
	Point,
	PositionedEdge,
	PositionedGraph,
	PositionedGroup,
	PositionedNode,
} from "./types";
import { estimateNodeSize } from "./text-metrics";
import { sugiyamaLayout } from "./sugiyama/index";
import { routeEdge, computeLabelPosition } from "./edge-routing";

interface LayoutNode {
	id: string;
	label: string;
	shape: string;
	inlineStyle?: Record<string, string>;
}

interface LayoutEdge {
	source: string;
	target: string;
	label?: string;
	style: string;
	hasArrowStart: boolean;
	hasArrowEnd: boolean;
}

function layoutSequenceDiagram(
	ast: SequenceAST,
	options: LayoutOptions,
): PositionedGraph {
	const padding = options.padding ?? 20;
	const nodeSpacing = options.nodeSpacing ?? 60;
	const layerSpacing = options.layerSpacing ?? 50;

	const participants = ast.participants;
	const columnWidth = 120;
	const actorHeight = 60;

	const positionedNodes: PositionedNode[] = [];
	const columnPositions = new Map<string, number>();

	for (let i = 0; i < participants.length; i++) {
		const participant = participants[i]!;
		const x = padding + i * (columnWidth + nodeSpacing);
		const y = padding;

		columnPositions.set(participant.id, x);

		positionedNodes.push({
			id: participant.id,
			label: participant.label,
			shape: participant.type,
			x,
			y,
			width: columnWidth,
			height: actorHeight,
		});
	}

	const positionedEdges: PositionedEdge[] = [];
	let currentY = padding + actorHeight + layerSpacing;

	for (const item of ast.messages) {
		if ("from" in item && "to" in item) {
			const message = item;
			const sourceX = columnPositions.get(message.from) ?? padding;
			const targetX = columnPositions.get(message.to) ?? padding;

			const points: Point[] = [
				{ x: sourceX + columnWidth / 2, y: currentY },
				{ x: targetX + columnWidth / 2, y: currentY },
			];

			positionedEdges.push({
				source: message.from,
				target: message.to,
				label: message.label,
				style: message.arrowType === "solid" ? "solid" : "dotted",
				hasArrowStart: false,
				hasArrowEnd: true,
				points,
				labelPosition: computeLabelPosition(points),
			});

			currentY += layerSpacing;
		}
	}

	const width =
		padding +
		participants.length * columnWidth +
		(participants.length - 1) * nodeSpacing +
		padding;
	const height = currentY + padding;

	for (const participant of participants) {
		const x = columnPositions.get(participant.id) ?? padding;
		const centerX = x + columnWidth / 2;
		positionedEdges.unshift({
			source: participant.id,
			target: participant.id,
			style: "dotted",
			hasArrowStart: false,
			hasArrowEnd: false,
			points: [
				{ x: centerX, y: padding + actorHeight },
				{ x: centerX, y: height - padding },
			],
		});
	}

	return {
		width,
		height,
		nodes: positionedNodes,
		edges: positionedEdges,
		groups: [],
	};
}

function convertFlowchartToLayout(
	ast: FlowchartAST,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodes: LayoutNode[] = Array.from(ast.nodes.values()).map((node) => {
		const classDefName = ast.classAssignments.get(node.id);
		const classDef = classDefName ? ast.classDefs.get(classDefName) : undefined;
		const nodeStyle = ast.nodeStyles.get(node.id);

		const inlineStyle = {
			...classDef,
			...nodeStyle,
		};

		return {
			id: node.id,
			label: node.label,
			shape: node.shape,
			inlineStyle: Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined,
		};
	});

	const edges: LayoutEdge[] = ast.edges.map((edge) => ({
		source: edge.source,
		target: edge.target,
		label: edge.label,
		style: edge.style,
		hasArrowStart: edge.hasArrowStart,
		hasArrowEnd: edge.hasArrowEnd,
	}));

	return { nodes, edges };
}

function convertClassToLayout(
	ast: ClassAST,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodes: LayoutNode[] = Array.from(ast.classes.values()).map((cls) => {
		const label = cls.label || cls.id;
		return {
			id: cls.id,
			label,
			shape: "rectangle",
		};
	});

	const edges: LayoutEdge[] = ast.relations.map((rel) => ({
		source: rel.from,
		target: rel.to,
		label: rel.label,
		style: "solid",
		hasArrowStart: false,
		hasArrowEnd: true,
	}));

	return { nodes, edges };
}

function convertERToLayout(
	ast: ERAST,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodes: LayoutNode[] = Array.from(ast.entities.values()).map((entity) => ({
		id: entity.id,
		label: entity.id,
		shape: "rectangle",
	}));

	const edges: LayoutEdge[] = ast.relations.map((rel) => ({
		source: rel.from,
		target: rel.to,
		label: rel.label,
		style: "solid",
		hasArrowStart: false,
		hasArrowEnd: true,
	}));

	return { nodes, edges };
}

function collectAllNodeIds(subgraph: FlowchartSubgraph): string[] {
	const ids = [...subgraph.nodeIds];
	for (const child of subgraph.children) {
		ids.push(...collectAllNodeIds(child));
	}
	return ids;
}

function computeGroups(
	subgraphs: FlowchartSubgraph[],
	nodeMap: Map<string, PositionedNode>,
	padding: number,
): PositionedGroup[] {
	return subgraphs
		.map((sg) => {
			const children = computeGroups(sg.children, nodeMap, padding);
			const allNodeIds = collectAllNodeIds(sg);
			const nodes = allNodeIds.map((id) => nodeMap.get(id)).filter(Boolean) as PositionedNode[];

			if (nodes.length === 0 && children.length === 0) return null;

			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;

			for (const node of nodes) {
				minX = Math.min(minX, node.x);
				minY = Math.min(minY, node.y);
				maxX = Math.max(maxX, node.x + node.width);
				maxY = Math.max(maxY, node.y + node.height);
			}

			for (const child of children) {
				minX = Math.min(minX, child.x);
				minY = Math.min(minY, child.y);
				maxX = Math.max(maxX, child.x + child.width);
				maxY = Math.max(maxY, child.y + child.height);
			}

			const groupPad = padding;
			const labelHeight = 20;

			return {
				id: sg.id,
				label: sg.label,
				x: minX - groupPad,
				y: minY - groupPad - labelHeight,
				width: maxX - minX + groupPad * 2,
				height: maxY - minY + groupPad * 2 + labelHeight,
				children,
			};
		})
		.filter(Boolean) as PositionedGroup[];
}

function layoutHierarchicalDiagram(
	nodes: LayoutNode[],
	edges: LayoutEdge[],
	options: LayoutOptions,
	defaultDirection: string,
	subgraphs?: FlowchartSubgraph[],
): PositionedGraph {
	const direction = (options.direction ?? defaultDirection ?? "TB") as
		| "TD"
		| "TB"
		| "LR"
		| "BT"
		| "RL";

	const layoutNodes = nodes.map((node) => {
		const size = estimateNodeSize(node.label, node.shape);
		return {
			id: node.id,
			width: size.width,
			height: size.height,
		};
	});

	const layoutEdges = edges.map((edge) => ({
		source: edge.source,
		target: edge.target,
		weight: 1,
	}));

	const result = sugiyamaLayout(layoutNodes, layoutEdges, {
		...options,
		direction,
	});

	const positionedNodes: PositionedNode[] = nodes.map((node) => {
		const pos = result.nodePositions.get(node.id) ?? { x: 0, y: 0 };
		const size = estimateNodeSize(node.label, node.shape);

		return {
			id: node.id,
			label: node.label,
			shape: node.shape,
			x: pos.x - size.width / 2,
			y: pos.y - size.height / 2,
			width: size.width,
			height: size.height,
			inlineStyle: node.inlineStyle,
		};
	});

	const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

	const positionedEdges: PositionedEdge[] = edges.map((edge) => {
		const sourceNode = nodeMap.get(edge.source);
		const targetNode = nodeMap.get(edge.target);

		if (!sourceNode || !targetNode) {
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

		const waypoints =
			result.edgeRoutes.get(`${edge.source}->${edge.target}`) ?? [
				{ x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y + sourceNode.height / 2 },
				{ x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 },
			];

		const sourceCentered = {
			x: sourceNode.x + sourceNode.width / 2,
			y: sourceNode.y + sourceNode.height / 2,
			width: sourceNode.width,
			height: sourceNode.height,
		};
		const targetCentered = {
			x: targetNode.x + targetNode.width / 2,
			y: targetNode.y + targetNode.height / 2,
			width: targetNode.width,
			height: targetNode.height,
		};

		const points = routeEdge(
			sourceCentered,
			targetCentered,
			waypoints,
			sourceNode.shape,
			targetNode.shape,
			direction,
		);

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
	for (const e of positionedEdges) {
		for (const p of e.points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
	}

	const padding = options.padding ?? 20;
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
		if (e.labelPosition) {
			e.labelPosition.x += shiftX;
			e.labelPosition.y += shiftY;
		}
	}

	const contentWidth = maxX - minX + padding * 2;
	const contentHeight = maxY - minY + padding * 2;

	const groups = subgraphs ? computeGroups(subgraphs, nodeMap, 12) : [];

	return {
		width: contentWidth,
		height: contentHeight,
		nodes: positionedNodes,
		edges: positionedEdges,
		groups,
	};
}

export function layout(
	ast: DiagramAST,
	options: LayoutOptions = {},
): PositionedGraph {
	const mergedOptions: LayoutOptions = {
		nodeSpacing: 40,
		layerSpacing: 60,
		padding: 20,
		...options,
	};

	if (ast.type === "sequence") {
		return layoutSequenceDiagram(ast, mergedOptions);
	}

	if (ast.type === "flowchart") {
		const { nodes, edges } = convertFlowchartToLayout(ast);
		return layoutHierarchicalDiagram(nodes, edges, mergedOptions, ast.direction, ast.subgraphs);
	}

	if (ast.type === "class") {
		const { nodes, edges } = convertClassToLayout(ast);
		return layoutHierarchicalDiagram(nodes, edges, mergedOptions, "TB");
	}

	if (ast.type === "er") {
		const { nodes, edges } = convertERToLayout(ast);
		return layoutHierarchicalDiagram(nodes, edges, mergedOptions, "TB");
	}

	throw new Error(`Unsupported diagram type: ${(ast as { type: string }).type}`);
}

export * from "./types";
