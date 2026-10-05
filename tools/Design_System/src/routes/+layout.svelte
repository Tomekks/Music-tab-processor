<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";
	import { COMPONENTS } from "$lib/registry.js";
	import { stagedStore } from "$lib/staged.svelte.js";
	import { invalidateAll } from "$app/navigation";
	import { buildSaveBody, describeSaveFailure, discardedLabel, revertBody, savedLabel } from "$lib/saveState.js";
	// @ts-ignore - untyped package helper (checkJs is off by owner decision)
	import { cssVarNameForPath } from "../../../../app/packages/design-system/src/css-var-naming.mjs";

	let { children }: { children: Snippet } = $props();

	let foundationsActive = $derived(page.url.pathname === "/foundations");
	let changeCount = $derived(stagedStore.count);
	let unsavedLabel = $derived(
		changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`
	);
	let showChanges = $state(false);

	type SaveStatus = { kind: "saved" | "discarded" | "failed" | "changed" | "reverted" | "revert-failed"; text: string };
	let status: SaveStatus | null = $state(null);
	let isSaving = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let countdown: ReturnType<typeof setInterval> | null = null;
	let savedSeconds = $state(5);
	let savedBefore: { path: string; was: string }[] | null = null;
	let statusText = $derived.by(() => {
		const current: SaveStatus | null = status;
		return current === null ? "" : current.text;
	});

	function clearTimer() {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		if (countdown !== null) {
			clearInterval(countdown);
			countdown = null;
		}
	}

	$effect(() => {
		if ((status?.kind === "discarded" || status?.kind === "saved") && changeCount > 0) {
			clearTimer();
			status = null;
		}
	});

	async function save() {
		if (isSaving || changeCount === 0) return;
		clearTimer();
		status = null;
		const before = Object.entries(stagedStore.staged).map(([path, entry]) => ({
			path,
			was: entry.was,
		}));
		isSaving = true;
		try {
			const response = await fetch("/api/save", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(buildSaveBody(stagedStore.staged, stagedStore.loadedVersion ?? "")),
			});
			let reply: { ok?: boolean; saved?: number; code?: string; error?: string } | null =
				null;
			try {
				reply = await response.json();
			} catch {
				reply = null;
			}
			if (response.ok && reply?.ok === true) {
				await invalidateAll();
				savedBefore = before;
				savedSeconds = 5;
				status = { kind: "saved", text: savedLabel(savedSeconds) };
				clearTimer();
				countdown = setInterval(() => {
					savedSeconds -= 1;
					if (savedSeconds < 1) {
						clearTimer();
						status = null;
					} else {
						status = { kind: "saved", text: savedLabel(savedSeconds) };
					}
				}, 1000);
			} else {
				const failure = describeSaveFailure(reply?.code, reply?.error);
				status = { kind: failure.kind, text: failure.message };
			}
		} catch {
			const failure = describeSaveFailure(undefined, undefined);
			status = { kind: failure.kind, text: failure.message };
		} finally {
			isSaving = false;
		}
	}

	async function revert() {
		if (isSaving || savedBefore === null) return;
		clearTimer();
		status = null;
		isSaving = true;
		try {
			const response = await fetch("/api/save", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(revertBody(savedBefore, stagedStore.loadedVersion ?? "")),
			});
			let reply: { ok?: boolean; code?: string; error?: string } | null = null;
			try {
				reply = await response.json();
			} catch {
				reply = null;
			}
			if (response.ok && reply?.ok === true) {
				savedBefore = null;
				await invalidateAll();
				status = { kind: "reverted", text: "Reverted" };
				clearTimer();
				timer = setTimeout(() => {
					status = null;
					timer = null;
				}, 5000);
			} else {
				const failure = describeSaveFailure(reply?.code, reply?.error);
				status = { kind: "revert-failed", text: failure.message };
			}
		} catch {
			const failure = describeSaveFailure(undefined, undefined);
			status = { kind: "revert-failed", text: failure.message };
		} finally {
			isSaving = false;
		}
	}

	function discard() {
		const count = changeCount;
		if (count === 0 || isSaving) return;
		clearTimer();
		stagedStore.discard();
		status = { kind: "discarded", text: discardedLabel(count) };
		timer = setTimeout(() => {
			status = null;
			timer = null;
		}, 5000);
	}

	function undoDiscarded() {
		clearTimer();
		stagedStore.undo();
		status = null;
	}

	function dismiss() {
		clearTimer();
		status = null;
	}

	async function reload() {
		await invalidateAll();
		clearTimer();
		status = null;
	}

	function changeVarName(path: string): string {
		const cssVar = cssVarNameForPath(path) as string | null;
		if (typeof cssVar === "string" && cssVar.startsWith("--")) return cssVar.slice(2);
		if (typeof cssVar === "string") return cssVar;
		return path;
	}

	function onKey(event: KeyboardEvent) {
		if (!event.metaKey || event.key.toLowerCase() !== "z") return;
		const target = document.activeElement as HTMLElement | null;
		if (
			target &&
			(target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
		) {
			return;
		}
		event.preventDefault();
		if (event.shiftKey) {
			stagedStore.redo();
		} else {
			stagedStore.undo();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="shell">
	<header class="topbar">
		<span class="title">Design System</span>
		<div class="controls">
			<button type="button" aria-expanded={showChanges} onclick={() => (showChanges = !showChanges)}>
				{unsavedLabel}
			</button>
			{#if isSaving}
				<button type="button" disabled>Discard</button>
				<button type="button" disabled>Saving...</button>
			{:else if status?.kind === "saved"}
				<span role="status">{statusText}</span>
				<button type="button" onclick={revert}>Revert</button>
			{:else if status?.kind === "reverted"}
				<span role="status">{statusText}</span>
			{:else if status?.kind === "revert-failed"}
				<span role="status">{statusText}</span>
				<button type="button" onclick={dismiss}>Dismiss</button>
			{:else if status?.kind === "discarded"}
				<span role="status">{statusText}</span>
				<button type="button" onclick={undoDiscarded}>Undo</button>
			{:else if status?.kind === "failed"}
				<span role="status">{statusText}</span>
				<button type="button" onclick={dismiss}>Dismiss</button>
				<button type="button" onclick={discard}>Discard</button>
				<button type="button" onclick={save}>Retry save</button>
			{:else if status?.kind === "changed"}
				<span role="status">{statusText}</span>
				<button type="button" onclick={() => (showChanges = true)}>Review changes</button>
				<button type="button" onclick={reload}>Reload</button>
			{:else if changeCount > 0}
				<button type="button" onclick={discard}>Discard</button>
				<button type="button" onclick={save}>Save</button>
			{/if}
			{#if showChanges}
				<div class="changes" data-testid="changes-panel">
					{#if changeCount > 0}
						<div class="change-list">
							{#each Object.entries(stagedStore.staged) as [path, entry] (path)}
								{@const varName = changeVarName(path)}
								<div class="change-row">
									<code>{varName}</code>
									<span
										aria-hidden="true"
										style="display: inline-block; width: 32px; height: 32px; background: {entry.was}; border: 1px solid #e0e0e0;"
									></span>
									<code>{entry.was}</code>
									<span>→</span>
									<span
										aria-hidden="true"
										style="display: inline-block; width: 32px; height: 32px; background: {entry.now}; border: 1px solid #e0e0e0;"
									></span>
									<code>{entry.now}</code>
									<button
										type="button"
										class="reset"
										aria-label="Reset {varName} in changes"
										onclick={() => stagedStore.stage(path, entry.was, entry.was)}
									>Reset</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-changes">No unsaved changes.</p>
					{/if}
				</div>
			{/if}
		</div>
	</header>
	<div class="body">
		<nav class="sidebar" aria-label="Components">
			<span class="row">Glossary</span>
			<a
			class="row link"
			class:active={foundationsActive}
			href="/foundations"
			aria-current={foundationsActive ? "page" : undefined}
		>
			Foundations
		</a>
			<span class="caption">Components</span>
			{#each COMPONENTS as entry (entry.slug)}
				{@const active = page.url.pathname === `/components/${entry.slug}`}
				<a
					class="row link"
					class:active
					href="/components/{entry.slug}"
					aria-current={active ? "page" : undefined}
				>
					{entry.name}
				</a>
			{/each}
		</nav>
		<main class="canvas">
			{@render children()}
		</main>
		<aside class="inspector">Inspector</aside>
	</div>
</div>

<style>
	.shell {
		height: 100vh;
		overflow: hidden;
		display: grid;
		grid-template-rows: 56px 1fr;
		font-family: system-ui, sans-serif;
		color: #1a1a1a;
		background: #ffffff;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		border-bottom: 1px solid #e0e0e0;
	}

	.title {
		font-weight: 700;
	}

	.controls {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.changes {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 10;
		width: max-content;
		max-width: calc(100vw - 32px);
		max-height: 320px;
		overflow-y: auto;
		background: #ffffff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		padding: 16px;
	}

	.change-list {
		display: flex;
		flex-direction: column;
	}

	.change-row {
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
		padding: 12px 0;
		border-bottom: 1px solid #e0e0e0;
	}

	.change-list > .change-row:last-child {
		border-bottom: none;
	}

	.reset {
		font-size: 12px;
		color: #666666;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
	}

	.empty-changes {
		margin: 0;
		color: #666666;
	}

	.body {
		display: grid;
		grid-template-columns: 200px 1fr 320px;
		min-height: 0;
	}

	.sidebar {
		overflow-y: auto;
		border-right: 1px solid #e0e0e0;
		padding: 16px;
	}

	.canvas {
		overflow-y: auto;
		padding: 16px;
		min-width: 0;
	}

	.inspector {
		overflow-y: auto;
		border-left: 1px solid #e0e0e0;
		padding: 24px;
	}

	.row {
		display: block;
		padding: 8px 0;
	}

	.link {
		color: inherit;
		text-decoration: none;
	}

	.active {
		font-weight: 700;
	}

	.caption {
		display: block;
		margin-top: 16px;
		font-size: 12px;
		color: #666666;
	}
</style>
