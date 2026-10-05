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
	let rows = $derived(data.tokens);
	let hasTokens = $derived(rows.length > 0);

	$effect(() => {
		if (pickerFor === null) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			if (target.closest("[data-picker-popover]") || target.closest("[data-swatch-button]")) return;
			pickerFor = null;
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") pickerFor = null;
		};
		window.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("keydown", onKeyDown);
		};
	});

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
		<div class="color-list">
			{#each rows as token (token.path)}
				{@const display = displayFor(token.path, token.value)}
				{@const edited = stagedStore.staged[token.path] !== undefined}
				<div class="color-row">
					<div class="color-identity">
						<span>{token.path}</span>
						<code>{token.cssVar}</code>
						{#if edited}
							<span aria-label="Edited">●</span>
						{/if}
						{#if token.description !== ""}
							<button type="button" class="info" title={token.description} aria-label={token.description}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<path d="M12 16v-4"></path>
									<path d="M12 8h.01"></path>
								</svg>
								<span class="tooltip" aria-hidden="true">{token.description}</span>
							</button>
						{/if}
					</div>
					<input
						class="hex-input"
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
					<button
						type="button"
						data-swatch-button
						aria-label="Pick a color for {token.path}"
						title="Pick a color for {token.path}"
						onclick={() => {
							pickerFor = pickerFor === token.path ? null : token.path;
						}}
						style="width: 32px; height: 32px; background: {display}; border: 1px solid #e0e0e0; border-radius: 0; cursor: pointer; padding: 0;"
					></button>
					{#if pickerFor === token.path}
						<div class="picker-popover" data-picker-popover>
							<ColorPicker
								hex={display}
								isDialog={false}
								isAlpha={false}
								onInput={(color) => pick(token.path, token.value, color.hex)}
							/>
						</div>
					{/if}
					{#if errors[token.path]}
						<span class="row-error">{errors[token.path]}</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p>{emptyText}</p>
	{/if}
</section>

<style>
	.color-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.color-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 110px 32px;
		gap: 12px;
		align-items: center;
		padding: 16px 0;
		border-bottom: 1px solid #e0e0e0;
		position: relative;
	}
	.color-list > .color-row:last-child {
		border-bottom: none;
	}
	.color-identity {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.hex-input {
		width: 110px;
	}
	.info {
		position: relative;
		display: inline-flex;
		color: #666666;
		cursor: help;
		background: none;
		border: none;
		padding: 0;
	}
	.info svg {
		width: 16px;
		height: 16px;
	}
	.tooltip {
		display: none;
		position: absolute;
		left: 50%;
		bottom: 100%;
		transform: translateX(-50%);
		margin-bottom: 6px;
		background: #1a1a1a;
		color: #ffffff;
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 4px;
		white-space: nowrap;
		z-index: 30;
	}
	.info:hover .tooltip,
	.info:focus .tooltip,
	.info:focus-visible .tooltip {
		display: block;
	}
	.picker-popover {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 20;
		background: #ffffff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		padding: 12px;
	}
	.row-error {
		grid-column: 1 / -1;
	}
</style>
