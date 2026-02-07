export interface EventCallbacks {
	onNodeClick?: (nodeId: string, event: MouseEvent) => void;
	onNodeHover?: (nodeId: string | null, event: MouseEvent) => void;
	onEdgeClick?: (source: string, target: string, event: MouseEvent) => void;
	onEdgeHover?: (source: string, target: string | null, event: MouseEvent) => void;
}

interface ListenerEntry {
	element: Element;
	type: string;
	handler: EventListener;
}

function collectNodeListeners(svg: SVGSVGElement, callbacks: EventCallbacks): ListenerEntry[] {
	const entries: ListenerEntry[] = [];
	const nodes = svg.querySelectorAll("[data-node-id]");

	nodes.forEach((element) => {
		const nodeId = element.getAttribute("data-node-id");
		if (!nodeId) return;

		(element as SVGElement).style.cursor = "pointer";

		if (callbacks.onNodeClick) {
			const handler = ((event: MouseEvent) => {
				callbacks.onNodeClick?.(nodeId, event);
			}) as EventListener;
			entries.push({ element, type: "click", handler });
		}

		if (callbacks.onNodeHover) {
			const enterHandler = ((event: MouseEvent) => {
				callbacks.onNodeHover?.(nodeId, event);
			}) as EventListener;
			entries.push({ element, type: "mouseenter", handler: enterHandler });

			const leaveHandler = ((event: MouseEvent) => {
				callbacks.onNodeHover?.(null, event);
			}) as EventListener;
			entries.push({ element, type: "mouseleave", handler: leaveHandler });
		}
	});

	return entries;
}

function collectEdgeListeners(svg: SVGSVGElement, callbacks: EventCallbacks): ListenerEntry[] {
	const entries: ListenerEntry[] = [];
	const edges = svg.querySelectorAll("[data-edge-source]");

	edges.forEach((element) => {
		const source = element.getAttribute("data-edge-source");
		const target = element.getAttribute("data-edge-target");
		if (!source || !target) return;

		(element as SVGElement).style.cursor = "pointer";

		if (callbacks.onEdgeClick) {
			const handler = ((event: MouseEvent) => {
				callbacks.onEdgeClick?.(source, target, event);
			}) as EventListener;
			entries.push({ element, type: "click", handler });
		}

		if (callbacks.onEdgeHover) {
			const enterHandler = ((event: MouseEvent) => {
				callbacks.onEdgeHover?.(source, target, event);
			}) as EventListener;
			entries.push({ element, type: "mouseenter", handler: enterHandler });

			const leaveHandler = ((event: MouseEvent) => {
				callbacks.onEdgeHover?.(source, null, event);
			}) as EventListener;
			entries.push({ element, type: "mouseleave", handler: leaveHandler });
		}
	});

	return entries;
}

export function enableEvents(svg: SVGSVGElement, callbacks: EventCallbacks): () => void {
	const nodeListeners = collectNodeListeners(svg, callbacks);
	const edgeListeners = collectEdgeListeners(svg, callbacks);
	const allListeners = [...nodeListeners, ...edgeListeners];

	for (const { element, type, handler } of allListeners) {
		element.addEventListener(type, handler);
	}

	return () => {
		for (const { element, type, handler } of allListeners) {
			element.removeEventListener(type, handler);
		}

		svg.querySelectorAll("[data-node-id]").forEach((el) => {
			(el as SVGElement).style.cursor = "";
		});

		svg.querySelectorAll("[data-edge-source]").forEach((el) => {
			(el as SVGElement).style.cursor = "";
		});
	};
}
