<script lang="ts">
	import type { TabPreviewData } from '$lib/tab';
	import { pitchClassName } from '$lib/tab';

	interface Props {
		preview: TabPreviewData | null;
	}

	let { preview }: Props = $props();

	const COL_W = 30;
	const ROW_H = 16;
	const PAD_LEFT = 28;
	const PAD_Y = 14;
	const MIN_COLS = 24;

	const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

	const tuning = $derived(preview === null ? STANDARD_TUNING : preview.tuning);
	const steps = $derived(preview === null ? [] : preview.steps);
	const n = $derived(tuning.length);
	const cols = $derived(Math.max(steps.length, MIN_COLS));
	const width = $derived(PAD_LEFT + cols * COL_W);
	const height = $derived(PAD_Y * 2 + (n - 1) * ROW_H);

	function rowOf(s: number): number {
		return n - 1 - s;
	}
</script>

<div class="tab-preview" data-tab-preview>
	<svg {width} {height} role="img">
		<title>Tab preview</title>
		{#each tuning as midi, s}
			<text x={8} y={PAD_Y + rowOf(s) * ROW_H} class="string-name">{pitchClassName(midi)}</text>
			<line
				x1={PAD_LEFT}
				y1={PAD_Y + rowOf(s) * ROW_H}
				x2={width}
				y2={PAD_Y + rowOf(s) * ROW_H}
				stroke="var(--color-border)"
			/>
		{/each}
		{#each steps as step}
			<g data-step={step.index}>
				{#each step.notes as note}
					<text
						x={PAD_LEFT + step.index * COL_W + COL_W / 2}
						y={PAD_Y + rowOf(note.string) * ROW_H}
						class="fret"
						stroke="var(--color-background)"
						stroke-width="4"
						paint-order="stroke">{note.fret}</text
					>
				{/each}
			</g>
		{/each}
	</svg>
</div>

<style>
	.tab-preview {
		overflow-x: auto;
	}

	.string-name {
		fill: var(--foreground);
		text-anchor: middle;
		dominant-baseline: central;
	}

	.fret {
		fill: var(--foreground);
		text-anchor: middle;
		dominant-baseline: central;
	}
</style>
