# Task E: Wire Lesson Generator V2

**Status:** 🔲 NOT STARTED  
**Roadmap Group:** 2 — Wire the Pedagogy Brain  
**Estimated Time:** 3-4h  
**Dependencies:** Task B (done), Tasks 1.2.1–1.2.8 (done)

---

## Objective

Replace the static `lessonPlanService` (v1) with the Phase 1.2 pedagogy engine. After this task, every lesson a kid starts will be dynamically generated using their learner profile, real chunk selection, and i+1 difficulty calibration — not a hardcoded mock list.

---

## Current State (Before This Task)

The pedagogy engine exists and is fully tested in isolation. It is **never called** from the running game.

| What Exists | Location | Called? |
|------------|----------|---------|
| `lessonGeneratorV2.generateLesson()` | `src/services/lessonGeneratorV2.ts` | ❌ Not wired |
| `pedagogyEngine.prepareSession()` | `src/services/pedagogyEngine.ts` | ❌ Not wired |
| `learnerProfileService.getOrCreate()` | `src/services/learnerProfileService.ts` | ❌ Not wired |
| `lessonPlanService` (v1 static) | `src/services/lessonPlanService.ts` | ✅ Currently called |
| `useLesson.loadLesson()` | `src/hooks/useLesson.ts` | ✅ Called but uses v1 |

---

## What Needs To Change

### Step 1 — `useLesson.ts`: Load learner profile before generating

Currently `loadLesson()` calls `lessonPlanService.getLessonPlan()` which returns
a static activity list. Replace with:

```typescript
// In useLesson.ts loadLesson():

// 1. Get learner profile (creates one if none exists)
const profile = await learnerProfileService.getOrCreate(userId, { targetLanguage, nativeLanguage });

// 2. Prepare pedagogy session (selects chunks, calibrates difficulty)
const sessionPlan = await pedagogyEngine.prepareSession({
  userId,
  treeId,           // which tree / skill path
  targetLanguage,
  profile,
});

// 3. Generate activities from the session plan
const lesson = await lessonGeneratorV2.generateLesson({
  sessionPlan,
  profile,
  targetLanguage,
  nativeLanguage,
});

// 4. Set lesson state from generated result
setState({ activities: lesson.activities, ... });
```

### Step 2 — `App.tsx`: Pass required context into `useLesson`

`useLesson` needs `userId`, `targetLanguage`, and `nativeLanguage`. These
are on the auth profile. Add them as parameters or context to the hook.

Current signature (approximate):
```typescript
const { state, loadLesson, endLesson } = useLesson();
```

New signature:
```typescript
const { state, loadLesson, endLesson } = useLesson({
  userId: getCurrentUserId(),
  targetLanguage: userProfile?.targetLanguage ?? 'fr',
  nativeLanguage: userProfile?.nativeLanguage ?? 'en',
});
```

### Step 3 — `App.tsx` `handleLessonComplete`: Record pedagogy outcome

After lesson completion, call the pedagogy engine to record what happened:

```typescript
// Already done (Phase 1.2 audit):
await learnerProfileService.recordSession(userId, { ... });

// Add: record chunk encounters so SRS updates
// (this is wired further in Task F — stub it here as a no-op)
await pedagogyEngine.recordSessionOutcome({
  sessionPlan,
  lessonResult,
  userId,
}).catch(err => console.warn('[TaskE] Could not record session outcome:', err));
```

### Step 4 — `PathView`: Show real chunk count instead of static activity count

`PathView` currently shows hardcoded `"5 activities"` per lesson node. After
Task E, replace with actual lesson metadata from the session plan.

This is cosmetic — low priority, acceptable as a deferred polish item.

---

## Fallback Strategy

The v2 lesson generator can fail (Groq API down, learner profile missing, etc.).
In all failure cases, fall back to `lessonPlanService` (v1 static plan) and
log a warning:

```typescript
try {
  lesson = await lessonGeneratorV2.generateLesson({ ... });
} catch (err) {
  console.warn('[useLesson] V2 generation failed, falling back to v1:', err);
  lesson = await lessonPlanService.getLessonPlan(treeId, targetLanguage);
}
```

This ensures the game is never unplayable even if the pedagogy engine has a bug.

---

## Files To Modify

| File | Change |
|------|--------|
| `src/hooks/useLesson.ts` | Replace `lessonPlanService` call with `pedagogyEngine + lessonGeneratorV2` |
| `App.tsx` | Pass `userId`, `targetLanguage`, `nativeLanguage` to `useLesson`; wire `recordSessionOutcome` |
| `src/types/pedagogy.ts` | Confirm `LessonResult` has `activities`, `timeSpentMs`, `sunDropsEarned` (already done) |
| `src/services/lessonPlanService.ts` | Keep as fallback — do not delete |

---

## New Files (None Expected)

All required services already exist. No new files needed.

---

## GardenWorld3D Placement Callback (Small, Bundle With This Task)

Task B deferred the garden object placement callback. Since Task E is already
touching `App.tsx` and `GardenWorld3D`, wire this at the same time:

1. Add `onObjectPlaced?: (objectType: string, gx: number, gz: number) => void` to `GardenWorld3D` props
2. Call it from `GardenRenderer` after `confirmPlacement()`
3. In `App.tsx`, call `savePlacedObject({ objectType, gx, gz })` on that event

This completes the shop decoration persistence that Task B left pending.

---

## Testing Checklist

- [ ] TypeScript compiles with no errors
- [ ] Starting a lesson loads without crashing (v2 path)
- [ ] If Groq API is down, lesson still loads (v1 fallback activates)
- [ ] `learnerProfileService.getOrCreate()` is called — profile exists in PB after first lesson
- [ ] `learnerProfileService.recordSession()` is called after completion
- [ ] Activities generated match the target language (not English chunks in a French lesson)
- [ ] `ageGroup` is threaded correctly (not undefined)
- [ ] Garden object placement → saves to PB → survives page refresh

---

## Acceptance Criteria

1. A brand-new user can sign up, do a French lesson, and get AI-generated activities (not static mock ones)
2. Their learner profile exists in PB after the first lesson
3. A decoration placed in the shop appears in the garden after a page refresh
4. Nothing crashes if the Groq API is unavailable

---

## Confidence Target: 8.5/10

**Expected concerns:**
- First-lesson cold start (no chunks encountered yet) — `pedagogyEngine.prepareSession()` must handle empty chunk history gracefully (it should, but verify)
- `ageGroup` defaulting to `'11-14'` for all new users until Task D (onboarding) — acceptable

---

## Next Task

**Task C: Mobile Polish** (can run in parallel with E) or  
**Task F: Chunk SRS System** (depends on E being wired)
