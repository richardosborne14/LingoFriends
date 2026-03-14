# Task: SRS ↔ Tree Health Synchronisation

**Status:** Not Started  
**Phase:** Post-1.2 (Pedagogy Core)  
**Dependencies:** Task 1.2.10 (Chunk SRS System), Task 1.1.10 (Tree Health & Decay), Task F (Post-Lesson SRS Write-back)  
**Estimated Time:** 8–12 hours  
**Priority:** Critical — this is the invisible pedagogy that makes the game a real learning tool

---

## Problem Statement

Two spaced repetition systems exist independently:

1. **Tree Health Decay** (`treeHealthService.ts`) — Time-based. Trees lose health based on `lastRefreshDate`. A tree that hasn't been reviewed in 5 days drops to 85%, 10 days to 60%, etc. This drives the visual "wilting tree" mechanic.

2. **Chunk SRS** (`chunkManager.ts`) — SM-2 algorithm. Each chunk has `next_review_date`, `ease_factor`, `interval`, and `status` (new/learning/acquired/fragile). This tracks individual vocabulary acquisition.

**The problem:** These systems don't talk to each other. Tree health is purely time-based and doesn't reflect actual chunk knowledge. A learner could have perfectly acquired all chunks in a skill path, but the tree still wilts on schedule. Conversely, a learner who "refreshed" their tree by doing a lesson might have badly fragile chunks that need targeted review.

**The goal:** Make tree health a visible manifestation of actual chunk acquisition status. When chunks become fragile, the tree wilts. When the learner reviews fragile chunks successfully, the tree heals. The child never knows about SRS — they just see their trees getting thirsty and water them with revision lessons that happen to target exactly the right vocabulary at exactly the right time.

---

## Design Philosophy

> "The best pedagogic design is one where the users don't know they're even learning."

The child sees: "Oh no, my French Greetings tree is wilting! I need to water it!"  
What actually happens: The SRS system detected that 4 chunks from the Greetings skill path are overdue for review. The tree health calculation reflects this. The "water" lesson specifically targets those 4 chunks using varied activities in new contexts.

The metaphor is seamless. The game mechanic IS the pedagogy.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Chunk SRS Layer                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │  user_chunks (PocketBase)                          │     │
│  │  - status: new | learning | acquired | fragile     │     │
│  │  - next_review_date: datetime                      │     │
│  │  - ease_factor: 1.3-2.5                            │     │
│  │  - interval: days until next review                │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│                   reads chunk status                         │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │  treeHealthService.ts (MODIFIED)                    │     │
│  │                                                     │     │
│  │  NEW: calculateHealthFromChunks()                   │     │
│  │  - Query all user_chunks for this skill path        │     │
│  │  - Weight by status: acquired=healthy, fragile=sick │     │
│  │  - Blend with time-based decay (hybrid approach)    │     │
│  │  - Return health 0-100                              │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│                   health drives visual                       │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Garden Trees (Three.js)                            │     │
│  │  - Health 100%: Lush, blooming                      │     │
│  │  - Health 60%: Slightly faded, some leaves drop     │     │
│  │  - Health 35%: Wilting, brown patches               │     │
│  │  - Health 15%: Nearly bare, urgent badge            │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Revision Lesson Generator (NEW)                    │     │
│  │                                                     │     │
│  │  When user taps "Refresh" on wilting tree:          │     │
│  │  1. Query fragile + overdue chunks for skill path   │     │
│  │  2. Generate SHORT lesson (3-5 steps) targeting     │     │
│  │     those specific chunks in NEW contexts           │     │
│  │  3. On completion: update chunk SRS → tree heals    │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Link Chunks to Skill Paths (Data Layer)

Currently, `user_chunks` records don't have a direct link to skill paths (trees). We need to know which chunks belong to which tree so tree health can be derived from chunk status.

**Option A (preferred): Use the `first_encountered_in` field**

The `user_chunks` table already has `first_encountered_in` (string field). When a chunk is first encountered in a lesson, this should be set to the skill path ID. Then we can query chunks by skill path.

