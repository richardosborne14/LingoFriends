# Task 1.1.17: Garden Shop & Decoration Placement

**Status:** Needs Revision ⚠️
**Phase:** D (Polish)
**Dependencies:** Task 1.1.14 (Three.js Garden Renderer)
**Estimated Time:** 4–5 hours
**Completed:** 2026-02-16 (needs updates)
**Updated:** 2026-02-16

---

## ⚠️ CRITICAL CORRECTIONS NEEDED

This task was completed with **incorrect currency**. The shop currently uses SunDrops, but per `task-1-1-19-garden-architecture-fix.md`:

1. **Decorations are purchased with GEMS, not SunDrops**
2. **Trees in the shop are DECORATION TREES (cosmetic), not learning trees**
3. **Learning trees come from SEEDS (earned via pathway completion)**

See `docs/phase-1.1/task-1-1-19-garden-architecture-fix.md` for the full architecture.

---

## Objective

Build the React UI overlay for the garden shop and object placement system. This connects the Three.js renderer to the **GEM economy** and Pocketbase persistence.

**Reference:** `docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md` — Shop catalogue and data model
**Prototype:** `docs/phase-1.1/GardenV2.jsx` — Working shop UI implementation

---

## Deliverables

### Files to Create
- `src/components/garden/ShopPanel.tsx` — Shop overlay with categories
- `src/components/garden/PlacementGhost.tsx` — Preview object during placement
- `src/services/gardenObjectService.ts` — Pocketbase CRUD for garden_objects

### Files to Modify
- `src/components/garden/GardenWorld.tsx` — Add shop button, placement mode
- `src/hooks/useGarden.tsx` — Add placedObjects state and actions
- `src/types/game.ts` — Add GardenObject, ShopCatalogue types

---

## Shop Catalogue (19 Items)

From the implementation guide, with isometric thumbnail icons:

```typescript
const SHOP_CATALOGUE = [
  // Trees (6)
  { id: 'oak',      name: 'Oak Tree',       cost: 30, category: 'Trees'     },
  { id: 'pine',     name: 'Pine Tree',      cost: 25, category: 'Trees'     },
  { id: 'cherry',   name: 'Cherry Blossom', cost: 40, category: 'Trees'     },
  { id: 'maple',    name: 'Autumn Maple',   cost: 35, category: 'Trees'     },
  { id: 'willow',   name: 'Weeping Willow', cost: 45, category: 'Trees'     },
  { id: 'palm',     name: 'Palm Tree',      cost: 38, category: 'Trees'     },
  
  // Flowers (6)
  { id: 'rose',     name: 'Rose',           cost: 15, category: 'Flowers'   },
  { id: 'sunflwr',  name: 'Sunflower',      cost: 12, category: 'Flowers'   },
  { id: 'tulip',    name: 'Tulip',          cost: 10, category: 'Flowers'   },
  { id: 'lavender', name: 'Lavender',       cost: 10, category: 'Flowers'   },
  { id: 'daisy',    name: 'Daisy',          cost: 8,  category: 'Flowers'   },
  { id: 'poppy',    name: 'Poppy',          cost: 10, category: 'Flowers'   },
  
  // Plants (2)
  { id: 'hedge',    name: 'Hedge Bush',     cost: 18, category: 'Plants'    },
  { id: 'mushroom', name: 'Mushroom',       cost: 8,  category: 'Plants'    },
  
  // Furniture (3)
  { id: 'bench',    name: 'Bench',          cost: 45, category: 'Furniture' },
  { id: 'lantern',  name: 'Lantern',        cost: 35, category: 'Furniture' },
  { id: 'sign',     name: 'Sign Post',      cost: 20, category: 'Furniture' },
  
  // Features (2)
  { id: 'fountain', name: 'Fountain',       cost: 80, category: 'Features'  },
  { id: 'pond',     name: 'Pond',           cost: 55, category: 'Features'  },
];
```

**Note:** Icons for the shop will show isometric thumbnails of each object (not emojis). These are rendered from the same geometry functions used in the garden.

---

## Pocketbase Schema

