interface NodeInfo {
	id: string;
	element: SVGElement;
	connectedEdges: Set<SVGElement>;
}

function buildNodeMap(svg: SVGSVGElement): Map<string, NodeInfo> {
	const nodeMap = new Map<string, NodeInfo>();

	svg.querySelectorAll("[data-node-id]").forEach((element) => {
		const nodeId = element.getAttribute("data-node-id");
		if (nodeId) {
			nodeMap.set(nodeId, {
				id: nodeId,
				element: element as SVGElement,
				connectedEdges: new Set(),
			});
		}
	});

	svg.querySelectorAll("[data-edge-source]").forEach((element) => {
		const source = element.getAttribute("data-edge-source");
		const target = element.getAttribute("data-edge-target");

		if (source && target) {
			const edgeElement = element as SVGElement;
			nodeMap.get(source)?.connectedEdges.add(edgeElement);
			nodeMap.get(target)?.connectedEdges.add(edgeElement);
		}
	});

	return nodeMap;
}

function createTooltip(): HTMLDivElement {
	const tooltip = document.createElement("div");
	tooltip.style.position = "absolute";
	tooltip.style.padding = "8px 12px";
	tooltip.style.background = "rgba(0, 0, 0, 0.9)";
	tooltip.style.color = "white";
	tooltip.style.fontSize = "12px";
	tooltip.style.fontFamily = "Inter, system-ui, sans-serif";
	tooltip.style.borderRadius = "6px";
	tooltip.style.pointerEvents = "none";
	tooltip.style.zIndex = "10000";
	tooltip.style.opacity = "0";
	tooltip.style.transition = "opacity 0.2s ease";
	tooltip.style.maxWidth = "300px";
	tooltip.style.wordWrap = "break-word";
	tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3)";
	return tooltip;
}

function showTooltip(tooltip: HTMLDivElement, content: string, event: MouseEvent): void {
	tooltip.textContent = content;
	tooltip.style.left = `${event.pageX + 10}px`;
	tooltip.style.top = `${event.pageY + 10}px`;
	tooltip.style.opacity = "1";
}

function hideTooltip(tooltip: HTMLDivElement): void {
	tooltip.style.opacity = "0";
}

function highlightConnectedElements(nodeInfo: NodeInfo, allNodes: Map<string, NodeInfo>): void {
	const connectedNodeIds = new Set<string>();
	nodeInfo.connectedEdges.forEach((edge) => {
		const source = edge.getAttribute("data-edge-source");
		const target = edge.getAttribute("data-edge-target");
		if (source && source !== nodeInfo.id) connectedNodeIds.add(source);
		if (target && target !== nodeInfo.id) connectedNodeIds.add(target);
	});

	allNodes.forEach((node) => {
		if (node.id === nodeInfo.id) {
			node.element.style.opacity = "1";
		} else if (connectedNodeIds.has(node.id)) {
			node.element.style.opacity = "1";
		} else {
			node.element.style.opacity = "0.3";
		}
	});

	nodeInfo.connectedEdges.forEach((edge) => {
		edge.style.opacity = "1";
		edge.style.strokeWidth = "2.5";
	});
}

function resetHighlight(allNodes: Map<string, NodeInfo>, svg: SVGSVGElement): void {
	allNodes.forEach((node) => {
		node.element.style.opacity = "1";
	});

	svg.querySelectorAll("[data-edge-source]").forEach((edge) => {
		const element = edge as SVGElement;
		element.style.opacity = "1";
		element.style.strokeWidth = "";
	});
}

export function enableHover(svg: SVGSVGElement): () => void {
	const nodeMap = buildNodeMap(svg);
	const tooltip = createTooltip();
	document.body.appendChild(tooltip);

	let currentHoveredNode: string | null = null;

	function handleMouseEnter(event: Event): void {
		const target = event.currentTarget as SVGElement;
		const nodeId = target.getAttribute("data-node-id");
		if (!nodeId) return;

		currentHoveredNode = nodeId;
		const nodeInfo = nodeMap.get(nodeId);
		if (!nodeInfo) return;

		const label = target.getAttribute("aria-label") || nodeId;
		showTooltip(tooltip, label, event as MouseEvent);

		highlightConnectedElements(nodeInfo, nodeMap);
	}

	function handleMouseMove(event: Event): void {
		if (currentHoveredNode) {
			const mouseEvent = event as MouseEvent;
			tooltip.style.left = `${mouseEvent.pageX + 10}px`;
			tooltip.style.top = `${mouseEvent.pageY + 10}px`;
		}
	}

	function handleMouseLeave(): void {
		currentHoveredNode = null;
		hideTooltip(tooltip);
		resetHighlight(nodeMap, svg);
	}

	nodeMap.forEach((nodeInfo) => {
		nodeInfo.element.addEventListener("mouseenter", handleMouseEnter);
		nodeInfo.element.addEventListener("mousemove", handleMouseMove);
		nodeInfo.element.addEventListener("mouseleave", handleMouseLeave);
	});

	return () => {
		nodeMap.forEach((nodeInfo) => {
			nodeInfo.element.removeEventListener("mouseenter", handleMouseEnter);
			nodeInfo.element.removeEventListener("mousemove", handleMouseMove);
			nodeInfo.element.removeEventListener("mouseleave", handleMouseLeave);
		});

		tooltip.remove();
		resetHighlight(nodeMap, svg);
	};
}
