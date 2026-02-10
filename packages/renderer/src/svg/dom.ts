import type { PositionedGraph, PositionedGroup, PositionedNode, PositionedEdge } from "@crafter/mermaid-layout";
import { DEFAULTS, resolveColors } from "@crafter/mermaid-themes";
import type { RenderOptions, RenderContext } from "../types";

export interface DOMRenderOptions extends RenderOptions {
	container?: HTMLElement;
	interactive?: boolean;
	onNodeClick?: (nodeId: string, event: MouseEvent) => void;
	onNodeHover?: (nodeId: string | null, event: MouseEvent) => void;
	onEdgeClick?: (source: string, target: string, event: MouseEvent) => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function createElement(tag: string): SVGElement {
	return document.createElementNS(SVG_NS, tag);
}

function splitLabel(label: string): string[] {
	return label.split(/<br\s*\/?>|\n/);
}

function renderGroupBackground(group: PositionedGroup, _ctx: RenderContext): SVGElement {
	const rect = createElement("rect");
	rect.setAttribute("x", String(group.x));
	rect.setAttribute("y", String(group.y));
	rect.setAttribute("width", String(group.width));
	rect.setAttribute("height", String(group.height));
	rect.setAttribute("fill", "var(--_group-fill)");
	rect.setAttribute("stroke", "var(--_group-stroke)");
	rect.setAttribute("stroke-width", "1.5");
	rect.setAttribute("rx", "4");
	return rect;
}

function renderGroupLabel(group: PositionedGroup, ctx: RenderContext): SVGElement {
	const lines = splitLabel(group.label);
	const x = group.x + 8;
	const y = group.y + 8;
	const lineHeight = 14;

	const text = createElement("text");
	text.setAttribute("fill", "var(--_group-text)");
	text.setAttribute("font-family", ctx.font);
	text.setAttribute("font-size", "12");
	text.setAttribute("font-weight", "600");

	lines.forEach((line, i) => {
		const tspan = createElement("tspan");
		tspan.setAttribute("x", String(x));
		tspan.setAttribute("y", String(y + i * lineHeight));
		tspan.textContent = line;
		text.appendChild(tspan);
	});

	return text;
}

function renderGroups(groups: PositionedGroup[], ctx: RenderContext, container: SVGElement): void {
	groups.forEach((group) => {
		container.appendChild(renderGroupBackground(group, ctx));
		container.appendChild(renderGroupLabel(group, ctx));
		if (group.children.length > 0) {
			renderGroups(group.children, ctx, container);
		}
	});
}

function renderNodeShape(node: PositionedNode, _ctx: RenderContext): SVGElement {
	const x = node.x;
	const y = node.y;
	const w = node.width;
	const h = node.height;
	const cx = x + w / 2;
	const cy = y + h / 2;

	switch (node.shape) {
		case "rectangle": {
			const rect = createElement("rect");
			rect.setAttribute("x", String(x));
			rect.setAttribute("y", String(y));
			rect.setAttribute("width", String(w));
			rect.setAttribute("height", String(h));
			rect.setAttribute("fill", "var(--_node-fill)");
			rect.setAttribute("stroke", "var(--_node-stroke)");
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("rx", "0");
			return rect;
		}

		case "rounded": {
			const rect = createElement("rect");
			rect.setAttribute("x", String(x));
			rect.setAttribute("y", String(y));
			rect.setAttribute("width", String(w));
			rect.setAttribute("height", String(h));
			rect.setAttribute("fill", "var(--_node-fill)");
			rect.setAttribute("stroke", "var(--_node-stroke)");
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("rx", "8");
			return rect;
		}

		case "diamond": {
			const hw = w / 2;
			const hh = h / 2;
			const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "stadium": {
			const rx = Math.min(h / 2, w / 2);
			const rect = createElement("rect");
			rect.setAttribute("x", String(x));
			rect.setAttribute("y", String(y));
			rect.setAttribute("width", String(w));
			rect.setAttribute("height", String(h));
			rect.setAttribute("fill", "var(--_node-fill)");
			rect.setAttribute("stroke", "var(--_node-stroke)");
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("rx", String(rx));
			return rect;
		}

		case "circle": {
			const r = Math.min(w, h) / 2;
			const circle = createElement("circle");
			circle.setAttribute("cx", String(cx));
			circle.setAttribute("cy", String(cy));
			circle.setAttribute("r", String(r));
			circle.setAttribute("fill", "var(--_node-fill)");
			circle.setAttribute("stroke", "var(--_node-stroke)");
			circle.setAttribute("stroke-width", "1.5");
			return circle;
		}

		case "subroutine": {
			const g = createElement("g");
			const outer = createElement("rect");
			outer.setAttribute("x", String(x));
			outer.setAttribute("y", String(y));
			outer.setAttribute("width", String(w));
			outer.setAttribute("height", String(h));
			outer.setAttribute("fill", "var(--_node-fill)");
			outer.setAttribute("stroke", "var(--_node-stroke)");
			outer.setAttribute("stroke-width", "1.5");
			outer.setAttribute("rx", "0");

			const inset = 4;
			const inner = createElement("rect");
			inner.setAttribute("x", String(x + inset));
			inner.setAttribute("y", String(y + inset));
			inner.setAttribute("width", String(w - inset * 2));
			inner.setAttribute("height", String(h - inset * 2));
			inner.setAttribute("fill", "none");
			inner.setAttribute("stroke", "var(--_node-stroke)");
			inner.setAttribute("stroke-width", "1.5");
			inner.setAttribute("rx", "0");

			g.appendChild(outer);
			g.appendChild(inner);
			return g;
		}

		case "doublecircle": {
			const g = createElement("g");
			const r = Math.min(w, h) / 2;
			const innerR = r - 4;

			const outerCircle = createElement("circle");
			outerCircle.setAttribute("cx", String(cx));
			outerCircle.setAttribute("cy", String(cy));
			outerCircle.setAttribute("r", String(r));
			outerCircle.setAttribute("fill", "var(--_node-fill)");
			outerCircle.setAttribute("stroke", "var(--_node-stroke)");
			outerCircle.setAttribute("stroke-width", "1.5");

			const innerCircle = createElement("circle");
			innerCircle.setAttribute("cx", String(cx));
			innerCircle.setAttribute("cy", String(cy));
			innerCircle.setAttribute("r", String(innerR));
			innerCircle.setAttribute("fill", "none");
			innerCircle.setAttribute("stroke", "var(--_node-stroke)");
			innerCircle.setAttribute("stroke-width", "1.5");

			g.appendChild(outerCircle);
			g.appendChild(innerCircle);
			return g;
		}

		case "hexagon": {
			const hw = w / 2;
			const hh = h / 2;
			const offset = hw * 0.3;
			const points = `${cx - hw + offset},${cy - hh} ${cx + hw - offset},${cy - hh} ${cx + hw},${cy} ${cx + hw - offset},${cy + hh} ${cx - hw + offset},${cy + hh} ${cx - hw},${cy}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "cylinder": {
			const g = createElement("g");
			const topH = h * 0.1;

			const path = `M ${x} ${y + topH}
				Q ${x} ${y}, ${x + w / 2} ${y}
				T ${x + w} ${y + topH}
				L ${x + w} ${y + h - topH}
				Q ${x + w} ${y + h}, ${x + w / 2} ${y + h}
				T ${x} ${y + h - topH}
				Z`;

			const body = createElement("path");
			body.setAttribute("d", path);
			body.setAttribute("fill", "var(--_node-fill)");
			body.setAttribute("stroke", "var(--_node-stroke)");
			body.setAttribute("stroke-width", "1.5");

			const ellipse = createElement("ellipse");
			ellipse.setAttribute("cx", String(x + w / 2));
			ellipse.setAttribute("cy", String(y + topH));
			ellipse.setAttribute("rx", String(w / 2));
			ellipse.setAttribute("ry", String(topH));
			ellipse.setAttribute("fill", "var(--_node-fill)");
			ellipse.setAttribute("stroke", "var(--_node-stroke)");
			ellipse.setAttribute("stroke-width", "1.5");

			g.appendChild(body);
			g.appendChild(ellipse);
			return g;
		}

		case "asymmetric": {
			const offset = w * 0.15;
			const points = `${x},${y + h / 2} ${x + offset},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x},${y + h}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "trapezoid": {
			const offset = w * 0.15;
			const points = `${x + offset},${y} ${x + w - offset},${y} ${x + w},${y + h} ${x},${y + h}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "trapezoid-alt": {
			const offset = w * 0.15;
			const points = `${x},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x + offset},${y + h}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "parallelogram": {
			const offset = w * 0.15;
			const points = `${x + offset},${y} ${x + w},${y} ${x + w - offset},${y + h} ${x},${y + h}`;
			const polygon = createElement("polygon");
			polygon.setAttribute("points", points);
			polygon.setAttribute("fill", "var(--_node-fill)");
			polygon.setAttribute("stroke", "var(--_node-stroke)");
			polygon.setAttribute("stroke-width", "1.5");
			return polygon;
		}

		case "note": {
			const fold = Math.min(w, h) * 0.15;
			const pathData = `M ${x} ${y} L ${x + w - fold} ${y} L ${x + w} ${y + fold} L ${x + w} ${y + h} L ${x} ${y + h} Z M ${x + w - fold} ${y} L ${x + w - fold} ${y + fold} L ${x + w} ${y + fold}`;
			const path = createElement("path");
			path.setAttribute("d", pathData);
			path.setAttribute("fill", "var(--_node-fill)");
			path.setAttribute("stroke", "var(--_node-stroke)");
			path.setAttribute("stroke-width", "1.5");
			return path;
		}

		case "cloud": {
			const pathData = `M ${x + w * 0.25} ${y + h * 0.4}
				Q ${x} ${y + h * 0.4}, ${x} ${y + h * 0.6}
				Q ${x} ${y + h}, ${x + w * 0.2} ${y + h}
				Q ${x + w * 0.3} ${y + h}, ${x + w * 0.5} ${y + h * 0.95}
				Q ${x + w * 0.7} ${y + h}, ${x + w * 0.8} ${y + h}
				Q ${x + w} ${y + h}, ${x + w} ${y + h * 0.6}
				Q ${x + w} ${y + h * 0.4}, ${x + w * 0.75} ${y + h * 0.4}
				Q ${x + w * 0.8} ${y}, ${x + w * 0.5} ${y}
				Q ${x + w * 0.2} ${y}, ${x + w * 0.25} ${y + h * 0.4}
				Z`;
			const path = createElement("path");
			path.setAttribute("d", pathData);
			path.setAttribute("fill", "var(--_node-fill)");
			path.setAttribute("stroke", "var(--_node-stroke)");
			path.setAttribute("stroke-width", "1.5");
			return path;
		}

		case "state-start": {
			const r = Math.min(w, h) / 4;
			const circle = createElement("circle");
			circle.setAttribute("cx", String(cx));
			circle.setAttribute("cy", String(cy));
			circle.setAttribute("r", String(r));
			circle.setAttribute("fill", "var(--_text)");
			circle.setAttribute("stroke", "none");
			return circle;
		}

		case "er-entity": {
			const g = createElement("g");
			const outerRect = createElement("rect");
			outerRect.setAttribute("x", String(x));
			outerRect.setAttribute("y", String(y));
			outerRect.setAttribute("width", String(w));
			outerRect.setAttribute("height", String(h));
			outerRect.setAttribute("fill", "var(--_node-fill)");
			outerRect.setAttribute("stroke", "var(--_node-stroke)");
			outerRect.setAttribute("stroke-width", "1.5");
			outerRect.setAttribute("rx", "0");
			g.appendChild(outerRect);

			const erAttrCount = parseInt(node.inlineStyle?.attrCount || "0");
			if (erAttrCount > 0) {
				const erHeaderH = 14 * 1.2 + 16;
				const divider = createElement("line");
				divider.setAttribute("x1", String(x));
				divider.setAttribute("y1", String(y + erHeaderH));
				divider.setAttribute("x2", String(x + w));
				divider.setAttribute("y2", String(y + erHeaderH));
				divider.setAttribute("stroke", "var(--_node-stroke)");
				divider.setAttribute("stroke-width", "1");
				g.appendChild(divider);
			}

			return g;
		}

		case "class-box": {
			const g = createElement("g");
			const outerRect = createElement("rect");
			outerRect.setAttribute("x", String(x));
			outerRect.setAttribute("y", String(y));
			outerRect.setAttribute("width", String(w));
			outerRect.setAttribute("height", String(h));
			outerRect.setAttribute("fill", "var(--_node-fill)");
			outerRect.setAttribute("stroke", "var(--_node-stroke)");
			outerRect.setAttribute("stroke-width", "1.5");
			outerRect.setAttribute("rx", "0");
			g.appendChild(outerRect);

			const lineHeight = 16;
			const padding = 12;
			const attrCount = parseInt(node.inlineStyle?.attrCount || "0");
			const methodCount = parseInt(node.inlineStyle?.methodCount || "0");
			const nameHeight = lineHeight + padding;
			const attrHeight = attrCount > 0 ? attrCount * lineHeight + padding : 0;

			if (attrCount > 0 || methodCount > 0) {
				const line1 = createElement("line");
				line1.setAttribute("x1", String(x));
				line1.setAttribute("y1", String(y + nameHeight));
				line1.setAttribute("x2", String(x + w));
				line1.setAttribute("y2", String(y + nameHeight));
				line1.setAttribute("stroke", "var(--_node-stroke)");
				line1.setAttribute("stroke-width", "1");
				g.appendChild(line1);
			}

			if (methodCount > 0 && attrCount > 0) {
				const line2 = createElement("line");
				line2.setAttribute("x1", String(x));
				line2.setAttribute("y1", String(y + nameHeight + attrHeight));
				line2.setAttribute("x2", String(x + w));
				line2.setAttribute("y2", String(y + nameHeight + attrHeight));
				line2.setAttribute("stroke", "var(--_node-stroke)");
				line2.setAttribute("stroke-width", "1");
				g.appendChild(line2);
			}

			return g;
		}

		case "state-end": {
			const g = createElement("g");
			const r = Math.min(w, h) / 3;
			const innerR = r * 0.6;

			const outerCircle = createElement("circle");
			outerCircle.setAttribute("cx", String(cx));
			outerCircle.setAttribute("cy", String(cy));
			outerCircle.setAttribute("r", String(r));
			outerCircle.setAttribute("fill", "none");
			outerCircle.setAttribute("stroke", "var(--_text)");
			outerCircle.setAttribute("stroke-width", "2");

			const innerCircle = createElement("circle");
			innerCircle.setAttribute("cx", String(cx));
			innerCircle.setAttribute("cy", String(cy));
			innerCircle.setAttribute("r", String(innerR));
			innerCircle.setAttribute("fill", "var(--_text)");
			innerCircle.setAttribute("stroke", "none");

			g.appendChild(outerCircle);
			g.appendChild(innerCircle);
			return g;
		}

		default: {
			const rect = createElement("rect");
			rect.setAttribute("x", String(x));
			rect.setAttribute("y", String(y));
			rect.setAttribute("width", String(w));
			rect.setAttribute("height", String(h));
			rect.setAttribute("fill", "var(--_node-fill)");
			rect.setAttribute("stroke", "var(--_node-stroke)");
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("rx", "8");
			return rect;
		}
	}
}

function renderEREntityLabelDOM(node: PositionedNode, ctx: RenderContext): SVGElement {
	const g = createElement("g");
	const parts = splitLabel(node.label);
	const nx = node.x;
	const nw = node.width;
	const ncx = nx + nw / 2;
	const fontSize = 14;
	const attrFontSize = 12;
	const headerH = fontSize * 1.2 + 16;

	const entityName = parts[0] || "";
	const nameText = createElement("text");
	nameText.setAttribute("x", String(ncx));
	nameText.setAttribute("y", String(node.y + headerH / 2));
	nameText.setAttribute("text-anchor", "middle");
	nameText.setAttribute("dominant-baseline", "middle");
	nameText.setAttribute("fill", "var(--_text)");
	nameText.setAttribute("font-family", ctx.font);
	nameText.setAttribute("font-size", String(fontSize));
	nameText.setAttribute("font-weight", "600");
	nameText.textContent = entityName;
	g.appendChild(nameText);

	let idx = 1;
	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		const attrStartY = node.y + headerH + 8;
		const lineH = attrFontSize * 1.4;
		let attrIdx = 0;

		while (idx < parts.length && parts[idx] !== "---") {
			const attrLine = parts[idx] ?? "";
			const attrY = attrStartY + attrIdx * lineH + attrFontSize / 2;

			const keyMatch = attrLine.match(/^(PK|FK|UK|PK,FK|FK,PK)\s+/);
			if (keyMatch) {
				const keyStr = keyMatch[1]!;
				const rest = attrLine.slice(keyMatch[0].length);

				const keyText = createElement("text");
				keyText.setAttribute("x", String(nx + 8));
				keyText.setAttribute("y", String(attrY));
				keyText.setAttribute("dominant-baseline", "middle");
				keyText.setAttribute("fill", "var(--_node-stroke)");
				keyText.setAttribute("font-family", ctx.font);
				keyText.setAttribute("font-size", "10");
				keyText.setAttribute("font-weight", "600");
				keyText.textContent = keyStr;
				g.appendChild(keyText);

				const valText = createElement("text");
				valText.setAttribute("x", String(nx + 34));
				valText.setAttribute("y", String(attrY));
				valText.setAttribute("dominant-baseline", "middle");
				valText.setAttribute("fill", "var(--_text)");
				valText.setAttribute("font-family", ctx.font);
				valText.setAttribute("font-size", String(attrFontSize));
				valText.setAttribute("font-weight", "400");
				valText.textContent = rest;
				g.appendChild(valText);
			} else {
				const valText = createElement("text");
				valText.setAttribute("x", String(nx + 34));
				valText.setAttribute("y", String(attrY));
				valText.setAttribute("dominant-baseline", "middle");
				valText.setAttribute("fill", "var(--_text)");
				valText.setAttribute("font-family", ctx.font);
				valText.setAttribute("font-size", String(attrFontSize));
				valText.setAttribute("font-weight", "400");
				valText.textContent = attrLine;
				g.appendChild(valText);
			}

			attrIdx++;
			idx++;
		}
	}

	const erAttrCount = parseInt(node.inlineStyle?.attrCount || "0");
	if (erAttrCount === 0) {
		const noAttrText = createElement("text");
		noAttrText.setAttribute("x", String(ncx));
		noAttrText.setAttribute("y", String(node.y + headerH + 10));
		noAttrText.setAttribute("text-anchor", "middle");
		noAttrText.setAttribute("dominant-baseline", "middle");
		noAttrText.setAttribute("fill", "var(--_muted)");
		noAttrText.setAttribute("font-family", ctx.font);
		noAttrText.setAttribute("font-size", "11");
		noAttrText.setAttribute("font-style", "italic");
		noAttrText.textContent = "(no attributes)";
		g.appendChild(noAttrText);
	}

	return g;
}

function renderClassBoxLabelDOM(node: PositionedNode, ctx: RenderContext): SVGElement {
	const g = createElement("g");
	const parts = splitLabel(node.label);
	const lineHeight = 16;
	const padding = 12;
	const nx = node.x;
	const ncx = node.x + node.width / 2;
	let currentY = node.y;

	let idx = 0;
	const className = parts[idx] || "";
	currentY += padding / 2 + lineHeight / 2;

	const nameText = createElement("text");
	nameText.setAttribute("x", String(ncx));
	nameText.setAttribute("y", String(currentY));
	nameText.setAttribute("text-anchor", "middle");
	nameText.setAttribute("dominant-baseline", "middle");
	nameText.setAttribute("fill", "var(--_text)");
	nameText.setAttribute("font-family", ctx.font);
	nameText.setAttribute("font-size", "14");
	nameText.setAttribute("font-weight", "600");
	nameText.textContent = className;
	g.appendChild(nameText);
	idx++;

	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		currentY = node.y + lineHeight + padding;

		while (idx < parts.length && parts[idx] !== "---") {
			currentY += lineHeight * 0.8;
			const memberText = createElement("text");
			memberText.setAttribute("x", String(nx + padding));
			memberText.setAttribute("y", String(currentY));
			memberText.setAttribute("dominant-baseline", "middle");
			memberText.setAttribute("fill", "var(--_text)");
			memberText.setAttribute("font-family", ctx.font);
			memberText.setAttribute("font-size", "12");
			memberText.setAttribute("font-weight", "400");
			memberText.textContent = parts[idx] ?? "";
			g.appendChild(memberText);
			idx++;
		}
	}

