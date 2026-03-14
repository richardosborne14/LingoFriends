# Task: Activity Variety in Lesson Generation

**Status:** Complete ✅  
**Phase:** Post-1.2 (Lesson Quality)  
**Dependencies:** Task 1.2.8 (Lesson Generator V2), Task E (Wiring)  
**Estimated Time:** 4–6 hours  
**Priority:** High — directly impacts how fun lessons feel

---

## Problem Statement

Currently, the V2 lesson generator produces lessons where every step follows the same pattern: INFO (teach) → MULTIPLE_CHOICE (check comprehension) → TRANSLATE (production). While this is pedagogically sound in structure, it becomes monotonous and boring — the opposite of what Duolingo does well.

The AI prompt in `aiPedagogyClient.ts` lists all activity types but doesn't enforce variety. The result is the AI "defaults" to a safe, repetitive pattern.

**Goal:** Every lesson should feel different. Within a single lesson, no two consecutive quiz steps should use the same activity type, and the full range of 6 activity types should be exercised across lessons.

---

## Objectives

1. Modify the lesson generation prompt to **explicitly plan activity type variety** before generating activities
2. Add a **variety constraint** to the `LessonGenerationRequest` interface
3. Add **post-generation validation** that rejects lessons with insufficient variety
4. Update the **fallback lesson generator** to also produce varied activities

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     aiPedagogyClient.ts         │
│  ┌───────────────────────────┐  │
│  │ NEW: Activity Planner     │  │
│  │ - Decide types BEFORE     │  │
│  │   generating content      │  │
│  │ - Enforce no consecutive  │  │
│  │   duplicates              │  │
│  │ - Ensure min 3 distinct   │  │
│  │   types per lesson        │  │
│  └───────────────┬───────────┘  │
│                  ▼              │
│  ┌───────────────────────────┐  │
│  │ Existing: Prompt Builder  │  │
│  │ - Now receives planned    │  │
│  │   type sequence           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│     lessonValidator.ts          │
│  NEW: validateActivityVariety() │
│  - Post-generation check        │
│  - Warning if < 3 distinct types│
│  - Error if all same type       │
└─────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Define Activity Type Sequencing Rules

**File:** `src/services/activitySequencer.ts` (NEW)

This module plans the sequence of activity types for a lesson before the AI generates content. The AI then fills in the content for each planned slot.

