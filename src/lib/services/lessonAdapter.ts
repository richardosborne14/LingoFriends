/**
 * LingoFriends V2 — Adaptive Lesson Decision Engine (TASK-AUDIT-03)
 *
 * Decides what to do at each step transition based on the child's
 * real-time performance signals. Sits between the lesson plan (fixed)
 * and the UI, intercepting advanceStep() calls.
 *
 * KEY PRINCIPLE: This code NEVER mutates the lesson plan.
 * It creates additional steps or decides to skip — the original plan
 * is preserved as the source of truth.
 *
 * Decision rules (from PEDAGOGY.md "Adaptive Behaviour During a Lesson"):
 *
 * ┌──────────────────────────────────┬─────────────────────────────────────┐
 * │ Signal                           │ Decision                            │
 * ├──────────────────────────────────┼─────────────────────────────────────┤
 * │ 2+ consecutive wrong             │ 'inject' — easy win MC review       │
 * │ Post-breather (hearts lost)      │ 'inject' — easy win before next     │
 * │ 4+ consecutive correct           │ 'skip_offer' — offer to jump ahead  │
 * │ Everything else                  │ 'continue' — next planned step      │
 * └──────────────────────────────────┴─────────────────────────────────────┘
 *
 * Safety rails (prevent the system from being too aggressive):
 * - Max 3 easy-win injections per lesson
 * - Max 1 skip-ahead offer per lesson
 * - Never inject on INFO or COACHING_CHAT steps (no failure possible)
 * - Never skip INFO steps (child must SEE content before being tested)
 *
 * @module services/lessonAdapter
 * @see lessonSignals.ts — signal tracker
 * @see PEDAGOGY.md — Adaptive Behaviour section
 */

import type { LessonStep, ActivityConfig } from '$lib/types/lesson';
import { ActivityType } from '$lib/types/lesson';
import {
	type LessonSignals,
	WRONG_STREAK_THRESHOLD,
	CORRECT_STREAK_THRESHOLD,
	MAX_EASY_WINS_PER_LESSON,
	MAX_SKIPS_PER_LESSON,
} from '$lib/services/lessonSignals';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A mastered chunk — content the child has answered correctly.
 * Used as source material for easy-win steps.
 * Minimal shape: just what we need to build a MC question.
 */
export interface MasteredChunk {
	targetPhrase: string;
	nativeTranslation: string;
}

/**
 * The three possible outcomes of the adaptive decision.
 *
 * 'continue'    → proceed to next planned step as normal
 * 'inject'      → insert an easy-win step before the next planned step
 * 'skip_offer'  → show a skip-ahead prompt; child decides
 */
export type AdaptiveDecision =
	| { action: 'continue' }
	| { action: 'inject'; step: LessonStep }
	| {
			action: 'skip_offer';
			/** Index in allSteps to jump to if child accepts */
			skipToIndex: number;
			/** Human-readable description of where we'd skip to */
			skipDescription: string;
	  };

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TYPE GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if this step is a quiz activity — one where a wrong
 * answer is possible. Non-quiz steps (INFO, COACHING_CHAT) never
 * trigger adaptive decisions.
 *
 * WHY: We can't "fail" an INFO step — the child just reads it.
 * Injecting an easy win after an INFO step makes no logical sense.
 */
function isQuizStep(step: LessonStep): boolean {
	const quizTypes: ActivityType[] = [
		ActivityType.MULTIPLE_CHOICE,
		ActivityType.FILL_BLANK,
		ActivityType.TRANSLATE,
		ActivityType.TRUE_FALSE,
		ActivityType.WORD_ARRANGE,
		ActivityType.MATCHING,
		ActivityType.SPEAK_IT,
	];
	return quizTypes.includes(step.activity.type);
}

/**
 * Returns true if this step is an INFO step.
 * INFO steps must NEVER be skipped — the child must see the content
 * before they're quizzed on it (teach-before-test, PEDAGOGY.md).
 */
function isInfoStep(step: LessonStep): boolean {
	return step.activity.type === ActivityType.INFO;
}

// ─────────────────────────────────────────────────────────────────────────────
// EASY WIN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple ID generator for injected steps.
 * Using a timestamp+random suffix to avoid external dependencies.
 * NOT cryptographically secure — just needs to be unique enough
 * that injected steps have distinct IDs from planned steps.
 */