	if (idx < parts.length && parts[idx] === "---") {
		idx++;
		const attrCount = parseInt(node.inlineStyle?.attrCount || "0");
		const attrHeight = attrCount > 0 ? attrCount * lineHeight + padding : 0;
		currentY = node.y + lineHeight + padding + attrHeight;

		while (idx < parts.length) {
			currentY += lineHeight * 0.8;
			const methodText = createElement("text");
			methodText.setAttribute("x", String(nx + padding));
			methodText.setAttribute("y", String(currentY));
			methodText.setAttribute("dominant-baseline", "middle");
			methodText.setAttribute("fill", "var(--_text)");
			methodText.setAttribute("font-family", ctx.font);
			methodText.setAttribute("font-size", "12");
			methodText.setAttribute("font-weight", "400");
			methodText.textContent = parts[idx] ?? "";
			g.appendChild(methodText);
			idx++;
		}
	}

	return g;
}

function renderNodeLabel(node: PositionedNode, ctx: RenderContext): SVGElement {
	if (node.shape === "state-start" || node.shape === "state-end") {
		return createElement("g");
	}

	if (node.shape === "class-box") {
		return renderClassBoxLabelDOM(node, ctx);
	}

	if (node.shape === "er-entity") {
		return renderEREntityLabelDOM(node, ctx);
	}

	const lines = splitLabel(node.label);
	const cx = node.x + node.width / 2;
	const cy = node.y + node.height / 2;
	const lineHeight = 16;
	const totalHeight = lines.length * lineHeight;
	const startY = cy - totalHeight / 2 + lineHeight / 2;

	const text = createElement("text");
	text.setAttribute("fill", "var(--_text)");
	text.setAttribute("font-family", ctx.font);
	text.setAttribute("font-size", "14");
	text.setAttribute("font-weight", "400");

	lines.forEach((line, i) => {
		const tspan = createElement("tspan");
		tspan.setAttribute("x", String(cx));
		tspan.setAttribute("y", String(startY + i * lineHeight));
		tspan.setAttribute("text-anchor", "middle");
		tspan.setAttribute("dominant-baseline", "middle");
		tspan.textContent = line;
		text.appendChild(tspan);
	});

	return text;
}

