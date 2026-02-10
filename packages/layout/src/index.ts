import type {
	ClassAST,
	DiagramAST,
	ERAST,
	FlowchartAST,
	FlowchartSubgraph,
} from "@crafter/mermaid-parser";
import type {
	LayoutOptions,
	PositionedEdge,
	PositionedGraph,
	PositionedGroup,
	PositionedNode,
} from "./types";
import { estimateNodeSize } from "./text-metrics";
import { sugiyamaLayout } from "./sugiyama/index";
import { routeEdge, computeLabelPosition } from "./edge-routing";
import { layoutSequenceDiagram } from "./column/index";
import { forceLayout } from "./force/index";
import { layoutPieDiagram, layoutMindmapDiagram } from "./radial/index";
import { layoutGanttDiagram } from "./timeline/index";

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
	inlineStyle?: Record<string, string>;
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

function formatClassMember(m: {
	name: string;
	type?: string;
	visibility: string;
	isMethod: boolean;
	returnType?: string;
}): string {
	const vis = m.visibility || "";
	if (m.isMethod) {
		const ret = m.returnType ? `: ${m.returnType}` : "";
		return `${vis}${m.name}()${ret}`;
	}
	const type = m.type ? `: ${m.type}` : "";
	return `${vis}${m.name}${type}`;
}

function convertClassToLayout(
	ast: ClassAST,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodes: LayoutNode[] = Array.from(ast.classes.values()).map((cls) => {
		const className = cls.label || cls.id;
		const attrs = cls.members.filter((m) => !m.isMethod).map(formatClassMember);
		const methods = cls.members.filter((m) => m.isMethod).map(formatClassMember);

		const labelParts = [className];
		if (attrs.length > 0 || methods.length > 0) {
			labelParts.push("---");
			labelParts.push(...attrs);
		}
		if (methods.length > 0) {
			labelParts.push("---");
			labelParts.push(...methods);
		}

		const label = labelParts.join("\n");

		const attrCount = attrs.length;
		const methodCount = methods.length;

		return {
			id: cls.id,
			label,
			shape: "class-box",
			inlineStyle: {
				className,
				attrCount: String(attrCount),
				methodCount: String(methodCount),
			},
		};
	});

	const edges: LayoutEdge[] = ast.relations.map((rel) => ({
		source: rel.from,
		target: rel.to,
		label: rel.label,
		style: rel.type === "dependency" || rel.type === "realization" ? "dotted" : "solid",
		hasArrowStart: false,
		hasArrowEnd: rel.type === "association" || rel.type === "dependency",
		inlineStyle: { relationType: rel.type },
	}));

	return { nodes, edges };
}

function formatERAttribute(attr: {
	name: string;
	type: string;
	keys: string[];
}): string {
	const keyStr = attr.keys.length > 0 ? attr.keys.join(",") : "";
	return keyStr ? `${keyStr} ${attr.type} ${attr.name}` : `${attr.type} ${attr.name}`;
}

function convertERToLayout(
	ast: ERAST,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodes: LayoutNode[] = Array.from(ast.entities.values()).map((entity) => {
		const attrs = entity.attributes.map(formatERAttribute);
		const labelParts = [entity.id];
		if (attrs.length > 0) {
			labelParts.push("---");
			labelParts.push(...attrs);
		}
		const label = labelParts.join("\n");

		return {
			id: entity.id,
			label,
			shape: "er-entity",
			inlineStyle: {
				entityName: entity.id,
				attrCount: String(entity.attributes.length),
			},
		};
	});

	const edges: LayoutEdge[] = ast.relations.map((rel) => ({
		source: rel.from,
		target: rel.to,
		label: rel.label,
		style: rel.identifying ? "solid" : "dotted",
		hasArrowStart: false,
		hasArrowEnd: false,
		inlineStyle: {
			fromCardinality: rel.fromCardinality,
			toCardinality: rel.toCardinality,
		},
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
				inlineStyle: edge.inlineStyle,
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
			inlineStyle: edge.inlineStyle,
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
		return forceLayout(nodes, edges, mergedOptions);
	}

	if (ast.type === "pie") {
		return layoutPieDiagram(ast, mergedOptions);
	}

	if (ast.type === "gantt") {
		return layoutGanttDiagram(ast, mergedOptions);
	}

	if (ast.type === "mindmap") {
		return layoutMindmapDiagram(ast, mergedOptions);
	}

	throw new Error(`Unsupported diagram type: ${(ast as { type: string }).type}`);
}

export * from "./types";
