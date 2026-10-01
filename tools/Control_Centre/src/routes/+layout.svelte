<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '@fontsource-variable/geist';
	import '@fontsource-variable/geist-mono';
	import '../lib/design-tokens.css';
	import AppHeader from '$lib/components/organisms/AppHeader.svelte';
	import Sidebar from '$lib/components/organisms/Sidebar.svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<AppHeader title="Control Center" />
	<div class="body">
		<Sidebar items={data.nav} activePath={page.url.pathname} />
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--background);
		color: var(--foreground);
	}

	.body {
		display: flex;
		flex: 1;
	}

	.content {
		flex: 1;
		min-width: 0;
		padding: 40px 64px;
	}
</style>
