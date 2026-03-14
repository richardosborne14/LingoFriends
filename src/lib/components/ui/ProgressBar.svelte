<!--
  ProgressBar — Animated progress bar for lesson completion and XP.
  
  Uses CSS transition for smooth fill animation.
  Kids respond well to visible progress — always show value.
-->
<script lang="ts">
	interface Props {
		/** 0-100 */
		value: number;
		/** Optional max (default 100) */
		max?: number;
		variant?: 'coral' | 'forest' | 'sundrop' | 'sky';
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
		label?: string;
		class?: string;
	}

	let {
		value,
		max = 100,
		variant = 'coral',
		size = 'md',
		showLabel = false,
		label,
		class: extraClass = '',
	}: Props = $props();

	// Clamp to 0-100% even if value > max
	const pct = $derived(Math.min(100, Math.max(0, (value / max) * 100)));

	const tracks = {
		coral: 'bg-coral-100',
		forest: 'bg-forest-100',
		sundrop: 'bg-sundrop-100',
		sky: 'bg-sky-100',
	};

	const fills = {
		coral: 'bg-coral-400',
		forest: 'bg-forest-400',
		sundrop: 'bg-sundrop-400',
		sky: 'bg-sky-400',
	};

	const heights = {
		sm: 'h-2',
		md: 'h-3',
		lg: 'h-4',
	};
</script>

<div class="flex flex-col gap-1 {extraClass}">
	{#if showLabel || label}
		<div class="flex justify-between text-xs font-bold text-bark-500">
			<span>{label ?? 'Progress'}</span>
			<span>{Math.round(pct)}%</span>
		</div>
	{/if}

	<div
		class="w-full rounded-full overflow-hidden {tracks[variant]} {heights[size]}"
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
	>
		<div
			class="h-full rounded-full transition-all duration-500 ease-out {fills[variant]}"
			style="width: {pct}%"
		></div>
	</div>
</div>