```typescript
// src/services/activitySequencer.ts

import { GameActivityType } from '@/types/game';

/**
 * Activity difficulty tiers.
 * Lessons should progress from easier to harder activity types.
 */
const ACTIVITY_TIERS = {
  recognition: [
    GameActivityType.TRUE_FALSE,
    GameActivityType.MULTIPLE_CHOICE,
  ],
  guided_production: [
    GameActivityType.MATCHING,
    GameActivityType.FILL_BLANK,
  ],
  free_production: [
    GameActivityType.WORD_ARRANGE,
    GameActivityType.TRANSLATE,
  ],
} as const;

/**
 * Pedagogical sequencing rules:
 *
 * 1. Every lesson STARTS with an INFO step (teach the chunk).
 * 2. The first quiz after INFO should be RECOGNITION tier
 *    (TRUE_FALSE or MULTIPLE_CHOICE — easy win after learning).
 * 3. Middle steps can be GUIDED_PRODUCTION
 *    (MATCHING or FILL_BLANK — scaffolded practice).
 * 4. Later steps should be FREE_PRODUCTION
 *    (WORD_ARRANGE or TRANSLATE — the learner constructs language).
 * 5. NO two consecutive steps may have the same activity type.
 * 6. A lesson with 5+ quiz steps should use at least 3 DISTINCT types.
 * 7. A lesson with 7+ quiz steps should use at least 4 DISTINCT types.
 */

interface SequencePlan {
  /** Ordered list of activity types for quiz steps (excludes INFO steps) */
  quizTypes: GameActivityType[];
  /** Full step plan including INFO positions */
  fullPlan: Array<{ type: 'info' | 'quiz'; activityType?: GameActivityType }>;
}

/**
 * Plan the activity type sequence for a lesson.
 *
 * @param totalSteps - Total number of steps in the lesson (including INFO)
 * @param infoStepIndices - Which step indices are INFO (teaching) steps
 * @param difficulty - Learner's current difficulty (1-5), affects type selection
 * @param previousLessonTypes - Activity types used in the learner's last lesson
 *                              (to avoid inter-lesson repetition too)
 * @returns SequencePlan with the planned activity types
 */
export function planActivitySequence(
  totalSteps: number,
  infoStepIndices: number[],
  difficulty: number,
  previousLessonTypes?: GameActivityType[],
): SequencePlan {
  const quizStepCount = totalSteps - infoStepIndices.length;
  const quizTypes: GameActivityType[] = [];

  // Build a weighted pool based on difficulty
  // Lower difficulty = more recognition activities
  // Higher difficulty = more production activities
  const pool = buildWeightedPool(difficulty);

  // Assign types ensuring no consecutive duplicates
  for (let i = 0; i < quizStepCount; i++) {
    const lastType = quizTypes[quizTypes.length - 1] ?? null;
    const lastTwoTypes = quizTypes.slice(-2);

    // Filter out the last used type to prevent consecutive duplicates
    let candidates = pool.filter(t => t !== lastType);

    // If we've used the same type in the last 2 slots, also avoid it
    if (lastTwoTypes.length === 2 && lastTwoTypes[0] === lastTwoTypes[1]) {
      candidates = candidates.filter(t => t !== lastTwoTypes[0]);
    }

    // Apply tier progression:
    // First third → prefer recognition
    // Middle third → prefer guided production
    // Last third → prefer free production
    const progress = i / quizStepCount;
    candidates = applyTierPreference(candidates, progress);

    // Pick a random candidate from the filtered list
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
      || pool[Math.floor(Math.random() * pool.length)];

    quizTypes.push(chosen);
  }

  // Ensure minimum variety
  const distinctTypes = new Set(quizTypes).size;
  const minRequired = quizStepCount >= 7 ? 4 : quizStepCount >= 5 ? 3 : 2;

  if (distinctTypes < minRequired) {
    enforceMinimumVariety(quizTypes, minRequired);
  }

  // Build full plan
  const fullPlan: SequencePlan['fullPlan'] = [];
  let quizIndex = 0;
  for (let i = 0; i < totalSteps; i++) {
    if (infoStepIndices.includes(i)) {
      fullPlan.push({ type: 'info' });
    } else {
      fullPlan.push({ type: 'quiz', activityType: quizTypes[quizIndex++] });
    }
  }

  return { quizTypes, fullPlan };
}

/**
 * Build a weighted pool of activity types based on difficulty.
 * Lower difficulty learners get more recognition tasks.
 * Higher difficulty learners get more production tasks.
 */
function buildWeightedPool(difficulty: number): GameActivityType[] {
  const pool: GameActivityType[] = [];

  // Recognition: more copies at low difficulty
  const recognitionWeight = Math.max(1, 4 - difficulty);
  for (let i = 0; i < recognitionWeight; i++) {
    pool.push(...ACTIVITY_TIERS.recognition);
  }

  // Guided production: steady presence
  const guidedWeight = 2;
  for (let i = 0; i < guidedWeight; i++) {
    pool.push(...ACTIVITY_TIERS.guided_production);
  }

  // Free production: more copies at high difficulty
  const productionWeight = Math.max(1, difficulty - 1);
  for (let i = 0; i < productionWeight; i++) {
    pool.push(...ACTIVITY_TIERS.free_production);
  }

  return pool;
}

/**
 * Apply tier preference based on lesson progress.
 * Early steps prefer recognition, late steps prefer production.
 */
function applyTierPreference(
  candidates: GameActivityType[],
  progress: number,
): GameActivityType[] {
  const recognition = new Set(ACTIVITY_TIERS.recognition);
  const production = new Set(ACTIVITY_TIERS.free_production);

  if (progress < 0.33) {
    // Early: strongly prefer recognition
    const preferred = candidates.filter(t => recognition.has(t));
    return preferred.length > 0 ? preferred : candidates;
  } else if (progress > 0.66) {
    // Late: strongly prefer production
    const preferred = candidates.filter(t => production.has(t));
    return preferred.length > 0 ? preferred : candidates;
  }

  return candidates; // Middle: no preference
}

/**
 * Mutate the quizTypes array in-place to ensure minimum variety.
 * Replaces duplicates with under-represented types.
 */
function enforceMinimumVariety(
  quizTypes: GameActivityType[],
  minDistinct: number,
): void {
  const allTypes = [
    ...ACTIVITY_TIERS.recognition,
    ...ACTIVITY_TIERS.guided_production,
    ...ACTIVITY_TIERS.free_production,
  ];
  const usedTypes = new Set(quizTypes);
  const missingTypes = allTypes.filter(t => !usedTypes.has(t));

  // Find the most over-represented type
  const typeCounts = new Map<GameActivityType, number>();
  quizTypes.forEach(t => typeCounts.set(t, (typeCounts.get(t) || 0) + 1));

  let typesAdded = 0;
  const typesNeeded = minDistinct - usedTypes.size;

  for (const missingType of missingTypes) {
    if (typesAdded >= typesNeeded) break;

    // Find the type with the most occurrences
    let maxCount = 0;
    let maxType: GameActivityType | null = null;
    typeCounts.forEach((count, type) => {
      if (count > maxCount) { maxCount = count; maxType = type; }
    });

    if (maxType && maxCount > 1) {
      // Replace one occurrence of the over-represented type
      const replaceIndex = quizTypes.lastIndexOf(maxType);
      // Don't create a consecutive duplicate
      if (replaceIndex > 0 && quizTypes[replaceIndex - 1] === missingType) {
        continue; // Skip this replacement, would create consecutive duplicate
      }
      quizTypes[replaceIndex] = missingType;
      typeCounts.set(maxType, maxCount - 1);
      typeCounts.set(missingType, 1);
      typesAdded++;
    }
  }
}
```

