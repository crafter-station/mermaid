import { parse } from "./index";

const flowchartExample = `
graph TD
	A[Start] --> B{Decision}
	B -->|Yes| C[Do Something]
	B -->|No| D[Do Something Else]
	C --> E[End]
	D --> E

	subgraph Processing
		C
		D
	end

	classDef highlight fill:#f9f,stroke:#333
	class C highlight
	style A fill:#bbf
`;

const sequenceExample = `
sequenceDiagram
	participant Alice
	actor Bob

	Alice->>Bob: Hello Bob!
	Bob-->>Alice: Hi Alice!

	loop Every minute
		Alice->>Bob: Ping
		Bob-->>Alice: Pong
	end

	Note over Alice,Bob: End of conversation
`;

const classExample = `
classDiagram
	class Animal {
		+String name
		+int age
		+makeSound()
	}

	class Dog {
		+String breed
		+bark()
	}

	Animal <|-- Dog

	class Owner {
		+String name
	}

	Owner "1" --> "*" Dog : owns
`;

const erExample = `
erDiagram
	CUSTOMER ||--o{ ORDER : places
	ORDER ||--|{ LINE-ITEM : contains
	CUSTOMER }|..|{ DELIVERY-ADDRESS : uses

	CUSTOMER {
		string name PK
		string email UK
		string phone
	}

	ORDER {
		int id PK
		string status
		date created_at
	}
`;

console.log("Testing Flowchart Parser:");
const flowchartResult = parse(flowchartExample);
console.log("AST:", flowchartResult.ast);
console.log("Diagnostics:", flowchartResult.diagnostics);
console.log("\nNodes:", Array.from(flowchartResult.ast?.nodes.values() ?? []));
console.log("Edges:", flowchartResult.ast?.edges);
console.log("Subgraphs:", flowchartResult.ast?.subgraphs);

console.log("\n\nTesting Sequence Diagram Parser:");
const sequenceResult = parse(sequenceExample);
console.log("AST:", sequenceResult.ast);
console.log("Diagnostics:", sequenceResult.diagnostics);

console.log("\n\nTesting Class Diagram Parser:");
const classResult = parse(classExample);
console.log("AST:", classResult.ast);
console.log("Diagnostics:", classResult.diagnostics);

console.log("\n\nTesting ER Diagram Parser:");
const erResult = parse(erExample);
console.log("AST:", erResult.ast);
console.log("Diagnostics:", erResult.diagnostics);
