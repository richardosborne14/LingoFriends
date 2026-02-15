# Task 1.1.13: Seed Earning Mechanics

**Status:** Not Started
**Phase:** C (Social & Rewards)
**Dependencies:** Task 1.1.11 (Gift System)
**Estimated Time:** 2-3 hours

---

## Objective

Implement the seed earning system that rewards players with seeds for completing skill paths. Seeds allow players to start new skill paths (plant new trees) in their garden.

---

## Deliverables

### Files to Modify
- `src/services/giftService.ts` — Add seed earning logic
- `src/components/lesson/LessonComplete.tsx` — Show seed unlock
- `src/components/garden/GardenWorld.tsx` — Add seed planting flow
- `src/components/shared/SeedInventory.tsx` — New component for seed display

---

## Seed Earning Rules

| Condition | Reward |
|-----------|--------|
| Complete all lessons in a path | 1 Seed |
| Get 3 stars on all lessons | 1 bonus Seed |
| Daily streak (7+ days) | 1 Seed |
| Gift from friend | 1 Seed |

---

## Seed Service Extension

```typescript
// Add to src/services/giftService.ts or create src/services/seedService.ts

import type { UserTree, SkillPath } from '@/types/game';

/**
 * Check if completing a lesson earns a seed.
 * Seeds are earned when all lessons in a path are complete.
 */
export function checkSeedEarned(
  tree: UserTree,
  lessonId: string
): { earned: boolean; reason: string } {
  // Check if this was the last lesson
  if (tree.lessonsCompleted + 1 === tree.lessonsTotal) {
    return {
      earned: true,
      reason: `You completed ${tree.name}! 🎉`,
    };
  }
  
  return { earned: false, reason: '' };
}

/**
 * Check for bonus seed (3 stars on all lessons).
 */
export function checkBonusSeedEarned(
  tree: UserTree,
  lessonResults: { stars: number }[]
): { earned: boolean; reason: string } {
  const allThreeStars = lessonResults.every(r => r.stars === 3);
  
  if (allThreeStars && tree.lessonsCompleted === tree.lessonsTotal) {
    return {
      earned: true,
      reason: 'Perfect path! All 3-star lessons! ⭐⭐⭐',
    };
  }
  
  return { earned: false, reason: '' };
}

/**
 * Get available skill paths for planting.
 */
export async function getAvailableSkillPaths(userId: string): Promise<SkillPath[]> {
  // Get all skill paths
  const allPaths = await pocketbaseService.getList('skill_paths', {});
  
  // Get user's existing trees
  const userTrees = await pocketbaseService.getUserTrees(userId);
  const existingPathIds = new Set(userTrees.map(t => t.skillPathId));
  
  // Filter to paths user doesn't have yet
  return allPaths.filter(path => !existingPathIds.has(path.id));
}

/**
 * Plant a seed (create a new tree).
 */
export async function plantSeed(
  userId: string,
  skillPathId: string,
  position: { x: number; y: number }
): Promise<UserTree> {
  // Deduct a seed from user
  await pocketbaseService.updateProfile({
    seeds: profile.seeds - 1,
  });
  
  // Get skill path info
  const skillPath = await pocketbaseService.get('skill_paths', skillPathId);
  
  // Create the tree
  const tree = await pocketbaseService.create('user_trees', {
    user: userId,
    skillPathId,
    name: skillPath.name,
    icon: skillPath.icon,
    status: 'seed',
    health: 100,
    sunDropsTotal: 0,
    lessonsCompleted: 0,
    lessonsTotal: skillPath.lessons.length,
    lastRefreshDate: new Date().toISOString(),
    position,
    decorations: [],
    giftsReceived: [],
  });
  
  return tree;
}
```

---

## SeedInventory Component