**File:** `src/services/chunkManager.ts` (MODIFY)

Ensure `recordEncounter()` sets `first_encountered_in` to the skill path ID on first encounter:

```typescript
/**
 * Record an encounter with a chunk.
 * If this is the first encounter, set the skill path association.
 */
async recordEncounter(
  userId: string,
  chunkId: string,
  result: EncounterResultInput,
  skillPathId?: string,  // NEW PARAMETER
): Promise<EncounterResult> {
  let userChunk = await this.getOrCreateUserChunk(userId, chunkId);

  // On first encounter, associate with the skill path
  if (userChunk.totalEncounters === 0 && skillPathId) {
    userChunk.firstEncounteredIn = skillPathId;
  }

  // ... existing SRS calculation ...
}
```

**Option B (if Option A is insufficient): Add a `skill_path` relation field to `user_chunks`**

Add a new relation field `skill_path` to the `user_chunks` PocketBase collection that references `skill_paths`. This is more explicit but requires a schema migration.

**Recommendation:** Start with Option A. It's simpler and the data is already there. If we need more robust querying later, add the relation.

---

### Step 2 — Chunk Health Score Calculator

**File:** `src/services/chunkHealthCalculator.ts` (NEW)

This is the bridge between chunk SRS status and tree health. It queries all chunks for a skill path and derives a health score.

```typescript
// src/services/chunkHealthCalculator.ts

import { pb } from '../../services/pocketbaseService';
import type { ChunkStatus } from '../types/pedagogy';

/**
 * Health contribution of each chunk status.
 *
 * Acquired chunks contribute full health.
 * Learning chunks contribute partial health (actively being practiced).
 * Fragile chunks are a health drain (overdue for review).
 * New chunks are neutral (haven't been taught yet).
 */
const STATUS_HEALTH_WEIGHT: Record<ChunkStatus, number> = {
  acquired: 1.0,    // Fully healthy
  learning: 0.6,    // Partially healthy — still being practiced
  fragile: 0.15,    // Urgent — needs review
  new: 0.5,         // Neutral — not yet encountered
};

/**
 * Additional health penalty for chunks past their review date.
 * The further past due, the more health penalty.
 */
const OVERDUE_PENALTY_PER_DAY = 0.02; // 2% per day overdue

/**
 * Minimum health — trees never die completely.
 */
const MIN_HEALTH = 5;

/**
 * Result of calculating tree health from chunk data.
 */
export interface ChunkHealthResult {
  /** Overall health score (0-100) */
  health: number;
  /** Total chunks associated with this skill path */
  totalChunks: number;
  /** Breakdown by status */
  breakdown: {
    acquired: number;
    learning: number;
    fragile: number;
    new: number;
  };
  /** Number of chunks overdue for review */
  overdueCount: number;
  /** Most urgent chunk IDs (for revision lesson generation) */
  urgentChunkIds: string[];
  /** Average days overdue for fragile chunks */
  avgDaysOverdue: number;
}

/**
 * Calculate tree health from its associated chunks.
 *
 * Algorithm:
 * 1. Query all user_chunks where first_encountered_in = skillPathId
 * 2. For each chunk, compute a health contribution based on status
 * 3. Apply overdue penalties for chunks past next_review_date
 * 4. Average all contributions to get overall health (0-100)
 *
 * If no chunks exist yet (brand new tree), returns 100 (healthy).
 *
 * @param userId - User ID
 * @param skillPathId - Skill path (tree) ID
 * @returns ChunkHealthResult with health score and breakdown
 */
export async function calculateHealthFromChunks(
  userId: string,
  skillPathId: string,
): Promise<ChunkHealthResult> {
  try {
    // Query all user_chunks for this skill path
    const userChunks = await pb.collection('user_chunks').getFullList({
      filter: `user = "${userId}" && first_encountered_in = "${skillPathId}"`,
      sort: 'next_review_date',
    });

    // No chunks yet — tree is brand new, full health
    if (userChunks.length === 0) {
      return {
        health: 100,
        totalChunks: 0,
        breakdown: { acquired: 0, learning: 0, fragile: 0, new: 0 },
        overdueCount: 0,
        urgentChunkIds: [],
        avgDaysOverdue: 0,
      };
    }

    const now = new Date();
    const breakdown = { acquired: 0, learning: 0, fragile: 0, new: 0 };
    let totalHealthScore = 0;
    let overdueCount = 0;
    let totalDaysOverdue = 0;
    const urgentChunkIds: string[] = [];

    for (const record of userChunks) {
      const status = record.status as ChunkStatus;
      breakdown[status] = (breakdown[status] || 0) + 1;

      // Base health contribution from status
      let chunkHealth = STATUS_HEALTH_WEIGHT[status] ?? 0.5;

      // Apply overdue penalty
      const nextReview = new Date(record.next_review_date);
      if (nextReview < now && status !== 'new') {
        const daysOverdue = (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);
        const penalty = daysOverdue * OVERDUE_PENALTY_PER_DAY;
        chunkHealth = Math.max(0, chunkHealth - penalty);
        overdueCount++;
        totalDaysOverdue += daysOverdue;

        // Track the most urgent chunks (most overdue)
        urgentChunkIds.push(record.chunk);
      }

      totalHealthScore += chunkHealth;
    }

    // Average health across all chunks, scaled to 0-100
    const avgHealth = (totalHealthScore / userChunks.length) * 100;
    const clampedHealth = Math.max(MIN_HEALTH, Math.min(100, Math.round(avgHealth)));

    // Sort urgent chunks by most overdue first
    // (they're already sorted by next_review_date from the query)

    return {
      health: clampedHealth,
      totalChunks: userChunks.length,
      breakdown,
      overdueCount,
      urgentChunkIds: urgentChunkIds.slice(0, 10), // Cap at 10 most urgent
      avgDaysOverdue: overdueCount > 0 ? totalDaysOverdue / overdueCount : 0,
    };
  } catch (error) {
    console.error('[chunkHealthCalculator] Failed to calculate health:', error);
    // On error, fall back to time-based health (don't break the UI)
    return {
      health: 100, // Optimistic fallback
      totalChunks: 0,
      breakdown: { acquired: 0, learning: 0, fragile: 0, new: 0 },
      overdueCount: 0,
      urgentChunkIds: [],
      avgDaysOverdue: 0,
    };
  }
}
```

