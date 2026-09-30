<script lang="ts">
	import ThemeToggle from '$lib/components/molecules/ThemeToggle.svelte';

	interface Props {
		title: string;
	}

	let { title }: Props = $props();
</script>

<header class="app-header">
	<span class="title">{title}</span>
	<span class="toggle"><ThemeToggle /></span>
</header>

<style>
	.app-header {
		height: 72px;
		display: flex;
		align-items: center;
		padding: 0 64px 0 var(--space-8);
		border-bottom: 1px solid var(--color-border);
		background: var(--background);
		color: var(--foreground);
	}

	.title {
		font-weight: var(--component-text-app-header-title-font-weight);
	}

	.toggle {
		margin-left: auto;
		display: inline-flex;
	}
</style>
