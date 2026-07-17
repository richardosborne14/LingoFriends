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
		currentStep, currentStepIndex, progress, sunDropsEarned,
		hearts, consecutiveCorrect, pendingReward, pendingPenalty, showBreather,
		helpPanelOpen, stepCompleted,
		initLesson, advanceStep, startActivities, resetLesson,
		recordCorrect, recordWrong, deductSunDrop,
		incrementStreak, resetStreak, loseHeart, restoreHearts,
		setPendingReward, clearPendingReward, setPendingPenalty, clearPendingPenalty,
		// Adaptive engine (TASK-AUDIT-03 — wired in quick-wins sweep)
		injectedStep, pendingSkipOffer,
		advanceStepAdaptive, recordAdaptiveSignal, recordBreatherForAdapter,
		acceptSkip, declineSkip, completeInjectedStep,
	} from '$lib/stores/lesson';
	import SkipAheadPrompt from '$lib/components/lesson/SkipAheadPrompt.svelte';
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
	import { ActivityType } from '$lib/types/lesson';
	import type { AvatarOptions } from '$lib/types/garden';
	import { generateNPC } from '$lib/services/npcGenerator';

	let { data }: { data: PageData } = $props();

	/**
	 * User's avatar options from their profile (TASK-V2-07).
	 * Passed to ActivityRouter → EncounterScene so the user sees themselves.
	 * Uses safe defaults from the server if profile columns are null.
	 *
	 * Note: `avatar` is added by the TASK-V2-07 server update but $types may be
	 * stale in VS Code until `svelte-kit sync` regenerates them. The cast
	 * `as Record<string, unknown>` bridges the gap safely.
	 */
	const profileExtended = data.profile as unknown as {
		targetLanguage: string; nativeLanguage: string; ageGroup: string;
		interests: string[]; personalContext: string | null; level: string;
		avatar: AvatarOptions;
	};
	const userAvatar: AvatarOptions = profileExtended.avatar ?? {
		skinTone: '#F5D0A9', hairColor: '#4A3728', shirtColor: '#FF8A6A',
		hat: 'none', gender: 'neutral',
	};

	/**
	 * Derived NPC config for the current activity step.
	 * Recomputed whenever currentStep changes (step index changes each advance).
	 *
	 * WHY here: The lesson page owns the step index and lessonPlan. ActivityRouter
	 * knows the step type but not its index in the sequence.
	 * deterministic seed = lessonId (stable across replays of same lesson).
	 */
	const npcConfig = $derived.by(() => {
		const plan = $lessonPlan;
		const step = $currentStep;
		if (!plan || !step) return null;

		// findIndex is O(n) per step but lessons have ≤10 steps — negligible cost
		const stepIndex = plan.steps.findIndex((s) => s === step);
		const totalSteps = plan.steps.length;

		return generateNPC(
			Math.max(0, stepIndex),
			totalSteps,
			lessonId,
			data.profile.targetLanguage
		);
	});

	// params.id is always defined for this route — non-null assertion is safe
	const lessonId: string = $page.params.id ?? 'new';

	// Track lesson start time (not in store — owned by this page)
	let lessonStartTime = 0;

	// Per-step start time — feeds responseTimeMs to the adaptive signal tracker.
	// Reset whenever the visible step changes (planned advance OR injection).
	let stepStartTime = Date.now();
	$effect(() => {
		void $currentStepIndex;
		void $injectedStep;
		stepStartTime = Date.now();
	});

	/**
	 * True when the current step is a scored quiz — only these feed the
	 * adaptive tracker and trigger adaptive decisions. INFO/COACHING_CHAT are
	 * teaching steps: auto-"correct", so they'd pollute the signals.
	 */
	function currentStepIsQuiz(): boolean {
		const step = get(currentStep);
		if (!step) return false;
		return (
			step.activity.type !== ActivityType.INFO &&
			step.activity.type !== ActivityType.COACHING_CHAT
		);
	}

	/**
	 * Post-feedback advance: quiz steps consult the adaptive engine
	 * (may inject an easy win or offer a skip); teaching steps advance plainly.
	 * The inject/skip cases don't advance the index — the store sets
	 * $injectedStep / $pendingSkipOffer and the template reacts.
	 */
	function advanceAfterFeedback() {
		if (currentStepIsQuiz()) {
			advanceStepAdaptive();
		} else {
			advanceStep();
		}
	}

	/**
	 * Completion handler for an INJECTED easy-win step (not part of the plan).
	 * Easy wins are always answerable — but guard `correct` anyway; a wrong
	 * answer on an easy win still advances with 0 drops and NO penalty
	 * (the injection exists to relieve pressure, never to add it).
	 */
	function handleInjectedComplete(correct: boolean, earnedSunDrops: number) {
		if (get(stepCompleted)) return;
		stepCompleted.set(true);
		playSound(correct ? 'correct' : 'wrong');
		completeInjectedStep(correct ? earnedSunDrops : 0);
	}

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
		// TASK-FUN-01: the current step already completed — a duplicate call
		// (double tap, stray Enter) must never double-award or double-penalise.
		if (get(stepCompleted)) return;
		stepCompleted.set(true);

		// Update elapsed time before potentially completing
		lessonResults.update((r) => ({ ...r, timeSpentMs: Date.now() - lessonStartTime }));

		// Feed the adaptive tracker — quiz steps only (teaching steps are
		// auto-"correct" and would drown the struggle/mastery signals).
		if (currentStepIsQuiz()) {
			recordAdaptiveSignal(correct, Date.now() - stepStartTime);
		}

		if (correct) {
			// ── CORRECT ANSWER ──────────────────────────────────────────────
			incrementStreak();
			playSound('correct');

			// Play streak sound at milestones
			const streak = get(consecutiveCorrect);
			if (streak >= 10) playSound('streak-10');
			else if (streak >= 5) playSound('streak-5');
			else if (streak >= 3) playSound('streak-3');

			if (earnedSunDrops > 0) {
				// Build the event FIRST so the credited amount is the modal's
				// total (base + streak bonus). Previously only the base was
				// recorded, so the modal promised drops the child never got.
				const event = buildRewardEvent(earnedSunDrops, streak);
				recordCorrect(event.sunDrops);
				// Show reward modal — it will call handleRewardDismiss when done
				setPendingReward(event);
				// (don't advanceStep here — modal callback does it)
			} else {
				// INFO steps earn 0 sunDrops — count the correct, skip modal, advance.
				// Still adaptive-aware: a mastery streak can end on a 0-drop quiz
				// step (e.g. skipped SpeakIt), and the skip offer should not be lost.
				recordCorrect(0);
				advanceAfterFeedback();
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
			} else {
				// Breather shown by loseHeart() — tell the adapter so it injects
				// an easy win as the VERY NEXT step after "Try Again" (TASK-AUDIT-03)
				recordBreatherForAdapter();
			}
			// handleBreatherContinue() will restoreHearts + adaptive advance
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// MODAL DISMISS CALLBACKS
	// ─────────────────────────────────────────────────────────────────────────

	/** Called when RewardModal auto-dismisses or is tapped. Advance (adaptively). */
	function handleRewardDismiss() {
		clearPendingReward();
		advanceAfterFeedback();
		// Play lesson complete sound if lesson is now complete
		if ($lessonPhase === 'complete') {
			playSound('lesson-complete');
		}
	}

	/** Called when PenaltyModal auto-dismisses. Advance (adaptively). */
	function handlePenaltyDismiss() {
		clearPendingPenalty();
		advanceAfterFeedback();
	}

	/**
	 * Called when learner taps "Try Again" on the BreatherModal.
	 * Restores hearts, then advances adaptively — the tracker recorded the
	 * breather, so the adapter injects an easy win here (TASK-AUDIT-03).
	 */
	function handleBreatherContinue() {
		restoreHearts();
		advanceAfterFeedback();
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
			// Use profileExtended to access `level` — $types may lag behind server changes
			level: profileExtended.level ?? 'total_beginner',
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

		{:else if $lessonPhase === 'activity' && $injectedStep}
			<!-- Adaptive easy-win step (TASK-AUDIT-03) — rendered INSTEAD of the
			     planned step at the same index. Completing it advances the plan. -->
			{#key `inject-${$currentStepIndex}`}
				<ActivityRouter
					step={$injectedStep}
					targetLanguage={data.profile.targetLanguage}
					onComplete={handleInjectedComplete}
					disabled={$stepCompleted}
					{npcConfig}
					{userAvatar}
				/>
			{/key}

		{:else if $lessonPhase === 'activity' && $currentStep}
			<!-- Activity — keyed on the step index so it re-mounts only when the
			     step actually advances. While the reward/penalty modal is up the
			     answered activity stays mounted but frozen (disabled) so it can't
			     be resubmitted (TASK-FUN-01).
			     npcConfig + userAvatar added in TASK-V2-07 for EncounterScene banner. -->
			{#key $currentStepIndex}
				<ActivityRouter
					step={$currentStep}
					targetLanguage={data.profile.targetLanguage}
					onComplete={handleActivityComplete}
					disabled={$stepCompleted}
					{npcConfig}
					{userAvatar}
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

<!-- Skip-ahead offer (TASK-AUDIT-03) — shown when the adapter detects mastery -->
{#if $pendingSkipOffer?.action === 'skip_offer'}
	{@const skipTo = $pendingSkipOffer.skipToIndex}
	<SkipAheadPrompt
		onSkip={() => acceptSkip(skipTo)}
		onContinue={declineSkip}
	/>
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
