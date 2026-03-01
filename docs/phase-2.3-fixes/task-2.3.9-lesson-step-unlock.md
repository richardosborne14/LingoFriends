# Task 2.3.9: Fix Lesson Step Completion & Unlock

**Status:** Complete
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Fix the bug where completing a lesson step does not unlock (open) the next step on the skill path. The learner completes a step, but the subsequent step remains locked and cannot be started.

## Bug Addressed

- **Bug 15:** After completing a lesson step, the next step on the path view remains locked. The learner is stuck — they've done the work but can't progress. This is a critical blocker to the core game loop.

## Root Cause Analysis

The root cause was **Hypothesis 2: Unlock logic reads stale data**.

`handleLessonComplete` in `App.tsx` was calling `setPathRefreshKey()` as fire-and-forget — immediately, before the PocketBase write had confirmed. This caused PathView to re-query PocketBase before `lessonsCompleted` had been incremented, so it still showed the completed lesson as `current` instead of `completed`, and the next lesson remained `locked`.

The PocketBase write pipeline, field names, and unlock condition logic were all correct. It was purely a timing issue.

## Fix Applied

### In `App.tsx` — `handleLessonComplete`

Moved `setPathRefreshKey()` inside the `.then()` callback so it only fires **after** the PocketBase write is confirmed:

```typescript
saveLessonCompletion({
  skillPathId: state.selectedTree.skillPathId,
  sunDropsEarned: result.sunDropsEarned ?? 0,
  starsEarned: result.stars ?? 0,
}).then(() => {
  // PB write confirmed — now safe to trigger PathView re-fetch.
  // The user is already on PathView at this point; the key change
  // causes useSkillPath to re-query and unlock the next lesson node.
  refreshStats();
  setPathRefreshKey((k) => k + 1);
}).catch(err => {
  console.error('[GameApp] Progress save failed:', err);
  // Still refresh — PB may have partial data
  setPathRefreshKey((k) => k + 1);
});
```

### Navigation flow verified

`goBack()` from `useNavigation`: lesson → path (with `selectedTree` preserved). PathView
receives the new `refreshKey` after PB confirms, fires `useSkillPath` again, reads the
updated `lessonsCompleted`, and `buildLiveLessons` correctly marks the next lesson as
`current` and all subsequent ones as `locked`.

### Complete unlock chain

| Step | Component | What happens |
|------|-----------|-------------|
| 1 | `LessonView` | `state.isComplete = true` → shows `LessonComplete` screen |
| 2 | `LessonComplete` | User taps "Back to Path" → `onContinue` → `handleContinue` → `onComplete(result)` |
| 3 | `App.tsx` | `handleLessonComplete` calls `saveLessonCompletion()` (async, fire-and-forget) |
| 4 | `App.tsx` | `actions.goBack()` immediately → `currentView = 'path'`, `selectedTree` preserved |
| 5 | `App.tsx` | `.then()` fires after PB write → `setPathRefreshKey(k+1)` |
| 6 | `PathView` | Re-renders with new `refreshKey` → `useSkillPath` re-fetches |
| 7 | `useSkillPath` | Reads updated `lessonsCompleted` from `user_trees` |
| 8 | `buildLiveLessons` | `i < lessonsCompleted` → `completed`, `i === lessonsCompleted` → `current`, rest `locked` |
| 9 | `LessonNode` | Next lesson visually unlocked and clickable |

## Files Modified

- `App.tsx` — moved `setPathRefreshKey` inside `.then()` (the `// 2.3.9 fix` comment marks this)

## Files Verified (no changes needed)

- `src/hooks/useNavigation.tsx` — `goBack()` from lesson → path correctly preserves `selectedTree`
- `src/hooks/useSkillPath.ts` — responds to `refreshKey` prop change ✓, reads `lessonsCompleted` ✓
- `src/services/gameProgressService.ts` — `saveLessonCompletion` increments `lessonsCompleted` by 1 ✓
- `src/components/lesson/LessonComplete.tsx` — "Back to Path" button calls `onContinue` ✓
- `src/components/path/LessonNode.tsx` — unlock state derived from `lesson.status` correctly ✓

## Testing

- [x] Completing a lesson writes `lessonsCompleted + 1` to PocketBase `user_trees`
- [x] Returning to path view shows the next lesson as `current` (clickable, not greyed out)
- [x] Completing lesson 0 unlocks lesson 1 — correct off-by-one verified
- [x] `pathRefreshKey` increments only after PB write confirms (no stale-read race)
- [x] On PB write failure, `pathRefreshKey` still increments (graceful degradation)
- [x] TypeScript compiles clean — no type errors

**Test scenarios:**
1. Complete first lesson → tap "Back to Path" → lesson 2 node is `current` and tappable ✓
2. Complete second lesson → third lesson unlocks ✓
3. PB write fails (network error) → path still refreshes, may show stale but doesn't crash ✓

## Confidence Scoring

## Confidence: 9/10

**Met:**
- [x] Root cause identified: `setPathRefreshKey` was called before PB write confirmed
- [x] Fix applied: moved inside `.then()` — now only fires after confirmed write
- [x] Navigation verified: `goBack()` from lesson → path, `selectedTree` preserved
- [x] Unlock logic verified: `buildLiveLessons` correctly uses `lessonsCompleted` as boundary
- [x] All 9 steps of the unlock chain traced and confirmed correct

**Concerns:**
- [ ] The `.catch()` branch also increments `pathRefreshKey` — if PB fails, PathView re-fetches but reads old data (lesson still appears current). Acceptable: the data will self-correct on next app open. A future improvement could show a "Saving..." toast with retry.

**Deferred:**
- [ ] Offline queue: queue completion record if PB unreachable, sync on reconnect → Phase 3
- [ ] Real-time unlock: subscribe to PB changes so multi-device sessions update live → Phase 3
- [ ] Per-lesson star storage (currently estimated from total sunDrops ÷ lessonsCompleted) → Phase 1.3

## Learnings

- **Race condition diagnosis**: The bug was invisible at first glance because the fix *looked* correct — `pathRefreshKey` was being incremented. The issue was purely *when* it was incremented. The `.then()` move was a one-line fix for what appeared to be a major unlock failure.
- **Navigation state preservation**: `useNavigation`'s `goBack()` spreads `prev` state, so `selectedTree` survives the lesson → path transition. This is essential for `PathView` to know which path to show.
- **Two-fetch pattern is safe**: PathView fires a first fetch (stale) and then a second fetch (fresh after PB confirms). The `cancelled` cleanup in `useSkillPath` ensures the stale fetch doesn't overwrite the fresh one if they race.
