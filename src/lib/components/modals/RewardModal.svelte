<!--
  RewardModal — brief floating overlay shown when SunDrops are earned (TASK-V2-03).

  Auto-dismisses after 1200ms. Can be dismissed early by tapping.
  At streak milestones (3, 5, 10), shows a larger "fire" variant.

  Architecture:
  - Rendered in the lesson page when $pendingReward !== null
  - Calls onDismiss() after auto-dismiss, which clears the store + advances step
  - Does NOT block layout — positioned as a floating overlay (fixed)

  Accessibility: aria-live="polite" announces the reward to screen readers.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RewardEvent } from '$lib/services/rewardService';

	interface Props {
		/** The reward event to display */
		event: RewardEvent;
		/** Called after auto-dismiss (or early tap). Lesson page uses this to advance. */
		onDismiss: () => void;
	}

	let { event, onDismiss }: Props = $props();

	/** Auto-dismiss timer — cleared on early tap */
	let dismissTimer: ReturnType<typeof setTimeout>;

	/**
	 * Timer constants:
	 * 1200ms for regular rewards — fast enough not to interrupt flow
	 * 1600ms for streak milestones — give them a moment to feel the fire!
	 */
	const DISMISS_DELAY = event.isStreakMilestone ? 1600 : 1200;

	function dismiss() {
		clearTimeout(dismissTimer);
		onDismiss();
	}

	onMount(() => {
		dismissTimer = setTimeout(dismiss, DISMISS_DELAY);
	});

	onDestroy(() => {
		clearTimeout(dismissTimer);
	});
</script>

<!--
  Overlay positioned fixed at bottom-centre.
  Animates in with a scale + fade. Sits above the activity area.
  Tap anywhere on it to dismiss early.
-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center pb-32 pointer-events-none"
	aria-live="polite"
	aria-atomic="true"
>
	<button
		onclick={dismiss}
		class="pointer-events-auto flex flex-col items-center gap-2 px-8 py-5
			   rounded-2xl shadow-2xl border border-amber-200 bg-white
			   animate-in zoom-in-75 fade-in duration-200"
		aria-label="Reward earned: {event.sunDrops} Sun Drops. {event.message}"
	>

		{#if event.isStreakMilestone}
			<!-- ── STREAK MILESTONE VARIANT ───────────────────────────── -->
			<!-- Bigger, more dramatic, fire emojis -->
			<div class="text-3xl">
				{#if event.streakCount >= 10}🔥🔥🔥{:else if event.streakCount >= 5}🔥🔥{:else}🔥{/if}
			</div>
			<div class="text-2xl font-extrabold text-amber-500">
				☀️ +{event.sunDrops}
			</div>
			{#if event.streakBonus > 0}
				<div class="text-xs font-semibold text-amber-400 -mt-1">
					includes +{event.streakBonus} streak bonus!
				</div>
			{/if}
		{:else}
			<!-- ── REGULAR REWARD VARIANT ─────────────────────────────── -->
			<div class="text-3xl font-extrabold text-amber-500 tracking-tight">
				☀️ +{event.sunDrops}
			</div>
		{/if}

		<!-- Message shown in both variants -->
		<p class="text-sm font-semibold text-bark-600 text-center">
			{event.message}
		</p>

	</button>
</div>
