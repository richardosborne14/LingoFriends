<!--
  WhatYoullLearn — "Preview" screen shown before activities begin.

  Shows: lesson title, icon, total SunDrops available, and the chunk phrases
  the learner will practise (with their translations).

  The learner taps "Start!" to begin the activity sequence.
  Task 3.5 requirement: motivating, low-anxiety entry point.
-->
<script lang="ts">
	import type { LessonPlan } from '$lib/types/lesson';

	interface Props {
		plan: LessonPlan;
		onStart: () => void;
	}

	let { plan, onStart }: Props = $props();

	/**
	 * Extract unique phrases to preview from the lesson plan.
	 * Only show one phrase per chunk (the introduce step's targetPhrase).
	 * Max 5 items to keep the screen digestible for kids.
	 */
	const previewPhrases: Array<{ phrase: string; translation: string }> = (() => {
		const seen = new Set<string>();
		const result: Array<{ phrase: string; translation: string }> = [];

		for (const step of plan.steps) {
			if (step.activity.type === 'info' && !seen.has(step.activity.targetPhrase)) {
				seen.add(step.activity.targetPhrase);
				result.push({
					phrase: step.activity.targetPhrase,
					translation: step.activity.nativeTranslation,
				});
				if (result.length >= 5) break;
			}
		}
		return result;
	})();
</script>

<div class="flex flex-col items-center gap-6 w-full text-center">
	<!-- Lesson icon + title header -->
	<div class="flex flex-col items-center gap-2 pt-2">
		<span class="text-5xl leading-none">{plan.icon}</span>
		<h1 class="text-2xl font-extrabold text-bark-800 font-display">
			{plan.title}
		</h1>
		<p class="text-sm text-bark-400 font-medium">
			{plan.chunkCount} phrase{plan.chunkCount !== 1 ? 's' : ''} · {plan.totalSunDrops} SunDrops available
		</p>
	</div>

	<!-- "What you'll learn" phrase list -->
	{#if previewPhrases.length > 0}
		<div class="w-full">
			<p class="text-sm font-semibold text-bark-400 uppercase tracking-wide mb-3">
				What you'll learn
			</p>
			<ul class="flex flex-col gap-2 w-full">
				{#each previewPhrases as { phrase, translation }}
					<li class="bg-sky-50 border border-sky-200 rounded-card px-4 py-3 flex items-center justify-between gap-3">
						<span class="font-bold text-bark-700 text-left">{phrase}</span>
						<span class="text-bark-400 text-sm text-right flex-shrink-0">{translation}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Core sentence frame (Phase 3 context) -->
	{#if plan.coreFrame}
		<div class="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 w-full">
			<p class="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Sentence pattern</p>
			<p class="text-base font-bold text-bark-700">{plan.coreFrame}</p>
			{#if plan.coreFrameTranslation}
				<p class="text-sm text-bark-400 mt-0.5">{plan.coreFrameTranslation}</p>
			{/if}
		</div>
	{/if}

	<!-- Start CTA -->
	<button
		onclick={onStart}
		class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
			   text-white font-bold text-lg shadow-btn-coral
			   transition-all duration-100 mt-2"
	>
		Let's go! 🚀
	</button>

	<p class="text-xs text-bark-300">Tap 💡 during any question for a hint</p>
</div>