---

### Step 2 — Update the AI Prompt to Use Pre-Planned Types

**File:** `src/services/aiPedagogyClient.ts` (MODIFY)

The key change: instead of asking the AI to *choose* activity types, we *tell* it which type each step must be. The AI's job is to generate the *content* for each type, not decide the type.

Find the `buildLessonPrompt` method and update it:

```typescript
/**
 * Build the lesson generation prompt.
 *
 * CHANGED: Now receives a pre-planned activity type sequence from
 * activitySequencer.ts. The AI generates content for each slot,
 * not the activity type selection.
 */
private buildLessonPrompt(request: LessonGenerationRequest): string {
  const { context, activityTypes, activityCount, topic } = request;

  // Format chunks for the prompt
  const formatChunks = (chunks: LexicalChunk[], label: string) => {
    if (chunks.length === 0) return `No ${label}`;
    return chunks.map(c =>
      `- "${c.text}" = "${c.translation}" (difficulty: ${c.difficulty})`
    ).join('\n');
  };

  // NEW: Format the pre-planned step sequence
  const stepPlan = request.plannedSequence?.fullPlan
    .map((step, i) => {
      if (step.type === 'info') {
        return `Step ${i + 1}: INFO — Teach the chunk(s). Use TTS-friendly text.`;
      }
      return `Step ${i + 1}: ${step.activityType} — Generate a ${getActivityDescription(step.activityType!)} activity.`;
    })
    .join('\n');

  return `Create a lesson for learning ${context.targetLanguage} (${context.nativeLanguage} speaker).

