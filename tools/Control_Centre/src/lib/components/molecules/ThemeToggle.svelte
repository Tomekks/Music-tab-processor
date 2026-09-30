<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { nextTheme, THEME_STORAGE_KEY, type ThemeMode } from '$lib/theme';

	let mode = $state<ThemeMode>('light');

	onMount(() => {
		const current = document.documentElement.dataset.theme;
		mode = current === 'dark' ? 'dark' : 'light';
	});

	function toggle() {
		if (!browser) return;
		const next = nextTheme(mode);
		mode = next;
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Private browsing etc: the theme still applies to this page load.
		}
	}
</script>

<button
	class="btn secondary icon"
	type="button"
	onclick={toggle}
	aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if mode === 'dark'}
		<Sun size={16} aria-hidden="true" />
	{:else}
		<Moon size={16} aria-hidden="true" />
	{/if}
</button>

<style>
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

	.btn.secondary {
		background: var(--component-button-secondary-background);
		color: var(--component-button-secondary-text);
		border-color: var(--component-button-secondary-border);
	}

	.btn.icon {
		padding-inline: var(--component-button-padding-y);
	}
</style>
