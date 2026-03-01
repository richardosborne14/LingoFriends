# Task 2.0.3: Tree Click UX Fix

**Status:** ✅ Complete  
**Phase:** 2.0 — Wave 1  
**Dependencies:** None  
**Estimated Time:** 2–3 hours  
**Priority:** High — core navigation is frustrating

---

## Problem Statement

Clicking on a tree in the garden often doesn't enter the lesson or make the avatar move. The current flow requires:
1. Click tree → avatar starts walking toward it
2. Wait for avatar to arrive
3. Click again (or an interaction panel appears that you must click)

This double-click pattern is confusing, especially for kids. Sometimes the first click doesn't register at all if the tap target is slightly off.

**Expected behaviour:** Click a tree → avatar walks to the tree → when avatar reaches the tree, automatically open the PathView for that tree's skill path. One click, one action.

---

## Objectives

1. Single click on a tree triggers: walk to tree → auto-enter PathView on arrival
2. Increase the click hitbox for trees (more forgiving tap targets)
3. Show a brief visual cue during the walk (e.g., dotted path line or subtle highlight on the target tree)
4. Cancel pending interaction if user clicks elsewhere during walk

---

## Implementation

### Step 1 — Add Pending Interaction State

**File:** `src/renderer/GardenRenderer.ts` (or wherever click handling lives)

```typescript
interface PendingInteraction {
  treeId: string;
  targetPosition: THREE.Vector3;
  type: 'open_path';  // Future: 'water', 'inspect', etc.
}

// In the renderer class/state:
private pendingInteraction: PendingInteraction | null = null;
```

### Step 2 — Handle Tree Click

When a tree is clicked:
1. Set `pendingInteraction` with the tree's ID and position
2. Begin avatar walk toward tree
3. Highlight the target tree (subtle glow or pulse)

```typescript
onTreeClick(treeId: string, treePosition: THREE.Vector3) {
  // Cancel any existing pending interaction
  this.pendingInteraction = null;

  // Set new pending interaction
  this.pendingInteraction = {
    treeId,
    targetPosition: treePosition,
    type: 'open_path',
  };

  // Start avatar walking
  this.setAvatarTarget(treePosition);

  // Visual feedback on target tree
  this.highlightTree(treeId, true);
}
```

### Step 3 — Check Arrival in Animation Loop

In the render/animation loop, check if the avatar has reached the target:

```typescript
// In animation loop:
if (this.pendingInteraction) {
  const dist = this.avatar.position.distanceTo(this.pendingInteraction.targetPosition);
  const ARRIVAL_THRESHOLD = 1.2; // world units — close enough

  if (dist < ARRIVAL_THRESHOLD) {
    const interaction = this.pendingInteraction;
    this.pendingInteraction = null;
    this.highlightTree(interaction.treeId, false);

    // Trigger the callback to React layer
    this.onTreeArrival?.(interaction.treeId);
  }
}
```

### Step 4 — Wire Callback to React

**File:** `src/components/garden/GardenWorld3D.tsx`

```typescript
// Pass callback to renderer
renderer.onTreeArrival = (treeId: string) => {
  // Open PathView for this tree
  onTreeSelect(treeId);
};
```

### Step 5 — Cancel on New Click

If the user clicks somewhere else (empty ground, another tree, or a decoration) while the avatar is walking to a tree:
- Cancel the pending interaction
- Remove highlight from old tree
- If new click is another tree, set new pending interaction
- If new click is empty ground, just walk there with no pending interaction

### Step 6 — Increase Tree Hitboxes

Trees built from Three.js geometry may have small clickable areas. Add invisible collision meshes:

```typescript
// For each learning tree, add an invisible cylinder around it
const hitbox = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 2, 8), // generous radius
  new THREE.MeshBasicMaterial({ visible: false })
);
hitbox.userData = { type: 'tree', treeId: tree.id };
tree.group.add(hitbox);
```

Use these hitboxes for raycasting instead of the detailed tree geometry.

---

## Testing Checklist

- [ ] Single click on tree → avatar walks → PathView opens on arrival
- [ ] No need for second click
- [ ] Clicking another tree during walk cancels old interaction, starts new one
- [ ] Clicking empty ground during walk cancels pending interaction
- [ ] Target tree has visual highlight during walk
- [ ] Highlight removed on arrival or cancellation
- [ ] Works on mobile (touch events, not just mouse)
- [ ] Tap target is forgiving (slightly off-centre taps still register)
- [ ] Avatar walk speed feels right (not too slow for interaction)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/GardenRenderer.ts` | Pending interaction state, arrival check, tree highlight |
| `src/components/garden/GardenWorld3D.tsx` | Wire onTreeArrival callback |
| `src/renderer/objects/learningTrees.ts` | Add invisible hitbox meshes |

---

## Notes

- The arrival threshold should be generous (1.0–1.5 world units) so the transition feels snappy
- Consider a brief 200ms pause on arrival before opening PathView — an instant pop feels jarring
- The highlight effect could be a subtle scale pulse (1.0 → 1.05 → 1.0 repeating) or a faint glow ring at the tree's base
- Future: This same pattern supports other tree interactions (watering, inspecting health) by changing the `type` field
