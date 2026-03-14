# Lesson Generation Fix — Cline Execution Plan

**IMPORTANT: This document contains 8 atomic subtasks. Execute them IN ORDER, one at a time. Do NOT skip ahead. Do NOT combine subtasks. Each subtask has its own scope, files, acceptance criteria, and test commands.**

---

## Background (Read Once, Do Not Re-Read Per Subtask)

The lesson generation pipeline is broken. Lessons show wrong-language content, test vocabulary that was never taught, crash with missing fields, and produce linguistically nonsensical questions.

**Root cause:** The AI is asked to generate complete activity JSON (exact field names, exact structure) and it frequently gets it wrong. There is no validation, no teach-before-test enforcement, and language codes are converted incorrectly in multiple places.

**Fix strategy:** The AI will ONLY generate pedagogical content (phrases, translations, distractors). All activity assembly happens in deterministic TypeScript. A validator catches errors before rendering.

**New pipeline:**
```
AI → chunk content (phrases + translations + distractors)
  → lessonAssembler.ts (deterministic activity building)
  → lessonValidator.ts (field validation + teach-before-test check)
  → LessonView renders
```

---

# SUBTASK 0: Update .clinerules

## Scope
Add lesson pipeline architecture rules to `.clinerules` so that no future task can drift from the correct architecture.

## Files to Modify
- `.clinerules` — Append a new section at the end

## What to Do

Open `.clinerules` and append the following section at the very end of the file, after the existing content:

```markdown
---

## Lesson Generation Pipeline — ARCHITECTURE RULES

These rules are NON-NEGOTIABLE. Every task that touches lesson generation must follow them.

### Rule 1: The AI generates CONTENT, not ACTIVITIES
The AI (Groq/Llama) generates ONLY:
- Target language phrases (lexical chunks)
- Native language translations
- Example sentences
- Usage notes
- Plausible distractors (in the NATIVE language)
- Usage contexts

The AI NEVER generates:
- ActivityConfig objects
- JSON with fields like `type`, `correctIndex`, `options`, `sunDrops`
- LessonStep objects
- LessonPlan objects

Activity assembly is handled by `src/services/lessonAssembler.ts` — deterministic TypeScript, no AI.

### Rule 2: Teach before test — ALWAYS
Every chunk/phrase follows the 5-step teach-first progression:
1. INTRODUCE (INFO) — Show phrase + translation, 0 SunDrops
2. RECOGNIZE (MULTIPLE_CHOICE) — "What does X mean?", 1 SunDrop
3. PRACTICE (FILL_BLANK) — Complete the phrase, 2 SunDrops
4. RECALL (TRANSLATE) — Translate from native to target, 3 SunDrops
5. APPLY (MULTIPLE_CHOICE) — "When would you say X?", 2 SunDrops

A learner must NEVER be quizzed on content they haven't seen in an INTRODUCE step first.

### Rule 3: Language codes — ONE utility, no shortcuts
All language name ↔ code conversion MUST use `src/utils/languageUtils.ts`.
- `toLanguageCode("German")` → `"de"` ✅
- `"German".substring(0, 2)` → `"Ge"` ❌ NEVER DO THIS
- Local lookup tables in individual files ❌ NEVER DO THIS

### Rule 4: Validation before rendering
Every LessonPlan MUST pass `validateLessonPlan()` from `src/services/lessonValidator.ts` before reaching LessonView. If validation fails, throw an error — do NOT render a broken lesson.

### Rule 5: Distractors match the question language
If the question is "What does [German phrase] mean?", the options (including distractors) are in the NATIVE language (e.g. English/French). Distractors are NEVER in the target language.

### Rule 6: ActivityConfig field contracts
Each activity type requires specific fields. If ANY required field is missing, the activity MUST NOT render.

| Type | Required Fields |
|------|----------------|
| `info` | `title` OR `content` |
| `multiple_choice` | `question`, `options` (4 items), `correctIndex` (0-3) |
| `fill_blank` | `sentence` (with `___`), `correctAnswer` |
| `translate` | `sourcePhrase`, `acceptedAnswers` (≥1 item) |
| `true_false` | `statement` OR `question`, `isTrue` (boolean) |
| `matching` | `pairs` (≥2 items, each with `left` + `right`) |
| `word_arrange` | `targetSentence`, `scrambledWords` (≥2 items) |

All types also require `sunDrops` (number, 0-4).

### Rule 7: File responsibilities — no mixing

| File | Responsibility | NEVER does |
|------|---------------|------------|
| `aiPedagogyClient.ts` | Calls Groq, returns chunk content | Builds ActivityConfig |
| `lessonAssembler.ts` | Builds LessonPlan from chunks | Calls AI, makes network requests |
| `lessonValidator.ts` | Validates LessonPlan fields | Calls AI, modifies the plan |
| `lessonGeneratorV2.ts` | Orchestrates: AI → Assembler → Validator | Builds activities directly |
| `lessonPlanService.ts` | Entry point, gets profile, calls generator | Builds activities directly |
```

