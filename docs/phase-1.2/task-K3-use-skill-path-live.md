# Task K3 — Wire `useSkillPath` to Live PocketBase Paths

**Phase:** 1.2 (production readiness)
**Status:** ✅ Complete
**Depends on:** K2 (`skillPathService` exists)
**Blocks:** K5 (remove mock data)

---

## Problem

`useSkillPath` currently loads its path template from:

```typescript
import { getSkillPathById } from '../data/mockGameData';
const template = getSkillPathById(skillPathId) ?? null;
```

This returns `null` for any `skillPathId` that isn't one of the 3 hardcoded Spanish paths. French and German users get a blank `PathView`. The hook then overlays real PB progress on top of the template — but if the template is `null`, there's nothing to overlay onto.

---

## Goal

Replace the synchronous `getSkillPathById` mock lookup with an async call to `skillPathService.getSkillPathById()`. The rest of the hook (PB progress overlay, star calculation, `buildLiveLessons`) stays exactly the same.

**One import swap, one async fetch, same output shape.**

---

## File to Change

`src/hooks/useSkillPath.ts`

---

## Change Summary

### Before

```typescript
import { getSkillPathById } from '../data/mockGameData';
// ...
const template = getSkillPathById(skillPathId) ?? null;
const [skillPath, setSkillPath] = useState<SkillPath | null>(template);
```

The mock lookup is synchronous. `template` is available immediately on first render.

### After

```typescript
import { getSkillPathById } from '../services/skillPathService';
// ...
// template is now async — fetched inside the useEffect
const [skillPath, setSkillPath] = useState<SkillPath | null>(null);
```

The PB lookup is async. The hook starts with `null` and populates once the fetch completes.

---

## Updated `useEffect` Flow

The effect now has **two async steps** instead of one:

```
Step 1: getSkillPathById(skillPathId)  ← NEW (async, from skillPathService)
          ↓ template: SkillPath | null
Step 2: pb.collection('user_trees').getFirstListItem(...)  ← existing
          ↓ treeRecord: progress data
Step 3: buildLiveLessons(template, lessonsCompleted, sunDropsEarned)  ← existing
          ↓ setSkillPath(live path with progress overlay)
```

If step 1 returns `null` (path not found in PB), the hook logs a warning and sets `skillPath` to `null`. `PathView` already handles `null` gracefully with a "path not found" message.

---

## Implementation (key changes only)

```typescript
// src/hooks/useSkillPath.ts

// Change this import:
// OLD: import { getSkillPathById } from '../data/mockGameData';
// NEW:
import { getSkillPathById } from '../services/skillPathService';

// In the useEffect, fetch the template first:
useEffect(() => {
  let cancelled = false;

  async function fetchPathAndProgress() {
    setIsLoading(true);
    setError(null);

    // Step 1: Load the path template from PB (was: synchronous mock lookup)
    const template = await getSkillPathById(skillPathId);

    if (cancelled) return;

    if (!template) {
      console.warn(`[useSkillPath] No path found for skillPathId: ${skillPathId}`);
      setSkillPath(null);
      setIsLoading(false);
      return;
    }

    const userId = getCurrentUserId();

    // Not authenticated → use fresh template (no progress overlay)
    if (!userId) {
      setSkillPath(template);
      setIsLoading(false);
      return;
    }

    // Step 2: Load user progress from PB (existing logic — unchanged)
    try {
      const treeRecord = await pb.collection('user_trees').getFirstListItem(
        `user = "${userId}" && skillPathId = "${skillPathId}"`,
      );
      if (cancelled) return;

      const lessonsCompleted = (treeRecord.lessonsCompleted as number) ?? 0;
      const sunDropsEarned = (treeRecord.sunDropsEarned as number) ?? 0;

      // Step 3: Overlay progress onto template (existing logic — unchanged)
      const liveLessons = buildLiveLessons(template, lessonsCompleted, sunDropsEarned);
      setSkillPath({ ...template, lessons: liveLessons });

    } catch (err: unknown) {
      if (cancelled) return;
      const isNotFound = /* existing not-found detection */ true;

      if (isNotFound) {
        // Fresh tree: no progress yet, lesson 0 is current
        const freshLessons = buildLiveLessons(template, 0, 0);
        setSkillPath({ ...template, lessons: freshLessons });
      } else {
        console.warn(`[useSkillPath] PB progress query failed:`, err);
        setError('Could not load your progress.');
        setSkillPath(template); // show path without progress overlay
      }
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  }

  fetchPathAndProgress();
  return () => { cancelled = true; };

}, [skillPathId, refreshKey, internalRefreshKey]);
```

---

## Loading State Behaviour

With the sync mock, `skillPath` was never `null` on first render (template was always available). With the async PB fetch, there's a brief loading window. `PathView` should handle `isLoading = true` by showing a skeleton/spinner — confirm this is already in place.

---

## Acceptance Criteria

- [ ] `useSkillPath` imports from `skillPathService`, not `mockGameData`
- [ ] Spanish, French, German, and English ESL paths all load correctly
- [ ] Progress overlay still works (completed/current/locked statuses are correct)
- [ ] `null` skillPath when path not found in PB — no crash
- [ ] Loading state shown while both PB fetches are in-flight
- [ ] TypeScript compiles with no errors

---

## Notes

- The `buildLiveLessons`, `calculateStars`, and status overlay logic is **not changed** — only the source of the `template` changes.
- `skillPathService` uses an in-memory cache so the PB round-trip only happens once per session per `canonicalId`. Subsequent calls to `useSkillPath` with the same `skillPathId` (e.g. on re-render after lesson complete) return instantly.
- `refreshKey` and `internalRefreshKey` still work as before — they trigger the full `fetchPathAndProgress` flow, which re-fetches progress from PB (but gets the template from cache).
