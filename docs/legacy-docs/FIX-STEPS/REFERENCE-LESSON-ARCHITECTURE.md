# TASK: Lesson Generation Pipeline Rewrite

**Status:** 🔴 CRITICAL — Blocking core gameplay
**Priority:** P0 — Nothing else matters until this works
**Estimated Time:** 8–12 hours
**Phase:** 1.2 (Pedagogy Engine)

---

## READ THIS FIRST — Why Previous Fixes Failed

Previous attempts to fix lesson generation failed because they treated symptoms instead of the root cause. The pipeline has **4 compounding structural problems** that cannot be fixed independently. Patching one just shifts the failure to another. This task replaces the broken parts of the pipeline with a new architecture.

### The 4 Root Causes

| # | Problem | Why It Breaks Things |
|---|---------|---------------------|
| 1 | **Language code chaos** | `createDefaultProfile()` in `lessonPlanService.ts` does `"German".toLowerCase().substring(0,2)` → `"ge"` (WRONG — should be `"de"`). Meanwhile `learnerProfileService.ts` has a correct lookup table. Downstream code gets `"ge"`, `"de"`, or `"German"` unpredictably. |
| 2 | **AI generates full activity JSON** | The AI is asked to produce complete, correctly-structured activity JSON with exact field names matching what 6 different React components expect. It frequently produces wrong field names, missing fields, or linguistically invalid content. No validation catches this before rendering. |
| 3 | **No teach-before-test enforcement** | The teach-first 5-step progression exists in `generateFallbackLesson()` but NOT in the AI path. When the AI succeeds, it can test vocabulary it never introduced, produce 8 multiple-choice questions in a row, or skip teaching steps entirely. |
| 4 | **Fallback generator has hardcoded English distractors** | `getDistractor()` returns `"Good morning"`, `"Goodbye"`, `"Hello"` etc. regardless of what language is being learned. The topic-starter lookup uses exact string matching (`'Greetings & Basics'`) so anything else returns nothing. |

### Architecture Change Summary

**OLD (broken):** Ask AI → Generate full activity JSON → Parse JSON → Hope fields match → Render
**NEW (this task):** Ask AI → Generate pedagogical content only (chunks + translations + distractors) → Assemble activities deterministically in code using teach-first template → Validate → Render

The AI's job changes from "generate a complete lesson plan as JSON" to "generate 3-5 lexical chunks with translations, example sentences, and plausible distractors for a given topic and language." All activity assembly, field mapping, and teach-first sequencing happens in deterministic TypeScript code that never breaks.

---

## Terminology

These terms are used precisely throughout this document:

| Term | Meaning |
|------|---------|
| **Chunk** | A lexical phrase taught as a unit, e.g. "Guten Morgen" (not "Guten" + "Morgen") |
| **Teach-first** | The 5-step progression: INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY |
| **ActivityConfig** | The TypeScript interface in `src/types/game.ts` that activity components consume |
| **LessonPlan** | The complete lesson object (`{ id, title, icon, steps[], totalSunDrops }`) |
| **LessonStep** | One step: `{ tutorText, helpText, activity: ActivityConfig }` |
| **AI content** | What the AI generates: chunks with metadata. NOT activity JSON. |
| **Assembly** | Deterministic TypeScript code that converts AI content into ActivityConfig objects |

---

## Files Overview

### Files to CREATE (new)

| File | Purpose |
|------|---------|
| `src/utils/languageUtils.ts` | Single source of truth for all language code conversion |
| `src/services/lessonAssembler.ts` | Deterministic teach-first activity assembly from chunks |
| `src/services/lessonValidator.ts` | Validates every LessonPlan before it reaches LessonView |

### Files to MODIFY

| File | Change |
|------|--------|
| `src/services/aiPedagogyClient.ts` | Replace `generateLesson()` with `generateChunksForTopic()` — AI only generates chunk content |
| `src/services/lessonGeneratorV2.ts` | Rewrite `generateLesson()` to use new AI→Assembler→Validator pipeline |
| `src/services/lessonPlanService.ts` | Remove `createDefaultProfile()` language hack, use `languageUtils` |
| `src/services/learnerProfileService.ts` | Import `toLanguageCode` from `languageUtils` instead of local function |
| `src/services/pedagogyEngine.ts` | No structural changes — just ensure topic string is clean (not `"Greetings (German)"`) |
| `services/systemPrompts.ts` | Replace `PROFESSOR_FINCH_V2` with new chunk-generation-only prompt |

### Files NOT to touch

| File | Reason |
|------|--------|
| `src/types/game.ts` | `ActivityConfig`, `LessonStep`, `LessonPlan`, `GameActivityType` — all correct as-is |
| `src/components/lesson/activities/*.tsx` | All activity components are correct — they just need correct data |
| `src/hooks/useLesson.ts` | Works fine — it just calls `generateLessonPlan()` and renders the result |
| `App.tsx` | The lesson loading flow is correct |
| `src/services/pedagogyEngine.ts` | The i+1 calibration and chunk selection logic is sound |

---

## Step-by-Step Implementation

### Step 1: Create `src/utils/languageUtils.ts`

This file is the SINGLE SOURCE OF TRUTH for language code conversion. Every file that converts between language names and codes MUST import from here. No more `substring(0, 2)` anywhere.

```typescript
/**
 * LingoFriends — Language Utilities
 *
 * SINGLE SOURCE OF TRUTH for language code ↔ name conversion.
 * Every file in the project that needs to convert language names to codes
 * (or vice versa) MUST import from this file.
 *
 * DO NOT use .substring(0, 2) for language code conversion anywhere.
 * DO NOT create local language lookup tables anywhere else.
 *
 * @module utils/languageUtils
 */

const NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  italian: 'it',
  portuguese: 'pt',
  japanese: 'ja',
  chinese: 'zh',
  korean: 'ko',
  russian: 'ru',
  arabic: 'ar',
  hindi: 'hi',
  dutch: 'nl',
  swedish: 'sv',
  polish: 'pl',
  ukrainian: 'uk',
  romanian: 'ro',
};

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_CODE).map(([name, code]) => [code, name.charAt(0).toUpperCase() + name.slice(1)])
);

/**
 * Convert a language name OR code to an ISO 639-1 two-letter code.
 *
 * Handles all formats:
 * - Full name: "German" → "de"
 * - Already a code: "de" → "de"
 * - Mixed case: "FRENCH" → "fr"
 * - With whitespace: " English " → "en"
 *
 * @throws Error if the language is not recognized
 */
export function toLanguageCode(language: string): string {
  const normalized = language.toLowerCase().trim();

  // Already a valid 2-letter code?
  if (normalized.length === 2 && CODE_TO_NAME[normalized]) {
    return normalized;
  }

  // Look up by name
  const code = NAME_TO_CODE[normalized];
  if (code) return code;

  // Last resort: check if it's a known code that wasn't in CODE_TO_NAME
  if (normalized.length === 2) {
    console.warn(`[languageUtils] Unknown 2-letter code "${normalized}", using as-is`);
    return normalized;
  }

  console.error(`[languageUtils] Unrecognized language: "${language}", falling back to "en"`);
  return 'en';
}

/**
 * Convert a language code to a display name.
 *
 * "de" → "German"
 * "fr" → "French"
 */
export function toLanguageName(code: string): string {
  const normalized = code.toLowerCase().trim();

  // Already a full name?
  if (NAME_TO_CODE[normalized]) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return CODE_TO_NAME[normalized] || code;
}

/**
 * Check if a string is a valid ISO 639-1 language code we support.
 */
export function isValidLanguageCode(code: string): boolean {
  return code.length === 2 && CODE_TO_NAME[code.toLowerCase()] !== undefined;
}

/**
 * Get all supported languages as { code, name } pairs.
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(CODE_TO_NAME).map(([code, name]) => ({ code, name }));
}
```