**Topic:** ${topic}

**NEW CHUNKS TO TEACH (Focus on these):**
${formatChunks(context.targetChunks, 'new chunks')}

**REVIEW CHUNKS (Reinforce these):**
${formatChunks(context.reviewChunks, 'review chunks')}

**FAMILIAR CHUNKS (Use for context/scaffolding):**
${formatChunks(context.familiarChunks, 'familiar chunks')}

**MANDATORY STEP PLAN — Follow this EXACTLY:**
${stepPlan}

**CRITICAL RULES:**
1. You MUST follow the step plan above. Each step's activity type is pre-determined.
2. For INFO steps: Write a warm, encouraging introduction to the chunk. Include the target language phrase prominently — this text will be spoken aloud via TTS.
3. For quiz steps: Generate the activity content matching the EXACT type specified.
4. INFO steps have sunDrops: 0. Quiz step sunDrops vary by type (see below).
5. Start easy, get harder. Early quiz steps should use simpler examples.
6. Difficulty: ${request.difficultyLevel}/5
7. Age group: ${context.ageGroup}
8. Total SunDrops for quiz steps should be 15-25.

**SunDrop ranges by activity type:**
- TRUE_FALSE: 1
- MULTIPLE_CHOICE: 1-2
- MATCHING: 2-3
- FILL_BLANK: 2-3
- WORD_ARRANGE: 3-4
- TRANSLATE: 3-4

**Activity-specific generation rules:**

For MULTIPLE_CHOICE:
- question: Clear question in ${context.nativeLanguage}
- options: Array of EXACTLY 4 strings
- correctIndex: 0-3

For TRUE_FALSE:
- question: A statement about the target language chunk
- isTrue: boolean
- Include the chunk in the statement

For FILL_BLANK:
- sentence: Use ___ for the blank (1 blank only)
- correctAnswer: The word/phrase that fills the blank
- hint: Optional helpful hint

For MATCHING:
- pairs: Array of EXACTLY 4 objects with { left, right }
- left: target language, right: native language (or vice versa)

For WORD_ARRANGE:
- targetSentence: The correct sentence
- scrambledWords: The words in random order (include ALL words)

For TRANSLATE:
- sourcePhrase: Phrase in target language to translate
- correctAnswer: Best translation
- acceptedAnswers: Array of acceptable alternative translations

Generate the complete lesson as JSON now.`;
}

/**
 * Human-readable description of each activity type for the AI prompt.
 */
function getActivityDescription(type: GameActivityType): string {
  const descriptions: Record<string, string> = {
    'multiple_choice': 'multiple choice (4 options, pick the correct one)',
    'true_false': 'true/false (evaluate a statement)',
    'fill_blank': 'fill in the blank (complete a sentence)',
    'matching': 'matching pairs (connect 4 term-definition pairs)',
    'word_arrange': 'word arrangement (reorder scrambled words into correct sentence)',
    'translate': 'translation (translate a phrase and type the answer)',
  };
  return descriptions[type] || type;
}
```

---

### Step 3 — Wire the Sequencer into Lesson Generation

**File:** `src/services/lessonGeneratorV2.ts` (MODIFY)

In the `generateLesson` method, call the sequencer BEFORE building the prompt:

```typescript
import { planActivitySequence } from './activitySequencer';

// Inside generateLesson(), before the Groq API call:

// Plan the activity sequence BEFORE asking the AI to generate content
const totalSteps = sessionPlan.activityCount || 7;
const infoStepCount = Math.min(
  sessionPlan.targetChunks.length,
  Math.ceil(totalSteps * 0.3), // ~30% of steps are teaching steps
);

// INFO steps go at positions: 0, then spaced evenly for each new chunk
const infoStepIndices: number[] = [0]; // Always start with INFO
const chunkInterval = Math.floor((totalSteps - 1) / Math.max(1, infoStepCount - 1));
for (let i = 1; i < infoStepCount; i++) {
  const idx = i * chunkInterval;
  if (idx < totalSteps && !infoStepIndices.includes(idx)) {
    infoStepIndices.push(idx);
  }
}

const plannedSequence = planActivitySequence(
  totalSteps,
  infoStepIndices,
  request.difficultyLevel ?? 2,
  undefined, // TODO: pass previous lesson types from learner profile
);

// Pass to the prompt builder
request.plannedSequence = plannedSequence;
```

