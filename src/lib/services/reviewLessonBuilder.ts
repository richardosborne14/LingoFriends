/**
 * LingoFriends V2 — Review Lesson Builder
 *
 * Generates a "water your tree" review lesson from overdue SRS chunks.
 *
 * A review lesson is a SHORT, quick-fire session (max 8 activities) that
 * covers only previously-learned material that is overdue for review.
 * It does NOT introduce new vocabulary (no INTRODUCE steps).
 *
 * WHY a separate module: The main lessonAssembler generates pedagogically-
 * sequenced new lessons (INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY).
 * Review lessons skip the introduction and go straight to PRACTICE/RECALL —
 * the learner already knows this content, they just need to refresh it.
 *
 * ARCHITECTURE: Pure function module. All DB queries happen in the calling
 * API route. Chunks are passed in as plain objects.
 *
 * @module services/reviewLessonBuilder
 */

import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan, LessonStep, MultipleChoiceActivity, TranslateActivity } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal chunk data needed to build a review activity.
 * Matches the relevant fields of chunkLibrary DB row.
 */
export interface ReviewChunk {
	id: string;
	targetPhrase: string;
	nativeTranslation: string;
	targetLanguage: string;
	nativeLanguage: string;
	/** Distractor options (wrong answers) — in native language */
	distractors: string[];
	explanation?: string | null;
	exampleSentence?: string | null;
	/** How many days overdue this chunk is (used for prioritisation) */
	daysOverdue: number;
}

/**
 * Config object for the review lesson generation.
 */
