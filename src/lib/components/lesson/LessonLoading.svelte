<!--
  LessonLoading — handles BOTH the loading and preview phases in one component.

  WHILE LOADING (plan = null):
    Shows rotating stage messages with an animated seed graphic.
    The "Let's Go!" button is DISABLED (opacity-50, pointer-events-none).
    Stages cycle every 2 seconds to give feedback that work is happening.

  WHEN READY (plan is provided):
    Shows the lesson title, phrases to learn, and an ACTIVE "Let's Go!" button.
    A ✅ "Ready!" message replaces the spinner.

  This unified component prevents the jarring two-screen loading experience
  (spinner → separate preview) and gives a more polished app feel.

  TASK-V2-02: Replaces the simple spinner + WhatYoullLearn pattern.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LessonPlan } from '$lib/types/lesson';

	interface Props {
		/** Lesson plan — null while generation is in progress */
		plan: LessonPlan | null;
		/** True when generation is complete and the lesson is ready to start */
		isReady: boolean;
		/** Called when the learner taps "Let's Go!" */
		onStart: () => void;
	}

	let { plan, isReady, onStart }: Props = $props();

	// ── Loading stage messages ─────────────────────────────────────────────
	// Cycle through these while waiting for the AI to generate the lesson.
	// Each stage message gives the impression of meaningful work happening.
	const LOADING_STAGES = [
		{ emoji: '🌱', text: 'Thinking about what to teach you…' },
		{ emoji: '✨', text: 'Crafting your activities…' },
		{ emoji: '🎵', text: 'Preparing the sounds…' },
		{ emoji: '🌿', text: 'Almost ready…' },
	] as const;

	let stageIndex = $state(0);
	let stageInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Extract unique target phrases from INFO steps to preview.
	 * Shows max 4 to avoid overwhelming the learner before they start.
	 */
	const previewPhrases = $derived(() => {
		if (!plan) return [];
		const seen = new Set<string>();
		const result: Array<{ phrase: string; translation: string }> = [];

		for (const step of plan.steps) {
			if (step.activity.type === 'info' && !seen.has(step.activity.targetPhrase)) {
				seen.add(step.activity.targetPhrase);
				result.push({
					phrase: step.activity.targetPhrase,
					translation: step.activity.nativeTranslation,
				});
				// Cap at 4 to keep the screen digestible for kids
				if (result.length >= 4) break;
			}
		}
		return result;
	});

	onMount(() => {
		// Cycle loading stages every 2 seconds while waiting for generation
		stageInterval = setInterval(() => {
			if (!isReady) {
				// Advance through stages but clamp at the last one
				stageIndex = Math.min(stageIndex + 1, LOADING_STAGES.length - 1);
			}
		}, 2000); // 2s per stage — long enough to read, fast enough to feel responsive
	});

	onDestroy(() => {
		if (stageInterval) clearInterval(stageInterval);
	});
</script>

<div class="flex flex-col items-center gap-6 w-full text-center min-h-[60vh] justify-center">

	{#if !isReady}
		<!-- ── LOADING STATE ─────────────────────────────────────────────────── -->
		<!-- Animated seed grows as stages progress — metaphor matches the garden theme -->
		<div class="flex flex-col items-center gap-4">
			<!-- Pulsing seed emoji — grows/bounces on each stage change -->
			<div class="text-6xl animate-bounce" style="animation-duration: 2s;">
				{LOADING_STAGES[stageIndex].emoji}
			</div>

			<!-- Stage message — fades in for each new stage -->
			<p class="text-lg font-semibold text-bark-600 transition-all duration-500">
				{LOADING_STAGES[stageIndex].text}
			</p>
			<p class="text-sm text-bark-300">This usually takes 5–10 seconds ✨</p>
		</div>

		<!-- Disabled button while loading — visible but non-interactive -->
		<!-- Opacity and cursor clearly signal "not yet" without hiding the button -->
		<button
			disabled
			aria-disabled="true"
			class="w-full h-14 rounded-btn bg-coral-300 text-white/70 font-bold text-lg
				   cursor-not-allowed opacity-60 mt-4"
		>
			Preparing lesson…
		</button>

	{:else if plan}
		<!-- ── READY STATE ───────────────────────────────────────────────────── -->
		<!-- Ready confirmation badge -->
		<div class="flex items-center gap-2 bg-forest-50 border border-forest-200 rounded-full px-4 py-1.5">
			<span class="text-forest-500">✅</span>
			<span class="text-sm font-semibold text-forest-600">Lesson ready!</span>
		</div>

		<!-- Lesson title + icon -->
		<div class="flex flex-col items-center gap-2">
			<span class="text-5xl">{plan.icon}</span>
			<h1 class="text-2xl font-extrabold text-bark-800 font-display">
				{plan.title}
			</h1>
			<p class="text-sm text-bark-400 font-medium">
				{plan.chunkCount} phrase{plan.chunkCount !== 1 ? 's' : ''} · ☀️ {plan.totalSunDrops} SunDrops available
			</p>
		</div>

		<!-- What you'll learn — phrase preview list -->
		{#if previewPhrases().length > 0}
			<div class="w-full">
				<p class="text-xs font-semibold text-bark-400 uppercase tracking-wide mb-3">
					What you'll learn
				</p>
				<ul class="flex flex-col gap-2 w-full">
					{#each previewPhrases() as { phrase, translation }}
						<li class="bg-sky-50 border border-sky-200 rounded-card px-4 py-3
								   flex items-center justify-between gap-3">
							<span class="font-bold text-bark-700 text-left">{phrase}</span>
							<span class="text-bark-400 text-sm text-right flex-shrink-0">{translation}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Core frame badge (if present) -->
		{#if plan.coreFrame}
			<div class="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 w-full">
				<p class="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">
					Sentence pattern
				</p>
				<p class="text-base font-bold text-bark-700">{plan.coreFrame}</p>
				{#if plan.coreFrameTranslation}
					<p class="text-sm text-bark-400 mt-0.5">{plan.coreFrameTranslation}</p>
				{/if}
			</div>
		{/if}

		<!-- Active start button — only enabled when isReady -->
		<button
			onclick={onStart}
			class="w-full h-14 rounded-btn bg-coral-400 hover:bg-coral-500 active:translate-y-[2px]
				   text-white font-bold text-lg shadow-btn-coral transition-all duration-100 mt-2"
		>
			Let's go! 🚀
		</button>

		<p class="text-xs text-bark-300">Tap 💡 during any question for a hint</p>
	{/if}

</div>
