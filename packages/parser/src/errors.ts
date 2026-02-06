import type { ParseDiagnostic, SourceSpan } from "./types";

export function createError(
	message: string,
	span: SourceSpan,
	suggestions?: string[],
): ParseDiagnostic {
	return {
		severity: "error",
		message,
		span,
		suggestions,
	};
}

export function createWarning(
	message: string,
	span: SourceSpan,
	suggestions?: string[],
): ParseDiagnostic {
	return {
		severity: "warning",
		message,
		span,
		suggestions,
	};
}

export function createSpan(
	line: number,
	column: number,
	offset: number,
	length: number,
): SourceSpan {
	return {
		start: { line, column, offset },
		end: { line, column: column + length, offset: offset + length },
	};
}

export function createSpanFromMatch(
	match: RegExpMatchArray,
	input: string,
): SourceSpan {
	const offset = match.index ?? 0;
	const length = match[0].length;
	const lines = input.slice(0, offset).split("\n");
	const line = lines.length;
	const column = lines[lines.length - 1].length + 1;

	return createSpan(line, column, offset, length);
}

export function createSpanForLine(input: string, lineIndex: number): SourceSpan {
	const lines = input.split(/[\n;]/);
	let offset = 0;
	for (let i = 0; i < lineIndex && i < lines.length; i++) {
		offset += (lines[i]?.length ?? 0) + 1;
	}
	const length = lines[lineIndex]?.length ?? 0;
	return createSpan(lineIndex + 1, 1, offset, length);
}
