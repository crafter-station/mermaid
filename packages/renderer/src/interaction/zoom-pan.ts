export interface ZoomPanOptions {
	minZoom?: number;
	maxZoom?: number;
	zoomSpeed?: number;
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
	return { x: parts[0] ?? 0, y: parts[1] ?? 0, width: parts[2] ?? 0, height: parts[3] ?? 0 };
}

function setViewBox(svg: SVGSVGElement, viewBox: ViewBox): void {
	svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function getMousePositionInSVG(svg: SVGSVGElement, event: MouseEvent): { x: number; y: number } {
	const rect = svg.getBoundingClientRect();
	const viewBox = parseViewBox(svg);

	const scaleX = viewBox.width / rect.width;
	const scaleY = viewBox.height / rect.height;

	const x = (event.clientX - rect.left) * scaleX + viewBox.x;
	const y = (event.clientY - rect.top) * scaleY + viewBox.y;

	return { x, y };
}

function getTouchDistance(touch1: Touch, touch2: Touch): number {
	const dx = touch2.clientX - touch1.clientX;
	const dy = touch2.clientY - touch1.clientY;
	return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
	return {
		x: (touch1.clientX + touch2.clientX) / 2,
		y: (touch1.clientY + touch2.clientY) / 2,
	};
}

export function enableZoomPan(svg: SVGSVGElement, options?: ZoomPanOptions): () => void {
	const minZoom = options?.minZoom ?? 0.1;
	const maxZoom = options?.maxZoom ?? 5;
	const zoomSpeed = options?.zoomSpeed ?? 0.1;

	const initialViewBox = parseViewBox(svg);
	let isPanning = false;
	let startPoint = { x: 0, y: 0 };
	let startViewBox = { ...initialViewBox };

	let initialPinchDistance = 0;
	let initialPinchViewBox = { ...initialViewBox };

	function handleWheel(event: WheelEvent): void {
		event.preventDefault();

		const viewBox = parseViewBox(svg);
		const mousePos = getMousePositionInSVG(svg, event);

		const delta = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;

		const newWidth = viewBox.width * delta;
		const newHeight = viewBox.height * delta;

		const maxWidth = initialViewBox.width * maxZoom;
		const maxHeight = initialViewBox.height * maxZoom;
		const minWidth = initialViewBox.width * minZoom;
		const minHeight = initialViewBox.height * minZoom;

		if (newWidth > maxWidth || newWidth < minWidth || newHeight > maxHeight || newHeight < minHeight) {
			return;
		}

		const newX = mousePos.x - ((mousePos.x - viewBox.x) * newWidth) / viewBox.width;
		const newY = mousePos.y - ((mousePos.y - viewBox.y) * newHeight) / viewBox.height;

		setViewBox(svg, {
			x: newX,
			y: newY,
			width: newWidth,
			height: newHeight,
		});
	}

	function handleMouseDown(event: MouseEvent): void {
		if (event.button !== 0) return;

		isPanning = true;
		startPoint = getMousePositionInSVG(svg, event);
		startViewBox = parseViewBox(svg);

		svg.style.cursor = "grabbing";
	}

	function handleMouseMove(event: MouseEvent): void {
		if (!isPanning) return;

		const currentPoint = getMousePositionInSVG(svg, event);
		const dx = currentPoint.x - startPoint.x;
		const dy = currentPoint.y - startPoint.y;

		setViewBox(svg, {
			x: startViewBox.x - dx,
			y: startViewBox.y - dy,
			width: startViewBox.width,
			height: startViewBox.height,
		});
	}

	function handleMouseUp(): void {
		isPanning = false;
		svg.style.cursor = "grab";
	}

	function handleDoubleClick(): void {
		setViewBox(svg, initialViewBox);
	}

	function handleTouchStart(event: TouchEvent): void {
		if (event.touches.length === 2) {
			event.preventDefault();
			const t0 = event.touches[0]!;
			const t1 = event.touches[1]!;
			initialPinchDistance = getTouchDistance(t0, t1);
			initialPinchViewBox = parseViewBox(svg);
		} else if (event.touches.length === 1) {
			const touch = event.touches[0]!;
			startPoint = getMousePositionInSVG(svg, {
				clientX: touch.clientX,
				clientY: touch.clientY,
			} as MouseEvent);
			startViewBox = parseViewBox(svg);
			isPanning = true;
		}
	}

	function handleTouchMove(event: TouchEvent): void {
		if (event.touches.length === 2) {
			event.preventDefault();

			const t0 = event.touches[0]!;
			const t1 = event.touches[1]!;
			const currentDistance = getTouchDistance(t0, t1);
			const scale = initialPinchDistance / currentDistance;

			const newWidth = initialPinchViewBox.width * scale;
			const newHeight = initialPinchViewBox.height * scale;

			const maxWidth = initialViewBox.width * maxZoom;
			const maxHeight = initialViewBox.height * maxZoom;
			const minWidth = initialViewBox.width * minZoom;
			const minHeight = initialViewBox.height * minZoom;

			if (newWidth > maxWidth || newWidth < minWidth || newHeight > maxHeight || newHeight < minHeight) {
				return;
			}

			const center = getTouchCenter(t0, t1);
			const rect = svg.getBoundingClientRect();
			const viewBox = initialPinchViewBox;

			const scaleX = viewBox.width / rect.width;
			const scaleY = viewBox.height / rect.height;

			const centerX = (center.x - rect.left) * scaleX + viewBox.x;
			const centerY = (center.y - rect.top) * scaleY + viewBox.y;

			const newX = centerX - ((centerX - viewBox.x) * newWidth) / viewBox.width;
			const newY = centerY - ((centerY - viewBox.y) * newHeight) / viewBox.height;

			setViewBox(svg, {
				x: newX,
				y: newY,
				width: newWidth,
				height: newHeight,
			});
		} else if (event.touches.length === 1 && isPanning) {
			event.preventDefault();

			const touch = event.touches[0]!;
			const currentPoint = getMousePositionInSVG(svg, {
				clientX: touch.clientX,
				clientY: touch.clientY,
			} as MouseEvent);

			const dx = currentPoint.x - startPoint.x;
			const dy = currentPoint.y - startPoint.y;

			setViewBox(svg, {
				x: startViewBox.x - dx,
				y: startViewBox.y - dy,
				width: startViewBox.width,
				height: startViewBox.height,
			});
		}
	}

	function handleTouchEnd(): void {
		isPanning = false;
		initialPinchDistance = 0;
	}

	svg.style.cursor = "grab";

	svg.addEventListener("wheel", handleWheel, { passive: false });
	svg.addEventListener("mousedown", handleMouseDown);
	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("mouseup", handleMouseUp);
	svg.addEventListener("dblclick", handleDoubleClick);
	svg.addEventListener("touchstart", handleTouchStart, { passive: false });
	svg.addEventListener("touchmove", handleTouchMove, { passive: false });
	svg.addEventListener("touchend", handleTouchEnd);

	return () => {
		svg.style.cursor = "";
		svg.removeEventListener("wheel", handleWheel);
		svg.removeEventListener("mousedown", handleMouseDown);
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
		svg.removeEventListener("dblclick", handleDoubleClick);
		svg.removeEventListener("touchstart", handleTouchStart);
		svg.removeEventListener("touchmove", handleTouchMove);
		svg.removeEventListener("touchend", handleTouchEnd);
	};
}