---

### Step 3 — Hybrid Tree Health Calculation

**File:** `src/services/treeHealthService.ts` (MODIFY)

Modify the existing `calculateTreeHealth()` function to use a hybrid approach: blend chunk-based health with time-based health. This ensures the system works even when chunks haven't been tracked yet (cold start).

```typescript
import { calculateHealthFromChunks, type ChunkHealthResult } from './chunkHealthCalculator';

/**
 * Calculate tree health using a hybrid approach.
 *
 * The hybrid blends two signals:
 * 1. CHUNK-BASED HEALTH (primary): Derived from SRS status of associated chunks
 * 2. TIME-BASED HEALTH (secondary): Derived from days since last refresh
 *
 * Blending strategy:
 * - If the tree has chunks tracked (> 0): weight 70% chunk, 30% time
 * - If no chunks yet (new tree): weight 100% time
 * - This ensures new trees still decay and old trees reflect actual knowledge
 *
 * @param tree - The UserTree record
 * @param userId - User ID for chunk queries
 * @returns Health value 0-100
 */
export async function calculateTreeHealthHybrid(
  tree: UserTree,
  userId: string,
): Promise<{
  health: number;
  chunkResult: ChunkHealthResult | null;
}> {
  // 1. Calculate time-based health (existing logic)
  const timeBased = calculateTreeHealthFromTime(tree);

  // 2. Calculate chunk-based health
  let chunkResult: ChunkHealthResult | null = null;
  let chunkBased = timeBased; // Fallback to time-based

  try {
    chunkResult = await calculateHealthFromChunks(userId, tree.skillPathId);

    if (chunkResult.totalChunks > 0) {
      chunkBased = chunkResult.health;
    }
  } catch (error) {
    console.warn('[treeHealthService] Chunk health calculation failed, using time-based:', error);
  }

  // 3. Blend the two signals
  let health: number;

  if (chunkResult && chunkResult.totalChunks > 0) {
    // Has chunk data — primarily use chunk health
    // But keep some time influence so trees still feel "alive" even if all chunks are acquired
    health = Math.round(chunkBased * 0.7 + timeBased * 0.3);
  } else {
    // No chunk data yet — pure time-based
    health = timeBased;
  }

  // Clamp to valid range
  health = Math.max(MIN_HEALTH, Math.min(MAX_HEALTH, health));

  return { health, chunkResult };
}

/**
 * Extract the time-based health calculation into its own function.
 * This is the EXISTING logic from calculateTreeHealth(), just renamed.
 */
function calculateTreeHealthFromTime(tree: UserTree): number {
  // ... move existing calculateTreeHealth() logic here ...
  // (the threshold-based calculation using lastRefreshDate, bufferDays, etc.)
}
```

