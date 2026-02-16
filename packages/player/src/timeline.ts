import type {
	DiagramAST,
	FlowchartAST,
	FlowchartSubgraph,
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

	const groupNodes = new Map<string, Set<string>>();
	function collectGroupNodes(subs: FlowchartSubgraph[]): void {
		for (const sg of subs) {
			const allNodes = new Set<string>();
			function collectAll(sub: FlowchartSubgraph) {
				for (const nodeId of sub.nodeIds) allNodes.add(nodeId);
				for (const child of sub.children) collectAll(child);
			}
			collectAll(sg);
			groupNodes.set(sg.id, allNodes);
			if (sg.children.length > 0) collectGroupNodes(sg.children);
		}
	}
	collectGroupNodes(ast.subgraphs);

	const adjacency = new Map<string, { target: string; edgeIndex: number }[]>();
	for (let i = 0; i < ast.edges.length; i++) {
		const e = ast.edges[i]!;
		if (!adjacency.has(e.source)) adjacency.set(e.source, []);
		adjacency.get(e.source)!.push({ target: e.target, edgeIndex: i });
	}

	const inDegree = new Map<string, number>();
	for (const [id] of ast.nodes) inDegree.set(id, 0);
	for (const e of ast.edges) inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);

	const layers: string[][] = [];
	const remaining = new Map(inDegree);
	const assigned = new Set<string>();
	while (assigned.size < ast.nodes.size) {
		const layer: string[] = [];
		for (const [id, deg] of remaining) {
			if (deg === 0 && !assigned.has(id)) layer.push(id);
		}
		if (layer.length === 0) {
			for (const [id] of ast.nodes) {
				if (!assigned.has(id)) layer.push(id);
			}
		}
		for (const id of layer) {
			assigned.add(id);
			remaining.delete(id);
			for (const { target } of adjacency.get(id) || []) {
				if (remaining.has(target)) remaining.set(target, remaining.get(target)! - 1);
			}
		}
		layers.push(layer);
	}

	const emittedEdges = new Set<string>();
	const emittedGroups = new Set<string>();
	const emittedNodes = new Set<string>();

	for (const layer of layers) {
		for (const nodeId of layer) {
			if (emittedNodes.has(nodeId)) continue;
			emittedNodes.add(nodeId);
			const node = ast.nodes.get(nodeId);
			steps.push({ type: "node", id: nodeId, label: node?.label, index: index++, sourceLine: node?.span?.start?.line });
		}
		for (const nodeId of layer) {
			for (const { target, edgeIndex } of adjacency.get(nodeId) || []) {
				const edgeKey = `${nodeId}->${target}`;
				if (emittedEdges.has(edgeKey)) continue;
				emittedEdges.add(edgeKey);
				const edge = ast.edges[edgeIndex]!;
				steps.push({ type: "edge", id: edgeKey, label: edge.label, index: index++, sourceLine: edge.span?.start?.line });
			}
		}
		for (const [groupId, members] of groupNodes) {
			if (emittedGroups.has(groupId)) continue;
			if ([...members].every((n) => emittedNodes.has(n))) {
				emittedGroups.add(groupId);
				steps.push({ type: "group", id: groupId, label: groupId, index: index++ });
			}
		}
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
