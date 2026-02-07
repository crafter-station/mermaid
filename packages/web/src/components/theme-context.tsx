"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const THEME_NAMES = [
	"tokyo-night", "catppuccin-mocha", "catppuccin-latte", "nord", "dracula",
	"github-light", "github-dark", "one-dark", "solarized-dark", "solarized-light",
	"monokai", "gruvbox-dark", "gruvbox-light", "rose-pine", "rose-pine-dawn",
	"ayu-dark", "ayu-light", "vesper", "vitesse-dark", "vitesse-light",
	"kanagawa", "everforest-dark", "everforest-light", "material-dark", "material-light",
	"poimandres", "night-owl", "one-hunter", "zinc-dark", "zinc-light",
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

interface DiagramThemeContextValue {
	themeName: ThemeName;
	setThemeName: (name: ThemeName) => void;
	getThemeObject: () => Record<string, string>;
}

const DiagramThemeContext = createContext<DiagramThemeContextValue | null>(null);

export function DiagramThemeProvider({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme();
	const [themeName, setThemeName] = useState<ThemeName>("tokyo-night");

	useEffect(() => {
		if (resolvedTheme === "light" && !themeName.includes("light")) {
			setThemeName("github-light");
		} else if (resolvedTheme === "dark" && themeName.includes("light")) {
			setThemeName("tokyo-night");
		}
	}, [resolvedTheme]);

	const getThemeObject = useCallback(() => {
		if (typeof window === "undefined" || !window.crafterMermaid) return {};
		return window.crafterMermaid.THEMES[themeName] || {};
	}, [themeName]);

	return (
		<DiagramThemeContext.Provider value={{ themeName, setThemeName, getThemeObject }}>
			{children}
		</DiagramThemeContext.Provider>
	);
}

export function useDiagramTheme() {
	const ctx = useContext(DiagramThemeContext);
	if (!ctx) throw new Error("useDiagramTheme must be used within DiagramThemeProvider");
	return ctx;
}
