/**
 * LingoFriends V2 — Lesson State Store
 *
 * Svelte stores that manage all state for an active lesson session.
 *
 * State is kept flat and explicit — each piece of state has a single store.
 * Derived stores compute secondary values (progress, currentStep, isComplete).
 *
 * Lifecycle:
 *   1. initLesson(plan, audioMap) — called when generation API returns
 *   2. advanceStep() — called after each activity completes
 *   3. recordCorrect(sunDrops) / recordWrong() — called by activity components
 *   4. recordHelpUsed() — called when help button is tapped
 *   5. resetLesson() — called when navigating away or restarting
 *
 * TASK-V2-03 additions:
 *   - hearts / consecutiveCorrect / pendingReward / pendingPenalty / showBreather
 *   - Actions: loseHeart, restoreHearts, incrementStreak, resetStreak,
 *              setPendingReward, clearPendingReward, setPendingPenalty, clearPendingPenalty
 *
 * @module stores/lesson
 */

import { writable, derived, get } from 'svelte/store';
import type { LessonPlan, LessonStep, LessonResults } from '$lib/types/lesson';
import type { RewardEvent, PenaltyEvent } from '$lib/services/rewardService';
import { STARTING_HEARTS } from '$lib/services/rewardService';

// ─────────────────────────────────────────────────────────────────────────────
// CORE STATE STORES
// ─────────────────────────────────────────────────────────────────────────────

/** The current lesson plan — null before generation completes */
export const lessonPlan = writable<LessonPlan | null>(null);

/** Which step index we're currently on (0-based) */
export const currentStepIndex = writable<number>(0);

/**
 * Accumulated lesson results.
 * Updated in real-time as the learner completes each activity.
 * Sent to POST /api/lessons/[id]/complete when the lesson ends.
 */
export const lessonResults = writable<LessonResults>({
	sunDropsEarned: 0,
	sunDropsMax: 0,
	correctCount: 0,
	wrongCount: 0,
	helpUsed: 0,
	timeSpentMs: 0,
	chunkResults: [],
});

/**
 * Pre-fetched TTS audio map: text → base64 MP3.
 * Populated by the lesson page after generation completes.
 * Activity components read from this for instant audio playback.
 */
export const audioMap = writable<Record<string, string>>({});

/**
 * Whether the help button was used on the CURRENT step.
 * Resets to false when advanceStep() is called.
 * Used by activity components to halve the SunDrop reward when help is active.
 */
export const helpUsedThisStep = writable<boolean>(false);

/**
 * Whether the HelpPanel slide-up is currently open (TASK-V2-05).
 * Set true when ❓ is tapped. Set false when HelpPanel.onClose() fires.
 */
export const helpPanelOpen = writable<boolean>(false);

/** Lesson phase — controls which screen is shown on the lesson page */
export type LessonPhase = 'loading' | 'preview' | 'activity' | 'complete' | 'error';
export const lessonPhase = writable<LessonPhase>('loading');

/** Error message shown when generation or completion fails */
export const lessonError = writable<string | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// HEARTS & STREAK (TASK-V2-03)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remaining hearts (lives) for this lesson session.
 * Starts at STARTING_HEARTS (3). Decrements on wrong answers.
 * Resets to STARTING_HEARTS when the learner taps "Try Again" on the breather.
 *
 * WHY hearts, not game-over: LingoFriends is gentler than Duolingo.
 * Hitting 0 triggers a "breather" pause, not failure. See PEDAGOGY.md.
 */
export const hearts = writable<number>(STARTING_HEARTS);

/**
 * Consecutive correct answers since last wrong answer.
 * Resets to 0 on any wrong answer or on initLesson/resetLesson.
 * Drives streak bonus detection in the reward system.
 */
export const consecutiveCorrect = writable<number>(0);

/**
 * Pending reward event — non-null means the RewardModal should be visible.
 * Set by setPendingReward(), cleared by clearPendingReward() after auto-dismiss.
 */
export const pendingReward = writable<RewardEvent | null>(null);

/**
 * Pending penalty event — non-null means the PenaltyModal should be visible.
 * Set by setPendingPenalty(), cleared by clearPendingPenalty() after auto-dismiss.
 */