export interface ReviewLessonConfig {
	treeId: string;
	/** Human-readable tree/skill path name for the lesson title */
	treeName: string;
	chunks: ReviewChunk[];
	/** Optional override for max number of activities */
	maxActivities?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum chunks to include in a single review lesson.
 * Higher = more complete review but more fatigue.
 * 8 is the sweet spot: ~10 minutes of focused review.
 */
const MAX_REVIEW_CHUNKS = 8;

/**
 * SunDrops per review activity.
 * Slightly less than a new lesson (to distinguish "practice" from "learning")
 * but still meaningful enough to feel rewarding.
 */
const REVIEW_ACTIVITY_SUN_DROPS = 2;

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a complete LessonPlan for a review session.
 *
 * Review lesson structure for each chunk:
 *   1. PRACTICE — multiple choice (confirm recognition)
 *   2. RECALL — translate (confirm production)
 *
 * Two steps per chunk × up to 8 chunks = up to 16 steps.
 * In practice, shorter (3-5 chunks) makes for a ~10-minute session.
 *
 * @param config - Tree info + overdue chunks
 * @returns LessonPlan ready to be consumed by the lesson page
 */
export function buildReviewLesson(config: ReviewLessonConfig): LessonPlan {
	const maxChunks = config.maxActivities
		? Math.ceil(config.maxActivities / 2) // 2 activities per chunk
		: MAX_REVIEW_CHUNKS;

	// Sort by most overdue first — prioritise the worst offenders
	const chunks = [...config.chunks]
		.sort((a, b) => b.daysOverdue - a.daysOverdue)
		.slice(0, maxChunks);

	if (chunks.length === 0) {
		// No overdue chunks — return a minimal "all good" plan
		return buildAllCaughtUpLesson(config);
	}

	const steps: LessonStep[] = [];

	for (const chunk of chunks) {
		// PRACTICE: multiple choice — pick the correct native translation
		steps.push(buildMultipleChoiceStep(chunk));

		// RECALL: translate — type the target phrase from the native prompt
		steps.push(buildTranslateStep(chunk));
	}

	const totalSunDrops = steps.reduce((sum, s) => sum + s.sunDrops, 0);

	return {
		id: `review-${config.treeId}-${Date.now()}`,
		title: `Review: ${config.treeName}`,
		icon: '💧',
		isReview: true,
		targetLanguage: chunks[0].targetLanguage,
		nativeLanguage: chunks[0].nativeLanguage,
		steps,
		totalSunDrops,
		chunkCount: chunks.length,
	};
}

/**
 * Builds a multiple-choice step for a review chunk.
 * Tests RECOGNITION: given the target phrase, pick the correct native translation.
 *
 * WHY target→native: For review, the learner sees the target language phrase
 * (which they've already learned) and must recall its meaning. This tests
 * retention of meaning — the core SRS goal.
 *
 * @param chunk - The chunk to test
 * @returns LessonStep wrapping a MultipleChoiceActivity
 */
function buildMultipleChoiceStep(chunk: ReviewChunk): LessonStep {
	// Use provided native-language distractors, pad if fewer than 3
	const distractors = [...(chunk.distractors ?? [])].slice(0, 3);
	while (distractors.length < 3) {
		distractors.push(`[option ${distractors.length + 1}]`);
	}

	// Shuffle options and track the correct answer's new index
	const allOptions = shuffleArray([chunk.nativeTranslation, ...distractors.slice(0, 3)]);
	const correctIndex = allOptions.indexOf(chunk.nativeTranslation);

	const activity: MultipleChoiceActivity = {
		type: ActivityType.MULTIPLE_CHOICE,
		// Question asks for meaning of target phrase
		question: `What does "${chunk.targetPhrase}" mean?`,
		options: allOptions,
		correctIndex,
		targetPhrase: chunk.targetPhrase,
		sunDrops: REVIEW_ACTIVITY_SUN_DROPS,
	};

	return {
		id: makeStepId(),
		tutorText: `Let's refresh "${chunk.targetPhrase}" 🔄`,
		helpText: `"${chunk.targetPhrase}" means "${chunk.nativeTranslation}". ${chunk.explanation ?? ''}`,
		activity,
		sunDrops: REVIEW_ACTIVITY_SUN_DROPS,
	};
}

/**
 * Builds a translate step for a review chunk.
 * Tests RECALL: given the native phrase, type the target language answer.
 *
 * @param chunk - The chunk to test
 * @returns LessonStep wrapping a TranslateActivity
 */
function buildTranslateStep(chunk: ReviewChunk): LessonStep {
	const activity: TranslateActivity = {
		type: ActivityType.TRANSLATE,
		sourcePhrase: chunk.nativeTranslation,
		correctAnswer: chunk.targetPhrase,
		// Accept the canonical answer + trimmed/lowercased variants
		// answerMatcher handles further normalisation server-side
		acceptedAnswers: [
			chunk.targetPhrase,
			chunk.targetPhrase.toLowerCase(),
			chunk.targetPhrase.trim(),
		],
		targetPhrase: chunk.targetPhrase,
		sunDrops: REVIEW_ACTIVITY_SUN_DROPS,
	};

	return {
		id: makeStepId(),
		tutorText: `Now type it out! 📝`,
		helpText: `Translate "${chunk.nativeTranslation}" → starts with "${chunk.targetPhrase.substring(0, 3)}…"`,
		activity,
		sunDrops: REVIEW_ACTIVITY_SUN_DROPS,
	};
}

/**
 * Fallback plan when all chunks are healthy (no review needed).
 * Shows a single info step — no activities, no SunDrops.
 *
 * @param config - Tree config (used for title/ID)
 */
function buildAllCaughtUpLesson(config: ReviewLessonConfig): LessonPlan {
	// An info-only step with sunDrops: 0 (InfoActivity enforces sunDrops: 0)
	return {
		id: `review-caught-up-${config.treeId}-${Date.now()}`,
		title: `${config.treeName} — All caught up! 🌳`,
		icon: '✅',
		isReview: true,
		steps: [
			{
				id: makeStepId(),
				tutorText: 'Your tree is healthy!',
				helpText: 'No chunks are overdue — come back in a few days.',
				activity: {
					type: ActivityType.INFO,
					targetPhrase: '🌳',
					nativeTranslation: `Your ${config.treeName} is healthy!`,
					explanation:
						'All your chunks are up to date. Great work keeping on top of your reviews! Come back in a few days.',
					sunDrops: 0,
				},
				sunDrops: 0,
			},
		],
		totalSunDrops: 0,
		chunkCount: 0,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shuffles an array using Fisher-Yates algorithm.
 * Used to randomise multiple-choice option order so the correct answer
 * isn't always in the same position.
 *
 * @param array - Array to shuffle (cloned internally, input not mutated)
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		// Math.random for shuffling game options — not crypto-security required
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Generates a lightweight step ID.
 * Review lesson steps don't go through nanoid (no dependency on that package);
 * a timestamp + random suffix is collision-safe for session-scoped IDs.
 */
function makeStepId(): string {
	return `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Calculates how many days overdue a chunk is.
 * Negative values mean the chunk is NOT yet due (healthy).
 *
 * @param nextReviewDate - When the chunk should next be reviewed
 * @param today - Injectable for testing
 * @returns Days overdue (negative = not yet due, 0 = due today, positive = overdue)
 */
export function getDaysOverdue(
	nextReviewDate: Date | null,
	today: Date = new Date()
): number {
	if (!nextReviewDate) {
		// Null nextReviewDate means the chunk has never been studied — not overdue
		return -999;
	}

	const todayMidnight = new Date(today);
	todayMidnight.setHours(0, 0, 0, 0);

	const reviewMidnight = new Date(nextReviewDate);
	reviewMidnight.setHours(0, 0, 0, 0);

	const msPerDay = 1000 * 60 * 60 * 24;
	return Math.floor(
		(todayMidnight.getTime() - reviewMidnight.getTime()) / msPerDay
	);
}

/**
 * Filters a list of chunks to only those overdue for review.
 * Used server-side before calling buildReviewLesson().
 *
 * @param chunks - All chunks for a tree (with nextReviewDate populated)
 * @param today - Injectable for testing
 * @returns Only the overdue chunks, enriched with daysOverdue, sorted most-overdue first
 */
export function filterOverdueChunks<T extends { nextReviewDate: Date | null }>(
	chunks: T[],
	today: Date = new Date()
): Array<T & { daysOverdue: number }> {
	return chunks
		.map((chunk) => ({
			...chunk,
			daysOverdue: getDaysOverdue(chunk.nextReviewDate, today),
		}))
		.filter((chunk) => chunk.daysOverdue >= 0) // 0 = due today, positive = overdue
		.sort((a, b) => b.daysOverdue - a.daysOverdue);
}
