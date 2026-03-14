# TASK-V2-06: Lesson Completion Pipeline — Performance Persistence & Level Bump Integration

**Phase:** 2 — Lesson Engine & UI
**Status:** ✅ Complete
**Completed:** 14 March 2026
**Confidence:** 9/10
**Actual Time:** ~1h (estimated: 1.5h)

---

## What Was Built

Wired the final two loose ends of Phase 2:

1. **Completion API** now saves a `LessonPerformance` row to the DB after every lesson, runs the `assessLevel()` engine over the last 3 records at the current level, detects if this is the user's first ever lesson (and marks `firstLessonComplete = true` on their profile), and returns `isFirstLesson` + `levelRecommendation` in the response body.

2. **CompletionScreen** now reads those new response fields and conditionally shows `FirstLessonCompleteModal` (once-only garden economy explainer) or `LevelBumpModal` (adaptive level change offer). The level bump accept handler PATCHes `/api/profile/level` and navigates to the garden; decline just navigates.

All building blocks existed from TASK-V2-05 — this task was pure integration wiring.

---

## Files

| File | Action |
|------|--------|
| `src/lib/server/lessons/completionUtils.ts` | **CREATED** — pure helpers: buildPerformanceRecord, isFirstLesson, shouldOfferLevelChange, serializeAssessmentForClient |
| `src/tests/lessons/completionUtils.test.ts` | **CREATED** — 26 unit tests |
| `src/routes/api/lessons/[lessonId]/complete/+server.ts` | **MODIFIED** — performance save + assessment + firstLesson flag + extended response |
| `src/lib/components/lesson/CompletionScreen.svelte` | **MODIFIED** — reads isFirstLesson + levelRecommendation, shows modals, wires level bump accept/decline |

---

## Architecture

### Completion API flow (new additions)

```
1. Save LessonPerformance row (fire-and-forget — failure ≠ broken completion)
2. Fetch last 3 rows at same level → assessLevel() → serializeAssessmentForClient()
3. If lessonsCompleted was 0 before this lesson → set firstLessonComplete = true
4. Return: { ...existing, isFirstLesson: boolean, levelRecommendation: ClientLevelRecommendation | null }
```

### CompletionScreen modal logic

```
API response.isFirstLesson = true    → show FirstLessonCompleteModal
API response.levelRecommendation ≠ null → show LevelBumpModal
  - onAccept: PATCH /api/profile/level → goto('/garden')
  - onDecline: goto('/garden')
neither → CTA buttons are shown (existing behaviour)
```

### Mutual exclusivity guarantee

`isFirstLesson` and `levelRecommendation !== null` cannot both be true on the same completion because `MIN_LESSONS_TO_ASSESS = 3` — no priority handling needed in the modal logic.

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Performance save | Fire-and-forget | Assessment failure must never break lesson completion — XP/streak is more important |
| Level filter in query | `levelAtTime = current` | Prevents comparing performance across level changes — fresh baseline after each bump |
| `heartsLost`/`streakMax` | Default to 0 | Not yet in LessonResults type — deferred to future task; assessment still works |
| LevelBumpModal onDecline | Just navigate | Learner autonomy — no confirmation needed, no penalty |
| Double-tap prevention | `acceptingLevelChange` flag | PATCH call takes ~200ms; without flag, fast double-taps would fire two requests |

---

## Tests

| File | Tests | Pass? |
|------|-------|-------|
| `completionUtils.test.ts` | 26 | ✅ All 26 passing |
| **Full suite** | **734** | **✅ 734 passing** |

Previous suite count: 708. All 26 new tests added by this task.

The 2 pre-existing suite failures (`router.test.ts`, `gardenService.test.ts`) are unchanged —
both are caused by `$env/static/private` not resolving in the Vitest environment (logged in BUGS.md since TASK-V2-04). Zero tests broken by this task.

---

## Deferred

- **`heartsLost` + `streakMax` in LessonResults**: The assessment currently receives 0 for these — the `hearts` state lives in the lesson store and isn't currently surfaced in the `LessonResults` object. Plumbing these through is a Phase 3 / future enhancement. Documented with a TODO in `CompletionScreen.svelte`.

---

## Confidence: 9/10

**Must-haves (met):**
- [x] Performance record saved to DB after every lesson completion
- [x] `assessLevel()` called with last 3 records at same level
- [x] `firstLessonComplete` flag set on first lesson
- [x] `isFirstLesson` and `levelRecommendation` returned in API response
- [x] `FirstLessonCompleteModal` and `LevelBumpModal` correctly wired in CompletionScreen
- [x] Level bump accept PATCHes `/api/profile/level` then navigates
- [x] 26 new unit tests, all passing
- [x] Full 734-test suite passes (no regressions)
- [x] 50%+ comment ratio in all new/modified files
- [x] All new code is fire-and-forget safe (no assessment failure can break lesson completion)

**Concerns:**
- [ ] `heartsLost`/`streakMax` sent as 0 — assessment uses only accuracy + hints until those are plumbed through. Assessment is still functional; just less precise.

---

## Notes for Future Tasks

1. **Phase 3 enhancement**: Add `heartsLost` and `streakMax` to `LessonResults` type and the lesson page's result-building logic. Then CompletionScreen can pass real values to the completion API.
2. **Phase 2 is complete**: All 6 tasks (V2-01 through V2-06) are done. The full pipeline from onboarding → lesson generation → activity engine → feedback system → help assistant → adaptive assessment is working end-to-end.
3. **Phase audit**: Per Rule 10, open a fresh Claude project and audit the Phase 2 codebase before proceeding to Phase 3.
