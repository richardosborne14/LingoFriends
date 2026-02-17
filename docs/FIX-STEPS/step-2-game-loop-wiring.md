# Step 2: Wire the Full Game Loop in App.tsx

**Priority:** 🔴 CRITICAL
**Estimated effort:** 1-2 hours
**Depends on:** Step 1 (tree-renderer bridge)
**Status:** ✅ COMPLETE (2026-02-17)

---

## Goal

Complete the game loop: **Garden → Click Tree → Path View → Start Lesson → Complete Lesson → Rewards → Back to Garden**

Every piece of this loop already exists as working code. They just aren't plugged together. This step is pure wiring — no new features.

---

## What Already Works

| Piece | File | Status |
|-------|------|--------|
| Navigation state machine (garden/path/lesson) | `src/hooks/useNavigation.tsx` | ✅ Working |
| `handleOpenPath(tree: UserTree)` | `App.tsx` GameApp | ✅ Coded, never called from 3D |
| `handleStartLesson(lesson)` | `App.tsx` GameApp | ✅ Coded, generates lesson plan |
| PathView (shows lessons, start button) | `src/components/path/PathView.tsx` | ✅ Working |
| LessonView (runs activities, tracks score) | `src/components/lesson/LessonView.tsx` | ✅ Working |
| LessonComplete (stars, SunDrops summary) | `src/components/lesson/LessonComplete.tsx` | ✅ Working |
| Mock data (trees, skill paths) | `src/data/mockGameData.ts` | ✅ Available |
| GardenWorld3D (after Step 1) | `src/components/garden/GardenWorld3D.tsx` | ✅ After Step 1 |

---

## Changes Needed

### 1. Pass `userTrees` and `onTreeClick` into GardenWorld3D

In `App.tsx`, the `GameApp` component renders `GardenWorld3D`. Currently it passes only `avatarOptions` and `onAvatarMove`. After Step 1 adds the new props, wire them:

```tsx
{/* Garden View - in GameApp component */}
<GardenWorld3D
  className="h-[calc(100vh-180px)]"
  avatarOptions={DEFAULT_AVATAR}
  userTrees={trees}  // ← ADD: from MOCK_USER_TREES (or Pocketbase later)
  onTreeClick={(treeData) => {
    // Find the full UserTree object from the tree data
    const tree = trees.find(t => t.skillPathId === treeData.skillPathId);
    if (tree) {
      handleOpenPath(tree);  // ← This already exists and works!
    }
  }}
  onAvatarMove={(gx, gz) => {
    console.log('[GameApp] Avatar moved to', gx, gz);
  }}
/>
```

### 2. Verify the existing flow works

The rest of the chain is already wired in `App.tsx`:

1. `handleOpenPath(tree)` → calls `actions.goToPath(tree)` → shows PathView ✅
2. PathView's `onStartLesson` → calls `handleStartLesson(lesson)` → generates plan → shows LessonView ✅  
3. LessonView's `onComplete` → calls `handleLessonComplete(result)` → calls `actions.goBack()` → returns to PathView ✅
4. PathView's `onBack` → calls `handlePathBack()` → calls `actions.goToGarden()` → shows garden ✅

### 3. Update `handleLessonComplete` to sync tree state

Currently `handleLessonComplete` just logs and goes back. Add SunDrop awarding:

```tsx
const handleLessonComplete = useCallback((result: LessonResult) => {
  console.log('[GameApp] Lesson complete:', result);
  
  // TODO (Pocketbase integration): Save to database
  // For now, update local mock state to show tree growth
  // This will be replaced with real Pocketbase calls later
  
  // The tree should grow based on SunDrops earned
  // After Step 4 (currency fix), SunDrops will be per-tree
  // For now, just log and return
  
  actions.goBack();
}, [actions]);
```

### 4. Remove the TODO comment blocks in the garden view

In `App.tsx`, there are large comment blocks explaining the gap. Once wired, clean them up or replace with concise comments.

---

## The Complete Flow After This Step

```
User sees 3D garden with learning trees (from Step 1)
  ↓
User clicks a learning tree
  ↓
GardenWorld3D fires onTreeClick({skillPathId, gx, gz})
  ↓
App.tsx finds the UserTree, calls handleOpenPath(tree)
  ↓
Navigation goes to 'path' view, PathView renders with skill path lessons
  ↓
User taps a lesson node
  ↓
handleStartLesson generates a LessonPlan (mock for now)
  ↓
Navigation goes to 'lesson' view, LessonView renders activities
  ↓
User completes activities, earns SunDrops
  ↓
LessonComplete screen shows stars + SunDrops
  ↓
User taps Continue → back to PathView
  ↓
User taps Back → back to Garden (tree should show growth)
```

---

## Testing Checklist

- [ ] Clicking a learning tree in the 3D garden opens the PathView for that skill path
- [ ] PathView shows the correct lessons for the selected tree's skill path
- [ ] Tapping a lesson starts the lesson (shows loading, then LessonView)
- [ ] Completing a lesson shows LessonComplete with correct SunDrops
- [ ] Continuing from LessonComplete returns to PathView
- [ ] Going back from PathView returns to the garden
- [ ] The garden still renders correctly after returning from a lesson
- [ ] Header and tab bar hide during lesson, reappear after

---

## Files to Modify

1. `App.tsx` — Wire props into GardenWorld3D, clean up TODO comments

## Files to NOT Modify

- `src/hooks/useNavigation.tsx` — Already works
- `src/components/path/PathView.tsx` — Already works
- `src/components/lesson/LessonView.tsx` — Already works