## Acceptance Criteria
- [ ] `.clinerules` has the new "Lesson Generation Pipeline — ARCHITECTURE RULES" section
- [ ] All 7 rules are present
- [ ] No existing content in `.clinerules` was removed or modified
- [ ] File is valid markdown

## Test
Read through `.clinerules` and confirm the new section is appended at the end.

---

# SUBTASK 1: Create `src/utils/languageUtils.ts`

## Scope
Create the single source of truth for language code conversion. This file has ZERO dependencies on any other project file.

## Files to Create
- `src/utils/languageUtils.ts`

## Files NOT to Touch
Everything else. Do not modify any imports yet — that happens in Subtask 6.

## Exact File Content

Create `src/utils/languageUtils.ts` with this exact content:

```typescript
/**
 * LingoFriends — Language Utilities
 *
 * SINGLE SOURCE OF TRUTH for language code ↔ name conversion.
 * Every file that converts between language names and ISO codes
 * MUST import from this file. No exceptions.
 *
 * BANNED PATTERNS (grep the codebase and remove):
 *   .substring(0, 2) for language conversion
 *   .slice(0, 2) for language conversion
 *   Local language lookup objects in other files
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

const CODE_TO_NAME: Record<string, string> = {};
for (const [name, code] of Object.entries(NAME_TO_CODE)) {
  CODE_TO_NAME[code] = name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Convert a language name OR code to ISO 639-1 two-letter code.
 *
 * Examples:
 *   toLanguageCode("German")  → "de"
 *   toLanguageCode("de")      → "de"
 *   toLanguageCode("FRENCH")  → "fr"
 *   toLanguageCode(" English ") → "en"
 */
export function toLanguageCode(language: string): string {
  const normalized = language.toLowerCase().trim();

  // Already a valid 2-letter code we know?
  if (normalized.length === 2 && CODE_TO_NAME[normalized]) {
    return normalized;
  }

  // Look up by full name
  const code = NAME_TO_CODE[normalized];
  if (code) return code;

  // Unknown 2-letter string — use as-is with warning
  if (normalized.length === 2) {
    console.warn(`[languageUtils] Unknown 2-letter code "${normalized}", using as-is`);
    return normalized;
  }

  // Completely unknown — fall back to "en"
  console.error(`[languageUtils] Unrecognized language: "${language}", defaulting to "en"`);
  return 'en';
}

/**
 * Convert a language code to display name.
 *
 * Examples:
 *   toLanguageName("de") → "German"
 *   toLanguageName("fr") → "French"
 *   toLanguageName("German") → "German" (passthrough)
 */
export function toLanguageName(code: string): string {
  const normalized = code.toLowerCase().trim();

  // Already a full name?
  if (NAME_TO_CODE[normalized]) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  // It's a code — look up name
  return CODE_TO_NAME[normalized] || code;
}

/**
 * Check if a string is a supported language code.
 */
export function isValidLanguageCode(code: string): boolean {
  return code.length === 2 && CODE_TO_NAME[code.toLowerCase()] !== undefined;
}
```

