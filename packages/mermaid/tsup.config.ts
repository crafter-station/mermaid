import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: true,
		clean: true,
		sourcemap: true,
		treeshake: true,
		external: [/^@crafter\//],
	},
	{
		entry: { "crafter-mermaid.browser": "src/browser.ts" },
		format: ["iife"],
		globalName: "crafterMermaid",
		platform: "browser",
		minify: true,
		noExternal: [/.*/],
	},
]);
