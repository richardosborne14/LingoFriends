# Task 4.1: Three.js Garden Scene

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 8/10
**Estimated Time:** 5h
**Dependencies:** Phase 3 complete and audited

---

## Mandatory Reads

1. `01-DESIGN-SYSTEM.md` — colour palette for garden (sunrise gradient, forest, bark)
2. V1 reference: `GARDEN_THREE_IMPLEMENTATION.md` — tree factory functions, object catalogue
3. `02-DATABASE-SCHEMA.md` — userTrees table (positions, health, growthStage)

---

## Objective

Create the Three.js garden scene with ground, fence, tree plots, trees at various growth stages, sky gradient, and camera controls. Trees are clickable.

---

## Implementation

`src/lib/three/garden/GardenScene.ts`:

```typescript
export class GardenScene {
  constructor(canvas: HTMLCanvasElement);
  init(): void;           // Set up scene, camera, renderer, lights
  dispose(): void;        // Clean up all Three.js resources
  resize(w, h): void;     // Handle canvas resize
  setTrees(trees: TreeData[]): void;  // Create/update tree meshes
  setAvatar(options: AvatarOptions): void;
  moveAvatarTo(x, z): void;
  focusOnTree(treeId: string): void;  // Animate camera to tree
  getClickedObject(event: PointerEvent): string | null; // Raycasting
}
```

**Scene elements:** Green ground plane, low wooden fence (box geometries), circular dirt tree plots, trees (geometry-only: cylinder trunk + sphere canopy, size/colour varies by growthStage 0-14 and health), paths, sky gradient (coral-100→sky-300), ambient pollen particles on healthy trees.

**Camera:** Orthographic (isometric), bounded orbit controls, pinch-zoom on mobile.

---

## 🤔 Decision Points for User

> **1. Tree models:** (A) Geometry trees from V1 (proven, fast), (B) Low-poly glTF from Kenney.nl (better looking, needs loading), (C) Geometry MVP, glTF later. Recommend C.
>
> **2. Camera style:** (A) Isometric/orthographic (V1 style, game-like), (B) Perspective (more immersive). Recommend A — proven with kids.

---

## Tests

```typescript
describe('GardenScene', () => {
  it('initialises without errors', () => {});
  it('disposes cleanly (renderer.dispose called)', () => {});
  it('sets trees from data array', () => {});
  it('raycasting returns tree ID on click', () => {});
  it('handles empty tree array', () => {});
});
```

---

## Acceptance Criteria

- [ ] Garden renders with ground, fence, sky
- [ ] Trees render at correct positions and growth stages
- [ ] Camera controls: orbit, zoom, bounded
- [ ] Tap/click detection on trees (raycasting)
- [ ] Clean dispose (no WebGL leaks)
- [ ] Tests: 5/5 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
