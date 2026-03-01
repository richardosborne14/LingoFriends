# Task 2.3.5: SunDrop Mechanics Fixes

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Fix two SunDrop display/mechanic bugs: (1) INFO/introduce steps incorrectly show "+0 SunDrops" on completion — they should silently advance without any reward UI, and (2) the -1 SunDrop penalty for wrong answers incorrectly floors at 1 SunDrop instead of allowing a reduction to 0.

## Bugs Addressed

- **Bug 5:** When completing an INFO (INTRODUCE) step, the UI shows a "+0 SunDrops" burst/notification. This is visually confusing and undermines the reward feeling. INFO steps should complete silently with no SunDrop UI.
- **Bug 6:** When a learner answers a question wrong, they lose 1 SunDrop from that question's reward value. However, a question worth 1 SunDrop stays at 1 instead of dropping to 0. The -1 mechanic should be able to reduce the question reward all the way to 0 SunDrops.

## Root Cause Analysis

### Bug 5 — Showing +0 on INFO steps

The `SunDropBurst` component (or the code that triggers it) is being called unconditionally when any activity is completed, including INFO steps which have `sunDrops: 0`. 

The fix is simple: conditionally render the SunDropBurst only when `earnedSunDrops > 0`.

```typescript
// Current (broken):
onActivityComplete(activity, earnedSunDrops); // always fires burst

// Fixed:
if (earnedSunDrops > 0) {
  showSunDropBurst(earnedSunDrops);
}
advanceToNextActivity(); // always advance
```

### Bug 6 — -1 Penalty floors at 1 instead of 0

The penalty logic for wrong answers is capping the minimum at 1 SunDrop instead of 0. This is likely a `Math.max(1, sunDrops - 1)` call that should be `Math.max(0, sunDrops - 1)`.

```typescript
// Current (broken):
const penalisedSunDrops = Math.max(1, activity.sunDrops - wrongAnswerCount);

// Fixed:
const penalisedSunDrops = Math.max(0, activity.sunDrops - wrongAnswerCount);
```

This means a question worth 1 SunDrop where the learner answers wrong → 0 SunDrops earned. The learner completes the activity but earns nothing. This is intentional game design — repeated mistakes on easy questions should yield no reward.

## What Needs to Be Built

### Fix 1 — Suppress +0 SunDrop UI

In `src/components/lesson/LessonView.tsx` or wherever `SunDropBurst` is triggered:

```typescript
// Only show the reward burst if the learner actually earned something
const handleActivityComplete = (earnedSunDrops: number) => {
  if (earnedSunDrops > 0) {
    triggerSunDropBurst(earnedSunDrops); // show the celebratory +N burst
  }
  // Always advance regardless
  advanceToNextActivity();
};
```

Also check `src/components/lesson/SunDropBurst.tsx` — if it renders when `amount === 0`, add a guard:

```typescript
if (amount === 0) return null; // render nothing for 0 SunDrops
```

### Fix 2 — Correct the penalty floor

In `src/hooks/useSunDrops.ts` or wherever the penalty calculation lives:

```typescript
// Fix: floor at 0, not 1
export function applyPenalty(baseSunDrops: number, wrongAnswerCount: number): number {
  // Each wrong answer costs 1 SunDrop. Minimum earned is 0 — you can't go negative.
  return Math.max(0, baseSunDrops - wrongAnswerCount);
}
```

Also check `src/components/lesson/PenaltyBurst.tsx` — ensure it handles the case where SunDrops reach 0 gracefully (don't show a "you lost 1 SunDrop, now at -1" UI — just show "0 earned" or nothing).

## Files to Modify

- `src/components/lesson/LessonView.tsx` — guard SunDropBurst call
- `src/components/lesson/SunDropBurst.tsx` — add `if (amount === 0) return null`
- `src/hooks/useSunDrops.ts` — fix `Math.max(1, ...)` → `Math.max(0, ...)`
- `src/components/lesson/PenaltyBurst.tsx` — ensure 0-SunDrop state is handled gracefully
- `src/components/lesson/activities/ActivityWrapper.tsx` — check if it handles completion events

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| INFO step completion | Silent advance vs. small non-reward animation | Silent advance — no burst at all |
| 0 SunDrop questions | Show a "×" or "0" indicator vs. nothing | Nothing — negative reinforcement is enough from the wrong answer feedback |
| Multiple wrong answers | Can penalty go below 0? | No — `Math.max(0, ...)` is the floor |

## Testing

- [ ] Completing an INFO (INTRODUCE) step shows NO SunDrop burst
- [ ] Completing an INFO step still advances to the next activity
- [ ] A 1-SunDrop question answered wrong → 0 SunDrops earned (not 1)
- [ ] A 2-SunDrop question answered wrong twice → 0 SunDrops earned (not 1)
- [ ] A 3-SunDrop question answered wrong once → 2 SunDrops earned (correctly reduced)
- [ ] SunDrop total in the header updates correctly in all cases
- [ ] `PenaltyBurst` renders correctly when reducing to 0 (no negative display)

**Test scenarios:**
1. Complete INTRODUCE step — no burst, silent advance ✓
2. Answer RECOGNIZE question correctly first try — +1 burst shown ✓
3. Answer RECOGNIZE question wrong, then correct — +0 burst NOT shown, 0 added to total ✓
4. Answer PRACTICE question wrong once, then correct — +1 shown (2-1=1) ✓
5. Answer PRACTICE question wrong twice, then correct — +0 NOT shown ✓

## Confidence Scoring

### Requirements to Meet
- [ ] INFO steps complete silently (no +0 burst)
- [ ] Penalty floor corrected to 0
- [ ] SunDrop total updates correctly
- [ ] No negative SunDrop display possible

### Concerns
- [ ] There may be multiple places where the `Math.max(1, ...)` pattern exists — search all lesson files to be sure
- [ ] The PenaltyBurst animation may not have a "0 earned" state — verify it degrades gracefully

### Deferred
- [ ] "Streak bonus" — extra SunDrops for consecutive correct answers → Phase 3
- [ ] Daily SunDrop cap → Phase 1.1 tree health system (already designed)

## Notes for Future Tasks

The `applyPenalty()` function should be a single pure utility function in `useSunDrops.ts` or a constants file — not duplicated across components. If it's currently inline in multiple places, centralise it now.

## Learnings

TBD after implementation.