function renderNode(node: PositionedNode, ctx: RenderContext, options: DOMRenderOptions): SVGElement {
	const g = createElement("g");
	g.setAttribute("data-node-id", node.id);
	g.setAttribute("role", "img");
	g.setAttribute("aria-label", node.label);

	if (options.interactive) {
		g.style.cursor = "pointer";
		if (options.onNodeClick) {
			g.addEventListener("click", (e: Event) => {
				options.onNodeClick?.(node.id, e as MouseEvent);
			});
		}
		if (options.onNodeHover) {
			g.addEventListener("mouseenter", (e: Event) => {
				options.onNodeHover?.(node.id, e as MouseEvent);
			});
			g.addEventListener("mouseleave", (e: Event) => {
				options.onNodeHover?.(null, e as MouseEvent);
			});
		}
	}

	g.appendChild(renderNodeShape(node, ctx));
	g.appendChild(renderNodeLabel(node, ctx));

	return g;
}

function renderEdge(edge: PositionedEdge, _ctx: RenderContext, options: DOMRenderOptions): SVGElement {
	const g = createElement("g");
	g.setAttribute("data-edge-source", edge.source);
	g.setAttribute("data-edge-target", edge.target);

	if (edge.points.length < 2) return g;

	const pathData = edge.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

	const path = createElement("path");
	path.setAttribute("d", pathData);
	path.setAttribute("stroke", "var(--_line)");
	path.setAttribute("fill", "none");
	path.setAttribute("stroke-linejoin", "round");
	path.setAttribute("stroke-linecap", "round");

	if (edge.style === "dotted") {
		path.setAttribute("stroke-dasharray", "6 4");
		path.setAttribute("stroke-width", "1.5");
	} else if (edge.style === "thick") {
		path.setAttribute("stroke-width", "2.5");
	} else {
		path.setAttribute("stroke-width", "1.5");
	}

	const fromCard = edge.inlineStyle?.fromCardinality;
	const toCard = edge.inlineStyle?.toCardinality;
	const relationType = edge.inlineStyle?.relationType;
	const erMarkerMap: Record<string, { start: string; end: string }> = {
		one: { start: "er-one-start", end: "er-one" },
		many: { start: "er-many-start", end: "er-many" },
		"zero-one": { start: "er-zero-one-start", end: "er-zero-one" },
		"zero-many": { start: "er-zero-many-start", end: "er-zero-many" },
	};
	const classSourceMarkers: Record<string, string> = {
		inheritance: "cls-inheritance",
		realization: "cls-inheritance",
		composition: "cls-composition",
		aggregation: "cls-aggregation",
	};

	if (relationType && classSourceMarkers[relationType]) {
		path.setAttribute("marker-start", `url(#${classSourceMarkers[relationType]!})`);
	} else if (fromCard && erMarkerMap[fromCard]) {
		path.setAttribute("marker-start", `url(#${erMarkerMap[fromCard]!.start})`);
	} else if (edge.hasArrowStart) {
		path.setAttribute("marker-start", "url(#arrowhead-start)");
	}

	if (toCard && erMarkerMap[toCard]) {
		path.setAttribute("marker-end", `url(#${erMarkerMap[toCard]!.end})`);
	} else if (edge.hasArrowEnd) {
		path.setAttribute("marker-end", "url(#arrowhead)");
	}

	if (options.interactive && options.onEdgeClick) {
		path.style.cursor = "pointer";
		path.addEventListener("click", (e: Event) => {
			options.onEdgeClick?.(edge.source, edge.target, e as MouseEvent);
		});
	}

	g.appendChild(path);

	return g;
}

