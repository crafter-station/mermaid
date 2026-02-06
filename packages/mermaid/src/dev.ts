import { render, THEMES } from "./index";

const diagram = `graph TD
	A[Start] --> B{Decision}
	B -->|Yes| C[Success]
	B -->|No| D[Failure]
	C --> E[End]
	D --> E`;

try {
	const svg = render(diagram, {
		theme: THEMES["tokyo-night"],
		padding: 40,
	});
	console.log("SVG generated successfully!");
	console.log(`SVG length: ${svg.length} chars`);
	console.log(`First 200 chars:\n${svg.slice(0, 200)}`);

	const fs = await import("node:fs");
	fs.writeFileSync("test-output.html", `<!DOCTYPE html><html><body style="background:#1a1b26;display:flex;justify-content:center;padding:40px">${svg}</body></html>`);
	console.log("\nWritten to test-output.html");
} catch (e) {
	console.error("Error:", e);
}
