import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
	title: "@crafter/mermaid — Ultra-lightweight Mermaid Engine",
	description:
		"Zero-dependency, 16.8KB gzipped Mermaid rendering engine. Parse, lay out, and render diagrams with a sync API, 32 themes, and full interactivity.",
	openGraph: {
		title: "@crafter/mermaid — Ultra-lightweight Mermaid Engine",
		description:
			"Zero-dependency, 16.8KB gzipped Mermaid rendering engine with sync API, 32 themes, and interactivity.",
		url: "https://mermaid.crafter.run",
		siteName: "@crafter/mermaid",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "@crafter/mermaid — Ultra-lightweight Mermaid Engine",
		description:
			"Zero-dependency, 16.8KB gzipped Mermaid rendering engine.",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body className="font-sans antialiased">
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
