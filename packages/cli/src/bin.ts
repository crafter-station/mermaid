#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { renderToTerminal } from "./terminal";
import { THEMES } from "@crafter/mermaid-themes";

function printUsage() {
	console.log(`
crafter-mermaid - Terminal renderer for Mermaid diagrams

Usage:
  crafter-mermaid [options] [file]
  cat diagram.mmd | crafter-mermaid [options]

Options:
  --theme <name>    Theme name (default: one-hunter)
  --width <n>       Terminal width (default: auto-detect)
  --compact         Use compact spacing
  --list-themes     List available themes
  --help            Show this help

Examples:
  crafter-mermaid diagram.mmd
  crafter-mermaid --theme tokyo-night diagram.mmd
  echo "graph TD; A-->B" | crafter-mermaid
`);
}

function listThemes() {
	console.log("Available themes:");
	for (const name of Object.keys(THEMES).sort()) {
		console.log(`  ${name}`);
	}
}

async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help")) {
		printUsage();
		process.exit(0);
	}

	if (args.includes("--list-themes")) {
		listThemes();
		process.exit(0);
	}

	let themeName = "one-hunter";
	let width: number | undefined;
	let compact = false;
	let filePath: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--theme") {
			themeName = args[++i]!;
		} else if (arg === "--width") {
			width = Number.parseInt(args[++i]!, 10);
		} else if (arg === "--compact") {
			compact = true;
		} else if (arg && !arg.startsWith("--")) {
			filePath = arg;
		}
	}

	const theme = THEMES[themeName];
	if (!theme) {
		console.error(`Unknown theme: ${themeName}`);
		console.error("Use --list-themes to see available themes");
		process.exit(1);
	}

	let input: string;

	if (filePath) {
		try {
			input = readFileSync(filePath, "utf-8");
		} catch (error) {
			console.error(`Failed to read file: ${filePath}`);
			console.error(error);
			process.exit(1);
		}
	} else {
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(chunk);
		}
		input = Buffer.concat(chunks).toString("utf-8");
	}

	if (!input.trim()) {
		console.error("No input provided");
		printUsage();
		process.exit(1);
	}

	try {
		const output = renderToTerminal(input, { theme, width, compact });
		console.log(output);
	} catch (error) {
		console.error("Render error:");
		console.error(error);
		process.exit(1);
	}
}

main();
