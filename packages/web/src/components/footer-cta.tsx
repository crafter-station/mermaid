"use client";

import { useState } from "react";

export function FooterCTA() {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText("bun add @crafter/mermaid");
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section className="py-24 px-6 border-t border-[var(--border)]">
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
					Drop 2MB from your bundle today.
				</h2>
				<p className="text-[var(--text-muted)] mb-8">
					One command. Zero config. Diagrams rendering in under 1ms.
				</p>

				<button
					onClick={handleCopy}
					className="inline-flex items-center gap-3 px-6 py-3 rounded-lg font-mono text-sm bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors group cursor-pointer"
				>
					<span className="text-[var(--text-muted)]">$</span>
					<span className="text-[var(--text-primary)]">bun add @crafter/mermaid</span>
					<span className="text-xs text-[var(--accent-green)] opacity-0 group-hover:opacity-100 transition-opacity">
						{copied ? "Copied!" : "Click to copy"}
					</span>
				</button>

				<div className="mt-12 flex justify-center gap-8 text-sm text-[var(--text-muted)]">
					<a href="https://github.com/crafter-station/mermaid" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">
						GitHub
					</a>
					<a href="https://www.npmjs.com/package/@crafter/mermaid" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">
						npm
					</a>
					<a href="https://crafterstation.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">
						Crafter Station
					</a>
				</div>

				<p className="mt-8 text-xs text-[var(--text-muted)]">
					MIT Licensed. Built by{" "}
					<a href="https://crafterstation.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">
						Crafter Station
					</a>
				</p>
			</div>
		</section>
	);
}