```javascript
// Collection: garden_objects
{
  id: string;           // Auto-generated
  user_id: string;      // Relation to users
  object_id: string;    // e.g., "lantern", "cherry", "fountain"
  gx: number;           // Grid X (0-11)
  gz: number;           // Grid Z (0-11)
  placed_at: datetime;  // Timestamp
}

// API Rules:
// - List/View: user_id = @request.auth.id
// - Create: user_id = @request.auth.id
// - Update/Delete: user_id = @request.auth.id
```

---

## Shop UI Design

```
┌─────────────────────────────────────────────────────────────┐
│  🌿 Garden Shop                              💛 42 Sun Drops │
├─────────────────────────────────────────────────────────────┤
│  [All] [Trees] [Flowers] [Plants] [Furniture] [Features]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 🌳  │ │ 🌲  │ │ 🌸  │ │ 🍁  │ │ 🌿  │                   │
│  │ Oak │ │Pine │ │Cherry│ │Maple│ │Willow│                  │
│  │ 💛30│ │ 💛25│ │ 💛40│ │ 💛35│ │ 💛45│                   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                             │
│  ... more items ...                                         │
├─────────────────────────────────────────────────────────────┤
│  Complete lessons to earn more Sun Drops ✨                 │
└─────────────────────────────────────────────────────────────┘
```

When item selected:
```
┌─────────────────────────┐
│  🌸 Cherry Blossom       │
│  Click a grass tile     │
│  💛 40                   │
│                    [✕]  │
└─────────────────────────┘
```

---

## Placement Mechanics

1. **Select item** from shop → ghost preview follows cursor
2. **Hover over tile** → ghost shows at that position
3. **Validate placement:**
   - Tile must be grass (not path)
   - Must be empty (no tree, decoration, or feature)
4. **Click to place:**
   - Deduct Sun Drops via `sunDropService.spend()`
   - Call `makeObj(object_id, gx, gz)` to add to scene
   - Save to Pocketbase `garden_objects`
5. **Cancel:** Press Escape or click ✕ button

---

## Service: GardenObjectService

```typescript
// src/services/gardenObjectService.ts

import { pocketbaseService } from './pocketbaseService';

export interface GardenObject {
  id: string;
  user_id: string;
  object_id: string;
  gx: number;
  gz: number;
  placed_at: string;
}

export const gardenObjectService = {
  async getUserObjects(userId: string): Promise<GardenObject[]> {
    return pocketbaseService.getList('garden_objects', {
      filter: `user_id = "${userId}"`,
      sort: '-placed_at',
    });
  },

  async placeObject(
    userId: string,
    objectId: string,
    gx: number,
    gz: number
  ): Promise<GardenObject> {
    return pocketbaseService.create('garden_objects', {
      user_id: userId,
      object_id: objectId,
      gx,
      gz,
      placed_at: new Date().toISOString(),
    });
  },

  async removeObject(objectId: string): Promise<void> {
    await pocketbaseService.delete('garden_objects', objectId);
  },

  async moveObject(
    objectId: string,
    gx: number,
    gz: number
  ): Promise<GardenObject> {
    return pocketbaseService.update('garden_objects', objectId, { gx, gz });
  },
};
```

---

## Ghost Preview

The ghost preview shows a semi-transparent version of the object:

```typescript
// When item selected, create ghost:
const ghost = makeObj(selectedItem.id, 0, 0);
ghost.traverse(child => {
  if (child.isMesh) {
    child.material = child.material.clone();
    child.material.transparent = true;
    child.material.opacity = 0.5;
  }
});

// Update ghost position on hover:
const tile = raycastTile(mousePosition);
if (tile && canPlace(tile.gx, tile.gz)) {
  ghost.position.set(gridToWorld(tile.gx, tile.gz));
  ghost.visible = true;
} else {
  ghost.visible = false;
}
```

---

## Testing Checklist

### Shop UI
- [x] All 19 items display with correct costs
- [x] Category tabs filter correctly
- [x] Sun Drop balance shows in header
- [x] Cannot purchase if insufficient funds
- [x] Insufficient funds shows friendly message

### Placement
- [ ] Ghost preview follows cursor (requires GardenWorld3D integration)
- [ ] Ghost only shows on valid tiles (requires GardenWorld3D integration)
- [ ] Cannot place on path tiles (requires GardenWorld3D integration)
- [ ] Cannot place on occupied tiles (service validates)
- [ ] Sun Drops deducted on placement (requires useSunDrops integration)
- [ ] Object appears in garden immediately (requires renderer integration)
- [ ] Object persists after page reload (service tested)