export const pendingPenalty = writable<PenaltyEvent | null>(null);

/**
 * Whether the "Take a Breather" modal is visible.
 * Set to true by loseHeart() when hearts reach 0.
 * Set to false by restoreHearts() when learner taps "Try Again".
 */
export const showBreather = writable<boolean>(false);

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED STORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The current lesson step (null before lesson loads or when complete).
 * Derived from lessonPlan + currentStepIndex.
 */
export const currentStep = derived(
	[lessonPlan, currentStepIndex],
	([$plan, $index]): LessonStep | null => $plan?.steps[$index] ?? null
);

/**
 * Progress as a fraction from 0 to 1.
 * Used to drive the progress bar width.
 *
 * Returns 0 when no plan is loaded, 1 when all steps complete.
 */
export const progress = derived(
	[lessonPlan, currentStepIndex],
	([$plan, $index]): number => {
		if (!$plan || $plan.steps.length === 0) return 0;
		return $index / $plan.steps.length;
	}
);

/**
 * True when the learner has completed all steps.
 * Triggers the completion screen.
 */
export const isComplete = derived(
	[lessonPlan, currentStepIndex],
	([$plan, $index]): boolean => {
		if (!$plan) return false;
		return $index >= $plan.steps.length;
	}
);

/**
 * SunDrops earned so far in this session.
 * Derived for easy display in the header counter.
 */
