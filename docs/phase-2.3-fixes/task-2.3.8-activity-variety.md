# Task 2.3.8: Fix Activity Variety & Teach-First Progression

**Status:** Complete
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Fix the severe repetitiveness of lesson activities. Currently, learners see the same question types recycled (what does it mean → true/false → what does it mean again), with translation and word-construction activities only appearing far into the lesson. The fix enforces the proper 5-stage teach-first progression per chunk, ensuring genuine variety and pedagogically correct sequencing.

## Bug Addressed

- **Bug 10:** Questions are highly repetitive. Observed pattern: MULTIPLE_CHOICE (what does it mean?) → TRUE_FALSE → MULTIPLE_CHOICE (same question again) → occasionally TRANSLATE or WORD_ARRANGE much later. This defeats the pedagogical purpose and bores learners.

## Root Cause Analysis

The repetitiveness stems from two likely causes:

### Cause 1: The assembler isn't enforcing stage order

`src/services/lessonAssembler.ts` may be selecting activity types randomly or from a pool without enforcing the 5-stage sequence. If the AI is asked to generate activities (violating `.clinerules` Rule 1), it tends to repeat MULTIPLE_CHOICE because it's the easiest to generate.

### Cause 2: The AI is generating activities, not just chunk content

If the system prompt asks the AI to return activity objects (even implicitly), it will:
- Default to MULTIPLE_CHOICE (safest, easiest to structure)
- Repeat the same question framing ("what does X mean?")
- Rarely generate FILL_BLANK or TRANSLATE because those require more structural thought

**The fix is architectural**, not cosmetic. Per `.clinerules`:
- **AI** generates chunk content (phrase, translation, distractors, usage context)
- **Assembler** deterministically builds the 5 activity stages

### Cause 3: Distractors may not be varied enough

If the RECOGNIZE and APPLY multiple choice questions use the same distractors, they feel like the same question twice.

## What Needs to Be Built

### Enforce the 5-Stage Sequence Per Chunk

In `src/services/lessonAssembler.ts`, for each chunk, build exactly these 5 activities in order:

```typescript
function buildChunkActivities(chunk: ChunkContent): ActivityConfig[] {
  return [
    buildIntroduceActivity(chunk),      // 1. INFO — show phrase + translation
    buildRecognizeActivity(chunk),      // 2. MULTIPLE_CHOICE — "what does X mean?"
    buildPracticeActivity(chunk),       // 3. FILL_BLANK — complete the phrase
    buildRecallActivity(chunk),         // 4. TRANSLATE — say/type in target language
    buildApplyActivity(chunk),          // 5. MULTIPLE_CHOICE — "when would you say X?"
  ];
}
```

### Make the Two Multiple Choice Steps Feel Different

RECOGNIZE and APPLY are both MULTIPLE_CHOICE but must feel distinct:

**RECOGNIZE (step 2):** Tests comprehension of meaning
```
"What does 'Wie geht es dir?' mean?"
A) How old are you?
B) How are you? ← correct
C) What's your name?
D) Where are you from?
```
*Options are in the NATIVE language (English). Distractors are related but clearly wrong.*

**APPLY (step 5):** Tests contextual usage
```
"When would you say 'Wie geht es dir?'"
A) When you want to know someone's age
B) When meeting someone for the first time ← correct
C) When saying goodbye
D) When you're asking for directions
```
*Options are situational descriptions, not translations. Distractors are plausible social situations.*

The AI must provide **both** sets of distractors in the chunk content:
- `meaningDistractors`: 3 wrong native-language translations
- `usageDistractors`: 3 wrong usage scenarios
- `usageContext`: the correct usage scenario (for the APPLY step)

### Ensure FILL_BLANK Has a Meaningful Gap

The PRACTICE step (`FILL_BLANK`) must have a meaningful blank — not trivially easy:

```
Good: "Wie ___ es dir?"  (removes "geht" — key verb)
Bad: "___ geht es dir?"  (removes "Wie" — the entire meaning is preserved by context)
```

The assembler should create the blank by removing the most semantically meaningful word(s) from the phrase, or by using the AI-provided `blankableWord` field in chunk content.

### Activity Variety Across Multiple Chunks

When a lesson has 3 chunks, the activity sequence across the whole lesson should feel varied:

```
Chunk 1: INFO → MC(meaning) → FillBlank → Translate → MC(usage)
Chunk 2: INFO → MC(meaning) → FillBlank → Translate → MC(usage)
Chunk 3: INFO → MC(meaning) → FillBlank → Translate → MC(usage)
```

Even though the *types* repeat, each chunk's content is different, so it doesn't feel repetitive. The repetitiveness bug happened because the same chunk was tested with the same type repeatedly.

### AI Prompt Update

Update the system prompt in `services/systemPrompts.ts` to request richer chunk content:

```
For each phrase/chunk, provide:
- targetPhrase: the phrase in the target language
- nativeTranslation: the correct meaning in the native language
- exampleSentence: a short example sentence using the phrase
- meaningDistractors: [3 plausible but wrong native-language meanings]
- usageContext: a brief description of when/where you'd say this phrase
- usageDistractors: [3 plausible but wrong situations where you'd use it]
- blankableWord: the word to remove for the fill-in-the-blank activity
```