**Important:** The existing `calculateTreeHealth()` function should be preserved as `calculateTreeHealthFromTime()` and the new `calculateTreeHealthHybrid()` becomes the primary function. Update all callers of `calculateTreeHealth()` to use `calculateTreeHealthHybrid()`.

---

### Step 4 — Batch Health Update on App Startup

**File:** `src/services/treeHealthService.ts` (MODIFY)

The existing `batchUpdateHealth()` function runs on app startup to update all tree health values. Modify it to use the hybrid approach:

```typescript
/**
 * Batch update all tree health values on app startup.
 * Uses hybrid (chunk + time) health calculation.
 *
 * MODIFIED: Now async because chunk health requires PocketBase queries.
 * Non-fatal: if any individual tree update fails, continue with the rest.
 */
export async function batchUpdateHealthHybrid(
  trees: UserTree[],
  userId: string,
): Promise<UserTree[]> {
  const updatedTrees: UserTree[] = [];

  for (const tree of trees) {
    try {
      const { health, chunkResult } = await calculateTreeHealthHybrid(tree, userId);

      // Only update PocketBase if health actually changed
      if (health !== tree.health) {
        await pb.collection('user_trees').update(tree.id, { health });

        updatedTrees.push({
          ...tree,
          health,
          // Store chunk metadata for the garden UI to show status badges
          _chunkResult: chunkResult,
        } as UserTree);
      } else {
        updatedTrees.push(tree);
      }
    } catch (error) {
      console.warn(`[treeHealthService] Failed to update tree ${tree.id}:`, error);
      updatedTrees.push(tree); // Keep the old health value
    }
  }

  return updatedTrees;
}
```

---

### Step 5 — Revision Lesson Generator

**File:** `src/services/revisionLessonGenerator.ts` (NEW)

When a tree is wilting and the user taps "Refresh", this service generates a targeted revision lesson using the most overdue chunks.

