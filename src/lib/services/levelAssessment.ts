/**
 * LingoFriends V2 — Level Assessment Service
 *
 * Pure functions to evaluate learner performance across recent lessons and
 * recommend adaptive level changes (bump up or bump down).
 *
 * ARCHITECTURE: This module is intentionally side-effect-free — no DB, no AI,
 * no Svelte. The completion API calls assessLevel() and persists results.
 * This keeps every function fully testable with plain TypeScript unit tests.
 *
 * PEDAGOGY: Level changes are always *offers*, never forced. The learner has
 * full control — they can accept, decline, or change manually in Settings.
 * Respecting autonomy reduces anxiety and increases motivation. See PEDAGOGY.md.
 *
 * @module services/levelAssessment
 */

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All valid user level codes in ascending difficulty order.
 * Must match the values stored in profiles.level in the DB schema.
 * Ordering matters — getNextLevel/getPrevLevel rely on array position.
 */
export const USER_LEVELS = [
	'total_beginner',
	'know_some_words',
	'simple_sentences',
	'can_have_conversations',
] as const;

export type UserLevel = (typeof USER_LEVELS)[number];

/**
 * Human-readable display names for each level.
 * Plant metaphors match the garden theme and avoid intimidating labels
 * (no CEFR codes, no "advanced", no "expert" — kids shouldn't feel behind).
 */
