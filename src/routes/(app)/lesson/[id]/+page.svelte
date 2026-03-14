<!--
  Lesson Page — /lesson/[id]

  Phase orchestrator. Manages the full lifecycle:
    loading → preview (WhatYoullLearn) → activity (ActivityRouter) → complete (CompletionScreen)

  On mount:
    1. POST /api/lessons/generate with user profile params
    2. initLesson() in the store
    3. Prefetch TTS audio for all phrases in parallel
    4. Transition to 'preview' phase

  The lesson ID comes from the URL param. For new lessons, 'new' is passed
  and the server creates a DB record returning a real ID.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import {
		lessonPlan, lessonPhase, lessonResults, lessonError,
		currentStep, progress, sunDropsEarned,
		initLesson, advanceStep, startActivities, resetLesson,
	} from '$lib/stores/lesson';
	import { stopAudio } from '$lib/services/audioService';

	// LessonLoading handles both the 'loading' and 'preview' phases in one component.
	// The plan.audioCache pre-generated server-side is now merged into audioMap in initLesson.
	import LessonLoading from '$lib/components/lesson/LessonLoading.svelte';
	import CompletionScreen from '$lib/components/lesson/CompletionScreen.svelte';
	import ActivityRouter from '$lib/components/activities/ActivityRouter.svelte';

	import type { PageData } from './$types';
	import type { LessonPlan } from '$lib/types/lesson';

	let { data }: { data: PageData } = $props();

	// params.id is always defined for this route — non-null assertion is safe
	const lessonId: string = $page.params.id ?? 'new';

	// Track start time here (not in store) to compute timeSpentMs
	let lessonStartTime = 0;

	// Key for re-mounting ActivityRouter when step advances (resets local state)
	let stepKey = $state(0);

	onMount(async () => {
		await generateLesson();
	});

	onDestroy(() => {
		stopAudio();
		resetLesson();
	});

	async function generateLesson() {
		lessonPhase.set('loading');

		try {
			// Pick a topic from interests if available, else use a friendly default
			const topic = data.profile.interests?.length
				? data.profile.interests[Math.floor(Math.random() * data.profile.interests.length)]
				: 'everyday phrases';

			const response = await fetch('/api/lessons/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic,
					targetLanguage: data.profile.targetLanguage,
					nativeLanguage: data.profile.nativeLanguage,
					ageGroup: data.profile.ageGroup,
					interests: data.profile.interests ?? [],
					lessonId: lessonId !== 'new' ? lessonId : undefined,
					personalContext: data.profile.personalContext ?? null,
				}),
			});

			if (!response.ok) {
				throw new Error(`Generate failed: ${response.status}`);
			}

			// API wraps the plan in { lesson: ... } — unwrap it here
			const body = (await response.json()) as { lesson: LessonPlan } | LessonPlan;
			const plan: LessonPlan = 'lesson' in body ? body.lesson : body;

			// Audio is now pre-generated server-side and embedded in plan.audioCache.
			// initLesson() merges plan.audioCache into the audioMap automatically.
			// No client-side prefetch needed — instant audio on first INFO step.
			lessonStartTime = Date.now();
			initLesson(plan);

		} catch (err) {
			console.error('[LessonPage] Generation error:', err);
			lessonError.set("Oops! We couldn't load your lesson. Let's try again!");
			lessonPhase.set('error');
		}
	}

	/** Called by ActivityRouter when an activity finishes */
	function handleActivityComplete(_correct: boolean, _sunDrops: number) {
		// Record time spent before potentially transitioning to complete
		lessonResults.update((r) => ({ ...r, timeSpentMs: Date.now() - lessonStartTime }));

		// Bump the key so ActivityRouter re-mounts fresh for the next step
		stepKey += 1;
		advanceStep();
	}

	function handleStart() {
		lessonStartTime = Date.now();
		startActivities();
	}
</script>

<svelte:head>
	<title>Lesson · LingoFriends</title>
</svelte:head>

<!-- Full-page layout: header + scrollable content + safe bottom area -->
<div class="min-h-screen bg-bark-50 flex flex-col">

	<!-- ── Sticky lesson header ── -->
	<header class="sticky top-0 z-20 bg-white border-b border-bark-150 px-4 py-3 flex items-center gap-3">
		<!-- Exit button -->
		<button
			onclick={() => goto('/garden')}
			aria-label="Exit lesson"
			class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-bark-100 text-bark-500 transition-colors flex-shrink-0"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
			</svg>
		</button>

		<!-- Progress bar -->
		<div class="flex-1 h-3 bg-bark-100 rounded-full overflow-hidden">
			<div
				class="h-full bg-coral-400 rounded-full transition-all duration-500 ease-out"
				style="width: {$progress * 100}%"
			></div>
		</div>

		<!-- SunDrops counter -->
		<div class="flex items-center gap-1 flex-shrink-0 font-bold text-coral-400 text-base min-w-[44px] justify-end">
			<span>☀️</span>
			<span>{$sunDropsEarned}</span>
		</div>
	</header>

	<!-- ── Main content area ── -->
	<main class="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">

		<!-- LOADING + PREVIEW — both handled by LessonLoading in one component.
		     LessonLoading shows stage messages while loading, then the lesson
		     summary with an active "Let's Go!" when the plan is ready. -->
		{#if $lessonPhase === 'loading' || $lessonPhase === 'preview'}
			<LessonLoading
				plan={$lessonPlan}
				isReady={$lessonPhase === 'preview'}
				onStart={handleStart}
			/>

		<!-- ERROR -->
		{:else if $lessonPhase === 'error'}
			<div class="flex-1 flex flex-col items-center justify-center gap-6 text-center">
				<span class="text-5xl">😅</span>
				<div>
					<p class="text-lg font-bold text-bark-700">{$lessonError ?? "Something went wrong"}</p>
					<p class="text-bark-400 text-sm mt-1">Don't worry, let's try again!</p>
				</div>
				<button
					onclick={generateLesson}
					class="px-8 py-3 rounded-btn bg-coral-400 text-white font-bold shadow-btn-coral"
				>
					Try Again
				</button>
				<button onclick={() => goto('/garden')} class="text-bark-400 underline text-sm">
					Back to Garden
				</button>
			</div>

		<!-- ACTIVITY -->
		{:else if $lessonPhase === 'activity' && $currentStep}
			<!-- key= forces full re-mount on step change, resetting all local state -->
			{#key stepKey}
				<ActivityRouter
					step={$currentStep}
					targetLanguage={data.profile.targetLanguage}
					onComplete={handleActivityComplete}
				/>
			{/key}

		<!-- COMPLETE -->
		{:else if $lessonPhase === 'complete' && $lessonPlan}
			<CompletionScreen
				results={$lessonResults}
				plan={$lessonPlan}
				{lessonId}
			/>
		{/if}

	</main>
</div>