## Acceptance Criteria
- [ ] File exists at `src/utils/languageUtils.ts`
- [ ] `toLanguageCode("German")` returns `"de"` (not `"ge"`)
- [ ] `toLanguageCode("de")` returns `"de"`
- [ ] `toLanguageCode("FRENCH")` returns `"fr"`
- [ ] `toLanguageName("de")` returns `"German"`
- [ ] TypeScript compiles with no errors

## Test
```bash
# Quick smoke test — add to a temporary test file or run in console:
import { toLanguageCode, toLanguageName } from './src/utils/languageUtils';
console.assert(toLanguageCode("German") === "de", "German → de FAILED");
console.assert(toLanguageCode("de") === "de", "de passthrough FAILED");
console.assert(toLanguageCode("FRENCH") === "fr", "FRENCH → fr FAILED");
console.assert(toLanguageName("de") === "German", "de → German FAILED");
console.log("All languageUtils tests passed ✅");
```

---

# SUBTASK 2: Create `src/services/lessonAssembler.ts`

## Scope
Create the deterministic lesson assembly module. This file converts chunk content into LessonStep arrays using the teach-first 5-step progression. It has NO dependency on the AI client, NO network calls.

## Files to Create
- `src/services/lessonAssembler.ts`

## Files NOT to Touch
Everything else.

## Dependencies (import from)
- `src/types/game.ts` — `GameActivityType`, `ActivityConfig`, `LessonStep`, `LessonPlan`
- `src/utils/languageUtils.ts` — `toLanguageName`

## Exact Types to Export

```typescript
/**
 * What the AI must provide for each chunk.
 * This is the ONLY contract between AI and assembly.
 */
export interface GeneratedChunkContent {
  /** Phrase in target language: "Guten Morgen" */
  targetPhrase: string;
  /** Translation in native language: "Good morning" */
  nativeTranslation: string;
  /** Example sentence in target language: "Guten Morgen! Wie geht's?" */
  exampleSentence: string;
  /** When to use it (in native language): "Use as a morning greeting" */
  usageNote: string;
  /** Kid-friendly explanation (in native language) */
  explanation: string;
  /** 3 wrong translations in NATIVE language: ["Good evening", "Goodbye", "Thank you"] */
  distractors: [string, string, string];
  /** Correct usage situation (in native language): "Meeting someone in the morning" */
  correctUsageContext: string;
  /** 3 wrong usage situations (in native language) */
  wrongUsageContexts: [string, string, string];
}

/**
 * Complete AI output — just content, no activity structure.
 */
export interface AILessonContent {
  title: string;
  targetLanguageCode: string;
  nativeLanguageCode: string;
  chunks: GeneratedChunkContent[];
}
```

## Exact Functions to Export

```typescript
/**
 * Build a LessonPlan from AI content. Deterministic. No AI calls.
 */
export function assembleLessonPlan(content: AILessonContent, lessonId: string): LessonPlan

/**
 * Get the correct option index for shuffled multiple choice.
 * Used by the assembler internally, exported for testing.
 */
export function getCorrectIndex(correctAnswer: string): number
```

## Assembly Logic for Each Chunk

Each chunk produces exactly 5 LessonStep objects:

**Step 1 — INTRODUCE:**
- `activity.type`: `GameActivityType.INFO`
- `activity.title`: the targetPhrase
- `activity.content`: `"${targetPhrase} = \"${nativeTranslation}\""`
- `activity.explanation`: the explanation field
- `activity.example`: the exampleSentence field
- `activity.sunDrops`: `0`

**Step 2 — RECOGNIZE:**
- `activity.type`: `GameActivityType.MULTIPLE_CHOICE`
- `activity.question`: `"What does \"${targetPhrase}\" mean?"`
- `activity.options`: `[nativeTranslation, ...distractors]` shuffled using `getCorrectIndex`
- `activity.correctIndex`: result of `getCorrectIndex(nativeTranslation)`
- `activity.hint`: `"\"${targetPhrase}\" = \"${nativeTranslation}\""`
- `activity.sunDrops`: `1`

