import type {
	ParseDiagnostic,
	ParseResult,
	PieAST,
	PieSlice,
} from "../types";
import {
	createError,
	createSpan,
	createSpanForLine,
	createWarning,
} from "../errors";

interface ParserState {
	title?: string;
	showData: boolean;
	slices: PieSlice[];
	diagnostics: ParseDiagnostic[];
}

export function parsePie(source: string): ParseResult<PieAST> {
	const state: ParserState = {
		slices: [],
		showData: false,
		diagnostics: [],
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^pie\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);

		if (/^pie\s+showData\s*$/i.test(trimmed)) {
			state.showData = true;
			continue;
		}

		if (/^title\s+(.+)$/i.test(trimmed)) {
			const match = trimmed.match(/^title\s+(.+)$/i);
			if (match) {
				state.title = match[1].trim();
			}
			continue;
		}

		const sliceMatch = trimmed.match(/^"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)$/);
		if (sliceMatch) {
			const [, label, valueStr] = sliceMatch;
			const value = Number.parseFloat(valueStr);

			if (Number.isNaN(value) || value < 0) {
				state.diagnostics.push(
					createError("Slice value must be a non-negative number", lineSpan),
				);
				continue;
			}

			state.slices.push({
				label,
				value,
				span: lineSpan,
			});
			continue;
		}

		state.diagnostics.push(
			createWarning(`Skipping unrecognized line: ${trimmed}`, lineSpan),
		);
	}

	const ast: PieAST = {
		type: "pie",
		title: state.title,
		showData: state.showData,
		slices: state.slices,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}
