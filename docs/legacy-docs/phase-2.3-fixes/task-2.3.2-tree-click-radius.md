# Task 2.3.2 — Tree Click Radius

**Status:** ✅ COMPLETE  
**Commit:** c9da917

---

## Problem

Learning trees were hard to click — especially on mobile/touch. The tree mesh (trunk cylinder + leaf sphere cluster) has a very small cross-section in isometric view, easily missed by a tap. Kids were clicking beside the tree and walking there instead of opening the lesson.

Three.js raycasting is geometry-based (not pixel-based), so the visible leaf pixels don't define the click target — the actual mesh geometry does. With a trunk radius of ~0.08 world units, the effective click target was far smaller than the rendered visual.

---

## Fix

**File:** `src/renderer/GardenRenderer.ts` — `addLearningTree()`

After `makeLearningTree()` creates the tree group, an invisible `CylinderGeometry` hitbox is added as a child before the group is added to the scene:

```typescript
// Invisible cylindrical hitbox — much larger than the visual trunk/leaves.
// Three.js raycasting is geometry-based (not pixel-based), so a transparent
// mesh is still fully clickable.  Radius 0.6 world units ≈ 60% of a tile
// width, giving a generous tap target for kids on small touchscreens.
// depthWrite: false prevents the invisible cylinder from occluding objects
// drawn after it in the render pass.
const hitboxGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.5, 8);
const hitboxMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
hitbox.position.y = 1.25; // Vertically centre the cylinder over the tile
treeGroup.add(hitbox);
```

**Why this works:**

The existing click handler in `handleClick()` traverses all mesh children of tree groups via `treeGroup.traverse()`, so the hitbox is automatically included in raycasting. When the hitbox is hit, the walk-up-parent-chain logic finds `treeGroup.userData.type === 'learningTree'` and fires the tree interaction — exactly the same as clicking the trunk itself.

**Hitbox dimensions:**
- Radius: 0.6 world units (≈ 48px at default zoom on a 375px-wide phone)
- Height: 2.5 world units (covers sapling through full-grown tree)
- 8-sided polygon — minimal geometry, fast intersection test

**Material choices:**
- `transparent: true, opacity: 0` — fully invisible, no visual change
- `depthWrite: false` — prevents the cylinder from writing to depth buffer, so it doesn't occlude background objects

---

## Result

Trees now have a ~1.2 world-unit-diameter click target, comfortably tappable even with a coarse finger touch. The hitbox covers the full height of any growth stage.

---

## Confidence: 9/10

**Met:**
- [x] Invisible hitbox on every learning tree
- [x] Hitbox disposed correctly in `removeLearningTree()` (traversal handles all children)
- [x] No visual change
- [x] TypeScript compiles cleanly

**Concerns:**
- [ ] Hitbox radius may occasionally trigger tree interaction when clicking a tile adjacent to the tree boundary — monitor in playtesting
