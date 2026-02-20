# Step 4: Fix Currency Model

**Priority:** 🟡 HIGH
**Estimated effort:** 2-3 hours
**Depends on:** Steps 1-2 (game loop must work first)

---

## Goal

Fix the three-currency system so it matches the game design. Right now everything is confused — the shop uses SunDrops as currency but it should use Gems. SunDrops are treated as global but should be per-tree.

---

## The Correct Model (from GAME_DESIGN.md)

### 🌞 SunDrops — Per-Tree Learning Currency
- **Earned:** By completing lessons for a specific skill path
- **Spent:** Automatically — they grow the corresponding learning tree
- **Scope:** Per-tree (each `UserTree` has its own `sunDropsEarned` count)
- **NOT used for:** Shop purchases

### 💎 Gems — Global Shop Currency  
- **Earned:** Bonus rewards from lessons (small amounts), milestones, achievements
- **Spent:** In the shop to buy decorations, decoration trees, tree care items
- **Scope:** Global (one balance per player)

### 🌱 Seeds — Tree Planting Tokens
- **Earned:** Completing pathway milestones (e.g., finish all lessons in a chapter)
- **Spent:** Planting new learning trees in the garden
- **Scope:** Global inventory

---

## What's Wrong Currently

| Issue | Where | Fix |
|-------|-------|-----|
| `useSunDrops` hook treats SunDrops as global | `src/hooks/useSunDrops.ts` | SunDrops should come from `UserTree.sunDropsEarned` |
| Shop catalogue prices in "Sun Drops" | `src/components/garden/GardenWorld3D.tsx` SHOP_CATALOGUE | Change to Gems |
| ShopPanel shows SunDrop balance | `src/components/garden/ShopPanel.tsx` | Show Gem balance instead |
| No Gem balance tracking in garden view | `App.tsx` GameApp | Add gem balance from `useGarden` or mock data |
| `gemService.ts` exists but isn't used in shop | `src/services/gemService.ts` | Wire it into ShopPanel |

---

## Changes Needed

### 1. Update ShopPanel to use Gems
- Change `currency` prop from SunDrops to Gems
- Update "cost" display to show 💎 icon
- Wire `gemService` for balance checks

### 2. Update SHOP_CATALOGUE prices
- In `GardenWorld3D.tsx`, change all `price` values to reasonable Gem costs
- Example: Small flower = 5 gems, Tree = 20 gems, Bench = 15 gems

### 3. SunDrops stay per-tree (already correct in data model)
- `UserTree.sunDropsEarned` is already per-tree in `src/types/game.ts` ✅
- `calculateGrowthStage(sunDropsEarned)` already uses per-tree value ✅
- The `useSunDrops` hook's global tracking can remain for display in the header (total across all trees)

### 4. Update header display
- Show total SunDrops (sum of all trees) AND Gem balance
- Currently header shows only SunDrops via `progress.sunDrops`

---

## Files to Modify

1. `src/components/garden/ShopPanel.tsx` — Use Gems instead of SunDrops
2. `src/components/garden/GardenWorld3D.tsx` — Update SHOP_CATALOGUE prices to Gems
3. `App.tsx` — Pass gem balance to relevant components
4. `src/components/navigation/AppHeader.tsx` — Optionally show Gem balance

## Testing Checklist

- [x] Shop shows Gem prices (💎) not SunDrop prices
- [x] Player's Gem balance shown in shop
- [x] Can't buy items if insufficient Gems
- [x] SunDrops in header still show correctly (total across trees)
- [x] Gem balance shown in header (💎 purple pill)
- [ ] Lesson completion awards SunDrops to the correct tree (needs real data integration)
- [ ] Lesson completion awards small Gem bonus (needs real data integration)

## Completed Changes

| File | Change |
|------|--------|
| `src/components/garden/ShopPanel.tsx` | `sunDropsBalance` → `gemBalance`, all 💛→💎, purple cost color |
| `src/renderer/types.ts` | Updated ShopItem docs: cost is in Gems |
| `src/components/navigation/AppHeader.tsx` | Added `gems` prop with purple 💎 counter |
| `src/data/mockGameData.ts` | Added `gems: 85` to MOCK_USER_PROGRESS |
| `App.tsx` | Passes `gems={progress.gems}` to AppHeader |
| `src/components/dev/ShopTestHarness.tsx` | Switched to gem balance throughout |

### Bonus: Daytime Garden & Walk-to-Tree

Also done during this step for testing and UX improvement:

| File | Change |
|------|--------|
| `src/renderer/GardenRenderer.ts` | Background → sky blue (0x87CEEB), bright ambient (0.6), strong sun (1.2), hemisphere light, fog updated |
| `src/renderer/GardenRenderer.ts` | Walk-to-tree: avatar walks to adjacent tile before opening lesson path. Added `pendingTreeInteraction`, `findAdjacentTile()`, arrival callback |
| `src/renderer/AtmosphereBuilder.ts` | Added `buildDaytime()` method — white clouds, fence, border (no stars/moon) |

**Walk-to-tree behavior:**
- Click tree when far away → avatar walks to nearest adjacent tile, then path opens
- Click tree when already adjacent (≤1 tile) → opens immediately
- Click a regular tile while walking to tree → cancels pending interaction