**After creating this file, update these imports:**

In `src/services/learnerProfileService.ts` — DELETE the local `toLanguageCode()` function and `codes` object. Replace with:
```typescript
import { toLanguageCode } from '../utils/languageUtils';
```

In `src/services/lessonPlanService.ts` — DELETE the `createDefaultProfile()` function entirely. It will be replaced (see Step 5).

---

### Step 2: Create `src/services/lessonAssembler.ts`

This is the core of the fix. It takes AI-generated chunk content and deterministically builds a LessonPlan using the teach-first 5-step progression. No AI involvement in activity assembly — just pure TypeScript.

```typescript
/**
 * LingoFriends — Lesson Assembler
 *
 * Deterministic lesson assembly from AI-generated chunk content.
 * This module is the ONLY place where LessonStep[] arrays are created.
 *
 * ARCHITECTURE RULE:
 * The AI generates CONTENT (chunks, translations, distractors, contexts).
 * This assembler builds ACTIVITIES (ActivityConfig objects).
 * These two concerns are NEVER mixed.
 *
 * Every chunk goes through the teach-first 5-step progression:
 *   1. INTRODUCE — Show chunk + translation (INFO step, 0 SunDrops)
 *   2. RECOGNIZE — Multiple choice: "What does X mean?" (1 SunDrop)
 *   3. PRACTICE  — Fill in the blank with hint (2 SunDrops)
 *   4. RECALL    — Translate from native to target (3 SunDrops)
 *   5. APPLY     — Contextual multiple choice (2 SunDrops)
 *
 * @module lessonAssembler
 */

import { GameActivityType } from '../types/game';
import type { ActivityConfig, LessonStep, LessonPlan } from '../types/game';
import { toLanguageName } from '../utils/languageUtils';

// ============================================
// TYPES — What the AI must provide
// ============================================

/**
 * A single chunk of content generated by the AI.
 * This is the ONLY interface between AI output and lesson assembly.
 *
 * CRITICAL: The AI must provide ALL of these fields for each chunk.
 * The assembler will NOT call the AI or guess at missing fields.
 */
export interface GeneratedChunkContent {
  /** The chunk in the target language, e.g. "Guten Morgen" */
  targetPhrase: string;

  /** Translation in the native language, e.g. "Good morning" */
  nativeTranslation: string;

  /** A short sentence using the chunk in context, e.g. "Guten Morgen! Wie geht's?" */
  exampleSentence: string;

  /** When/how to use this chunk, e.g. "Use as a greeting before noon" */
  usageNote: string;

  /** A brief explanation suitable for children, e.g. "A polite way to say hello in the morning" */
  explanation: string;

  /**
   * 3 plausible but WRONG translations for multiple choice.
   * These MUST be in the NATIVE language (same language as nativeTranslation).
   * They must be plausible (same category) but clearly different in meaning.
   *
   * Example for "Guten Morgen" (Good morning):
   *   ["Good evening", "Good night", "Goodbye"]
   *
   * NOT: ["Guten Abend", "Tschüss", "Danke"] ← these are in the target language!
   */
  distractors: [string, string, string];

  /**
   * 3 plausible but WRONG usage contexts for the APPLY step.
   * The first element of this array will be treated as the CORRECT usage context.
   * Wait — actually, let's structure this differently for clarity.
   */

  /** The correct usage context, e.g. "Meeting someone in the morning" */
  correctUsageContext: string;

  /**
   * 3 wrong usage contexts (plausible but incorrect).
   * e.g. ["Leaving a party at night", "Ordering food at a restaurant", "Answering the phone"]
   */
  wrongUsageContexts: [string, string, string];
}

/**
 * Complete AI output for a lesson — just content, no activity structure.
 */
export interface AILessonContent {
  /** Lesson title, e.g. "Morning Greetings" */
  title: string;

  /** Target language code, e.g. "de" */
  targetLanguageCode: string;

  /** Native language code, e.g. "en" */
  nativeLanguageCode: string;

  /** The chunks to teach in this lesson (2-4 chunks) */
  chunks: GeneratedChunkContent[];

  /** Learner interests used for personalization (from profile) */
  interests: string[];
}

// ============================================
// ASSEMBLY — Deterministic, never calls AI
// ============================================

/**
 * Assemble a complete LessonPlan from AI-generated content.
 *
 * This function is DETERMINISTIC — same input always produces same output.
 * It NEVER calls the AI, NEVER makes network requests.
 *
 * @param content - AI-generated chunk content
 * @param lessonId - Unique lesson ID (from caller)
 * @returns A valid, complete LessonPlan ready for LessonView
 */
export function assembleLessonPlan(
  content: AILessonContent,
  lessonId: string
): LessonPlan {
  const targetLangName = toLanguageName(content.targetLanguageCode);
  const steps: LessonStep[] = [];

  for (const chunk of content.chunks) {
    steps.push(...assembleTeachFirstSteps(chunk, targetLangName));
  }

  const totalSunDrops = steps.reduce((sum, step) => sum + step.activity.sunDrops, 0);

  return {
    id: lessonId,
    title: content.title,
    icon: '📚',
    skillPathId: content.title,
    lessonIndex: 0,
    steps,
    totalSunDrops,
  };
}

/**
 * Build the 5 teach-first steps for a single chunk.
 *
 * Every chunk ALWAYS gets all 5 steps, in order.
 * This guarantees the learner sees the content before being tested on it.
 */
function assembleTeachFirstSteps(
  chunk: GeneratedChunkContent,
  targetLangName: string
): LessonStep[] {
  return [
    // ── STEP 1: INTRODUCE ──────────────────────────────────────────
    // Show the chunk and its translation. No quiz. No pressure.
    {
      tutorText: `📚 New phrase: "${chunk.targetPhrase}"`,
      helpText: chunk.explanation,
      activity: {
        type: GameActivityType.INFO,
        title: chunk.targetPhrase,
        content: `${chunk.targetPhrase} = "${chunk.nativeTranslation}"`,
        explanation: chunk.explanation,
        example: chunk.exampleSentence,
        sunDrops: 0,
      },
    },

    // ── STEP 2: RECOGNIZE ──────────────────────────────────────────
    // Multiple choice: "What does [target phrase] mean?"
    // The hint reminds them of the answer — this is GUIDED practice.
    {
      tutorText: `Let's check — what does "${chunk.targetPhrase}" mean?`,
      helpText: `Remember: "${chunk.targetPhrase}" = "${chunk.nativeTranslation}"`,
      activity: {
        type: GameActivityType.MULTIPLE_CHOICE,
        question: `What does "${chunk.targetPhrase}" mean?`,
        options: shuffleWithCorrectAtIndex(
          chunk.nativeTranslation,
          chunk.distractors,
        ),
        correctIndex: 0, // Will be set by shuffleWithCorrectAtIndex — see below
        hint: `"${chunk.targetPhrase}" = "${chunk.nativeTranslation}"`,
        sunDrops: 1,
      },
    },

    // ── STEP 3: PRACTICE ───────────────────────────────────────────
    // Fill in the blank — they must recall part of the phrase.
    {
      tutorText: `Practice time! Complete this phrase.`,
      helpText: `The answer is: "${chunk.targetPhrase}"`,
      activity: {
        type: GameActivityType.FILL_BLANK,
        sentence: buildFillBlankSentence(chunk),
        correctAnswer: getFillBlankAnswer(chunk),
        acceptedAnswers: getFillBlankAcceptedAnswers(chunk),
        hint: `"${chunk.targetPhrase}" = "${chunk.nativeTranslation}"`,
        sunDrops: 2,
      },
    },

    // ── STEP 4: RECALL ─────────────────────────────────────────────
    // Translate from native to target — no hints given.
    {
      tutorText: `Your turn! How do you say "${chunk.nativeTranslation}" in ${targetLangName}?`,
      helpText: `Think about the phrase we just learned...`,
      activity: {
        type: GameActivityType.TRANSLATE,
        sourcePhrase: chunk.nativeTranslation,
        acceptedAnswers: [
          chunk.targetPhrase,
          chunk.targetPhrase.toLowerCase(),
          // Strip punctuation variant
          chunk.targetPhrase.replace(/[!?.,]/g, '').trim(),
        ],
        hint: `It starts with "${chunk.targetPhrase.substring(0, 3)}..."`,
        sunDrops: 3,
      },
    },

    // ── STEP 5: APPLY ──────────────────────────────────────────────
    // Contextual question — when would you use this phrase?
    {
      tutorText: `Great! Now, when would you say "${chunk.targetPhrase}"?`,
      helpText: chunk.usageNote,
      activity: {
        type: GameActivityType.MULTIPLE_CHOICE,
        question: `When would you say "${chunk.targetPhrase}"?`,
        options: shuffleWithCorrectAtIndex(
          chunk.correctUsageContext,
          chunk.wrongUsageContexts,
        ),
        correctIndex: 0, // Set by shuffleWithCorrectAtIndex
        hint: chunk.usageNote,
        sunDrops: 2,
      },
    },
  ];
}

