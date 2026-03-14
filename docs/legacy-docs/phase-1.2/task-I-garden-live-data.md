# Task I — Garden Live Data Bridge

**Phase:** 1.2 (production readiness)
**Status:** ✅ Complete
**Depends on:** Tasks B (PB wiring), G (dynamic paths), H (system prompts)
**Blocks:** Task J (first tree seeding), Task K (PB-driven paths)

---

## Problem

The garden is still frozen on dummy data. Two hardcoded constants prevent real users from ever seeing their own trees:

1. **`useGarden.tsx` line 1:** `const USE_MOCK_DATA = true`
   Bypasses all PocketBase calls. The hook's `loadGarden()` function, real-time subscription, and all mutation helpers are fully implemented — they're just never called.

2. **`App.tsx`:**
   ```ts
   const trees = MOCK_USER_TREES;   // userId: 'mock-user' — not the logged-in user
   const avatar = MOCK_AVATAR;       // hardcoded 🧒 "Buddy"
   ```
   `GameApp` never calls `useGarden` at all — it ignores the hook's live data.

A new user who signs up, completes onboarding, and reaches the garden sees three hardcoded Spanish trees belonging to a fictional user. Their own trees — correctly created by `saveLessonCompletion` in PB — are never displayed.

---

## Goal

Remove `USE_MOCK_DATA`, wire `App.tsx` to consume `useGarden`'s live tree data, and ensure the garden renders correctly for both:
- **New users** (zero trees — empty garden with a "Plant your first tree" prompt)
- **Returning users** (PB trees loaded and rendered with real health/growth data)

Avatar stays as `MOCK_AVATAR` for now (Phase 2 customisation) — that is the only acceptable remaining mock.

---

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useGarden.tsx` | Remove `USE_MOCK_DATA = true`, always use live PB path |
| `App.tsx` | Replace `MOCK_USER_TREES` with `useGarden()` hook; wire loading/error states |
| `src/data/mockGameData.ts` | Remove `MOCK_USER_TREES` export (or mark as dev-only behind `import.meta.env.DEV`) |

---

## Implementation Plan

### Step 1 — `useGarden.tsx`: Remove mock flag

Delete the `USE_MOCK_DATA` constant and all branches guarded by it. The live path (PocketBase `loadGarden` + real-time subscription) becomes the only path.

Keep the `pbTreeToUserTree()` helper — it's still needed to normalise PB records.

**Empty garden handling:** When `loadGarden()` returns an empty array (new user with no trees), `trees` will be `[]`. This is valid — `GardenWorld3D` already handles an empty `userTrees` prop gracefully (renders the scene with no tree objects). Task J adds the "plant your first tree" prompt on top of this.

### Step 2 — `App.tsx`: Wire `useGarden` into `GameApp`

Replace the hardcoded constants:

```tsx
// BEFORE (remove):
import { MOCK_USER_TREES, MOCK_AVATAR } from './src/data/mockGameData';
// ...
const trees = MOCK_USER_TREES;
const avatar = MOCK_AVATAR;

// AFTER:
import { useGarden } from './src/hooks/useGarden';
// ...
const { trees, skillPaths, isLoading: gardenLoading, error: gardenError } = useGarden();
const avatar = MOCK_AVATAR; // Phase 2: avatar customisation
```

Pass `trees` (live PB data) into `GardenWorld3D` as before. The mapping to `userTrees` shape stays identical.

Handle `gardenLoading` and `gardenError` states — show a spinner or friendly error message rather than a blank garden.

### Step 3 — Verify `GardenWorld3D` handles empty `userTrees`

Confirm `GardenWorld3D` renders without crashing when `userTrees = []`. Add a guard if needed.

### Step 4 — Remove `MOCK_USER_TREES` from `mockGameData.ts`

Strip the export (or wrap in `DEV` guard) to prevent future accidental re-use. `MOCK_AVATAR` and `MOCK_SKILL_PATHS` can remain temporarily for the avatar and the now-deprecated path fallback — Task K will remove `MOCK_SKILL_PATHS`.

---

## Acceptance Criteria

- [x] A newly signed-up user sees an empty garden (no fake trees)
- [x] After completing their first lesson, a tree appears in the garden on next load
- [x] Returning users see their actual trees with correct health values
- [x] `USE_MOCK_DATA` constant is gone from `useGarden.tsx`
- [x] `MOCK_USER_TREES` is gone from `App.tsx` (no import, no usage)
- [x] Garden loading state is shown while PB query is in flight
- [x] TypeScript compiles with no errors

---

## Notes

- The `useGarden` hook already implements real-time subscriptions via `pb.collection('user_trees').subscribe()`. Once `USE_MOCK_DATA` is removed, tree health changes from other sources (e.g. tree decay, gifts) will update the garden automatically — no additional work needed.
- `skillPaths` from `useGarden` will be replaced by real PB data in Task K. For now, `useGarden` can continue to derive them from whatever `user_trees` records exist in PB — the `skillPathId` field on each tree record links to the path.

---

## Confidence Target: 9/10

The implementation is mechanical (flag removal + hook wiring). Risk is low because `loadGarden()` and all mutations in `useGarden` are already written and tested. Primary risk: edge cases around empty tree arrays — handled explicitly.
