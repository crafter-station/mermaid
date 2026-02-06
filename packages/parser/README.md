# @crafter/mermaid-parser

Zero-dependency Mermaid diagram parser that outputs an AST with source spans.

## Features

- **Zero dependencies** - Pure TypeScript implementation
- **Source spans** - Every AST node includes accurate line/column/offset information
- **Error recovery** - Parser continues on errors and collects diagnostics
- **Type-safe** - Full TypeScript support with strict mode
- **Synchronous** - All parsing is synchronous

## Supported Diagrams

- ✅ Flowchart (`graph`, `flowchart`)
- ✅ State Diagram (`stateDiagram-v2`)
- ✅ Sequence Diagram (`sequenceDiagram`)
- ✅ Class Diagram (`classDiagram`)
- ✅ ER Diagram (`erDiagram`)
- ⏳ Pie Chart (`pie`)
- ⏳ Gantt Chart (`gantt`)
- ⏳ Mindmap (`mindmap`)

## Installation

```bash
bun add @crafter/mermaid-parser
```

## Usage

```typescript
import { parse } from "@crafter/mermaid-parser";

const source = `
graph TD
	A[Start] --> B{Decision}
	B -->|Yes| C[Success]
	B -->|No| D[Failure]
`;

const result = parse(source);

if (result.ast) {
	console.log("Nodes:", result.ast.nodes);
	console.log("Edges:", result.ast.edges);
}

for (const diagnostic of result.diagnostics) {
	console.log(`${diagnostic.severity}: ${diagnostic.message}`);
}
```

## API

### `parse(source: string): ParseResult<DiagramAST>`

Parses Mermaid source code and returns an AST with diagnostics.

```typescript
interface ParseResult<T> {
	ast: T | null;
	diagnostics: ParseDiagnostic[];
}
```

### `detectDiagramType(source: string): DiagramType | null`

Detects the diagram type from the source code.

```typescript
type DiagramType = "flowchart" | "sequence" | "class" | "er" | "state" | "pie" | "gantt" | "mindmap";
```

## AST Types

### Flowchart

```typescript
interface FlowchartAST {
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

interface FlowchartNode {
	id: string;
	label: string;
	shape: NodeShape;
	span: SourceSpan;
}

interface FlowchartEdge {
	source: string;
	target: string;
	label?: string;
	style: EdgeStyle;
	hasArrowStart: boolean;
	hasArrowEnd: boolean;
	span: SourceSpan;
}
```

### Sequence Diagram

```typescript
interface SequenceAST {
	type: "sequence";
	participants: SequenceParticipant[];
	messages: Array<SequenceMessage | SequenceBlock | SequenceNote>;
	span: SourceSpan;
}
```

### Class Diagram

```typescript
interface ClassAST {
	type: "class";
	classes: Map<string, ClassDefinition>;
	relations: ClassRelation[];
	namespaces: ClassNamespace[];
	span: SourceSpan;
}
```

### ER Diagram

```typescript
interface ERAST {
	type: "er";
	entities: Map<string, EREntity>;
	relations: ERRelation[];
	span: SourceSpan;
}
```

## Source Spans

Every AST node includes a `SourceSpan` with accurate position information:

```typescript
interface SourceSpan {
	start: { line: number; column: number; offset: number };
	end: { line: number; column: number; offset: number };
}
```

This enables:
- Syntax highlighting
- Error reporting
- Code navigation
- Refactoring tools

## Error Recovery

The parser continues parsing even when it encounters errors:

```typescript
const source = `graph TD
	A --> B
	invalid line here
	B --> C
`;

const result = parse(source);
// result.ast contains valid nodes A, B, C
// result.diagnostics contains warning about invalid line
```

## Examples

### Flowchart with Subgraphs

```typescript
const source = `
graph TD
	A[Start] --> B[Process]

	subgraph Processing
		B --> C[Step 1]
		C --> D[Step 2]
	end

	D --> E[End]

	classDef highlight fill:#f9f
	class C highlight
`;

const result = parse(source);
console.log(result.ast?.subgraphs);
```

### Sequence Diagram with Blocks

```typescript
const source = `
sequenceDiagram
	participant Alice
	actor Bob

	loop Every minute
		Alice->>Bob: Ping
		Bob-->>Alice: Pong
	end

	Note over Alice,Bob: Communication complete
`;

const result = parse(source);
console.log(result.ast?.messages);
```

### Class Diagram with Relations

```typescript
const source = `
classDiagram
	class Animal {
		+String name
		+makeSound()
	}

	class Dog {
		+bark()
	}

	Animal <|-- Dog
	Owner "1" --> "*" Dog : owns
`;

const result = parse(source);
console.log(result.ast?.relations);
```

### ER Diagram

```typescript
const source = `
erDiagram
	CUSTOMER ||--o{ ORDER : places
	ORDER ||--|{ LINE-ITEM : contains

	CUSTOMER {
		string name PK
		string email UK
	}

	ORDER {
		int id PK
		date created_at
	}
`;

const result = parse(source);
console.log(result.ast?.entities);
console.log(result.ast?.relations);
```

## License

MIT
