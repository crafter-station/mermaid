import type {
	ParseDiagnostic,
	ParseResult,
	SequenceAST,
	SequenceBlock,
	SequenceMessage,
	SequenceNote,
	SequenceParticipant,
} from "../types";
import {
	createError,
	createSpan,
	createSpanForLine,
	createWarning,
} from "../errors";

interface ParserState {
	participants: Map<string, SequenceParticipant>;
	messages: Array<SequenceMessage | SequenceBlock | SequenceNote>;
	diagnostics: ParseDiagnostic[];
	blockStack: Array<{
		block: SequenceBlock;
		currentSection: { label?: string; messages: SequenceMessage[] };
	}>;
}

const ARROW_PATTERNS = [
	{ pattern: /-->>/, type: "dashed" as const },
	{ pattern: /->>/, type: "solid" as const },
	{ pattern: /-\)/, type: "open" as const },
	{ pattern: /-x/, type: "cross" as const },
];

export function parseSequence(source: string): ParseResult<SequenceAST> {
	const state: ParserState = {
		participants: new Map(),
		messages: [],
		diagnostics: [],
		blockStack: [],
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^sequenceDiagram\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);

		if (trimmed.startsWith("participant") || trimmed.startsWith("actor")) {
			parseParticipant(trimmed, lineSpan, state);
		} else if (trimmed.startsWith("Note")) {
			parseNote(trimmed, lineSpan, state);
		} else if (
			trimmed.startsWith("loop") ||
			trimmed.startsWith("alt") ||
			trimmed.startsWith("opt") ||
			trimmed.startsWith("par") ||
			trimmed.startsWith("critical") ||
			trimmed.startsWith("break") ||
			trimmed.startsWith("rect")
		) {
			parseBlockStart(trimmed, lineSpan, state);
		} else if (trimmed === "end") {
			parseBlockEnd(lineSpan, state);
		} else if (trimmed.startsWith("else") || trimmed.startsWith("and")) {
			parseBlockSection(trimmed, lineSpan, state);
		} else if (trimmed.includes("-->>") || trimmed.includes("->>") || trimmed.includes("-x") || trimmed.includes("-)")) {
			parseMessage(trimmed, lineSpan, state);
		} else if (trimmed.startsWith("activate") || trimmed.startsWith("deactivate")) {
			parseActivation(trimmed, lineSpan, state);
		} else {
			state.diagnostics.push(
				createWarning(`Skipping unrecognized line: ${trimmed}`, lineSpan),
			);
		}
	}

	if (state.blockStack.length > 0) {
		state.diagnostics.push(
			createWarning(
				`Unclosed block: ${state.blockStack[state.blockStack.length - 1].block.type}`,
				createSpan(1, 1, 0, 0),
			),
		);
	}

	const ast: SequenceAST = {
		type: "sequence",
		participants: Array.from(state.participants.values()),
		messages: state.messages,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}

function parseParticipant(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?$/);
	if (!match) {
		state.diagnostics.push(
			createError("Invalid participant syntax", span, [
				"Expected: participant id as label",
			]),
		);
		return;
	}

	const [, type, id, label] = match;
	const participant: SequenceParticipant = {
		id,
		label: label || id,
		type: type as "participant" | "actor",
		span,
	};

	state.participants.set(id, participant);
}

function parseMessage(line: string, span: SourceSpan, state: ParserState): void {
	for (const { pattern, type } of ARROW_PATTERNS) {
		if (pattern.test(line)) {
			const parts = line.split(pattern);
			if (parts.length !== 2) {
				state.diagnostics.push(
					createError("Invalid message syntax", span, [
						"Expected: participant1 ->> participant2: message",
					]),
				);
				return;
			}

			let from = parts[0].trim();
			const rightPart = parts[1].trim();

			let to: string;
			let label: string;
			let activate = false;
			let deactivate = false;

			if (rightPart.includes(":")) {
				const [toRaw, ...labelParts] = rightPart.split(":");
				to = toRaw.trim();
				label = labelParts.join(":").trim();
			} else {
				to = rightPart;
				label = "";
			}

			if (from.endsWith("+")) {
				from = from.slice(0, -1).trim();
				activate = true;
			}
			if (from.endsWith("-")) {
				from = from.slice(0, -1).trim();
				deactivate = true;
			}

			ensureParticipant(from, span, state);
			ensureParticipant(to, span, state);

			const message: SequenceMessage = {
				from,
				to,
				label,
				arrowType: type,
				activate: activate || undefined,
				deactivate: deactivate || undefined,
				span,
			};

			if (state.blockStack.length > 0) {
				state.blockStack[state.blockStack.length - 1].currentSection.messages.push(
					message,
				);
			} else {
				state.messages.push(message);
			}

			return;
		}
	}

	state.diagnostics.push(
		createError("Invalid message arrow", span, [
			"Expected one of: ->>, -->>, -), -x",
		]),
	);
}

