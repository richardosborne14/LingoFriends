# Task G — Dynamic Skill Paths

**Phase:** 1.2 completion  
**Status:** 🔲 Not started  
**Depends on:** Task F (SRS write-back) ✅  
**Estimated effort:** 1–2 hours

---

## Goal

Replace the mock-data `SkillPathLesson` statuses in `PathView` with **real progress data** loaded from PocketBase `user_trees` records. After this task, completing a lesson actually unlocks the next lesson node on the path, and star ratings show real history.

---

## Current State

`App.tsx` passes `MOCK_SKILL_PATHS` (from `src/data/mockGameData.ts`) to `PathView`. Every skill path always has the same hardcoded nodes with the same `status: 'available' | 'locked'` values. Nothing changes when a real lesson is completed.

The `user_trees` PocketBase collection already stores `lessonsCompleted` and `sunDropsEarned` (written by `saveLessonCompletion` in `gameProgressService`). We just need to use it.

---

## What Needs to Change

### 1. New hook: `useSkillPath.ts`

`src/hooks/useSkillPath.ts`

```typescript
/**
 * useSkillPath
 *
 * Loads a skill path with live lesson statuses derived from PocketBase
 * user_tree progress data. Falls back to mock statuses for unauthenticated
 * sessions or PB unavailability.
 *
 * Logic per lesson node (in order):
 *   - Lesson 0: always 'available' (first lesson is always unlocked)
 *   - Lesson N: 'completed' if lessonsCompleted > N
 *   - Lesson N: 'available' if previous lesson is completed (stars ≥ 1)
 *   - Lesson N: 'locked' otherwise
 *   - Stars: calculated from sunDropsEarned / sunDropsMax thresholds
 */
export function useSkillPath(skillPathId: string): {
  skillPath: SkillPath | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
```

**Key logic:**

```typescript
// Unlock rule: lesson N is available if lesson N-1 is completed
// Stars: ≥80% = 3, ≥60% = 2, ≥40% = 1, else 0
function buildLessonStatuses(
  template: SkillPath,
  treeRecord: PBUserTree | null
): SkillPathLesson[] {
  const completed = treeRecord?.lessonsCompleted ?? 0;
  const earnedPerLesson = completed > 0
    ? (treeRecord?.sunDropsEarned ?? 0) / completed
    : 0;

  return template.lessons.map((lesson, i) => {
    const isCompleted = i < completed;
    const isAvailable = i === 0 || i <= completed;

    return {
      ...lesson,
      status: isCompleted ? 'completed' : isAvailable ? 'available' : 'locked',
      stars: isCompleted ? calculateStars(earnedPerLesson, lesson.sunDropsMax) : 0,
      sunDropsEarned: isCompleted ? earnedPerLesson : 0,
    };
  });
}

function calculateStars(earned: number, max: number): 0 | 1 | 2 | 3 {
  if (max === 0) return 0;
  const pct = earned / max;
  if (pct >= 0.8) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}
```

### 2. `PathView` — consume `useSkillPath`

`src/components/path/PathView.tsx`

Currently receives `skillPath` as a static prop from `App.tsx`. Add an optional prop `liveStatuses?: SkillPathLesson[]` that overrides mock statuses, OR pass the result of `useSkillPath` directly.

Simplest approach: move the `useSkillPath` call **inside PathView** so it owns its own data-loading. `App.tsx` just passes `skillPathId`.

### 3. `App.tsx` — pass `skillPathId` not `skillPath`

```typescript
// Before (mock):
const selectedSkillPath = getSkillPathById(state.selectedTree.skillPathId);
<PathView skillPath={selectedSkillPath} ... />

// After (live):
<PathView skillPathId={state.selectedTree.skillPathId} ... />
// PathView calls useSkillPath internally
```

### 4. Refresh path after lesson complete

In `handleLessonComplete`, after `saveLessonCompletion` resolves, signal PathView to refresh. The easiest approach: pass a `refreshKey` prop that PathView watches, or have `useSkillPath` expose a `refresh()` function called from `App.tsx`.

---

## PocketBase Query

```typescript
// In useSkillPath
const treeRecord = await pb.collection('user_trees').getFirstListItem(
  `user = "${userId}" && skillPathId = "${skillPathId}"`,
  { $cancelKey: `skillPath_${skillPathId}` }
);
```

Returns `null` (no record) for a tree the user has never started — treat all lessons as locked except lesson 0.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useSkillPath.ts` | CREATE |
| `src/components/path/PathView.tsx` | MODIFY — consume `useSkillPath` |
| `App.tsx` | MODIFY — pass `skillPathId` instead of `skillPath` |
| `src/types/game.ts` | POSSIBLY — add `lessonsCompleted` to `UserTree` |

---

## Testing

1. Complete a lesson → go back to path → lesson N+1 should unlock
2. Complete 3 lessons → first 3 nodes show ✅, 4th is 🔓
3. New user (no tree record) → only lesson 0 is available
4. PB unreachable → falls back to mock statuses silently

---

## Confidence Target: 8/10

Must handle:
- [x] Unlock logic based on `lessonsCompleted`
- [x] Star display from earned/max ratio
- [x] Loading state while PB query runs
- [x] Fallback to mock on error
- [ ] Real-time refresh after lesson completion