### Service Tests
- [x] Type definitions correct (GardenObject, PlaceObjectData)
- [x] Grid position validation (0-11 bounds check)
- [x] Unit test file created with todo items for integration tests
- [x] Build passes (`npm run build` succeeds)

### Edge Cases
- [ ] Cancel placement (Escape key) (requires UI integration)
- [ ] Cancel placement (click ✕) (callback prop ready)
- [ ] Place object, then try to place another on same tile (occupancy check ready)
- [ ] Shop panel toggle doesn't affect garden state

### Integration Testing Required
The following require connecting ShopPanel to GardenWorld3D:
1. Run migration: `node scripts/migrate-garden-objects.cjs`
2. Wire `onSelectItem` to `setPlacementModeItem` in GardenWorld3D
3. Connect `sunDropsBalance` to `useSunDrops` hook
4. Call `gardenObjectService.placeObject()` on tile click in placement mode

---

## Test Harness

A development test harness has been created for testing the ShopPanel independently:

**`src/components/dev/ShopTestHarness.tsx`**

Features:
- Mock Sun Drops balance that can be adjusted
- 4x4 grid for quick placement testing
- List of placed objects with remove functionality
- Real-time placement mode indicator

To use the test harness:
1. The test harness is available through the dev index
2. Can be toggled in development mode
3. Tests all ShopPanel functionality without backend

---

## Build Verification

```bash
npm run build
# ✓ 506 modules transformed
# ✓ built in 2.33s
```

All components compile successfully.

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Shop renders all items | [ ] |
| Placement validates correctly | [ ] |
| Sun Drops deducted | [ ] |
| Objects persist to Pocketbase | [ ] |
| Ghost preview works | [ ] |

---

## Reference Files

- **`docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md`** — SHOP_CATALOGUE, grid system
- **`docs/phase-1.1/GardenV2.jsx`** — Working shop UI implementation
- **`src/services/sunDropService.ts`** — Sun Drop spending

---

## Implementation Summary

### Files Created
- **`scripts/migrate-garden-objects.cjs`** — Pocketbase migration for `garden_objects` collection
- **`src/services/gardenObjectService.ts`** — CRUD service for garden objects
- **`src/services/gardenObjectService.test.ts`** — Unit tests for the service
- **`src/components/garden/ShopPanel.tsx`** — Shop UI overlay component

### Files Modified
- **`src/types/pocketbase.ts`** — Added `GardenObjectRecord` type
- **`src/components/garden/index.ts`** — Added ShopPanel export

### Features Implemented
1. **Pocketbase Schema**: Migration creates `garden_objects` collection with:
   - User relation with cascade delete
   - Object ID (matching ShopItem.id)
   - Grid position (gx, gz: 0-11)
   - Placement timestamp
   - API rules for owner-only access

2. **Garden Object Service**:
   - `getUserObjects()` — Load all user's placed objects
   - `placeObject()` — Place at valid position (bounds + occupancy check)
   - `removeObject()` — Delete from database
   - `moveObject()` — Update grid position
   - `clearUserObjects()` — Reset user's garden
   - `subscribe()` — Real-time updates

3. **ShopPanel Component**:
   - Category tabs (All, Trees, Flowers, Plants, Furniture, Features)
   - 19 item cards with emoji icons and Sun Drop costs
   - Sun Drop balance display in header
   - "Cannot afford" disabled state with lock icon
   - Placement mode instructions modal
   - Responsive design

### Integration Notes
- The GardenWorld3D component already supports placement mode via `placementModeItem` prop
- The renderer has `showGhostPreview()` and `clearGhostPreview()` for visual feedback
- Integration with `useSunDrops` hook needed for actual Sun Drop deduction
- Full flow: Shop → Select → Ghost Preview → Click to Place → Deduct → Save → Render

---

## Notes for Implementation

1. Shop panel is a React overlay, not part of Three.js scene
2. Use the same `makeObj()` factory as the renderer for ghost preview
3. Sun Drop balance updates should be optimistic (update UI, then sync to server)
4. Consider adding a "remove mode" for users to delete placed objects (future enhancement)
5. Prices are calibrated: 2-3 lessons = flower, ~10 lessons = fountain