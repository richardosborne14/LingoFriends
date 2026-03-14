/**
 * LingoFriends — Lesson Validator
 *
 * Validates every LessonPlan before it reaches LessonView.
 *
 * ARCHITECTURE RULE (see .clinerules):
 *   No LessonPlan may reach LessonView without passing validateLessonPlan().
 *   If validation returns valid: false, the caller MUST throw — not silently
 *   render a broken lesson.
 *
 * This module has ZERO dependency on the AI client. It is pure TypeScript
 * and never modifies the plan it receives.
 *
 * @module lessonValidator
 */

import { GameActivityType } from '../types/game';
import type { LessonPlan, LessonStep, ActivityConfig } from '../types/game';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of validating a LessonPlan.
 *
 * errors   — Blocking. Lesson MUST NOT render if any errors exist.
 * warnings — Non-blocking. Log them but allow rendering.
 */
export interface ValidationResult {
  /** false if there are any blocking errors */
  valid: boolean;
  /** Blocking issues — missing required fields, out-of-range indices, etc. */
  errors: string[];
  /** Non-blocking issues — short lessons, missing optional text, etc. */
  warnings: string[];
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Validate a LessonPlan completely before rendering.
 *
 * Checks:
 *   1. Plan-level structure (id, title, steps exist and are non-empty)
 *   2. Step-level fields (tutorText, helpText, activity present)
 *   3. Activity-level fields per type (see Rule 6 in .clinerules)
 *   4. Teach-before-test: at least one INFO step exists before the first quiz
 *   5. SunDrops consistency between header and step sum
 *
 * @param plan - The LessonPlan to validate
 * @returns ValidationResult with errors and warnings
 */
export function validateLessonPlan(plan: LessonPlan): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Plan-level checks ────────────────────────────────────────────────────
  if (!plan.id) {
    errors.push('Missing lesson plan ID');
  }
  if (!plan.title) {
    errors.push('Missing lesson plan title');
  }
  if (!plan.steps || plan.steps.length === 0) {
    errors.push('Lesson plan has no steps');
    // Can't check anything else without steps
    return { valid: false, errors, warnings };
  }
  if (plan.steps.length < 3) {
    warnings.push(`Very short lesson: only ${plan.steps.length} steps`);
  }
  if (plan.steps.length > 30) {
    warnings.push(`Very long lesson: ${plan.steps.length} steps`);
  }

  // ── Teach-before-test check ──────────────────────────────────────────────
  // Flag if a quiz step appears before any INFO step
  let hasSeenInfoStep = false;
  let hasWarnedQuizBeforeInfo = false;

  // ── Step-by-step validation ──────────────────────────────────────────────
  let computedSunDrops = 0;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const label = `Step ${i + 1}`;

    // Step-level fields
    if (!step.tutorText) {
      warnings.push(`${label}: Missing tutorText`);
    }
    if (!step.helpText) {
      warnings.push(`${label}: Missing helpText`);
    }
    if (!step.activity) {
      errors.push(`${label}: Missing activity`);
      continue; // Can't validate the activity if it doesn't exist
    }

    // Teach-before-test tracking
    if (step.activity.type === GameActivityType.INFO) {
      hasSeenInfoStep = true;
    } else if (!hasSeenInfoStep && !hasWarnedQuizBeforeInfo) {
      hasWarnedQuizBeforeInfo = true;
      warnings.push(
        `${label}: Quiz activity (${step.activity.type}) appears before any INFO/teaching step`
      );
    }

    // Activity-level validation
    const actResult = validateActivity(step.activity, label);
    errors.push(...actResult.errors);
    warnings.push(...actResult.warnings);

    // Accumulate sunDrops for consistency check
    computedSunDrops += step.activity.sunDrops || 0;
  }

  // ── SunDrops consistency ─────────────────────────────────────────────────
  if (typeof plan.totalSunDrops === 'number' && plan.totalSunDrops !== computedSunDrops) {
    warnings.push(
      `totalSunDrops mismatch: header says ${plan.totalSunDrops}, ` +
      `steps sum to ${computedSunDrops}`
    );
  }

  // ── Activity variety check ───────────────────────────────────────────────
  const varietyResult = validateActivityVariety(plan.steps);
  errors.push(...varietyResult.errors);
  warnings.push(...varietyResult.warnings);

  const valid = errors.length === 0;

  if (valid && warnings.length === 0) {
    console.log(`[lessonValidator] ✅ Validation passed for "${plan.title}" (${plan.steps.length} steps)`);
  } else if (valid) {
    console.warn(`[lessonValidator] ⚠️ Validation passed with ${warnings.length} warning(s):`, warnings);
  } else {
    console.error(`[lessonValidator] ❌ Validation FAILED for "${plan.title}":`, errors);
  }

  return { valid, errors, warnings };
}

