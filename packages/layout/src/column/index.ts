import type { SequenceAST } from "@crafter/mermaid-parser";
import { computeLabelPosition } from "../edge-routing";
import type {
	LayoutOptions,
	Point,
	PositionedEdge,
	PositionedGraph,
	PositionedNode,
} from "../types";

export function layoutSequenceDiagram(
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
