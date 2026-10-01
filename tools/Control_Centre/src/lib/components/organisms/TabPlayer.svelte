<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import TabPreview from '$lib/components/molecules/TabPreview.svelte';
	import { Player } from '$lib/player';
	import type { TabPreviewData } from '$lib/tab';
	import type { Snippet } from 'svelte';

	interface Props {
		preview: TabPreviewData | null;
		trailing?: Snippet;
	}

	let { preview, trailing }: Props = $props();

	const initialPreview = untrack(() => preview);
	const player =
		initialPreview !== null && initialPreview.steps.length > 0
			? new Player({ steps: initialPreview.steps, tuning: initialPreview.tuning })
			: null;

	onDestroy(() => player?.dispose());

	let playing = $state(false);
	let muted = $state(false);
	let activeStep = $state<number | null>(player === null ? null : 0);
	let strip: TabPreview | undefined = $state();

	const disabled = $derived(preview === null || preview.steps.length === 0);

	function toggle() {
		if (!player) return;
		try {
			if (playing) {
				player.pause();
				playing = false;
			} else {
				player.play();
				playing = true;
			}
		} catch (err) {
			console.error(err);
		}
	}

	function reset() {
		if (!player) return;
		player.reset();
		playing = false;
		activeStep = 0;
		strip?.scrollToStart();
	}

	function toggleMute() {
		const m = !muted;
		muted = m;
		player?.setMuted(m);
	}

	$effect(() => {
		if (!playing || !player) return;
		let raf = 0;
		const tick = () => {
			const s = player.currentStep();
			if (s !== untrack(() => activeStep)) activeStep = s;
			if (player.finished()) {
				player.reset();
				playing = false;
				activeStep = 0;
				strip?.scrollToStart();
				return;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== ' ') return;
		const tag = (e.target as HTMLElement | null)?.tagName;
		if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
		if (disabled) return;
		e.preventDefault();
		toggle();
	}}
/>

<div class="tab-player">
	<div class="controls">
		<button class="btn secondary" type="button" title="Back to the first note" disabled={disabled} onclick={reset}>
			Reset
		</button>
		<button
			class="btn primary"
			type="button"
			title={playing ? 'Pause the tab' : 'Play the tab'}
			disabled={disabled}
			onclick={toggle}
		>
			{playing ? 'Pause' : 'Play'}
		</button>
		<button
			class="btn secondary"
			type="button"
			title={muted ? 'Unmute the notes' : 'Mute the notes'}
			disabled={disabled}
			onclick={toggleMute}
		>
			{muted ? 'Sound off' : 'Sound on'}
		</button>
		{#if trailing}
			<div class="trailing">{@render trailing()}</div>
		{/if}
	</div>
	<TabPreview bind:this={strip} {preview} {activeStep} follow={playing} />
</div>

<style>
	.controls {
		display: flex;
		align-items: stretch;
		gap: 8px;
		margin-bottom: 12px;
	}

	.trailing {
		margin-left: auto;
		display: flex;
		align-items: stretch;
		gap: var(--space-2);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--component-button-padding-y) var(--component-button-padding-x);
		border-radius: var(--component-button-radius);
		font-family: var(--component-button-font-family);
		font-weight: var(--component-button-font-weight);
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn.primary {
		background: var(--component-button-primary-background);
		color: var(--component-button-primary-text);
	}

	.btn.secondary {
		background: var(--component-button-secondary-background);
		color: var(--component-button-secondary-text);
		border-color: var(--component-button-secondary-border);
	}
</style>
