/**
 * LingoFriends V2 — Lesson Validator
 *
 * Pure validation function. No AI calls, no DB calls, no side effects.
 * Validates a LessonPlan before it reaches the UI.
 *
 * Called after assembleLessonPlan() in the generation pipeline.
 * If validation fails, the pipeline retries generation once, then returns an error.
 *
 * Checks:
 *   1. Plan-level fields (id, title, non-empty steps)
 *   2. Teach-before-test ordering (INFO before any quiz for same phrase)
 *   3. Per-activity required field validation (8 activity types)
 *   4. SunDrop total consistency (header total === sum of step totals)
 *
 * @module server/lessons/lessonValidator
 */

import { ActivityType, type LessonPlan, type ActivityConfig } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
	/** True only if there are zero hard errors */
	valid: boolean;
	/** Hard errors — lesson CANNOT render with these present */
	errors: string[];
	/** Soft warnings — lesson works but quality is reduced */
	warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a phrase for teach-before-test comparison.
 * Case-insensitive, trimmed. "Ich heiße Max" === "ich heiße max"
 */
function normalisePhrase(phrase: string): string {
	return phrase.toLowerCase().trim();
}

/**
 * Returns true if an activity type is a quiz (requires prior introduction).
 * INFO and COACHING_CHAT are not quizzes — they introduce content.
 */
function isQuizActivity(type: ActivityType): boolean {
	return (
		type === ActivityType.MULTIPLE_CHOICE ||
		type === ActivityType.FILL_BLANK ||
		type === ActivityType.TRANSLATE ||
		type === ActivityType.TRUE_FALSE ||
		type === ActivityType.WORD_ARRANGE ||
		type === ActivityType.SPEAK_IT // TASK-AUDIT-02: spoken production requires prior INFO
	);
}

/**
 * Extracts the target phrase being tested in a quiz activity.
 * Used for teach-before-test checking.
 * Returns null for activities that don't test a specific phrase (e.g. MATCHING).
 */