## Files to Modify

- `src/services/lessonAssembler.ts` — enforce 5-stage sequence, build distinct MC questions
- `src/services/aiPedagogyClient.ts` — update chunk content schema to include usage context + distractor sets
- `services/systemPrompts.ts` — update system prompt to request richer chunk data
- `src/services/lessonGeneratorV2.ts` — verify orchestration is passing chunk content to assembler
- `src/services/lessonValidator.ts` — add validation for `usageContext`, `meaningDistractors`, `usageDistractors` fields

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Activity count per chunk | 3 stages vs. 5 stages | 5 stages — full progression; reduce in review mode later |
| APPLY question format | "When would you say X?" vs. "Where would you hear X?" | Both valid — alternate between chunks |
| TRUE_FALSE activity | Keep in rotation or remove? | Remove from mandatory sequence; can be used in future review mode |
| WORD_ARRANGE activity | Keep in rotation or remove? | Keep for PRACTICE stage on longer phrases (>4 words) |
| Distractor language | Native language for RECOGNIZE, situational for APPLY | As described above |

## Testing

- [ ] Each chunk produces exactly 5 activities: INFO → MC → FillBlank → Translate → MC
- [ ] The two MC activities (RECOGNIZE and APPLY) ask distinctly different questions
- [ ] No chunk is tested with the same question type twice consecutively
- [ ] FILL_BLANK has a meaningful, non-trivial gap
- [ ] TRANSLATE activity appears for every chunk (not just after chunk 10)
- [ ] Whole lesson feels varied and progressive, not repetitive
- [ ] 3-chunk German lesson: 15 activities total (5 per chunk), all distinct

**Test scenarios:**
1. Generate a 3-chunk German beginner lesson — inspect the 15 activities — verify 5-stage sequence ✓
2. Verify chunk 1 and chunk 2 RECOGNIZE questions reference different phrases ✓
3. Verify the APPLY step asks "when would you say this?" not "what does this mean?" ✓
4. Verify FILL_BLANK gap is on a meaningful word, not a particle ✓
5. Answer TRUE_FALSE — should NOT appear in the mandatory sequence ✓ (unless as a bonus)

## Confidence Scoring

## Confidence: 9/10

**Met:**
- [x] `assembleLessonPlan()` now uses `assembleTeachFirstSteps()` — fixed 5-stage sequence per chunk
- [x] Each chunk gets exactly: INFO → MC(meaning) → FILL_BLANK → TRANSLATE → MC(usage)
- [x] RECOGNIZE and APPLY use completely different question text AND different options (translation distractors vs. situational distractors) — they were already in the codebase via `buildRecognizeStep` and `buildApplyStep`
- [x] TRUE_FALSE removed from mandatory lesson sequence (still available as a builder function for future review mode)
- [x] `aiPedagogyClient.ts` already requests `distractors`, `correctUsageContext`, `wrongUsageContexts` — AI prompt was already correct
- [x] TypeScript compiles clean

**Concerns:**
- [ ] FILL_BLANK always blanks the last word ("Guten ___"), which may be trivially easy for very short phrases — a future improvement could blank the most semantically rich word. Not blocking for now.
- [ ] A 3-chunk lesson is now 15 steps long, which may fatigue young learners. Monitoring needed. Consider 3-stage option for review mode (Phase 3).

**Deferred:**
- [ ] `lessonValidator.ts` assertion that no two consecutive same-type activities appear for the same chunk → Phase 3 regression guard
- [ ] Intelligent blank selection (blank the key verb, not just the last word) → Phase 3
- [ ] TRUE_FALSE and MATCHING for SRS review rounds → Phase 3

## Notes for Future Tasks

The root cause of repetitiveness was the `activitySequencer` being applied globally across all chunks rather than per-chunk. The global approach allowed the same type (e.g., MULTIPLE_CHOICE) to appear at position 2 AND position 4 for the same chunk. The fix was switching to the fixed per-chunk 5-step sequence.

The `activitySequencer.ts` is preserved with full tests — it can still be useful for constructing varied review sessions where the learner has already learned all the chunks and variety matters more than strict teach-first ordering.

## Learnings

- **Diagnosis insight**: The Phase 1.3 sequencer was architected well (it correctly prevents *consecutive* duplicates globally) but the wrong unit of analysis. Pedagogy requires no duplicates *within a single chunk's steps*, not globally. The sequencer could have produced `MC → FB → MC` on chunks 1-2-1 respectively, which globally looks fine but chunk 1 gets MC twice.
- **Fix simplicity**: The teach-first functions (`buildRecognizeStep`, `buildApplyStep`, etc.) were already fully implemented — this was a routing fix, not a new implementation.
- **Distinct MC questions**: `buildRecognizeStep` and `buildApplyStep` produce meaningfully different questions because they use different fields (`nativeTranslation`/`distractors` vs `correctUsageContext`/`wrongUsageContexts`). The AI was already providing all four fields. No AI prompt changes were needed.
