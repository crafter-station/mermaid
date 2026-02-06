export interface SourceSpan {
	start: { line: number; column: number; offset: number };
	end: { line: number; column: number; offset: number };
}

export type Direction = "TD" | "TB" | "LR" | "BT" | "RL";

export type NodeShape =
	| "rectangle"
	| "rounded"
	| "diamond"
	| "stadium"
	| "circle"
	| "subroutine"
	| "doublecircle"
	| "hexagon"
	| "cylinder"
	| "asymmetric"
	| "trapezoid"
	| "trapezoid-alt"
	| "parallelogram"
	| "note"
	| "cloud"
	| "state-start"
	| "state-end";

export type EdgeStyle = "solid" | "dotted" | "thick";

export type DiagramType =
	| "flowchart"
	| "sequence"
	| "class"
	| "er"
	| "state"
	| "pie"
	| "gantt"
	| "mindmap";

export interface FlowchartNode {
	id: string;
	label: string;
	shape: NodeShape;
	span: SourceSpan;
}

export interface FlowchartEdge {
	source: string;
	target: string;
	label?: string;
	style: EdgeStyle;
	hasArrowStart: boolean;
	hasArrowEnd: boolean;
	span: SourceSpan;
}

export interface FlowchartSubgraph {
	id: string;
	label: string;
	nodeIds: string[];
	children: FlowchartSubgraph[];
	direction?: Direction;
	span: SourceSpan;
}

export interface FlowchartAST {
	type: "flowchart";
	direction: Direction;
	nodes: Map<string, FlowchartNode>;
	edges: FlowchartEdge[];
	subgraphs: FlowchartSubgraph[];
	classDefs: Map<string, Record<string, string>>;
	classAssignments: Map<string, string>;
	nodeStyles: Map<string, Record<string, string>>;
	span: SourceSpan;
}

export interface SequenceParticipant {
	id: string;
	label: string;
	type: "participant" | "actor";
	span: SourceSpan;
}

export interface SequenceMessage {
	from: string;
	to: string;
	label: string;
	arrowType: "solid" | "dashed" | "open" | "cross";
	activate?: boolean;
	deactivate?: boolean;
	span: SourceSpan;
}

export interface SequenceBlock {
	type: "loop" | "alt" | "opt" | "par" | "critical" | "break" | "rect";
	label: string;
	sections: Array<{ label?: string; messages: SequenceMessage[] }>;
	span: SourceSpan;
}

export interface SequenceNote {
	placement: "left" | "right" | "over";
	participants: string[];
	text: string;
	span: SourceSpan;
}

export interface SequenceAST {
	type: "sequence";
	participants: SequenceParticipant[];
	messages: Array<SequenceMessage | SequenceBlock | SequenceNote>;
	span: SourceSpan;
}

export interface ClassMember {
	name: string;
	type?: string;
	visibility: "+" | "-" | "#" | "~" | "";
	isStatic: boolean;
	isAbstract: boolean;
	returnType?: string;
	isMethod: boolean;
	span: SourceSpan;
}

export interface ClassDefinition {
	id: string;
	label?: string;
	annotation?: string;
	members: ClassMember[];
	span: SourceSpan;
}

export type ClassRelationType =
	| "inheritance"
	| "composition"
	| "aggregation"
	| "association"
	| "dependency"
	| "realization";

export interface ClassRelation {
	from: string;
	to: string;
	type: ClassRelationType;
	label?: string;
	fromCardinality?: string;
	toCardinality?: string;
	span: SourceSpan;
}

export interface ClassNamespace {
	id: string;
	label: string;
	classIds: string[];
	span: SourceSpan;
}

export interface ClassAST {
	type: "class";
	classes: Map<string, ClassDefinition>;
	relations: ClassRelation[];
	namespaces: ClassNamespace[];
	span: SourceSpan;
}

export interface EREntity {
	id: string;
	attributes: Array<{
		name: string;
		type: string;
		keys: string[];
		comment?: string;
		span: SourceSpan;
	}>;
	span: SourceSpan;
}

export type ERCardinality = "one" | "zero-one" | "many" | "zero-many";

export interface ERRelation {
	from: string;
	to: string;
	fromCardinality: ERCardinality;
	toCardinality: ERCardinality;
	label: string;
	identifying: boolean;
	span: SourceSpan;
}

export interface ERAST {
	type: "er";
	entities: Map<string, EREntity>;
	relations: ERRelation[];
	span: SourceSpan;
}

export type DiagramAST = FlowchartAST | SequenceAST | ClassAST | ERAST;

export interface ParseDiagnostic {
	severity: "error" | "warning";
	message: string;
	span: SourceSpan;
	suggestions?: string[];
}

export interface ParseResult<T> {
	ast: T | null;
	diagnostics: ParseDiagnostic[];
}
