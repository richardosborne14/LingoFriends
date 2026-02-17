# Step 6: Shop Currency & Categories

**Priority:** 🟢 MEDIUM
**Estimated effort:** 2-3 hours
**Depends on:** Step 4 (currency model must be defined)

---

## Goal

Update the garden shop to use the correct currency (Gems) and organize items into proper categories matching the game design.

---

## Current State

`ShopPanel.tsx` exists and works — it shows a list of items, handles selection, and triggers placement mode in the 3D renderer. However:
- All prices are in "Sun Drops" (should be Gems)
- No category separation
- No Tree Care items (water, fertilizer for learning trees)
- No distinction between decoration trees (cosmetic) and learning trees

---

## Correct Shop Categories

### 1. 🌸 Decorations (Cosmetic)
Items that make the garden look nice. No gameplay effect.
- Flowers (daisy, tulip, sunflower)
- Furniture (bench, lantern, birdbath, swing)
- Features (pond, bridge, well)

### 2. 🌲 Decoration Trees (Cosmetic)
Static trees bought for aesthetics. NOT learning trees.
- Oak, Pine, Cherry, Maple, Willow, Palm
- These are from `src/renderer/objects/trees.ts`

### 3. 💧 Tree Care (Learning Tree Support)
Consumable items that help learning trees.
- Water (restores health to a specific learning tree)
- Fertilizer (small SunDrop boost to a specific tree)
- These target learning trees, not decorations

---

## Changes Needed

### 1. Reorganize SHOP_CATALOGUE with categories

```typescript
const SHOP_CATALOGUE = {
  decorations: [
    { id: 'daisy', name: 'Daisy', price: 5, icon: '🌼', type: 'flower' },
    { id: 'bench', name: 'Bench', price: 15, icon: '🪑', type: 'furniture' },
    // ...
  ],
  decoTrees: [
    { id: 'oak', name: 'Oak Tree', price: 20, icon: '🌳', type: 'tree' },
    // ...
  ],
  treeCare: [
    { id: 'water', name: 'Water', price: 3, icon: '💧', type: 'consumable' },
    { id: 'fertilizer', name: 'Fertilizer', price: 8, icon: '🧪', type: 'consumable' },
  ],
};
```

### 2. Add category tabs to ShopPanel

Tab bar at top: `All | Decorations | Trees | Care`

### 3. Tree Care item flow

When a Tree Care item is selected:
1. Instead of placement mode, show a list of the player's learning trees
2. Player picks which tree to apply the item to
3. Item effect applied (health restore / SunDrop boost)
4. Gems deducted

### 4. Update all prices to Gems

All items priced in 💎 Gems. Reasonable range:
- Small items (flowers, plants): 3-8 gems
- Medium (furniture, features): 10-20 gems
- Large (trees): 15-25 gems
- Consumables: 3-10 gems

---

## Files to Modify

1. `src/components/garden/ShopPanel.tsx` — Categories, gem currency, tree care flow
2. `src/components/garden/GardenWorld3D.tsx` — Update SHOP_CATALOGUE
3. `src/renderer/types.ts` — Add category to ShopItem type if needed

## Testing Checklist

- [ ] Shop shows category tabs
- [ ] All prices in Gems
- [ ] Decoration items enter placement mode correctly
- [ ] Tree Care items show tree selection instead of placement
- [ ] Insufficient gems shows appropriate feedback
- [ ] Categories filter correctly
