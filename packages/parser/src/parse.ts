import { detectDiagramType } from "./detect";
import { parseClass } from "./diagrams/class";
import { parseER } from "./diagrams/er";
import { parseFlowchart } from "./diagrams/flowchart";
import { parseSequence } from "./diagrams/sequence";
import { createError, createSpan } from "./errors";
import type { DiagramAST, ParseResult } from "./types";

export function parse(source: string): ParseResult<DiagramAST> {
	const diagramType = detectDiagramType(source);

	if (!diagramType) {
		return {
			ast: null,
			diagnostics: [
				createError(
					"Unable to detect diagram type",
					createSpan(1, 1, 0, 0),
					[
						"Expected first line to be one of: graph/flowchart, sequenceDiagram, classDiagram, erDiagram, stateDiagram-v2",
					],
				),
			],
		};
	}

	switch (diagramType) {
		case "flowchart":
			return parseFlowchart(source, false);
		case "state":
			return parseFlowchart(source, true);
		case "sequence":
			return parseSequence(source);
		case "class":
			return parseClass(source);
		case "er":
			return parseER(source);
		case "pie":
		case "gantt":
		case "mindmap":
			return {
				ast: null,
				diagnostics: [
					createError(
						`${diagramType} diagrams not yet supported`,
						createSpan(1, 1, 0, 0),
					),
				],
			};
	}
}