export const LEVEL_DISPLAY_NAMES: Record<UserLevel, string> = {
	total_beginner: '🌱 Just Starting',
	know_some_words: '🌿 I Know Some Words',
	simple_sentences: '🌳 Simple Sentences',
	can_have_conversations: '🌲 Can Have Conversations',
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT THRESHOLDS
// These numbers are the core tuning parameters for the adaptive system.
// All three conditions in a direction must hold simultaneously — this prevents
// a single outlier metric from triggering a change.
// Adjust based on real learner data once the app has users.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bump UP thresholds: learner is too comfortable at current level.
 * Consistent >90% accuracy + minimal help + near-perfect hearts → offer next level.
 */
const BUMP_UP_ACCURACY_THRESHOLD = 0.9; // >90% correct on first attempt
const BUMP_UP_MAX_HINTS = 0.5; // Avg < 0.5 hints per lesson
const BUMP_UP_MAX_HEARTS_LOST = 0.3; // Avg < 0.3 hearts per lesson (near-perfect)

/**
 * Bump DOWN thresholds: learner is consistently struggling.
 * <45% accuracy + 2+ hints + 2+ hearts lost per lesson → offer lower level.
 */
const BUMP_DOWN_ACCURACY_THRESHOLD = 0.45; // <45% correct — consistent struggle
const BUMP_DOWN_MIN_HINTS = 2.0; // Avg > 2 hints per lesson
const BUMP_DOWN_MIN_HEARTS_LOST = 2.0; // Avg > 2 hearts per lesson

/**
 * Minimum lessons at current level required before an assessment fires.
 * 3 is enough to spot a trend without requiring excessive lessons of delay.
 * Fewer than 3 = too noisy; more than 5 = too sluggish to adapt.
 */
export const MIN_LESSONS_TO_ASSESS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-lesson performance metrics used for level assessment.
 * Saved to the lesson_performance DB table after every lesson completion.
 * Only performance metrics are tracked here — not lesson content (that's
 * in lesson_history) and not SRS state (that's in chunk_library).
 */
export interface LessonPerformance {
	/** Lesson identifier (used for deduplication) */
	lessonId: string;
	/** Profile.level at the time of the lesson (preserves historical accuracy) */
	level: string;
	/** Fraction of activities answered correctly on first attempt (0.0 – 1.0) */
	accuracy: number;
	/** Number of times the help button was tapped during the lesson */
	hintsUsed: number;
	/** Number of hearts lost during the lesson (max 3 per lesson) */
	heartsLost: number;
	/** Highest consecutive-correct streak during the lesson */
	streakMax: number;
}

/** The three possible assessment outcomes. */
export type LevelRecommendation = 'bump_up' | 'bump_down' | 'stay';

/**
 * Result returned by assessLevel().
 * 'stay' = performance is in the comfortable range, no change needed.
 * 'bump_up' / 'bump_down' = show the learner an offer modal.
 */
export interface LevelAssessment {
	recommendation: LevelRecommendation;
	/** 0.0 – 1.0 — how confident we are in this recommendation */
	confidence: number;
	/** The level at assessment time */
	currentLevel: string;
	/** The level being offered (only set when recommendation !== 'stay') */
	targetLevel?: UserLevel;
	/** Message for bump-up modal (child-friendly, encouraging) */
	bumpUpMessage?: string;
	/** Message for bump-down modal (compassionate, never shaming) */
	bumpDownMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the arithmetic mean of an array.
 * Returns 0 for empty arrays (avoids division-by-zero).
 */
function average(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the level one step above the given level.
 * Returns null if already at the highest level (can_have_conversations).
 *
 * @param level - Current level code
 */
export function getNextLevel(level: string): UserLevel | null {
	const idx = USER_LEVELS.indexOf(level as UserLevel);
	// indexOf returns -1 for unknown levels — treat as bottom
	if (idx === -1 || idx >= USER_LEVELS.length - 1) return null;
	return USER_LEVELS[idx + 1];
}

/**
 * Returns the level one step below the given level.
 * Returns null if already at the lowest level (total_beginner).
 *
 * @param level - Current level code
 */
export function getPrevLevel(level: string): UserLevel | null {
	const idx = USER_LEVELS.indexOf(level as UserLevel);
	// idx === 0 = already at bottom; idx === -1 = unknown level (can't go lower)
	if (idx <= 0) return null;
	return USER_LEVELS[idx - 1];
}

/**
 * Returns true if there is a higher level available.
 * Used as a guard before attempting to bump up.
 */
export function canBumpUp(level: string): boolean {
	return getNextLevel(level) !== null;
}

/**
 * Returns true if there is a lower level available.
 * Used as a guard before attempting to bump down.
 */
export function canBumpDown(level: string): boolean {
	return getPrevLevel(level) !== null;
}

/**
 * Returns the human-readable display name for a level code.
 * Falls back to the raw code string for unknown levels (defensive).
 */
export function getLevelDisplayName(level: string): string {
	return LEVEL_DISPLAY_NAMES[level as UserLevel] ?? level;
}

/**
 * Returns true if the given string is a known, valid level code.
 * Used by API routes to validate incoming level values.
 */
export function isValidLevel(level: string): level is UserLevel {
	return (USER_LEVELS as readonly string[]).includes(level);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates how confident we are in the assessment.
 *
 * Two factors contribute:
 *  1. Sample size: more lessons = more confidence (3 = 0.6, 5+ = 1.0)
 *  2. Agreement: low variance in accuracy = lessons agree with each other
 *
 * WHY: A single exceptional lesson should not trigger a level change.
 * Both factors need to be high for confidence to be high.
 *
 * Returns 0.0 – 1.0 rounded to 2 decimal places.
 *
 * @param lessons - Lessons used for the assessment
 */
export function calculateConfidence(lessons: LessonPerformance[]): number {
	if (lessons.length === 0) return 0;

	// Factor 1: Sample size confidence (3 lessons → 0.6, 5 lessons → 1.0)
	const consistencyScore = Math.min(1.0, lessons.length / 5);

	// Factor 2: Inter-lesson agreement (low accuracy variance = high agreement)
	const accuracies = lessons.map((l) => l.accuracy);
	const avgAccuracy = average(accuracies);
	// Mean absolute deviation: how spread out the accuracies are
	const mad = average(accuracies.map((a) => Math.abs(a - avgAccuracy)));
	// MAD > 0.25 would be very inconsistent → agreement score near 0
	const agreementScore = 1.0 - Math.min(1.0, mad * 4);

	const confidence = consistencyScore * 0.6 + agreementScore * 0.4;
	// Round to 2 decimal places to avoid floating-point noise in test assertions
	return Math.round(confidence * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates the bump-up offer message shown in the LevelBumpModal.
 *
 * Tone: excited, celebratory, but low-pressure ("can always switch back").
 * Avoids "mastered" or "completed" — overconfident phrasing can set false expectations.
 */
export function generateBumpUpMessage(currentLevel: string, nextLevel: string): string {
	const current = getLevelDisplayName(currentLevel);
	const next = getLevelDisplayName(nextLevel);
	return `You've been doing brilliantly at the ${current} level! Ready to try ${next}? You can always switch back in Settings if it feels too tricky.`;
}

/**
 * Generates the bump-down offer message shown in the LevelBumpModal.
 *
 * CRITICAL TONE RULES (see PEDAGOGY.md — Krashen's Affective Filter):
 * - NEVER use: "failed", "wrong", "backwards", "worse", "easier", "too hard"
 * - Frame lower level as BUILDING A FOUNDATION, not retreating
 * - The learner should feel like this is a smart strategy, not a punishment
 * - Always give them an "I'll keep trying!" option — some learners push through
 */
export function generateBumpDownMessage(currentLevel: string, prevLevel: string): string {
	const current = getLevelDisplayName(currentLevel);
	const prev = getLevelDisplayName(prevLevel);
	// IMPORTANT: Never use "failed", "wrong", "backwards", "easier", "too hard"
	// Frame as a smart strategy: building a solid foundation is growth, not retreat
	return `The ${current} level has been quite a challenge — and that's completely normal! Spending a bit more time at ${prev} will build a rock-solid foundation. Smart learners build strong roots before they grow tall 🌱🏗️`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ASSESSMENT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assesses whether a learner's level should change based on recent performance.
 *
 * Algorithm:
 * 1. Require MIN_LESSONS_TO_ASSESS (3) lessons — return 'stay' if fewer
 * 2. Take the last 3 lessons (fresh signal, not diluted by old sessions)
 * 3. Check bump-up conditions (high accuracy + low help + low hearts lost)
 * 4. Check bump-down conditions (low accuracy + high help + high hearts lost)
 * 5. Return 'stay' if neither condition is met
 *
 * WHY all-three-conditions: Prevents single-metric false positives.
 * A learner might use hints strategically (not out of confusion) — that alone
 * wouldn't trigger a bump down. All three metrics must agree.
 *
 * @param recentLessons - Recent performance records in chronological order
 * @param currentLevel  - The learner's current level code from their profile
 */
export function assessLevel(
	recentLessons: LessonPerformance[],
	currentLevel: string
): LevelAssessment {
	// Not enough data — too early to make a recommendation
	if (recentLessons.length < MIN_LESSONS_TO_ASSESS) {
		return { recommendation: 'stay', confidence: 0, currentLevel };
	}

	// Only look at the 3 most recent lessons — older data is less relevant
	// (the learner may have improved significantly since then)
	const last3 = recentLessons.slice(-MIN_LESSONS_TO_ASSESS);

	const avgAccuracy = average(last3.map((l) => l.accuracy));
	const avgHints = average(last3.map((l) => l.hintsUsed));
	const avgHeartsLost = average(last3.map((l) => l.heartsLost));
	const confidence = calculateConfidence(last3);

	// ── Bump up check ────────────────────────────────────────────────────
	// All three conditions must hold AND there must be a higher level available.
	if (
		avgAccuracy > BUMP_UP_ACCURACY_THRESHOLD &&
		avgHints < BUMP_UP_MAX_HINTS &&
		avgHeartsLost < BUMP_UP_MAX_HEARTS_LOST &&
		canBumpUp(currentLevel)
	) {
		const targetLevel = getNextLevel(currentLevel)!;
		return {
			recommendation: 'bump_up',
			confidence,
			currentLevel,
			targetLevel,
			bumpUpMessage: generateBumpUpMessage(currentLevel, targetLevel),
		};
	}

	// ── Bump down check ──────────────────────────────────────────────────
	// All three struggle indicators must hold AND there must be a lower level.
	if (
		avgAccuracy < BUMP_DOWN_ACCURACY_THRESHOLD &&
		avgHints > BUMP_DOWN_MIN_HINTS &&
		avgHeartsLost > BUMP_DOWN_MIN_HEARTS_LOST &&
		canBumpDown(currentLevel)
	) {
		const targetLevel = getPrevLevel(currentLevel)!;
		return {
			recommendation: 'bump_down',
			confidence,
			currentLevel,
			targetLevel,
			bumpDownMessage: generateBumpDownMessage(currentLevel, targetLevel),
		};
	}

	// Performance is in the comfortable middle range — no change needed
	return { recommendation: 'stay', confidence, currentLevel };
}
