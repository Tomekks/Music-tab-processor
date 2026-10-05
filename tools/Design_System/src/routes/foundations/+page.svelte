<script lang="ts">
	import type { PageData } from "./$types";
	import { onMount } from "svelte";
	import ColorPicker from "svelte-awesome-color-picker";
	import { normalizeColor } from "$lib/colorEdit.js";
	import { previewVars } from "$lib/stagedEdits.js";
	import { stagedStore } from "$lib/staged.svelte.js";
	import { isPreviewReady, readPreviewHeight } from "$lib/previewHeight.js";

	let { data }: { data: PageData } = $props();

	const PREVIEW_ORIGIN = "http://localhost:3000";

	let frame: HTMLIFrameElement | null = $state(null);
	let previewHeight = $state(420);

	let drafts: Record<string, string> = $state({});
	let errors: Record<string, string> = $state({});
	let pickerFor: string | null = $state(null);
	let editingPath: string | null = $state(null);

	let emptyText = "No color tokens found.";
	let rows = $derived(
		data.tokens.map((token) => ({
			...token,
			descriptionText: token.description === "" ? "(no description yet)" : token.description,
			descriptionColor: token.description === "" ? "#666666" : "inherit",
		}))
	);
	let hasTokens = $derived(rows.length > 0);

	function displayFor(path: string, fileValue: string): string {
		return stagedStore.staged[path]?.now ?? fileValue;
	}

	$effect(() => {
		const active = editingPath;
		for (const token of data.tokens) {
			if (token.path === active) continue;
			drafts[token.path] = displayFor(token.path, token.value);
		}
	});

	function sendTokens() {
		const target = frame?.contentWindow;
		if (!target) return;
		const vars = previewVars(data.tokens, stagedStore.staged);
		target.postMessage({ type: "tokens", vars }, PREVIEW_ORIGIN);
	}

	$effect(() => {
		void stagedStore.staged;
		sendTokens();
	});

	function commit(path: string, fileValue: string) {
		editingPath = null;
		const raw = drafts[path] ?? "";
		const next = normalizeColor(raw);
		if (next === null) {
			errors[path] = "Invalid color — kept the old value.";
			drafts[path] = displayFor(path, fileValue);
			return;
		}
		delete errors[path];
		stagedStore.stage(path, fileValue, next);
		drafts[path] = displayFor(path, fileValue);
		sendTokens();
	}

	function pick(path: string, fileValue: string, hex: string | null) {
		if (hex === null) return;
		const next = normalizeColor(hex);
		if (next === null) return;
		delete errors[path];
		stagedStore.stage(path, fileValue, next);
		drafts[path] = next;
		sendTokens();
	}

	onMount(() => {
		const onMessage = (event: MessageEvent) => {
			if (isPreviewReady(event.origin, event.source, frame?.contentWindow, event.data)) {
				sendTokens();
				return;
			}
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
		onload={sendTokens}
		style="width: 100%; height: {previewHeight}px; border: 1px solid #e0e0e0; overflow: hidden;"
	></iframe>
</section>

<section>
	<h2>Colors</h2>
	{#if hasTokens}
		<ul>
			{#each rows as token (token.path)}
				{@const display = displayFor(token.path, token.value)}
				{@const edited = stagedStore.staged[token.path] !== undefined}
				<li>
					<button
						type="button"
						aria-label="Pick a color for {token.path}"
						title="Pick a color for {token.path}"
						onclick={() => {
							pickerFor = pickerFor === token.path ? null : token.path;
						}}
						style="display: inline-block; width: 24px; height: 24px; background: {display}; border: 1px solid #e0e0e0; cursor: pointer; padding: 0;"
					></button>
					<span>{token.path}</span>
					<code>{token.cssVar}</code>
					<input
						aria-label="Hex value for {token.path}"
						value={drafts[token.path] ?? display}
						oninput={(event) => {
							drafts[token.path] = event.currentTarget.value;
						}}
						onfocus={() => {
							editingPath = token.path;
						}}
						onblur={() => commit(token.path, token.value)}
						onkeydown={(event) => {
							if (event.key === "Enter") {
								event.currentTarget.blur();
							}
						}}
					/>
					{#if edited}
						<span aria-label="Edited">●</span>
					{/if}
					{#if pickerFor === token.path}
						<ColorPicker
							hex={display}
							isDialog={false}
							onInput={(color) => pick(token.path, token.value, color.hex)}
						/>
					{/if}
					{#if errors[token.path]}
						<span>{errors[token.path]}</span>
					{/if}
					<span style="color: {token.descriptionColor}; font-size: 12px; font-weight: 400; display: inline-block; max-width: 320px;">{token.descriptionText}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p>{emptyText}</p>
	{/if}
</section>
