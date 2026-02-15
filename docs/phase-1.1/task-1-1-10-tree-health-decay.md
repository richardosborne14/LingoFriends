# Task 1.1.10: Tree Health & Decay System

**Status:** Not Started
**Phase:** B (Growth & Decay)
**Dependencies:** Task 1.1.8 (Garden State Management)
**Estimated Time:** 3-4 hours

---

## Objective

Implement the tree health and decay system that drives the spaced repetition mechanic. Trees lose health over time without review, encouraging kids to return regularly. This system is core to the engagement loop.

---

## Deliverables

### Files to Create
- `src/services/treeHealthService.ts` — Health calculation and decay logic
- `src/hooks/useTreeHealth.tsx` — React hook for health updates

### Files to Modify
- `src/services/sunDropService.ts` — Add tree health calculations (already exists)
- `src/hooks/useGarden.tsx` — Integrate health updates

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

---

## Tree Health Service

### Interface

```typescript
// src/services/treeHealthService.ts

import type { UserTree } from '@/types/game';

interface TreeHealthService {
  calculateHealth(tree: UserTree): number;
  calculateDaysSinceRefresh(tree: UserTree): number;
  getHealthCategory(health: number): 'healthy' | 'thirsty' | 'dying';
  getHealthIndicator(health: number): { text: string; emoji: string; color: string };
  refreshTreeHealth(tree: UserTree): Promise<UserTree>;
  applyGiftBuffer(tree: UserTree, giftType: string): Promise<UserTree>;
  getTreesNeedingRefresh(trees: UserTree[]): UserTree[];
}
```

### Implementation

```typescript
// src/services/treeHealthService.ts

import { pocketbaseService } from './pocketbaseService';
import type { UserTree } from '@/types/game';

/** Health thresholds */
const HEALTH_THRESHOLDS = [
  { maxDays: 2, health: 100 },
  { maxDays: 5, health: 85 },
  { maxDays: 10, health: 60 },
  { maxDays: 14, health: 35 },
  { maxDays: 21, health: 15 },
  { maxDays: Infinity, health: 5 },
] as const;

/** Minimum health (tree never dies completely) */
const MIN_HEALTH = 5;

/** Days of buffer per gift */
const GIFT_BUFFER_DAYS: Record<string, number> = {
  water_drop: 10,
  sparkle: 5,
  seed: 0,  // Seeds don't affect health
  ribbon: 0, // Decorations don't affect health
  golden_flower: 15,
};

/**
 * Calculate tree health based on days since last refresh.
 * Gifts add buffer days before decay kicks in.
 */
export function calculateHealth(tree: UserTree): number {
  const daysSinceRefresh = calculateDaysSinceRefresh(tree);
  const bufferDays = calculateBufferDays(tree);
  
  const effectiveDays = Math.max(0, daysSinceRefresh - bufferDays);
  
  for (const threshold of HEALTH_THRESHOLDS) {
    if (effectiveDays <= threshold.maxDays) {
      return threshold.health;
    }
  }
  
  return MIN_HEALTH;
}

/**
 * Calculate days since last refresh.
 */
export function calculateDaysSinceRefresh(tree: UserTree): number {
  if (!tree.lastRefreshDate) {
    return 0; // New tree starts at full health
  }
  
  const lastRefresh = new Date(tree.lastRefreshDate);
  const now = new Date();
  const diffMs = now.getTime() - lastRefresh.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Calculate buffer days from gifts.
 */
function calculateBufferDays(tree: UserTree): number {
  if (!tree.giftsReceived) return 0;
  
  return tree.giftsReceived
    .filter(gift => !gift.appliedDate) // Not yet used
    .reduce((total, gift) => {
      return total + (GIFT_BUFFER_DAYS[gift.type] || 0);
    }, 0);
}

/**
 * Get health category for visual display.
 */
export function getHealthCategory(health: number): 'healthy' | 'thirsty' | 'dying' {
  if (health >= 80) return 'healthy';
  if (health >= 40) return 'thirsty';
  return 'dying';
}

/**
 * Get health indicator for UI.
 */
export function getHealthIndicator(health: number): { text: string; emoji: string; color: string } {
  const category = getHealthCategory(health);
  
  switch (category) {
    case 'healthy':
      return { text: 'Healthy', emoji: '✓', color: 'green' };
    case 'thirsty':
      return { text: 'Thirsty', emoji: '💧', color: 'amber' };
    case 'dying':
      return { text: 'Dying!', emoji: '🆘', color: 'red' };
  }
}

/**
 * Refresh tree health after reviewing a lesson.
 */
export async function refreshTreeHealth(tree: UserTree): Promise<UserTree> {
  const now = new Date().toISOString();
  
  const updatedTree = await pocketbaseService.updateTree(tree.id, {
    lastRefreshDate: now,
    health: 100,
  });
  
  return updatedTree;
}

/**
 * Apply a gift to add buffer days.
 */
export async function applyGiftBuffer(tree: UserTree, giftId: string): Promise<UserTree> {
  const gift = tree.giftsReceived?.find(g => g.id === giftId);
  if (!gift) throw new Error('Gift not found');
  
  const bufferDays = GIFT_BUFFER_DAYS[gift.type] || 0;
  if (bufferDays === 0) return tree; // Non-buffer gifts don't affect health
  
  // Mark gift as applied
  const updatedGifts = tree.giftsReceived?.map(g => 
    g.id === giftId ? { ...g, appliedDate: new Date().toISOString() } : g
  ) || [];
  
  const updatedTree = await pocketbaseService.updateTree(tree.id, {
    giftsReceived: updatedGifts,
  });
  
  return updatedTree;
}

/**
 * Get all trees that need refresh (health below threshold).
 */
export function getTreesNeedingRefresh(trees: UserTree[]): UserTree[] {
  return trees.filter(tree => {
    const health = calculateHealth(tree);
    return health < 50; // Thirsty or dying
  });
}

/**
 * Update all tree health values (for daily cron job or app start).
 */
export async function updateAllTreeHealth(userId: string): Promise<void> {
  const trees = await pocketbaseService.getUserTrees(userId);
  
  for (const tree of trees) {
    const health = calculateHealth(tree);
    if (health !== tree.health) {
      await pocketbaseService.updateTree(tree.id, { health });
    }
  }
}
```

