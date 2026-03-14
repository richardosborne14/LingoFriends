> ⚠️ **DEPRECATED** — The concepts in this doc are correct but the work was never implemented. This has been superseded by `docs/FIX-STEPS/step-1-tree-renderer-bridge.md` through `step-6-shop-fix.md`. See `docs/MASTER_PLAN.md` for the current source of truth.

# Task 1.1.19: Garden Architecture Correction (SUPERSEDED)

**Status:** In Progress
**Phase:** D (Polish) - Critical Fix
**Priority:** HIGH - Corrects fundamental architecture misunderstandings
**Dependencies:** All previous Phase 1.1 tasks
**Estimated Time:** 6–8 hours

---

## Problem Statement

During implementation, a **critical conceptual confusion** was introduced between two fundamentally different types of trees in the garden system:

1. **Learning Trees** (skill trees linked to pathways) - The core gameplay mechanic
2. **Decoration Trees** (cosmetic oak, pine, etc.) - Purchased with gems, no gameplay function

Documentation and implementation incorrectly merged these concepts, treating all trees as shop-purchased decorations. This task corrects the architecture to match the intended game design.

---

## Correct Architecture

### Learning Trees vs Decoration Trees

| Aspect | Learning Trees | Decoration Trees |
|--------|---------------|------------------|
| **Purpose** | Core gameplay - represent learning pathways | Cosmetic - personalize garden |
| **Source** | Planted from SEEDS (earned via pathway completion) | Bought with GEMS (earned from lessons) |
| **Linked to** | ONE skill pathway (e.g., Spanish Basics) | None - purely decorative |
| **SunDrops** | Per-tree, causes GROWTH | N/A - no SunDrops |
| **Growth** | 15 visual stages from seedling to full tree | Static - no growth |
| **Health** | Decays without lessons, protected by gifts | N/A - no health |
| **Interaction** | Click → Opens PathView (lessons) | None - just visual |
| **Placement** | User chooses location when planting seed | User places anywhere on grass |
| **Examples** | "Spanish Oak", "French Maple" (named by pathway) | Oak, Pine, Cherry, Maple (generic) |

### Currency Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COMPLETING LESSONS                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │  SunDrops   │     │    Gems     │     │    Seeds    │
    │  (per-tree) │     │   (global)  │     │  (pathway   │
    │             │     │             │     │  complete)  │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ Grow THAT   │     │ Buy in shop │     │ Plant new   │
    │ specific    │     │ (deco or    │     │ learning    │
    │ tree        │     │ tree care)  │     │ tree        │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Per-Tree SunDrops

**CRITICAL:** SunDrops are NOT a global currency. Each learning tree has its own SunDrop count.

```typescript
interface UserTree {
  id: string;
  skillPathId: string;
  name: string;
  icon: string;
  
  // Position in 3D garden
  position: { x: number; y: number };  // Grid coordinates
  
  // Growth tracking - THIS tree's SunDrops
  sunDropsEarned: number;  // Total SunDrops earned for THIS tree
  growthStage: number;     // 0-14 (15 stages total)
  
  // Health system (existing)
  health: number;          // 0-100
  status: 'seed' | 'sapling' | 'growing' | 'mature' | 'dormant';
  
  // Progress
  lessonsCompleted: number;
  lessonsTotal: number;
  
  // Protection from gifts
  bufferDays: number;
  decorations: string[];   // Cosmetic decorations placed on/around tree
  giftsReceived: Gift[];
}
```

### Growth Stages (15 Stages)

Learning trees visually grow as the user earns SunDrops for that specific pathway.

| Stage | SunDrops Required | Visual Appearance |
|-------|-------------------|-------------------|
| 0 | 0 (seed) | Small mound of dirt with tiny sprout |
| 1 | 10 | Thin stem, 2 small leaves |
| 2 | 25 | Taller stem, 4 leaves |
| 3 | 45 | First branch appears, 6 leaves |
| 4 | 70 | Two branches, 8 leaves |
| 5 | 100 | Three branches, trunk thickens |
| 6 | 140 | Four branches, small canopy forming |
| 7 | 190 | Five branches, canopy fills in |
| 8 | 250 | Six branches, trunk noticeably thicker |
| 9 | 320 | Seven branches, lower branches droop slightly |
| 10 | 400 | Full branch structure, dense foliage |
| 11 | 500 | Trunk thickens, bark texture visible |
| 12 | 620 | Small flowers/buds appear (species-dependent) |
| 13 | 750 | Full flowering, mature canopy |
| 14 | 900+ | Fully mature - fruit/flowers, thick trunk, majestic |

