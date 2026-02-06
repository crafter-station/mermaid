export interface Point {
	x: number;
	y: number;
}

export interface PositionedNode {
	id: string;
	label: string;
	shape: string;
	x: number;
	y: number;
	width: number;
	height: number;
	inlineStyle?: Record<string, string>;
}

export interface PositionedEdge {
	source: string;
	target: string;
	label?: string;
	style: string;
	hasArrowStart: boolean;
	hasArrowEnd: boolean;
	points: Point[];
	labelPosition?: Point;
}

export interface PositionedGroup {
	id: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	children: PositionedGroup[];
}

export interface PositionedGraph {
	width: number;
	height: number;
	nodes: PositionedNode[];
	edges: PositionedEdge[];
	groups: PositionedGroup[];
}

export type Direction = "TD" | "TB" | "LR" | "BT" | "RL";

export interface LayoutOptions {
	direction?: Direction;
	nodeSpacing?: number;
	layerSpacing?: number;
	padding?: number;
}
