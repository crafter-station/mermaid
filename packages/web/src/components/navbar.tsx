"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) return <div className="w-8 h-8" />;

	return (
		<button
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
			aria-label="Toggle theme"
		>
			{resolvedTheme === "dark" ? (
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
					<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
			) : (
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M14 8.5A6.5 6.5 0 017.5 2 5.5 5.5 0 1014 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			)}
		</button>
	);
}

export function Navbar() {
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
			<div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
				<a href="#" className="flex items-center gap-2">
					<span className="font-mono text-sm font-semibold tracking-tight">
						@crafter/mermaid
					</span>
				</a>

				<div className="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)]">
					<a href="#playground" className="hover:text-[var(--text-primary)] transition-colors">Playground</a>
					<a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
					<a href="#packages" className="hover:text-[var(--text-primary)] transition-colors">Packages</a>
					<a href="https://github.com/crafter-station/mermaid" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
				</div>

				<div className="flex items-center gap-3">
					<ThemeToggle />
					<a
						href="https://github.com/crafter-station/mermaid"
						target="_blank"
						rel="noopener noreferrer"
						className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
						Star
					</a>
				</div>
			</div>
		</nav>
	);
}
