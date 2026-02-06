# @crafter/mermaid-layout

Zero-dependency layout engine for Mermaid diagrams. Implements the Sugiyama hierarchical layout algorithm from scratch.

## Features

- Zero dependencies
- Sugiyama hierarchical layout (Flowchart, Class, ER diagrams)
- Column-based sequence diagram layout
- Orthogonal edge routing
- Shape-aware boundary clipping
- Deterministic output

## Usage

```typescript
import { layout } from "@crafter/mermaid-layout";
import { parse } from "@crafter/mermaid-parser";

const code = `
flowchart TD
  A[Start] --> B[Process]
  B --> C[End]
`;

const result = parse(code);
if (result.ast) {
  const positioned = layout(result.ast, {
    direction: "TB",
    nodeSpacing: 50,
    layerSpacing: 100,
    padding: 20,
  });

  console.log(positioned.nodes);
  console.log(positioned.edges);
}
```

## API

### `layout(ast: DiagramAST, options?: LayoutOptions): PositionedGraph`

Main layout function. Accepts a parsed AST from `@crafter/mermaid-parser` and returns positioned nodes, edges, and groups.

#### Options

```typescript
interface LayoutOptions {
  direction?: "TD" | "TB" | "LR" | "BT" | "RL";
  nodeSpacing?: number;
  layerSpacing?: number;
  padding?: number;
}
```

#### Output

```typescript
interface PositionedGraph {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  groups: PositionedGroup[];
}
```

## Algorithm

### Sugiyama Layout (4 phases)

1. **Cycle Removal**: DFS-based greedy cycle breaking
2. **Layer Assignment**: Longest-path layering + virtual node insertion
3. **Crossing Minimization**: Barycenter heuristic (24 iterations)
4. **Coordinate Assignment**: Position refinement with neighbor attraction

### Edge Routing

- Orthogonal routing (90-degree bends)
- Shape-aware boundary clipping (rectangle, diamond, circle, hexagon, etc.)
- Label positioning at edge midpoint

### Text Metrics

Character-count heuristic calibrated for web fonts:
- Normal: 0.52 ratio
- Medium: 0.55 ratio
- Bold: 0.58 ratio

## Supported Diagrams

- Flowchart (TD, TB, LR, BT, RL)
- Sequence (column-based)
- Class (hierarchical)
- ER (hierarchical)

## Architecture

```
src/
├── types.ts              # Layout types
├── graph.ts              # Directed graph data structure
├── text-metrics.ts       # Text width estimation
├── edge-routing.ts       # Edge routing utilities
├── sugiyama/
│   ├── cycle-removal.ts  # Phase 1
│   ├── layer-assign.ts   # Phase 2
│   ├── crossing-min.ts   # Phase 3
│   ├── coordinate.ts     # Phase 4
│   └── index.ts          # Orchestrator
└── index.ts              # Main entry point
```

## Performance

- O(V + E) cycle removal
- O(V + E) layer assignment
- O(E²) crossing minimization (worst case, typically much better)
- O(V) coordinate assignment

Deterministic output ensures same input always produces same layout.
