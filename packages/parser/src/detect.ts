import type { DiagramType } from "./types";

const DIAGRAM_PATTERNS: Array<[RegExp, DiagramType]> = [
	[/^\s*sequenceDiagram\s*$/i, "sequence"],
	[/^\s*classDiagram\s*$/i, "class"],
	[/^\s*erDiagram\s*$/i, "er"],
	[/^\s*stateDiagram-v2\s*$/i, "state"],
	[/^\s*(?:graph|flowchart)\s+(?:TD|TB|LR|BT|RL)\s*$/i, "flowchart"],
	[/^\s*pie\s+(?:title\s+.+)?$/i, "pie"],
	[/^\s*gantt\s*$/i, "gantt"],
	[/^\s*mindmap\s*$/i, "mindmap"],
];

export function detectDiagramType(source: string): DiagramType | null {
	const lines = source.split(/[\n;]/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		for (const [pattern, type] of DIAGRAM_PATTERNS) {
			if (pattern.test(trimmed)) {
				return type;
			}
		}

		break;
	}

	return null;
}
