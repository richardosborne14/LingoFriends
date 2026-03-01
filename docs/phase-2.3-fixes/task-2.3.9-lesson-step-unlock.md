# Task 2.3.9: Fix Lesson Step Completion & Unlock

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Fix the bug where completing a lesson step does not unlock (open) the next step on the skill path. The learner completes a step, but the subsequent step remains locked and cannot be started.

## Bug Addressed

- **Bug 15:** After completing a lesson step, the next step on the path view remains locked. The learner is stuck — they've done the work but can't progress. This is a critical blocker to the core game loop.

## Root Cause Analysis

The likely causes (to investigate during implementation):

### Hypothesis 1: Completion state not written to PocketBase

When a lesson step is completed in `LessonView`, a completion record should be written to PocketBase (e.g., a `lesson_history` record or an update to the `skill_path_progress` collection). If this write is failing silently, the next step unlock check will find no completion record and keep the step locked.

**Check:** Does `lessonHistoryService.recordCompletion()` get called on lesson step complete? Does it succeed? Check PocketBase logs for failed writes.

### Hypothesis 2: Unlock logic reads stale data

The `PathView` component may read the learner's progress from a cached/stale local state. When the learner returns from a completed lesson, the unlock check might be running before the PocketBase write has confirmed.

**Check:** Is the skill path progress refreshed from PocketBase after a lesson step completes? Or is it relying on local state that wasn't updated?

### Hypothesis 3: Unlock condition uses wrong field

The unlock condition for step N+1 may check for a field that isn't being set. For example, it might check `step.completedAt` but the service is setting `step.completed = true` — a field name mismatch.

**Check:** Compare the field names in the unlock condition vs. what `lessonHistoryService` actually writes.

### Hypothesis 4: Off-by-one in step indexing

The step that gets unlocked might be looking for the wrong step ID. For example, if steps are indexed 0-based and the unlock logic uses 1-based indexing, step 1's completion would try to unlock step 2 instead of step 2 (1-indexed) = step 1 (0-indexed) = wrong step.

## What Needs to Be Built

### Diagnosis First

Before fixing, add temporary debug logging to trace the completion flow:

```typescript
// In LessonView.tsx — when lesson step completes:
console.log('[LessonStep] Step complete. Writing to PB...', { stepId, chunkIds, totalSunDrops });

// In lessonHistoryService.ts:
console.log('[LessonHistory] Record written:', record);

// In PathView.tsx — when computing unlocks:
console.log('[PathView] Checking unlock for step', nextStepId, 'completion record:', completionRecord);
```

### Fix: Ensure Completion is Written

In `src/services/lessonHistoryService.ts`, verify `recordStepCompletion()`:
- Writes to the correct PocketBase collection (`lesson_history` or `skill_path_steps`)
- Includes the correct step ID
- Awaited properly (not fire-and-forget)
- Returns an error if the write fails (not silently swallowed)

```typescript
/**
 * Records that the learner has completed a lesson step.
 * This is what unlocks the next step on the path.
 * MUST be awaited — do not fire-and-forget.
 */
export async function recordStepCompletion(
  stepId: string,
  learnerProfileId: string,
  sunDropsEarned: number
): Promise<void> {
  try {
    await pb.collection('lesson_history').create({
      step_id: stepId,
      learner_profile: learnerProfileId,
      sun_drops_earned: sunDropsEarned,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    // This MUST NOT be silent — throw so the caller can handle it
    console.error('[LessonHistory] Failed to record completion:', error);
    throw error;
  }
}
```

### Fix: Refresh Path After Completion

In `LessonView.tsx` or wherever the user is redirected after completing a step, ensure the path view reloads progress from PocketBase:

```typescript
// After lesson step complete and history written:
await recordStepCompletion(stepId, profileId, sunDropsEarned);
await refreshSkillPath(); // re-fetch from PB to get updated unlock state
navigate('/path'); // then navigate to path
```

### Fix: Verify Unlock Condition

In `PathView.tsx` or `useSkillPath.ts`, verify the unlock check uses the correct field and the correct collection:

```typescript
// Unlock step N+1 if step N has a completion record
const isStepUnlocked = (stepIndex: number): boolean => {
  if (stepIndex === 0) return true; // first step always unlocked
  const previousStep = steps[stepIndex - 1];
  // Check the completion records loaded from PocketBase
  return completionRecords.some(record => record.step_id === previousStep.id);
};
```

### Fix: Handle the Case Where LessonComplete Shows No "Next" Button

In `src/components/lesson/LessonComplete.tsx`, verify there is a clearly visible "Continue to next step" or "Back to path" button after completing a lesson. If this button is missing, learners can't proceed regardless of unlock state.

## Files to Investigate / Modify

- `src/components/lesson/LessonView.tsx` — ensure completion is written before navigation
- `src/components/lesson/LessonComplete.tsx` — verify "next step" CTA exists
- `src/services/lessonHistoryService.ts` — verify write + error handling
- `src/hooks/useSkillPath.ts` — verify unlock condition logic
- `src/components/path/PathView.tsx` — verify path refreshes after returning from lesson
- `src/components/path/LessonNode.tsx` — verify locked/unlocked visual state reads from correct source

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Completion write timing | On last activity vs. on LessonComplete screen | On last activity — don't make learner press "Finish" to unlock |
| Path refresh approach | Re-fetch on mount vs. real-time subscription | Re-fetch on mount with a loading state — simple and reliable |
| Unlock failure UX | Block navigation vs. allow navigation with retry | Allow navigation, show a toast "Saving progress..." and retry in background |

## Testing

- [ ] Completing a lesson step writes a completion record to PocketBase
- [ ] Returning to the path view shows the next step as unlocked
- [ ] The unlocked step is visually distinct (not greyed out)
- [ ] The unlocked step can be tapped/clicked to start
- [ ] If the write fails, a friendly retry is attempted
- [ ] Completing step 1 unlocks step 2 (not step 3 or the wrong step)

**Test scenarios:**
1. Complete first lesson step — navigate to path — second step is unlocked ✓
2. Complete second lesson step — third step unlocks ✓
3. Kill the app mid-completion — reopen — progress is still saved (PB was written before crash) ✓
4. Complete a step offline — try to reconnect — completion syncs when back online ✓

## Confidence Scoring

### Requirements to Meet
- [ ] Completion record written to PocketBase on step complete
- [ ] Path view refreshes after lesson
- [ ] Unlock condition uses correct fields
- [ ] Next step visually unlocked and clickable

### Concerns
- [ ] If the lesson completion write is async and the user navigates back before it completes, the path may show the step still locked. Use a loading state on the LessonComplete screen to prevent this.
- [ ] The `lesson_history` collection was flagged as missing in Phase 2.1 audit (Task 2.2.1). Verify it was created and is correctly schemed before debugging this.

### Deferred
- [ ] Offline queue for completion records → Phase 3
- [ ] Real-time path updates (if multiple devices) → Phase 3

## Notes for Future Tasks

Before debugging, check the PocketBase admin panel to confirm the `lesson_history` collection exists and has the right fields. The Phase 2.2.1 task addressed its creation — verify the migration ran.

## Learnings

TBD after implementation.
