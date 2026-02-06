interface GraphStructure {
	nodes: Map<string, { element: SVGElement; connections: Set<string> }>;
	edges: Array<{ source: string; target: string }>;
}

function buildGraphStructure(svg: SVGSVGElement): GraphStructure {
	const nodes = new Map<string, { element: SVGElement; connections: Set<string> }>();
	const edges: Array<{ source: string; target: string }> = [];

	svg.querySelectorAll("[data-node-id]").forEach((element) => {
		const nodeId = element.getAttribute("data-node-id");
		if (nodeId) {
			nodes.set(nodeId, { element: element as SVGElement, connections: new Set() });
		}
	});

	svg.querySelectorAll("[data-edge-source]").forEach((element) => {
		const source = element.getAttribute("data-edge-source");
		const target = element.getAttribute("data-edge-target");
		if (source && target) {
			edges.push({ source, target });
			nodes.get(source)?.connections.add(target);
			nodes.get(target)?.connections.add(source);
		}
	});

	return { nodes, edges };
}

function focusNode(node: SVGElement): void {
	node.setAttribute("tabindex", "0");
	node.focus();

	const existingRing = node.querySelector(".focus-ring");
	if (existingRing) return;

	const gfx = node as unknown as SVGGraphicsElement;
	const bbox = gfx.getBBox();
	const pad = 4;

	const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	ring.classList.add("focus-ring");
	ring.setAttribute("x", String(bbox.x - pad));
	ring.setAttribute("y", String(bbox.y - pad));
	ring.setAttribute("width", String(bbox.width + pad * 2));
	ring.setAttribute("height", String(bbox.height + pad * 2));
	ring.setAttribute("fill", "none");
	ring.setAttribute("stroke", "#3b82f6");
	ring.setAttribute("stroke-width", "2");
	ring.setAttribute("stroke-dasharray", "4 2");
	ring.setAttribute("rx", "4");
	ring.setAttribute("pointer-events", "none");

	node.insertBefore(ring, node.firstChild);
}

function unfocusNode(node: SVGElement): void {
	node.removeAttribute("tabindex");
	const ring = node.querySelector(".focus-ring");
	if (ring) {
		ring.remove();
	}
}

function selectNode(node: SVGElement): void {
	const event = new CustomEvent("nodeselect", {
		detail: { nodeId: node.getAttribute("data-node-id") },
		bubbles: true,
	});
	node.dispatchEvent(event);
}

function getConnectedNodes(
	currentId: string,
	direction: "up" | "down" | "left" | "right",
	graph: GraphStructure,
): string | null {
	const current = graph.nodes.get(currentId);
	if (!current) return null;

	const currentRect = current.element.getBoundingClientRect();
	const candidates: Array<{ id: string; distance: number }> = [];

	for (const connectedId of current.connections) {
		const connected = graph.nodes.get(connectedId);
		if (!connected) continue;

		const connectedRect = connected.element.getBoundingClientRect();

		let isValidDirection = false;
		let distance = 0;

		switch (direction) {
			case "up":
				isValidDirection = connectedRect.top < currentRect.top;
				distance = currentRect.top - connectedRect.top;
				break;
			case "down":
				isValidDirection = connectedRect.bottom > currentRect.bottom;
				distance = connectedRect.bottom - currentRect.bottom;
				break;
			case "left":
				isValidDirection = connectedRect.left < currentRect.left;
				distance = currentRect.left - connectedRect.left;
				break;
			case "right":
				isValidDirection = connectedRect.right > currentRect.right;
				distance = connectedRect.right - currentRect.right;
				break;
		}

		if (isValidDirection && distance > 0) {
			candidates.push({ id: connectedId, distance });
		}
	}

	if (candidates.length === 0) return null;

	candidates.sort((a, b) => a.distance - b.distance);
	return candidates[0]!.id;
}

export function enableKeyboard(svg: SVGSVGElement): () => void {
	const graph = buildGraphStructure(svg);
	let currentNodeId: string | null = null;

	const nodeArray = Array.from(graph.nodes.keys());
	if (nodeArray.length === 0) return () => {};

	const directionMap: Record<string, "up" | "down" | "left" | "right"> = {
		ArrowUp: "up",
		ArrowDown: "down",
		ArrowLeft: "left",
		ArrowRight: "right",
	};

	function handleKeyDown(event: KeyboardEvent): void {
		switch (event.key) {
			case "Tab": {
				event.preventDefault();

				if (currentNodeId) {
					const current = graph.nodes.get(currentNodeId);
					if (current) {
						unfocusNode(current.element);
					}
				}

				const currentIndex = currentNodeId ? nodeArray.indexOf(currentNodeId) : -1;
				const nextIndex = event.shiftKey
					? currentIndex <= 0
						? nodeArray.length - 1
						: currentIndex - 1
					: (currentIndex + 1) % nodeArray.length;

				currentNodeId = nodeArray[nextIndex] ?? null;
				if (currentNodeId) {
					const nextNode = graph.nodes.get(currentNodeId);
					if (nextNode) {
						focusNode(nextNode.element);
					}
				}
				break;
			}

			case "Enter": {
				if (currentNodeId) {
					const current = graph.nodes.get(currentNodeId);
					if (current) {
						selectNode(current.element);
					}
				}
				break;
			}

			case "Escape": {
				if (currentNodeId) {
					const current = graph.nodes.get(currentNodeId);
					if (current) {
						unfocusNode(current.element);
					}
					currentNodeId = null;
				}
				break;
			}

			case "ArrowUp":
			case "ArrowDown":
			case "ArrowLeft":
			case "ArrowRight": {
				event.preventDefault();

				if (!currentNodeId) {
					currentNodeId = nodeArray[0] ?? null;
					if (currentNodeId) {
						const firstNode = graph.nodes.get(currentNodeId);
						if (firstNode) {
							focusNode(firstNode.element);
						}
					}
					return;
				}

				const direction = directionMap[event.key];
				if (!direction) return;
				const nextNodeId = getConnectedNodes(currentNodeId, direction, graph);

				if (nextNodeId) {
					const current = graph.nodes.get(currentNodeId);
					if (current) {
						unfocusNode(current.element);
					}

					currentNodeId = nextNodeId;
					const nextNode = graph.nodes.get(currentNodeId);
					if (nextNode) {
						focusNode(nextNode.element);
					}
				}
				break;
			}
		}
	}

	svg.addEventListener("keydown", handleKeyDown);
	svg.setAttribute("tabindex", "0");

	return () => {
		svg.removeEventListener("keydown", handleKeyDown);
		svg.removeAttribute("tabindex");

		graph.nodes.forEach(({ element }) => {
			unfocusNode(element);
		});
	};
}
