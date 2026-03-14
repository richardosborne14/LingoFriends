/**
 * LingoFriends V2 — Lesson Completion Utilities
 *
 * Pure helper functions extracted from the completion API handler to keep
 * business logic testable without requiring a real HTTP request or DB connection.
 *
 * ARCHITECTURE: All functions here are side-effect free — no DB writes, no fetch,
 * no Svelte stores. The API handler uses these to build its DB inserts and
 * construct its JSON response.
 *
 * @module server/lessons/completionUtils
 */

import type { LevelAssessment } from '$lib/services/levelAssessment';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parameters needed to construct a lessonPerformance DB row.
 * All are derived from the completion request body + profile state.
 */
export interface PerformanceRecordParams {
	/** The authenticated user's ID */
	userId: string;
	/** The lesson plan ID (from request body or URL param) */
	lessonId: string;
	/** Profile.level at the time of the lesson — preserved for historical accuracy */
	levelAtTime: string;
	/** Fraction correct on first attempt (0.0 – 1.0) */
	accuracy: number;
	/** Number of times the help button was tapped */
	hintsUsed: number;
	/** Hearts lost during the lesson */
	heartsLost: number;
	/** Highest consecutive-correct streak achieved */
	streakMax: number;
}

/**
 * The client-safe shape of a level recommendation returned in the API response.
 * The internal `LevelAssessment` has extra fields (bumpUpMessage, bumpDownMessage)
 * that we merge into a single `message` field for simplicity.
 *
 * null means 'stay' — no level change offered.
 */
export interface ClientLevelRecommendation {
	/** 'bump_up' or 'bump_down' — never 'stay' (that case returns null) */
	recommendation: 'bump_up' | 'bump_down';
	/** The level being offered */
	targetLevel: string;
	/** The level at assessment time */
	currentLevel: string;
	/** Child-friendly message string to display in LevelBumpModal */
	message: string;
	/** Assessment confidence 0.0–1.0 (available for analytics) */
	confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE RECORD BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the object used to insert a row into the lesson_performance table.
 *
 * WHY a separate function: The DB insert is structurally identical every time,
 * but the mapping from request body → DB columns has subtle rules:
 *   - accuracy is clamped to 0.0–1.0 (clients can't be trusted)
 *   - hintsUsed/heartsLost/streakMax default to 0 (optional in request body)
 *   - levelAtTime preserves the level at the time (profile.level may change later)
 *
 * @param params - Raw performance data from the completion request + profile
 * @returns Object ready to pass to db.insert(lessonPerformance).values(...)
 */
export function buildPerformanceRecord(params: PerformanceRecordParams): {
	userId: string;
	lessonId: string;
	levelAtTime: string;
	accuracy: number;
	hintsUsed: number;
	heartsLost: number;
	streakMax: number;
	completedAt: Date;
} {
	return {
		userId: params.userId,
		lessonId: params.lessonId,
		levelAtTime: params.levelAtTime,
		// Clamp accuracy: malformed clients could send values outside 0–1
		accuracy: Math.min(1.0, Math.max(0.0, params.accuracy)),
		// Default all optional counters to 0 — they represent absence of events
		hintsUsed: Math.max(0, params.hintsUsed ?? 0),
		heartsLost: Math.max(0, params.heartsLost ?? 0),
		streakMax: Math.max(0, params.streakMax ?? 0),
		completedAt: new Date(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRST LESSON DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the lesson just completed is the learner's first ever lesson.
 *
 * WHY check lessonsCompletedBefore (not after): The profile update increments
 * lessonsCompleted as part of the completion handler. By the time this function
 * is called, we pass the value BEFORE the increment to avoid an off-by-one error.
 *
 * WHY it matters: Triggers the FirstLessonCompleteModal that explains the garden
 * economy (SunDrops, tree growth, shop). Shown exactly once.
 *
 * @param lessonsCompletedBefore - profile.lessonsCompleted BEFORE this lesson
 */
export function isFirstLesson(lessonsCompletedBefore: number): boolean {
	// Exactly 0 means no previous lessons — this is the first one
	// Treat negative as 0 (defensive — shouldn't happen with a healthy DB)
	return lessonsCompletedBefore <= 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL CHANGE OFFER GATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the assessment recommends offering the learner a level change.
 *
 * 'stay' assessments are the majority outcome — most lessons are performed at
 * an appropriate level and no modal should be shown. This gate ensures we only
 * trigger the UI when there is something actionable to offer.
 *
 * NOTE: It is mathematically impossible for isFirstLesson AND shouldOfferLevelChange
 * to both return true on the same completion. The assessment engine requires
 * MIN_LESSONS_TO_ASSESS (3) lessons before it can recommend a change.
 *
 * @param assessment - Result from assessLevel()
 */
export function shouldOfferLevelChange(assessment: LevelAssessment): boolean {
	// Only 'bump_up' and 'bump_down' are actionable — 'stay' means do nothing
	return assessment.recommendation === 'bump_up' || assessment.recommendation === 'bump_down';
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE SERIALISER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts the internal LevelAssessment object to the client-safe API shape.
 *
 * WHY a serialiser: The internal LevelAssessment has split message fields
 * (bumpUpMessage / bumpDownMessage) that we merge into a single `message` field.
 * Clients only care about ONE message at a time — the internal split is for
 * type-safety in the assessment engine.
 *
 * Returns null when recommendation is 'stay' — client interprets null as
 * "no modal needed", keeping the response shape clean and predictable.
 *
 * @param assessment - Result from assessLevel()
 * @returns ClientLevelRecommendation or null (for 'stay' recommendations)
 */
export function serializeAssessmentForClient(
	assessment: LevelAssessment
): ClientLevelRecommendation | null {
	// 'stay' means no change to offer — return null to skip the modal entirely
	if (assessment.recommendation === 'stay') return null;

	// targetLevel is always defined when recommendation !== 'stay' (enforced by assessLevel)
	// The non-null assertion is safe here because the assessLevel function sets
	// targetLevel when it returns bump_up or bump_down.
	const targetLevel = assessment.targetLevel!;

	// Select the correct pre-built message based on direction
	// The message was generated by generateBumpUpMessage / generateBumpDownMessage
	// in levelAssessment.ts — pedagogy-compliant tone enforced by tests there.
	const message =
		assessment.recommendation === 'bump_up'
			? (assessment.bumpUpMessage ?? 'You\'re doing brilliantly — ready to level up?')
			: (assessment.bumpDownMessage ?? 'Let\'s build a stronger foundation first 🌱');

	return {
		recommendation: assessment.recommendation,
		targetLevel,
		currentLevel: assessment.currentLevel,
		message,
		confidence: assessment.confidence,
	};
}
