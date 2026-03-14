<!--
  Badge — Small pill for labels, tags, and status indicators.
  Used for skill categories, difficulty levels, and XP amounts.
-->
<script lang="ts">
	interface Props {
		variant?: 'sundrop' | 'sky' | 'bloom' | 'forest' | 'coral' | 'storm' | 'bark';
		size?: 'sm' | 'md';
		class?: string;
	}

	let {
		variant = 'sundrop',
		size = 'md',
		class: extraClass = '',
		children,
	}: Props & { children?: import('svelte').Snippet } = $props();

	const variants = {
		sundrop: 'bg-sundrop-100 text-sundrop-700',
		sky: 'bg-sky-100 text-sky-700',
		bloom: 'bg-bloom-100 text-bloom-700',
		forest: 'bg-forest-100 text-forest-700',
		coral: 'bg-coral-100 text-coral-700',
		storm: 'bg-storm-100 text-storm-700',
		bark: 'bg-bark-100 text-bark-600',
	};

	const sizes = {
		sm: 'px-2 py-0.5 text-xs font-bold',
		md: 'px-3 py-1 text-sm font-bold',
	};
</script>

<span class="inline-flex items-center gap-1 rounded-full {variants[variant]} {sizes[size]} {extraClass}">
	{#if children}{@render children()}{/if}
</span>
