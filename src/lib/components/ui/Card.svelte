<!--
  Card — White container with rounded corners and subtle shadow.
  Used for lesson cards, activity panels, and profile sections.

  Variants:
    default  — White bg, shadow-card
    flat     — White bg, no shadow (inside another card)
    elevated — White bg, shadow-card-lg (modals, overlays)
-->
<script lang="ts">
	interface Props {
		variant?: 'default' | 'flat' | 'elevated';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		variant = 'default',
		padding = 'md',
		class: extraClass = '',
		children,
	}: Props & { children?: import('svelte').Snippet } = $props();

	const variants = {
		default: 'bg-white rounded-card shadow-card',
		flat: 'bg-white rounded-card',
		elevated: 'bg-white rounded-card shadow-card-lg',
	};

	const paddings = {
		none: '',
		sm: 'p-3',
		md: 'p-5',
		lg: 'p-8',
	};
</script>

<div class="{variants[variant]} {paddings[padding]} {extraClass}">
	{#if children}{@render children()}{/if}
</div>
