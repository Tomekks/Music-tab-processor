<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";
	import { COMPONENTS } from "$lib/registry.js";

	let { children }: { children: Snippet } = $props();

	let foundationsActive = $derived(page.url.pathname === "/foundations");
</script>

<div class="shell">
	<header class="topbar">
		<span class="title">Design System</span>
		<button disabled>Save</button>
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

	.body {
		display: grid;
		grid-template-columns: 280px 1fr 320px;
		min-height: 0;
	}

	.sidebar {
		overflow-y: auto;
		border-right: 1px solid #e0e0e0;
		padding: 16px;
	}

	.canvas {
		overflow-y: auto;
		padding: 32px;
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