**Implementation Notes:**
- Stages are cumulative (total SunDrops, not per-session)
- Stage 0 is the "planted seed" state
- Each stage change triggers a visual celebration
- The 3D mesh is procedurally generated based on `growthStage`
- Different pathway types may have different tree styles (oak-style, maple-style, etc.)

### Tree Care Items (Gems, not SunDrops)

In the shop, users can buy items that protect learning trees from health decay:

| Item | Cost | Effect |
|------|------|--------|
| Watering Can 🚿 | 15 gems | +5 days health protection |
| Sun Lamp 💡 | 20 gems | +5 days health protection |
| Magic Fertilizer ✨ | 25 gems | +5 days health protection |
| Rainbow Pot 🌈 | 30 gems | +5 days health protection |

These are **consumables**, not decorations. They don't persist after use.

### Gift Protection (from Friends)

Friends can send protection gifts that apply to a specific learning tree:

| Gift | Buffer Days | Source |
|------|-------------|--------|
| 💧 Water Drop | 1 day | Friend gift (easy to send) |
| ✨ Sparkle | 3 days | Friend gift (uncommon) |
| 🎀 Decoration | 5 days | Shop purchase (15-30 gems) |
| 🌸 Golden Flower | 10 days | Rare achievement reward |

---

## Data Model Changes

### Updated Types

```typescript
// src/types/game.ts

/**
 * A learning tree in the user's garden.
 * Each tree is linked to ONE skill pathway.
 */
export interface UserTree {
  id: string;
  userId: string;
  
  // Which pathway this tree represents
  skillPathId: string;
  name: string;        // e.g., "Spanish Basics", "French Greetings"
  icon: string;        // Emoji for the pathway
  
  // Position in 3D garden (grid coordinates 0-11)
  gridPosition: { gx: number; gz: number };
  
  // Growth system (PER-TREE SunDrops)
  sunDropsEarned: number;    // Total for this tree
  growthStage: number;       // 0-14, derived from sunDropsEarned
  
  // Health system (existing)
  health: number;            // 0-100, decays over time without lessons
  status: TreeStatus;
  bufferDays: number;        // Protection from gifts/consumables
  
  // Progress tracking
  lessonsCompleted: number;
  lessonsTotal: number;      // From skillPath
  lastLessonDate: string;    // ISO date
  
  // Decorations placed on/around this tree
  decorations: string[];     // IDs from garden_objects
  giftsReceived: TreeGift[];
  
  createdAt: string;
  updatedAt: string;
}

export type TreeStatus = 
  | 'seed'      // Just planted, stage 0
  | 'sapling'   // Stages 1-3
  | 'growing'   // Stages 4-9
  | 'mature'    // Stages 10-14
  | 'dormant';  // Health at 0, needs revival

/**
 * Garden decoration (purchased with gems).
 * Purely cosmetic, no gameplay function.
 */
export interface GardenDecoration {
  id: string;
  userId: string;
  objectId: string;      // From DECORATION_CATALOGUE
  gridPosition: { gx: number; gz: number };
  placedAt: string;
}

/**
 * Shop catalogue for DECORATIONS only.
 * Learning trees cannot be bought - they come from seeds.
 */
export interface DecorationItem {
  id: string;
  name: string;
  category: 'Flowers' | 'Plants' | 'Furniture' | 'Features';
  cost: number;          // In GEMS
  icon: string;
}

/**
 * Tree care consumables (also purchased with gems).
 */
export interface TreeCareItem {
  id: string;
  name: string;
  cost: number;          // In GEMS
  effect: 'health_buffer';
  bufferDays: number;
  icon: string;
}
```

### Pocketbase Schema Updates

```javascript
// Collection: user_trees (UPDATED)
{
  id: string;
  user: string;          // Relation to users
  skill_path_id: string; // Which pathway this tree represents
  name: string;          // Display name
  icon: string;          // Emoji
  
  // Grid position in garden
  grid_x: number;        // 0-11
  grid_z: number;        // 0-11
  
  // Growth (PER-TREE SunDrops)
  sun_drops_earned: number;  // Total for this tree
  growth_stage: number;      // 0-14
  
  // Health
  health: number;            // 0-100
  status: string;            // 'seed' | 'sapling' | 'growing' | 'mature' | 'dormant'
  buffer_days: number;       // Protection days
  
  // Progress
  lessons_completed: number;
  lessons_total: number;
  last_lesson_date: datetime;
  
  // Decorations on this tree
  decoration_ids: string[];  // Array of garden_object IDs
  
  created: datetime;
  updated: datetime;
}

// Collection: garden_decorations (RENAMED from garden_objects)
{
  id: string;
  user: string;          // Relation to users
  object_id: string;     // From DECORATION_CATALOGUE
  grid_x: number;
  grid_z: number;
  placed_at: datetime;
}

// Collection: profiles (UPDATED)
{
  // ... existing fields
  gems: number;          // Global gem currency
  seeds: number;         // Seeds for planting new trees
  // REMOVE: sun_drops (no longer global)
}
```