// ============================================================================
// ACTIVITY VALIDATOR
// ============================================================================

/**
 * Validate a single ActivityConfig against the field contracts in Rule 6.
 *
 * Every activity type has required fields. Missing any required field
 * is a blocking ERROR — the activity must not render.
 *
 * @param activity - The ActivityConfig to validate
 * @param stepLabel - Human-readable step identifier for error messages
 */
function validateActivity(
  activity: ActivityConfig,
  stepLabel: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { type } = activity;

  // ── Common checks ─────────────────────────────────────────────────────────

  // sunDrops must be a number in the valid range
  if (typeof activity.sunDrops !== 'number') {
    errors.push(`${stepLabel} (${type}): sunDrops must be a number, got ${typeof activity.sunDrops}`);
  } else if (activity.sunDrops < 0 || activity.sunDrops > 4) {
    errors.push(`${stepLabel} (${type}): sunDrops ${activity.sunDrops} out of range [0, 4]`);
  }

  // ── Type-specific checks ──────────────────────────────────────────────────

  switch (type) {

    case GameActivityType.INFO:
      // INFO needs at least a title or content
      if (!activity.title && !activity.content) {
        errors.push(`${stepLabel} (INFO): Must have title or content`);
      }
      break;

    case GameActivityType.MULTIPLE_CHOICE:
      // Must have a question
      if (!activity.question) {
        errors.push(`${stepLabel} (MC): Missing question`);
      }
      // Must have options
      if (!activity.options || activity.options.length < 2) {
        errors.push(
          `${stepLabel} (MC): Must have at least 2 options, got ${activity.options?.length ?? 0}`
        );
      }
      // Warn if not exactly 4 options (standard is 4)
      if (activity.options && activity.options.length !== 4) {
        warnings.push(`${stepLabel} (MC): Expected 4 options, got ${activity.options.length}`);
      }
      // correctIndex must exist and be in bounds
      if (typeof activity.correctIndex !== 'number') {
        errors.push(`${stepLabel} (MC): Missing correctIndex`);
      } else if (
        activity.options &&
        (activity.correctIndex < 0 || activity.correctIndex >= activity.options.length)
      ) {
        errors.push(
          `${stepLabel} (MC): correctIndex ${activity.correctIndex} ` +
          `out of range [0, ${activity.options.length - 1}]`
        );
      }
      // No duplicate options (case-insensitive)
      if (activity.options && activity.options.length > 0) {
        const lower = activity.options.map(o => o.toLowerCase().trim());
        const unique = new Set(lower);
        if (unique.size < lower.length) {
          errors.push(`${stepLabel} (MC): Duplicate options detected`);
        }
      }
      break;

    case GameActivityType.FILL_BLANK:
      if (!activity.sentence) {
        errors.push(`${stepLabel} (FB): Missing sentence`);
      } else if (!activity.sentence.includes('___')) {
        // The sentence must have a blank placeholder
        warnings.push(`${stepLabel} (FB): sentence has no ___ placeholder`);
      }
      if (!activity.correctAnswer) {
        errors.push(`${stepLabel} (FB): Missing correctAnswer`);
      }
      break;

    case GameActivityType.TRANSLATE:
      if (!activity.sourcePhrase) {
        errors.push(`${stepLabel} (TR): Missing sourcePhrase`);
      }
      // correctAnswer is required — Translate.tsx uses it for its guard check
      // and for displaying the answer after multiple failed attempts.
      // It should equal acceptedAnswers[0] (the canonical form).
      if (!activity.correctAnswer) {
        errors.push(`${stepLabel} (TR): Missing correctAnswer (Translate.tsx requires it)`);
      }
      if (!activity.acceptedAnswers || activity.acceptedAnswers.length === 0) {
        errors.push(`${stepLabel} (TR): Missing acceptedAnswers (need at least 1)`);
      }
      break;

    case GameActivityType.TRUE_FALSE:
      if (!activity.statement && !activity.question) {
        errors.push(`${stepLabel} (TF): Must have statement or question`);
      }
      if (typeof activity.isTrue !== 'boolean') {
        errors.push(`${stepLabel} (TF): Missing isTrue (must be a boolean)`);
      }
      break;

    case GameActivityType.MATCHING:
      if (!activity.pairs || activity.pairs.length < 2) {
        errors.push(
          `${stepLabel} (MA): Must have at least 2 pairs, got ${activity.pairs?.length ?? 0}`
        );
      }
      if (activity.pairs) {
        for (let j = 0; j < activity.pairs.length; j++) {
          if (!activity.pairs[j].left || !activity.pairs[j].right) {
            errors.push(`${stepLabel} (MA): Pair ${j + 1} has empty left or right`);
          }
        }
      }
      break;

    case GameActivityType.WORD_ARRANGE:
      if (!activity.targetSentence) {
        errors.push(`${stepLabel} (WA): Missing targetSentence`);
      }
      if (!activity.scrambledWords || activity.scrambledWords.length < 2) {
        errors.push(
          `${stepLabel} (WA): Must have at least 2 scrambledWords, ` +
          `got ${activity.scrambledWords?.length ?? 0}`
        );
      }
      break;

    case GameActivityType.COACHING_CHAT:
      // Phase 3 coaching/discovery step — non-graded, 0 SunDrops always.
      // Rule 10: COACHING_CHAT is never a quiz — no required question/option fields.
      // Falls back to INFO if coaching fields are absent (Rule 14 graceful degradation).
      if (activity.sunDrops !== 0) {
        errors.push(`${stepLabel} (COACHING_CHAT): sunDrops must be 0 (non-graded step)`);
      }
      break;

    default:
      errors.push(`${stepLabel}: Unknown activity type "${type}"`);
  }

  return { errors, warnings };
}

