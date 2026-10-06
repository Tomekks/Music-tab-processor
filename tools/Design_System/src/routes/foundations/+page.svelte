<script lang="ts">
	import type { PageData } from "./$types";
	import { onMount } from "svelte";
	import ColorPicker from "svelte-awesome-color-picker";
	import { normalizeColor } from "$lib/colorEdit.js";
	import { previewVars } from "$lib/stagedEdits.js";
	import { stagedStore } from "$lib/staged.svelte.js";
	import { isPreviewReady, readPreviewHeight } from "$lib/previewHeight.js";
	import { pickerPosition } from "$lib/pickerPosition.js";

	let { data }: { data: PageData } = $props();

	const PREVIEW_ORIGIN = "http://localhost:3000";

	let frame: HTMLIFrameElement | null = $state(null);
	let previewHeight = $state(420);

	let drafts: Record<string, string> = $state({});
	let errors: Record<string, string> = $state({});
	let pickerFor: string | null = $state(null);
	let pickerPos: { left: number; top: number } | null = $state(null);
	let anchorRect: { x: number; y: number; width: number; height: number } | null = null;
	let popoverEl: HTMLDivElement | null = $state(null);
	let pickerSessionContinued = $state(false);
	let editingPath: string | null = $state(null);
	let listHeight = $state(0);
	let maxListHeight = $state(0);
	let lastTokens = data.tokens;

	function sectionLabel(section: string): string {
		const short = section.startsWith("semantic.") ? section.slice("semantic.".length) : section;
		return short.charAt(0).toUpperCase() + short.slice(1);
	}

	let sections = $derived([...new Set(data.tokens.map((token) => token.section))]);
	let selectedSection = $state(data.tokens[0]?.section ?? "");

	$effect(() => {
		if (!selectedSection && sections.length > 0) selectedSection = sections[0];
	});

	let emptyText = "No color tokens found.";
	let rows = $derived(data.tokens.filter((token) => token.section === selectedSection));
	let hasTokens = $derived(rows.length > 0);

	$effect(() => {
		const current = data.tokens;
		if (current !== lastTokens) {
			lastTokens = current;
			maxListHeight = 0;
		} else if (listHeight > maxListHeight) {
			maxListHeight = listHeight;
		}
	});

	$effect(() => {
		stagedStore.sync(data.tokens, data.version);
	});

	$effect(() => {
		if (pickerFor === null) {
			pickerSessionContinued = false;
			pickerPos = null;
			anchorRect = null;
		}
	});

	$effect(() => {
		if (pickerFor === null) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;
			if (target.closest("[data-picker-popover]") || target.closest("[data-swatch-button]")) return;
			pickerFor = null;
			pickerSessionContinued = false;
			pickerPos = null;
			anchorRect = null;
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				pickerFor = null;
				pickerSessionContinued = false;
				pickerPos = null;
				anchorRect = null;
			}
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
		pickerSessionContinued = false;
		const raw = drafts[path] ?? "";
		const next = normalizeColor(raw);
		if (next === null) {
			errors[path] = "Not a solid color — kept the old value.";
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
		const replace = pickerSessionContinued;
		stagedStore.stage(path, fileValue, next, replace);
		pickerSessionContinued = true;
		drafts[path] = next;
		sendTokens();
	}

	function openPicker(path: string, anchor: HTMLElement | null) {
		if (pickerFor === path) {
			pickerFor = null;
			pickerSessionContinued = false;
			pickerPos = null;
			anchorRect = null;
			return;
		}
		if (anchor) {
			const rect = anchor.getBoundingClientRect();
			anchorRect = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
			pickerPos = pickerPosition(
				anchorRect,
				{ width: 280, height: 360 },
				{ width: window.innerWidth, height: window.innerHeight },
			);
		}
		pickerFor = path;
		pickerSessionContinued = false;
	}

	$effect(() => {
		if (pickerFor === null || !popoverEl || !anchorRect) return;
		const width = popoverEl.offsetWidth || 280;
		const height = popoverEl.offsetHeight || 360;
		pickerPos = pickerPosition(
			anchorRect,
			{ width, height },
			{ width: window.innerWidth, height: window.innerHeight },
		);
	});

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
	<div role="tablist" aria-label="Color sections" class="tabs">
		{#each sections as section (section)}
			<button
				type="button"
				role="tab"
				aria-selected={section === selectedSection}
				class="tab"
				onclick={() => {
					selectedSection = section;
				}}
			>
				{sectionLabel(section)}
			</button>
		{/each}
	</div>
	{#if hasTokens}
		<div class="color-list" bind:clientHeight={listHeight} style="min-height: {maxListHeight}px">
			{#each rows as token (token.path)}
				{@const display = displayFor(token.path, token.value)}
				{@const edited = stagedStore.staged[token.path] !== undefined}
				{@const varName = token.cssVar.startsWith("--") ? token.cssVar.slice(2) : token.cssVar}
				{@const tip = token.description !== "" ? token.description : "No description yet"}
				<div class="color-row">
					<button
						type="button"
						data-swatch-button
						aria-label="Pick a color for {varName}"
						title="Pick a color for {varName}"
						onclick={(event) => {
							openPicker(token.path, event.currentTarget);
						}}
						style="width: 32px; height: 32px; background: {display}; border: 1px solid #e0e0e0; border-radius: 0; cursor: pointer; padding: 0;"
					></button>
					<input
						class="hex-input"
						aria-label="Hex value for {varName}"
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
					<div class="color-identity">
						<code>{varName}</code>
						{#if edited}
							<button
								type="button"
								class="edited"
								aria-label="Reset {varName}"
								onclick={() => {
									stagedStore.stage(token.path, token.value, token.value);
									delete errors[token.path];
									drafts[token.path] = token.value;
								}}
							>Reset</button>
							{#if token.isAlias}
								<span class="unlink">Will unlink from main</span>
							{/if}
						{/if}
						<button
							type="button"
							class={token.description !== "" ? "info" : "info dimmed"}
							aria-label={tip}
						>
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
							<span class="tooltip" aria-hidden="true" data-testid="tooltip">{tip}</span>
						</button>
					</div>
					{#if pickerFor === token.path}
						<div
							class="picker-popover"
							data-picker-popover
							bind:this={popoverEl}
							style={pickerPos
								? `position: fixed; left: ${pickerPos.left}px; top: ${pickerPos.top}px;`
								: "position: fixed;"}
						>
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
		grid-template-columns: 32px 110px minmax(0, 1fr);
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
	.tabs {
		display: flex;
		gap: 8px;
		margin: 0 0 12px;
	}
	.tab {
		background: none;
		border: none;
		padding: 4px 8px;
		cursor: pointer;
		color: #444444;
	}
	.tab[aria-selected="true"] {
		font-weight: 600;
		text-decoration: underline;
		color: #111111;
	}
	.edited {
		font-size: 12px;
		color: #666666;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
	}
	.unlink {
		font-size: 12px;
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
	.info.dimmed {
		color: #b0b0b0;
	}
	.info svg {
		width: 16px;
		height: 16px;
	}
	.tooltip {
		display: none;
		position: absolute;
		right: 0;
		left: auto;
		bottom: 100%;
		transform: none;
		margin-bottom: 6px;
		background: #1a1a1a;
		color: #ffffff;
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 4px;
		white-space: normal;
		width: max-content;
		max-width: 240px;
		z-index: 30;
	}
	.info:hover .tooltip,
	.info:focus .tooltip,
	.info:focus-visible .tooltip {
		display: block;
	}
	.picker-popover {
		position: fixed;
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
