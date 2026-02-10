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

interface InnerLayout {
	nodes: PositionedNode[];
	edges: PositionedEdge[];
	width: number;
	height: number;
	groups: PositionedGroup[];
}

function collectAllSubgraphNodeIds(subgraphs: FlowchartSubgraph[]): Set<string> {
	const ids = new Set<string>();
	for (const sg of subgraphs) {
		for (const id of sg.nodeIds) ids.add(id);
		for (const id of collectAllSubgraphNodeIds(sg.children)) ids.add(id);
	}
	return ids;
}

function layoutSubgraphsHierarchically(
	allNodes: LayoutNode[],
	allEdges: LayoutEdge[],
	subgraphs: FlowchartSubgraph[],
	options: LayoutOptions,
	direction: string,
): {
	innerLayouts: Map<string, InnerLayout>;
	outerNodes: LayoutNode[];
	outerEdges: LayoutEdge[];
	bridgeEdges: LayoutEdge[];
	sgIds: Set<string>;
} {
	const allInnerIds = collectAllSubgraphNodeIds(subgraphs);
	const innerLayouts = new Map<string, InnerLayout>();
	const sgIds = new Set(subgraphs.map((sg) => sg.id));

	const groupPad = 16;
	const labelHeight = 24;

	for (const sg of subgraphs) {
		const innerNodeIds = new Set(collectAllNodeIds(sg));
		const innerNodes = allNodes.filter((n) => innerNodeIds.has(n.id));
		const innerEdges = allEdges.filter(
			(e) => innerNodeIds.has(e.source) && innerNodeIds.has(e.target),
		);

		const innerResult = layoutFlatDiagram(innerNodes, innerEdges, options, direction);
		innerLayouts.set(sg.id, innerResult);
	}

	const outerNodes: LayoutNode[] = [];
	const outerEdges: LayoutEdge[] = [];
	const bridgeEdges: LayoutEdge[] = [];

	for (const node of allNodes) {
		if (allInnerIds.has(node.id)) continue;
		if (sgIds.has(node.id)) {
			const inner = innerLayouts.get(node.id)!;
			outerNodes.push({
				id: node.id,
				label: node.label,
				shape: node.shape,
				inlineStyle: {
					...node.inlineStyle,
					__megaNode: "true",
					__groupId: node.id,
					__innerWidth: String(inner.width + groupPad * 2),
					__innerHeight: String(inner.height + groupPad * 2 + labelHeight),
				},
			});
		} else {
			outerNodes.push(node);
		}
	}

	for (const sg of subgraphs) {
		const alreadyExists = allNodes.some((n) => n.id === sg.id);
		if (!alreadyExists) {
			const inner = innerLayouts.get(sg.id)!;
			outerNodes.push({
				id: sg.id,
				label: sg.label,
				shape: "rectangle",
				inlineStyle: {
					__megaNode: "true",
					__groupId: sg.id,
					__innerWidth: String(inner.width + groupPad * 2),
					__innerHeight: String(inner.height + groupPad * 2 + labelHeight),
				},
			});
		}
	}

	for (const edge of allEdges) {
		const sourceIsInner = allInnerIds.has(edge.source) && !sgIds.has(edge.source);
		const targetIsInner = allInnerIds.has(edge.target) && !sgIds.has(edge.target);
		const sourceOwner = sourceIsInner ? findOwningSubgraph(edge.source, subgraphs) : undefined;
		const targetOwner = targetIsInner ? findOwningSubgraph(edge.target, subgraphs) : undefined;

		if (sourceIsInner && targetIsInner) {
			if (sourceOwner === targetOwner) continue;
			outerEdges.push({
				...edge,
				source: sourceOwner!,
				target: targetOwner!,
			});
		} else if (sourceIsInner) {
			bridgeEdges.push(edge);
			outerEdges.push({ ...edge, source: sourceOwner! });
		} else if (targetIsInner) {
			bridgeEdges.push(edge);
			outerEdges.push({ ...edge, target: targetOwner! });
		} else {
			outerEdges.push(edge);
		}
	}

	return { innerLayouts, outerNodes, outerEdges, bridgeEdges, sgIds };
}

function findOwningSubgraph(nodeId: string, subgraphs: FlowchartSubgraph[]): string | undefined {
	for (const sg of subgraphs) {
		const allIds = collectAllNodeIds(sg);
		if (allIds.includes(nodeId)) return sg.id;
	}
	return undefined;
}

