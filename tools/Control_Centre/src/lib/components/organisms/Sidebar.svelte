<script lang="ts">
	import NavItem from '../molecules/NavItem.svelte';

	interface NavEntry {
		label: string;
		href: string;
		external?: boolean;
	}

	interface Props {
		items: NavEntry[];
		activePath: string;
	}

	let { items, activePath }: Props = $props();
</script>

<nav class="sidebar" aria-label="Modules">
	{#each items as item (item.href)}
		<NavItem
			label={item.label}
			href={item.href}
			external={item.external ?? false}
			active={!item.external && item.href === activePath}
		/>
	{/each}
</nav>

<style>
	.sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: color-mix(in srgb, var(--foreground) 6%, var(--background));
		padding: var(--space-6) var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
</style>
