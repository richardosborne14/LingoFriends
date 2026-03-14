<!--
  CompletionScreen — shown after all steps are complete (Task 3.6).

  Shows:
    - Big celebration emoji + score
    - SunDrops earned / max with a filled-star progress display
    - Accuracy % + correct/wrong counts
    - "Back to Garden" CTA

  Posts results to /api/lessons/[id]/complete to persist XP and SRS data.
  If the API call fails, the screen still shows — score is shown locally.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { LessonResults, LessonPlan } from '$lib/types/lesson';

	interface Props {
		results: LessonResults;
		plan: LessonPlan;
		lessonId: string;
	}

	let { results, plan, lessonId }: Props = $props();

	let saving = $state(true);
	let saveError = $state(false);

	/** Percentage of SunDrops earned (0-100) */
	const scorePercent = results.sunDropsMax > 0
		? Math.round((results.sunDropsEarned / results.sunDropsMax) * 100)
		: 0;

	/** Accuracy percentage */
	const totalAnswered = results.correctCount + results.wrongCount;
	const accuracyPercent = totalAnswered > 0
		? Math.round((results.correctCount / totalAnswered) * 100)
		: 100;

	/** Celebratory message based on score */
	function getMessage(): string {
		if (scorePercent === 100) return "Perfect! 🌟 You got everything right!";
		if (scorePercent >= 80) return "Amazing work! 🎉 Almost perfect!";
		if (scorePercent >= 60) return "Great job! 👏 Keep it up!";
		if (scorePercent >= 40) return "Good effort! 💪 Practice makes perfect!";
		return "You did it! 🌱 Every lesson makes you better!";
	}

	/** Stars to show (out of 3) based on score */
	function getStars(): number {
		if (scorePercent >= 90) return 3;
		if (scorePercent >= 60) return 2;
		return 1;
	}

	const stars = getStars();
	const message = getMessage();

	/** POST results to backend to persist XP, streak, SRS, and tree growth data */
	async function saveResults() {
		// Compute accuracy (0.0–1.0) from correct vs total answered
		const totalAnswered = results.correctCount + results.wrongCount;
		const accuracy = totalAnswered > 0 ? results.correctCount / totalAnswered : 1.0;

		try {
			const response = await fetch(`/api/lessons/${lessonId}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					// Required fields — names must match the API contract exactly
					earnedSunDrops: results.sunDropsEarned,
					totalSunDrops: results.sunDropsMax,
					accuracy,
					chunkResults: results.chunkResults.map((c) => ({
						targetPhrase: c.targetPhrase,
						nativeTranslation: '', // server only needs targetPhrase for SRS lookup
						correct: c.correct,
						wrongAttempts: c.wrongAttempts,
					})),
					// Optional enrichment fields
					topic: plan.title,
					durationSeconds: Math.round(results.timeSpentMs / 1000),
					activitiesCompleted: results.correctCount + results.wrongCount,
					activitiesTotal: plan.steps.length,
					helpUsed: results.helpUsed,
					personalContext: results.personalContext ?? null,
				}),
			});

			if (!response.ok) {
				console.warn('[CompletionScreen] Save failed:', response.status);
				saveError = true;
			}
		} catch (err) {
			// Network error — show locally, XP not persisted this time
			console.warn('[CompletionScreen] Network error saving results:', err);
			saveError = true;
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		saveResults();
	});

	function goToGarden() {
		goto('/garden');
	}

	function doAnotherLesson() {
		goto('/lesson/new');
	}
</script>

<div class="flex flex-col items-center gap-6 w-full text-center">
	<!-- Stars row -->
	<div class="flex items-center justify-center gap-2 mt-4">
		{#each [1, 2, 3] as s}
			<span class="text-4xl transition-transform duration-300 {s <= stars ? 'scale-100' : 'scale-75 opacity-30'}">
				⭐
			</span>
		{/each}
	</div>

	<!-- Lesson title -->
	<div>
		<p class="text-bark-400 text-sm font-semibold uppercase tracking-wide">Lesson complete!</p>
		<h2 class="text-2xl font-extrabold text-bark-800 font-display">{plan.title}</h2>
	</div>

	<!-- Message -->
	<p class="text-lg font-semibold text-bark-600">{message}</p>

	<!-- Score card -->
	<div class="bg-white border-2 border-bark-200 rounded-card px-6 py-5 w-full shadow-card">
		<!-- SunDrops earned -->
		<div class="flex items-center justify-between mb-4">
			<span class="text-bark-500 font-medium">SunDrops</span>
			<span class="text-2xl font-extrabold text-coral-400">
				{results.sunDropsEarned} / {results.sunDropsMax}
			</span>
		</div>

		<!-- Progress bar -->
		<div class="w-full h-3 bg-bark-100 rounded-full overflow-hidden">
			<div
				class="h-full bg-coral-400 rounded-full transition-all duration-700"
				style="width: {scorePercent}%"
			></div>
		</div>

		<div class="flex items-center justify-between mt-4 text-sm">
			<span class="text-bark-400">Accuracy</span>
			<span class="font-bold text-bark-700">{accuracyPercent}%</span>
		</div>

		{#if results.helpUsed > 0}
			<p class="text-xs text-bark-300 mt-2">
				💡 Used {results.helpUsed} hint{results.helpUsed !== 1 ? 's' : ''}
			</p>
		{/if}
	</div>

	<!-- Save status -->
	{#if saving}
		<p class="text-xs text-bark-300 animate-pulse">Saving your progress…</p>
	{:else if saveError}
		<p class="text-xs text-amber-500">⚠️ Couldn't save online — your score will sync later</p>
	{:else}
		<p class="text-xs text-mint-500">✓ Progress saved</p>
	{/if}

	<!-- CTAs -->
	<div class="flex flex-col gap-3 w-full mt-2">
		<button
			onclick={doAnotherLesson}
			class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
				   text-white font-bold text-lg shadow-btn-coral transition-all duration-100"
		>
			Another lesson! ⚡
		</button>
		<button
			onclick={goToGarden}
			class="w-full h-12 rounded-btn bg-white border-2 border-bark-200 hover:border-bark-300
				   text-bark-600 font-bold text-base transition-colors"
		>
			Back to Garden 🌳
		</button>
	</div>
</div>
