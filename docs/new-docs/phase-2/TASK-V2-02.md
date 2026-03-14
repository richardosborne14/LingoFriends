# TASK-V2-02 — Lesson Flow Polish

**Phase:** 2 — Lesson Engine  
**Status:** ✅ Complete  
**Completed:** 2026-03-14  
**Confidence:** 9/10  
**Actual Time:** ~3h (estimated: 2.5h)

---

## What Was Built

A polished lesson flow that unifies the loading spinner and lesson preview into a single `LessonLoading` component. Display-logic was extracted into a testable utility module (`lessonUtils.ts`) to keep components clean and verifiable. The loading screen now cycles through meaningful stage messages while waiting for AI generation, then transitions seamlessly to the "What you'll learn" preview with active phrases.

---

## Key Files

| File | Description |
|------|-------------|
| `src/lib/utils/lessonUtils.ts` | Extracted `LOADING_STAGES`, `extractPreviewPhrases()`, `nextLoadingStage()` |
| `src/lib/components/lesson/LessonLoading.svelte` | Updated to import from lessonUtils (no more duplicated constants) |
| `src/tests/utils/lessonUtils.test.ts` | 16 tests covering all lessonUtils exports |

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Unified loading + preview | Single `LessonLoading` component handles both states | Prevents jarring two-screen transition |
| Extract to utils | `lessonUtils.ts` holds display constants | Keeps components testable without Svelte environment |
| Stage clamping | `nextLoadingStage()` clamps (doesn't wrap) | "Almost ready…" persists if generation takes longer — looping back would feel wrong |
| Max preview phrases | 4 | Cognitive load research: 3-5 items is sweet spot for pre-lesson overview |

---

## Tests

- **16 tests** written in `src/tests/utils/lessonUtils.test.ts`
- All 16 passing ✅
- Covers: empty plan, INFO-only plans, mixed plans, deduplication, cap at 4, stage advancement, clamping behaviour

---

## Notes for Future Tasks

- `extractPreviewPhrases()` can be reused anywhere a phrase preview list is needed (e.g., lesson history screen)
- `LOADING_STAGES` and `LOADING_STAGE_INTERVAL_MS` are now centralised — change them once to affect all consumers
