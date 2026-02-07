# @crafter/mermaid

Ultra-lightweight, zero-dependency Mermaid rendering engine. Parses, lays out, and renders Mermaid diagrams in **<20KB** (min+gzip).

## Why

| | mermaid.js | @crafter/mermaid |
|---|---|---|
| Bundle size | ~2MB | **16.1 KB** gzipped |
| Dependencies | 50+ | **Zero** |
| API | Async | **Sync** |
| Output | SVG string | SVG string + SVG DOM + Terminal (ANSI) |
| Interactivity | None | Zoom, pan, keyboard, search, hover |
| Playability | None | Step-through animation |
| Diagram types | 10+ | 8 (extensible via plugins) |
| Themes | 1 | **32** |

## Packages

| Package | Size | Description |
|---------|------|-------------|
| [`@crafter/mermaid`](./packages/mermaid) | ~1KB | Umbrella package (recommended) |
| [`@crafter/mermaid-parser`](./packages/parser) | ~3KB | Text → AST with source spans |
| [`@crafter/mermaid-layout`](./packages/layout) | ~7KB | AST → positioned graph (custom Sugiyama) |
| [`@crafter/mermaid-renderer`](./packages/renderer) | ~5KB | Positioned graph → SVG |
| [`@crafter/mermaid-themes`](./packages/themes) | ~2KB | 32 theme presets + CSS variables |
| [`@crafter/mermaid-cli`](./packages/cli) | ~4KB | Terminal renderer (ANSI + Unicode) |
| [`@crafter/mermaid-player`](./packages/player) | ~3KB | Step-through animation system |

## Quick Start

```bash
bun add @crafter/mermaid
```

```typescript
import { render } from "@crafter/mermaid";

const svg = render(`
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Success]
  B -->|No| D[Failure]
`);

document.getElementById("diagram").innerHTML = svg;
```

## Supported Diagrams

- **Flowchart** — `graph TD`, `flowchart LR`
- **State Diagram** — `stateDiagram-v2`
- **Sequence Diagram** — `sequenceDiagram`
- **Class Diagram** — `classDiagram`
- **ER Diagram** — `erDiagram`
- **Pie Chart** — `pie`
- **Gantt Chart** — `gantt`
- **Mindmap** — `mindmap`

## Usage

### SVG String (SSR / Node / Bun / Cloudflare Workers)

```typescript
import { render } from "@crafter/mermaid";

const svg = render("graph TD; A-->B-->C", {
  theme: { bg: "#1a1a2e", fg: "#e2e8f0" },
});
```

### SVG DOM (Browser)

```typescript
import { parse, layout } from "@crafter/mermaid";
import { renderToDOM, enableZoomPan, enableKeyboard, enableHover } from "@crafter/mermaid-renderer";

const ast = parse("graph TD; A-->B").ast;
const graph = layout(ast);
const svg = renderToDOM(graph, {
  container: document.getElementById("diagram"),
  interactive: true,
  onNodeClick: (id) => console.log("Clicked:", id),
});

enableZoomPan(svg);
enableKeyboard(svg);
enableHover(svg);
```

### Terminal (ANSI Colors)

```bash
echo "graph TD; A-->B-->C" | npx @crafter/mermaid-cli
```

```typescript
import { renderToTerminal } from "@crafter/mermaid-cli";

const output = renderToTerminal("graph TD; A-->B");
console.log(output);
```

### Step-Through Animation

```typescript
import { createPlayer } from "@crafter/mermaid-player";

const player = createPlayer("graph TD; A-->B-->C", container, {
  theme: "tokyo-night",
});

player.play();
player.step("forward");
player.seek(2);
```

### Themes

32 built-in themes:

```typescript
import { render, THEMES } from "@crafter/mermaid";

const svg = render(source, { theme: THEMES["tokyo-night"] });
```

Available: `zinc-dark`, `zinc-light`, `tokyo-night`, `catppuccin-mocha`, `catppuccin-latte`, `nord`, `dracula`, `github-light`, `github-dark`, `one-dark`, `solarized-dark`, `solarized-light`, `monokai`, `gruvbox-dark`, `gruvbox-light`, `rose-pine`, `rose-pine-dawn`, `ayu-dark`, `ayu-light`, `vesper`, `vitesse-dark`, `vitesse-light`, `kanagawa`, `everforest-dark`, `everforest-light`, `material-dark`, `material-light`, `poimandres`, `night-owl`, `one-hunter`, and more.

### Plugins

Extend with custom diagram types, shapes, and themes:

```typescript
import { use, render } from "@crafter/mermaid";

use({
  name: "my-plugin",
  diagrams: [{
    type: "custom",
    detect: (line) => line.startsWith("custom"),
    parse: (source) => ({ ast: myParse(source), diagnostics: [] }),
    layout: (ast, options) => myLayout(ast, options),
  }],
  shapes: [{
    name: "pentagon",
    render: (node, ctx) => `<polygon .../>`,
  }],
});
```

### Debug Mode

```typescript
const svg = render(source, { debug: true });
```

Shows layout grid, node IDs, edge waypoints, and bounding boxes.

## Architecture

```
Text → Parser → AST → Layout → PositionedGraph → Renderer → SVG
                                                      ↓
                                                   Player → Animation
```

**Parser**: Regex-based, line-by-line tokenizer with error recovery. Outputs typed AST with source spans for every node.

**Layout**: Custom Sugiyama algorithm (cycle removal → layer assignment → crossing minimization → coordinate assignment). Additional layouts: column (sequence), force-directed (ER), radial (mindmap), timeline (gantt).

**Renderer**: Two modes — string concatenation for SSR, real DOM elements for browser interactivity.

## Development

```bash
git clone https://github.com/crafter-station/mermaid
cd mermaid
bun install
bun run build    # Build all packages
bun test         # Run all tests
```

### Build Order

```
parser + themes → layout → renderer → mermaid + cli + player
```

### Project Structure

```
packages/
├── parser/       # @crafter/mermaid-parser
│   └── src/
│       ├── diagrams/     # Per-type parsers
│       ├── parse.ts      # Main parse() function
│       └── types.ts      # AST type definitions
├── layout/       # @crafter/mermaid-layout
│   └── src/
│       ├── sugiyama/     # Hierarchical layout
│       ├── column/       # Sequence diagram layout
│       ├── force/        # ER diagram layout
│       ├── radial/       # Mindmap + pie layout
│       └── timeline/     # Gantt layout
├── renderer/     # @crafter/mermaid-renderer
│   └── src/
│       ├── svg/          # String + DOM renderers
│       └── interaction/  # Zoom, keyboard, hover, search, minimap
├── themes/       # @crafter/mermaid-themes
│   └── src/
│       ├── presets.ts    # 32 theme definitions
│       ├── css-vars.ts   # CSS custom property generation
│       └── shiki.ts      # Shiki theme extraction
├── cli/          # @crafter/mermaid-cli
│   └── src/
│       ├── bin.ts        # CLI entry point
│       ├── terminal.ts   # Terminal renderer
│       └── canvas.ts     # 2D character canvas
├── player/       # @crafter/mermaid-player
│   └── src/
│       ├── player.ts     # Player controller
│       ├── timeline.ts   # Step decomposition
│       └── snapshot.ts   # Graph filtering per step
└── mermaid/      # @crafter/mermaid (umbrella)
    └── src/
        ├── index.ts      # Main render() + re-exports
        ├── plugins.ts    # Plugin registry
        └── browser.ts    # Browser IIFE entry
```

## License

MIT