---

## Files to Modify

### 1. `src/types/game.ts`
- [ ] Update `UserTree` interface with growth fields
- [ ] Add `GardenDecoration` interface
- [ ] Add `DecorationItem` interface
- [ ] Add `TreeCareItem` interface
- [ ] Add `TreeStatus` type
- [ ] Remove global SunDrops from `UserProgress`

### 2. `src/types/pocketbase.ts`
- [ ] Update `UserTreeRecord` with new fields
- [ ] Rename `GardenObjectRecord` to `GardenDecorationRecord`
- [ ] Add `grid_x` and `grid_z` fields

### 3. `src/hooks/useSunDrops.ts`
- [ ] Change from global SunDrops to per-tree SunDrops
- [ ] Add `earnSunDropsForTree(treeId, amount)` function
- [ ] Add `getTreeGrowthStage(treeId)` function
- [ ] Update tests

### 4. `src/hooks/useGarden.tsx`
- [ ] Add `plantSeed(skillPathId, position)` function
- [ ] Add `getAvailableGridPositions()` function
- [ ] Load both learning trees AND decorations
- [ ] Update tests

### 5. `src/services/seedService.ts`
- [ ] Already exists - verify it matches new architecture

### 6. `src/services/gardenObjectService.ts`
- [ ] Rename to `gardenDecorationService.ts`
- [ ] Update to work with gems instead of SunDrops
- [ ] Remove learning tree objects

### 7. `src/services/gemService.ts`
- [ ] Add `purchaseTreeCare(item, treeId)` function
- [ ] Verify gem earning from lessons

### 8. `src/renderer/objects/trees.ts`
- [ ] Split into `learningTrees.ts` and `decorationTrees.ts`
- [ ] Learning trees: add growth stage parameter
- [ ] Decoration trees: keep as static meshes

### 9. `src/components/garden/ShopPanel.tsx`
- [ ] Change SunDrops → Gems
- [ ] Remove trees from shop (trees come from seeds)
- [ ] Add "Tree Care" category
- [ ] Update catalogue

### 10. `src/components/garden/GardenWorld3D.tsx`
- [ ] Render learning trees with growth stages
- [ ] Handle click on learning tree → open PathView
- [ ] Handle decoration placement separately
- [ ] Show empty plots for seed planting

---

## New Components Needed

### `src/components/garden/SeedPlantingModal.tsx`
Modal for choosing which pathway to start when planting a seed:
- Shows available skill paths (not yet started)
- User selects pathway
- User clicks position in garden
- Tree appears at stage 0

### `src/components/garden/LearningTree.tsx`
3D component for a learning tree with growth stages:
- Procedural mesh based on `growthStage` (0-14)
- Health indicator overlay
- Click handler to open PathView
- Decoration slots around base

### `src/components/garden/TreeCarePanel.tsx`
Panel for applying tree care items:
- Shows tree health and buffer days
- Apply watering can, sun lamp, etc.
- Shows gifted protection

---

## Shop Categories (Corrected)

The shop now has three categories:

### 1. Garden Decorations (Gems)
```typescript
const DECORATION_CATALOGUE: DecorationItem[] = [
  // Flowers (6)
  { id: 'rose',     name: 'Rose',           cost: 15, category: 'Flowers',   icon: '🌹' },
  { id: 'sunflwr',  name: 'Sunflower',      cost: 12, category: 'Flowers',   icon: '🌻' },
  { id: 'tulip',    name: 'Tulip',          cost: 10, category: 'Flowers',   icon: '🌷' },
  { id: 'lavender', name: 'Lavender',       cost: 10, category: 'Flowers',   icon: '💜' },
  { id: 'daisy',    name: 'Daisy',          cost: 8,  category: 'Flowers',   icon: '🌼' },
  { id: 'poppy',    name: 'Poppy',          cost: 10, category: 'Flowers',   icon: '🌺' },
  
  // Plants (2)
  { id: 'hedge',    name: 'Hedge Bush',     cost: 18, category: 'Plants',    icon: '🌿' },
  { id: 'mushroom', name: 'Mushroom',       cost: 8,  category: 'Plants',    icon: '🍄' },
  
  // Furniture (3)
  { id: 'bench',    name: 'Bench',          cost: 45, category: 'Furniture', icon: '🪑' },
  { id: 'lantern',  name: 'Lantern',        cost: 35, category: 'Furniture', icon: '🏮' },
  { id: 'sign',     name: 'Sign Post',      cost: 20, category: 'Furniture', icon: '🪧' },
  
  // Features (2)
  { id: 'fountain', name: 'Fountain',       cost: 80, category: 'Features',  icon: '⛲' },
  { id: 'pond',     name: 'Pond',           cost: 55, category: 'Features',  icon: '💧' },
];
```

