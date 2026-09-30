<script lang="ts">
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';

	interface Props {
		title: string;
		status: 'notStarted' | 'running' | 'done' | 'failed' | 'stopped';
		outcome?: 'done' | 'failed' | 'interrupted' | 'stopped' | null;
		noRecord?: boolean;
		outOfDate?: boolean;
		elapsed?: string | null;
		log: string;
		before?: Snippet;
		after?: Snippet;
		notice?: Snippet;
	}

	let { title, status, outcome = null, noRecord = false, outOfDate = false, elapsed = null, log, before, after, notice }: Props = $props();

	const labels: Record<Props['status'], { glyph: string; text: string }> = {
		notStarted: { glyph: '○', text: 'Not started' },
		running: { glyph: '●', text: 'Running' },
		done: { glyph: '●', text: 'Done' },
		failed: { glyph: '●', text: 'Failed' },
		stopped: { glyph: '○', text: 'Stopped' }
	};

	const doneText = $derived(
		'Done' + (noRecord ? ' (no record)' : '') + (outOfDate ? ' · Out of date' : '')
	);

	const label = $derived(
		status === 'failed' && outcome === 'interrupted'
			? { glyph: '●', text: 'Interrupted' }
			: status === 'running' && elapsed
				? { glyph: '●', text: `Running · ${elapsed}` }
				: status === 'done'
					? { glyph: labels.done.glyph, text: doneText }
					: labels[status]
	);

	const dotClass = $derived(
		status === 'failed' && outcome === 'interrupted'
			? 'error'
			: status === 'failed'
				? 'failed'
				: status === 'done'
					? 'done'
					: status === 'running'
						? 'running'
						: ''
	);

	let open = $state(false);
	let previousReal: boolean | null = null;
	let autoOpened = false;
	$effect(() => {
		const real = status === 'failed' && outcome === 'failed';
		if (real && previousReal === false) {
			open = true;
			autoOpened = true;
		} else if (status === 'running' && autoOpened) {
			open = false;
			autoOpened = false;
		}
		previousReal = real;
	});

	let copied = $state(false);

	async function copyLog() {
		try {
			await navigator.clipboard.writeText(log);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch (err) {
			console.error(err);
		}
	}
</script>

<section class="step">
	<div class="row">
		<div class="title-area">
			<h2 class="title">{title}</h2>
			{#if status === 'running'}
				<span class="spinner" aria-hidden="true"></span>
			{/if}
		</div>
		<span class="status"><span class="dot {dotClass}">{label.glyph}</span> {label.text}</span>
		<div class="controls">
			{@render before?.()}
			<button class="log-toggle" type="button" onclick={() => { open = !open; autoOpened = false; }} aria-expanded={open}>
				Log {open ? '▾' : '▸'}
			</button>
			{@render after?.()}
		</div>
	</div>
	{#if notice}
		<div class="notice">{@render notice()}</div>
	{/if}
	{#if open}
		<div class="log-wrap">
			<button
				type="button"
				class="copy"
				aria-label="Copy log"
				title="Copy log"
				disabled={log === ''}
				onclick={copyLog}
			>
				{#if copied}
					<Check size={16} aria-hidden="true" />
				{:else}
					<Copy size={16} aria-hidden="true" />
				{/if}
			</button>
			<pre class="log">{log}</pre>
		</div>
	{/if}
</section>

<style>
	.step {
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--color-border);
	}

	.row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.title-area {
		flex: 0 0 15rem;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.title {
		margin: 0;
		color: var(--foreground);
	}

	.status {
		flex: 0 0 auto;
		min-width: 10rem;
		white-space: nowrap;
		color: var(--foreground);
	}

	.dot.done {
		color: var(--status-done);
	}

	.dot.failed {
		color: var(--status-failed);
	}

	.dot.error {
		color: var(--status-error);
	}

	.dot.running {
		color: var(--color-accent);
	}

	.spinner {
		flex: 0 0 auto;
		width: 0.9em;
		height: 0.9em;
		border: 2px solid var(--color-accent);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			border-top-color: var(--color-accent);
		}
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.notice {
		padding-top: var(--space-2);
	}

	.log-toggle {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--foreground);
		flex: 0 0 auto;
	}

	.log-wrap {
		position: relative;
	}

	.copy {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: inline-flex;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--foreground);
	}

	.copy:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.log {
		margin: var(--space-2) 0 0;
		padding: var(--space-2);
		padding-right: 2.5rem;
		min-height: 3rem;
		background: var(--color-surface);
		color: var(--color-surface-text);
		overflow: auto;
		max-height: 20rem;
		white-space: pre-wrap;
	}
</style>
