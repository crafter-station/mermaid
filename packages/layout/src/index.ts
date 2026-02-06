import type {
	DiagramAST,
	FlowchartAST,
	FlowchartSubgraph,
	SequenceAST,
	ClassAST,
	ERAST,
	PieAST,
	GanttAST,
	MindmapAST,
	MindmapNode,
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

function layoutPieDiagram(
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

function layoutGanttDiagram(
	ast: GanttAST,
	options: LayoutOptions,
): PositionedGraph {
	const padding = options.padding ?? 20;
	const barHeight = 28;
	const barSpacing = 6;
	const sectionHeaderHeight = 24;
	const labelWidth = 140;
	const dayWidth = 8;
	const titleHeight = ast.title ? 30 : 0;

	const allTasks = ast.sections.flatMap((s) => s.tasks);
	if (allTasks.length === 0) {
		return { width: padding * 2, height: padding * 2, nodes: [], edges: [], groups: [] };
	}

	let minDay = 0;
	let maxDay = 100;
	let taskIndex = 0;
	const taskEndDays = new Map<string, number>();

	for (const section of ast.sections) {
		for (const task of section.tasks) {
			let startDay = taskIndex * 15;
			let durationDays = 30;

			if (task.afterId && taskEndDays.has(task.afterId)) {
				startDay = taskEndDays.get(task.afterId)!;
			}
			if (task.duration) {
				const match = task.duration.match(/(\d+)d/);
				if (match?.[1]) durationDays = parseInt(match[1]);
			}

			const endDay = startDay + durationDays;
			if (task.id) taskEndDays.set(task.id, endDay);
			maxDay = Math.max(maxDay, endDay);
			taskIndex++;
		}
	}

	const timelineWidth = (maxDay - minDay) * dayWidth;
	const positionedNodes: PositionedNode[] = [];
	const groups: PositionedGroup[] = [];
	let currentY = padding + titleHeight;
	taskIndex = 0;

	if (ast.title) {
		positionedNodes.push({
			id: "gantt-title",
			label: ast.title,
			shape: "gantt-title",
			x: padding,
			y: padding,
			width: labelWidth + timelineWidth,
			height: 24,
		});
	}

	for (const section of ast.sections) {
		const sectionStartY = currentY;

		positionedNodes.push({
			id: `section-${section.name}`,
			label: section.name,
			shape: "gantt-section",
			x: padding,
			y: currentY,
			width: labelWidth + timelineWidth,
			height: sectionHeaderHeight,
		});
		currentY += sectionHeaderHeight + barSpacing;

		for (const task of section.tasks) {
			let startDay = taskIndex * 15;
			let durationDays = 30;

			if (task.afterId && taskEndDays.has(task.afterId)) {
				startDay = taskEndDays.get(task.afterId)!;
			} else if (task.startDate) {
				startDay = taskIndex * 15;
			}
			if (task.duration) {
				const match = task.duration.match(/(\d+)d/);
				if (match?.[1]) durationDays = parseInt(match[1]);
			}

			const barX = padding + labelWidth + (startDay - minDay) * dayWidth;
			const barW = durationDays * dayWidth;

			positionedNodes.push({
				id: task.id || `task-${taskIndex}`,
				label: task.label,
				shape: "gantt-bar",
				x: barX,
				y: currentY,
				width: barW,
				height: barHeight,
				inlineStyle: {
					status: task.status || "default",
					labelX: String(padding),
					labelWidth: String(labelWidth),
				},
			});

			currentY += barHeight + barSpacing;
			taskIndex++;
		}

		const sectionHeight = currentY - sectionStartY;
		groups.push({
			id: `group-${section.name}`,
			label: section.name,
			x: padding,
			y: sectionStartY,
			width: labelWidth + timelineWidth,
			height: sectionHeight,
			children: [],
		});
	}

	const width = padding + labelWidth + timelineWidth + padding;
	const height = currentY + padding;

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

function layoutMindmapDiagram(
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

export * from "./types";
