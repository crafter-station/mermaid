"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Script from "next/script";

declare global {
	interface Window {
		crafterMermaid: {
			render: (text: string, options?: Record<string, unknown>) => string;
			parse: (text: string) => { ast: Record<string, unknown> | null };
			layout: (ast: Record<string, unknown>) => Record<string, unknown>;
			renderToString: (graph: Record<string, unknown>, options?: Record<string, unknown>) => string;
			THEMES: Record<string, Record<string, string>>;
		};
	}
}

const DIAGRAM = `graph TD
  A[Parse] --> B[Layout]
  B --> C{Render}
  C -->|String| D[SVG]
  C -->|DOM| E[Interactive]
  C -->|ANSI| F[Terminal]`;

export function HeroDiagram() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (!ready || !containerRef.current || !window.crafterMermaid) return;

		const themeName = resolvedTheme === "dark" ? "tokyo-night" : "github-light";
		try {
			const svg = window.crafterMermaid.render(DIAGRAM, {
				theme: window.crafterMermaid.THEMES[themeName],
			});
			containerRef.current.innerHTML = svg;
		} catch {
			// silently ignore
		}
	}, [ready, resolvedTheme]);

	return (
		<>
			<Script
				src="/crafter-mermaid.browser.global.js"
				strategy="afterInteractive"
				onReady={() => setReady(true)}
			/>
			<div className="relative hidden lg:block">
				<div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-transparent to-transparent z-10 pointer-events-none" />
				<div
					ref={containerRef}
					className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 [&>svg]:w-full [&>svg]:h-auto opacity-80"
				/>
			</div>
		</>
	);
}
