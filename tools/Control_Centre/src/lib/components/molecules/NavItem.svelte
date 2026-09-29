<script lang="ts">
	import Button from '../atoms/Button.svelte';

	interface Props {
		label: string;
		href: string;
		external?: boolean;
		active?: boolean;
	}

	let { label, href, external = false, active = false }: Props = $props();
</script>

<Button variant={active ? 'primary' : 'secondary'} {href} {external}>
	{label}
</Button>