// ============================================
// HELPERS
// ============================================

/**
 * Shuffle options so the correct answer isn't always first.
 *
 * Returns the shuffled array and MUTATES nothing.
 * The correctIndex on the ActivityConfig is set to wherever the correct answer lands.
 *
 * IMPORTANT: This returns { options, correctIndex } but since we're building
 * the ActivityConfig inline, we use a different approach — we place the correct
 * answer at a random position and return the full options array.
 *
 * Actually, for simplicity and testability, let's use a seeded approach:
 * place correct answer at a deterministic position based on the answer text.
 */
function shuffleWithCorrectAtIndex(
  correctAnswer: string,
  wrongAnswers: [string, string, string]
): string[] {
  // Deterministic position based on answer content length
  // This ensures the same content always produces the same layout
  // but the correct answer isn't always at index 0
  const position = correctAnswer.length % 4;
  const options = [...wrongAnswers];
  options.splice(position, 0, correctAnswer);
  return options;
}

// NOTE: Because shuffleWithCorrectAtIndex places the correct answer at
// (correctAnswer.length % 4), the calling code must also set correctIndex
// to that value. Let's fix the step builders to do this:

/**
 * Get the correct index for a shuffled options array.
 */
export function getCorrectIndex(correctAnswer: string): number {
  return correctAnswer.length % 4;
}

/**
 * Build the fill-in-the-blank sentence.
 *
 * Strategy: If the target phrase has multiple words, blank out the last word.
 * If it's a single word, use "___" means "[native translation]" format.
 */
function buildFillBlankSentence(chunk: GeneratedChunkContent): string {
  const words = chunk.targetPhrase.split(/\s+/);
  if (words.length >= 2) {
    // Blank out the last word: "Guten ___"
    const blanked = words.slice(0, -1).join(' ') + ' ___';
    return blanked;
  }
  // Single word: "___ means [translation]"
  return `___ = "${chunk.nativeTranslation}"`;
}

/**
 * Get the expected answer for the fill-in-the-blank.
 */
function getFillBlankAnswer(chunk: GeneratedChunkContent): string {
  const words = chunk.targetPhrase.split(/\s+/);
  if (words.length >= 2) {
    return words[words.length - 1]; // Last word
  }
  return chunk.targetPhrase; // Whole word
}

/**
 * Get all accepted answers for fill-in-the-blank (case variants etc).
 */