**Step 3 — PRACTICE:**
- `activity.type`: `GameActivityType.FILL_BLANK`
- `activity.sentence`: If multi-word, blank the last word (`"Guten ___"`). If single word, `"___ = \"${nativeTranslation}\""`.
- `activity.correctAnswer`: the blanked word (or the whole targetPhrase if single word)
- `activity.acceptedAnswers`: `[answer, answer.toLowerCase()]` (deduplicated)
- `activity.hint`: `"\"${targetPhrase}\" = \"${nativeTranslation}\""`
- `activity.sunDrops`: `2`

**Step 4 — RECALL:**
- `activity.type`: `GameActivityType.TRANSLATE`
- `activity.sourcePhrase`: the nativeTranslation
- `activity.acceptedAnswers`: `[targetPhrase, targetPhrase.toLowerCase(), targetPhrase with punctuation stripped]` (deduplicated)
- `activity.hint`: `"It starts with \"${targetPhrase.substring(0, 3)}...\""`
- `activity.sunDrops`: `3`

**Step 5 — APPLY:**
- `activity.type`: `GameActivityType.MULTIPLE_CHOICE`
- `activity.question`: `"When would you say \"${targetPhrase}\"?"`
- `activity.options`: `[correctUsageContext, ...wrongUsageContexts]` shuffled using `getCorrectIndex`
- `activity.correctIndex`: result of `getCorrectIndex(correctUsageContext)`
- `activity.hint`: the usageNote
- `activity.sunDrops`: `2`

**Shuffle function (`getCorrectIndex`):** `correctAnswer.length % 4` — this is deterministic (same input → same position) but the correct answer won't always be at index 0.

**All steps** get `tutorText` and `helpText` strings (see the reference implementation in the architecture doc for exact wording).

## Acceptance Criteria
- [ ] File exists at `src/services/lessonAssembler.ts`
- [ ] Exports `GeneratedChunkContent`, `AILessonContent` interfaces
- [ ] Exports `assembleLessonPlan()` and `getCorrectIndex()` functions
- [ ] Given 3 chunks, `assembleLessonPlan()` returns a LessonPlan with exactly 15 steps
- [ ] First step for every chunk is `type: GameActivityType.INFO`
- [ ] No step has `activity.options` with fewer than 4 items (for MC type)
- [ ] No step has `activity.correctIndex` outside `[0, options.length - 1]`
- [ ] Every FILL_BLANK step has `sentence` containing `___`
- [ ] Every TRANSLATE step has `acceptedAnswers` with at least 1 entry
- [ ] `sunDrops` total for 3 chunks = `(0+1+2+3+2) × 3 = 24`
- [ ] TypeScript compiles with no errors
- [ ] File does NOT import from `aiPedagogyClient` or any AI service

## Test
Write a quick test in the same file or a separate test file:
```typescript
const testContent: AILessonContent = {
  title: "Test Greetings",
  targetLanguageCode: "de",
  nativeLanguageCode: "en",
  chunks: [{
    targetPhrase: "Hallo",
    nativeTranslation: "Hello",
    exampleSentence: "Hallo! Wie geht es dir?",
    usageNote: "A casual greeting for any time of day",
    explanation: "The most common German greeting",
    distractors: ["Goodbye", "Thank you", "Sorry"],
    correctUsageContext: "Meeting a friend at school",
    wrongUsageContexts: ["Leaving a party", "Ordering food", "Going to bed"],
  }],
};
const plan = assembleLessonPlan(testContent, "test-1");
console.assert(plan.steps.length === 5, `Expected 5 steps, got ${plan.steps.length}`);
console.assert(plan.steps[0].activity.type === GameActivityType.INFO, "First step must be INFO");
console.assert(plan.totalSunDrops === 8, `Expected 8 sunDrops, got ${plan.totalSunDrops}`);
console.log("assembleLessonPlan test passed ✅");
```

---

# SUBTASK 3: Create `src/services/lessonValidator.ts`

## Scope
Create the validation module. It checks every field on every activity in a LessonPlan. It has NO dependencies on AI, NO network calls.

