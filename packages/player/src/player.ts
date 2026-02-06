import { parse, type DiagramAST } from "@crafter/mermaid-parser";
import { layout, type PositionedGraph } from "@crafter/mermaid-layout";
import {
	renderToString,
	type RenderOptions,
} from "@crafter/mermaid-renderer";
import { decompose, type StepInfo } from "./timeline";
import { createSnapshot } from "./snapshot";

export interface PlayerOptions extends RenderOptions {
	autoPlay?: boolean;
	stepDuration?: number;
	onStep?: (step: number, total: number) => void;
	onComplete?: () => void;
}

export interface Player {
	play(): void;
	pause(): void;
	stop(): void;
	step(direction: "forward" | "backward"): void;
	seek(stepIndex: number): void;
	isPlaying(): boolean;
	currentStep(): number;
	totalSteps(): number;
	snapshot(): string;
	destroy(): void;
}

interface PlayerState {
	ast: DiagramAST;
	fullGraph: PositionedGraph;
	steps: StepInfo[];
	currentStepIndex: number;
	playing: boolean;
	intervalId: ReturnType<typeof setInterval> | null;
	renderOptions: RenderOptions;
	stepDuration: number;
	onStep?: (step: number, total: number) => void;
	onComplete?: () => void;
}

export function createPlayer(
	text: string,
	options: PlayerOptions = {},
): Player {
	const parseResult = parse(text);

	if (!parseResult.ast) {
		const errors = parseResult.diagnostics
			.filter((d) => d.severity === "error")
			.map((d) => d.message)
			.join(", ");
		throw new Error(`Failed to parse diagram: ${errors}`);
	}

	const ast = parseResult.ast;
	const fullGraph = layout(ast, options);
	const steps = decompose(ast);

	const state: PlayerState = {
		ast,
		fullGraph,
		steps,
		currentStepIndex: -1,
		playing: false,
		intervalId: null,
		renderOptions: {
			theme: options.theme,
			padding: options.padding,
			transparent: options.transparent,
			debug: options.debug,
		},
		stepDuration: options.stepDuration ?? 500,
		onStep: options.onStep,
		onComplete: options.onComplete,
	};

	function advanceStep(): void {
		if (state.currentStepIndex < state.steps.length - 1) {
			state.currentStepIndex++;
			state.onStep?.(state.currentStepIndex, state.steps.length);
		} else {
			pause();
			state.onComplete?.();
		}
	}

	function play(): void {
		if (state.playing) return;
		if (state.currentStepIndex >= state.steps.length - 1) {
			state.currentStepIndex = -1;
		}

		state.playing = true;
		state.intervalId = setInterval(() => {
			advanceStep();
		}, state.stepDuration);
	}

	function pause(): void {
		if (!state.playing) return;
		state.playing = false;
		if (state.intervalId !== null) {
			clearInterval(state.intervalId);
			state.intervalId = null;
		}
	}

	function stop(): void {
		pause();
		state.currentStepIndex = -1;
	}

	function step(direction: "forward" | "backward"): void {
		if (state.playing) {
			pause();
		}

		if (direction === "forward" && state.currentStepIndex < state.steps.length - 1) {
			state.currentStepIndex++;
		} else if (direction === "backward" && state.currentStepIndex > -1) {
			state.currentStepIndex--;
		}

		state.onStep?.(state.currentStepIndex, state.steps.length);
	}

	function seek(stepIndex: number): void {
		if (state.playing) {
			pause();
		}

		const clampedIndex = Math.max(-1, Math.min(stepIndex, state.steps.length - 1));
		state.currentStepIndex = clampedIndex;
		state.onStep?.(state.currentStepIndex, state.steps.length);
	}

	function isPlaying(): boolean {
		return state.playing;
	}

	function currentStep(): number {
		return state.currentStepIndex;
	}

	function totalSteps(): number {
		return state.steps.length;
	}

	function snapshot(): string {
		if (state.currentStepIndex === -1) {
			return renderToString(
				{ ...state.fullGraph, nodes: [], edges: [], groups: [] },
				state.renderOptions,
			);
		}

		const filteredGraph = createSnapshot(
			state.fullGraph,
			state.steps,
			state.currentStepIndex,
			state.ast,
		);

		return renderToString(filteredGraph, state.renderOptions);
	}

	function destroy(): void {
		pause();
	}

	if (options.autoPlay) {
		play();
	}

	return {
		play,
		pause,
		stop,
		step,
		seek,
		isPlaying,
		currentStep,
		totalSteps,
		snapshot,
		destroy,
	};
}
