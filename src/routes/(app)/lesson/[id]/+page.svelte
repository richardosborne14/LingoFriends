<!--
  Lesson Page — /lesson/[id]

  Phase orchestrator. Manages the full lifecycle:
    loading → preview (LessonLoading) → activity (ActivityRouter) → complete (CompletionScreen)

  TASK-V2-03 additions:
    - LessonHUD replaces raw progress bar + sundrop counter in the header
    - RewardModal shown after correct answers (auto-dismisses 1.2s)
    - PenaltyModal shown after wrong answers (auto-dismisses 1.5s)
    - BreatherModal shown when hearts run out (manual dismiss)
    - Sound effects wired to all feedback events
    - Activity completion now flows: activity → modal → advanceStep
      (not directly advanceStep as before)

  MODAL DISMISS FLOW:
    correct (sunDrops > 0) → setPendingReward → RewardModal.onDismiss → advanceStep
    correct (sunDrops = 0) → advanceStep immediately (no modal for INFO steps)
    wrong (hearts > 0)    → setPendingPenalty → PenaltyModal.onDismiss → advanceStep
    wrong (hearts = 0)    → loseHeart triggers showBreather → BreatherModal.onContinue → restoreHearts + advanceStep
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';

	import {
		lessonPlan, lessonPhase, lessonResults, lessonError,
		currentStep, progress, sunDropsEarned,
		hearts, consecutiveCorrect, pendingReward, pendingPenalty, showBreather,
		helpPanelOpen,
		initLesson, advanceStep, startActivities, resetLesson,
		recordCorrect, recordWrong, deductSunDrop,
		incrementStreak, resetStreak, loseHeart, restoreHearts,
		setPendingReward, clearPendingReward, setPendingPenalty, clearPendingPenalty,
	} from '$lib/stores/lesson';
	import type { HelpContext } from '$lib/services/helpAssistant';
	import { stopAudio } from '$lib/services/audioService';
	import { playSound, preloadSounds } from '$lib/services/soundService';
	import { buildRewardEvent, buildPenaltyEvent, SUNDROP_PENALTY_PER_WRONG } from '$lib/services/rewardService';

	import LessonLoading from '$lib/components/lesson/LessonLoading.svelte';
	import LessonHUD from '$lib/components/lesson/LessonHUD.svelte';
	import HelpPanel from '$lib/components/lesson/HelpPanel.svelte';
	import CompletionScreen from '$lib/components/lesson/CompletionScreen.svelte';
	import ActivityRouter from '$lib/components/activities/ActivityRouter.svelte';
	import RewardModal from '$lib/components/modals/RewardModal.svelte';
	import PenaltyModal from '$lib/components/modals/PenaltyModal.svelte';
	import BreatherModal from '$lib/components/modals/BreatherModal.svelte';

	import type { PageData } from './$types';
	import type { LessonPlan } from '$lib/types/lesson';

	let { data }: { data: PageData } = $props();

	// params.id is always defined for this route — non-null assertion is safe
	const lessonId: string = $page.params.id ?? 'new';

	// Track lesson start time (not in store — owned by this page)
	let lessonStartTime = 0;

	// Key for re-mounting ActivityRouter when step advances (resets local state)
	let stepKey = $state(0);

	onMount(async () => {
		// Pre-load the most common sounds so they play instantly during the lesson.
		// This is fire-and-forget — no await needed.
		preloadSounds(['correct', 'wrong', 'streak-3', 'streak-5', 'lesson-complete']);
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

			// Audio is pre-generated server-side in plan.audioCache.
			// initLesson() merges it into audioMap automatically.
			lessonStartTime = Date.now();
			initLesson(plan);

		} catch (err) {
			console.error('[LessonPage] Generation error:', err);
			lessonError.set("Oops! We couldn't load your lesson. Let's try again!");
			lessonPhase.set('error');
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// ACTIVITY COMPLETION HANDLERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Called by ActivityRouter when an activity completes.
	 *
	 * Correct + sunDrops > 0: show reward modal → on dismiss → advance
	 * Correct + sunDrops = 0: advance immediately (INFO steps — no modal needed)
	 * Wrong: deduct sundrop, lose heart → if breather: wait for user, else show penalty → advance
	 */
	function handleActivityComplete(correct: boolean, earnedSunDrops: number) {
		// Update elapsed time before potentially completing
		lessonResults.update((r) => ({ ...r, timeSpentMs: Date.now() - lessonStartTime }));

		// Bump stepKey so ActivityRouter fully re-mounts for the next step,
		// but DON'T advance index yet — modal callbacks handle that timing.
		stepKey += 1;

		if (correct) {
			// ── CORRECT ANSWER ──────────────────────────────────────────────
			incrementStreak();
			recordCorrect(earnedSunDrops);
			playSound('correct');

			// Play streak sound at milestones
			const streak = get(consecutiveCorrect);
			if (streak >= 10) playSound('streak-10');
			else if (streak >= 5) playSound('streak-5');
			else if (streak >= 3) playSound('streak-3');

			if (earnedSunDrops > 0) {
				// Show reward modal — it will call handleRewardDismiss when done
				setPendingReward(buildRewardEvent(earnedSunDrops, streak));
				// (don't advanceStep here — modal callback does it)
			} else {
				// INFO steps earn 0 sunDrops — skip modal, advance immediately
				advanceStep();
			}

		} else {
			// ── WRONG ANSWER ────────────────────────────────────────────────
			resetStreak();
			recordWrong();
			deductSunDrop(); // -1 sundrop, floored at 0
			playSound('wrong');

			// Lose a heart — if this hits 0, loseHeart() auto-shows the breather
			loseHeart();

			const currentHearts = get(hearts);

			if (currentHearts > 0) {
				// Hearts still remaining — show penalty modal
				// modal callback will advanceStep()
				setPendingPenalty(buildPenaltyEvent(SUNDROP_PENALTY_PER_WRONG));
			}
			// If hearts === 0: breather is already shown by loseHeart()
			// handleBreatherContinue() will restoreHearts + advanceStep
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// MODAL DISMISS CALLBACKS
	// ─────────────────────────────────────────────────────────────────────────

	/** Called when RewardModal auto-dismisses or is tapped. Advance to next step. */
	function handleRewardDismiss() {
		clearPendingReward();
		advanceStep();
		// Play lesson complete sound if lesson is now complete
		if ($lessonPhase === 'complete') {
			playSound('lesson-complete');
		}
	}

	/** Called when PenaltyModal auto-dismisses. Advance to next step. */
	function handlePenaltyDismiss() {
		clearPendingPenalty();
		advanceStep();
	}

	/**
	 * Called when learner taps "Try Again" on the BreatherModal.
	 * Restores hearts + continues from the next step.
	 */
	function handleBreatherContinue() {
		restoreHearts();
		advanceStep();
	}

	function handleStart() {
		lessonStartTime = Date.now();
		startActivities();
	}

	/**
	 * Build HelpContext from the current step + user profile.
	 * Memoised as a derived value — only changes when step changes.
	 * Returns null if no current step (help button hidden in that case).
	 */
	function buildHelpContext(): HelpContext | null {
		const step = $currentStep;
		if (!step) return null;
		return {
			activity: step.activity,
			nativeLanguage: data.profile.nativeLanguage,
			targetLanguage: data.profile.targetLanguage,
			// ageGroup from profile — cast to known union since profile validates it
			ageGroup: (data.profile.ageGroup as '7-10' | '11-14' | '15-18') ?? '11-14',
			level: data.profile.level ?? 'total_beginner',
		};
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

		<!-- LessonHUD: progress bar + hearts + sundrops in one component.
		     Only visible during the activity phase — shows full stats. -->
		{#if $lessonPhase === 'activity'}
			<LessonHUD progress={$progress} />
		{:else}
			<!-- Loading/preview/complete: simpler header with just progress bar -->
			<div class="flex-1 h-3 bg-bark-100 rounded-full overflow-hidden">
				<div
					class="h-full bg-coral-400 rounded-full transition-all duration-500 ease-out"
					style="width: {$progress * 100}%"
				></div>
			</div>
			<!-- Sundrop counter (non-HUD version, smaller) -->
			<div class="flex items-center gap-1 flex-shrink-0 font-bold text-coral-400 text-base min-w-[44px] justify-end">
				<span>☀️</span>
				<span>{$sunDropsEarned}</span>
			</div>
		{/if}

	</header>

	<!-- ── Main content area ── -->
	<main class="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">

		{#if $lessonPhase === 'loading' || $lessonPhase === 'preview'}
			<!-- Loading + Preview handled by LessonLoading -->
			<LessonLoading
				plan={$lessonPlan}
				isReady={$lessonPhase === 'preview'}
				onStart={handleStart}
			/>

		{:else if $lessonPhase === 'error'}
			<!-- Error state -->
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

		{:else if $lessonPhase === 'activity' && $currentStep}
			<!-- Activity — key= forces full re-mount on step change -->
			{#key stepKey}
				<ActivityRouter
					step={$currentStep}
					targetLanguage={data.profile.targetLanguage}
					onComplete={handleActivityComplete}
				/>
			{/key}

		{:else if $lessonPhase === 'complete' && $lessonPlan}
			<!-- Completion screen -->
			<CompletionScreen
				results={$lessonResults}
				plan={$lessonPlan}
				{lessonId}
			/>
		{/if}

	</main>
</div>

<!-- ── MODAL OVERLAYS ── (rendered outside main flow, always on top) ────── -->

<!-- Reward modal — shown on correct answer with sunDrops > 0 -->
{#if $pendingReward}
	<RewardModal
		event={$pendingReward}
		onDismiss={handleRewardDismiss}
	/>
{/if}

<!-- Penalty modal — shown on wrong answer when hearts > 0 -->
{#if $pendingPenalty}
	<PenaltyModal
		event={$pendingPenalty}
		onDismiss={handlePenaltyDismiss}
	/>
{/if}

<!-- Breather modal — shown when hearts hit 0, requires tap to continue -->
{#if $showBreather}
	<BreatherModal onContinue={handleBreatherContinue} />
{/if}

<!-- ── Floating help button — visible only during activity phase ── -->
<!-- Fixed bottom-right, stays above all other content (z-25) -->
{#if $lessonPhase === 'activity' && $currentStep}
	<button
		onclick={() => helpPanelOpen.set(true)}
		aria-label="Open help"
		class="fixed bottom-6 right-4 z-25 w-12 h-12 rounded-full bg-white border-2
			   border-bark-200 shadow-lg text-xl flex items-center justify-center
			   hover:bg-bark-50 hover:border-bark-300 transition-colors max-w-md"
	>
		❓
	</button>
{/if}

<!-- ── HelpPanel slide-up overlay ── -->
<!-- Only constructed when there's a current step (we need the context) -->
{#if $lessonPhase === 'activity' && $currentStep}
	{@const helpCtx = buildHelpContext()}
	{#if helpCtx}
		<HelpPanel
			open={$helpPanelOpen}
			context={helpCtx}
			{lessonId}
			onClose={() => helpPanelOpen.set(false)}
		/>
	{/if}
{/if}
