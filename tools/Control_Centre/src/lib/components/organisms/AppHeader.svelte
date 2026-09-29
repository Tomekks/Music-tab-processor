<script lang="ts">
	interface Props {
		title: string;
	}

	let { title }: Props = $props();
</script>

<header class="app-header">
	<span class="title">{title}</span>
</header>

<style>
	.app-header {
		height: 72px;
		display: flex;
		align-items: center;
		padding: 0 var(--space-8);
		border-bottom: 1px solid var(--color-border);
		background: var(--background);
		color: var(--foreground);
	}
</style>
