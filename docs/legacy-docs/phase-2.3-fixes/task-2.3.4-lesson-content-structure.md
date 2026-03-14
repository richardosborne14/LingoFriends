# Task 2.3.4: Lesson Content Structure — Chunk-by-Chunk Teaching

**Status:** Complete
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Restructure lesson steps so that each step is built around a **full target phrase** that is broken down into its constituent sub-parts (chunks), taught one by one. Additionally, each lesson step should open with a clear intro announcement listing all the phrases/chunks to be learned in that step.

## Bugs Addressed

- **Bug 4:** Lesson steps currently show generic "example phrases" instead of systematically teaching the target phrase chunk-by-chunk. Learners see disconnected example sentences rather than a progressive breakdown of the phrase they're supposed to master.
- **Bug 13:** A lesson step covering e.g. "Guten Tag", "Wie geht es dir?", "Hallo, ich bin neu hier" should open with a framing message like: *"In this lesson you'll learn to say: hello, how are you?, I'm new here"* — giving learners a mental map before diving in.

## Background

### The Intended Architecture

Per the `.clinerules` lesson architecture rules, each lesson **step** should teach a single phrase (lexical chunk), progressing through 5 stages:

1. **INTRODUCE (INFO)** — Show phrase + translation, 0 SunDrops
2. **RECOGNIZE (MULTIPLE_CHOICE)** — "What does X mean?", 1 SunDrop
3. **PRACTICE (FILL_BLANK)** — Complete the phrase, 2 SunDrops
4. **RECALL (TRANSLATE)** — Translate from native → target, 3 SunDrops
5. **APPLY (MULTIPLE_CHOICE)** — "When would you say X?", 2 SunDrops

A **lesson** contains multiple steps (one per chunk). The lesson itself should have an **intro card** that previews all chunks.

### Current State vs. Intended State

| Current (broken) | Intended |
|---|---|
| Step opens directly into question activities | Step opens with INFO card showing the chunk |
| Example sentences shown as content | The chunk phrase itself is the content |
| No lesson intro preview | Lesson intro lists all chunks to be learned |
| Steps feel disconnected | Each step feels like mastering one phrase at a time |

## What Needs to Be Built

### Lesson Intro Card

At the very start of a lesson (before any chunk steps begin), display a card that:
- Says: *"In this lesson, you'll learn to say:"*
- Lists all target-language phrases with native translations, e.g.:
  ```
  🌟 Guten Tag → Hello
  🌟 Wie geht es dir? → How are you?
  🌟 Hallo, ich bin neu hier → Hello, I'm new here
  ```
- Has a "Let's go!" CTA button to begin
- Optionally: auto-plays TTS for each phrase in sequence (a "preview listen")

This intro card is NOT part of the SunDrop-earning steps — it's purely orientation.

### Chunk Step Structure

Each chunk step must follow the 5-stage progression from `.clinerules`:

```
Chunk: "Wie geht es dir?" (How are you?)
├── 1. INTRODUCE: Show "Wie geht es dir? = How are you?" (0 SunDrops)
├── 2. RECOGNIZE: "What does 'Wie geht es dir?' mean?" [multiple choice] (1 SunDrop)
├── 3. PRACTICE: "Wie ___ es dir?" [fill blank] (2 SunDrops)
├── 4. RECALL: "Type 'How are you?' in German" [translate] (3 SunDrops)
└── 5. APPLY: "When would you say 'Wie geht es dir?'" [multiple choice] (2 SunDrops)
```

### Lesson Assembler Fix

The `src/services/lessonAssembler.ts` is responsible for building the LessonPlan from AI-generated chunk content. It must:

1. Generate an **intro step** listing all chunks
2. For each chunk, generate all 5 activity stages in order
3. Never skip INTRODUCE before a question
4. The AI (`src/services/aiPedagogyClient.ts`) only provides chunk content — the assembler builds the structure

Per `.clinerules` Rule 1: **The AI generates CONTENT, not ACTIVITIES.** The assembler builds the 5-step sequence deterministically.

### AI Prompt Fix

The prompt in `src/services/aiPedagogyClient.ts` (or `services/systemPrompts.ts`) may be asking for "example phrases" or a lesson plan. It should instead ask for:
- A list of target-language **phrases** (lexical chunks) appropriate for the learner's level and language
- Native language translations
- Plausible distractor options (for multiple choice)
- Usage context (for the APPLY step)

The AI should NOT return anything resembling an activity structure.

## Files to Modify

