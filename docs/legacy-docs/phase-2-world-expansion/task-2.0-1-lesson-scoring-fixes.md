# Task 2.0.1: Lesson Scoring Fixes

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 1  
**Dependencies:** None  
**Estimated Time:** 3–4 hours  
**Priority:** Critical — core gameplay is broken

---

## Problem Statement

Three scoring-related bugs break the core lesson loop:

### Bug 1: Skip Button Does Nothing
The skip button in activity components (visible on FillBlank, TrueFalse, Translate, etc.) calls `onComplete(false, 0)`. However, `LessonView.handleActivityComplete` only triggers the reward modal and step advancement when `correct === true`. When `correct === false`, it triggers the penalty animation — which means skip shows a "-1 sundrop" penalty instead of advancing.

**Root cause:** `handleActivityComplete` conflates "wrong answer" with "skip" — both pass `correct: false`.

**Expected behaviour:** Skip should:
- Deduct 1 sundrop from the lesson total (if total > 0)
- Advance to the next step immediately (no penalty animation)
- Show a brief "Skipped" indicator (not the full penalty burst)
- If sundrops are already at 0, still allow skipping (floor at 0)

### Bug 2: Wrong Answer Penalty Not Tracked Correctly
When a wrong answer is given:
1. First wrong: Shows "-1 sundrop" animation ✅ but does NOT deduct from `state.sunDropsEarned` ❌
2. Second wrong: Shows "-1 sundrop" again ✅ but the counter hasn't changed ❌
3. When eventually correct: Awards full sunDrops instead of reduced amount ❌

**Root cause:** `handleActivityComplete` and `handleWrongAnswer` never modify `state.sunDropsEarned`. The penalty is purely visual. The individual activity components DO calculate reduced rewards via `calculateEarned()`, but the deduction per wrong attempt isn't reflected in the lesson-level counter.

**Expected behaviour:**
- Each wrong answer deducts 1 from the QUESTION's available sundrops (not the lesson total)
- The question's sundrop indicator updates to show the reduced value
- When eventually correct, the user earns the reduced amount
- Floor at 0 — answering wrong more times than the question's value just gives 0
- The lesson total only goes UP (from correct answers), never down from wrong answers

### Bug 3: +0 Sundrop Modal on INFO Steps
When clicking "Next" on an INFO/learning step (e.g., "Learn Something New! Guten Tag"), the `SunDropBurst` fires with `amount: 0`, showing "+0 ☀️" — which is confusing and redundant.

**Root cause:** INFO steps call `onComplete(true, 0)` which triggers `handleActivityComplete` with `sunDropsEarned: 0`, which sets `showReward: true` and `rewardAmount: 0`.

**Expected behaviour:** INFO steps should advance silently. No reward modal, no penalty modal, just smooth transition to the next step.

---

## Objectives

1. Separate "skip" from "wrong answer" in the LessonView callback interface
2. Fix wrong-answer penalty to properly reduce the per-question reward
3. Suppress reward modal when `rewardAmount === 0`
4. Ensure sundrops can never go below 0 at any level

---

## Architecture

```
Current (Broken):
  Activity → onComplete(false, 0)     → handleActivityComplete → penalty burst → NO advance
  Activity → onComplete(true, drops)  → handleActivityComplete → reward burst → advance
  Activity → onWrong()                → handleWrongAnswer → penalty burst → NO advance

Fixed:
  Activity → onSkip()                 → handleSkip → deduct if possible → advance (no modal)
  Activity → onComplete(true, drops)  → handleActivityComplete → reward burst if drops>0 → advance
  Activity → onComplete(true, 0)      → handleActivityComplete → silent advance (INFO steps)
  Activity → onWrong()                → handleWrongAnswer → penalty burst → NO advance
```

---

## Step-by-Step Implementation

### Step 1 — Add `onSkip` Callback to Activity Interface

**Files:** `src/components/lesson/activities/*.tsx`, `ActivityRouter.tsx`

Add a new `onSkip` prop to all activity components:

```typescript
interface ActivityProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
  onSkip: () => void;  // NEW
}
```

Replace all `handleSkip` implementations in activity components:

```typescript
// BEFORE (broken — triggers penalty)
const handleSkip = useCallback(() => {
  onComplete(false, 0);
}, [onComplete]);

// AFTER (uses dedicated skip callback)
const handleSkip = useCallback(() => {
  onSkip();
}, [onSkip]);
```

Update `ActivityRouter.tsx` to pass `onSkip` through.

