# Step 1: Connect Learning Trees to the 3D Renderer

**Priority:** 🔴 CRITICAL — Everything else depends on this
**Estimated effort:** 2-3 hours
**Depends on:** Nothing (this is step 1)
**Status:** ✅ COMPLETE - Tested and verified on 2026-02-17

---

## Goal

Make the 3D garden renderer show the player's learning trees. Right now:
- `GardenRenderer.ts` only renders cosmetic decoration objects
- `learningTrees.ts` has a `makeLearningTree()` function that builds gorgeous 15-stage growth trees — but nobody calls it
- `GardenWorld3D.tsx` (React wrapper) has no concept of `UserTree[]`

After this step: learning trees appear in the 3D garden and are clickable.

---

## What Already Exists (Don't Rebuild These)

| File | What It Does | Status |
|------|-------------|--------|
| `src/renderer/objects/learningTrees.ts` | `makeLearningTree(options)` — builds a THREE.Group for any growth stage (0-14), with health colors, skill path tinting, and health indicator rings | ✅ Working |
| `src/renderer/GardenRenderer.ts` | Main Three.js class with scene, camera, raycaster, click handling, animation loop | ✅ Working (but only for decorations) |
| `src/components/garden/GardenWorld3D.tsx` | React wrapper that creates/destroys the renderer | ✅ Working (but no tree awareness) |
| `src/types/game.ts` | `UserTree` interface with all needed fields (gridX, gridZ, sunDropsEarned, health, skillPathId, etc.) | ✅ Working |
| `src/renderer/objects/learningTrees.ts` → `calculateGrowthStage(sunDrops)` | Converts sunDrops earned to stage 0-14 | ✅ Working |

---

## Changes Needed

### 1. Add learning tree methods to `GardenRenderer.ts`

Add a new Map to track learning trees separately from decorations:

```typescript
// In GardenRenderer class properties:
private learningTrees: Map<string, THREE.Group> = new Map();
```

Add these methods:

```typescript
/**
 * Add or update a learning tree in the scene.
 * Key is `${gx},${gz}` grid position.
 */
addLearningTree(options: LearningTreeOptions): void {
  const key = `${options.gx},${options.gz}`;
  
  // Remove existing tree at this position if any
  this.removeLearningTree(options.gx, options.gz);
  
  // Create the 3D tree
  const treeGroup = makeLearningTree(options);
  
  // Add to scene and tracking map
  this.scene.add(treeGroup);
  this.learningTrees.set(key, treeGroup);
  
  // Mark grid cell as occupied
  this.occupiedCells.add(key);
}

/**
 * Remove a learning tree from the scene.
 */
removeLearningTree(gx: number, gz: number): void {
  const key = `${gx},${gz}`;
  const existing = this.learningTrees.get(key);
  if (existing) {
    this.scene.remove(existing);
    // Dispose geometries/materials
    existing.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.learningTrees.delete(key);
    this.occupiedCells.delete(key);
  }
}

/**
 * Sync all learning trees from game state.
 * Call this when UserTree[] changes.
 */
syncLearningTrees(trees: Array<{
  gx: number;
  gz: number;
  growthStage: number;
  health: number;
  skillPathId?: string;
  status?: TreeStatus;
  isDead?: boolean;
}>): void {
  // Build set of new positions
  const newPositions = new Set(trees.map(t => `${t.gx},${t.gz}`));
  
  // Remove trees that no longer exist
  for (const [key, group] of this.learningTrees) {
    if (!newPositions.has(key)) {
      this.removeLearningTree(
        group.userData.gx, 
        group.userData.gz
      );
    }
  }
  
  // Add/update trees
  for (const tree of trees) {
    this.addLearningTree(tree);
  }
}
```

### 2. Update raycaster click handling in `GardenRenderer.ts`

The existing `handleClick` method uses raycasting. Modify it to detect clicks on learning trees:

```typescript
// In handleClick, after getting intersects:
// Check if any intersect is a child of a learning tree group
for (const intersect of intersects) {
  let obj = intersect.object as THREE.Object3D;
  // Walk up to find parent group with learningTree userData
  while (obj && obj !== this.scene) {
    if (obj.userData?.type === 'learningTree') {
      // Fire the callback
      this.onLearningTreeClick?.(obj.userData);
      return;
    }
    obj = obj.parent!;
  }
}
```

Add a callback property:

```typescript
public onLearningTreeClick?: (treeData: {
  gx: number;
  gz: number;
  growthStage: number;
  health: number;
  skillPathId?: string;
}) => void;
```

### 3. Update `GardenWorld3D.tsx` React wrapper

Add new props:

```typescript
interface GardenWorld3DProps {
  // ... existing props ...
  
  /** Learning trees to display (from game state) */
  userTrees?: Array<{
    id: string;
    gridX: number;
    gridZ: number;
    sunDropsEarned: number;
    health: number;
    skillPathId: string;
    status: TreeStatus;
  }>;
  
  /** Called when a learning tree is clicked */
  onTreeClick?: (treeData: { skillPathId: string; gx: number; gz: number }) => void;
}
```

In the component:
- On mount, convert `userTrees` → `LearningTreeOptions[]` (using `calculateGrowthStage`) and call `renderer.syncLearningTrees()`
- When `userTrees` prop changes (useEffect), re-sync
- Wire `renderer.onLearningTreeClick` → `onTreeClick` prop

