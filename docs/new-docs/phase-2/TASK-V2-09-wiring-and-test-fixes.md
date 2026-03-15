# TASK-V2-09: Completion Wiring & Test Fixes

**Phase:** 2 — Lesson Engine & Progression (final cleanup)
**Status:** ✅ Complete
**Completed:** 2026-03-15
**Confidence:** 8/10
**Actual Time:** 1.5h (estimated: 2h)
**Dependencies:** V2-08 (all services already built)

---

## What Was Built

All four V2-08 deferred wiring items are now complete:

1. **`reviewSessionsCompleted` DB column** — `drizzle/0004_daily_review_column.sql` + schema updated. Reviews now tracked independently from new lessons in `dailyProgress`.
2. **`buildCapResult()` in `completionUtils.ts`** — pure function returns DailyCapCompletionResult (null if cap not hit). Tested in `completionWiring.test.ts`.
3. **Completion API fully wired** — returns `capResult` + `streakMilestone` in every response; increments the correct counter (lessons vs reviews).
4. **`CompletionScreen.svelte`** — `activeModal` derived state controls modal priority queue: streak → dailyCap → levelBump → firstLesson. DailyCapModal "Review" button calls `/api/lessons/review` and navigates.
5. **`TreePanel.svelte`** — "💧 Water my tree (Review)" button dispatches `waterTree` event with tree ID.
6. **Garden page** — `onWaterTree` handler calls `/api/lessons/review?treeId=X`, navigates to review lesson or shows toast if nothing overdue.

The pre-existing `$env/static/private` test failures were fixed in V2-09 via vitest alias + stub module.

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Modal priority | `$derived` chain (streak → cap → level → first) | Svelte 5 runes mode requires `$derived`, not `$:` |
| Review counter | Separate `reviewSessionsCompleted` column | Independent cap enforcement per design doc |
| Water button position | Outside lesson trail div, inside bottom sheet | Semantic separation — global action vs per-lesson |
| Toast auto-dismiss | 3000ms | Long enough to read, not annoying to children |

## Tests

- 899 tests written, 899 passing (40 test files)
- `completionWiring.test.ts`: 28 tests covering `buildCapResult` + `checkStreakMilestone` edge cases
- No regressions

## Notes for Future Tasks

- Phase 3 (audit) should verify the Svelte `on:` event syntax in TreePanel is consistent (uses legacy Svelte 4 dispatcher pattern while CompletionScreen uses Svelte 5 runes)
- `heartsLost` and `streakMax` in `saveResults()` still default to 0 — TODO for Phase 3 to plumb through `LessonResults`
- The stray duplicate comment in TreePanel (`<!-- Water my tree CTA -->` appears twice) is harmless but should be cleaned in Phase 3 audit

---

## Context

After V2-08, four items were explicitly deferred as needing wiring:

1. `DailyCapModal` — built but never shown (completion API doesn't return cap status)
2. `StreakMilestoneModal` — built but never shown (completion API doesn't call `checkStreakMilestone`)
3. Garden "Water tree" button — TreePanel has no button; review API exists but isn't called
4. Review session count — `dailyProgress` has no `reviewSessionsCompleted` column, so `getDailyCap()` can't enforce the review cap

Additionally, 2 test file suites fail due to `$env/static/private` not resolving in Vitest
(both `router.test.ts` and `gardenService.test.ts`):

```
Error: Failed to resolve import "$env/static/private" from "src/lib/server/ai/router.ts"
Error: Failed to resolve import "$env/static/private" from "src/lib/server/db/index.ts"
```

---

## What This Task Does

### Step 1 — Fix test failures
Add `$env/static/private` as a vitest alias pointing to a stub module. This lets ALL
server-side modules (db/index, ai/router, etc.) be imported in tests without a real .env file.

### Step 2 — DB: add `reviewSessionsCompleted` to `dailyProgress`
New column to track review sessions separately from new lessons, enabling `calculateCapStatus()`.

### Step 3 — `completionUtils.ts`: add `buildCapResult()` helper
Pure function: given lesson counts before the completion and whether it's a review, returns
cap status info (or null if no cap hit). Fully testable without DB.

### Step 4 — Completion API: wire cap + streak milestone
- Read `isReview` from body (default false)
- Increment `lessonsCompleted` (new) or `reviewSessionsCompleted` (review)
- After upsert, call `buildCapResult()` and `checkStreakMilestone(newStreak)`
- Return `hitDailyCap`, `reviewAvailable`, `capMessage`, `streakMilestone` in response

### Step 5 — `CompletionScreen.svelte`: wire the two modals
- `StreakMilestoneModal`: shown when `streakMilestone !== null`
- `DailyCapModal`: shown when `hitDailyCap === true`
- Modal priority: streak → dailyCap → levelBump → firstLesson
  (only one modal ever fires per completion in practice)

### Step 6 — `TreePanel.svelte`: add "Water my tree" button
- Button dispatches `waterTree` event with `tree.id`
- Shown always (even at full health — users may want to review anyway)
- Loading state while API call is in flight

### Step 7 — Garden page: handle `waterTree` event
- On event: `GET /api/lessons/review?treeId=X`
- If `overdueCount > 0`: navigate to lesson page with the returned LessonPlan
- If no overdue chunks: show a toast "Your tree is healthy — nothing to review!"
- If review cap hit: show message "You've done enough reviews today"

---

## Files Created / Modified

| File | Change |
|------|--------|
| `src/tests/setup/sveltekit-env.ts` | **NEW** — stub values for `$env/static/private` |
| `vitest.config.ts` | Add `$env/static/private` alias |
| `drizzle/0004_daily_review_column.sql` | **NEW** — add review_sessions_completed |
| `src/lib/server/db/schema.ts` | Add column to dailyProgress |
| `src/lib/server/lessons/completionUtils.ts` | Add `buildCapResult()` + `DailyCapCompletionResult` |
| `src/routes/api/lessons/[lessonId]/complete/+server.ts` | Wire cap status + streak milestone |
| `src/lib/components/lesson/CompletionScreen.svelte` | Wire `DailyCapModal` + `StreakMilestoneModal` |
| `src/lib/components/garden/TreePanel.svelte` | Add "Water my tree" button |
| `src/routes/(app)/garden/+page.svelte` | Handle `waterTree` event |
| `src/tests/lessons/completionWiring.test.ts` | **NEW** — tests for buildCapResult + milestone |

---

## Tests

| File | Tests | Focus |
|------|-------|-------|
| `completionWiring.test.ts` | 20+ | buildCapResult edge cases, streak milestone detection |
| `router.test.ts` | ~8 (existing, now passing) | AI provider routing |
| `gardenService.test.ts` | ~15 (existing, now passing) | buildLessonSteps |
| **Total new passing** | **855 → 875+** | |
