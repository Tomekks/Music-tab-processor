<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import FolderOutput from '@lucide/svelte/icons/folder-output';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import StepRow from '$lib/components/molecules/StepRow.svelte';
	import TabPlayer from '$lib/components/organisms/TabPlayer.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let stopping = $state(false);
	let awaitingExec = $state<string | undefined>(undefined);

	const step1 = $derived(data.steps.find((s) => s.id === 's01_ingest'));
	const later = $derived(data.steps.filter((s) => s.id !== 's01_ingest'));
	const anyRunning = $derived(data.steps.some((s) => s.status === 'running'));
	const playerKey = $derived(
		`${data.run?.id ?? ''}|${data.tabPreview?.steps.length ?? 0}|${data.tabPreview?.steps.reduce((n, st) => n + st.notes.length, 0) ?? 0}|${data.tabPreview?.steps.at(-1)?.startTimeSec ?? 0}`
	);

	function elapsed(startedAt: string | null): string | null {
		if (!startedAt) return null;
		const sec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
		return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
	}

	function formatSize(bytes: number): string {
		if (bytes < 1000000) return `${Math.max(1, Math.ceil(bytes / 1000))} KB`;
		return `${(bytes / 1000000).toFixed(1)} MB`;
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
		if (f.error === 'trashFailed') return `Could not move the run to the Trash: ${f.reason}`;
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
		if (anyRunning || awaitingExec !== undefined) {
			const id = setInterval(() => {
				if (!document.hidden) invalidate('app:run');
			}, 1000);
			return () => clearInterval(id);
		}
	});

	$effect(() => {
		if (awaitingExec === undefined) return;
		const last = data.lastIngest;
		if (last === null || last.execId !== awaitingExec) return;
		awaitingExec = undefined;
		if (last.outcome === 'done' && last.runId !== null)
			goto('/audio?run=' + encodeURIComponent(last.runId), { invalidateAll: true });
	});
</script>

<h1 class="page-title">Audio processing</h1>

{#if data.run}
	<div class="subtitle-row">
		<p class="subtitle">
			{heading}{#if data.run.sampleRate > 0}
				· {Math.round(data.run.durationSec)}s · {data.run.sampleRate} Hz · {data.run.channels}ch{/if}
		</p>
		<div class="picker-group">
			<form
				method="POST"
				action="?/deleteRun"
				use:enhance={({ cancel }) => {
					if (
						!confirm(
							`Move ${heading ?? data.run?.id} (${data.run?.id}) to the Trash?\n\nThe whole run folder moves (the audio copy and every step's output). You can restore it from the Trash. The history log is kept.`
						)
					) {
						cancel();
						return;
					}
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') await goto('/audio', { invalidateAll: true });
					};
				}}
			>
				<input type="hidden" name="runId" value={data.run.id} />
				<button class="btn secondary" type="submit" disabled={data.busy}>Delete</button>
			</form>
			<form method="GET" action="/audio">
				<select name="run" value={data.run?.id} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
					{#each data.runs as run}
						<option value={run.id}>{run.label}</option>
					{/each}
				</select>
			</form>
		</div>
	</div>
{:else}
	<div class="subtitle-row">
		<p class="subtitle">No runs yet</p>
		<div class="picker-group">
			<form method="POST" action="?/deleteRun">
				<button class="btn secondary" type="submit" disabled>Delete</button>
			</form>
			<select disabled><option>No runs yet</option></select>
		</div>
	</div>
{/if}

{#if formError}
	<p class="error">{actionErrorText(formError)}</p>
{/if}

{#if data.runNotFound}
	<p>Run not found; showing the newest run.</p>
{/if}

{#if data.run}
	{#key playerKey}<TabPlayer preview={data.tabPreview} />{/key}
{/if}

{#if step1}
	<StepRow
		title="1. {step1.label}"
		status={step1.status}
		outcome={step1.outcome}
		elapsed={step1.status === 'running' ? elapsed(step1.startedAt) : null}
		log={step1.log}
	>
		{#snippet before()}
			{#if data.picked}
				<span class="picked" title={data.picked.name}
					>{data.picked.name} ({formatSize(data.picked.size)})</span
				>
			{/if}
			<form method="POST" action="?/browse" use:enhance>
				<button class="btn secondary" type="submit" disabled={step1.status === 'running'}>
					Browse
				</button>
			</form>
		{/snippet}
		{#snippet notice()}
			{#if form?.invalid}
				<span class="error">{form.invalid}{#if data.picked} Keeping {data.picked.name}.{/if}</span>
			{:else if form?.browseFailed}
				<span class="error">Browse failed: {form.browseFailed}</span>
			{/if}
		{/snippet}
		{#snippet after()}
			<form method="POST" action="?/reveal" use:enhance>
				<input type="hidden" name="stage" value={step1.id} />
				<input type="hidden" name="runId" value={data.run?.id ?? ''} />
				<button
					class="btn secondary icon"
					type="submit"
					disabled={!step1.canReveal}
					title="Show in Finder"
					aria-label="Show in Finder"><FolderOutput size={16} aria-hidden="true" /></button
				>
			</form>
			<form
				method="POST"
				action="?/start"
				use:enhance={() => async ({ result, update }) => {
					await update();
					if (result.type === 'success' && typeof result.data?.execId === 'string') {
						awaitingExec = result.data.execId;
						setTimeout(() => (awaitingExec = undefined), 60000);
					}
				}}
			>
				<button
					class="btn primary"
					type="submit"
					disabled={step1.status === 'running' || !data.picked}
					title="Ingest the picked file as a new run"
				>
					Start
				</button>
			</form>
		{/snippet}
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
		{#snippet before()}
			{#if !step.canStart && step.reason && step.status !== 'running'}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex: the span needs keyboard focus for its tooltip -->
				<span class="warn" tabindex="0" role="img" aria-label={step.reason} data-tip={step.reason}
					><TriangleAlert size={16} aria-hidden="true" /></span
				>
			{/if}
		{/snippet}
		{#snippet after()}
			<form method="POST" action="?/reveal" use:enhance>
				<input type="hidden" name="stage" value={step.id} />
				<input type="hidden" name="runId" value={data.run?.id ?? ''} />
				<button
					class="btn secondary icon"
					type="submit"
					disabled={!step.canReveal}
					title="Show in Finder"
					aria-label="Show in Finder"><FolderOutput size={16} aria-hidden="true" /></button
				>
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
			{:else}
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
			{/if}
		{/snippet}
	</StepRow>
{/each}

<style>
	.page-title {
		color: var(--foreground);
		margin: 0;
	}

	.subtitle {
		color: var(--foreground);
	}

	.subtitle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.picker-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.warn {
		position: relative;
		display: inline-flex;
		color: var(--foreground);
		cursor: help;
	}

	.warn:hover::after,
	.warn:focus-visible::after {
		content: attr(data-tip);
		position: absolute;
		bottom: calc(100% + 6px);
		right: 0;
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-surface-text);
		font-size: 0.85em;
		z-index: 10;
	}

	.picked {
		color: var(--foreground);
		flex: 0 1 auto;
		min-width: 0;
		max-width: 24rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.error {
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

	.btn.icon {
		padding-inline: var(--component-button-padding-y);
	}
</style>