function renderEdgeLabel(edge: PositionedEdge, ctx: RenderContext): SVGElement {
	const g = createElement("g");

	if (!edge.label || !edge.labelPosition) return g;

	const { x, y } = edge.labelPosition;
	const lines = splitLabel(edge.label);
	const lineHeight = 14;
	const totalHeight = lines.length * lineHeight;
	const padding = 4;

	const bgWidth = Math.max(...lines.map((l) => l.length * 7)) + padding * 2;
	const bgHeight = totalHeight + padding * 2;
	const bgX = x - bgWidth / 2;
	const bgY = y - bgHeight / 2;

	const bg = createElement("rect");
	bg.setAttribute("x", String(bgX));
	bg.setAttribute("y", String(bgY));
	bg.setAttribute("width", String(bgWidth));
	bg.setAttribute("height", String(bgHeight));
	bg.setAttribute("fill", "var(--bg)");
	bg.setAttribute("stroke", "var(--_line)");
	bg.setAttribute("stroke-width", "0.75");
	bg.setAttribute("rx", "3");

	const text = createElement("text");
	text.setAttribute("fill", "var(--_text)");
	text.setAttribute("font-family", ctx.font);
	text.setAttribute("font-size", "11");
	text.setAttribute("font-weight", "500");

	const startY = y - totalHeight / 2 + lineHeight / 2;
	lines.forEach((line, i) => {
		const tspan = createElement("tspan");
		tspan.setAttribute("x", String(x));
		tspan.setAttribute("y", String(startY + i * lineHeight));
		tspan.setAttribute("text-anchor", "middle");
		tspan.setAttribute("dominant-baseline", "middle");
		tspan.textContent = line;
		text.appendChild(tspan);
	});

	g.appendChild(bg);
	g.appendChild(text);

	return g;
}