---

## useTreeHealth Hook

### Purpose
Subscribe to tree health changes and provide UI helpers.

### Interface

```typescript
interface UseTreeHealthReturn {
  // Health calculations
  getHealth: (treeId: string) => number;
  getHealthCategory: (treeId: string) => 'healthy' | 'thirsty' | 'dying';
  getHealthIndicator: (treeId: string) => { text: string; emoji: string; color: string };
  
  // Actions
  refreshTree: (treeId: string) => Promise<void>;
  applyGift: (treeId: string, giftId: string) => Promise<void>;
  
  // Notifications
  treesNeedingRefresh: UserTree[];
  dyingTrees: UserTree[];
}
```

### Implementation

```typescript
// src/hooks/useTreeHealth.tsx

import { useMemo, useCallback } from 'react';
import { useGarden } from './useGarden';
import { 
  calculateHealth, 
  getHealthCategory, 
  getHealthIndicator,
  refreshTreeHealth,
  applyGiftBuffer,
  getTreesNeedingRefresh,
} from '@/services/treeHealthService';

export function useTreeHealth(): UseTreeHealthReturn {
  const { trees, refreshGarden } = useGarden();
  
  // Build health map
  const healthMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tree of trees) {
      map.set(tree.id, calculateHealth(tree));
    }
    return map;
  }, [trees]);
  
  const getHealth = useCallback((treeId: string): number => {
    return healthMap.get(treeId) ?? 100;
  }, [healthMap]);
  
  const getHealthCategoryById = useCallback((treeId: string) => {
    return getHealthCategory(getHealth(treeId));
  }, [getHealth]);
  
  const getHealthIndicatorById = useCallback((treeId: string) => {
    return getHealthIndicator(getHealth(treeId));
  }, [getHealth]);
  
  const refreshTree = useCallback(async (treeId: string) => {
    const tree = trees.find(t => t.id === treeId);
    if (!tree) throw new Error('Tree not found');
    
    await refreshTreeHealth(tree);
    await refreshGarden();
  }, [trees, refreshGarden]);
  
  const applyGift = useCallback(async (treeId: string, giftId: string) => {
    const tree = trees.find(t => t.id === treeId);
    if (!tree) throw new Error('Tree not found');
    
    await applyGiftBuffer(tree, giftId);
    await refreshGarden();
  }, [trees, refreshGarden]);
  
  const treesNeedingRefresh = useMemo(() => {
    return getTreesNeedingRefresh(trees);
  }, [trees]);
  
  const dyingTrees = useMemo(() => {
    return trees.filter(tree => getHealth(tree.id) < 40);
  }, [trees, getHealth]);
  
  return {
    getHealth,
    getHealthCategory: getHealthCategoryById,
    getHealthIndicator: getHealthIndicatorById,
    refreshTree,
    applyGift,
    treesNeedingRefresh,
    dyingTrees,
  };
}
```

