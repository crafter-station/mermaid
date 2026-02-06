import type {
	ClassAST,
	ClassDefinition,
	ClassMember,
	ClassNamespace,
	ClassRelation,
	ClassRelationType,
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
	classes: Map<string, ClassDefinition>;
	relations: ClassRelation[];
	namespaces: ClassNamespace[];
	diagnostics: ParseDiagnostic[];
	currentClass: ClassDefinition | null;
	currentNamespace: ClassNamespace | null;
}

const RELATION_PATTERNS: Array<[RegExp, ClassRelationType]> = [
	[/<\|--/, "inheritance"],
	[/\*--/, "composition"],
	[/o--/, "aggregation"],
	[/-->/, "association"],
	[/\.\.>/, "dependency"],
	[/\.\.\|>/, "realization"],
];

export function parseClass(source: string): ParseResult<ClassAST> {
	const state: ParserState = {
		classes: new Map(),
		relations: [],
		namespaces: [],
		diagnostics: [],
		currentClass: null,
		currentNamespace: null,
	};

	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("%%")) {
			continue;
		}

		if (i === 0 && /^classDiagram\s*$/i.test(trimmed)) {
			continue;
		}

		const lineSpan = createSpanForLine(source, i);

		if (trimmed.startsWith("class ")) {
			parseClassDefinition(trimmed, lineSpan, state);
		} else if (trimmed === "{") {
			if (!state.currentClass) {
				state.diagnostics.push(
					createError("Unexpected '{' outside class definition", lineSpan),
				);
			}
		} else if (trimmed === "}") {
			state.currentClass = null;
		} else if (state.currentClass) {
			parseClassMember(trimmed, lineSpan, state);
		} else if (trimmed.startsWith("namespace")) {
			parseNamespaceStart(trimmed, lineSpan, state);
		} else if (
			RELATION_PATTERNS.some(([pattern]) => pattern.test(trimmed))
		) {
			parseRelation(trimmed, lineSpan, state);
		} else {
			const colonIdx = trimmed.indexOf(":");
			if (colonIdx > 0) {
				const className = trimmed.slice(0, colonIdx).trim();
				const memberStr = trimmed.slice(colonIdx + 1).trim();
				ensureClass(className, lineSpan, state);
				const classObj = state.classes.get(className)!;
				const member = parseMemberString(memberStr, lineSpan);
				if (member) {
					classObj.members.push(member);
				}
			} else {
				state.diagnostics.push(
					createWarning(`Skipping unrecognized line: ${trimmed}`, lineSpan),
				);
			}
		}
	}

	const ast: ClassAST = {
		type: "class",
		classes: state.classes,
		relations: state.relations,
		namespaces: state.namespaces,
		span: createSpan(1, 1, 0, source.length),
	};

	return {
		ast,
		diagnostics: state.diagnostics,
	};
}

function parseClassDefinition(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(
		/^class\s+(\w+)(?:\s+<<([^>]+)>>)?(?:\s+as\s+(.+?))?(?:\s*\{)?$/,
	);
	if (!match) {
		state.diagnostics.push(
			createError("Invalid class definition syntax", span),
		);
		return;
	}

	const [, id, annotation, label] = match;
	const classObj: ClassDefinition = {
		id,
		label,
		annotation,
		members: [],
		span,
	};

	state.classes.set(id, classObj);

	if (state.currentNamespace) {
		state.currentNamespace.classIds.push(id);
	}

	if (line.includes("{")) {
		state.currentClass = classObj;
	}
}

function parseClassMember(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const member = parseMemberString(line, span);
	if (member && state.currentClass) {
		state.currentClass.members.push(member);
	}
}

function parseMemberString(
	str: string,
	span: SourceSpan,
): ClassMember | null {
	const visibilityMatch = str.match(/^([+\-#~])?(.+)$/);
	if (!visibilityMatch) {
		return null;
	}

	const [, visibilityRaw, rest] = visibilityMatch;
	const visibility = (visibilityRaw || "") as ClassMember["visibility"];

	let cleanStr = rest.trim();
	const isStatic = cleanStr.includes("$");
	const isAbstract = cleanStr.includes("*");

	cleanStr = cleanStr.replace(/[$*]/g, "").trim();

	const methodMatch = cleanStr.match(/^(\w+)\(([^)]*)\)(?:\s*:\s*(.+))?$/);
	if (methodMatch) {
		const [, name, , returnType] = methodMatch;
		return {
			name,
			visibility,
			isStatic,
			isAbstract,
			returnType,
			isMethod: true,
			span,
		};
	}

	const typedAttrMatch = cleanStr.match(/^(\w+)\s+(\w+)$/);
	if (typedAttrMatch) {
		const [, type, name] = typedAttrMatch;
		return {
			name,
			type,
			visibility,
			isStatic,
			isAbstract,
			isMethod: false,
			span,
		};
	}

	const attributeMatch = cleanStr.match(/^(\w+)(?:\s*:\s*(.+))?$/);
	if (attributeMatch) {
		const [, name, type] = attributeMatch;
		return {
			name,
			type,
			visibility,
			isStatic,
			isAbstract,
			isMethod: false,
			span,
		};
	}

	return null;
}

function parseRelation(line: string, span: SourceSpan, state: ParserState): void {
	for (const [pattern, type] of RELATION_PATTERNS) {
		if (pattern.test(line)) {
			const parts = line.split(pattern);
			if (parts.length !== 2) {
				state.diagnostics.push(
					createError("Invalid relation syntax", span),
				);
				return;
			}

			let from = parts[0].trim();
			let to = parts[1].trim();
			let label: string | undefined;
			let fromCardinality: string | undefined;
			let toCardinality: string | undefined;

			const fromCardMatch = from.match(/^"([^"]+)"\s+(\w+)$/);
			if (fromCardMatch) {
				fromCardinality = fromCardMatch[1];
				from = fromCardMatch[2];
			}

			const toCardMatch = to.match(/^(\w+)\s+"([^"]+)"$/);
			if (toCardMatch) {
				to = toCardMatch[1];
				toCardinality = toCardMatch[2];
			}

			const labelMatch = to.match(/^(\w+)\s*:\s*(.+)$/);
			if (labelMatch) {
				to = labelMatch[1];
				label = labelMatch[2];
			}

			ensureClass(from, span, state);
			ensureClass(to, span, state);

			state.relations.push({
				from,
				to,
				type,
				label,
				fromCardinality,
				toCardinality,
				span,
			});

			return;
		}
	}
}

function parseNamespaceStart(
	line: string,
	span: SourceSpan,
	state: ParserState,
): void {
	const match = line.match(/^namespace\s+(\w+)(?:\s+as\s+(.+?))?(?:\s*\{)?$/);
	if (!match) {
		state.diagnostics.push(
			createError("Invalid namespace syntax", span),
		);
		return;
	}

	const [, id, label] = match;
	const namespace: ClassNamespace = {
		id,
		label: label || id,
		classIds: [],
		span,
	};

	state.namespaces.push(namespace);

	if (line.includes("{")) {
		state.currentNamespace = namespace;
	}
}

function ensureClass(
	id: string,
	span: SourceSpan,
	state: ParserState,
): void {
	if (!state.classes.has(id)) {
		state.classes.set(id, {
			id,
			members: [],
			span,
		});
	}
}
