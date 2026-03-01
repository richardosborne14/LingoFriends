# Task 2.3.2: Fix Tree Click Hit-Testing

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Fix the garden interaction so that clicking a tile *adjacent* to a tree (lesson marker) no longer activates the tree and launches the lesson path. Only clicking on the *exact* tree tile itself should trigger the lesson flow.

## Bug Addressed

- **Bug 2:** In the isometric garden world, clicking any tile that is directly next to a tree (lesson marker) incorrectly fires the tree's click handler, taking the user into the lesson path. This makes the garden feel inaccurate and frustrating — especially on mobile where tap targets are imprecise anyway.

## Root Cause Analysis

In an isometric tile grid, hit-testing is non-trivial because:

1. **Tiles are rendered as diamonds** — a square pixel bounding box around an isometric tile overlaps significantly with adjacent tiles.
2. **Trees are taller than one tile** — the tree sprite or 3D mesh extends vertically above its tile, meaning the visual footprint of the tree is larger than its logical tile.
3. The click handler is likely doing a **bounding-box test** rather than an exact **isometric tile coordinate test**.

The fix must ensure:
- Clicks are mapped to isometric tile coordinates (using the inverse isometric projection from screen pixel → tile row/col)
- The tile coordinate is then checked against the tree's exact tile position
- Adjacent tiles — even if visually overlapped by the tree's visual — do not trigger the handler

## What Needs to Be Built

### Isometric Click-to-Tile Mapping

The click event on the garden canvas must convert screen (x, y) to tile (row, col) using the inverse isometric formula:

```typescript
// Isometric projection:
// screenX = (col - row) * tileHalfWidth + originX
// screenY = (col + row) * tileHalfHeight + originY

// Inverse:
// col = ((screenX - originX) / tileHalfWidth + (screenY - originY) / tileHalfHeight) / 2
// row = ((screenY - originY) / tileHalfHeight - (screenX - originX) / tileHalfWidth) / 2

function screenToTile(
  screenX: number,
  screenY: number,
  origin: { x: number; y: number },
  tileSize: { halfWidth: number; halfHeight: number }
): { row: number; col: number } {
  const dx = screenX - origin.x;
  const dy = screenY - origin.y;
  const col = Math.round((dx / tileSize.halfWidth + dy / tileSize.halfHeight) / 2);
  const row = Math.round((dy / tileSize.halfHeight - dx / tileSize.halfWidth) / 2);
  return { row, col };
}
```

### Click Handler Update

In `src/components/world/WorldMapView.tsx` (or wherever the garden click handler lives):

1. On click/tap, compute the tile coordinate using the above formula
2. Look up whether that exact tile has a tree/lesson marker
3. Only if `tiles[row][col].type === 'tree'` (or equivalent) — fire the lesson activation
4. Log a debug message for any click that lands on a non-tree tile (so we can verify in testing)

### Three.js Raycasting (if using 3D renderer)

If the garden uses a Three.js scene, the correct approach is `Raycaster`:
- Cast a ray from camera through the click position
- Intersect only against a flat invisible "floor plane" mesh at tile height
- Convert the intersection point to tile row/col
- Do NOT intersect against tree meshes directly (that would include clicking anywhere on the tall tree model)

## Files to Investigate / Modify

- `src/components/world/WorldMapView.tsx` — click handler
- `src/components/garden/GardenWorld3D.tsx` — if 3D, Three.js raycasting
- `src/renderer/` — any renderer that handles tile click events
- `src/components/garden/GardenTree.tsx` — verify tree's tile position is stored correctly

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Hit-test method | Bounding box vs. exact tile coordinate | Exact tile coordinate (inverse isometric formula) |
| 3D approach | Raycast against tree mesh vs. floor plane | Floor plane only — more precise |
| Touch target size | 1 exact tile vs. slight margin | 1 exact tile — no margin. Mobile users should tap the tree |

## Testing

- [ ] Clicking a tree tile opens the lesson path
- [ ] Clicking a tile directly above/below/left/right of a tree does NOT open the lesson path
- [ ] Clicking a tile diagonally adjacent to a tree does NOT open the lesson path
- [ ] Works on both mouse click and touch tap
- [ ] Works at different zoom/viewport sizes

**Test scenarios:**
1. Place avatar next to a tree, click the empty tile beside it — lesson should NOT activate
2. Click directly on the tree tile — lesson SHOULD activate
3. On mobile: tap the tree — activates; tap beside it — does not activate

## Confidence Scoring

### Requirements to Meet
- [ ] Exact tile hit-testing implemented
- [ ] Adjacent tiles do not trigger tree activation
- [ ] Tree tile itself still correctly triggers activation
- [ ] Mobile tap targets work correctly

### Concerns
- [ ] Isometric projection constants (tileHalfWidth, tileHalfHeight, origin) must match the actual renderer values exactly, or the hit-test will be offset

### Deferred
- [ ] Visual highlight on hover over a tree tile (show the cursor changes to pointer) → Phase 2.4

## Notes for Future Tasks

If we later add other interactive tiles (NPCs, shops, decorations), they will all need the same precise hit-testing. Consider centralising the `screenToTile()` utility in a shared renderer utility file.

## Learnings

TBD after implementation.
