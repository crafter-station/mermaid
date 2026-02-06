export interface DiagramColors {
	bg: string;
	fg: string;
	line?: string;
	accent?: string;
	muted?: string;
	surface?: string;
	border?: string;
}

export interface DiagramTheme extends DiagramColors {
	font?: string;
	monoFont?: string;
	fontSize?: { node?: number; edge?: number; group?: number };
	nodeColors?: Record<string, { fill?: string; stroke?: string; text?: string }>;
	edgeColors?: Record<string, { line?: string; label?: string }>;
}

export interface ResolvedColors {
	bg: string;
	fg: string;
	text: string;
	line: string;
	arrow: string;
	muted: string;
	nodeFill: string;
	nodeStroke: string;
	groupFill: string;
	groupStroke: string;
	groupText: string;
	font: string;
	monoFont: string;
}