function generateStepId(): string {
	return `injected-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Build an easy-win step from a previously mastered chunk.
 *
 * PEDAGOGY RULE: The easy win is ALWAYS a multiple-choice recognition
 * question using content the child ALREADY got right. This guarantees
 * they'll very likely get it correct, restoring confidence after a
 * failure streak.
 *
 * The tutor text says "Quick review! 💪" — not "Here's an easy one
 * because you were struggling." Tone is encouraging, not condescending.
 *
 * Distractors are drawn from the OTHER mastered chunks (if available)
 * or from a small static pool. MC recognition is the simplest activity
 * type — ideal for confidence restoration.
 *
 * @param masteredChunk - The chunk to test (child already got this right)
 * @param allMastered - All mastered chunks (used for distractor generation)
 * @returns A LessonStep that acts as a confidence booster
 */
export function buildEasyWinStep(
	masteredChunk: MasteredChunk,
	allMastered: MasteredChunk[],
): LessonStep {
	// Collect 3 distractors from OTHER mastered chunks
	// (if not enough mastered chunks, generate simple ones)
	const otherMastered = allMastered.filter(
		(c) => c.targetPhrase !== masteredChunk.targetPhrase,
	);

	// Take up to 3 native translations from other mastered chunks as distractors
	const distractors: string[] = otherMastered
		.slice(0, 3)
		.map((c) => c.nativeTranslation);

	// Pad with generic fallback distractors if we don't have enough mastered content
	// WHY these fallbacks: they're obviously wrong to a child with any knowledge,
	// making the easy win genuinely achievable.
	const fallbackDistractors = ['I don\'t know', 'Maybe this?', 'Something else'];
	while (distractors.length < 3) {
		distractors.push(fallbackDistractors[distractors.length]);
	}

	// Shuffle options so the correct answer isn't always first
	// Fisher-Yates on the distractors array (correct answer index tracked separately)
	const allOptions = [masteredChunk.nativeTranslation, ...distractors];
	for (let i = allOptions.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
	}
	const correctIndex = allOptions.indexOf(masteredChunk.nativeTranslation);

	const activity: ActivityConfig = {
		type: ActivityType.MULTIPLE_CHOICE,
		question: `What does "${masteredChunk.targetPhrase}" mean?`,
		options: allOptions,
		correctIndex,
		targetPhrase: masteredChunk.targetPhrase,
	} as ActivityConfig;

	return {
		id: generateStepId(),
		// "Quick review!" not "Here's an easy one because you struggled"
		tutorText: 'Quick review! 💪',
		// Help text pre-reveals the answer — this IS the help for this step
		helpText: `"${masteredChunk.targetPhrase}" means "${masteredChunk.nativeTranslation}".`,
		activity,
		// 1 SunDrop — small reward for a confidence booster, not a big earner
		// Full rewards come from the real lesson steps
		sunDrops: 1,
		// Flag this as injected so the progress bar can ignore it
		isInjected: true,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// SKIP-AHEAD FINDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the index of the next chunk's INTRODUCE (INFO) step.
 *
 * Skip-ahead always lands on the NEXT chunk's INFO step — never
 * mid-chunk. This preserves the teach-before-test invariant.
 *
 * Strategy: scan forward from currentIndex+1, find the first INFO step
 * that belongs to the next chunk boundary.
 *
 * We detect chunk boundaries by looking for INFO steps that aren't
 * immediately adjacent to the current position (indicating a new chunk started).
 *
 * @returns The index to jump to, or null if no valid skip target exists
 */
function findNextChunkInfoIndex(
	allSteps: LessonStep[],
	currentIndex: number,
): number | null {
	// Scan forward looking for INFO steps
	let foundCurrentChunk = false;
	for (let i = currentIndex + 1; i < allSteps.length; i++) {
		const step = allSteps[i];
		if (isInfoStep(step)) {
			if (!foundCurrentChunk) {
				// First INFO step ahead might still be in current chunk
				foundCurrentChunk = true;
				// But if it's more than 3 steps ahead, assume it's a new chunk
				if (i > currentIndex + 3) {
					return i;
				}
			} else {
				// Second INFO step ahead is definitely a new chunk
				return i;
			}
		}
	}
	// If only one INFO step found in the remaining steps, offer skip to it
	if (foundCurrentChunk) {
		for (let i = currentIndex + 1; i < allSteps.length; i++) {
			if (isInfoStep(allSteps[i])) {
				return i;
			}
		}
	}
	return null; // No valid skip target
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DECISION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decide what to do at the current step transition.
 *
 * This is the heart of the adaptive engine. It reads the signals snapshot
 * and determines whether to continue normally, inject an easy win, or
 * offer a skip-ahead.
 *
 * Called by advanceStep() in the lesson store after each activity completion.
 *
 * Decision priority order (highest first):
 * 1. Post-breather → inject easy win (safety net after hearts lost)
 * 2. Wrong streak >= threshold → inject easy win (intervention)
 * 3. Correct streak >= threshold → skip_offer (accelerate)
 * 4. Default → continue
 *
 * @param signals       - Current signal snapshot
 * @param completedStep - The step just completed
 * @param allSteps      - Full lesson plan (never modified)
 * @param currentIndex  - Index of the step just completed
 * @param masteredChunks - Chunks the child has already answered correctly
 * @returns AdaptiveDecision
 */
export function decideNextStep(
	signals: LessonSignals,
	completedStep: LessonStep,
	allSteps: LessonStep[],
	currentIndex: number,
	masteredChunks: MasteredChunk[],
): AdaptiveDecision {
	// ── Safety gate: Non-quiz steps never trigger injection ──────────────────
	// INFO and COACHING_CHAT completions always continue normally.
	// There's no "wrong" for these step types.
	if (!isQuizStep(completedStep)) {
		return { action: 'continue' };
	}

	// ── Safety gate: Exhausted injection budget ───────────────────────────────
	// If we've already injected the max easy wins, always continue.
	// We don't want to inflate the lesson length excessively.
	const maxWinsReached = signals.easyWinsInjected >= MAX_EASY_WINS_PER_LESSON;

	// ── Priority 1: Post-breather injection ──────────────────────────────────
	// The breather modal plays when the child loses all hearts.
	// After a breather, the VERY NEXT step should be an easy win to
	// restore confidence before returning to the main content.
	if (signals.breatherShownSinceLastEasyWin && !maxWinsReached) {
		const easyWin = pickEasyWin(masteredChunks, allSteps);
		if (easyWin) {
			return { action: 'inject', step: easyWin };
		}
		// No masterable content to pull from yet → continue
	}

	// ── Priority 2: Wrong streak intervention ────────────────────────────────
	// 2+ consecutive wrong answers means the child is struggling.
	// Inject an easy win to break the failure streak and restore confidence.
	// See PEDAGOGY.md: "Never stack multiple failures without an easy win."
	if (signals.consecutiveWrong >= WRONG_STREAK_THRESHOLD && !maxWinsReached) {
		const easyWin = pickEasyWin(masteredChunks, allSteps);
		if (easyWin) {
			return { action: 'inject', step: easyWin };
		}
		// No mastered content to draw from → continue normally
		// (This happens early in a lesson before any correct answers)
	}

	// ── Priority 3: Skip-ahead offer ─────────────────────────────────────────
	// 4+ consecutive correct answers signals the child may already know this.
	// Offer to jump to the next chunk's INTRODUCE step.
	// Only offered once per lesson (max) to prevent over-accelerating.
	if (
		signals.consecutiveCorrect >= CORRECT_STREAK_THRESHOLD &&
		signals.skipsOffered < MAX_SKIPS_PER_LESSON
	) {
		const skipToIndex = findNextChunkInfoIndex(allSteps, currentIndex);
		if (skipToIndex !== null) {
			return {
				action: 'skip_offer',
				skipToIndex,
				skipDescription: 'the next section',
			};
		}
		// No valid skip target → continue normally (probably near end of lesson)
	}

	// ── Default: continue ─────────────────────────────────────────────────────
	return { action: 'continue' };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the best mastered chunk to use for an easy-win step.
 *
 * Strategy: use the MOST RECENTLY mastered chunk (last in the array).
 * This is the freshest content in the child's memory — most likely to
 * feel familiar and achievable.
 *
 * Returns null if no mastered chunks exist (early in the lesson, before
 * any quiz has been completed correctly).
 *
 * @param masteredChunks - All chunks answered correctly so far
 * @param allSteps       - Full lesson plan (unused currently, reserved for future)
 */
function pickEasyWin(
	masteredChunks: MasteredChunk[],
	_allSteps: LessonStep[],
): LessonStep | null {
	if (masteredChunks.length === 0) return null;
	// Most recently mastered = last element
	const chunk = masteredChunks[masteredChunks.length - 1];
	return buildEasyWinStep(chunk, masteredChunks);
}
