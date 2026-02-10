import type {
	ERCardinality,
	ERAST,
	EREntity,
	ERRelation,
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
	entities: Map<string, EREntity>;
	relations: ERRelation[];
	diagnostics: ParseDiagnostic[];
	currentEntity: EREntity | null;
}

const CARDINALITY_MAP: Record<string, ERCardinality> = {
	"||": "one",
	"o|": "zero-one",
	"|o": "zero-one",
	"}|": "many",
	"|{": "many",
	"}o": "zero-many",
	"o{": "zero-many",
	"{o": "zero-many",
};

export function parseER(source: string): ParseResult<ERAST> {
	const state: ParserState = {
		entities: new Map(),
		relations: [],
		diagnostics: [],
		currentEntity: null,
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^erDiagram\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);

		if (/^(\w+)\s*\{/.test(trimmed)) {
			parseEntityStart(trimmed, lineSpan, state);
		} else if (trimmed === "}") {
			state.currentEntity = null;
		} else if (state.currentEntity) {
			parseAttribute(trimmed, lineSpan, state);
		} else if (
			/\|\||o\||\|o|}\|}o|o\{|\|{|{o/.test(trimmed) &&
			(trimmed.includes("--") || trimmed.includes(".."))
		) {
			parseRelation(trimmed, lineSpan, state);
		} else {
			state.diagnostics.push(
				createWarning(`Skipping unrecognized line: ${trimmed}`, lineSpan),
			);
		}
	}

	const ast: ERAST = {
		type: "er",
		entities: state.entities,
		relations: state.relations,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}

function parseEntityStart(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(/^(\w+)\s*\{/);
	if (!match) {
		state.diagnostics.push(
			createError("Invalid entity definition syntax", span),
		);
		return;
	}

	const id = match[1];
	const entity: EREntity = {
		id,
		attributes: [],
		span,
	};

	state.entities.set(id, entity);
	state.currentEntity = entity;
}

function parseAttribute(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	if (!state.currentEntity) {
		return;
	}

	const match = line.match(
		/^(\w+)\s+(\w+)(?:\s+(PK|FK|UK|PK,FK|FK,PK))?(?:\s+"([^"]+)")?$/,
	);
	if (!match) {
		state.diagnostics.push(
			createError("Invalid attribute syntax", span, [
				'Expected: type name [PK|FK|UK] ["comment"]',
			]),
		);
		return;
	}

	const [, type, name, keysStr, comment] = match;
	const keys = keysStr ? keysStr.split(",") : [];

	state.currentEntity.attributes.push({
		name,
		type,
		keys,
		comment,
		span,
	});
}

function parseRelation(line: string, span: SourceSpan, state: ParserState): void {
	const relationPattern =
		/^(\w+)\s+((?:\|\||o\||\|o|\}\||\}o|o\{|\|\{|\{o))(--|\.\.)(\|\||o\||\|o|\}\||\}o|o\{|\|\{|\{o)\s+(\w+)\s*:\s*(.+)$/;
	const match = line.match(relationPattern);

	if (!match) {
		state.diagnostics.push(
			createError("Invalid relation syntax", span, [
				"Expected: Entity1 ||--|| Entity2 : label",
			]),
		);
		return;
	}

	const [, from, fromCardStr, linkType, toCardStr, to, label] = match;

	const fromCardinality = CARDINALITY_MAP[fromCardStr];
	const toCardinality = CARDINALITY_MAP[toCardStr];
	const identifying = linkType === "--";

	if (!fromCardinality || !toCardinality) {
		state.diagnostics.push(
			createError("Invalid cardinality syntax", span, [
				"Expected: ||, o|, }|, |{, o{, or {o",
			]),
		);
		return;
	}

	ensureEntity(from, span, state);
	ensureEntity(to, span, state);

	state.relations.push({
		from,
		to,
		fromCardinality,
		toCardinality,
		label,
		identifying,
		span,
	});
}

function ensureEntity(id: string, span: SourceSpan, state: ParserState): void {
	if (!state.entities.has(id)) {
		state.entities.set(id, {
			id,
			attributes: [],
			span,
		});
	}
}