### 2. Decoration Trees (Gems) - Cosmetic Only
```typescript
const DECORATION_TREES: DecorationItem[] = [
  { id: 'oak',      name: 'Oak Tree',       cost: 30, category: 'Trees', icon: '🌳' },
  { id: 'pine',     name: 'Pine Tree',      cost: 25, category: 'Trees', icon: '🌲' },
  { id: 'cherry',   name: 'Cherry Blossom', cost: 40, category: 'Trees', icon: '🌸' },
  { id: 'maple',    name: 'Autumn Maple',   cost: 35, category: 'Trees', icon: '🍁' },
  { id: 'willow',   name: 'Weeping Willow', cost: 45, category: 'Trees', icon: '🌿' },
  { id: 'palm',     name: 'Palm Tree',      cost: 38, category: 'Trees', icon: '🌴' },
];
```

**NOTE:** These are cosmetic trees only. They do NOT have growth stages, health, or pathways. They are placed like any other decoration.

### 3. Tree Care (Gems) - Consumables
```typescript
const TREE_CARE_ITEMS: TreeCareItem[] = [
  { id: 'watering_can', name: 'Watering Can', cost: 15, effect: 'health_buffer', bufferDays: 5, icon: '🚿' },
  { id: 'sun_lamp',     name: 'Sun Lamp',     cost: 20, effect: 'health_buffer', bufferDays: 5, icon: '💡' },
  { id: 'fertilizer',   name: 'Magic Fertilizer', cost: 25, effect: 'health_buffer', bufferDays: 5, icon: '✨' },
  { id: 'rainbow_pot',  name: 'Rainbow Pot',  cost: 30, effect: 'health_buffer', bufferDays: 5, icon: '🌈' },
];
```

---

## Migration Strategy

1. **Database Migration**
   - Add `sun_drops_earned` and `growth_stage` to `user_trees`
   - Add `grid_x` and `grid_z` to `user_trees`
   - Rename `garden_objects` to `garden_decorations`
   - Add `gems` and `seeds` to `profiles`
   - Remove global `sun_drops` from `profiles`

2. **Code Migration**
   - Update all references to global SunDrops
   - Split tree rendering into learning vs decoration
   - Update shop to use gems and remove learning trees
   - Add seed planting flow

3. **Backward Compatibility**
   - Existing mock data in `src/data/mockGameData.ts` needs updating
   - Test all existing components with new data structure

---

## Testing Checklist

### Learning Trees
- [ ] Seed can be planted at chosen position
- [ ] Tree appears at stage 0 (seedling)
- [ ] SunDrops earned go to correct tree
- [ ] Growth stage updates with SunDrops
- [ ] Visual changes at each growth stage
- [ ] Health decays without lessons
- [ ] Tree care items add buffer days
- [ ] Click opens PathView

### Decorations
- [ ] Shop shows gems currency
- [ ] Categories: Trees, Flowers, Plants, Furniture, Features
- [ ] Purchase deducts gems
- [ ] Placement works on grass tiles
- [ ] Cannot place on path tiles
- [ ] Decorations persist to database

### Seeds
- [ ] Earned from pathway completion
- [ ] Can choose pathway when planting
- [ ] Cannot plant without seeds
- [ ] Cannot plant pathway already started

### Shop
- [ ] Tree care category works
- [ ] Decoration purchase works
- [ ] Insufficient gems shows message

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Learning trees have per-tree SunDrops | [ ] |
| Growth stages render correctly (0-14) | [ ] |
| Decorations bought with gems | [ ] |
| Seeds plant learning trees | [ ] |
| Shop categories correct | [ ] |
| No confusion between tree types | [ ] |

---

## References

- **Task 1.1.11 (Gift System)** — Tree protection gifts, currency definitions
- **Task 1.1.13 (Seed Earning)** — Seeds from pathway completion
- **Task 1.1.8 (Garden State)** — Per-tree SunDrops (this doc updates it)
- **GARDEN_THREE_IMPLEMENTATION.md** — Decoration rendering (needs clarification)
- **GAME_DESIGN.md** — Original design intent