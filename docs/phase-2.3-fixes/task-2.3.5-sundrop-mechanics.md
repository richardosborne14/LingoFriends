# Task 2.3.5: SunDrop Mechanics Fixes

**Status:** Complete (both bugs already fixed prior to this task)
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Fix two SunDrop display/mechanic bugs: (1) INFO/introduce steps incorrectly show "+0 SunDrops" on completion, and (2) the -1 SunDrop penalty for wrong answers floors at 1 instead of 0.

## Bugs Addressed

- **Bug 5:** "+0 SunDrops" burst shown on INFO step completion
- **Bug 6:** -1 penalty floors at 1 SunDrop instead of 0

## Audit Result: Both Bugs Already Fixed

Both bugs were resolved during earlier 2.3 work (2.3.12 specifically addressed Bug 5 as a side effect of fixing INFO step sound logic).

### Bug 5 — INFO step +0 burst (Already Fixed)

**Location:** `src/components/lesson/LessonView.tsx` → `handleActivityComplete`

The guard is already in place:
```typescript
if (sunDropsEarned > 0) {
  playReward();
  setState(prev => ({ ...prev, showReward: true, rewardAmount: sunDropsEarned, ... }));
} else {
  // INFO step (0 SunDrops) — advance immediately, no animation, no sound
  setState(prev => ({ ...prev, currentStepIndex: nextIndex, isComplete }));
}
```

The `SunDropBurst` is only shown when `showReward: true`, which is only set when `sunDropsEarned > 0`. INFO steps (sunDrops: 0) advance silently.

### Bug 6 — Penalty floor at 1 instead of 0 (Already Fixed)

**Location:** `src/services/sunDropService.ts` → `calculateEarned()`

The unit tests confirm the correct floor:
```typescript
// 3 base - 5 wrong = floored to 0 (NOT 1)
expect(calculateEarned(3, false, false, 5)).toBe(0);
// ceil(2/2) = 1, then -1 wrong = 0 (NOT 1)
expect(calculateEarned(2, true, false, 1)).toBe(0);
```

The `Math.max(1, ...)` patterns found in the codebase are unrelated:
- `gameProgressService.ts`: `Math.max(1, Math.floor(sunDropsEarned / 10))` — minimum 1 gem per lesson (not SunDrop penalty)
- `aiPedagogyClient.ts`: `Math.max(1, Math.min(4, act.sunDrops))` — ensures activities have ≥1 base value (not penalty)

## Files Modified

None — both bugs confirmed fixed already.

## Confidence: 9/10

**Met:**
- [x] Bug 5: INFO step advances silently — no +0 burst (verified in LessonView.tsx)
- [x] Bug 6: Penalty floors at 0 — confirmed by unit tests in sunDropService.test.ts
- [x] No `Math.max(1, ...)` in penalty path (confirmed by codebase search)

**Concerns:**
- [ ] Bug 5 fix is in `LessonView.tsx` which means it only applies to lessons running through `LessonView`. If any other component renders activities directly, they'd need the same guard — low risk for MVP.

**Deferred:**
- [ ] "Streak bonus" — extra SunDrops for consecutive correct answers → Phase 3
- [ ] Daily SunDrop cap → Phase 1.1 tree health system (already designed)

## Learnings

Both bugs were fixed incidentally during 2.3.12 (sound effects task) when the INFO step completion path was explicitly documented and separated from the quiz step path. Pre-existing tests in `sunDropService.test.ts` already guarded against the floor-at-1 bug — the tests were written correctly, the implementation followed them.
