import type {
	GanttAST,
	GanttTask,
	ParseDiagnostic,
	ParseResult,
} from "../types";
import {
	createError,
	createSpan,
	createSpanForLine,
	createWarning,
} from "../errors";

interface ParserState {
	title?: string;
	dateFormat?: string;
	sections: Map<string, GanttTask[]>;
	currentSection: string;
	diagnostics: ParseDiagnostic[];
}

export function parseGantt(source: string): ParseResult<GanttAST> {
	const state: ParserState = {
		sections: new Map(),
		currentSection: "",
		diagnostics: [],
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^gantt\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);

		if (/^title\s+(.+)$/i.test(trimmed)) {
			const match = trimmed.match(/^title\s+(.+)$/i);
			if (match) {
				state.title = match[1].trim();
			}
			continue;
		}

		if (/^dateFormat\s+(.+)$/i.test(trimmed)) {
			const match = trimmed.match(/^dateFormat\s+(.+)$/i);
			if (match) {
				state.dateFormat = match[1].trim();
			}
			continue;
		}

		if (/^section\s+(.+)$/i.test(trimmed)) {
			const match = trimmed.match(/^section\s+(.+)$/i);
			if (match) {
				state.currentSection = match[1].trim();
				if (!state.sections.has(state.currentSection)) {
					state.sections.set(state.currentSection, []);
				}
			}
			continue;
		}

		if (state.currentSection) {
			parseTask(trimmed, lineSpan, state);
		} else {
			state.diagnostics.push(
				createWarning(
					`Task defined before any section: ${trimmed}`,
					lineSpan,
				),
			);
		}
	}

	const sectionsArray = Array.from(state.sections.entries()).map(
		([name, tasks]) => ({
			name,
			tasks,
		}),
	);

	const ast: GanttAST = {
		type: "gantt",
		title: state.title,
		dateFormat: state.dateFormat,
		sections: sectionsArray,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}

function parseTask(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const taskPattern =
		/^(?:(done|active|crit|milestone)\s+)?([^:]+)\s*:\s*(?:(\w+),\s*)?(.+)$/;
	const match = line.match(taskPattern);

	if (!match) {
		state.diagnostics.push(
			createError("Invalid task syntax", span, [
				'Expected: [status] label : [id,] timing',
			]),
		);
		return;
	}

	const [, statusStr, label, id, timing] = match;
	const status = statusStr as GanttTask["status"] | undefined;

	const task: GanttTask = {
		label: label.trim(),
		status,
		id,
		section: state.currentSection,
		span,
	};

	const afterMatch = timing.match(/^after\s+(\w+)(?:,\s*(.+))?$/);
	if (afterMatch) {
		task.afterId = afterMatch[1];
		if (afterMatch[2]) {
			task.duration = afterMatch[2].trim();
		}
	} else {
		const timingParts = timing.split(",").map((p) => p.trim());
		if (timingParts.length === 2) {
			const [start, durationOrEnd] = timingParts;
			task.startDate = start;

			if (/^\d+d$/.test(durationOrEnd)) {
				task.duration = durationOrEnd;
			} else {
				task.endDate = durationOrEnd;
			}
		} else if (timingParts.length === 1) {
			task.startDate = timingParts[0];
		}
	}

	const tasks = state.sections.get(state.currentSection);
	if (tasks) {
		tasks.push(task);
	}
}
