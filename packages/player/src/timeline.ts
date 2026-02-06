import type {
	DiagramAST,
	FlowchartAST,
	SequenceAST,
	ClassAST,
	ERAST,
} from "@crafter/mermaid-parser";

export interface StepInfo {
	type: "node" | "edge" | "group";
	id: string;
	label?: string;
	index: number;
}

function decomposeFlowchart(ast: FlowchartAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;

	for (const [id, node] of ast.nodes) {
		steps.push({
			type: "node",
			id,
			label: node.label,
			index: index++,
		});
	}

	for (const edge of ast.edges) {
		steps.push({
			type: "edge",
			id: `${edge.source}->${edge.target}`,
			label: edge.label,
			index: index++,
		});
	}

	return steps;
}

function decomposeSequence(ast: SequenceAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;

	for (const participant of ast.participants) {
		steps.push({
			type: "node",
			id: participant.id,
			label: participant.label,
			index: index++,
		});
	}

	for (const item of ast.messages) {
		if ("from" in item && "to" in item) {
			steps.push({
				type: "edge",
				id: `${item.from}->${item.to}`,
				label: item.label,
				index: index++,
			});
		}
	}

	return steps;
}

function decomposeClass(ast: ClassAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;

	for (const [id, cls] of ast.classes) {
		steps.push({
			type: "node",
			id,
			label: cls.label || id,
			index: index++,
		});
	}

	for (const relation of ast.relations) {
		steps.push({
			type: "edge",
			id: `${relation.from}->${relation.to}`,
			label: relation.label,
			index: index++,
		});
	}

	return steps;
}

function decomposeER(ast: ERAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;

	for (const [id] of ast.entities) {
		steps.push({
			type: "node",
			id,
			label: id,
			index: index++,
		});
	}

	for (const relation of ast.relations) {
		steps.push({
			type: "edge",
			id: `${relation.from}->${relation.to}`,
			label: relation.label,
			index: index++,
		});
	}

	return steps;
}

export function decompose(ast: DiagramAST): StepInfo[] {
	switch (ast.type) {
		case "flowchart":
			return decomposeFlowchart(ast);
		case "sequence":
			return decomposeSequence(ast);
		case "class":
			return decomposeClass(ast);
		case "er":
			return decomposeER(ast);
		default:
			throw new Error(`Unsupported diagram type: ${(ast as { type: string }).type}`);
	}
}
