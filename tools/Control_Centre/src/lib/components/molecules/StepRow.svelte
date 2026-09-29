<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		status: 'notStarted' | 'running' | 'done' | 'failed';
		outcome?: 'done' | 'failed' | 'interrupted' | null;
		elapsed?: string | null;
		log: string;
		children?: Snippet;
	}

	let { title, status, outcome = null, elapsed = null, log, children }: Props = $props();

	const labels: Record<Props['status'], { glyph: string; text: string }> = {
		notStarted: { glyph: '○', text: 'Not started' },
		running: { glyph: '●', text: 'Running' },
		done: { glyph: '●', text: 'Done' },
		failed: { glyph: '●', text: 'Failed' }
	};

	const label = $derived(
		status === 'failed' && outcome === 'interrupted'
			? { glyph: '●', text: 'Interrupted' }
			: status === 'running' && elapsed
				? { glyph: '●', text: `Running · ${elapsed}` }
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
	$effect(() => {
		if (status === 'failed') open = true;
	});
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
			{@render children?.()}
		</div>
		<button class="log-toggle" type="button" onclick={() => (open = !open)} aria-expanded={open}>
			Log {open ? '▾' : '▸'}
		</button>
	</div>
	{#if open}
		<pre class="log">{log}</pre>
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
		flex: 0 0 10rem;
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

	.log-toggle {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--foreground);
		flex: 0 0 auto;
	}

	.log {
		margin: var(--space-2) 0 0;
		padding: var(--space-2);
		background: var(--color-surface);
		color: var(--color-surface-text);
		overflow: auto;
		max-height: 20rem;
		white-space: pre-wrap;
	}
</style>
