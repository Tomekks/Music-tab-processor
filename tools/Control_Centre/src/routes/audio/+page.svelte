<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import StepRow from '$lib/components/molecules/StepRow.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const step1 = $derived(data.steps.find((s) => s.id === 's01_ingest'));
	const later = $derived(data.steps.filter((s) => s.id !== 's01_ingest'));
	const anyRunning = $derived(data.steps.some((s) => s.status === 'running'));

	function elapsed(startedAt: string | null): string | null {
		if (!startedAt) return null;
		const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
		return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
	}

	function actionErrorText(f: { error: string; reason?: string }): string {
		if (f.error === 'badStage') return 'Unknown stage.';
		if (f.error === 'badRun') return 'Unknown run.';
		return f.reason ?? 'Not allowed right now.';
	}

	const formError = $derived(
		form && typeof form.error === 'string'
			? {
					error: form.error,
					reason: 'reason' in form && typeof form.reason === 'string' ? form.reason : undefined
				}
			: null
	);

	$effect(() => {
		if (anyRunning) {
			const id = setInterval(() => {
				if (!document.hidden) invalidate('app:run');
			}, 1000);
			return () => clearInterval(id);
		}
	});
</script>

<h1 class="page-title">Audio processing</h1>

{#if data.run}
	<p class="subtitle">
		{data.run.title}{#if data.run.artist} — {data.run.artist}{/if}
		· {data.run.id}
	</p>
{:else}
	<p class="subtitle">No runs yet</p>
{/if}

{#if formError}
	<p class="error">{actionErrorText(formError)}</p>
{/if}

{#if step1}
	<StepRow
		title="1. {step1.label}"
		status={step1.status}
		outcome={step1.outcome}
		elapsed={step1.status === 'running' ? elapsed(step1.startedAt) : null}
		log={step1.log}
	>
		{#if data.picked}
			<span class="picked">{data.picked.name} ({data.picked.size} bytes)</span>
		{/if}
		<form method="POST" action="?/browse" use:enhance>
			<button class="btn secondary" type="submit" disabled={step1.status === 'running'}>
				Browse
			</button>
		</form>
		{#if form?.invalid}
			<span class="error">{form.invalid}</span>
		{:else if form?.browseFailed}
			<span class="error">Browse failed: {form.browseFailed}</span>
		{/if}
		<form method="POST" action="?/start" use:enhance>
			<button
				class="btn primary"
				type="submit"
				disabled={step1.status === 'running' || !data.picked}
			>
				Start
			</button>
		</form>
	</StepRow>
{/if}

{#each later as step, i}
	<StepRow
		title="{i + 2}. {step.label}"
		status={step.status}
		outcome={step.outcome}
		elapsed={step.status === 'running' ? elapsed(step.startedAt) : null}
		log={step.log}
	>
		{#if step.status === 'running'}
			<span class="hint">The log appears when this step ends.</span>
		{/if}
		<form method="POST" action="?/startStage" use:enhance>
			<input type="hidden" name="stage" value={step.id} />
			<input type="hidden" name="runId" value={data.run?.id ?? ''} />
			<button class="btn primary" type="submit" disabled={!step.canStart}> Start </button>
		</form>
		{#if !step.canStart && step.reason}
			<span class="reason">{step.reason}</span>
		{/if}
	</StepRow>
{/each}

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

	.subtitle {
		color: var(--foreground);
	}

	.picked {
		color: var(--foreground);
	}

	.error {
		color: var(--foreground);
	}

	.reason {
		color: var(--foreground);
	}

	.hint {
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
