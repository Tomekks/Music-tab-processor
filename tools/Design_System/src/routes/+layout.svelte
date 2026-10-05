<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";
	import { COMPONENTS } from "$lib/registry.js";
	import { stagedStore } from "$lib/staged.svelte.js";

	let { children }: { children: Snippet } = $props();

	let foundationsActive = $derived(page.url.pathname === "/foundations");
	let changeCount = $derived(stagedStore.count);
	let unsavedLabel = $derived(
		changeCount === 1 ? "1 unsaved change" : `${changeCount} unsaved changes`
	);
	let showChanges = $state(false);

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
			<button disabled>Save</button>
			{#if showChanges}
				<div class="changes">
					{#if changeCount > 0}
						<ul>
							{#each Object.entries(stagedStore.staged) as [path, entry] (path)}
								<li>
									<span>{path}</span>
									<span
										aria-hidden="true"
										style="display: inline-block; width: 16px; height: 16px; background: {entry.was}; border: 1px solid #e0e0e0;"
									></span>
									<code>{entry.was}</code>
									<span>→</span>
									<span
										aria-hidden="true"
										style="display: inline-block; width: 16px; height: 16px; background: {entry.now}; border: 1px solid #e0e0e0;"
									></span>
									<code>{entry.now}</code>
								</li>
							{/each}
						</ul>
					{:else}
						<p>No unsaved changes.</p>
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
		min-width: 320px;
		max-height: 320px;
		overflow-y: auto;
		background: #ffffff;
		border: 1px solid #e0e0e0;
		padding: 12px 16px;
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