function getFillBlankAcceptedAnswers(chunk: GeneratedChunkContent): string[] {
  const answer = getFillBlankAnswer(chunk);
  return [
    answer,
    answer.toLowerCase(),
    answer.replace(/[!?.,]/g, '').trim(),
    answer.toLowerCase().replace(/[!?.,]/g, '').trim(),
  ].filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate
}
```

**CRITICAL FIX needed in the step builders above**: The `correctIndex` in the RECOGNIZE and APPLY steps must match the shuffle. Update the step builders to use `getCorrectIndex()`:

Replace in the RECOGNIZE step:
```typescript
correctIndex: 0, // Will be set by shuffleWithCorrectAtIndex — see below
```
With:
```typescript
correctIndex: getCorrectIndex(chunk.nativeTranslation),
```

Replace in the APPLY step:
```typescript
correctIndex: 0, // Set by shuffleWithCorrectAtIndex
```
With:
```typescript
correctIndex: getCorrectIndex(chunk.correctUsageContext),
```

---

### Step 3: Create `src/services/lessonValidator.ts`

This is the safety net. Every LessonPlan must pass validation before reaching LessonView. If it fails, the error message tells you exactly what's wrong.

```typescript
/**
 * LingoFriends — Lesson Validator
 *
 * Validates every LessonPlan before it reaches LessonView.
 * If a lesson fails validation, it is REJECTED — not silently rendered
 * with missing data.
 *
 * RULE: No LessonPlan may reach LessonView without passing validateLessonPlan().
 *
 * @module lessonValidator
 */

import { GameActivityType } from '../types/game';
import type { LessonPlan, LessonStep, ActivityConfig } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// MAIN VALIDATOR
// ============================================

/**
 * Validate a LessonPlan completely.
 *
 * Checks:
 * 1. Plan structure (id, title, steps exist)
 * 2. Each step has tutorText, helpText, and a valid activity
 * 3. Each activity has all required fields for its type
 * 4. SunDrops values are in valid range
 * 5. At least one INFO step exists before the first quiz step
 *    (teach-before-test enforcement)
 */