## Files to Create
- `src/services/lessonValidator.ts`

## Files NOT to Touch
Everything else.

## Dependencies (import from)
- `src/types/game.ts` — `GameActivityType`, `LessonPlan`, `LessonStep`, `ActivityConfig`

## Exact Functions to Export

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];   // Blocking — lesson MUST NOT render
  warnings: string[]; // Non-blocking — log but allow
}

export function validateLessonPlan(plan: LessonPlan): ValidationResult
```

## Validation Rules

**Plan-level:**
- `plan.id` must be truthy → error if missing
- `plan.title` must be truthy → error if missing
- `plan.steps` must be a non-empty array → error if missing/empty
- `plan.steps.length < 3` → warning
- `plan.steps.length > 30` → warning
- `plan.totalSunDrops` should match sum of step sunDrops → warning if mismatch

**Teach-before-test:**
- If a quiz activity (anything except INFO) appears before any INFO step → warning

**Step-level (for each step):**
- `step.tutorText` missing → warning
- `step.helpText` missing → warning
- `step.activity` missing → error

**Activity-level (per type):** See the table in Subtask 0 `.clinerules` Rule 6. Every missing required field is an ERROR.

**Additional MC checks:**
- `options` must have exactly 4 items → warning if not 4 (error if < 2)
- `correctIndex` must be `>= 0` and `< options.length` → error if out of range
- No duplicate options (case-insensitive) → error if found

## Acceptance Criteria
- [ ] File exists at `src/services/lessonValidator.ts`
- [ ] Exports `ValidationResult` interface and `validateLessonPlan()` function
- [ ] Valid lesson returns `{ valid: true, errors: [], warnings: [] }`
- [ ] Lesson with missing `question` on MC returns `valid: false` with error message
- [ ] Lesson with `correctIndex: 5` on 4-option MC returns `valid: false`
- [ ] Lesson with duplicate MC options returns `valid: false`
- [ ] Lesson with quiz before any INFO step returns `valid: true` with warning
- [ ] TypeScript compiles with no errors
- [ ] File does NOT import from any AI service

## Test
```typescript
import { assembleLessonPlan } from './lessonAssembler';
import { validateLessonPlan } from './lessonValidator';

// Use the same testContent from Subtask 2
const plan = assembleLessonPlan(testContent, "test-1");
const result = validateLessonPlan(plan);
console.assert(result.valid === true, `Validation should pass, got errors: ${result.errors}`);
console.log("Validator test passed ✅");