### Step 2 — Add `handleSkip` to LessonView

**File:** `src/components/lesson/LessonView.tsx`

```typescript
/**
 * Handle skip button press.
 * Deducts 1 sundrop if possible, then advances silently.
 */
const handleSkip = useCallback(() => {
  setState(prev => ({
    ...prev,
    sunDropsEarned: Math.max(0, prev.sunDropsEarned - 1),
    currentStepIndex: prev.currentStepIndex + 1,
    isComplete: prev.currentStepIndex + 1 >= lesson.steps.length,
  }));
}, [lesson.steps.length]);
```

### Step 3 — Fix Reward Modal Suppression for INFO Steps

**File:** `src/components/lesson/LessonView.tsx`

```typescript
const handleActivityComplete = useCallback((correct: boolean, sunDropsEarned: number) => {
  if (correct) {
    if (sunDropsEarned > 0) {
      // Quiz step with points — show reward
      setState(prev => ({
        ...prev,
        sunDropsEarned: prev.sunDropsEarned + sunDropsEarned,
        showReward: true,
        rewardAmount: sunDropsEarned,
      }));
    } else {
      // INFO step or zero-point step — advance silently
      setState(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        isComplete: prev.currentStepIndex + 1 >= lesson.steps.length,
      }));
    }
  }
  // Note: incorrect answers are handled by onWrong, not here
}, [lesson.steps.length]);
```

### Step 4 — Verify Per-Question Reward Reduction

**Files:** All activity components in `src/components/lesson/activities/`

The individual activity components already use `calculateEarned(data.sunDrops, attempts > 0, usedHelp, 0)` from `sunDropService`. Verify that:

1. The `attempts` counter increments on each wrong answer
2. The displayed sundrop value in the activity header updates when `reduced` is true
3. `calculateEarned` correctly halves the reward after any wrong attempt
4. The final `onComplete(true, earned)` call passes the reduced amount

This should already work correctly in the activity components. The bug was in LessonView not reflecting the penalty, not in the per-question calculation.

### Step 5 — Edge Case: Skip at 0 Sundrops

Ensure the skip button is always available regardless of sundrop count. When sundrops are at 0:
- Skip still works (advances to next step)
- No deduction (already at floor)
- Consider showing "Skip (free)" instead of "Skip (-1 ☀️)" when at 0

---

## Testing Checklist

### Skip Button
- [ ] Skip advances to next question
- [ ] Skip deducts 1 sundrop from lesson total
- [ ] Skip at 0 sundrops still advances (no negative)
- [ ] Skip does NOT show penalty burst animation
- [ ] Skip shows brief "Skipped" indicator or nothing

### Wrong Answer Penalties
- [ ] First wrong answer: activity header shows reduced sundrop value
- [ ] Second wrong answer: activity header still shows reduced value (not double-reduced)
- [ ] Correct after wrong: lesson total increases by the REDUCED amount
- [ ] Multiple wrongs don't deduct from lesson total (only reduce question reward)

### INFO Steps
- [ ] Clicking "Next" on INFO step advances silently
- [ ] No "+0 ☀️" modal appears
- [ ] No penalty modal appears
- [ ] Progress bar updates correctly

### General
- [ ] Lesson total never goes below 0
- [ ] Star rating at end reflects actual earned sundrops
- [ ] LessonComplete screen shows correct earned/max ratio

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lesson/LessonView.tsx` | Add handleSkip, fix handleActivityComplete |
| `src/components/lesson/activities/ActivityRouter.tsx` | Pass onSkip prop |
| `src/components/lesson/activities/MultipleChoice.tsx` | Wire onSkip |
| `src/components/lesson/activities/FillBlank.tsx` | Wire onSkip |
| `src/components/lesson/activities/TrueFalse.tsx` | Wire onSkip |
| `src/components/lesson/activities/Translate.tsx` | Wire onSkip |
| `src/components/lesson/activities/WordArrange.tsx` | Wire onSkip |
| `src/components/lesson/activities/MatchingPairs.tsx` | Wire onSkip |

---

## Notes for Implementation

- The `SunDropBurst` component already handles `visible` prop — just don't set `showReward: true` when amount is 0
- Consider a brief skip animation (e.g., the activity card sliding left and fading) rather than just an instant jump
- The `calculateEarned` function in `sunDropService.ts` already handles retry reduction — verify it's being called correctly
- Don't change the `PenaltyBurst` behaviour for wrong answers — that's working as intended (visual feedback only)