```typescript
// src/services/revisionLessonGenerator.ts

import { pb } from '../../services/pocketbaseService';
import { pedagogyEngine } from './pedagogyEngine';
import { lessonGeneratorV2 } from './lessonGeneratorV2';
import { learnerProfileService } from './learnerProfileService';
import { calculateHealthFromChunks } from './chunkHealthCalculator';
import { planActivitySequence } from './activitySequencer';
import type { LessonPlan } from '../types/game';

/**
 * Revision lesson configuration.
 * Revision lessons are SHORT — 3-5 steps, not 5-8.
 * They feel like "checking in" not "doing homework."
 */
const REVISION_CONFIG = {
  /** Maximum steps in a revision lesson */
  maxSteps: 5,
  /** Minimum steps (at least 1 INFO + 2 quiz) */
  minSteps: 3,
  /** Maximum chunks to review per lesson */
  maxChunks: 4,
  /** Session duration estimate (minutes) */
  duration: 5,
};

/**
 * Result of generating a revision lesson.
 */
export interface RevisionLessonResult {
  /** The generated lesson plan */
  lesson: LessonPlan;
  /** Chunk IDs being reviewed (for SRS update after completion) */
  reviewedChunkIds: string[];
  /** Whether this is a true SRS revision or a fallback */
  isTargetedRevision: boolean;
}

/**
 * Generate a revision lesson for a wilting tree.
 *
 * This is the magic bridge between the game mechanic and the pedagogy:
 * - Child sees: "My tree is thirsty, I need to water it!"
 * - System does: Pull overdue chunks, generate activities in NEW contexts,
 *   present them as a short, fun lesson.
 * - Result: Child reviews exactly the vocabulary that SRS says needs reviewing,
 *   without ever knowing SRS exists.
 *
 * From PEDAGOGY.md:
 * > "Refresher lessons should feel like *revisiting a favourite place*,
 * >  not *doing homework again*."
 *
 * @param userId - User ID
 * @param skillPathId - Skill path (tree) being refreshed
 * @param treeName - Tree name for lesson title
 * @returns RevisionLessonResult with the generated lesson
 */
export async function generateRevisionLesson(
  userId: string,
  skillPathId: string,
  treeName: string,
): Promise<RevisionLessonResult> {
  try {
    // 1. Get the chunk health data (includes urgentChunkIds)
    const chunkHealth = await calculateHealthFromChunks(userId, skillPathId);

    if (chunkHealth.urgentChunkIds.length === 0) {
      console.log('[revisionLessonGenerator] No urgent chunks — generating general refresh');
      return generateGeneralRefresh(userId, skillPathId, treeName);
    }

    // 2. Fetch the actual chunk records for the urgent ones
    const chunkIds = chunkHealth.urgentChunkIds.slice(0, REVISION_CONFIG.maxChunks);
    const chunks = await Promise.all(
      chunkIds.map(id =>
        pb.collection('chunk_library').getOne(id).catch(() => null)
      )
    );
    const validChunks = chunks.filter(Boolean);

    if (validChunks.length === 0) {
      console.warn('[revisionLessonGenerator] No valid chunks found — fallback');
      return generateGeneralRefresh(userId, skillPathId, treeName);
    }

    // 3. Get learner profile for difficulty calibration
    const profile = await learnerProfileService.getOrCreateProfile(userId, {
      targetLanguage: validChunks[0].target_language || 'French',
      nativeLanguage: validChunks[0].native_language || 'English',
    });

    // 4. Build a targeted session plan using the pedagogy engine
    const sessionPlan = await pedagogyEngine.prepareSession(userId, {
      topic: `${treeName} Review`,
      maxNewChunks: 0,          // No new chunks — this is REVIEW only
      reviewChunkIds: chunkIds, // Target these specific chunks
      duration: REVISION_CONFIG.duration,
    });

    // 5. Generate the revision lesson with V2 generator
    const { lesson } = await lessonGeneratorV2.generateLesson({
      userId,
      sessionPlan,
      profile,
      additionalContext: {
        focusArea: treeName,
        isRevision: true,
        revisionTone: 'encouraging',
        // Tell the AI to present chunks in NEW contexts
        contextHint: `This is a revision lesson. The learner has seen these chunks before.
Present them in FRESH, interesting contexts — not the same examples as before.
Use the learner's interests if known. Keep it SHORT and FUN.
Start with: "Let's check in on your ${treeName} vocabulary! 🌳"`,
      },
    });

    // 6. Mark the lesson as a revision lesson (for UI badges, etc.)
    lesson.isRevision = true;
    lesson.title = `🌊 Refresh: ${treeName}`;
    lesson.icon = '💧';

    return {
      lesson,
      reviewedChunkIds: chunkIds,
      isTargetedRevision: true,
    };

  } catch (error) {
    console.error('[revisionLessonGenerator] Failed to generate revision:', error);
    return generateGeneralRefresh(userId, skillPathId, treeName);
  }
}

/**
 * Fallback: Generate a general refresh lesson when specific chunks aren't available.
 * Uses the same skill path topic but with general vocabulary review.
 */
async function generateGeneralRefresh(
  userId: string,
  skillPathId: string,
  treeName: string,
): Promise<RevisionLessonResult> {
  // Use the standard lesson generator with a "review" flag
  const profile = await learnerProfileService.getOrCreateProfile(userId, {
    targetLanguage: 'French', // Will be overridden by profile data
    nativeLanguage: 'English',
  });

  const sessionPlan = await pedagogyEngine.prepareSession(userId, {
    topic: `${treeName} General Review`,
    duration: REVISION_CONFIG.duration,
  });

  const { lesson } = await lessonGeneratorV2.generateLesson({
    userId,
    sessionPlan,
    profile,
    additionalContext: {
      focusArea: treeName,
      isRevision: true,
    },
  });

  lesson.isRevision = true;
  lesson.title = `🌊 Refresh: ${treeName}`;
  lesson.icon = '💧';

  return {
    lesson,
    reviewedChunkIds: [],
    isTargetedRevision: false,
  };
}
```

