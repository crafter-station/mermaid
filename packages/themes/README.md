# @crafter/mermaid-themes

Zero-dependency theme system for Mermaid diagrams.

## Features

- 30+ built-in themes
- CSS custom properties with color-mix fallbacks
- Shiki theme extraction
- Computed color resolution

## Usage

```typescript
import { THEMES, generateCssVars, resolveColors } from "@crafter/mermaid-themes";

const theme = THEMES["tokyo-night"];

const cssVars = generateCssVars(theme);

const inlineStyle = generateInlineStyle(theme);

const colors = resolveColors(theme);
```

## API

### Types

- `DiagramColors` - Basic color properties (bg, fg, line, accent, etc.)
- `DiagramTheme` - Extended theme with fonts and per-element colors
- `ResolvedColors` - Computed colors with all fallbacks resolved

### Functions

- `generateCssVars(theme)` - Generate CSS custom properties for `<style>` blocks
- `generateInlineStyle(theme)` - Generate inline style attribute value
- `resolveColors(theme)` - Compute all colors to hex values
- `fromShikiTheme(shikiTheme)` - Extract colors from Shiki theme objects

### Presets

- `THEMES` - 30+ built-in themes
- `DEFAULTS` - Default theme (zinc-light)
