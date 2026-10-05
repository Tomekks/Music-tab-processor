<script lang="ts">
	import type { PageData } from "./$types";
	import { onMount } from "svelte";
	import { readPreviewHeight } from "$lib/previewHeight.js";

	let { data }: { data: PageData } = $props();

	let frame: HTMLIFrameElement | null = $state(null);
	let previewHeight = $state(420);

	let emptyText = "No color tokens found.";
	let rows = $derived(
		data.tokens.map((token) => ({
			...token,
			descriptionText: token.description === "" ? "(no description yet)" : token.description,
			descriptionColor: token.description === "" ? "#666666" : "inherit",
		}))
	);
	let hasTokens = $derived(rows.length > 0);

	onMount(() => {
		const onMessage = (event: MessageEvent) => {
			const height = readPreviewHeight(
				event.origin,
				event.source,
				frame?.contentWindow,
				event.data
			);
			if (height === null) return;
			previewHeight = height;
		};
		window.addEventListener("message", onMessage);
		return () => {
			window.removeEventListener("message", onMessage);
		};
	});
</script>

<h1>Foundations</h1>

<section>
	<h2>Preview</h2>
	<iframe
		title="Preview"
		src={data.previewUrl}
		bind:this={frame}
		scrolling="no"
		style="width: 100%; height: {previewHeight}px; border: 1px solid #e0e0e0; overflow: hidden;"
	></iframe>
</section>

<section>
	<h2>Colors</h2>
	{#if hasTokens}
		<ul>
			{#each rows as token (token.path)}
				<li>
					<span
						aria-hidden="true"
						style="display: inline-block; width: 24px; height: 24px; background: {token.value}; border: 1px solid #e0e0e0;"
					></span>
					<span>{token.path}</span>
					<code>{token.cssVar}</code>
					<span>{token.value}</span>
					<span style="color: {token.descriptionColor}; font-size: 12px; font-weight: 400; display: inline-block; max-width: 320px;">{token.descriptionText}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p>{emptyText}</p>
	{/if}
</section>