---

### Step 6 — Post-Revision SRS Update

**File:** `src/services/gameProgressService.ts` (MODIFY)

After a revision lesson completes, update the SRS data for the reviewed chunks. This is what makes the tree heal — not just the passage of time, but actual chunk re-acquisition.

```typescript
import { chunkManager } from './chunkManager';
import type { RevisionLessonResult } from './revisionLessonGenerator';

/**
 * Handle revision lesson completion.
 * Updates SRS for the reviewed chunks AND refreshes tree health.
 *
 * @param userId - User ID
 * @param treeId - Tree (user_trees record) ID
 * @param result - Lesson result (stars, sunDrops, etc.)
 * @param revisionData - Which chunks were reviewed
 */
export async function handleRevisionComplete(
  userId: string,
  treeId: string,
  result: LessonResult,
  revisionData: RevisionLessonResult,
): Promise<void> {
  // 1. Update SRS for each reviewed chunk
  if (revisionData.reviewedChunkIds.length > 0) {
    const correct = result.stars >= 2; // 2+ stars = successful review

    for (const chunkId of revisionData.reviewedChunkIds) {
      try {
        await chunkManager.recordEncounter(userId, chunkId, {
          correct,
          timeToAnswer: (result.timeSpentMs ?? 0) / revisionData.reviewedChunkIds.length,
          usedHelp: false, // We don't have per-chunk help data yet
        });
      } catch (error) {
        console.warn(`[gameProgressService] Failed to update SRS for chunk ${chunkId}:`, error);
      }
    }
  }

  // 2. Refresh the tree's lastRefreshDate (for time-based component)
  try {
    await pb.collection('user_trees').update(treeId, {
      lastRefreshDate: new Date().toISOString(),
      lastLessonDate: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[gameProgressService] Failed to update tree refresh date:', error);
  }

  // 3. Recalculate tree health (will now be higher because chunks are reviewed)
  // The batch update will happen on next app load, but we can force an immediate update:
  try {
    const tree = await pb.collection('user_trees').getOne(treeId);
    const { health } = await calculateTreeHealthHybrid(tree, userId);
    await pb.collection('user_trees').update(treeId, { health });
    console.log(`[gameProgressService] Tree ${treeId} health updated to ${health}% after revision`);
  } catch (error) {
    console.warn('[gameProgressService] Failed to recalculate tree health:', error);
  }
}
```

---

### Step 7 — Wire Revision into the Garden UI

**File:** `App.tsx` or `src/hooks/useGarden.ts` (MODIFY)

When the user taps "Refresh" on a wilting tree, generate a revision lesson instead of a normal lesson:

