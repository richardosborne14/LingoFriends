# Task 1.1.10: Tree Health & Decay System

**Status:** ✅ Completed
**Phase:** B (Growth & Decay)
**Dependencies:** Task 1.1.8 (Garden State Management)
**Estimated Time:** 3-4 hours

---

## Objective

Implement the tree health and decay system that drives the spaced repetition mechanic. Trees lose health over time without review, encouraging kids to return regularly. This system is core to the engagement loop.

---

## Deliverables

### Files Created
- ✅ `src/services/treeHealthService.ts` — Health calculation and decay logic
- ✅ `src/hooks/useTreeHealth.tsx` — React hook for health updates
- ✅ `src/services/treeHealthService.test.ts` — Comprehensive unit tests (53 tests)

### Files Modified
- ✅ `src/hooks/useGarden.tsx` — Integrated treeHealthService and app-start health update

---

## Health & Decay Overview

### The Core Loop

```
┌─────────────────┐
│  Learn Lesson   │
│  (Earn Sun Drops)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tree Grows     │
│  (Health → 100%) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Days Pass      │
│  (Health Decays) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────────┐
│Review │  │ Tree Dies  │
│(Reset)│  │ (Health→5%)│
└───────┘  └───────────┘
```

### Health Calculation

From `GAME_DESIGN.md`:

| Days Since Review | Health |
|-------------------|--------|
| 0-2 days | 100% |
| 3-5 days | 85% |
| 6-10 days | 60% |
| 11-14 days | 35% |
| 15-21 days | 15% |
| 22+ days | 5% (minimum) |

### Gift Buffer Days

| Gift Type | Buffer Days |
|-----------|-------------|
| water_drop | 10 days |
| sparkle | 5 days |
| golden_flower | 15 days |
| seed | 0 (starts new trees) |
| ribbon | 0 (decoration only) |

---

## Implementation Summary

### Service Functions

```typescript
// Health calculations
calculateHealth(tree: UserTree): number
calculateDaysSinceRefresh(tree: UserTree): number
calculateBufferDays(tree: UserTree): number
getHealthCategory(health: number): 'healthy' | 'thirsty' | 'dying'
getHealthIndicator(health: number): { text: string; emoji: string; color: string }
getHealthDescription(tree: UserTree): string

// Utility functions
getGiftBufferDays(giftType: GiftType): number
getTreesNeedingRefresh(trees: UserTree[]): UserTree[]
getDyingTrees(trees: UserTree[]): UserTree[]
treeNeedsAttention(tree: UserTree): boolean

// Async functions (Pocketbase)
refreshTreeHealth(tree: UserTree): Promise<UserTree>
applyGiftBuffer(tree: UserTree, giftId: string): Promise<UserTree>
updateAllTreeHealth(userId: string): Promise<number>
getUserTrees(userId: string): Promise<UserTree[]>
```

### Hook Interface

```typescript
interface UseTreeHealthReturn {
  // Health calculations
  getHealth: (treeId: string) => number;
  getHealthCategory: (treeId: string) => 'healthy' | 'thirsty' | 'dying';
  getHealthIndicator: (treeId: string) => { text: string; emoji: string; color: string };
  getDaysSinceRefresh: (treeId: string) => number;
  getBufferDays: (treeId: string) => number;
  
  // Actions
  refreshTree: (treeId: string) => Promise<void>;
  applyGift: (treeId: string, giftId: string) => Promise<void>;
  updateAllTrees: () => Promise<number>;
  
  // Notifications
  treesNeedingRefresh: UserTree[];
  dyingTrees: UserTree[];
  treesNeedingAttention: number;
  
  // Tree access
  trees: UserTree[];
  getTree: (treeId: string) => UserTree | undefined;
}
```

---

## Testing Checklist

### Health Calculation
- [x] New tree has 100% health
- [x] Health decays correctly over time (0-2 days: 100%, 3-5: 85%, etc.)
- [x] Buffer days from gifts work (water_drop: 10, sparkle: 5, golden_flower: 15)
- [x] Health never goes below 5%
- [x] Category thresholds correct (healthy: 80+, thirsty: 40-79, dying: <40)

### Service Functions
- [x] calculateHealth() matches spec
- [x] calculateDaysSinceRefresh() works with past/future/null dates
- [x] calculateBufferDays() correctly sums unused gifts
- [x] getHealthCategory() returns correct values
- [x] getHealthIndicator() returns correct data
- [x] getHealthDescription() includes gift protection messages
- [x] refreshTreeHealth() updates tree
- [x] applyGiftBuffer() marks gift as used
- [x] getTreesNeedingRefresh() filters correctly (< 50%)
- [x] getDyingTrees() filters correctly (< 40%)
- [x] treeNeedsAttention() works correctly

### Hook
- [x] getHealth() returns correct values
- [x] refreshTree() updates health
- [x] applyGift() works correctly
- [x] treesNeedingRefresh filtered correctly
- [x] dyingTrees filtered correctly

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Health decays over time | ✅ |
| Gifts add buffer days | ✅ |
| UI shows correct indicators | ✅ |
| Refresh resets health | ✅ |
| Background updates work | ✅ (integrated in useGarden) |

---

## Test Results

```
✓ src/services/treeHealthService.test.ts (53 tests) 6ms
  ✓ calculateHealth > basic decay schedule (8 tests)
  ✓ calculateHealth > new trees (2 tests)
  ✓ calculateHealth > gift buffers (8 tests)
  ✓ calculateDaysSinceRefresh (4 tests)
  ✓ calculateBufferDays (5 tests)
  ✓ getHealthCategory (3 tests)
  ✓ getHealthIndicator (4 tests)
  ✓ getGiftBufferDays (1 test)
  ✓ getTreesNeedingRefresh (3 tests)
  ✓ getDyingTrees (3 tests)
  ✓ treeNeedsAttention (2 tests)
  ✓ getHealthDescription (5 tests)
  ✓ TREE_HEALTH_CONSTANTS (5 tests)
```

---

## Reference

- **GAME_DESIGN.md** — Section 6 (Spaced Repetition)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 9 (Decay Service)
- `src/services/sunDropService.ts` — Related calculations

---

## Notes for Future Enhancement

1. ~~Consider server-side health calculation for security~~ (works client-side for MVP)
2. Add daily notification scheduler for mobile apps
3. Consider timezone handling for "days since" edge cases
4. Add analytics for tree health patterns
5. Background fetch/cron job for server-side health updates (Phase 2)