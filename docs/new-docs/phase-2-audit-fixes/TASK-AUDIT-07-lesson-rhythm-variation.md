# TASK-AUDIT-07: Lesson Rhythm Variation

**Status:** 🔲 Not started
**Priority:** 🟡 Medium-High — prevents pattern fatigue and boredom
**Estimated Time:** 6–8 hours
**Dependencies:** TASK-AUDIT-02 (Speak It adds a new activity type to vary with)
**Audit Finding:** #4 — "Lessons Are Structurally Monotonous"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — "Activity variety (Affective Filter + Natural Order): Mix activity types to prevent boredom"
3. `04-PEDAGOGY-SUMMARY.md` — the 5-step progression and activity types
4. `src/lib/server/lessons/lessonAssembler.ts` — current assembly logic (the code to modify)
5. `TASK-V2-04-activity-variety.md` — "Listen & Type" spec (described but not built)

---

## Problem

Every lesson follows this identical pattern for each chunk:

```
COACHING → INFO → RECOGNIZE(MC) → PRACTICE(fill_blank|word_arrange) → RECALL(translate) → APPLY(MC|true_false) → repeat
```

The assembler alternates between `fill_blank` and `word_arrange` for practice, and between `multiple_choice` and `true_false` for apply. This is a nice touch but the overall *rhythm* is always the same: learn → easy quiz → medium quiz → hard quiz → context quiz.

After 5 lessons a child has done this sequence 15 times. The pattern becomes predictable. Predictability is the enemy of engagement — the affective filter rises not from difficulty but from boredom.

**Additionally, two specced activity types were never built:**
- "Listen & Type" (hear audio, type what you heard — listening comprehension)
- Any open-ended communicative activity (describe a picture, role-play a scenario)

---

## Goals

1. Build the "Listen & Type" activity (specced in TASK-V2-04, never implemented)
2. Create a step variation system that assembles different progressions per chunk
3. Occasional "surprise" bonus activities that break the pattern
4. Per-chunk step order varies across lessons (not always the same sequence)
5. Maintain the teach-first rule: INFO always comes before any quiz

---

## Step-by-Step Implementation

### Step 1 — Listen & Type Activity

**Create `src/lib/components/activities/ListenTypeActivity.svelte`:**

Audio plays a phrase. Child types what they heard in the target language.

```
┌──────────────────────────────────────────┐
│                                          │
│     🔊 Listen carefully!                 │
│                                          │
│     ┌──────────────────────────────┐     │
│     │  ▶ [plays audio automatically]│    │
│     └──────────────────────────────┘     │
│                                          │
│     Type what you hear:                  │
│     ┌────────────────────────────┐       │
│     │                            │       │
│     └────────────────────────────┘       │
│                                          │
│     [🔊 Replay]        [Check ✓]        │
│                                          │
│  ──── after checking ────                │
│                                          │
│     You typed: "Vi get es dir"           │
│     Correct:   "Wie geht es dir?"       │  ← Green for matching words, red for different
│                                          │
│     Almost! Watch out for "Wie" — it     │
│     starts with a "W" 😊                │
│                                          │
└──────────────────────────────────────────┘
```

**Implementation:**
- Audio auto-plays on mount via audioMap (pre-generated TTS)
- Max 3 replays (replay button shows count: "🔊 Replay (2 left)")
- Fuzzy matching: case-insensitive, accent-forgiving, Levenshtein ≤ 1 per word
- Show word-by-word comparison: green for correct words, red for incorrect
- SunDrops: 2 for exact match, 1 for close match (≥70% words correct), 0 for poor match
- Never cruel: "Almost!" not "Wrong!" — show the correct answer highlighted

**Add to `src/lib/types/lesson.ts`:**

```typescript
LISTEN_TYPE = 'listen_type',

export interface ListenTypeActivity {
  type: ActivityType.LISTEN_TYPE;
  /** The phrase being played (for comparison) */
  targetPhrase: string;
  /** Native translation (shown after checking) */
  nativeTranslation: string;
  /** Pre-generated audio key */
  audioKey?: string;
  /** Accepted alternate spellings */
  acceptedVariants?: string[];
}
```

### Step 2 — Step Variation Patterns

**Create `src/lib/server/lessons/stepPatterns.ts`:**

Instead of one fixed sequence, define multiple valid patterns that all respect teach-first:

