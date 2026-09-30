<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	interface Props {
		message: string;
		onclose: () => void;
	}

	let { message, onclose }: Props = $props();
</script>

<div class="toast" role="status">
	<span>{message}</span>
	<button type="button" class="close" aria-label="Close" onclick={onclose}
		><X size={16} aria-hidden="true" /></button
	>
</div>

<style>
	.toast {
		position: fixed;
		left: 50%;
		bottom: var(--space-4);
		transform: translateX(-50%);
		z-index: 20;
		display: flex;
		align-items: center;
		gap: var(--space-4);
		max-width: min(32rem, calc(100vw - 2rem));
		padding: var(--space-2) var(--space-4);
		border-radius: 6px;
		background: var(--color-surface);
		color: var(--color-surface-text);
	}

	.close {
		display: inline-flex;
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
	}
</style>
