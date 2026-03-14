<!--
  SunDropCounter — Animated SunDrop (XP) display.
  
  Shows ☀️ icon + count. Used in lesson header, profile, and leaderboard.
  Number pulses when value increases — gives kids satisfying feedback.
-->
<script lang="ts">
	interface Props {
		value: number;
		/** Show the full label "SunDrops" or just the number */
		showLabel?: boolean;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		value,
		showLabel = false,
		size = 'md',
		class: extraClass = '',
	}: Props = $props();

	// prev tracks the last seen value — initialized to 0 so the first render never animates
	let prev = $state(0);
	let bumped = $state(false);

	// Animate the counter when value increases (e.g. after earning SunDrops)
	$effect(() => {
		if (value > prev) {
			bumped = true;
			setTimeout(() => (bumped = false), 400);
		}
		prev = value;
	});

	const sizes = {
		sm: 'text-sm gap-1',
		md: 'text-base gap-1.5',
		lg: 'text-xl gap-2',
	};

	const iconSizes = {
		sm: 'text-base',
		md: 'text-xl',
		lg: 'text-2xl',
	};
</script>

<div
	class="inline-flex items-center font-extrabold text-sundrop-700 {sizes[size]} {extraClass}"
	aria-label="{value} SunDrops"
>
	<span class="{iconSizes[size]}" aria-hidden="true">☀️</span>
	<span
		class="transition-transform duration-200 {bumped ? 'scale-125' : 'scale-100'}"
	>
		{value.toLocaleString()}
	</span>
	{#if showLabel}
		<span class="text-bark-400 font-semibold">SunDrops</span>
	{/if}
</div>
