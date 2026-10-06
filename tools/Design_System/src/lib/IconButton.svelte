<script lang="ts">
	import type { Component } from "svelte";

	let {
		icon: Icon,
		label,
		pressed,
		onclick,
	}: {
		icon: Component;
		label: string;
		pressed: boolean;
		onclick: () => void;
	} = $props();
</script>

<button type="button" aria-label={label} title={label} aria-pressed={pressed} onclick={onclick}>
	<Icon size={20} aria-hidden="true" />
</button>

<style>
	button {
		width: 44px;
		height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: #1a1a1a;
		cursor: pointer;
		padding: 0;
	}

	button:hover {
		background: #f0f0f0;
	}

	button:focus-visible {
		outline: 2px solid #1a1a1a;
		outline-offset: 2px;
	}
</style>
