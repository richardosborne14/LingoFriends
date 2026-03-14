<!--
  PenaltyModal — brief floating overlay shown when SunDrops are lost (TASK-V2-03).

  Auto-dismisses after 1500ms (slightly longer than RewardModal to let the
  message land — the learner needs a moment to process the feedback).

  CRITICAL PEDAGOGY NOTE: This modal must NEVER feel punishing.
  Messages are always gentle, redirecting, and encouraging.
  See PEDAGOGY.md — Krashen's Affective Filter.

  Architecture: same as RewardModal — rendered when $pendingPenalty !== null,
  calls onDismiss() after auto-dismiss.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PenaltyEvent } from '$lib/services/rewardService';

	interface Props {
		/** The penalty event to display */
		event: PenaltyEvent;
		/** Called after auto-dismiss. Lesson page advances after penalty is shown. */
		onDismiss: () => void;
	}

	let { event, onDismiss }: Props = $props();

	let dismissTimer: ReturnType<typeof setTimeout>;

	/**
	 * 1500ms — a touch longer than reward modal.
	 * The learner needs slightly more time to process "not quite" than "great job".
	 * Not so long it frustrates them (>2s would feel punishing).
	 */
	const DISMISS_DELAY = 1500;

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
			   rounded-2xl shadow-2xl border border-red-100 bg-white
			   animate-in zoom-in-75 fade-in duration-200"
		aria-label="Wrong answer: -{event.sunDropsLost} Sun Drops. {event.message}"
	>
		<!-- Red-tinted sundrop deduction — visually different from reward -->
		<div class="text-2xl font-extrabold text-red-400 tracking-tight">
			☀️ -{event.sunDropsLost}
		</div>

		<!-- Gentle, encouraging message — never "you failed" -->
		<p class="text-sm font-semibold text-bark-600 text-center max-w-[180px]">
			{event.message}
		</p>
	</button>
</div>
