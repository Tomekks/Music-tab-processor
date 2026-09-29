<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		status: 'notStarted' | 'running' | 'done' | 'failed';
		log: string;
		children?: Snippet;
	}

	let { title, status, log, children }: Props = $props();

	const labels: Record<Props['status'], { glyph: string; text: string }> = {
		notStarted: { glyph: '○', text: 'Not started' },
		running: { glyph: '●', text: 'Running' },
		done: { glyph: '●', text: 'Done' },
		failed: { glyph: '●', text: 'Failed' }
	};

	let open = $state(false);
	$effect(() => {
		if (status === 'failed') open = true;
	});
</script>

<section class="step">
	<div class="row">
		<h2 class="title">{title}</h2>
		<span class="status {status}">{labels[status].glyph} {labels[status].text}</span>
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

	.title {
		margin: 0;
		color: var(--foreground);
		flex: 0 0 12rem;
	}

	.status {
		flex: 0 0 10rem;
		color: var(--foreground);
	}

	.status.running {
		color: var(--color-accent);
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
