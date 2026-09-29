<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary';
		href?: string;
		external?: boolean;
		children: Snippet;
	}

	let { variant = 'primary', href, external = false, children }: Props = $props();
</script>

{#if href !== undefined}
	<a
		{href}
		class="btn {variant}"
		target={external ? '_blank' : undefined}
		rel={external ? 'noopener noreferrer' : undefined}
	>
		{@render children()}{#if external} ↗{/if}
	</a>
{:else}
	<button class="btn {variant}" type="button">
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--component-button-padding-y) var(--component-button-padding-x);
		border-radius: var(--component-button-radius);
		font-family: var(--component-button-font-family);
		text-decoration: none;
		cursor: pointer;
		border: 1px solid transparent;
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