---

## Background Health Updates

### App Start Check

When the app loads, update all tree health values:

```typescript
// In App.tsx or GardenProvider

useEffect(() => {
  // Update tree health on app start
  updateAllTreeHealth(userId);
}, []);
```

### Daily Check (Optional)

For mobile apps, schedule a background task:

```typescript
// Using expo-task-manager or similar

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const TASK_NAME = 'update-tree-health';

TaskManager.defineTask(TASK_NAME, async () => {
  const userId = await getCurrentUserId();
  await updateAllTreeHealth(userId);
  
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Register in app startup
await BackgroundFetch.registerTaskAsync(TASK_NAME, {
  minimumInterval: 60 * 60 * 24, // 24 hours
});
```

---

## Visual Indicators

### Health Badge Colors

```typescript
// CSS classes for health indicators

// Healthy (80-100%)
.health-healthy {
  background-color: #10b981; // green-500
  color: white;
}

// Thirsty (40-79%)
.health-thirsty {
  background-color: #f59e0b; // amber-500
  color: white;
}

// Dying (0-39%)
.health-dying {
  background-color: #ef4444; // red-500
  color: white;
  animation: bounce 1s infinite;
}
```

### Tree Visual States

```typescript
// In MiniTree and GardenTree components

const getTreeVariant = (health: number): TreeVariant => {
  if (health < 20) return 'dying';     // Bare branches
  if (health < 40) return 'critical';  // Few leaves
  if (health < 60) return 'wilted';    // Yellowing
  if (health < 80) return 'healthy';   // Full leaves
  return 'blooming';                   // Blossoms
};
```

---

## Notifications

### Push Notifications (Future)

```typescript
// Notify when tree is dying

async function checkAndNotify(userId: string) {
  const dyingTrees = await getDyingTrees(userId);
  
  if (dyingTrees.length > 0) {
    await sendPushNotification({
      title: '🌸 Your trees need help!',
      body: `${dyingTrees.length} of your trees are wilting. Give them some love!`,
      data: { type: 'tree_health', trees: dyingTrees.map(t => t.id) },
    });
  }
}
```

---

## Testing Checklist

### Health Calculation
- [ ] New tree has 100% health
- [ ] Health decays correctly over time
- [ ] Buffer days from gifts work
- [ ] Health never goes below 5%
- [ ] Category thresholds correct

### Service Functions
- [ ] calculateHealth() matches spec
- [ ] calculateDaysSinceRefresh() works
- [ ] getHealthCategory() returns correct values
- [ ] getHealthIndicator() returns correct data
- [ ] refreshTreeHealth() updates tree
- [ ] applyGiftBuffer() marks gift as used

### Hook
- [ ] getHealth() returns correct values
- [ ] refreshTree() updates health
- [ ] applyGift() works correctly
- [ ] treesNeedingRefresh filtered correctly
- [ ] dyingTrees filtered correctly

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Health decays over time | [ ] |
| Gifts add buffer days | [ ] |
| UI shows correct indicators | [ ] |
| Refresh resets health | [ ] |
| Background updates work | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 6 (Spaced Repetition)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 9 (Decay Service)
- `src/services/sunDropService.ts` — Related calculations

---

## Notes for Implementation

1. Consider server-side health calculation for security
2. Add daily notification scheduler
3. Test edge cases (new tree, multiple gifts)
4. Consider timezone handling for "days since"
5. Add analytics for tree health patterns