---

### Step 4 — Add Variety Validation

**File:** `src/services/lessonValidator.ts` (MODIFY)

Add a new validation check for activity variety:

```typescript
/**
 * Validate that a lesson has sufficient activity variety.
 * Called as part of validateLessonPlan().
 */
function validateActivityVariety(steps: LessonStep[]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get quiz step types (exclude INFO)
  const quizTypes = steps
    .filter(s => s.activity?.type !== GameActivityType.INFO)
    .map(s => s.activity?.type)
    .filter(Boolean) as GameActivityType[];

  if (quizTypes.length === 0) {
    errors.push('Lesson has no quiz activities — only INFO steps');
    return { errors, warnings };
  }

  // Check for consecutive duplicates
  for (let i = 1; i < quizTypes.length; i++) {
    if (quizTypes[i] === quizTypes[i - 1]) {
      warnings.push(
        `Consecutive duplicate activity type: steps ${i} and ${i + 1} are both ${quizTypes[i]}`
      );
    }
  }

  // Check minimum distinct types
  const distinctTypes = new Set(quizTypes);
  if (quizTypes.length >= 5 && distinctTypes.size < 3) {
    warnings.push(
      `Low variety: ${distinctTypes.size} distinct types in ${quizTypes.length} quiz steps (min 3 recommended)`
    );
  }

  // Check if ALL quiz steps are the same type (very bad)
  if (distinctTypes.size === 1 && quizTypes.length > 2) {
    errors.push(
      `All ${quizTypes.length} quiz steps use the same activity type: ${quizTypes[0]}. This violates variety rules.`
    );
  }

  return { errors, warnings };
}
```

Wire this into the existing `validateLessonPlan()` function:

```typescript
// Inside validateLessonPlan(), after the existing step-level checks:

// ── Activity variety check ─────────────────────────────────────────────
const varietyResult = validateActivityVariety(plan.steps);
errors.push(...varietyResult.errors);
warnings.push(...varietyResult.warnings);
```

---

### Step 5 — Update the LessonGenerationRequest Type

**File:** `src/types/pedagogy.ts` (MODIFY)

Add the planned sequence to the request type:

```typescript
import type { SequencePlan } from '@/services/activitySequencer';

// Add to LessonGenerationRequest interface:
interface LessonGenerationRequest {
  // ... existing fields ...

  /** Pre-planned activity type sequence from activitySequencer */
  plannedSequence?: SequencePlan;
}
```

---

### Step 6 — Update the Fallback Lesson Generator

**File:** `src/services/lessonGeneratorV2.ts` (MODIFY)

The fallback generator (used when Groq is down) should also use varied types:

