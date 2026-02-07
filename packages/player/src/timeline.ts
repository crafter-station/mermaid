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
	sourceLine?: number;
}

function decomposeFlowchart(ast: FlowchartAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;
	const emittedNodes = new Set<string>();
	const emittedEdges = new Set<string>();

	const adjacency = new Map<string, { target: string; edgeIndex: number }[]>();
	const edgeList = ast.edges.map((e, i) => ({ source: e.source, target: e.target, label: e.label, idx: i }));

	for (const edge of edgeList) {
		if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
		adjacency.get(edge.source)!.push({ target: edge.target, edgeIndex: edge.idx });
	}

	const targetSet = new Set(ast.edges.map((e) => e.target));
	const roots: string[] = [];
	for (const [id] of ast.nodes) {
		if (!targetSet.has(id)) roots.push(id);
	}
	if (roots.length === 0 && ast.nodes.size > 0) {
		roots.push(ast.nodes.keys().next().value!);
	}

	function emitNode(id: string): void {
		if (emittedNodes.has(id)) return;
		emittedNodes.add(id);
		const node = ast.nodes.get(id);
		steps.push({
			type: "node",
			id,
			label: node?.label,
			index: index++,
			sourceLine: node?.span?.start?.line,
		});
	}

	const queue: string[] = [...roots];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const nodeId = queue.shift()!;
		if (visited.has(nodeId)) continue;
		visited.add(nodeId);

		emitNode(nodeId);

		const neighbors = adjacency.get(nodeId) || [];
		for (const { target, edgeIndex } of neighbors) {
			const edgeKey = `${nodeId}->${target}`;
			if (emittedEdges.has(edgeKey)) continue;
			emittedEdges.add(edgeKey);

			const edge = ast.edges[edgeIndex]!;
			steps.push({
				type: "edge",
				id: edgeKey,
				label: edge.label,
				index: index++,
				sourceLine: edge.span?.start?.line,
			});

			emitNode(target);

			if (!visited.has(target)) {
				queue.push(target);
			}
		}
	}

	for (const [id] of ast.nodes) {
		emitNode(id);
	}

	return steps;
}

function decomposeSequence(ast: SequenceAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;
	const emittedParticipants = new Set<string>();

	for (const participant of ast.participants) {
		emittedParticipants.add(participant.id);
		steps.push({
			type: "node",
			id: participant.id,
			label: participant.label,
			index: index++,
		});
	}

	for (const item of ast.messages) {
		if ("from" in item && "to" in item) {
			const msg = item as { from: string; to: string; label?: string };

			if (!emittedParticipants.has(msg.from)) {
				emittedParticipants.add(msg.from);
				steps.push({ type: "node", id: msg.from, label: msg.from, index: index++ });
			}
			if (!emittedParticipants.has(msg.to)) {
				emittedParticipants.add(msg.to);
				steps.push({ type: "node", id: msg.to, label: msg.to, index: index++ });
			}

			steps.push({
				type: "edge",
				id: `${msg.from}->${msg.to}`,
				label: msg.label,
				index: index++,
			});
		}
	}

	return steps;
}

function decomposeClass(ast: ClassAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;
	const emittedClasses = new Set<string>();

	function emitClass(id: string): void {
		if (emittedClasses.has(id)) return;
		emittedClasses.add(id);
		const cls = ast.classes.get(id);
		steps.push({
			type: "node",
			id,
			label: cls?.label || id,
			index: index++,
		});
	}

	for (const relation of ast.relations) {
		emitClass(relation.from);
		emitClass(relation.to);

		steps.push({
			type: "edge",
			id: `${relation.from}->${relation.to}`,
			label: relation.label,
			index: index++,
		});
	}

	for (const [id] of ast.classes) {
		emitClass(id);
	}

	return steps;
}

function decomposeER(ast: ERAST): StepInfo[] {
	const steps: StepInfo[] = [];
	let index = 0;
	const emittedEntities = new Set<string>();

	function emitEntity(id: string): void {
		if (emittedEntities.has(id)) return;
		emittedEntities.add(id);
		steps.push({
			type: "node",
			id,
			label: id,
			index: index++,
		});
	}

	for (const relation of ast.relations) {
		emitEntity(relation.from);
		emitEntity(relation.to);

		steps.push({
			type: "edge",
			id: `${relation.from}->${relation.to}`,
			label: relation.label,
			index: index++,
		});
	}

	for (const [id] of ast.entities) {
		emitEntity(id);
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
