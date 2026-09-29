<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import StepRow from '$lib/components/molecules/StepRow.svelte';
	import TabPreview from '$lib/components/molecules/TabPreview.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let stopping = $state(false);

	const step1 = $derived(data.steps.find((s) => s.id === 's01_ingest'));
	const later = $derived(data.steps.filter((s) => s.id !== 's01_ingest'));
	const anyRunning = $derived(data.steps.some((s) => s.status === 'running'));

	function elapsed(startedAt: string | null): string | null {
		if (!startedAt) return null;
		const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
		return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
	}

	const heading = $derived(
		data.run ? `${data.run.title}${data.run.artist ? ` — ${data.run.artist}` : ''}` : null
	);

	function actionErrorText(f: { error: string; reason?: string }): string {
		if (f.error === 'badStage') return 'Unknown stage.';
		if (f.error === 'badRun') return 'Unknown run.';
		if (f.error === 'nothingToShow') return 'Nothing to show for that step yet.';
		if (f.error === 'nothingToStop') return 'Nothing is running to stop.';
		if (f.error === 'stopFailed') return f.reason ?? 'Could not stop the step.';
		if (f.error === 'revealFailed') {
			return f.reason ? `Could not open Finder: ${f.reason}` : 'Could not open Finder.';
		}
		return f.reason ?? 'Not allowed right now.';
	}

	function stopConfirmText(step: { label: string; stopPreview: string[] }): string {
		const files =
			step.stopPreview.length > 0
				? `Files to delete:\n  ${step.stopPreview.join('\n  ')}`
				: 'No files written yet; only the process will be stopped.';
		return `Stop ${step.label}?\n\n${files}\n\nEarlier outputs from before this run are not touched.`;
	}

	function overwriteConfirmText(step: { label: string; overwritePreview: string[] }): string {
		const files =
			step.overwritePreview.length > 0
				? `Files to overwrite:\n  ${step.overwritePreview.join('\n  ')}`
				: 'No files to overwrite.';
		return `Re-run ${step.label}? These results were made outside Control Center and will be replaced.\n\n${files}`;
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
	<p class="subtitle">{heading} · {data.run.id}</p>
{:else}
	<p class="subtitle">No runs yet</p>
{/if}

{#if formError}
	<p class="error">{actionErrorText(formError)}</p>
{/if}

{#if data.runs.length > 0}
	<form method="GET" action="/audio">
		<select name="run" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			{#each data.runs as run}
				<option value={run.id} selected={run.id === data.run?.id}>{run.label}</option>
			{/each}
		</select>
	</form>
{/if}

{#if data.runNotFound}
	<p>Run not found; showing the newest run.</p>
{/if}

{#if data.run}
	<TabPreview preview={data.tabPreview} />
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
		<form
			method="POST"
			action="?/start"
			use:enhance={() => async ({ result, update }) => {
				await update();
				if (result.type === 'success') await goto('/audio', { invalidateAll: true });
			}}
		>
			<button
				class="btn primary"
				type="submit"
				disabled={step1.status === 'running' || !data.picked}
			>
				Start
			</button>
		</form>
		<form method="POST" action="?/reveal" use:enhance>
			<input type="hidden" name="stage" value={step1.id} />
			<input type="hidden" name="runId" value={data.run?.id ?? ''} />
			<button class="btn secondary" type="submit" disabled={!step1.canReveal}>Show in Finder</button>
		</form>
	</StepRow>
{/if}

{#each later as step, i}
	<StepRow
		title="{i + 2}. {step.label}"
		status={step.status}
		outcome={step.outcome}
		noRecord={step.noRecord}
		outOfDate={step.outOfDate}
		elapsed={step.status === 'running' ? elapsed(step.startedAt) : null}
		log={step.log}
	>
		<form
			method="POST"
			action="?/startStage"
			use:enhance={({ cancel, formData }) => {
				if (step.noRecord) {
					if (!confirm(overwriteConfirmText(step))) {
						cancel();
						return;
					}
					formData.set('confirmed', '1');
				}
			}}
		>
			<input type="hidden" name="stage" value={step.id} />
			<input type="hidden" name="runId" value={data.run?.id ?? ''} />
			<button class="btn primary" type="submit" disabled={!step.canStart}> Start </button>
		</form>
		{#if step.canStop}
			<form
				method="POST"
				action="?/stopStage"
				use:enhance={({ cancel }) => {
					if (!confirm(stopConfirmText(step))) {
						cancel();
						return;
					}
					stopping = true;
					return async ({ update }) => {
						await update();
						stopping = false;
					};
				}}
			>
				<input type="hidden" name="stage" value={step.id} />
				<input type="hidden" name="runId" value={data.run?.id ?? ''} />
				<button class="btn secondary" type="submit" disabled={stopping}>Stop</button>
			</form>
		{/if}
		<form method="POST" action="?/reveal" use:enhance>
			<input type="hidden" name="stage" value={step.id} />
			<input type="hidden" name="runId" value={data.run?.id ?? ''} />
			<button class="btn secondary" type="submit" disabled={!step.canReveal}>Show in Finder</button>
		</form>
		{#if !step.canStart && step.reason}
			<span class="reason">{step.reason}</span>
		{/if}
	</StepRow>
{/each}

{#if data.run}
	<p class="run">
		{heading} · {Math.round(data.run.durationSec)}s · {data.run.sampleRate} Hz · {data.run.channels}ch
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
