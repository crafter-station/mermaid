import type { Direction, Point } from "./types";

function isHorizontal(direction: Direction): boolean {
	return direction === "LR" || direction === "RL";
}

export function snapToOrthogonal(points: Point[], direction: Direction): Point[] {
	if (points.length < 2) return points;

	const start = points[0];
	const end = points[points.length - 1];
	const isHoriz = isHorizontal(direction);

	if (points.length === 2 || points.length === 3) {
		if (isHoriz) {
			if (Math.abs(start.y - end.y) < 8) return [start, end];
			const midX = (start.x + end.x) / 2;
			return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
		}
		if (Math.abs(start.x - end.x) < 8) return [start, end];
		const midY = (start.y + end.y) / 2;
		return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
	}

	const result: Point[] = [start];
	for (let i = 1; i < points.length - 1; i++) {
		const prev = result[result.length - 1];
		const curr = points[i];
		if (isHoriz) {
			result.push({ x: curr.x, y: prev.y });
			if (Math.abs(curr.y - prev.y) > 1) {
				result.push({ x: curr.x, y: curr.y });
			}
		} else {
			result.push({ x: prev.x, y: curr.y });
			if (Math.abs(curr.x - prev.x) > 1) {
				result.push({ x: curr.x, y: curr.y });
			}
		}
	}
	result.push(end);

	return result;
}

export function clipToNodeBoundary(
	point: Point,
	node: { x: number; y: number; width: number; height: number },
	shape: string,
): Point {
	const dx = point.x - node.x;
	const dy = point.y - node.y;

	const hw = node.width / 2;
	const hh = node.height / 2;

	switch (shape) {
		case "circle":
		case "doublecircle": {
			const radius = Math.max(hw, hh);
			const angle = Math.atan2(dy, dx);
			return {
				x: node.x + radius * Math.cos(angle),
				y: node.y + radius * Math.sin(angle),
			};
		}

		case "diamond":
		case "rhombus": {
			const angle = Math.atan2(dy, dx);
			const absAngle = Math.abs(angle);

			if (absAngle < Math.PI / 4 || absAngle > (3 * Math.PI) / 4) {
				const t = hw / Math.abs(Math.cos(angle));
				const clipX = node.x + t * Math.cos(angle);
				const clipY = node.y + t * Math.sin(angle);

				if (Math.abs(clipY - node.y) <= hh) {
					return { x: clipX, y: clipY };
				}
			}

			const t = hh / Math.abs(Math.sin(angle));
			return {
				x: node.x + t * Math.cos(angle),
				y: node.y + t * Math.sin(angle),
			};
		}

		case "hexagon": {
			const angle = Math.atan2(dy, dx);
			const seg = Math.PI / 3;

			if (Math.abs(angle) < seg || Math.abs(angle) > Math.PI - seg) {
				const t = hw / Math.abs(Math.cos(angle));
				return {
					x: node.x + t * Math.cos(angle),
					y: node.y + t * Math.sin(angle),
				};
			}

			const t = hh / Math.abs(Math.sin(angle));
			return {
				x: node.x + t * Math.cos(angle),
				y: node.y + t * Math.sin(angle),
			};
		}

		case "rect":
		case "rectangle":
		case "rounded":
		case "square":
		default: {
			const angle = Math.atan2(dy, dx);

			if (Math.abs(Math.cos(angle)) * hh > Math.abs(Math.sin(angle)) * hw) {
				const t = hw / Math.abs(Math.cos(angle));
				return {
					x: node.x + t * Math.cos(angle),
					y: node.y + t * Math.sin(angle),
				};
			}

			const t = hh / Math.abs(Math.sin(angle));
			return {
				x: node.x + t * Math.cos(angle),
				y: node.y + t * Math.sin(angle),
			};
		}
	}
}

export function routeEdge(
	source: { x: number; y: number; width: number; height: number },
	target: { x: number; y: number; width: number; height: number },
	waypoints: Point[],
	sourceShape: string,
	targetShape: string,
	direction: Direction,
): Point[] {
	const points = snapToOrthogonal(waypoints, direction);

	if (points.length < 2) return points;

	const afterStart = points.length > 2 ? points[1] : points[points.length - 1];
	const beforeEnd = points.length > 2 ? points[points.length - 2] : points[0];

	const startPoint = clipToNodeBoundary(afterStart, source, sourceShape);
	const endPoint = clipToNodeBoundary(beforeEnd, target, targetShape);

	const inner = points.length > 2 ? points.slice(1, -1) : [];
	return [startPoint, ...inner, endPoint];
}

export function computeLabelPosition(points: Point[]): Point {
	if (points.length === 0) return { x: 0, y: 0 };

	let totalLength = 0;
	const segments: number[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const dx = points[i + 1].x - points[i].x;
		const dy = points[i + 1].y - points[i].y;
		const len = Math.sqrt(dx * dx + dy * dy);
		segments.push(len);
		totalLength += len;
	}

	const midLength = totalLength / 2;
	let accum = 0;

	for (let i = 0; i < segments.length; i++) {
		if (accum + segments[i] >= midLength) {
			const t = (midLength - accum) / segments[i];
			return {
				x: points[i].x + (points[i + 1].x - points[i].x) * t,
				y: points[i].y + (points[i + 1].y - points[i].y) * t,
			};
		}
		accum += segments[i];
	}

	return points[Math.floor(points.length / 2)];
}
