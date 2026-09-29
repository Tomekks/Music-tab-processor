<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import StepRow from '$lib/components/molecules/StepRow.svelte';

	let { data } = $props();

	$effect(() => {
		if (data.step.status === 'running') {
			const id = setInterval(() => {
				if (!document.hidden) invalidate('app:run');
			}, 1000);
			return () => clearInterval(id);
		}
	});
</script>

<h1 class="page-title">Audio processing</h1>

<StepRow title="1. Ingestion" status={data.step.status} log={data.logTail}>
	{#if data.picked}
		<span class="picked">{data.picked.name} ({data.picked.size} bytes)</span>
	{/if}
	<form method="POST" action="?/browse" use:enhance>
		<button class="btn secondary" type="submit" disabled={data.step.status === 'running'}>
			Browse
		</button>
	</form>
	<form method="POST" action="?/start" use:enhance>
		<button
			class="btn primary"
			type="submit"
			disabled={data.step.status === 'running' || !data.picked}
		>
			Start
		</button>
	</form>
</StepRow>

{#if data.run}
	<p class="run">
		{data.run.title}{#if data.run.artist} — {data.run.artist}{/if}
		· {Math.round(data.run.durationSec)}s · {data.run.sampleRate} Hz · {data.run.channels}ch
	</p>
{/if}

<style>
	.page-title {
		color: var(--foreground);
		margin: 0;
	}

	.picked {
		color: var(--foreground);
	}

	.run {
		color: var(--foreground);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--component-button-padding-y) var(--component-button-padding-x);
		border-radius: var(--component-button-radius);
		font-family: var(--component-button-font-family);
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
