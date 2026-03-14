<!--
  CompletionScreen — shown after all steps are complete.

  Shows:
    - Stars + celebration message
    - SunDrops earned / max with score bar
    - Accuracy % + hint count
    - Save status (saving → saved → error)
    - Conditional modals:
        1. FirstLessonCompleteModal — shown once, on the user's very first lesson
        2. LevelBumpModal — shown when the adaptive assessment recommends a level change
    - "Back to Garden" + "Another lesson" CTAs

  Posts results to /api/lessons/[id]/complete to persist XP and SRS data.
  The API now also returns `isFirstLesson` and `levelRecommendation` which drive
  the modal logic. If the save fails the score is shown locally (graceful degradation).

  Architecture notes:
  - isFirstLesson and levelRecommendation cannot BOTH be non-null on the same
    completion (assessment needs 3 lessons; first lesson is lesson 1).
    So modal priority handling is not required — only one will ever fire.

  TASK: V2-06 (modal wiring)
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { LessonResults, LessonPlan } from '$lib/types/lesson';
	import type { ClientLevelRecommendation } from '$lib/server/lessons/completionUtils';
	import LevelBumpModal from '$lib/components/modals/LevelBumpModal.svelte';
	import FirstLessonCompleteModal from '$lib/components/modals/FirstLessonCompleteModal.svelte';

	interface Props {
		results: LessonResults;
		plan: LessonPlan;
		lessonId: string;
	}

	let { results, plan, lessonId }: Props = $props();

	// ── Save state ──────────────────────────────────────────────────────────
	let saving = $state(true);
	let saveError = $state(false);

	// ── Modal state ─────────────────────────────────────────────────────────
	/**
	 * Non-null when the API returns isFirstLesson = true.
	 * Shows the garden economy explainer (exactly once in the app lifecycle).
	 */
	let showFirstLessonModal = $state(false);

	/**
	 * Non-null when the API returns a level recommendation (bump_up or bump_down).
	 * Stores the full recommendation payload for the modal.
	 */
	let levelRecommendation = $state<ClientLevelRecommendation | null>(null);

	/**
	 * True while the level bump accept action is being processed
	 * (PATCH /api/profile/level in flight). Prevents double-taps.
	 */
	let acceptingLevelChange = $state(false);

	// ── Score calculations (derived, not reactive — results never change) ──

	/** Percentage of SunDrops earned (0–100) */
	const scorePercent = results.sunDropsMax > 0
		? Math.round((results.sunDropsEarned / results.sunDropsMax) * 100)
		: 0;

	/** Accuracy percentage */
	const totalAnswered = results.correctCount + results.wrongCount;
	const accuracyPercent = totalAnswered > 0
		? Math.round((results.correctCount / totalAnswered) * 100)
		: 100;

	/** Stars to show (out of 3) based on score */
	function getStars(): number {
		if (scorePercent >= 90) return 3;
		if (scorePercent >= 60) return 2;
		return 1;
	}

	/** Celebratory message based on score */
	function getMessage(): string {
		if (scorePercent === 100) return 'Perfect! 🌟 You got everything right!';
		if (scorePercent >= 80) return 'Amazing work! 🎉 Almost perfect!';
		if (scorePercent >= 60) return 'Great job! 👏 Keep it up!';
		if (scorePercent >= 40) return 'Good effort! 💪 Practice makes perfect!';
		return 'You did it! 🌱 Every lesson makes you better!';
	}

	const stars = getStars();
	const message = getMessage();

	// ── Save + modal trigger ─────────────────────────────────────────────────

	/**
	 * POST results to the backend.
	 * Reads `isFirstLesson` and `levelRecommendation` from the response to
	 * decide which modal (if any) to show after saving.
	 *
	 * Fire-and-forget errors show a local warning — the user can still see their
	 * score and navigate to the garden even if the save fails.
	 */
	async function saveResults() {
		const totalAnsweredLocal = results.correctCount + results.wrongCount;
		const accuracy = totalAnsweredLocal > 0 ? results.correctCount / totalAnsweredLocal : 1.0;

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
						nativeTranslation: '',    // server only needs targetPhrase for SRS lookup
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
					// Performance fields for level assessment (TASK-V2-06).
					// TODO: plumb heartsLost and streakMax through LessonResults in
					// a future task — currently defaults to 0. The assessment still
					// works; it just won't use hearts/streak data until then.
					heartsLost: 0,
					streakMax: 0,
				}),
			});

			if (!response.ok) {
				console.warn('[CompletionScreen] Save failed:', response.status);
				saveError = true;
				return;
			}

			// ── Read new fields from the API response ─────────────────────
			const data = await response.json();

			// Decide whether to show a post-completion modal.
			// isFirstLesson and levelRecommendation are mutually exclusive (see note at top).
			if (data.isFirstLesson === true) {
				// Show the garden economy explainer (one-time)
				showFirstLessonModal = true;
			} else if (data.levelRecommendation !== null && data.levelRecommendation !== undefined) {
				// Show the adaptive level bump offer
				levelRecommendation = data.levelRecommendation as ClientLevelRecommendation;
			}
			// else: neither modal — user sees score and navigates with CTA buttons
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

	// ── Navigation helpers ────────────────────────────────────────────────────

	function goToGarden() {
		goto('/garden');
	}

	function doAnotherLesson() {
		goto('/lesson/new');
	}

	// ── Level bump modal handlers ─────────────────────────────────────────────

	/**
	 * Called when the learner accepts the level change.
	 * PATCHes /api/profile/level with the target level, then navigates to the garden.
	 * Uses acceptingLevelChange to prevent double-taps during the network call.
	 */
	async function handleLevelBumpAccept() {
		if (!levelRecommendation || acceptingLevelChange) return;
		acceptingLevelChange = true;

		try {
			await fetch('/api/profile/level', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ level: levelRecommendation.targetLevel }),
			});
		} catch (err) {
			// Non-fatal — if the PATCH fails, the user still navigates to garden.
			// Their level change will not persist, but the UX is unaffected.
			console.warn('[CompletionScreen] Level PATCH failed (non-fatal):', err);
		}

		goto('/garden');
	}

	/**
	 * Called when the learner declines the level change.
	 * Just navigates to garden — no level change.
	 */
	function handleLevelBumpDecline() {
		goto('/garden');
	}

	/**
	 * Called when the learner dismisses the first lesson modal.
	 * The modal itself navigates to /garden on its final page —
	 * this callback is a fallback in case onComplete is needed explicitly.
	 */
	function handleFirstLessonComplete() {
		goto('/garden');
	}