export const sunDropsEarned = derived(
	lessonResults,
	($results): number => $results.sunDropsEarned
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialises a new lesson session.
 * Called when the generation API returns a valid LessonPlan.
 *
 * @param plan  - The validated LessonPlan from /api/lessons/generate
 * @param audio - Pre-fetched audio map (can be empty, audio will be fetched on demand)
 */
export function initLesson(plan: LessonPlan, audio: Record<string, string> = {}): void {
	lessonPlan.set(plan);
	currentStepIndex.set(0);
	// NOTE: audioMap is set AFTER this block — see audioCache merge below
	helpUsedThisStep.set(false);
	lessonError.set(null);
	// Reset hearts and streak for the new lesson
	hearts.set(STARTING_HEARTS);
	consecutiveCorrect.set(0);
	pendingReward.set(null);
	pendingPenalty.set(null);
	showBreather.set(false);

	// Seed the audio map with any server-pre-generated audio from the plan.
	// This means INFO step phrases + explanations play instantly (no TTS fetch delay).
	// The audio parameter can extend/override the plan cache (e.g., on-demand fetches).
	audioMap.set({ ...(plan.audioCache ?? {}), ...audio });

	// Initialise results with 0 earned, max from the plan
	lessonResults.set({
		sunDropsEarned: 0,
		sunDropsMax: plan.totalSunDrops,
		correctCount: 0,
		wrongCount: 0,
		helpUsed: 0,
		timeSpentMs: 0,
		chunkResults: [],
		lessonData: plan,
	});

	// Move to preview phase (WhatYoullLearn screen)
	lessonPhase.set('preview');
}

/**
 * Advances to the next lesson step.
 * Called by the lesson page after an activity completes (correct or wrong).
 *
 * Resets per-step state (helpUsedThisStep).
 * Transitions to 'complete' phase if all steps are done.
 */
export function advanceStep(): void {
	helpUsedThisStep.set(false);

	const plan = get(lessonPlan);
	const nextIndex = get(currentStepIndex) + 1;
	currentStepIndex.set(nextIndex);

	// Check if lesson is now complete
	if (plan && nextIndex >= plan.steps.length) {
		// timeSpentMs is set by the lesson page (which owns the start time)
		// before calling advanceStep() on the final step
		lessonPhase.set('complete');
	}
}

/**
 * Records a correct answer and adds SunDrops to the session total.
 *
 * @param sunDropsEarned - SunDrops awarded for this correct answer
 *                         (may be halved if helpUsedThisStep is true)
 */
export function recordCorrect(earned: number): void {
	lessonResults.update((r) => ({
		...r,
		sunDropsEarned: r.sunDropsEarned + earned,
		correctCount: r.correctCount + 1,
	}));
}

/**
 * Records a wrong answer.
 * SunDrops are deducted by the activity component itself (floored at 0).
 * This just increments the wrong count for the session summary.
 */
export function recordWrong(): void {
	lessonResults.update((r) => ({
		...r,
		wrongCount: r.wrongCount + 1,
	}));
}

/**
 * Records that the help button was used on the current step.
 * Sets helpUsedThisStep so activity components can halve the reward.
 * Also increments the session help counter.
 */
export function recordHelpUsed(): void {
	helpUsedThisStep.set(true);
	lessonResults.update((r) => ({
		...r,
		helpUsed: r.helpUsed + 1,
	}));
}

/**
 * Deducts SunDrops (floor at 0) — called when a wrong answer costs a SunDrop.
 */
export function deductSunDrop(): void {
	lessonResults.update((r) => ({
		...r,
		sunDropsEarned: Math.max(0, r.sunDropsEarned - 1),
	}));
}

/**
 * Transitions from the preview (WhatYoullLearn) to the first activity.
 */
export function startActivities(): void {
	lessonPhase.set('activity');
}

/**
 * Resets all lesson state.
 * Called when navigating away from the lesson page or restarting.
 */
export function resetLesson(): void {
	lessonPlan.set(null);
	currentStepIndex.set(0);
	audioMap.set({});
	helpUsedThisStep.set(false);
	lessonPhase.set('loading');
	lessonError.set(null);
	lessonResults.set({
		sunDropsEarned: 0,
		sunDropsMax: 0,
		correctCount: 0,
		wrongCount: 0,
		helpUsed: 0,
		timeSpentMs: 0,
		chunkResults: [],
	});
	// Reset TASK-V2-03 state
	hearts.set(STARTING_HEARTS);
	consecutiveCorrect.set(0);
	pendingReward.set(null);
	pendingPenalty.set(null);
	showBreather.set(false);
}

// ─────────────────────────────────────────────────────────────────────────────
// HEARTS & STREAK ACTIONS (TASK-V2-03)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Increments the consecutive correct streak by 1.
 * Called BEFORE building the reward event so the streak count is current.
 */
export function incrementStreak(): void {
	consecutiveCorrect.update((n) => n + 1);
}

/**
 * Resets the consecutive correct streak to 0.
 * Called when the learner gives a wrong answer.
 */
export function resetStreak(): void {
	consecutiveCorrect.set(0);
}

/**
 * Decrements hearts by 1 (floor at 0).
 * If hearts reach 0, automatically sets showBreather = true.
 *
 * WHY show breather automatically: when hearts hit 0 we want the breather
 * to appear as part of the loseHeart call, keeping the calling code simple.
 */
export function loseHeart(): void {
	hearts.update((h) => {
		const next = Math.max(0, h - 1);
		if (next === 0) {
			// Breather triggers when hearts run out
			showBreather.set(true);
		}
		return next;
	});
}

/**
 * Restores hearts to the starting amount and hides the breather modal.
 * Called when the learner taps "Try Again" on the BreatherModal.
 */
export function restoreHearts(): void {
	hearts.set(STARTING_HEARTS);
	showBreather.set(false);
}

/**
 * Sets the pending reward event (shows RewardModal).
 *
 * @param event - The reward event built by buildRewardEvent() in rewardService
 */
export function setPendingReward(event: RewardEvent): void {
	pendingReward.set(event);
}

/**
 * Clears the pending reward (hides RewardModal).
 * Called after the auto-dismiss timer fires.
 */
export function clearPendingReward(): void {
	pendingReward.set(null);
}

/**
 * Sets the pending penalty event (shows PenaltyModal).
 *
 * @param event - The penalty event built by buildPenaltyEvent() in rewardService
 */
export function setPendingPenalty(event: PenaltyEvent): void {
	pendingPenalty.set(event);
}

/**
 * Clears the pending penalty (hides PenaltyModal).
 * Called after the auto-dismiss timer fires.
 */
export function clearPendingPenalty(): void {
	pendingPenalty.set(null);
}
