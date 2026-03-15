/**
 * LingoFriends V2 — Lesson Signal Tracker (TASK-AUDIT-03)
 *
 * Tracks real-time learner performance signals during a lesson session.
 * These signals feed the adaptive decision engine (lessonAdapter.ts) which
 * decides whether to inject easy-win steps or offer skip-ahead.
 *
 * Maps directly to the PEDAGOGY.md "Adaptive Behaviour During a Lesson" table:
 *
 * ┌──────────────────────────┬──────────────────────────────────────────┐
 * │ Signal                   │ Response                                 │
 * ├──────────────────────────┼──────────────────────────────────────────┤
 * │ 2+ wrong in a row        │ Inject easy-win review of last correct  │
 * │ 4+ correct               │ Offer skip to next chunk                │
 * │ Help used + wrong        │ Inject easier variant of current chunk  │
 * │ Breather shown           │ Next step must be an easy win           │
 * └──────────────────────────┴──────────────────────────────────────────┘
 *
 * Design principles:
 * - Zero UI dependencies — pure TypeScript, testable without a browser
 * - Stateful per-lesson — reset() between lessons
 * - All signal thresholds are constants at the top (tunable without code search)
 *
 * @module services/lessonSignals
 */

// ─────────────────────────────────────────────────────────────────────────────
// TUNABLE THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many consecutive wrong answers before we inject an easy win.
 * 2 = intervene quickly (recommended — affective filter rises fast in children).
 * See PEDAGOGY.md — Krashen's Affective Filter.
 */
export const WRONG_STREAK_THRESHOLD = 2;

/**
 * How many consecutive correct answers before we offer skip-ahead.
 * 4 = accuracy-based MVP (time-based detection is unreliable on mobile).
 */
export const CORRECT_STREAK_THRESHOLD = 4;

/**
 * Maximum easy-win steps that can be injected per lesson.
 * 3 = don't turn the lesson into a victory lap.
 */
export const MAX_EASY_WINS_PER_LESSON = 3;

/**
 * Maximum skip-ahead offers per lesson.
 * 1 = the child still needs to learn the content (just faster).
 */
export const MAX_SKIPS_PER_LESSON = 1;

/**
 * How many recent response times to keep for trend detection.
 * 3 = enough for a meaningful average without too much history.
 */
const RESPONSE_TIME_HISTORY_LENGTH = 3;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of all tracked signals at a point in time.
 * The adapter reads this to make decisions — it's a pure value object.
 */
export interface LessonSignals {
	/** Consecutive wrong answers on quiz steps. Resets on correct answer. */
	consecutiveWrong: number;
	/** Consecutive correct answers on quiz steps. Resets on wrong answer. */
	consecutiveCorrect: number;
	/** Total help button taps this lesson (cumulative, never resets). */
	helpUsedTotal: number;
	/** Response times for the last N steps (ms). Oldest first. */
	recentResponseTimesMs: number[];
	/** How many easy-win steps have already been injected this lesson. */
	easyWinsInjected: number;
	/** How many skip-ahead offers have been made this lesson. */
	skipsOffered: number;
	/** Whether the breather modal has been shown since the last easy win. */
	breatherShownSinceLastEasyWin: boolean;
	/** Was the last quiz step answered with help? (For help+wrong signal) */
	lastStepUsedHelp: boolean;
}

/**
 * The mutable signal tracker interface.
 * Parent code holds a LessonSignalTracker instance; the adapter reads
 * snapshots via getSignals().
 */
export interface LessonSignalTracker {
	/**
	 * Record the result of a completed quiz step.
	 *
	 * @param correct - Whether the child got it right
	 * @param responseTimeMs - How long the child took to answer (ms)
	 */
	recordAttempt(correct: boolean, responseTimeMs: number): void;

	/** Record that the help button was tapped for the current step. */
	recordHelpUsed(): void;

	/**
	 * Record that the breather modal was shown.
	 * The adapter checks this: post-breather steps should be easy wins.
	 */
	recordBreather(): void;

	/**
	 * Record that an easy-win step was injected.
	 * Increments easyWinsInjected and resets breatherShownSinceLastEasyWin.
	 */
	recordEasyWinInjected(): void;

	/**
	 * Record that a skip-ahead offer was made (regardless of whether accepted).
	 * Prevents multiple offers per lesson.
	 */
	recordSkipOffered(): void;

	/** Get a snapshot of current signals (pure read — no mutation). */
	getSignals(): LessonSignals;

	/** Reset all signals for a new lesson. */
	reset(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new LessonSignalTracker instance.
 *
 * Returns a fresh tracker with all signals at zero.
 * One tracker instance per lesson — call reset() between lessons or
 * create a new one.
 *
 * @returns LessonSignalTracker ready for use
 *
 * @example
 * ```typescript
 * const tracker = createSignalTracker();
 * tracker.recordAttempt(false, 8000); // Wrong after 8 seconds
 * tracker.recordAttempt(false, 6000); // Wrong again
 * // → signals.consecutiveWrong === 2 (triggers easy win injection)
 * ```
 */
export function createSignalTracker(): LessonSignalTracker {
	// Mutable internal state — ONLY mutated by the methods below
	let consecutiveWrong = 0;
	let consecutiveCorrect = 0;
	let helpUsedTotal = 0;
	let recentResponseTimesMs: number[] = [];
	let easyWinsInjected = 0;
	let skipsOffered = 0;
	let breatherShownSinceLastEasyWin = false;
	let lastStepUsedHelp = false;

	return {
		recordAttempt(correct: boolean, responseTimeMs: number): void {
			// Update streak counters
			if (correct) {
				consecutiveCorrect += 1;
				consecutiveWrong = 0; // Reset wrong streak on any correct answer
			} else {
				consecutiveWrong += 1;
				consecutiveCorrect = 0; // Reset correct streak on any wrong answer
			}

			// Maintain a rolling window of recent response times
			// Oldest entry is dropped when window is full
			recentResponseTimesMs = [
				...recentResponseTimesMs.slice(-(RESPONSE_TIME_HISTORY_LENGTH - 1)),
				responseTimeMs,
			];

			// Reset per-step help flag (help is tracked per step, not per attempt)
			lastStepUsedHelp = false;
		},

		recordHelpUsed(): void {
			helpUsedTotal += 1;
			lastStepUsedHelp = true; // This step specifically used help
		},

		recordBreather(): void {
			breatherShownSinceLastEasyWin = true;
			// Reset streaks — the child "died" and started fresh
			// Don't penalise for the chain of failures that led here
			consecutiveWrong = 0;
		},

		recordEasyWinInjected(): void {
			easyWinsInjected += 1;
			breatherShownSinceLastEasyWin = false; // Easy win satisfies the breather signal
			consecutiveWrong = 0; // Easy win resets the wrong streak (we're intervening)
		},

		recordSkipOffered(): void {
			skipsOffered += 1;
		},

		getSignals(): LessonSignals {
			// Return a snapshot — pure value object, not a reference to internal state
			return {
				consecutiveWrong,
				consecutiveCorrect,
				helpUsedTotal,
				recentResponseTimesMs: [...recentResponseTimesMs], // copy — don't leak mutability
				easyWinsInjected,
				skipsOffered,
				breatherShownSinceLastEasyWin,
				lastStepUsedHelp,
			};
		},

		reset(): void {
			consecutiveWrong = 0;
			consecutiveCorrect = 0;
			helpUsedTotal = 0;
			recentResponseTimesMs = [];
			easyWinsInjected = 0;
			skipsOffered = 0;
			breatherShownSinceLastEasyWin = false;
			lastStepUsedHelp = false;
		},
	};
}