```typescript
import { generateRevisionLesson, type RevisionLessonResult } from './services/revisionLessonGenerator';

// Store active revision data for post-lesson SRS update
const activeRevisionRef = useRef<RevisionLessonResult | null>(null);

/**
 * Handle "Refresh" tap on a wilting tree.
 * Generates a targeted revision lesson.
 */
const handleTreeRefresh = useCallback(async (tree: UserTree) => {
  try {
    setLessonLoading(true);

    const userId = getCurrentUserId();
    const revisionResult = await generateRevisionLesson(
      userId,
      tree.skillPathId,
      tree.name,
    );

    activeRevisionRef.current = revisionResult;
    actions.goToLesson(tree, revisionResult.lesson);

  } catch (error) {
    console.error('[GameApp] Failed to generate revision lesson:', error);
    // Fall back to normal lesson
    handleStartLesson(tree);
  } finally {
    setLessonLoading(false);
  }
}, [actions]);

/**
 * Modified handleLessonComplete to detect revision lessons.
 */
const handleLessonComplete = useCallback(async (result: LessonResult) => {
  // Check if this was a revision lesson
  if (activeRevisionRef.current) {
    const revisionData = activeRevisionRef.current;
    activeRevisionRef.current = null;

    // Run revision-specific SRS update
    if (state.selectedTree) {
      await handleRevisionComplete(
        getCurrentUserId(),
        state.selectedTree.id,
        result,
        revisionData,
      );
    }
  }

  // ... existing completion logic (save progress, show rewards, etc.) ...
}, [state.selectedTree]);
```

---

### Step 8 — Add `isRevision` Flag to LessonPlan Type

**File:** `src/types/game.ts` (MODIFY)

```typescript
export interface LessonPlan {
  // ... existing fields ...

  /** Whether this is a revision/refresh lesson (shorter, review-focused) */
  isRevision?: boolean;
}
```

---

### Step 9 — Update Session Plan to Support Targeted Review

**File:** `src/services/pedagogyEngine.ts` (MODIFY)

Add support for `reviewChunkIds` in session options so the pedagogy engine can target specific chunks:

```typescript
export interface SessionOptions {
  // ... existing fields ...

  /** Specific chunk IDs to target for review (revision lessons) */
  reviewChunkIds?: string[];
}

// In prepareSession(), if reviewChunkIds is provided:
if (options.reviewChunkIds && options.reviewChunkIds.length > 0) {
  // Load these specific chunks instead of the engine's normal selection
  const targetReviewChunks = await Promise.all(
    options.reviewChunkIds.map(id => chunkManager.getChunk(id))
  );
  sessionPlan.reviewChunks = targetReviewChunks.filter(Boolean);
  sessionPlan.targetChunks = []; // No new chunks in revision
}
```

---

## Health Decay Timeline (Updated)

With the hybrid system, decay looks different:

| Scenario | Time-Based (old) | Chunk-Based (new) | Hybrid Health |
|----------|-------------------|---------------------|---------------|
| Day 0: Lesson complete, all chunks acquired | 100% | 100% | 100% |
| Day 2: No review needed yet | 100% | 100% | 100% |
| Day 3: First chunk becomes due | 100% → 85% | ~90% (1 fragile) | ~92% |
| Day 5: 2 chunks overdue | 85% | ~75% (2 fragile) | ~78% |
| Day 7: 3 chunks overdue | 85% → 60% | ~55% (3 fragile) | ~57% |
| Day 10: Most chunks overdue | 60% | ~35% (most fragile) | ~42% |
| Day 14: All chunks fragile | 35% | ~15% (all fragile) | ~21% |
| Post-revision: All chunks reviewed | Reset to 100% | ~90%+ (re-acquired) | ~93% |

