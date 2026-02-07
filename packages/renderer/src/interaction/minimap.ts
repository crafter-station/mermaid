export interface MinimapOptions {
	width?: number;
	height?: number;
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

interface ViewBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

function parseViewBox(svg: SVGSVGElement): ViewBox {
	const viewBox = svg.getAttribute("viewBox");
	if (!viewBox) {
		const width = Number.parseFloat(svg.getAttribute("width") || "0");
		const height = Number.parseFloat(svg.getAttribute("height") || "0");
		return { x: 0, y: 0, width, height };
	}

	const parts = viewBox.split(/\s+/).map(Number.parseFloat);
	return {
		x: parts[0] ?? 0,
		y: parts[1] ?? 0,
		width: parts[2] ?? 0,
		height: parts[3] ?? 0,
	};
}

function getFullExtent(svg: SVGSVGElement): ViewBox {
	const mainGroup = svg.querySelector("g");
	if (!mainGroup) return parseViewBox(svg);

	const bbox = (mainGroup as SVGGraphicsElement).getBBox();
	const pad = 20;
	return {
		x: bbox.x - pad,
		y: bbox.y - pad,
		width: bbox.width + pad * 2,
		height: bbox.height + pad * 2,
	};
}

function ensureRelativeParent(parent: HTMLElement): boolean {
	const computed = getComputedStyle(parent);
	if (computed.position === "static") {
		parent.style.position = "relative";
		return true;
	}
	return false;
}

function createMinimapContainer(
	width: number,
	height: number,
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
): HTMLDivElement {
	const container = document.createElement("div");
	container.style.position = "absolute";
	container.style.width = `${width}px`;
	container.style.height = `${height}px`;
	container.style.border = "1px solid rgba(255, 255, 255, 0.2)";
	container.style.borderRadius = "4px";
	container.style.overflow = "hidden";
	container.style.background = "rgba(0, 0, 0, 0.8)";
	container.style.zIndex = "9999";
	container.style.pointerEvents = "auto";

	const offset = "8px";

	switch (position) {
		case "top-left":
			container.style.top = offset;
			container.style.left = offset;
			break;
		case "top-right":
			container.style.top = offset;
			container.style.right = offset;
			break;
		case "bottom-left":
			container.style.bottom = offset;
			container.style.left = offset;
			break;
		case "bottom-right":
			container.style.bottom = offset;
			container.style.right = offset;
			break;
	}

	return container;
}

function createMinimapSVG(extent: ViewBox, width: number, height: number): SVGSVGElement {
	const miniSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	miniSvg.setAttribute("width", String(width));
	miniSvg.setAttribute("height", String(height));
	miniSvg.setAttribute("viewBox", `${extent.x} ${extent.y} ${extent.width} ${extent.height}`);
	miniSvg.style.display = "block";
	miniSvg.style.pointerEvents = "none";
	return miniSvg;
}

function cloneContentIntoMinimap(svg: SVGSVGElement, miniSvg: SVGSVGElement): void {
	const mainGroup = svg.querySelector("g");
	if (!mainGroup) return;

	const clone = mainGroup.cloneNode(true) as SVGGElement;
	clone.style.pointerEvents = "none";
	miniSvg.appendChild(clone);
}

function createViewportRect(): SVGRectElement {
	const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	rect.setAttribute("fill", "rgba(59, 130, 246, 0.3)");
	rect.setAttribute("stroke", "#3b82f6");
	rect.setAttribute("stroke-width", "2");
	rect.style.pointerEvents = "none";
	return rect;
}

function updateViewportRect(rect: SVGRectElement, viewBox: ViewBox): void {
	rect.setAttribute("x", String(viewBox.x));
	rect.setAttribute("y", String(viewBox.y));
	rect.setAttribute("width", String(viewBox.width));
	rect.setAttribute("height", String(viewBox.height));
}

function minimapClickToViewBox(
	event: MouseEvent,
	container: HTMLDivElement,
	extent: ViewBox,
	currentViewBox: ViewBox,
	width: number,
	height: number,
): ViewBox {
	const rect = container.getBoundingClientRect();
	const relX = (event.clientX - rect.left) / width;
	const relY = (event.clientY - rect.top) / height;

	const clickX = extent.x + relX * extent.width;
	const clickY = extent.y + relY * extent.height;

	return {
		x: clickX - currentViewBox.width / 2,
		y: clickY - currentViewBox.height / 2,
		width: currentViewBox.width,
		height: currentViewBox.height,
	};
}

export function enableMinimap(svg: SVGSVGElement, options?: MinimapOptions): () => void {
	const width = options?.width ?? 150;
	const height = options?.height ?? 100;
	const position = options?.position ?? "bottom-right";

	const parent = svg.parentElement;
	if (!parent) return () => {};

	const didSetRelative = ensureRelativeParent(parent);
	const extent = getFullExtent(svg);
	const container = createMinimapContainer(width, height, position);
	const miniSvg = createMinimapSVG(extent, width, height);
	const viewportRect = createViewportRect();

	cloneContentIntoMinimap(svg, miniSvg);
	miniSvg.appendChild(viewportRect);
	container.appendChild(miniSvg);
	parent.appendChild(container);

	const syncViewport = (): void => {
		const currentViewBox = parseViewBox(svg);
		updateViewportRect(viewportRect, currentViewBox);
	};

	syncViewport();

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes" && mutation.attributeName === "viewBox") {
				syncViewport();
			}
		}
	});

	observer.observe(svg, { attributes: true, attributeFilter: ["viewBox"] });

	const handleClick = (event: MouseEvent): void => {
		const currentViewBox = parseViewBox(svg);
		const newViewBox = minimapClickToViewBox(event, container, extent, currentViewBox, width, height);
		svg.setAttribute(
			"viewBox",
			`${newViewBox.x} ${newViewBox.y} ${newViewBox.width} ${newViewBox.height}`,
		);
	};

	container.addEventListener("click", handleClick);
	container.style.cursor = "pointer";

	return () => {
		observer.disconnect();
		container.removeEventListener("click", handleClick);
		container.remove();
		if (didSetRelative) {
			parent.style.position = "";
		}
	};
}