export function validateLessonPlan(plan: LessonPlan): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Plan-level checks ──
  if (!plan.id) errors.push('Missing lesson plan ID');
  if (!plan.title) errors.push('Missing lesson plan title');
  if (!plan.steps || plan.steps.length === 0) {
    errors.push('Lesson plan has no steps');
    return { valid: false, errors, warnings };
  }
  if (plan.steps.length < 3) warnings.push(`Only ${plan.steps.length} steps — very short lesson`);
  if (plan.steps.length > 30) warnings.push(`${plan.steps.length} steps — very long lesson`);

  // ── Teach-before-test check ──
  let hasSeenInfoStep = false;
  let hasSeenQuizBeforeInfo = false;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepLabel = `Step ${i + 1}`;

    // Step-level checks
    if (!step.tutorText) warnings.push(`${stepLabel}: Missing tutorText`);
    if (!step.helpText) warnings.push(`${stepLabel}: Missing helpText`);
    if (!step.activity) {
      errors.push(`${stepLabel}: Missing activity`);
      continue;
    }

    // Track teach-before-test
    if (step.activity.type === GameActivityType.INFO) {
      hasSeenInfoStep = true;
    } else if (!hasSeenInfoStep && !hasSeenQuizBeforeInfo) {
      hasSeenQuizBeforeInfo = true;
      warnings.push(`${stepLabel}: Quiz activity before any INFO/teaching step`);
    }

    // Activity validation
    const actErrors = validateActivity(step.activity, stepLabel);
    errors.push(...actErrors.errors);
    warnings.push(...actErrors.warnings);
  }

  // ── SunDrops check ──
  const totalSunDrops = plan.steps.reduce((sum, s) => sum + (s.activity?.sunDrops || 0), 0);
  if (Math.abs(totalSunDrops - plan.totalSunDrops) > 0) {
    warnings.push(`totalSunDrops mismatch: header says ${plan.totalSunDrops} but steps sum to ${totalSunDrops}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// ACTIVITY VALIDATOR
// ============================================

function validateActivity(
  activity: ActivityConfig,
  stepLabel: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const type = activity.type;

  // Common checks
  if (typeof activity.sunDrops !== 'number' || activity.sunDrops < 0 || activity.sunDrops > 4) {
    errors.push(`${stepLabel}: Invalid sunDrops value: ${activity.sunDrops}`);
  }

  switch (type) {
    case GameActivityType.INFO:
      if (!activity.title && !activity.content) {
        errors.push(`${stepLabel} (INFO): Must have title or content`);
      }
      break;

    case GameActivityType.MULTIPLE_CHOICE:
      if (!activity.question) errors.push(`${stepLabel} (MC): Missing question`);
      if (!activity.options || activity.options.length < 2) {
        errors.push(`${stepLabel} (MC): Must have at least 2 options, got ${activity.options?.length || 0}`);
      }
      if (activity.options && activity.options.length !== 4) {
        warnings.push(`${stepLabel} (MC): Expected 4 options, got ${activity.options.length}`);
      }
      if (typeof activity.correctIndex !== 'number') {
        errors.push(`${stepLabel} (MC): Missing correctIndex`);
      } else if (activity.options && (activity.correctIndex < 0 || activity.correctIndex >= activity.options.length)) {
        errors.push(`${stepLabel} (MC): correctIndex ${activity.correctIndex} out of range [0, ${activity.options!.length - 1}]`);
      }
      // Check for duplicate options
      if (activity.options) {
        const unique = new Set(activity.options.map(o => o.toLowerCase().trim()));
        if (unique.size < activity.options.length) {
          errors.push(`${stepLabel} (MC): Duplicate options detected`);
        }
      }
      break;

    case GameActivityType.FILL_BLANK:
      if (!activity.sentence) errors.push(`${stepLabel} (FB): Missing sentence`);
      if (!activity.correctAnswer) errors.push(`${stepLabel} (FB): Missing correctAnswer`);
      if (activity.sentence && !activity.sentence.includes('___')) {
        warnings.push(`${stepLabel} (FB): Sentence has no ___ placeholder`);
      }
      break;

    case GameActivityType.TRANSLATE:
      if (!activity.sourcePhrase) errors.push(`${stepLabel} (TR): Missing sourcePhrase`);
      if (!activity.acceptedAnswers || activity.acceptedAnswers.length === 0) {
        errors.push(`${stepLabel} (TR): Missing acceptedAnswers`);
      }
      break;

    case GameActivityType.TRUE_FALSE:
      if (!activity.statement && !activity.question) {
        errors.push(`${stepLabel} (TF): Missing statement/question`);
      }
      if (typeof activity.isTrue !== 'boolean') {
        errors.push(`${stepLabel} (TF): Missing isTrue (must be boolean)`);
      }
      break;

    case GameActivityType.MATCHING:
      if (!activity.pairs || activity.pairs.length < 2) {
        errors.push(`${stepLabel} (MA): Must have at least 2 pairs, got ${activity.pairs?.length || 0}`);
      }
      if (activity.pairs) {
        for (let j = 0; j < activity.pairs.length; j++) {
          if (!activity.pairs[j].left || !activity.pairs[j].right) {
            errors.push(`${stepLabel} (MA): Pair ${j} has empty left or right`);
          }
        }
      }
      break;

    case GameActivityType.WORD_ARRANGE:
      if (!activity.targetSentence) errors.push(`${stepLabel} (WA): Missing targetSentence`);
      if (!activity.scrambledWords || activity.scrambledWords.length < 2) {
        errors.push(`${stepLabel} (WA): Must have at least 2 scrambledWords`);
      }
      break;

    default:
      errors.push(`${stepLabel}: Unknown activity type "${type}"`);
  }

  return { errors, warnings };
}
```

---

### Step 4: Rewrite AI prompt in `src/services/aiPedagogyClient.ts`

**DELETE** the existing `generateLesson()` method and `buildLessonPrompt()` method.
**ADD** a new `generateChunksForTopic()` method.

The AI's ONLY job is now to generate chunk content. It no longer generates activity JSON.

**Add this new method to the `AIPedagogyClient` class:**

```typescript
/**
 * Generate chunk content for a topic.
 *
 * The AI generates ONLY pedagogical content:
 * - Target phrases with translations
 * - Example sentences and usage notes
 * - Plausible distractors (in the correct language!)
 *
 * It does NOT generate activities, ActivityConfig, or any UI structure.
 *
 * @param params - Topic, language, and learner context
 * @returns Array of GeneratedChunkContent objects
 */
async generateChunksForTopic(params: {
  topic: string;
  targetLanguageCode: string;
  nativeLanguageCode: string;
  targetLanguageName: string;
  nativeLanguageName: string;
  chunkCount: number;
  ageGroup: '7-10' | '11-14' | '15-18';
  interests: string[];
  existingChunks?: string[];
}): Promise<GeneratedChunkContent[]> {
  const systemPrompt = `You are a language education content creator for children.
Your job is to generate vocabulary content for a ${params.targetLanguageName} lesson.
The learner speaks ${params.nativeLanguageName}.
Age group: ${params.ageGroup}.

RULES:
1. Generate exactly ${params.chunkCount} lexical chunks (phrases, not isolated words).
2. All chunks must be in ${params.targetLanguageName}.
3. All translations and distractors must be in ${params.nativeLanguageName}.
4. Distractors must be plausible but clearly wrong. They must be in ${params.nativeLanguageName} — NEVER in ${params.targetLanguageName}.
5. Usage contexts must be simple, concrete scenarios a child would understand.
6. Keep everything age-appropriate and encouraging.
7. If the learner has interests, try to connect chunks to those interests where natural.
${params.interests.length > 0 ? `\nLearner interests: ${params.interests.join(', ')}` : ''}
${params.existingChunks?.length ? `\nDo NOT repeat these phrases: ${params.existingChunks.join(', ')}` : ''}

Respond with ONLY a JSON array. No markdown, no explanation.`;

  const userPrompt = `Generate ${params.chunkCount} ${params.targetLanguageName} chunks for the topic: "${params.topic}"

Each chunk must be a JSON object with these EXACT fields:
{
  "targetPhrase": "phrase in ${params.targetLanguageName}",
  "nativeTranslation": "translation in ${params.nativeLanguageName}",
  "exampleSentence": "a short sentence using the phrase in ${params.targetLanguageName}",
  "usageNote": "when/how to use this phrase (in ${params.nativeLanguageName})",
  "explanation": "simple explanation for kids (in ${params.nativeLanguageName})",
  "distractors": ["wrong1 in ${params.nativeLanguageName}", "wrong2 in ${params.nativeLanguageName}", "wrong3 in ${params.nativeLanguageName}"],
  "correctUsageContext": "correct situation to use this phrase (in ${params.nativeLanguageName})",
  "wrongUsageContexts": ["wrong situation 1", "wrong situation 2", "wrong situation 3"]
}

Return a JSON array of ${params.chunkCount} such objects. Nothing else.`;

  const response = await this.callGroq(systemPrompt, userPrompt, 3000);

  return this.parseChunkContentResponse(response, params);
}
```

**Add the parser method:**

```typescript
/**
 * Parse and validate chunk content from AI response.
 * Strict validation — rejects chunks with missing or wrong-language data.
 */
private parseChunkContentResponse(
  content: string,
  params: { chunkCount: number; targetLanguageName: string; nativeLanguageName: string }
): GeneratedChunkContent[] {
  let jsonStr = content.trim();

  // Strip markdown fences
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  let parsed: any[];
  try {
    const raw = JSON.parse(jsonStr);
    // Handle both { chunks: [...] } and direct [...]
    parsed = Array.isArray(raw) ? raw : (raw.chunks || raw.data || []);
  } catch (e) {
    console.error('[AIPedagogyClient] Failed to parse chunk JSON:', e);
    throw new Error('AI returned invalid JSON for chunk content');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned empty or non-array chunk content');
  }

  // Validate each chunk
  const validated: GeneratedChunkContent[] = [];
  for (const raw of parsed) {
    const chunk = this.validateChunkContent(raw);
    if (chunk) validated.push(chunk);
  }

  if (validated.length === 0) {
    throw new Error('All AI-generated chunks failed validation');
  }

  return validated;
}

/**
 * Validate a single chunk content object.
 * Returns null if invalid (with console warning).
 */
private validateChunkContent(raw: any): GeneratedChunkContent | null {
  const required = [
    'targetPhrase', 'nativeTranslation', 'exampleSentence',
    'usageNote', 'explanation', 'distractors',
    'correctUsageContext', 'wrongUsageContexts',
  ];

  for (const field of required) {
    if (!raw[field]) {
      console.warn(`[AIPedagogyClient] Chunk missing "${field}":`, raw);
      // Try to salvage with defaults for non-critical fields
      if (field === 'usageNote') raw.usageNote = 'Use this phrase in conversation';
      else if (field === 'explanation') raw.explanation = `"${raw.targetPhrase}" is a useful phrase`;
      else if (field === 'exampleSentence') raw.exampleSentence = raw.targetPhrase;
      else return null;
    }
  }

  // Validate distractors
  if (!Array.isArray(raw.distractors) || raw.distractors.length < 3) {
    console.warn('[AIPedagogyClient] Chunk has < 3 distractors:', raw);
    return null;
  }

  if (!Array.isArray(raw.wrongUsageContexts) || raw.wrongUsageContexts.length < 3) {
    console.warn('[AIPedagogyClient] Chunk has < 3 wrongUsageContexts:', raw);
    return null;
  }

  return {
    targetPhrase: String(raw.targetPhrase).trim(),
    nativeTranslation: String(raw.nativeTranslation).trim(),
    exampleSentence: String(raw.exampleSentence).trim(),
    usageNote: String(raw.usageNote).trim(),
    explanation: String(raw.explanation).trim(),
    distractors: [
      String(raw.distractors[0]).trim(),
      String(raw.distractors[1]).trim(),
      String(raw.distractors[2]).trim(),
    ],
    correctUsageContext: String(raw.correctUsageContext).trim(),
    wrongUsageContexts: [
      String(raw.wrongUsageContexts[0]).trim(),
      String(raw.wrongUsageContexts[1]).trim(),
      String(raw.wrongUsageContexts[2]).trim(),
    ],
  };
}
```

**KEEP the existing `callGroq()` method** — it works fine.
**KEEP the existing `generateActivity()` method** — it may be useful later.
**KEEP the existing `parseLessonResponse()`** as a DEPRECATED fallback if needed.

---

### Step 5: Rewrite `src/services/lessonGeneratorV2.ts` — `generateLesson()`

Replace the `generateLesson()` method. The new flow:

1. Build AI request from session plan + profile
2. Call `aiPedagogyClient.generateChunksForTopic()` — get chunk content
3. Pass chunk content to `lessonAssembler.assembleLessonPlan()` — get LessonPlan
4. Run `lessonValidator.validateLessonPlan()` — confirm it's valid
5. Return the validated LessonPlan (or fall back to deterministic fallback)

```typescript
/**
 * Generate a lesson using the new AI→Assembler→Validator pipeline.
 *
 * FLOW:
 *   AI generates chunk content (translations, distractors, contexts)
 *   → Assembler builds activities deterministically (teach-first)
 *   → Validator confirms every activity has required fields
 *   → LessonPlan returned to caller
 *
 * If the AI call fails, falls back to hardcoded starter content
 * run through the SAME assembler, so the output format is identical.
 */
async generateLesson(request: LessonRequest): Promise<LessonGenerationResult> {
  const startTime = Date.now();

  const { sessionPlan, profile } = request;
  const targetLangCode = toLanguageCode(profile.targetLanguage);
  const nativeLangCode = toLanguageCode(profile.nativeLanguage);
  const targetLangName = toLanguageName(targetLangCode);
  const nativeLangName = toLanguageName(nativeLangCode);

  // Clean the topic — remove language suffixes like "(German)"
  const topic = sessionPlan.topic.replace(/\s*\([^)]*\)\s*$/, '').trim();

  let lessonPlan: LessonPlan;
  let usedFallback = false;

  try {
    // ── Step 1: Ask AI for chunk CONTENT only ──
    const aiContent = await aiPedagogyClient.generateChunksForTopic({
      topic,
      targetLanguageCode: targetLangCode,
      nativeLanguageCode: nativeLangCode,
      targetLanguageName: targetLangName,
      nativeLanguageName: nativeLangName,
      chunkCount: Math.min(4, Math.max(2, sessionPlan.targetChunks.length || 3)),
      ageGroup: getAgeGroup(profile.ageGroup),
      interests: profile.explicitInterests || [],
      existingChunks: sessionPlan.contextChunks?.map(c => c.text) || [],
    });

    // ── Step 2: Assemble activities deterministically ──
    const content: AILessonContent = {
      title: topic,
      targetLanguageCode: targetLangCode,
      nativeLanguageCode: nativeLangCode,
      chunks: aiContent,
      interests: profile.explicitInterests || [],
    };

    lessonPlan = assembleLessonPlan(content, `lesson_${Date.now()}`);

  } catch (error) {
    console.error('[LessonGenerator] AI chunk generation failed, using fallback:', error);
    usedFallback = true;

    // ── Fallback: use hardcoded starter content through the SAME assembler ──
    const fallbackChunks = getHardcodedStarterChunks(topic, targetLangCode, nativeLangCode);
    const content: AILessonContent = {
      title: topic,
      targetLanguageCode: targetLangCode,
      nativeLanguageCode: nativeLangCode,
      chunks: fallbackChunks,
      interests: [],
    };
    lessonPlan = assembleLessonPlan(content, `fallback_lesson_${Date.now()}`);
  }

  // ── Step 3: Validate ──
  const validation = validateLessonPlan(lessonPlan);
  if (!validation.valid) {
    console.error('[LessonGenerator] Lesson failed validation:', validation.errors);
    // In production, fall back to hardcoded rather than crash
    // This should NEVER happen if the assembler is correct
    throw new Error(`Lesson validation failed: ${validation.errors.join('; ')}`);
  }
  if (validation.warnings.length > 0) {
    console.warn('[LessonGenerator] Lesson warnings:', validation.warnings);
  }

  return {
    lesson: lessonPlan,
    meta: {
      generationTimeMs: Date.now() - startTime,
      newChunksCount: lessonPlan.steps.filter(s => s.activity.type === GameActivityType.INFO).length,
      reviewChunksCount: 0,
      usedFallback,
      activityTypes: lessonPlan.steps.map(s => s.activity.type as unknown as GameActivityType),
    },
  };
}
```

---

### Step 6: Hardcoded Starter Chunks (Fallback)

Add this to `lessonGeneratorV2.ts` (or a separate file). These are used when the AI fails. They go through the **same assembler** as AI content, so the output format is identical.

```typescript
/**
 * Hardcoded starter chunks for when the AI is unavailable.
 *
 * CRITICAL RULES:
 * 1. Distractors MUST be in the NATIVE language (same language as nativeTranslation)
 * 2. Usage contexts MUST be in the NATIVE language
 * 3. Every chunk must have all fields — no nulls, no undefined
 */
function getHardcodedStarterChunks(
  topic: string,
  targetLangCode: string,
  nativeLangCode: string
): GeneratedChunkContent[] {
  // Currently only German→English and English→French hardcoded
  // Add more as needed

  if (targetLangCode === 'de' && nativeLangCode === 'en') {
    return getGermanStarterChunks(topic);
  }
  if (targetLangCode === 'en' && nativeLangCode === 'fr') {
    return getEnglishForFrenchSpeakersChunks(topic);
  }
  if (targetLangCode === 'en' && nativeLangCode === 'en') {
    // Edge case — shouldn't happen but handle gracefully
    return getGermanStarterChunks(topic);
  }

  // Generic fallback — basic greetings adapted to target language
  return getGenericStarterChunks(targetLangCode, nativeLangCode);
}

function getGermanStarterChunks(topic: string): GeneratedChunkContent[] {
  // Default set — works for any topic
  return [
    {
      targetPhrase: 'Hallo',
      nativeTranslation: 'Hello',
      exampleSentence: 'Hallo! Wie geht es dir?',
      usageNote: 'A friendly, casual greeting for any time of day',
      explanation: 'The most common way to say hello in German',
      distractors: ['Goodbye', 'Thank you', 'Sorry'],
      correctUsageContext: 'Meeting a friend at school',
      wrongUsageContexts: ['Leaving a party', 'Ordering food', 'Going to sleep'],
    },
    {
      targetPhrase: 'Guten Morgen',
      nativeTranslation: 'Good morning',
      exampleSentence: 'Guten Morgen! Hast du gut geschlafen?',
      usageNote: 'Use this greeting in the morning, before noon',
      explanation: 'A polite morning greeting, slightly more formal than "Hallo"',
      distractors: ['Good evening', 'Good night', 'See you later'],
      correctUsageContext: 'Arriving at school in the morning',
      wrongUsageContexts: ['Leaving work at 6pm', 'Going to bed', 'Answering the phone at night'],
    },
    {
      targetPhrase: 'Tschüss',
      nativeTranslation: 'Bye',
      exampleSentence: 'Tschüss! Bis morgen!',
      usageNote: 'A casual goodbye — use with friends and people you know well',
      explanation: 'The casual way to say goodbye. Not for formal situations!',
      distractors: ['Hello', 'Please', 'Excuse me'],
      correctUsageContext: 'Saying goodbye to your friend after hanging out',
      wrongUsageContexts: ['Meeting your teacher for the first time', 'Starting a conversation', 'Asking for directions'],
    },
  ];
}

function getEnglishForFrenchSpeakersChunks(topic: string): GeneratedChunkContent[] {
  return [
    {
      targetPhrase: 'Hello',
      nativeTranslation: 'Bonjour',
      exampleSentence: 'Hello! How are you today?',
      usageNote: 'Une salutation amicale pour toute heure de la journée',
      explanation: 'La façon la plus courante de dire bonjour en anglais',
      distractors: ['Au revoir', 'Merci', 'Pardon'],
      correctUsageContext: 'Rencontrer un ami à l\'école',
      wrongUsageContexts: ['Quitter une fête', 'Commander de la nourriture', 'Aller dormir'],
    },
    {
      targetPhrase: 'Good morning',
      nativeTranslation: 'Bonjour (le matin)',
      exampleSentence: 'Good morning! Did you sleep well?',
      usageNote: 'Utilisez cette salutation le matin, avant midi',
      explanation: 'Une salutation polie du matin',
      distractors: ['Bonsoir', 'Bonne nuit', 'À plus tard'],
      correctUsageContext: 'Arriver à l\'école le matin',
      wrongUsageContexts: ['Quitter le travail à 18h', 'Aller au lit', 'Répondre au téléphone la nuit'],
    },
    {
      targetPhrase: 'Goodbye',
      nativeTranslation: 'Au revoir',
      exampleSentence: 'Goodbye! See you tomorrow!',
      usageNote: 'Un au revoir poli — fonctionne dans toutes les situations',
      explanation: 'La façon standard de dire au revoir en anglais',
      distractors: ['Bonjour', 'S\'il vous plaît', 'Excusez-moi'],
      correctUsageContext: 'Dire au revoir à un ami après avoir joué ensemble',
      wrongUsageContexts: ['Rencontrer quelqu\'un pour la première fois', 'Commencer une conversation', 'Demander son chemin'],
    },
  ];
}

function getGenericStarterChunks(
  targetLangCode: string,
  nativeLangCode: string
): GeneratedChunkContent[] {
  // Ultra-safe fallback — uses English translations with placeholder target
  console.warn(`[LessonGenerator] No hardcoded chunks for ${targetLangCode}→${nativeLangCode}, using generic fallback`);
  return [
    {
      targetPhrase: 'Hello',
      nativeTranslation: 'Hello',
      exampleSentence: 'Hello! How are you?',
      usageNote: 'A friendly greeting',
      explanation: 'The basic greeting',
      distractors: ['Goodbye', 'Thank you', 'Sorry'],
      correctUsageContext: 'Meeting someone',
      wrongUsageContexts: ['Leaving', 'Eating', 'Sleeping'],
    },
  ];
}
```

---

### Step 7: Update `src/services/lessonPlanService.ts`

Remove the broken `createDefaultProfile()` function. Use `languageUtils` for any language conversion. The service should be thin — it just calls `lessonGeneratorV2.generateLesson()`.

Key change: **Remove the manual `substring(0, 2)` language conversion.** Import `toLanguageCode` from `languageUtils`.

```typescript
// At the top of the file, add:
import { toLanguageCode } from '../utils/languageUtils';

// DELETE the entire createDefaultProfile() function.
// It is no longer needed — lessonGeneratorV2 handles profile defaults internally.
```

In the unauthenticated user path, replace `createDefaultProfile()` with a simpler inline default that uses `toLanguageCode`:

```typescript
const tempProfile = {
  ...DEFAULT_PROFILE_TEMPLATE,
  userId: 'temp-user',
  nativeLanguage: toLanguageCode(nativeLanguage || 'English'),
  targetLanguage: toLanguageCode(targetLanguage || 'German'),
};
```

---

### Step 8: Update `src/services/learnerProfileService.ts`

**Delete** the local `toLanguageCode()` function and its `codes` object.
**Import** from the shared utility:

```typescript
import { toLanguageCode } from '../utils/languageUtils';
```

No other changes needed — the function signature is the same.

---

## Integration: How the First Lesson Works End-to-End

After these changes, here's the complete flow for a new user clicking their first lesson:

```
1. User completes onboarding → selects French (native), German (target), interests: [Football, Gaming]
2. User enters garden → sees starter tree → clicks it → PathView shows "Introduce Yourself" lesson
3. User clicks the lesson step

4. App.tsx calls handleStartLesson(lesson)
   → lessonPlanService.generateLessonPlan({ lesson, targetLanguage: 'German' })

5. lessonPlanService:
   a. Gets userId from auth
   b. Gets/creates learner profile (targetLanguage: 'de', nativeLanguage: 'fr')
   c. Calls pedagogyEngine.prepareSession(userId, { topic: 'Introduce Yourself', duration: 10 })
   d. Calls lessonGeneratorV2.generateLesson({ userId, sessionPlan, profile })

6. lessonGeneratorV2.generateLesson():
   a. Converts profile.targetLanguage → 'de' → 'German' (using languageUtils)
   b. Converts profile.nativeLanguage → 'fr' → 'French' (using languageUtils)
   c. Calls aiPedagogyClient.generateChunksForTopic({
        topic: 'Introduce Yourself',
        targetLanguageName: 'German',
        nativeLanguageName: 'French',
        chunkCount: 3,
        interests: ['Football', 'Gaming'],
      })

7. AI returns (example):
   [
     {
       "targetPhrase": "Ich heiße...",
       "nativeTranslation": "Je m'appelle...",
       "exampleSentence": "Hallo! Ich heiße Max.",
       "usageNote": "Utilisez cette phrase pour dire votre nom",
       "explanation": "C'est la façon standard de se présenter en allemand",
       "distractors": ["J'ai faim", "Je suis fatigué", "J'habite à"],
       "correctUsageContext": "Se présenter à un nouveau camarade de classe",
       "wrongUsageContexts": ["Commander au restaurant", "Demander l'heure", "Parler du temps"]
     },
     ... (2 more chunks)
   ]

8. lessonAssembler.assembleLessonPlan() builds 15 steps (5 per chunk):
   - Step 1: INFO — "📚 New phrase: Ich heiße..."
   - Step 2: MULTIPLE_CHOICE — "What does 'Ich heiße...' mean?"
   - Step 3: FILL_BLANK — "Ich ___..."
   - Step 4: TRANSLATE — "How do you say 'Je m'appelle...' in German?"
   - Step 5: MULTIPLE_CHOICE — "When would you say 'Ich heiße...'?"
   - ... (repeat for chunks 2 and 3)

9. lessonValidator.validateLessonPlan() confirms all fields present ✓

10. LessonView renders the first step → child sees "📚 New phrase: Ich heiße..."
```

---

## What About the Existing Skill Path?

The "Introduce Yourself" lesson path is auto-generated during onboarding. This task does NOT change how paths are created — it only changes what happens when a lesson step is clicked.

**Future improvement (NOT this task):** Have the path generator use learner interests to create the first lesson topic, e.g. "Football Greetings" instead of just "Introduce Yourself." This would be a small change to `pathGeneratorService.ts`.

---

## Testing Checklist

After implementation, verify ALL of these:

### Language Plumbing
- [ ] New user selects German as target → profile has `targetLanguage: "de"` (not "ge" or "German")
- [ ] New user selects French as native → profile has `nativeLanguage: "fr"` (not "French")
- [ ] `toLanguageCode("German")` returns `"de"`
- [ ] `toLanguageCode("de")` returns `"de"` (passthrough)
- [ ] `toLanguageCode("FRENCH")` returns `"fr"` (case insensitive)
- [ ] No file in the project uses `.substring(0, 2)` for language conversion

### AI Content Generation
- [ ] AI returns chunks in the correct target language (German, not Spanish)
- [ ] All distractors are in the native language (not the target language)
- [ ] All usage contexts are in the native language
- [ ] If AI fails, fallback chunks are in the correct languages
- [ ] Console log shows `[LessonGenerator]` with chunk count and timing

### Teach-First Assembly
- [ ] Every chunk produces exactly 5 steps (INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY)
- [ ] The first step for every chunk is `type: 'info'` (no quiz)
- [ ] Multiple choice options have 4 items and no duplicates
- [ ] Fill-in-the-blank sentence contains `___`
- [ ] Translate activity has at least 2 accepted answers
- [ ] correctIndex is within bounds for every multiple choice activity
- [ ] Total SunDrops is reasonable (15-30 range for 3 chunks)

### Validation
- [ ] `validateLessonPlan()` returns `valid: true` for assembler output
- [ ] `validateLessonPlan()` returns `valid: false` if you manually remove a required field
- [ ] Console shows warnings (not errors) for minor issues

### End-to-End
- [ ] Fresh user can complete onboarding → garden → path → lesson without errors
- [ ] Lesson shows INFO step first ("New phrase: ...") — not a quiz
- [ ] Multiple choice questions have sensible distractors in the right language
- [ ] Fill-in-the-blank has a completable answer
- [ ] Translate activity accepts the correct answer
- [ ] "Give up" works on FillBlank and Translate after 3 attempts
- [ ] Lesson completes and returns to garden
- [ ] Repeating the same lesson regenerates (not cached old broken data)

### Regression
- [ ] Garden still works (trees, placement, 3D renderer)
- [ ] Onboarding still works (language selection, interests)
- [ ] Tutorial overlay still works
- [ ] SunDrops earned correctly during lesson
- [ ] Stars calculated correctly at lesson end

---

## DO NOT DO

These are things that should NOT be part of this task:

1. **Do not change the activity components** (`MultipleChoice.tsx`, `FillBlank.tsx`, etc.) — they work correctly when given correct data
2. **Do not change the garden, path, or tree systems** — they are not broken
3. **Do not add new activity types** — the existing 7 (INFO, MC, FB, WA, TF, MA, TR) are sufficient
4. **Do not change the AI model or API endpoint** — Groq + Llama 3.3 is fine
5. **Do not add complex caching** — get it working first, optimize later
6. **Do not change the database schema** — learner_profiles and chunk_exposures are correct
7. **Do not remove the existing `aiPedagogyClient` methods** — mark unused ones as `@deprecated` but keep them for now

---

## Import Map

After this task, the import chain should look like this:

```
lessonPlanService.ts
  └─→ imports lessonGeneratorV2 (default)
  └─→ imports pedagogyEngine
  └─→ imports learnerProfileService
  └─→ imports languageUtils         ← NEW

lessonGeneratorV2.ts
  └─→ imports aiPedagogyClient
  └─→ imports lessonAssembler       ← NEW
  └─→ imports lessonValidator        ← NEW
  └─→ imports languageUtils         ← NEW

lessonAssembler.ts                   ← NEW (no AI imports!)
  └─→ imports GameActivityType from types/game
  └─→ imports languageUtils

lessonValidator.ts                   ← NEW (no AI imports!)
  └─→ imports GameActivityType from types/game

aiPedagogyClient.ts
  └─→ imports languageUtils (for prompt building)
  └─→ calls Groq API

languageUtils.ts                     ← NEW (zero dependencies)
```

Note that `lessonAssembler.ts` and `lessonValidator.ts` have NO dependency on the AI client. They are pure, deterministic TypeScript. This is intentional — it means they can never break due to AI issues.

---

## Success Criteria

This task is DONE when:

1. A fresh user (new account, no data) can complete a full lesson with zero errors
2. Every question in the lesson was taught before being tested
3. All content is in the correct languages (target AND native)
4. The lesson works even when the AI is completely unavailable (Groq API down)
5. No file in the project uses `.substring(0, 2)` for language conversion
6. `validateLessonPlan()` passes for every generated lesson

---

## Notes for Cline

- **Read this entire document before writing any code.** The changes are interdependent.
- **Create `languageUtils.ts` FIRST** — other files depend on it.
- **Create `lessonAssembler.ts` SECOND** — it's the core of the fix.
- **Create `lessonValidator.ts` THIRD** — it validates the assembler's output.
- **Then update the existing files** in the order listed above.
- **Run the testing checklist** after every file change, not just at the end.
- If the AI prompt changes aren't generating correct content, the ASSEMBLER and VALIDATOR still work — you can debug the AI independently without breaking the lesson flow.