function extractTestedPhrase(activity: ActivityConfig): string | null {
	if (
		activity.type === ActivityType.MULTIPLE_CHOICE ||
		activity.type === ActivityType.FILL_BLANK ||
		activity.type === ActivityType.TRANSLATE ||
		activity.type === ActivityType.COACHING_CHAT
	) {
		return activity.targetPhrase ?? null;
	}
	if (activity.type === ActivityType.TRUE_FALSE) {
		return activity.targetPhrase ?? null;
	}
	if (activity.type === ActivityType.WORD_ARRANGE) {
		return activity.targetPhrase ?? null;
	}
	// TASK-AUDIT-02: SPEAK_IT tests the targetPhrase via spoken production
	if (activity.type === ActivityType.SPEAK_IT) {
		return activity.targetPhrase ?? null;
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-ACTIVITY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a single ActivityConfig and returns any field errors.
 * Each activity type has its own required field contract.
 *
 * @param activity - The activity to validate
 * @param stepIndex - Step index for error context
 * @returns Array of error strings (empty if valid)
 */
export function validateActivityConfig(activity: ActivityConfig, stepIndex: number): string[] {
	const errors: string[] = [];
	const ctx = `Step ${stepIndex} (${activity.type})`;

	switch (activity.type) {
		case ActivityType.INFO:
			if (!activity.targetPhrase?.trim())
				errors.push(`${ctx}: missing targetPhrase`);
			if (!activity.nativeTranslation?.trim())
				errors.push(`${ctx}: missing nativeTranslation`);
			break;

		case ActivityType.MULTIPLE_CHOICE:
			if (!activity.question?.trim()) errors.push(`${ctx}: missing question`);
			if (!Array.isArray(activity.options) || activity.options.length < 2)
				errors.push(`${ctx}: options must have at least 2 items`);
			if (
				typeof activity.correctIndex !== 'number' ||
				activity.correctIndex < 0 ||
				activity.correctIndex >= (activity.options?.length ?? 0)
			)
				errors.push(
					`${ctx}: correctIndex ${activity.correctIndex} out of range (options.length=${activity.options?.length})`
				);
			break;

		case ActivityType.FILL_BLANK:
			if (!activity.sentence?.trim()) errors.push(`${ctx}: missing sentence`);
			else if (!activity.sentence.includes('___'))
				errors.push(`${ctx}: fill_blank sentence must contain ___`);
			if (!activity.correctAnswer?.trim()) errors.push(`${ctx}: missing correctAnswer`);
			break;

		case ActivityType.TRANSLATE:
			if (!activity.sourcePhrase?.trim()) errors.push(`${ctx}: missing sourcePhrase`);
			if (!activity.correctAnswer?.trim()) errors.push(`${ctx}: missing correctAnswer`);
			if (!Array.isArray(activity.acceptedAnswers) || activity.acceptedAnswers.length < 1)
				errors.push(`${ctx}: acceptedAnswers must have at least 1 item`);
			break;

		case ActivityType.TRUE_FALSE:
			if (!activity.question?.trim()) errors.push(`${ctx}: missing question`);
			if (typeof activity.isTrue !== 'boolean')
				errors.push(`${ctx}: isTrue must be a boolean`);
			break;

		case ActivityType.WORD_ARRANGE:
			if (!activity.targetSentence?.trim()) errors.push(`${ctx}: missing targetSentence`);
			if (!Array.isArray(activity.scrambledWords) || activity.scrambledWords.length < 2)
				errors.push(`${ctx}: scrambledWords must have at least 2 items`);
			break;

		case ActivityType.MATCHING:
			if (!Array.isArray(activity.pairs) || activity.pairs.length < 2)
				errors.push(`${ctx}: pairs must have at least 2 items`);
			else {
				for (let i = 0; i < activity.pairs.length; i++) {
					const pair = activity.pairs[i];
					if (!pair.left?.trim()) errors.push(`${ctx}: pair[${i}] missing left`);
					if (!pair.right?.trim()) errors.push(`${ctx}: pair[${i}] missing right`);
				}
			}
			break;

		case ActivityType.COACHING_CHAT:
			if (!activity.coachingText?.trim()) errors.push(`${ctx}: missing coachingText`);
			if (!activity.discoveryQuestion?.trim())
				errors.push(`${ctx}: missing discoveryQuestion`);
			break;

		case ActivityType.SPEAK_IT:
			// TASK-AUDIT-02: both fields required for pronunciation display
			if (!activity.targetPhrase?.trim()) errors.push(`${ctx}: missing targetPhrase`);
			if (!activity.nativeTranslation?.trim())
				errors.push(`${ctx}: missing nativeTranslation`);
			break;
	}

	// All activity types must have sunDrops as a number ≥ 0
	if (typeof activity.sunDrops !== 'number' || activity.sunDrops < 0) {
		errors.push(`${ctx}: sunDrops must be a non-negative number`);
	}

	return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VALIDATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a LessonPlan before it renders in the UI.
 *
 * Pure function — no side effects, no network calls, no AI.
 * Called by the lesson generation pipeline after assembly.
 * If this returns { valid: false }, generation retries once before erroring.
 *
 * @param plan - The assembled LessonPlan to validate
 * @returns ValidationResult with errors (blocking) and warnings (non-blocking)
 */
export function validateLessonPlan(plan: LessonPlan): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// ── 1. Plan-level checks ─────────────────────────────────────────────────
	if (!plan.id?.trim()) errors.push('Missing lesson ID');
	if (!plan.title?.trim()) errors.push('Missing lesson title');
	if (!Array.isArray(plan.steps)) {
		errors.push('steps must be an array');
		// Can't continue checking steps if it's not an array
		return { valid: false, errors, warnings };
	}
	if (plan.steps.length === 0) errors.push('Lesson has no steps');
	if (plan.steps.length < 5) {
		warnings.push(`Only ${plan.steps.length} steps — expected at least 5 for a proper lesson`);
	}

	// ── 2. Teach-before-test enforcement ─────────────────────────────────────
	// Track which phrases have been introduced by INFO steps
	const introducedPhrases = new Set<string>();

	for (let i = 0; i < plan.steps.length; i++) {
		const step = plan.steps[i];
		const activity = step.activity;

		// Record phrases introduced by INFO steps
		if (activity.type === ActivityType.INFO) {
			introducedPhrases.add(normalisePhrase(activity.targetPhrase));
		}

		// Check quiz steps test only introduced phrases
		if (isQuizActivity(activity.type)) {
			const testedPhrase = extractTestedPhrase(activity);
			if (testedPhrase && !introducedPhrases.has(normalisePhrase(testedPhrase))) {
				errors.push(
					`Step ${i}: quiz tests "${testedPhrase}" but it was never introduced (no INFO step before this)`
				);
			}
		}

		// ── 3. Per-activity field validation ─────────────────────────────────
		const activityErrors = validateActivityConfig(activity, i);
		errors.push(...activityErrors);

		// Each step's sunDrops must match its activity's sunDrops
		if (step.sunDrops !== activity.sunDrops) {
			errors.push(
				`Step ${i}: step.sunDrops (${step.sunDrops}) !== activity.sunDrops (${activity.sunDrops})`
			);
		}
	}

	// ── 4. SunDrop total consistency ─────────────────────────────────────────
	const calculatedTotal = plan.steps.reduce((sum, s) => sum + s.sunDrops, 0);
	if (plan.totalSunDrops !== calculatedTotal) {
		errors.push(
			`SunDrop total mismatch: plan.totalSunDrops=${plan.totalSunDrops} but steps sum to ${calculatedTotal}`
		);
	}

	// ── 5. Chunk coherence (warning only) ────────────────────────────────────
	// A lesson with no TRANSLATE steps is suspicious — it means learners never recall
	const hasTranslateStep = plan.steps.some((s) => s.activity.type === ActivityType.TRANSLATE);
	if (!hasTranslateStep) {
		warnings.push('No TRANSLATE steps found — learners should have at least one recall activity');
	}

	return { valid: errors.length === 0, errors, warnings };
}