// Test failure case
const badPlan = { ...plan, steps: [{ tutorText: "", helpText: "", activity: { type: "multiple_choice", sunDrops: 2 } }] };
const badResult = validateLessonPlan(badPlan as any);
console.assert(badResult.valid === false, "Should fail for missing MC fields");
console.log("Validator failure test passed ✅");
```

---

# SUBTASK 4: Add `generateChunksForTopic()` to `src/services/aiPedagogyClient.ts`

## Scope
Add a NEW method to the existing `AIPedagogyClient` class. Do NOT delete any existing methods — mark them `@deprecated` with a comment but leave the code in place.

## Files to Modify
- `src/services/aiPedagogyClient.ts`

## Files NOT to Touch
Everything else.

## What to Do

1. Add this import at the top:
```typescript
import type { GeneratedChunkContent } from './lessonAssembler';
```

2. Add a new method `generateChunksForTopic()` to the class. This method:
   - Takes: `topic`, `targetLanguageCode`, `nativeLanguageCode`, `targetLanguageName`, `nativeLanguageName`, `chunkCount` (number, 2-4), `ageGroup`, `interests` (string[]), optional `existingChunks` (string[])
   - Calls `this.callGroq()` with a system prompt that tells the AI to generate chunk CONTENT only
   - Parses the response as a JSON array of `GeneratedChunkContent` objects
   - Validates each chunk has all required fields
   - Returns `GeneratedChunkContent[]`

3. The system prompt MUST:
   - Tell the AI to generate exactly N lexical chunks
   - Specify that ALL distractors must be in the native language
   - Specify that ALL usage contexts must be in the native language
   - Tell the AI to respond with ONLY a JSON array, no markdown
   - Include the learner's interests if provided
   - Include existing chunks to avoid if provided

4. The parser MUST:
   - Handle both `[...]` and `{ "chunks": [...] }` response formats
   - Strip markdown code fences if present
   - Validate each chunk has: `targetPhrase`, `nativeTranslation`, `exampleSentence`, `distractors` (array of 3), `correctUsageContext`, `wrongUsageContexts` (array of 3)
   - Skip chunks that fail validation (warn, don't crash)
   - Throw if ALL chunks fail validation

5. Mark the existing `generateLesson()` method with `/** @deprecated Use generateChunksForTopic() instead */` but do NOT delete it.

## Acceptance Criteria
- [ ] New `generateChunksForTopic()` method exists on the class
- [ ] Method returns `GeneratedChunkContent[]`
- [ ] System prompt specifies distractors must be in native language
- [ ] Parser handles `[...]` and `{ "chunks": [...] }` formats
- [ ] Parser strips markdown fences
- [ ] Invalid chunks are skipped with console.warn
- [ ] All chunks fail → throws Error
- [ ] Existing `generateLesson()` is marked `@deprecated` but NOT deleted
- [ ] Existing `callGroq()` method is reused (not duplicated)
- [ ] TypeScript compiles with no errors

## Test
This requires a live Groq API key. If unavailable, test the parser separately:
```typescript
const mockResponse = JSON.stringify([
  {
    targetPhrase: "Hallo",
    nativeTranslation: "Hello",
    exampleSentence: "Hallo! Wie geht's?",
    usageNote: "Casual greeting",
    explanation: "Common greeting",
    distractors: ["Goodbye", "Thanks", "Sorry"],
    correctUsageContext: "Meeting a friend",
    wrongUsageContexts: ["Leaving", "Eating", "Sleeping"],
  }
]);
// Call the private parseChunkContentResponse manually or test via generateChunksForTopic
```

---

# SUBTASK 5: Rewrite `generateLesson()` in `src/services/lessonGeneratorV2.ts`

## Scope
Replace the body of the `generateLesson()` method to use the new pipeline: AI chunks → assembler → validator. Keep the method signature the same so callers don't need to change.

## Files to Modify
- `src/services/lessonGeneratorV2.ts`

## Files NOT to Touch
- `src/services/lessonPlanService.ts` (that's Subtask 6)
- `src/services/learnerProfileService.ts` (that's Subtask 6)
- Any component files

## New Imports to Add
```typescript
import { toLanguageCode, toLanguageName } from '../utils/languageUtils';
import { assembleLessonPlan, type AILessonContent, type GeneratedChunkContent } from './lessonAssembler';
import { validateLessonPlan } from './lessonValidator';
```

## Changes to `generateLesson()`

Replace the body of the existing `generateLesson(request: LessonRequest): Promise<LessonGenerationResult>` method with:

1. Extract `profile.targetLanguage` and `profile.nativeLanguage`
2. Convert both using `toLanguageCode()` and `toLanguageName()`
3. Clean the topic string: strip any `(German)` suffix with `.replace(/\s*\([^)]*\)\s*$/, '').trim()`
4. Try:
   a. Call `aiPedagogyClient.generateChunksForTopic()` with topic, language info, chunk count (2-4), age group, interests
   b. Build `AILessonContent` from the result
   c. Call `assembleLessonPlan(content, lessonId)`
   d. Call `validateLessonPlan(plan)` — if `valid === false`, throw with error details
   e. Return `{ lesson: plan, meta: { ... } }`
5. Catch:
   a. Log the error
   b. Call a new private method `getHardcodedStarterChunks(topic, targetCode, nativeCode)` that returns `GeneratedChunkContent[]`
   c. Build `AILessonContent` from hardcoded chunks
   d. Call `assembleLessonPlan()` on those — SAME assembler, SAME output format
   e. Validate, return with `usedFallback: true`

## Hardcoded Starter Chunks

Add a private method `getHardcodedStarterChunks()` with at least:
- German starters (for `targetCode === 'de'`, `nativeCode === 'en'`): Hallo, Guten Morgen, Tschüss
- English starters (for `targetCode === 'en'`, `nativeCode === 'fr'`): Hello, Good morning, Goodbye
- Generic fallback for unknown combinations

**CRITICAL:** ALL distractors in hardcoded chunks must be in the NATIVE language. ALL usage contexts must be in the NATIVE language. This is the bug that kept producing wrong-language content before.

## What to Remove
- The existing `generateFallbackLesson()` method — replace with `getHardcodedStarterChunks()` that goes through the assembler
- The existing `createTeachFirstSteps()` method — replaced by `lessonAssembler.ts`
- The existing `createTeachFirstStepsFromChunks()` method — same
- The existing `getTopicStarters()` method — replaced by `getHardcodedStarterChunks()`
- The existing `getDistractor()` method — no longer needed (distractors come from AI or hardcoded chunks)

**Do NOT remove** `generateSingleActivity()`, `convertToLessonPlan()`, `convertToActivityConfig()` — mark them `@deprecated`.

## Acceptance Criteria
- [ ] `generateLesson()` calls `aiPedagogyClient.generateChunksForTopic()` (not `generateLesson()`)
- [ ] Response goes through `assembleLessonPlan()` then `validateLessonPlan()`
- [ ] Fallback path uses `getHardcodedStarterChunks()` → same assembler → same validator
- [ ] German hardcoded chunks have English distractors (not German)
- [ ] English-for-French chunks have French distractors (not English)
- [ ] Language codes come from `toLanguageCode()` (imported from `languageUtils`)
- [ ] Topic string has any `(Language)` suffix stripped
- [ ] Method signature unchanged — `LessonRequest` in, `LessonGenerationResult` out
- [ ] Old methods marked `@deprecated` not deleted
- [ ] TypeScript compiles with no errors

## Test
```bash
# Run the app, create a new user with German target, click first lesson
# Console should show:
#   [LessonGenerator] AI chunk generation... (or fallback message)
#   [lessonAssembler] Assembled 15 steps for 3 chunks
#   [lessonValidator] Validation passed ✅
# The lesson should start with an INFO step showing a German phrase
```

---

# SUBTASK 6: Fix language code usage in existing services

## Scope
Replace all `.substring(0, 2)` language hacks and local language tables with imports from `languageUtils.ts`.

## Files to Modify
- `src/services/lessonPlanService.ts`
- `src/services/learnerProfileService.ts`

## Files NOT to Touch
Everything else.

## Changes to `src/services/learnerProfileService.ts`

1. Add import: `import { toLanguageCode } from '../utils/languageUtils';`
2. DELETE the local `toLanguageCode()` function (the one with the `codes` object)
3. DELETE the local `codes: Record<string, string>` object
4. All existing call sites already call `toLanguageCode()` — they will now use the imported version

## Changes to `src/services/lessonPlanService.ts`

1. Add import: `import { toLanguageCode } from '../utils/languageUtils';`
2. DELETE the entire `createDefaultProfile()` function
3. In the unauthenticated user path (the `else` branch after `if (userId)`), replace the `createDefaultProfile()` call with:
```typescript
const tempProfile = learnerProfileService.createDefaultProfile
  ? await learnerProfileService.createDefaultProfile('temp-user', {
      nativeLanguage: 'English',
      targetLanguage: targetLanguage || 'German',
    })
  : {
      // Minimal inline profile — uses languageUtils
      id: 'temp-user',
      userId: 'temp-user',
      nativeLanguage: toLanguageCode('English'),
      targetLanguage: toLanguageCode(targetLanguage || 'German'),
      currentLevel: 0,
      explicitInterests: [],
      detectedInterests: [],
      averageConfidence: 0.5,
      filterRiskScore: 0,
      // ... other required fields with sensible defaults
    } as LearnerProfile;
