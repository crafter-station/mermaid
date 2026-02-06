interface GraphNode<T = unknown> {
	id: string;
	data: T;
	width: number;
	height: number;
	parent?: string;
}

interface GraphEdge<T = unknown> {
	source: string;
	target: string;
	data: T;
	weight: number;
}

export class DirectedGraph<N = unknown, E = unknown> {
	private nodes = new Map<string, GraphNode<N>>();
	private edges = new Map<string, GraphEdge<E>>();
	private inEdges = new Map<string, Set<string>>();
	private outEdges = new Map<string, Set<string>>();
	private children = new Map<string, Set<string>>();

	addNode(id: string, data: N, width = 0, height = 0): void {
		this.nodes.set(id, { id, data, width, height });
		if (!this.inEdges.has(id)) this.inEdges.set(id, new Set());
		if (!this.outEdges.has(id)) this.outEdges.set(id, new Set());
	}

	removeNode(id: string): void {
		const inEdges = this.inEdges.get(id);
		if (inEdges) {
			for (const sourceId of inEdges) {
				this.removeEdge(sourceId, id);
			}
		}

		const outEdges = this.outEdges.get(id);
		if (outEdges) {
			for (const targetId of outEdges) {
				this.removeEdge(id, targetId);
			}
		}

		this.nodes.delete(id);
		this.inEdges.delete(id);
		this.outEdges.delete(id);

		const parent = this.nodes.get(id)?.parent;
		if (parent) {
			this.children.get(parent)?.delete(id);
		}
	}

	addEdge(source: string, target: string, data: E, weight = 1): void {
		const edgeKey = `${source}->${target}`;
		this.edges.set(edgeKey, { source, target, data, weight });

		if (!this.outEdges.has(source)) this.outEdges.set(source, new Set());
		if (!this.inEdges.has(target)) this.inEdges.set(target, new Set());

		this.outEdges.get(source)!.add(target);
		this.inEdges.get(target)!.add(source);
	}

	removeEdge(source: string, target: string): void {
		const edgeKey = `${source}->${target}`;
		this.edges.delete(edgeKey);
		this.outEdges.get(source)?.delete(target);
		this.inEdges.get(target)?.delete(source);
	}

	setParent(child: string, parent: string): void {
		const node = this.nodes.get(child);
		if (node) {
			node.parent = parent;
			if (!this.children.has(parent)) this.children.set(parent, new Set());
			this.children.get(parent)!.add(child);
		}
	}

	getNode(id: string): GraphNode<N> | undefined {
		return this.nodes.get(id);
	}

	getEdge(source: string, target: string): GraphEdge<E> | undefined {
		return this.edges.get(`${source}->${target}`);
	}

	predecessors(id: string): string[] {
		return Array.from(this.inEdges.get(id) || []);
	}

	successors(id: string): string[] {
		return Array.from(this.outEdges.get(id) || []);
	}

	sources(): string[] {
		const sources: string[] = [];
		for (const id of this.nodes.keys()) {
			if ((this.inEdges.get(id)?.size || 0) === 0) {
				sources.push(id);
			}
		}
		return sources;
	}

	sinks(): string[] {
		const sinks: string[] = [];
		for (const id of this.nodes.keys()) {
			if ((this.outEdges.get(id)?.size || 0) === 0) {
				sinks.push(id);
			}
		}
		return sinks;
	}

	nodeIds(): string[] {
		return Array.from(this.nodes.keys());
	}

	getEdges(): GraphEdge<E>[] {
		return Array.from(this.edges.values());
	}

	getChildren(parent: string): string[] {
		return Array.from(this.children.get(parent) || []);
	}

	reverseEdge(source: string, target: string): void {
		const edge = this.getEdge(source, target);
		if (!edge) return;

		this.removeEdge(source, target);
		this.addEdge(target, source, edge.data, edge.weight);
	}

	hasEdge(source: string, target: string): boolean {
		return this.edges.has(`${source}->${target}`);
	}

	nodeCount(): number {
		return this.nodes.size;
	}

	edgeCount(): number {
		return this.edges.size;
	}
}
