# TASK-V2-04 — Activity Variety Engine

**Phase:** 2 — Lesson Engine & Core UI  
**Status:** ✅ Complete  
**Completed:** 2026-03-14  
**Confidence:** 9/10  
**Actual Time:** ~1.5h

---

## What Was Built

Added three new activity types to the lesson engine: **TrueFalse**, **WordArrange**, and **MatchingPairs**. These are now wired into the lesson flow via an `activityAssembler` service that selects activity variety based on chunk index. Even chunks (0, 2, 4…) get `fill_blank` practice + `true_false` apply; odd chunks (1, 3, 5…) get `word_arrange` practice + `multiple_choice` apply. A single-chunk lesson still gets the full 5-step progression; multi-chunk lessons get the matching review at the end.

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/services/activityAssembler.ts` | Pure functions: `buildTrueFalseFromChunk`, `buildWordArrangeFromChunk`, `buildMatchingFromChunks`, `getActivityPattern`, `pickTrueFalseVariant`, `tokenise`, `selectWordArrangeDistractors` |
| `src/lib/components/activities/TrueFalseActivity.svelte` | True/False binary choice with animated feedback |
| `src/lib/components/activities/WordArrangeActivity.svelte` | Tap-to-place word tiles (NOT drag-and-drop — mobile first) |
| `src/lib/components/activities/MatchingPairsActivity.svelte` | Two-column tap-to-match with progress dots |
| `src/tests/services/activityAssembler.test.ts` | 44 unit tests covering all exported functions |

### Files Modified

| File | Change |
|------|--------|
| `src/lib/components/activities/ActivityRouter.svelte` | Added imports + routing for 3 new types |
| `src/lib/server/lessons/lessonAssembler.ts` | Updated import list + `assembleLessonPlan` loop to use `getActivityPattern` |

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Practice variety | Alternates by chunk index (even=fill_blank, odd=word_arrange) | Deterministic variety — same lesson content always produces same pattern, reproducible |
| WordArrange interaction | Tap-to-place, NOT drag-and-drop | Drag unreliable on iOS without library; tap is faster and accessible |
| WordArrange distractors | Prefer words from OTHER chunks in the same lesson | Cross-chunk distractors are more educational than arbitrary words |
| TrueFalse variants | 4 cycling variants (translation_correct, context_wrong, translation_wrong, context_correct) | Ensures variety across chunks; tests different knowledge dimensions |
| MatchingPairs error penalty | None (0 SunDrops deducted per wrong match) | Matching is cognitively harder than MC; punishing would demotivate (see PEDAGOGY.md) |
| Right column shuffle | Deterministic index rotation (not random) | Stable for testing; still produces visual misalignment |
| TrueFalse SunDrops | 1 (not 2) | Simpler binary task than MC usage context question |

---

## Tests

- **44 tests written, 44 passing** (620 total tests passing suite-wide)
- 2 pre-existing test file failures (`router.test.ts`, `gardenService.test.ts`) unrelated to this task — both caused by `$env/static/private` not resolving in Vitest (known SvelteKit limitation, logged in BUGS.md)

### Test coverage by function:
| Function | Tests |
|----------|-------|
| `buildTrueFalseFromChunk` | 8 (all 4 variants + edge cases) |
| `pickTrueFalseVariant` | 6 (cycle pattern + large indices) |
| `tokenise` | 7 (normal, edge cases, punctuation, empty) |
| `selectWordArrangeDistractors` | 5 (prefers extras, fallback, count) |
| `buildWordArrangeFromChunk` | 8 (type, sentence, words, distractors, sunDrops) |
| `buildMatchingFromChunks` | 6 (happy path, pairs integrity, error on < 2) |
| `getActivityPattern` | 4 (even, odd, alternating, no-undefined) |

---

## Confidence: 9/10

**Must-haves (met):**
- [x] All 3 new activity components built and wired into ActivityRouter
- [x] activityAssembler service is pure (no AI, no DB, no Svelte)
- [x] 44 tests written, 44 passing
- [x] lessonAssembler now injects variety based on chunk index
- [x] 50%+ comment ratio maintained
- [x] TypeScript types added for `WordArrangeActivity` and `TrueFalseActivity` (in lesson.ts from previous task)
- [x] No regressions in existing 620 tests

**Concerns:**
- [ ] MatchingPairs right-column shuffle is deterministic (not truly random) — the fixed rotation may look non-random on small pair sets. Acceptable for now; true random would break snapshot tests.

**Deferred (with rationale):**
- [ ] Drag-and-drop WordArrange variant → Phase 3 if web-only build goes ahead (Svelte DnD works better on desktop)
- [ ] Animated pair connection lines for MatchingPairs → purely cosmetic, Phase 4/5

---

## Notes for Future Tasks

1. **`activityAssembler.ts` is the single source of truth** for which activity types map to which lesson steps. Don't add activity logic directly into `lessonAssembler.ts`.
2. **`tokenise()` is exported** — use it anywhere word-level splitting is needed (e.g. future SpeechRecognition token comparison).
3. **MatchingPairs `rightOrder` is computed with `$derived`** in the Svelte component. This means it re-runs if `config.pairs` changes — which it won't at runtime, but is worth knowing.
4. **`buildWordArrangeFromChunk` always adds 1–2 distractors** (1 for ≤3-word phrases, 2 for longer). This is the right balance for short phrases — more than 2 distractors makes short phrases visually cluttered.
5. The `CoachingChatActivity` type is imported in lessonAssembler but not yet used in the new assembly path — `buildCoachingStep` still works as before.