```

4. Verify: NO remaining `.substring(0, 2)` or `.slice(0, 2)` for language conversion in either file

## Acceptance Criteria
- [ ] `learnerProfileService.ts` imports `toLanguageCode` from `../utils/languageUtils`
- [ ] `learnerProfileService.ts` has NO local `toLanguageCode` function
- [ ] `learnerProfileService.ts` has NO local `codes` object
- [ ] `lessonPlanService.ts` imports `toLanguageCode` from `../utils/languageUtils`
- [ ] `lessonPlanService.ts` has NO `createDefaultProfile()` function
- [ ] `lessonPlanService.ts` has NO `.substring(0, 2)` anywhere
- [ ] TypeScript compiles with no errors
- [ ] Existing tests still pass

## Test
```bash
# Search for banned patterns:
grep -rn "substring(0, 2)" src/services/lessonPlanService.ts src/services/learnerProfileService.ts
# Expected: no results

grep -rn "toLanguageCode" src/services/learnerProfileService.ts
# Expected: import line from languageUtils, plus usage in initializeProfile()

grep -rn "createDefaultProfile" src/services/lessonPlanService.ts
# Expected: no results (function deleted)
```

---

# SUBTASK 7: End-to-End Test and Bug Fix Pass

## Scope
Run the full app, test the lesson flow, fix any integration issues.

## What to Do

1. Start the dev server (`npm run dev`)
2. Create a fresh account (or clear existing data)
3. Go through onboarding: select English native, German target, pick some interests
4. Enter the garden, click the starter tree, click the first lesson step
5. Verify the lesson:

**Check each of these and fix any failures:**

| Check | Expected | Fix if wrong |
|-------|----------|--------------|
| First step is INFO | Shows "📚 New phrase: Hallo" or similar | Assembler order is wrong |
| INFO shows phrase + translation | "Hallo = Hello" | Assembler content template |
| Second step is MC | "What does 'Hallo' mean?" | Assembler type assignment |
| MC has 4 options | 4 options visible | Assembler shuffle function |
| MC correct answer works | Tapping "Hello" → correct | correctIndex calculation |
| Third step is FILL_BLANK | "H___" or similar | Assembler blank logic |
| FB accepts correct answer | Typing the answer → correct | acceptedAnswers array |
| Fourth step is TRANSLATE | "How do you say 'Hello' in German?" | Assembler sourcePhrase |
| TR accepts correct answer | Typing "Hallo" → correct | acceptedAnswers array |
| Fifth step is MC (usage) | "When would you say 'Hallo'?" | Assembler type/question |
| All content in correct language | German phrases, English/French distractors | Language plumbing |
| No "cannot find activity" error | All steps render without error | Validator + field mapping |
| Lesson completes | Shows completion screen with stars | Step progression |
| Console has no errors | No red errors in dev tools | Various |

6. If using fallback (Groq API unavailable), verify the hardcoded chunks work the same way.

## Files to Modify
- Any file where you find a bug during testing — but keep changes minimal and surgical

## Acceptance Criteria
- [ ] Fresh user completes full onboarding → garden → path → lesson without errors
- [ ] Lesson starts with INFO step (teach before test)
- [ ] All 5 step types render correctly for at least one chunk
- [ ] No console errors during lesson
- [ ] Lesson completion screen shows correct SunDrops and stars
- [ ] Returning to garden works after lesson completion
- [ ] Console shows validation passing: no errors, maybe warnings

---

## Execution Checklist

Use this to track progress:

| Subtask | Description | Status |
|---------|-------------|--------|
| 0 | Update `.clinerules` with architecture rules | ⬜ |
| 1 | Create `languageUtils.ts` | ⬜ |
| 2 | Create `lessonAssembler.ts` | ⬜ |
| 3 | Create `lessonValidator.ts` | ⬜ |
| 4 | Add `generateChunksForTopic()` to `aiPedagogyClient.ts` | ⬜ |
| 5 | Rewrite `generateLesson()` in `lessonGeneratorV2.ts` | ⬜ |
| 6 | Fix language codes in `lessonPlanService` + `learnerProfileService` | ⬜ |
| 7 | End-to-end test and bug fix pass | ⬜ |
