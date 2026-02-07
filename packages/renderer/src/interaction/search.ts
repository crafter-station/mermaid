export interface SearchOptions {
	highlightColor?: string;
	dimOpacity?: number;
}

interface MatchedNode {
	element: SVGElement;
	nodeId: string;
	highlight: SVGRectElement;
}

function createSearchOverlay(): HTMLDivElement {
	const overlay = document.createElement("div");
	overlay.style.position = "absolute";
	overlay.style.top = "8px";
	overlay.style.left = "50%";
	overlay.style.transform = "translateX(-50%)";
	overlay.style.background = "rgba(0, 0, 0, 0.9)";
	overlay.style.border = "1px solid #3b82f6";
	overlay.style.borderRadius = "8px";
	overlay.style.padding = "8px 12px";
	overlay.style.display = "flex";
	overlay.style.alignItems = "center";
	overlay.style.gap = "8px";
	overlay.style.zIndex = "10000";
	return overlay;
}

function createSearchInput(): HTMLInputElement {
	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Search nodes...";
	input.style.background = "transparent";
	input.style.border = "none";
	input.style.color = "white";
	input.style.outline = "none";
	input.style.fontSize = "14px";
	input.style.fontFamily = "Inter, system-ui, sans-serif";
	input.style.width = "200px";
	return input;
}

function createResultsCounter(): HTMLSpanElement {
	const counter = document.createElement("span");
	counter.style.color = "rgba(255, 255, 255, 0.6)";
	counter.style.fontSize = "12px";
	counter.style.whiteSpace = "nowrap";
	return counter;
}

function createHighlightRect(element: SVGElement, color: string): SVGRectElement {
	const gfx = element as unknown as SVGGraphicsElement;
	const bbox = gfx.getBBox();
	const pad = 4;

	const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	rect.setAttribute("x", String(bbox.x - pad));
	rect.setAttribute("y", String(bbox.y - pad));
	rect.setAttribute("width", String(bbox.width + pad * 2));
	rect.setAttribute("height", String(bbox.height + pad * 2));
	rect.setAttribute("fill", "none");
	rect.setAttribute("stroke", color);
	rect.setAttribute("stroke-width", "3");
	rect.setAttribute("rx", "4");
	rect.setAttribute("pointer-events", "none");
	rect.classList.add("search-highlight");

	return rect;
}

function findMatchingNodes(svg: SVGSVGElement, query: string): Array<{ element: SVGElement; nodeId: string }> {
	const results: Array<{ element: SVGElement; nodeId: string }> = [];
	const lowerQuery = query.toLowerCase();

	svg.querySelectorAll("[data-node-id]").forEach((el) => {
		const element = el as SVGElement;
		const nodeId = element.getAttribute("data-node-id");
		if (!nodeId) return;

		const label = element.getAttribute("aria-label") || nodeId;
		if (label.toLowerCase().includes(lowerQuery)) {
			results.push({ element, nodeId });
		}
	});

	return results;
}

function dimNonMatching(
	svg: SVGSVGElement,
	matchedIds: Set<string>,
	dimOpacity: number,
): void {
	svg.querySelectorAll("[data-node-id]").forEach((el) => {
		const element = el as SVGElement;
		const nodeId = element.getAttribute("data-node-id");
		element.style.opacity = nodeId && matchedIds.has(nodeId) ? "1" : String(dimOpacity);
	});

	svg.querySelectorAll("[data-edge-source]").forEach((el) => {
		const element = el as SVGElement;
		const source = element.getAttribute("data-edge-source");
		const target = element.getAttribute("data-edge-target");
		const connected = (source && matchedIds.has(source)) || (target && matchedIds.has(target));
		element.style.opacity = connected ? "1" : String(dimOpacity);
	});
}

function resetAllOpacity(svg: SVGSVGElement): void {
	svg.querySelectorAll("[data-node-id]").forEach((el) => {
		(el as SVGElement).style.opacity = "1";
	});
	svg.querySelectorAll("[data-edge-source]").forEach((el) => {
		(el as SVGElement).style.opacity = "1";
	});
}

function removeAllHighlights(svg: SVGSVGElement): void {
	svg.querySelectorAll(".search-highlight").forEach((el) => el.remove());
}

export function enableSearch(svg: SVGSVGElement, options?: SearchOptions): () => void {
	const highlightColor = options?.highlightColor ?? "#3b82f6";
	const dimOpacity = options?.dimOpacity ?? 0.2;

	const parent = svg.parentElement;
	if (!parent) return () => {};

	const computed = getComputedStyle(parent);
	let didSetRelative = false;
	if (computed.position === "static") {
		parent.style.position = "relative";
		didSetRelative = true;
	}

	let overlay: HTMLDivElement | null = null;
	let input: HTMLInputElement | null = null;
	let counter: HTMLSpanElement | null = null;
	let matches: MatchedNode[] = [];
	let currentMatchIndex = -1;
	let isOpen = false;

	function updateCounter(): void {
		if (!counter) return;
		if (matches.length === 0 && input && input.value.length > 0) {
			counter.textContent = "No results";
		} else if (matches.length > 0) {
			counter.textContent = `${currentMatchIndex + 1} of ${matches.length}`;
		} else {
			counter.textContent = "";
		}
	}

	function clearMatches(): void {
		removeAllHighlights(svg);
		resetAllOpacity(svg);
		matches = [];
		currentMatchIndex = -1;
	}

	function applySearch(query: string): void {
		clearMatches();

		if (query.length === 0) {
			updateCounter();
			return;
		}

		const found = findMatchingNodes(svg, query);
		const matchedIds = new Set(found.map((m) => m.nodeId));

		matches = found.map(({ element, nodeId }) => {
			const highlight = createHighlightRect(element, highlightColor);
			element.appendChild(highlight);
			return { element, nodeId, highlight };
		});

		if (matches.length > 0) {
			currentMatchIndex = 0;
			dimNonMatching(svg, matchedIds, dimOpacity);
			matches[0]?.element.scrollIntoView({ behavior: "smooth", block: "center" });
		}

		updateCounter();
	}

	function advanceMatch(): void {
		if (matches.length === 0) return;

		currentMatchIndex = (currentMatchIndex + 1) % matches.length;
		const match = matches[currentMatchIndex];
		if (match) {
			match.element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
		updateCounter();
	}

	function openSearch(): void {
		if (isOpen) {
			input?.focus();
			return;
		}

		isOpen = true;
		overlay = createSearchOverlay();
		input = createSearchInput();
		counter = createResultsCounter();

		overlay.appendChild(input);
		overlay.appendChild(counter);
		parent?.appendChild(overlay);

		input.focus();

		input.addEventListener("input", () => {
			if (input) applySearch(input.value);
		});

		input.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				advanceMatch();
			}
			if (event.key === "Escape") {
				event.preventDefault();
				closeSearch();
			}
		});
	}

	function closeSearch(): void {
		if (!isOpen) return;

		isOpen = false;
		clearMatches();

		if (overlay) {
			overlay.remove();
			overlay = null;
		}
		input = null;
		counter = null;
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if ((event.metaKey || event.ctrlKey) && event.key === "f") {
			event.preventDefault();
			openSearch();
		}
	}

	svg.addEventListener("keydown", handleKeyDown);
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		svg.removeEventListener("keydown", handleKeyDown);
		document.removeEventListener("keydown", handleKeyDown);
		closeSearch();

		if (didSetRelative) {
			parent.style.position = "";
		}
	};
}