function renderMarkers(_ctx: RenderContext): SVGElement {
	const defs = createElement("defs");

	const arrowhead = createElement("marker");
	arrowhead.setAttribute("id", "arrowhead");
	arrowhead.setAttribute("markerWidth", "12");
	arrowhead.setAttribute("markerHeight", "8");
	arrowhead.setAttribute("refX", "11");
	arrowhead.setAttribute("refY", "4");
	arrowhead.setAttribute("orient", "auto");
	arrowhead.setAttribute("markerUnits", "userSpaceOnUse");

	const arrowPath = createElement("path");
	arrowPath.setAttribute("d", "M1,1 L11,4 L1,7 z");
	arrowPath.setAttribute("fill", "var(--_arrow)");
	arrowhead.appendChild(arrowPath);

	const arrowheadStart = createElement("marker");
	arrowheadStart.setAttribute("id", "arrowhead-start");
	arrowheadStart.setAttribute("markerWidth", "12");
	arrowheadStart.setAttribute("markerHeight", "8");
	arrowheadStart.setAttribute("refX", "1");
	arrowheadStart.setAttribute("refY", "4");
	arrowheadStart.setAttribute("orient", "auto");
	arrowheadStart.setAttribute("markerUnits", "userSpaceOnUse");

	const arrowStartPath = createElement("path");
	arrowStartPath.setAttribute("d", "M11,1 L1,4 L11,7 z");
	arrowStartPath.setAttribute("fill", "var(--_arrow)");
	arrowheadStart.appendChild(arrowStartPath);

	const arrowheadOpen = createElement("marker");
	arrowheadOpen.setAttribute("id", "arrowhead-open");
	arrowheadOpen.setAttribute("markerWidth", "12");
	arrowheadOpen.setAttribute("markerHeight", "8");
	arrowheadOpen.setAttribute("refX", "11");
	arrowheadOpen.setAttribute("refY", "4");
	arrowheadOpen.setAttribute("orient", "auto");
	arrowheadOpen.setAttribute("markerUnits", "userSpaceOnUse");

	const arrowOpenPath = createElement("path");
	arrowOpenPath.setAttribute("d", "M1,1 L11,4 L1,7");
	arrowOpenPath.setAttribute("fill", "none");
	arrowOpenPath.setAttribute("stroke", "var(--_arrow)");
	arrowOpenPath.setAttribute("stroke-width", "1.5");
	arrowOpenPath.setAttribute("stroke-linejoin", "round");
	arrowheadOpen.appendChild(arrowOpenPath);

	const arrowheadCross = createElement("marker");
	arrowheadCross.setAttribute("id", "arrowhead-cross");
	arrowheadCross.setAttribute("markerWidth", "12");
	arrowheadCross.setAttribute("markerHeight", "12");
	arrowheadCross.setAttribute("refX", "6");
	arrowheadCross.setAttribute("refY", "6");
	arrowheadCross.setAttribute("orient", "auto");
	arrowheadCross.setAttribute("markerUnits", "userSpaceOnUse");

	const arrowCrossPath = createElement("path");
	arrowCrossPath.setAttribute("d", "M3,3 L9,9 M9,3 L3,9");
	arrowCrossPath.setAttribute("stroke", "var(--_arrow)");
	arrowCrossPath.setAttribute("stroke-width", "1.5");
	arrowCrossPath.setAttribute("stroke-linecap", "round");
	arrowheadCross.appendChild(arrowCrossPath);

	defs.appendChild(arrowhead);
	defs.appendChild(arrowheadStart);
	defs.appendChild(arrowheadOpen);
	defs.appendChild(arrowheadCross);

	const erMarkerDefs: Array<{ id: string; w: number; h: number; refX: number; refY: number; content: string }> = [
		{ id: "er-one", w: 20, h: 16, refX: 18, refY: 8, content: '<line x1="18" y1="2" x2="18" y2="14" stroke="var(--_line)" stroke-width="1.5"/><line x1="14" y1="2" x2="14" y2="14" stroke="var(--_line)" stroke-width="1.5"/>' },
		{ id: "er-one-start", w: 20, h: 16, refX: 2, refY: 8, content: '<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/><line x1="6" y1="2" x2="6" y2="14" stroke="var(--_line)" stroke-width="1.5"/>' },
		{ id: "er-many", w: 20, h: 16, refX: 18, refY: 8, content: '<line x1="18" y1="2" x2="18" y2="14" stroke="var(--_line)" stroke-width="1.5"/><path d="M18,8 L6,2 M18,8 L6,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>' },
		{ id: "er-many-start", w: 20, h: 16, refX: 2, refY: 8, content: '<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/><path d="M2,8 L14,2 M2,8 L14,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/>' },
		{ id: "er-zero-one", w: 24, h: 16, refX: 22, refY: 8, content: '<line x1="22" y1="2" x2="22" y2="14" stroke="var(--_line)" stroke-width="1.5"/><circle cx="14" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>' },
		{ id: "er-zero-one-start", w: 24, h: 16, refX: 2, refY: 8, content: '<line x1="2" y1="2" x2="2" y2="14" stroke="var(--_line)" stroke-width="1.5"/><circle cx="10" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>' },
		{ id: "er-zero-many", w: 24, h: 16, refX: 22, refY: 8, content: '<path d="M22,8 L10,2 M22,8 L10,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/><circle cx="6" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>' },
		{ id: "er-zero-many-start", w: 24, h: 16, refX: 2, refY: 8, content: '<path d="M2,8 L14,2 M2,8 L14,14" stroke="var(--_line)" stroke-width="1.5" fill="none"/><circle cx="18" cy="8" r="4" fill="none" stroke="var(--_line)" stroke-width="1.5"/>' },
	];

	const allMarkerDefs: Array<{ id: string; w: number; h: number; refX: number; refY: number; content: string }> = [
		...erMarkerDefs,
		{ id: "cls-inheritance", w: 16, h: 14, refX: 1, refY: 7, content: '<path d="M15,1 L1,7 L15,13 z" fill="var(--_node-fill)" stroke="var(--_line)" stroke-width="1.5" stroke-linejoin="round"/>' },
		{ id: "cls-composition", w: 14, h: 14, refX: 1, refY: 7, content: '<path d="M1,7 L7,1 L13,7 L7,13 z" fill="var(--_line)" stroke="var(--_line)" stroke-width="1"/>' },
		{ id: "cls-aggregation", w: 14, h: 14, refX: 1, refY: 7, content: '<path d="M1,7 L7,1 L13,7 L7,13 z" fill="var(--_node-fill)" stroke="var(--_line)" stroke-width="1.5"/>' },
	];

	for (const def of allMarkerDefs) {
		const marker = createElement("marker");
		marker.setAttribute("id", def.id);
		marker.setAttribute("markerWidth", String(def.w));
		marker.setAttribute("markerHeight", String(def.h));
		marker.setAttribute("refX", String(def.refX));
		marker.setAttribute("refY", String(def.refY));
		marker.setAttribute("orient", "auto");
		marker.setAttribute("markerUnits", "userSpaceOnUse");
		marker.innerHTML = def.content;
		defs.appendChild(marker);
	}

	return defs;
}