// ============================================================================
// ACTIVITY VARIETY VALIDATOR
// ============================================================================

/**
 * Validate that a lesson has sufficient activity variety.
 *
 * This implements the Phase 1.3 variety rules:
 * - NO two consecutive quiz steps should have the same activity type
 * - Lessons with 5+ quiz steps should use at least 3 distinct types
 * - Lessons with 7+ quiz steps should use at least 4 distinct types
 * - ALL quiz steps being the same type is a blocking ERROR
 *
 * @param steps - The lesson steps to validate
 * @returns Errors (blocking) and warnings (non-blocking)
 */
function validateActivityVariety(steps: LessonStep[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get quiz step types (exclude INFO and COACHING_CHAT — both are non-graded teaching steps)
  const quizTypes = steps
    .filter(s =>
      s.activity?.type !== GameActivityType.INFO &&
      s.activity?.type !== GameActivityType.COACHING_CHAT
    )
    .map(s => s.activity?.type)
    .filter(Boolean) as GameActivityType[];

  if (quizTypes.length === 0) {
    // No quiz steps - that's a different problem, caught elsewhere
    return { errors, warnings };
  }

  // ── Check for consecutive duplicates ──────────────────────────────────────
  for (let i = 1; i < quizTypes.length; i++) {
    if (quizTypes[i] === quizTypes[i - 1]) {
      warnings.push(
        `Consecutive duplicate activity type: steps ${i} and ${i + 1} are both ${quizTypes[i]}`
      );
    }
  }

  // ── Check minimum variety ─────────────────────────────────────────────────
  const distinctTypes = new Set(quizTypes);

  // 5+ quiz steps → at least 3 distinct types
  if (quizTypes.length >= 5 && distinctTypes.size < 3) {
    warnings.push(
      `Low variety: only ${distinctTypes.size} distinct type(s) in ${quizTypes.length} quiz steps ` +
      `(recommended: at least 3). Types used: ${[...distinctTypes].join(', ')}`
    );
  }

  // 7+ quiz steps → at least 4 distinct types
  if (quizTypes.length >= 7 && distinctTypes.size < 4) {
    warnings.push(
      `Low variety for long lesson: only ${distinctTypes.size} distinct type(s) in ${quizTypes.length} quiz steps ` +
      `(recommended: at least 4). Consider adding more variety.`
    );
  }

  // ── ALL same type is a BLOCKING error ────────────────────────────────────
  if (distinctTypes.size === 1 && quizTypes.length > 2) {
    errors.push(
      `All ${quizTypes.length} quiz steps use the same activity type: ${quizTypes[0]}. ` +
      `This violates variety requirements. Lessons must include multiple activity types.`
    );
  }

  return { errors, warnings };
}