function parseNote(line: string, span: SourceSpan, state: ParserState): void {
	const leftMatch = line.match(/^Note\s+left\s+of\s+(\w+):\s*(.+)$/);
	if (leftMatch) {
		const [, participant, text] = leftMatch;
		ensureParticipant(participant, span, state);
		const note: SequenceNote = {
			placement: "left",
			participants: [participant],
			text,
			span,
		};
		addToCurrentScope(note, state);
		return;
	}

	const rightMatch = line.match(/^Note\s+right\s+of\s+(\w+):\s*(.+)$/);
	if (rightMatch) {
		const [, participant, text] = rightMatch;
		ensureParticipant(participant, span, state);
		const note: SequenceNote = {
			placement: "right",
			participants: [participant],
			text,
			span,
		};
		addToCurrentScope(note, state);
		return;
	}

	const overMatch = line.match(/^Note\s+over\s+([\w,\s]+):\s*(.+)$/);
	if (overMatch) {
		const [, participantsStr, text] = overMatch;
		const participants = participantsStr.split(",").map((p) => p.trim());
		for (const p of participants) {
			ensureParticipant(p, span, state);
		}
		const note: SequenceNote = {
			placement: "over",
			participants,
			text,
			span,
		};
		addToCurrentScope(note, state);
		return;
	}

	state.diagnostics.push(createError("Invalid note syntax", span));
}

function parseBlockStart(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(
		/^(loop|alt|opt|par|critical|break|rect)(?:\s+(.+))?$/,
	);
	if (!match) {
		state.diagnostics.push(createError("Invalid block syntax", span));
		return;
	}

	const [, type, label] = match;
	const block: SequenceBlock = {
		type: type as SequenceBlock["type"],
		label: label || "",
		sections: [],
		span,
	};

	const currentSection = { label: undefined, messages: [] };
	block.sections.push(currentSection);

	state.blockStack.push({ block, currentSection });
}

function parseBlockSection(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	if (state.blockStack.length === 0) {
		state.diagnostics.push(
			createError("Unexpected block section outside block", span),
		);
		return;
	}

	const match = line.match(/^(else|and)(?:\s+(.+))?$/);
	if (!match) {
		state.diagnostics.push(createError("Invalid block section syntax", span));
		return;
	}

	const [, , label] = match;
	const currentSection = { label, messages: [] };
	const context = state.blockStack[state.blockStack.length - 1];
	context.block.sections.push(currentSection);
	context.currentSection = currentSection;
}

function parseBlockEnd(span: SourceSpan, state: ParserState): void {
	if (state.blockStack.length === 0) {
		state.diagnostics.push(createError("Unexpected 'end' without block", span));
		return;
	}

	const { block } = state.blockStack.pop()!;

	if (state.blockStack.length > 0) {
		state.blockStack[state.blockStack.length - 1].currentSection.messages.push(
			block as any,
		);
	} else {
		state.messages.push(block);
	}
}

function parseActivation(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(/^(activate|deactivate)\s+(\w+)$/);
	if (!match) {
		state.diagnostics.push(createError("Invalid activation syntax", span));
		return;
	}

	const [, action, participant] = match;
	ensureParticipant(participant, span, state);

	state.diagnostics.push(
		createWarning(
			`Standalone ${action} not fully supported, use +/- on messages`,
			span,
		),
	);
}

function ensureParticipant(
	id: string,
	span: SourceSpan,
	state: ParserState,
): void {
	if (!state.participants.has(id)) {
		state.participants.set(id, {
			id,
			label: id,
			type: "participant",
			span,
		});
	}
}

function addToCurrentScope(
	item: SequenceNote,
	state: ParserState,
): void {
	if (state.blockStack.length > 0) {
		state.blockStack[state.blockStack.length - 1].currentSection.messages.push(
			item as any,
		);
	} else {
		state.messages.push(item);
	}
}
