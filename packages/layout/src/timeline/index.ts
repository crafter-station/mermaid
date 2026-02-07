import type { GanttAST } from "@crafter/mermaid-parser";
import type {
	LayoutOptions,
	PositionedGraph,
	PositionedGroup,
	PositionedNode,
} from "../types";

export function layoutGanttDiagram(
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

	const minDay = 0;
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
