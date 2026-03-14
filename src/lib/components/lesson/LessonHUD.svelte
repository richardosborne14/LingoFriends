<!--
  LessonHUD — the persistent lesson header bar (TASK-V2-03).

  Shows three pieces of live information throughout the lesson:
    ☀️ SunDrop counter — animates up/down as rewards are earned
    ❤️ Hearts — 3 hearts, each "cracks" on wrong answer
    Progress bar — fraction of steps completed

  Mounted inside the lesson page header, visible throughout activity phase.

  Design decisions:
  - SunDrops animate with a brief scale+glow on earn (green), shake on loss (red)
  - Hearts use emoji style (❤️ / 🖤) for accessibility + cross-platform rendering
  - Progress bar already exists in the lesson header; this component adds the HUD content
-->
<script lang="ts">
	import { derived } from 'svelte/store';
	import { hearts, sunDropsEarned } from '$lib/stores/lesson';
	import { STARTING_HEARTS } from '$lib/services/rewardService';

	interface Props {
		/** Fraction 0-1 representing lesson progress */
		progress: number;
	}

	let { progress }: Props = $props();

	// ── Animation state ────────────────────────────────────────────────────────

	/** Tracks previous value to detect direction of change */
	let prevSunDrops = $state($sunDropsEarned);
	let sunDropAnimation = $state<'earn' | 'lose' | null>(null);
	let heartAnimation = $state(false);
	let prevHearts = $state($hearts);

	// Watch sundrops for changes
	$effect(() => {
		const current = $sunDropsEarned;
		if (current > prevSunDrops) {
			sunDropAnimation = 'earn';
			// Clear animation class after CSS animation duration (600ms)
			setTimeout(() => (sunDropAnimation = null), 600);
		} else if (current < prevSunDrops) {
			sunDropAnimation = 'lose';
			setTimeout(() => (sunDropAnimation = null), 500);
		}
		prevSunDrops = current;
	});

	// Watch hearts for changes
	$effect(() => {
		const current = $hearts;
		if (current < prevHearts) {
			heartAnimation = true;
			setTimeout(() => (heartAnimation = false), 500);
		}
		prevHearts = current;
	});

	/**
	 * Maps heart index → emoji.
	 * Full heart for remaining, broken heart for lost.
	 *
	 * STARTING_HEARTS is always 3, so we render 3 slots and show
	 * which are "broken" based on the current count.
	 */
	function heartEmoji(index: number): string {
		// Hearts fill from left: 0 = first, STARTING_HEARTS-1 = last
		return index < $hearts ? '❤️' : '🖤';
	}
</script>

<!--
  HUD layout: three sections in a horizontal row.
  Sundrops left | hearts centre | progress right.
  Matches the mockup in TASK-V2-03.md.
-->
<div class="flex items-center gap-3 w-full">

	<!-- ── SUN DROPS counter ──────────────────────────────────────────────── -->
	<div
		class="flex items-center gap-1 font-bold text-base min-w-[52px]
			   transition-all duration-150"
		class:scale-110={sunDropAnimation === 'earn'}
		class:text-forest-500={sunDropAnimation === 'earn'}
		class:scale-90={sunDropAnimation === 'lose'}
		class:text-red-400={sunDropAnimation === 'lose'}
		aria-label="{$sunDropsEarned} Sun Drops earned"
	>
		<span aria-hidden="true">☀️</span>
		<span>{$sunDropsEarned}</span>
	</div>

	<!-- ── PROGRESS BAR ───────────────────────────────────────────────────── -->
	<div class="flex-1 h-3 bg-bark-100 rounded-full overflow-hidden" role="progressbar"
		aria-valuenow={Math.round(progress * 100)}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Lesson progress"
	>
		<div
			class="h-full bg-coral-400 rounded-full transition-all duration-500 ease-out"
			style="width: {progress * 100}%"
		></div>
	</div>

	<!-- ── HEARTS ─────────────────────────────────────────────────────────── -->
	<!--
		Rendered right-aligned. CSS animation class on container pulses when
		a heart is lost.
	-->
	<div
		class="flex items-center gap-0.5 flex-shrink-0"
		class:animate-pulse={heartAnimation}
		aria-label="{$hearts} hearts remaining"
	>
		{#each Array(STARTING_HEARTS) as _, i (i)}
			<span
				class="text-base leading-none transition-all duration-200"
				class:opacity-30={i >= $hearts}
				aria-hidden="true"
			>
				{heartEmoji(i)}
			</span>
		{/each}
	</div>

</div>