```typescript
/**
 * Generate a fallback lesson from chunks when AI is unavailable.
 * NOW uses the activity sequencer for variety.
 */
private generateFallbackLesson(
  chunks: LexicalChunk[],
  context: PedagogyContext,
): GeneratedLesson {
  const totalSteps = Math.min(chunks.length * 2, 8); // 2 steps per chunk: teach + quiz
  const infoStepIndices = chunks.map((_, i) => i * 2).filter(i => i < totalSteps);

  const sequence = planActivitySequence(
    totalSteps,
    infoStepIndices,
    context.learnerLevel ?? 2,
  );

  const steps: LessonStep[] = [];
  let quizIndex = 0;

  for (let i = 0; i < totalSteps; i++) {
    const plan = sequence.fullPlan[i];
    const chunkIndex = Math.floor(i / 2);
    const chunk = chunks[Math.min(chunkIndex, chunks.length - 1)];

    if (plan.type === 'info') {
      steps.push(createInfoStep(chunk, context));
    } else {
      steps.push(createQuizStep(chunk, plan.activityType!, context));
      quizIndex++;
    }
  }

  return {
    id: `fallback-${Date.now()}`,
    title: `Practice: ${chunks[0]?.text || 'Language'}`,
    icon: '📚',
    steps,
    totalSunDrops: steps.reduce((sum, s) => sum + (s.activity?.sunDrops || 0), 0),
  };
}
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/activitySequencer.ts` | **CREATE** | Activity type planning with variety rules |
| `src/services/aiPedagogyClient.ts` | **MODIFY** | Update prompt to use pre-planned types |
| `src/services/lessonGeneratorV2.ts` | **MODIFY** | Wire sequencer before generation, update fallback |
| `src/services/lessonValidator.ts` | **MODIFY** | Add variety validation |
| `src/types/pedagogy.ts` | **MODIFY** | Add `plannedSequence` to request type |
| `src/services/activitySequencer.test.ts` | **CREATE** | Unit tests for sequencer |

---

## Testing Checklist

### Activity Sequencer
- [ ] `planActivitySequence(7, [0, 3], 2)` returns plan with no consecutive duplicates
- [ ] Plan with 5+ quiz steps has at least 3 distinct types
- [ ] Plan with 7+ quiz steps has at least 4 distinct types
- [ ] Low difficulty (1) produces more TRUE_FALSE and MULTIPLE_CHOICE
- [ ] High difficulty (5) produces more WORD_ARRANGE and TRANSLATE
- [ ] `enforceMinimumVariety` fixes an all-MULTIPLE_CHOICE array

### Prompt Integration
- [ ] Generated lesson follows the pre-planned type sequence
- [ ] AI does not override the planned activity types
- [ ] INFO steps have sunDrops: 0
- [ ] Quiz steps have appropriate sunDrops for their type

### Validation
- [ ] `validateActivityVariety` catches all-same-type lessons
- [ ] Warning logged for consecutive duplicates
- [ ] Lessons with good variety pass validation

### Fallback
- [ ] Fallback lessons also have varied activity types
- [ ] Fallback lessons validate successfully

---

## Pedagogical Rationale

This design implements two key principles from `PEDAGOGY.md`:

1. **Lexical Approach progression:** Recognition → Guided Production → Free Production mirrors how Lewis describes chunk acquisition. Learners first notice chunks (TRUE_FALSE, MULTIPLE_CHOICE), then use them in scaffolded contexts (MATCHING, FILL_BLANK), then produce them freely (WORD_ARRANGE, TRANSLATE).

2. **Krashen's Affective Filter:** Variety prevents boredom, which raises the affective filter. When lessons feel "the same every time," children disengage. The unpredictability of different activity types keeps engagement high — they never know what's coming next, which is exciting rather than tedious.

3. **Coaching methodology:** Different activity types exercise different cognitive skills. Matching is visual-spatial, translation is productive, word arrangement is syntactic. This multi-modal approach aligns with the coaching principle of addressing the whole learner.

---

## Notes for Cline

- Read `src/services/aiPedagogyClient.ts` carefully before modifying — the `buildLessonPrompt` method is the primary target.
- The `activitySequencer.ts` module should have ZERO dependencies on AI services — it's pure logic.
- Test the sequencer in isolation before wiring it into the lesson generator.
- If the AI ignores the planned types (common with LLMs), add a **post-generation fixup** that swaps the AI's chosen type with the planned type while keeping the AI's generated content. This is a safety net.
- The existing `ActivityRouter.tsx` already handles all 6 types — no UI changes needed.