</script>

<!-- ── Modals (rendered above the completion screen) ────────────────────────── -->

<!--
  FirstLessonCompleteModal: 3-page explainer for the garden economy.
  Shown exactly once — gated by profile.firstLessonComplete in the API.
  The modal navigates to /garden itself on the final page.
-->
{#if showFirstLessonModal}
	<FirstLessonCompleteModal
		sunDropsEarned={results.sunDropsEarned}
		onComplete={handleFirstLessonComplete}
	/>
{/if}

<!--
  LevelBumpModal: adaptive level change offer.
  Shown when the assessment detects a consistent trend (bump_up or bump_down).
  onAccept patches the profile level; onDecline just navigates.
-->
{#if levelRecommendation !== null}
	<LevelBumpModal
		recommendation={levelRecommendation.recommendation}
		currentLevel={levelRecommendation.currentLevel}
		targetLevel={levelRecommendation.targetLevel}
		message={levelRecommendation.message}
		onAccept={handleLevelBumpAccept}
		onDecline={handleLevelBumpDecline}
	/>
{/if}

<!-- ── Main completion screen ─────────────────────────────────────────────── -->

<div class="flex flex-col items-center gap-6 w-full text-center">
	<!-- Stars row -->
	<div class="flex items-center justify-center gap-2 mt-4">
		{#each [1, 2, 3] as s}
			<span
				class="text-4xl transition-transform duration-300 {s <= stars ? 'scale-100' : 'scale-75 opacity-30'}"
			>
				⭐
			</span>
		{/each}
	</div>

	<!-- Lesson title -->
	<div>
		<p class="text-bark-400 text-sm font-semibold uppercase tracking-wide">Lesson complete!</p>
		<h2 class="text-2xl font-extrabold text-bark-800 font-display">{plan.title}</h2>
	</div>

	<!-- Celebratory message -->
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

	<!-- CTAs — only shown when no modal is active -->
	<!-- When a modal is active it handles its own navigation via onAccept/onDecline/onComplete -->
	{#if !showFirstLessonModal && levelRecommendation === null}
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
	{/if}
</div>
