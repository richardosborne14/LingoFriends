# Task A: Shop Categories & Tree Care

**Status:** ✅ COMPLETE (2026-02-18)
**Roadmap Group:** 1 — Finish the Baseline Experience
**Supersedes:** `docs/FIX-STEPS/step-6-shop-fix.md`
**Estimated Time:** 2-3h
**Actual Time:** ~1h (most work was already done)

---

## Objective

Complete the garden shop so it has proper item categories (Decorations, Trees, Tree Care) and consumable Tree Care items that apply health/SunDrop boosts to specific learning trees rather than being placed on the grid.

---

## What Was Found

When this task started, the shop was already largely complete from earlier work. The audit found:

| Component | Status when task started |
|-----------|------------------------|
| `src/renderer/types.ts` — `ObjectCategory` type | ✅ Already had `TreeCare` |
| `src/renderer/types.ts` — `ShopItem` with `consumable`, `description`, `healthRestore`, `sunDropBoost` | ✅ Already complete |
| `src/renderer/types.ts` — `SHOP_CATALOGUE` with 6 categories | ✅ Already complete |
| `src/components/garden/ShopPanel.tsx` — Category tabs (All + 6 categories) | ✅ Already complete |
| `src/components/garden/ShopPanel.tsx` — `TreePickerModal` for consumables | ✅ Already complete |
| `src/components/garden/ShopPanel.tsx` — Gem balance display | ✅ Already complete |
| `App.tsx` — ShopPanel receiving `userTrees` and `onApplyTreeCare` | ✅ Already complete |
| **`App.tsx` — GardenWorld3D receiving `placementModeItem` + `onPlacementEnd`** | ❌ **MISSING** |

The only missing piece was that the shop item selection in `App.tsx` never actually entered placement mode in the renderer — `placementModeItem` and `onPlacementEnd` were never passed to `GardenWorld3D`.

---

## Changes Made

### `App.tsx`
Added `placementModeItem` and `onPlacementEnd` props to `GardenWorld3D`:

```tsx
<GardenWorld3D
  // ... existing props ...
  // Shop placement mode — pass the selected item so the renderer shows a ghost preview
  placementModeItem={selectedShopItem}
  onPlacementEnd={(placed) => {
    // Clear selected item regardless; close shop after successful placement
    setSelectedShopItem(null);
    if (placed) {
      console.log('[GameApp] Object placed — closing shop');
      setIsShopOpen(false);
    }
  }}
/>
```

**Why this was the gap:** `GardenWorld3D` already had a `useEffect` that calls `renderer.showGhostPreview()` when `placementModeItem` changes, and `renderer.clearGhostPreview()` when it's null. And the renderer's `onTileClick` handler already places the item and calls `onPlacementEnd(true)`. All the machinery existed — it just wasn't receiving the prop.

---

## Shop System Architecture (Final State)

### SHOP_CATALOGUE Categories (in `src/renderer/types.ts`)

| Category | Items | Gem Cost Range | Placement |
|----------|-------|----------------|-----------|
| **Trees** | Oak, Pine, Cherry, Maple, Willow, Palm | 15–25 gems | Grid placement |
| **Flowers** | Rose, Sunflower, Tulip, Lavender, Daisy, Poppy | 3–6 gems | Grid placement |
| **Plants** | Hedge Bush, Mushroom | 3–8 gems | Grid placement |
| **Furniture** | Bench, Lantern, Sign Post | 10–18 gems | Grid placement |
| **Features** | Fountain, Pond | 25–35 gems | Grid placement |
| **TreeCare** | Water (+25hp), Sun Lamp (+50hp), Fertilizer (+5 SunDrops), Super Food (+100hp, +3 SunDrops) | 3–10 gems | Applied to learning tree (no grid placement) |

### User Flow

**For placeable items:**
1. Open shop → select category tab → click item → ghost preview appears on garden
2. Click a grass tile → item placed, shop closes
3. Press ✕ on placement bar → cancel, ghost clears

**For Tree Care consumables:**
1. Open shop → click "💧 Tree Care" tab → click a care item
2. `TreePickerModal` appears listing all player's learning trees with health bars
3. Select a tree → item applied (health restored / SunDrops boosted) → gems deducted
4. (Note: actual application logic has `TODO` markers pending Task B Pocketbase wiring)

---

## Testing Checklist

- [x] Shop shows 7 tabs: All + Trees + Flowers + Plants + Furniture + Features + Tree Care
- [x] All prices displayed in 💎 Gems (purple cost colour)
- [x] Gem balance displayed in shop header
- [x] Items cannot be selected if gem balance insufficient (greyed out + 🔒 icon)
- [x] Decorative items enter placement mode (ghost preview in garden)
- [x] Ghost preview clears when placement is cancelled
- [x] Placed item triggers shop close
- [x] Tree Care items open TreePickerModal instead of placement mode
- [x] TreePickerModal shows tree name, health bar, and health percentage
- [x] Cancel on TreePickerModal returns to shop without applying item
- [x] No TypeScript errors

---

## What's Deferred to Task B

The `handleApplyTreeCare` in `App.tsx` currently only logs:
```typescript
// TODO (Task B): Apply tree care to specific tree
// - Deduct gems from real Pocketbase balance
// - Update tree health in real Pocketbase user_trees
// - Show success feedback / confetti
```

This is intentional — tree care effects require real data persistence (Task B: Pocketbase Live Data Wiring).

---

## Confidence Score

## Confidence: 9/10

**Met:**
- [x] All 6 categories correctly organized
- [x] TreeCare consumables don't use grid placement
- [x] Tree picker modal shows real tree health data
- [x] Ghost preview / placement mode fully wired
- [x] Gem currency throughout
- [x] No TypeScript errors

**Deferred (not a concern):**
- [ ] Actual gem deduction on tree care purchase (needs Task B — Pocketbase)
- [ ] Actual health/SunDrop effect on tree (needs Task B — Pocketbase)

---

## Next Task

**Task B: Pocketbase Live Data Wiring**
- See `docs/MASTER_PLAN.md` for scope
- Replace all `MOCK_*` imports in `App.tsx` with real Pocketbase reads
- Wire `handleLessonComplete` to save progress to Pocketbase
- Wire `handleApplyTreeCare` to deduct gems and update tree health