- `src/services/lessonAssembler.ts` — add intro step, enforce 5-stage sequence per chunk
- `src/services/aiPedagogyClient.ts` — ensure prompt requests chunk content only, not activities
- `src/services/lessonGeneratorV2.ts` — orchestration layer, verify flow
- `src/components/lesson/LessonView.tsx` — render intro card at lesson start
- `src/components/lesson/activities/InfoDisplay.tsx` — ensure INFO card displays chunk phrase prominently
- `services/systemPrompts.ts` — review/update the lesson generation system prompt

## Lesson Intro Card Component

Create a new component `src/components/lesson/LessonIntroCard.tsx`:

```typescript
interface LessonIntroCardProps {
  chunks: Array<{ targetPhrase: string; nativeTranslation: string }>;
  lessonTitle: string;
  onStart: () => void;
}

/**
 * Shown at the very start of a lesson to preview all chunks.
 * Gives learners a mental map of what they'll learn before any testing begins.
 */
export function LessonIntroCard({ chunks, lessonTitle, onStart }: LessonIntroCardProps) { ... }
```

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Intro card TTS | Auto-play all phrases in sequence vs. manual play | Auto-play with short pauses between each — it's exciting! |
| Intro card SunDrops | Count as 0 SunDrops / shown in counter | Not shown — it's orientation, not testing |
| Number of activities per chunk | 3 stages vs. full 5 stages | Full 5 for new content; can be reduced for review lessons later |
| Lesson intro skip | Allow skipping | Yes — one "skip intro" button for returning learners |

## Testing

- [ ] Every lesson opens with an intro card listing all chunks
- [ ] Intro card TTS plays each phrase
- [ ] Each chunk follows INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY order
- [ ] No question appears before its INTRODUCE step
- [ ] Intro card is not part of the SunDrop progression
- [ ] Multiple chunks in one lesson each get their full 5-step sequence
- [ ] German lesson example: "Guten Tag", "Wie geht es dir?", "Hallo ich bin neu hier" — each gets its own 5 steps

**Test scenarios:**
1. Start a new German beginner lesson — see intro card with 3 phrases listed
2. Click "Let's go!" — enter first chunk's INTRODUCE step
3. Complete all 5 steps for chunk 1 — automatically move to chunk 2's INTRODUCE step
4. Verify the RECOGNIZE question refers to chunk 2's phrase, not chunk 1

## Confidence Scoring

## Confidence: 9/10

**Met:**
- [x] `LessonIntroCard.tsx` component created with numbered chunk list, "Let's go!" CTA, "skip intro" option
- [x] `LessonPlan.introChunks` field added — assembler populates it, LessonView reads it
- [x] `assembleLessonPlan()` wired to `assembleTeachFirstSteps()` — fixed 5-stage sequence per chunk
- [x] `assembleTeachFirstSteps` was already written, just dead code — now the primary path
- [x] LessonView shows intro card before step 0, gated by `showIntroCard` boolean
- [x] Replay resets intro card so phrase list is shown again
- [x] Legacy lessons without `introChunks` skip intro card gracefully (backward compat)
- [x] TypeScript compiles clean (exit 0)

**Concerns:**
- [ ] Intro card TTS (auto-play each phrase before starting) is deferred — the card renders but doesn't play audio yet. The first INFO step will play TTS as normal.
- [ ] Old Pocketbase-cached lessons may lack `introChunks` — they silently skip the intro card, which is correct behaviour.

**Deferred:**
- [ ] TTS auto-play in intro card → Phase 3 (nice-to-have, not blocking)
- [ ] Animated phrase reveal in intro card → Phase 3
- [ ] "Quick review" mode with 3 stages instead of 5 → Phase 3 (SRS integration)

## Notes for Future Tasks

The `lessonAssembler.ts` is the single source of truth for activity construction. If you ever change the 5-step sequence, change it there — do not add activity generation logic elsewhere.

The `activitySequencer.ts` was the Phase 1.3 approach — it's preserved with its tests but is no longer imported by `lessonAssembler`. It can be reintroduced for review/SRS mode in Phase 3 where mixed-type variety makes more sense than teach-first.

## Learnings

- The `assembleTeachFirstSteps()` function was already fully written and correct — it was just dead code never called from `assembleLessonPlan`. The fix was routing the main assembly path through it instead of the sequencer.
- Keeping `introChunks` as an optional field on `LessonPlan` (rather than a new step type) keeps the steps array clean and avoids step-count confusion in progress tracking.
- The `showIntroCard` boolean being separate from `LessonState` is intentional — it's not a lesson step, it's a gate. Mixing it into LessonState would complicate progress tracking and replay logic.