```typescript
/**
 * Step progression patterns for a single chunk.
 *
 * INVARIANTS (never violate):
 * 1. INFO (INTRODUCE) is ALWAYS first — teach before test
 * 2. Every pattern must include at least one production step
 * 3. Total SunDrops per chunk should be approximately 8 (±2)
 *
 * VARIATIONS:
 * The pattern is selected pseudo-randomly per chunk, using the
 * lesson seed for determinism (same lesson always generates same pattern).
 */
export type StepPattern = {
  name: string;
  steps: StepType[];
  description: string;
};

// Step types map to activity types
type StepType = 'info' | 'recognize' | 'practice' | 'recall' | 'apply' | 'speak' | 'listen' | 'coaching';

export const STEP_PATTERNS: StepPattern[] = [
  {
    name: 'classic',
    steps: ['coaching', 'info', 'recognize', 'practice', 'recall', 'apply'],
    description: 'The original 5-step progression',
  },
  {
    name: 'listen_first',
    steps: ['coaching', 'info', 'listen', 'recognize', 'practice', 'apply'],
    description: 'Listening comprehension before recognition — trains the ear',
  },
  {
    name: 'speak_early',
    steps: ['coaching', 'info', 'speak', 'recognize', 'recall', 'apply'],
    description: 'Pronunciation practice right after intro — builds muscle memory',
  },
  {
    name: 'deep_recall',
    steps: ['coaching', 'info', 'recognize', 'recall', 'practice', 'speak'],
    description: 'Translation before fill-blank — tests raw recall, ends with speaking',
  },
  {
    name: 'compact',
    steps: ['info', 'recognize', 'recall', 'apply'],
    description: 'Shorter progression for review chunks or 7-10 age group',
  },
  {
    name: 'challenge',
    steps: ['coaching', 'info', 'listen', 'practice', 'recall', 'speak', 'apply'],
    description: 'Longer, harder progression for advanced learners or 15-18 age group',
  },
];

/**
 * Select a pattern for a given chunk.
 *
 * Factors:
 * - ageGroup: 7-10 prefers 'compact' and 'classic', 15-18 can get 'challenge'
 * - chunkIndex: different chunks in the same lesson get different patterns
 * - lessonSeed: deterministic pseudo-random (same lesson = same patterns)
 * - isReviewChunk: review chunks (from SRS) get 'compact'
 */
export function selectPattern(
  ageGroup: string,
  chunkIndex: number,
  lessonSeed: string,
  isReviewChunk: boolean,
): StepPattern { ... }
```

### Step 3 — Modify Lesson Assembler

**Modify `src/lib/server/lessons/lessonAssembler.ts`:**

Replace the fixed sequence with pattern-based assembly:

```typescript
export function assembleLessonPlan(
  content: ChunkFamilyContent,
  lessonId: string,
  ageGroup: string = '11-14',
): LessonPlan {
  const steps: LessonStep[] = [];

  for (let i = 0; i < content.chunks.length; i++) {
    const chunk = content.chunks[i];
    const pattern = selectPattern(ageGroup, i, lessonId, false);

    for (const stepType of pattern.steps) {
      const step = buildStepByType(stepType, chunk, content, i);
      if (step) steps.push(step);
    }
  }

  // Final matching step (unchanged — always at the end)
  if (content.chunks.length >= 2) {
    steps.push(buildMatchingStep(content.chunks));
  }

  // Occasional surprise bonus (10% chance, seeded random)
  if (shouldAddSurprise(lessonId)) {
    const surprise = buildSurpriseStep(content);
    // Insert surprise at ~70% through the lesson
    const insertAt = Math.floor(steps.length * 0.7);
    steps.splice(insertAt, 0, surprise);
  }

  return { ... };
}
```

### Step 4 — Surprise Bonus Activities

**Add to `lessonAssembler.ts`:**

Occasional surprise steps that break the pattern:

```typescript
/**
 * Build a surprise bonus activity.
 *
 * These appear randomly (~10% of lessons) and break the
 * predictable rhythm. They're always fun, never penalised,
 * and award bonus SunDrops.
 *
 * Types:
 * 1. "Speed Round" — 3 rapid-fire MC questions, 2s timer each, bonus SunDrops
 * 2. "Mix & Match" — matching pairs with a twist (match phrase to context, not translation)
 * 3. "Echo Challenge" — hear a phrase, speak it back (Speak It variant with countdown)
 */
function buildSurpriseStep(content: ChunkFamilyContent): LessonStep {
  const surpriseType = pickRandom(['speed_round', 'context_match', 'echo_challenge']);
  // ... build accordingly
}
```

