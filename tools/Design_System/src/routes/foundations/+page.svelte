<script lang="ts">
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let emptyText = "No color tokens found.";
	let rows = $derived(
		data.tokens.map((token) => ({
			...token,
			descriptionText: token.description === "" ? "(no description yet)" : token.description,
			descriptionColor: token.description === "" ? "#666666" : "inherit",
		}))
	);
	let hasTokens = $derived(rows.length > 0);
</script>

<h1>Foundations</h1>

<section>
	<h2>Preview</h2>
	<iframe
		title="Preview"
		src={data.previewUrl}
		style="width: 100%; height: 420px; border: 1px solid #e0e0e0;"
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
					<span style="color: {token.descriptionColor};">{token.descriptionText}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p>{emptyText}</p>
	{/if}
</section>