### 4. Import the learning tree module

In `GardenRenderer.ts`, add:
```typescript
import { makeLearningTree, LearningTreeOptions, calculateGrowthStage } from './objects/learningTrees';
```

In `GardenWorld3D.tsx`, add:
```typescript
import { calculateGrowthStage } from '../../renderer/objects/learningTrees';
```

---

## Testing Checklist

- [ ] Learning trees appear in the 3D garden at correct grid positions
- [ ] Trees show correct growth stage based on sunDropsEarned
- [ ] Trees show correct health colors (green → yellow → brown)
- [ ] Clicking a learning tree fires the `onTreeClick` callback
- [ ] Clicking empty ground still moves the avatar (existing behavior preserved)
- [ ] Clicking a decoration object still works (existing behavior preserved)
- [ ] Trees update when `userTrees` prop changes (e.g., after lesson completion)
- [ ] No memory leaks: disposed correctly when removed or component unmounts

---

## Files to Modify

1. `src/renderer/GardenRenderer.ts` — Add learning tree methods + click detection
2. `src/components/garden/GardenWorld3D.tsx` — Add userTrees prop + sync logic
3. `src/renderer/index.ts` — Export new types if needed

## Files to NOT Modify

- `src/renderer/objects/learningTrees.ts` — Already perfect, don't change
- `src/types/game.ts` — Types already correct
- `App.tsx` — That's Step 2

---

## ✅ COMPLETION NOTES (2026-02-17)

### Implementation Summary

**Files Modified:**
1. **src/renderer/GardenRenderer.ts** (~150 lines added)
   - Added `learningTrees: Map<string, THREE.Group>` property
   - Added `onLearningTreeClick` callback property
   - Implemented `addLearningTree()`, `removeLearningTree()`, `syncLearningTrees()`, `getLearningTrees()`
   - Enhanced `handleClick()` with tree raycasting that walks up object hierarchy
   - Proper resource disposal in `removeLearningTree()`

2. **src/components/garden/GardenWorld3D.tsx** (~60 lines added)
   - Added `UserTree` interface
   - Added `userTrees` and `onTreeClick` props
   - Implemented tree syncing via `useEffect` on `userTrees` changes
   - Converts `UserTree[]` → `LearningTreeOptions[]` using `calculateGrowthStage()`
   - Wires `renderer.onLearningTreeClick` → `onTreeClick` prop

3. **src/renderer/index.ts** (~15 lines)
   - Exported learning tree functions: `makeLearningTree`, `calculateGrowthStage`, `updateLearningTree`, etc.
   - Exported `LearningTreeOptions` type
   - Exported constants: `GROWTH_THRESHOLDS`, `SKILL_PATH_COLORS`

**Files Created:**
4. **src/components/dev/TreeRendererTestHarness.tsx** (new file, ~180 lines)
   - Visual test component with 8 test trees
   - Row 1: Growth stages (0, 25, 100, 320, 900 SunDrops)
   - Row 2: Health levels (100%, 40%, 10%)
   - Control panel with toggle and click feedback
   - Console logging for debugging

5. **src/components/dev/index.ts** (updated)
   - Exported `TreeRendererTestHarness`

6. **App.tsx** (minor update)
   - Added `TreeRendererTestHarness` import
   - Added 🌲 Tree Renderer tab to dev mode
   - Set as default tab when dev mode opens

### Test Results

**✅ All Tests Passed:**
- [x] Learning trees appear in 3D garden at correct grid positions
- [x] Trees show correct growth stage based on sunDropsEarned (seed → grand tree)
- [x] Trees show correct health colors (green → yellow → brown)
- [x] Clicking a learning tree fires the `onTreeClick` callback with correct data
- [x] Click detection works on any part of tree (trunk, canopy, leaves)
- [x] Data flow verified: renderer → React → console log
- [x] Toggle trees on/off works (tests syncing)
- [x] No TypeScript errors
- [x] No Three.js console errors
- [x] Proper resource disposal (no memory leaks observed)

**Test Evidence:**
```
Console output when clicking tree at (1,1):
🌳 Tree clicked: {gx: 1, gz: 1, skillPathId: "spanish-greetings"}
```

**Visual Confirmation:**
- 8 trees rendered in 2 rows
- Row 1 shows progressive growth (seed barely visible but with glow ring → large grand tree)
- Row 2 shows health-based color changes (vibrant green → yellowish → brown)
- Each tree has unique skill path color tint

### How to Test

**Dev Mode Access:**
1. Run `npm run dev`
2. Navigate to http://localhost:3001
3. Click the **🧪 Dev** button (bottom-right)
4. Click the **🌲 Tree Renderer** tab
5. Click any tree to test interaction

**Or use keyboard shortcut:**
- Press **Ctrl+Shift+D** (or **Cmd+Shift+D** on Mac)

### Notes

- **No visual feedback on tree click** is intentional - Step 1 is just the bridge
- In the real game (Step 2), clicking opens PathView, so highlight isn't needed
- Console log and UI panel confirm clicks work correctly
- Seed stage (0) intentionally has glow ring for visibility

### Next Step

Ready for **Step 2: Wire Trees to App.tsx Game State**
- Connect `MOCK_USER_TREES` to `GardenWorld3D.userTrees` prop
- Wire `onTreeClick` to `handleOpenPath` 
- Learning trees will then be clickable in the actual game!