export function renderToDOM(graph: PositionedGraph, options?: DOMRenderOptions): SVGSVGElement {
	if (typeof document === "undefined") {
		throw new Error("renderToDOM can only be used in browser environments");
	}

	const theme = options?.theme ?? DEFAULTS;
	const padding = options?.padding ?? 16;
	const transparent = options?.transparent ?? false;
	const debug = options?.debug ?? false;

	const colors = resolveColors(theme);
	const ctx: RenderContext = {
		colors,
		padding,
		transparent,
		debug,
		font: colors.font,
	};

	const width = graph.width + padding * 2;
	const height = graph.height + padding * 2;

	const bgFill = transparent ? "none" : colors.bg;

	const svg = createElement("svg") as SVGSVGElement;
	const svgId = `cm-${Math.random().toString(36).slice(2, 8)}`;
	svg.setAttribute("id", svgId);
	svg.setAttribute("xmlns", SVG_NS);
	svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
	svg.setAttribute("width", String(width));
	svg.setAttribute("height", String(height));

	const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap";
	const style = createElement("style");
	style.textContent = `
		@import url('${fontUrl}');
		#${svgId} {
			--bg: ${colors.bg};
			--fg: ${colors.fg};
			--_text: ${colors.text};
			--_line: ${colors.line};
			--_arrow: ${colors.arrow};
			--_node-fill: ${colors.nodeFill};
			--_node-stroke: ${colors.nodeStroke};
			--_muted: ${colors.muted};
			--_group-fill: ${colors.groupFill};
			--_group-stroke: ${colors.groupStroke};
			--_group-text: ${colors.groupText};
		}
	`;
	svg.appendChild(style);

	const background = createElement("rect");
	background.setAttribute("width", String(width));
	background.setAttribute("height", String(height));
	background.setAttribute("fill", bgFill);
	svg.appendChild(background);

	svg.appendChild(renderMarkers(ctx));

	const mainGroup = createElement("g");
	mainGroup.setAttribute("transform", `translate(${padding}, ${padding})`);

	renderGroups(graph.groups, ctx, mainGroup);

	graph.edges.forEach((edge) => {
		mainGroup.appendChild(renderEdge(edge, ctx, options || {}));
	});

	graph.edges.forEach((edge) => {
		mainGroup.appendChild(renderEdgeLabel(edge, ctx));
	});

	graph.nodes.forEach((node) => {
		mainGroup.appendChild(renderNode(node, ctx, options || {}));
	});

	svg.appendChild(mainGroup);

	if (options?.container) {
		options.container.appendChild(svg);
	}

	return svg;
}