**Surprise step rules:**
- Always rewards, never penalises (it's a bonus!)
- Tutor text: "✨ Surprise challenge!" or "🎉 Bonus round!"
- Worth 2-5 bonus SunDrops
- Feels playful, not like extra homework

### Step 5 — Wire Listen & Type into ActivityRouter

**Modify `src/lib/components/activities/ActivityRouter.svelte`:**

```svelte
{:else if step.activity.type === ActivityType.LISTEN_TYPE}
  <ListenTypeActivity
    config={step.activity}
    {targetLanguage}
    {onComplete}
    onShowHelp={showHelp}
  />
```

### Step 6 — Validate New Patterns

**Modify `src/lib/server/lessons/lessonValidator.ts`:**

Update validation to handle variable step counts and new activity types:

```typescript
// Instead of checking for exactly 5 steps per chunk:
// Verify that every chunk has an INFO step before any quiz step
// Verify minimum 3 steps per chunk (info + at least 2 quiz)
// Allow SPEAK_IT and LISTEN_TYPE as valid quiz types
```

---

## 🤔 Decision Points for User

> **1. How many step patterns to start with?**
> - **(A) All 6 patterns** — maximum variety from day one
> - **(B) 3 patterns (classic, listen_first, speak_early)** — simpler to test, expand later
> **Recommendation:** Option B for MVP. Add more patterns based on learner feedback.

> **2. Surprise frequency — how often?**
> - **(A) Every lesson** — always a surprise!
> - **(B) 10% of lessons** — keeps them surprising
> - **(C) After every 5th lesson** — predictable but still occasional
> **Recommendation:** Option B. True surprises need to be rare.

> **3. Listen & Type — how forgiving for spelling?**
> - **(A) Very forgiving** — Levenshtein ≤ 2 per word, ignore all accents
> - **(B) Moderately forgiving** — Levenshtein ≤ 1, accept missing accents
> - **(C) Strict** — exact match required (teaches spelling precision)
> **Recommendation:** Option B. Same as the Translate activity's fuzzy matching.

---

## Tests

```typescript
describe('ListenTypeActivity', () => {
  it('auto-plays audio on mount', () => {});
  it('allows up to 3 replays', () => {});
  it('fuzzy matches typed answer', () => {});
  it('shows word-by-word comparison (green/red)', () => {});
  it('awards 2 SunDrops for exact match', () => {});
  it('awards 1 SunDrop for close match', () => {});
  it('never penalises (no negative SunDrops)', () => {});
});

describe('stepPatterns', () => {
  it('all patterns start with info or coaching+info', () => {});
  it('no pattern has quiz before info', () => {});
  it('selectPattern varies by chunkIndex', () => {});
  it('selectPattern is deterministic with same seed', () => {});
  it('age 7-10 gets compact pattern more often', () => {});
});

describe('lessonAssembler with patterns', () => {
  it('uses different patterns for different chunks', () => {});
  it('surprise step inserted approximately 10% of time', () => {});
  it('assembled lesson passes validation', () => {});
  it('total SunDrops still reasonable per lesson', () => {});
});
```

---

## 🖥️ Browser Verification

1. Generate 3 different lessons → verify step sequences are not identical
2. Find a Listen & Type step → audio plays → type answer → word comparison shown
3. Find a Speak It step at a different position than usual → confirms pattern variety
4. Generate ~10 lessons → at least 1 should have a surprise bonus step
5. Verify young kid (7-10) → shorter lessons (compact pattern more frequent)
6. Verify all generated lessons pass the validator (no broken teach-before-test)

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/lib/components/activities/ListenTypeActivity.svelte`
- `src/lib/server/lessons/stepPatterns.ts`

**Modified files:**
- `src/lib/types/lesson.ts` — add `LISTEN_TYPE` to ActivityType, add `ListenTypeActivity` interface
- `src/lib/server/lessons/lessonAssembler.ts` — pattern-based assembly, surprise steps
- `src/lib/server/lessons/lessonValidator.ts` — handle variable step counts and new types
- `src/lib/components/activities/ActivityRouter.svelte` — add LISTEN_TYPE routing
- `src/lib/i18n/en.json` + `fr.json` — listen & type strings, surprise step strings

---

## Acceptance Criteria

- [ ] Listen & Type activity works (audio → type → compare → SunDrops)
- [ ] Fuzzy matching: case-insensitive, accent-forgiving, Levenshtein ≤ 1
- [ ] Word-by-word visual comparison (green/red) shown after check
- [ ] Replay button works (max 3 replays)
- [ ] Step patterns vary across chunks in same lesson
- [ ] Different lessons produce different step sequences (seeded)
- [ ] All patterns respect teach-first (INFO before quiz)
- [ ] Surprise steps appear occasionally (~10%)
- [ ] Surprise steps never penalise
- [ ] Age-adaptive pattern selection (compact for 7-10)
- [ ] All generated lessons pass validation
- [ ] All text translated (en/fr)
- [ ] Tests: 14+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