function layoutFlatDiagram(
	nodes: LayoutNode[],
	edges: LayoutEdge[],
	options: LayoutOptions,
	direction: string,
): InnerLayout {
	const dir = (direction ?? "TB") as "TD" | "TB" | "LR" | "BT" | "RL";

	const layoutNodes = nodes.map((node) => {
		if (node.inlineStyle?.__megaNode) {
			return {
				id: node.id,
				width: Number(node.inlineStyle.__innerWidth),
				height: Number(node.inlineStyle.__innerHeight),
			};
		}
		const size = estimateNodeSize(node.label, node.shape);
		return { id: node.id, width: size.width, height: size.height };
	});

	const layoutEdges = edges.map((edge) => ({
		source: edge.source,
		target: edge.target,
		weight: 1,
	}));

	const result = sugiyamaLayout(layoutNodes, layoutEdges, { ...options, direction: dir });

	const positionedNodes: PositionedNode[] = nodes.map((node) => {
		const pos = result.nodePositions.get(node.id) ?? { x: 0, y: 0 };
		let w: number;
		let h: number;
		if (node.inlineStyle?.__megaNode) {
			w = Number(node.inlineStyle.__innerWidth);
			h = Number(node.inlineStyle.__innerHeight);
		} else {
			const size = estimateNodeSize(node.label, node.shape);
			w = size.width;
			h = size.height;
		}
		return {
			id: node.id,
			label: node.label,
			shape: node.shape,
			x: pos.x - w / 2,
			y: pos.y - h / 2,
			width: w,
			height: h,
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
			dir,
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

	if (!Number.isFinite(minX)) {
		return { nodes: positionedNodes, edges: positionedEdges, width: 0, height: 0, groups: [] };
	}

	const shiftX = -minX;
	const shiftY = -minY;

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

	return {
		nodes: positionedNodes,
		edges: positionedEdges,
		width: maxX - minX,
		height: maxY - minY,
		groups: [],
	};
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

	if (!subgraphs || subgraphs.length === 0) {
		const flat = layoutFlatDiagram(nodes, edges, options, direction);
		const padding = options.padding ?? 20;
		for (const n of flat.nodes) {
			n.x += padding;
			n.y += padding;
		}
		for (const e of flat.edges) {
			for (const p of e.points) {
				p.x += padding;
				p.y += padding;
			}
			if (e.labelPosition) {
				e.labelPosition.x += padding;
				e.labelPosition.y += padding;
			}
		}
		return {
			width: flat.width + padding * 2,
			height: flat.height + padding * 2,
			nodes: flat.nodes,
			edges: flat.edges,
			groups: [],
		};
	}

	const { innerLayouts, outerNodes, outerEdges, sgIds } =
		layoutSubgraphsHierarchically(nodes, edges, subgraphs, options, direction);

	const outerFlat = layoutFlatDiagram(outerNodes, outerEdges, options, direction);

	const allPositionedNodes: PositionedNode[] = [];
	const allPositionedEdges: PositionedEdge[] = [];
	const allGroups: PositionedGroup[] = [];

	const groupPad = 16;
	const labelHeight = 24;

	for (const sg of subgraphs) {
		const megaNode = outerFlat.nodes.find((n) => n.id === sg.id);
		if (!megaNode) continue;

		const inner = innerLayouts.get(sg.id)!;

		const offsetX = megaNode.x + groupPad;
		const offsetY = megaNode.y + groupPad + labelHeight;

		for (const n of inner.nodes) {
			allPositionedNodes.push({
				...n,
				x: n.x + offsetX,
				y: n.y + offsetY,
			});
		}

		for (const e of inner.edges) {
			allPositionedEdges.push({
				...e,
				points: e.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })),
				labelPosition: e.labelPosition
					? { x: e.labelPosition.x + offsetX, y: e.labelPosition.y + offsetY }
					: undefined,
			});
		}

		allGroups.push({
			id: sg.id,
			label: sg.label,
			x: megaNode.x,
			y: megaNode.y,
			width: megaNode.width,
			height: megaNode.height,
			children: [],
		});
	}

	for (const n of outerFlat.nodes) {
		if (!n.inlineStyle?.__megaNode) {
			allPositionedNodes.push(n);
		}
	}

	const groupNodeMap = new Map(
		allGroups.map((g) => [
			g.id,
			{ x: g.x, y: g.y, width: g.width, height: g.height },
		]),
	);

	for (const e of outerFlat.edges) {
		const srcIsMega = sgIds.has(e.source);
		const tgtIsMega = sgIds.has(e.target);
		if (srcIsMega || tgtIsMega) continue;
		allPositionedEdges.push(e);
	}

	const nodeMap = new Map(allPositionedNodes.map((n) => [n.id, n]));

	const handledOuterEdges = new Set<string>();
	for (const e of outerFlat.edges) {
		const srcIsMega = sgIds.has(e.source);
		const tgtIsMega = sgIds.has(e.target);
		if (!srcIsMega && !tgtIsMega) continue;

		const realSource = e.source;
		const realTarget = e.target;

		const srcNode = nodeMap.get(realSource);
		const tgtNode = nodeMap.get(realTarget);
		const srcGroup = groupNodeMap.get(realSource);
		const tgtGroup = groupNodeMap.get(realTarget);

		const srcRect = srcNode
			? { x: srcNode.x + srcNode.width / 2, y: srcNode.y + srcNode.height / 2, width: srcNode.width, height: srcNode.height }
			: srcGroup
				? { x: srcGroup.x + srcGroup.width / 2, y: srcGroup.y + srcGroup.height / 2, width: srcGroup.width, height: srcGroup.height }
				: null;

		const tgtRect = tgtNode
			? { x: tgtNode.x + tgtNode.width / 2, y: tgtNode.y + tgtNode.height / 2, width: tgtNode.width, height: tgtNode.height }
			: tgtGroup
				? { x: tgtGroup.x + tgtGroup.width / 2, y: tgtGroup.y + tgtGroup.height / 2, width: tgtGroup.width, height: tgtGroup.height }
				: null;

		if (!srcRect || !tgtRect) continue;

		const edgeKey = `${realSource}->${realTarget}`;
		if (handledOuterEdges.has(edgeKey)) continue;
		handledOuterEdges.add(edgeKey);

		const points = routeEdge(
			srcRect,
			tgtRect,
			[{ x: srcRect.x, y: srcRect.y }, { x: tgtRect.x, y: tgtRect.y }],
			srcNode?.shape ?? "rectangle",
			tgtNode?.shape ?? "rectangle",
			direction,
		);

		allPositionedEdges.push({
			source: realSource,
			target: realTarget,
			label: e.label,
			style: e.style,
			hasArrowStart: e.hasArrowStart,
			hasArrowEnd: e.hasArrowEnd,
			points,
			labelPosition: e.label ? computeLabelPosition(points) : undefined,
			inlineStyle: e.inlineStyle,
		});
	}

	const padding = options.padding ?? 20;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const n of allPositionedNodes) {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	}
	for (const g of allGroups) {
		minX = Math.min(minX, g.x);
		minY = Math.min(minY, g.y);
		maxX = Math.max(maxX, g.x + g.width);
		maxY = Math.max(maxY, g.y + g.height);
	}
	for (const e of allPositionedEdges) {
		for (const p of e.points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
	}

	const shiftX = padding - minX;
	const shiftY = padding - minY;

	for (const n of allPositionedNodes) {
		n.x += shiftX;
		n.y += shiftY;
	}
	for (const g of allGroups) {
		g.x += shiftX;
		g.y += shiftY;
	}
	for (const e of allPositionedEdges) {
		for (const p of e.points) {
			p.x += shiftX;
			p.y += shiftY;
		}
		if (e.labelPosition) {
			e.labelPosition.x += shiftX;
			e.labelPosition.y += shiftY;
		}
	}

	return {
		width: maxX - minX + padding * 2,
		height: maxY - minY + padding * 2,
		nodes: allPositionedNodes,
		edges: allPositionedEdges,
		groups: allGroups,
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
		const isStateDiagram = nodes.some(
			(n) => n.shape === "state-start" || n.shape === "state-end",
		);
		const flowOptions = isStateDiagram
			? { ...mergedOptions, layerSpacing: 45, nodeSpacing: 30 }
			: mergedOptions;
		return layoutHierarchicalDiagram(nodes, edges, flowOptions, ast.direction, ast.subgraphs);
	}

	if (ast.type === "class") {
		const { nodes, edges } = convertClassToLayout(ast);
		return layoutHierarchicalDiagram(nodes, edges, mergedOptions, "TB");
	}

	if (ast.type === "er") {
		const { nodes, edges } = convertERToLayout(ast);
		return layoutHierarchicalDiagram(nodes, edges, mergedOptions, "TB");
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
