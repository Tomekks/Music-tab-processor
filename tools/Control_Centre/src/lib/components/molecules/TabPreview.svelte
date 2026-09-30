<script lang="ts">
	import type { TabPreviewData } from '$lib/tab';
	import { pitchClassName } from '$lib/tab';

	interface Props {
		preview: TabPreviewData | null;
		activeStep: number | null;
		follow: boolean;
	}

	let { preview, activeStep = null, follow = false }: Props = $props();

	let scroller: HTMLDivElement | null = $state(null);

	const COL_W = 36;
	const ROW_H = 32;
	const PAD_LEFT = 26;
	const PAD_RIGHT = 16;
	const PAD_Y = 16;
	const NOTE_R = 14;
	const NOTE_FONT = (NOTE_R * 9) / 7;
	const MIN_COLS = 24;

	const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

	const tuning = $derived(preview === null ? STANDARD_TUNING : preview.tuning);
	const steps = $derived(preview === null ? [] : preview.steps);
	const n = $derived(tuning.length);
	const cols = $derived(Math.max(steps.length, MIN_COLS));
	const width = $derived(PAD_LEFT + cols * COL_W + PAD_RIGHT);
	const height = $derived(PAD_Y * 2 + (n - 1) * ROW_H);

	function rowOf(s: number): number {
		return n - 1 - s;
	}

	function stringY(s: number): number {
		return PAD_Y + rowOf(s) * ROW_H;
	}

	function noteX(index: number): number {
		return PAD_LEFT + index * COL_W + COL_W / 2;
	}

	// Same rule as app/lib/tabNotation.ts stringThickness: top three strings 1,
	// then 1.6, 2.2, 2.8.
	function stringThickness(s: number, strings: number): number {
		return 1 + Math.max(0, strings - 1 - s - 2) * 0.6;
	}

	export function scrollToStart() {
		if (scroller) scroller.scrollLeft = 0;
	}

	$effect(() => {
		const s = activeStep;
		if (!follow || s === null || !scroller) return;
		const x = 20 + noteX(s);
		if (x - COL_W < scroller.scrollLeft || x + COL_W > scroller.scrollLeft + scroller.clientWidth) {
			scroller.scrollLeft = x - scroller.clientWidth * 0.25;
		}
	});
</script>

<div class="tab-preview" data-tab-preview bind:this={scroller}>
	<svg width="100%" style="min-width: {width}px" {height} role="img">
		<title>Tab preview</title>
		{#each tuning as midi, s}
			<line
				x1={PAD_LEFT - 8}
				y1={stringY(s)}
				x2="100%"
				y2={stringY(s)}
				stroke="var(--foreground)"
				stroke-opacity="0.22"
				stroke-width={stringThickness(s, n)}
			/>
			<text
				x={PAD_LEFT - 12}
				y={stringY(s) + 3.5}
				text-anchor="end"
				fill="var(--foreground)"
				fill-opacity="0.55"
				class="string-name">{s === n - 1 ? pitchClassName(midi).toLowerCase() : pitchClassName(midi)}</text
			>
		{/each}
		{#if activeStep !== null}
			<line
				x1={noteX(activeStep)}
				x2={noteX(activeStep)}
				y1={PAD_Y - 6}
				y2={height - PAD_Y + 6}
				stroke="var(--foreground)"
				stroke-width="1.5"
				stroke-dasharray="3 2"
			/>
		{/if}
		{#each steps as step}
			<g data-step={step.index}>
				{#each step.notes as note}
					<circle
						cx={noteX(step.index)}
						cy={stringY(note.string)}
						r={NOTE_R}
						fill={step.index === activeStep ? 'var(--foreground)' : 'var(--background)'}
						stroke="var(--foreground)"
						stroke-width={step.index === activeStep ? 0 : 1.2}
					/>
					<text
						x={noteX(step.index)}
						y={stringY(note.string) + NOTE_FONT * 0.35}
						text-anchor="middle"
						font-size={NOTE_FONT}
						fill={step.index === activeStep ? 'var(--background)' : 'var(--foreground)'}
						class="fret">{note.fret}</text
					>
				{/each}
			</g>
		{/each}
	</svg>
</div>

<style>
	.tab-preview {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
		border: 1px solid color-mix(in srgb, var(--foreground) 15%, transparent);
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 24px;
		background: var(--background);
	}

	.string-name {
		font-family: var(--font-mono);
		font-size: 10px;
	}

	.fret {
		font-family: var(--font-mono);
	}
</style>