The chunk-based signal is more granular and responds to actual learning, while the time component provides a baseline decay that's familiar to the child.

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/chunkHealthCalculator.ts` | **CREATE** | Calculate tree health from chunk SRS status |
| `src/services/revisionLessonGenerator.ts` | **CREATE** | Generate targeted revision lessons from fragile chunks |
| `src/services/treeHealthService.ts` | **MODIFY** | Hybrid health: chunk + time blended |
| `src/services/chunkManager.ts` | **MODIFY** | Set `first_encountered_in` on chunk encounter |
| `src/services/gameProgressService.ts` | **MODIFY** | Post-revision SRS update + health recalculation |
| `src/services/pedagogyEngine.ts` | **MODIFY** | Support `reviewChunkIds` in session options |
| `src/types/game.ts` | **MODIFY** | Add `isRevision` to LessonPlan |
| `App.tsx` | **MODIFY** | Wire revision lesson flow for "Refresh" action |

---

## Testing Checklist

### Chunk Health Calculation
- [ ] Tree with all acquired chunks → health ~100%
- [ ] Tree with mix of acquired + fragile → health proportional to ratio
- [ ] Tree with all fragile chunks → health ~15-25%
- [ ] Tree with no chunks (new) → falls back to time-based health (100%)
- [ ] Overdue chunks reduce health below their base status weight
- [ ] `urgentChunkIds` returns the most overdue chunks first

### Hybrid Health
- [ ] Trees with chunk data use 70% chunk / 30% time blend
- [ ] Trees without chunk data use 100% time-based
- [ ] Health clamps between 5 and 100
- [ ] Batch update on app startup processes all trees

### Revision Lesson Generation
- [ ] Revision lesson for tree with 3 fragile chunks targets those chunks
- [ ] Revision lesson is SHORT (3-5 steps, not 5-8)
- [ ] Revision lesson title starts with "🌊 Refresh:"
- [ ] Revision lesson presents chunks in NEW contexts (not same examples)
- [ ] Fallback lesson generates when no chunk data available
- [ ] Failed generation doesn't crash the app

### Post-Revision SRS Update
- [ ] Successful revision (2+ stars) updates chunk status positively
- [ ] Failed revision (1 star) still counts as encounter but with lower ease
- [ ] Tree health recalculates immediately after revision completion
- [ ] Tree `lastRefreshDate` updates after revision

### End-to-End Flow
- [ ] Complete a lesson → chunks enter `learning` status
- [ ] Wait (or simulate) time → chunks become `fragile`
- [ ] Tree health drops as chunks become fragile
- [ ] Tap "Refresh" on wilting tree → revision lesson generates
- [ ] Complete revision → chunks return to `acquired`, tree heals
- [ ] Tree health visually improves in the garden

---

## Pedagogical Rationale

This is the crown jewel of LingoFriends' invisible pedagogy:

1. **Spaced Repetition disguised as gardening.** The child sees a wilting tree and feels motivated to "water" it. They have no idea that the timing of the wilt is calculated by an SM-2 algorithm based on their individual performance on specific vocabulary chunks. They just know their garden needs care.

2. **Targeted review in new contexts.** From `PEDAGOGY.md`: *"Refresher lessons should feel like revisiting a favourite place, not doing homework again."* The revision generator explicitly tells the AI to present old chunks in new, interesting contexts related to the learner's interests. Same vocabulary, fresh experience.

3. **Game mechanic IS the forgetting curve.** Ebbinghaus showed memory decays exponentially. The tree health decay IS that curve, made visible and gamified. The child internalizes the concept that "things you don't practice fade away" without ever learning about memory science.

4. **Natural intrinsic motivation.** The garden looking beautiful is the reward for consistent review. There's no abstract XP or streak count — the garden itself is the progress indicator. This aligns with self-determination theory: competence (mastering chunks), autonomy (choosing which trees to tend), and relatedness (garden visible to friends).

---

## Notes for Cline

- The `first_encountered_in` field MUST be set during lesson completion, not during lesson generation. This ensures only successfully encountered chunks are associated with the tree.
- The `calculateHealthFromChunks` function makes multiple PocketBase queries. Cache the result for ~5 minutes to avoid hammering the API on the garden view.
- The hybrid blend (70/30) is a tuning parameter. If testing shows chunk-based health swings too aggressively, adjust to 60/40 or 50/50. The important thing is that chunk status MATTERS to tree health.
- Revision lessons should NEVER include `GameActivityType.INFO` steps for known chunks. The child already learned these — don't re-teach. Go straight to varied quiz activities.
- When the tree health improves after revision, the Three.js garden should show a brief "healing" animation — particles, green glow, leaves growing back. This is the satisfying moment that completes the loop. (This visual feedback is covered by the existing tree health stage system in the garden renderer.)
- Test the whole flow with real time delays if possible. Simulate chunk decay by manually editing `next_review_date` values in PocketBase to be in the past.