```typescript
// src/components/shared/SeedInventory.tsx

import { motion, AnimatePresence } from 'framer-motion';

interface SeedInventoryProps {
  seedCount: number;
  onPlantSeed: () => void;
  availablePaths: SkillPath[];
  hasSpace: boolean;
}

export function SeedInventory({ seedCount, onPlantSeed, availablePaths, hasSpace }: SeedInventoryProps) {
  const [showPicker, setShowPicker] = useState(false);
  
  return (
    <div className="seed-inventory">
      <div className="seed-count">
        <span className="seed-emoji">🌱</span>
        <span className="seed-number">{seedCount}</span>
      </div>
      
      {seedCount > 0 && hasSpace && (
        <button
          className="plant-btn"
          onClick={() => setShowPicker(true)}
        >
          Plant Seed
        </button>
      )}
      
      <AnimatePresence>
        {showPicker && (
          <SeedPicker
            paths={availablePaths}
            onSelect={(pathId) => {
              onPlantSeed(pathId);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SeedPicker({ paths, onSelect, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="seed-picker-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="seed-picker"
      >
        <h2>🌱 Plant a New Skill Path</h2>
        <p>Choose what you want to learn:</p>
        
        <div className="path-grid">
          {paths.map(path => (
            <motion.button
              key={path.id}
              className="path-card"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(path.id)}
            >
              <span className="path-icon">{path.icon}</span>
              <span className="path-name">{path.name}</span>
              <span className="path-lessons">{path.lessons.length} lessons</span>
            </motion.button>
          ))}
        </div>
        
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
```

---

## Seed Unlock Animation

```typescript
// Add to LessonComplete.tsx

function LessonComplete({ ... }: Props) {
  const [seedEarned, setSeedEarned] = useState<{ earned: boolean; reason: string } | null>(null);
  
  useEffect(() => {
    // Check if path completed
    const result = checkSeedEarned(tree, lessonId);
    if (result.earned) {
      setSeedEarned(result);
      // Add seed to profile
      addSeedToProfile(userId);
    }
  }, [tree, lessonId]);
  
  return (
    <div className="lesson-complete">
      {/* ... existing content ... */}
      
      <AnimatePresence>
        {seedEarned?.earned && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="seed-unlock"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="seed-icon"
            >
              🌱
            </motion.div>
            <h2>Seed Earned!</h2>
            <p>{seedEarned.reason}</p>
            <button onClick={() => setSeedEarned(null)}>
              Awesome!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Garden Integration

```typescript
// Add to GardenWorld.tsx

function GardenWorld({ ... }: Props) {
  const [showSeedPicker, setShowSeedPicker] = useState(false);
  const [emptyPlots, setEmptyPlots] = useState<{ x: number; y: number }[]>([]);
  
  // Calculate empty plots
  useEffect(() => {
    const occupied = trees.map(t => t.position);
    const plots = GARDEN_PLOTS.filter(plot => 
      !occupied.some(o => Math.abs(o.x - plot.x) < 30 && Math.abs(o.y - plot.y) < 30)
    );
    setEmptyPlots(plots);
  }, [trees]);
  
  const handlePlantSeed = async (skillPathId: string, position: { x: number; y: number }) => {
    const tree = await plantSeed(userId, skillPathId, position);
    setTrees(prev => [...prev, tree]);
    setShowSeedPicker(false);
  };
  
  return (
    <div className="garden-world">
      {/* ... existing content ... */}
      
      {/* Empty plots */}
      {emptyPlots.map((plot, i) => (
        <button
          key={i}
          className="empty-plot"
          style={{ left: plot.x, top: plot.y }}
          onClick={() => setShowSeedPicker(true)}
        >
          <span className="plot-icon">➕</span>
          <span className="plot-label">Plant</span>
        </button>
      ))}
      
      {/* Seed inventory in header */}
      <SeedInventory
        seedCount={profile.seeds}
        onPlantSeed={handlePlantSeed}
        availablePaths={availablePaths}
        hasSpace={emptyPlots.length > 0}
      />
    </div>
  );
}
```

---

## Testing Checklist

### Seed Earning
- [ ] Seed earned on path completion
- [ ] Bonus seed for all 3-star lessons
- [ ] Seed shown in UI
- [ ] Seed count persists

### Seed Planting
- [ ] Can select skill path
- [ ] Tree appears in garden
- [ ] Seed subtracted
- [ ] Position saved correctly

### Empty Plots
- [ ] Empty plots show correctly
- [ ] Cannot plant on occupied plot
- [ ] Plot disappears after planting

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Seeds earned correctly | [ ] |
| Planting flow works | [ ] |
| UI shows seed count | [ ] |
| Empty plots functional | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 10 (Gift System - Seeds)
- Task 1.1.11 (Gift System) — Seed gift type
- Task 1.1.5 (Garden World) — Empty plots

---

## Notes for Implementation

1. Add `seeds` field to profiles collection
2. Define `GARDEN_PLOTS` constant for available positions
3. Consider seed cap (max 5?)
4. Add seed animation when earned
5. Show seed count in header