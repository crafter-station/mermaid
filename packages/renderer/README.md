# @crafter/mermaid-renderer

Zero-dependency SVG renderer for positioned Mermaid graphs.

## Features

- 16+ node shapes (rectangle, diamond, circle, hexagon, etc.)
- Edge styles (solid, dotted, thick)
- Arrow markers
- Multi-line labels
- Subgraph backgrounds
- Self-contained SVG output

## Usage

```typescript
import { renderToString } from "@crafter/mermaid-renderer";
import { THEMES } from "@crafter/mermaid-themes";
import type { PositionedGraph } from "@crafter/mermaid-layout";

const graph: PositionedGraph = {
	width: 400,
	height: 300,
	nodes: [
		{ id: "A", label: "Start", shape: "rounded", x: 0, y: 0, width: 100, height: 50 },
		{ id: "B", label: "End", shape: "diamond", x: 200, y: 100, width: 100, height: 80 },
	],
	edges: [
		{
			source: "A",
			target: "B",
			style: "solid",
			hasArrowEnd: true,
			hasArrowStart: false,
			points: [
				{ x: 50, y: 50 },
				{ x: 250, y: 140 },
			],
		},
	],
	groups: [],
};

const svg = renderToString(graph, {
	theme: THEMES["tokyo-night"],
	padding: 16,
	transparent: false,
});
```

## API

### `renderToString(graph, options?)`

Render a positioned graph to SVG string.

Options:

- `theme?: DiagramTheme` - Theme from @crafter/mermaid-themes
- `padding?: number` - Padding around diagram (default: 16)
- `transparent?: boolean` - Transparent background (default: false)
- `debug?: boolean` - Debug mode (default: false)

### Supported Shapes

- `rectangle` - Sharp corners
- `rounded` - Rounded corners
- `diamond` - Diamond/rhombus
- `stadium` - Pill shape
- `circle` - Circle
- `subroutine` - Double-bordered rectangle
- `doublecircle` - Concentric circles
- `hexagon` - Six-sided polygon
- `cylinder` - Database shape
- `asymmetric` - Flag/banner
- `trapezoid` - Trapezoid (wider bottom)
- `trapezoid-alt` - Trapezoid (wider top)
- `parallelogram` - Slanted rectangle
- `note` - Rectangle with folded corner
- `cloud` - Cloud shape
- `state-start` - Small filled circle
- `state-end` - Bullseye (target)
