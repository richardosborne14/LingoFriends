# Task 1.1.12: Decoration System

**Status:** ~~Superseded by Task 1.1.17~~
**Phase:** ~~C (Social & Rewards)~~
**Dependencies:** Task 1.1.11 (Gift System)
**Estimated Time:** ~~3-4 hours~~

---

## ⚠️ Task Superseded

This task has been **merged into Task 1.1.17 (Garden Shop & Decoration Placement)** as part of the Three.js renderer update.

**Why merged?**

1. The decoration system now needs to work with the Three.js isometric renderer instead of the previous 2D CSS/SVG approach
2. Placing decorations in a 3D isometric garden requires grid-based placement, which is covered in Task 1.1.17
3. The Garden Shop provides a unified UI for both purchasing and placing decorations
4. Reduces task fragmentation and ensures cohesive implementation

---

## Original Scope (Preserved for Reference)

The original task covered:

- Decoration purchase with Sun Drops
- Free placement in garden (2D coordinates)
- Decoration inventory management
- Gift-only decorations (Golden Flower → Cherry Blossoms, Ribbon)

---

## New Home: Task 1.1.17

See **`task-1-1-17-garden-shop-ui.md`** for the complete implementation, which includes:

- **Garden Shop UI** — Purchase decorations with seeds
- **Placement Mode** — Click-to-place in isometric garden
- **Grid System** — 16×12 grid with proper depth sorting
- **Object Library** — All decoration types from `GARDEN_THREE_IMPLEMENTATION.md`
- **Persistence** — Saving to `garden_objects` collection

---

## Migration Notes

If you were looking for:

| Original Feature | New Location |
|-----------------|--------------|
| `decorationService.ts` | Covered by `gardenObjectService.ts` in Task 1.1.17 |
| `DecorationPicker.tsx` | Replaced by `GardenShop.tsx` in Task 1.1.17 |
| `DecorationItem.tsx` | Replaced by Three.js objects in Task 1.1.14 |
| Decoration purchase | Garden Shop with seed currency |
| Decoration placement | Grid-based placement in Task 1.1.17 |

---

## Data Model Changes

The `decorations` collection from this task has been replaced by `garden_objects`:

```typescript
// Old: decorations collection (2D, free placement)
{
  id: string;
  user: relation;
  itemType: string;
  position: { x: number; y: number };  // Free coordinates
  placed: boolean;
  unlockedAt: datetime;
}

// New: garden_objects collection (isometric grid)
{
  id: string;
  user: relation;
  objectType: string;
  gridX: number;        // Grid column (0-15)
  gridY: number;        // Grid row (0-12)
  rotation: number;     // 0, 90, 180, 270
  variant: number;      // Visual variant
  created: datetime;
  updated: datetime;
}
```

---

## Related Documents

- **Task 1.1.17** — Garden Shop & Decoration Placement (new home)
- **Task 1.1.14** — Three.js Garden Renderer (rendering layer)
- **GARDEN_THREE_IMPLEMENTATION.md** — Full object catalogue
- **task-1-1-7-pocketbase-schema.md** — `garden_objects` collection schema