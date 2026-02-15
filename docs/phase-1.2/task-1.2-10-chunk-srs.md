# Task 1.2.10: Chunk SRS System

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.1 (Schema)
**Estimated Time:** 4-5 hours

---

## Objective

Implement the Spaced Repetition System (SRS) for chunk acquisition. Track when chunks should be reviewed, update status based on performance, and schedule reviews using the SM-2+ algorithm.

---

## Deliverables

### Files to Create
- `src/services/srsService.ts` — SRS algorithm implementation

---

## Chunk Status Lifecycle

```
NEW → LEARNING → ACQUIRED ⇄ FRAGILE
                    ↑        ↓
                  (decay over time)
```

| Status | Description | SRS Interval |
|--------|-------------|--------------|
| **new** | Never encountered | N/A |
| **learning** | Actively practicing | 1-7 days |
| **acquired** | Well-known | 14-180 days |
| **fragile** | Was acquired, now due | Needs review |

---

## SM-2+ Algorithm

Adapted from Anki's SM-2+ for lexical chunks:

```typescript
// src/services/srsService.ts

import type { UserChunk, ChunkStatus } from '@/types/pedagogy';

interface SRSResult {
  status: ChunkStatus;
  nextReviewDate: Date;
  interval: number;  // Days until next review
  easeFactor: number;
}

/**
 * Calculate next review after an encounter.
 */
export function calculateNextReview(
  chunk: UserChunk,
  result: {
    correct: boolean;
    timeToAnswer: number;
    usedHelp: boolean;
  }
): SRSResult {
  const now = new Date();
  
  // First encounter
  if (chunk.status === 'new') {
    if (result.correct && !result.usedHelp) {
      return {
        status: 'learning',
        nextReviewDate: addDays(now, 1),
        interval: 1,
        easeFactor: 2.5,
      };
    } else {
      return {
        status: 'learning',
        nextReviewDate: addDays(now, 0.5), // 12 hours
        interval: 0.5,
        easeFactor: 2.3,
      };
    }
  }
  
  // Learning status
  if (chunk.status === 'learning') {
    if (result.correct && !result.usedHelp) {
      // Graduating from learning
      const newInterval = Math.round(chunk.interval * 2.5);
      return {
        status: 'acquired',
        nextReviewDate: addDays(now, newInterval),
        interval: newInterval,
        easeFactor: chunk.easeFactor,
      };
    } else if (result.correct) {
      // Correct with help, stay in learning
      return {
        status: 'learning',
        nextReviewDate: addDays(now, 1.5),
        interval: 1.5,
        easeFactor: Math.max(1.3, chunk.easeFactor - 0.2),
      };
    }
    
    // Incorrect, stay in learning with shorter interval
    return {
      status: 'learning',
      nextReviewDate: addDays(now, 0.5),
      interval: 0.5,
      easeFactor: Math.max(1.3, chunk.easeFactor - 0.2),
    };
  }
  
  // Acquired or fragile - retrieval practice
  return handleRetrieval(chunk, result);
}

/**
 * Handle retrieval practice for acquired chunks.
 */
function handleRetrieval(
  chunk: UserChunk,
  result: { correct: boolean; usedHelp: boolean }
): SRSResult {
  const now = new Date();
  
  if (result.correct && !result.usedHelp) {
    // Strong retrieval - increase interval
    const newEaseFactor = Math.min(3.0, chunk.easeFactor + 0.1);
    const newInterval = Math.round(chunk.interval * newEaseFactor);
    
    return {
      status: 'acquired',
      nextReviewDate: addDays(now, newInterval),
      interval: Math.min(180, newInterval), // Cap at 180 days
      easeFactor: newEaseFactor,
    };
  }
  
  if (result.correct) {
    // Correct with help - maintain or slight decrease
    const newEaseFactor = Math.max(1.3, chunk.easeFactor - 0.1);
    const newInterval = Math.round(chunk.interval * newEaseFactor);
    
    return {
      status: 'acquired',
      nextReviewDate: addDays(now, newInterval),
      interval: Math.max(7, newInterval), // Minimum 7 days
      easeFactor: newEaseFactor,
    };
  }
  
  // Failed retrieval - mark as fragile
  const newEaseFactor = Math.max(1.3, chunk.easeFactor - 0.3);
  
  return {
    status: 'fragile',
    nextReviewDate: addDays(now, 1), // Review tomorrow
    interval: 1,
    easeFactor: newEaseFactor,
  };
}

/**
 * Decay acquired chunks over time.
 * Chunks that aren't reviewed become fragile.
 */
export async function decayAcquiredChunks(userId: string): Promise<void> {
  // Run daily via cron job
  const acquiredChunks = await chunkManager.getChunksByStatus(userId, 'acquired');
  
  for (const chunk of acquiredChunks) {
    // If next review date has passed, mark as fragile
    if (new Date(chunk.nextReviewDate) < new Date()) {
      await chunkManager.updateStatus(chunk.id, 'fragile');
    }
  }
}

/**
 * Get chunks due for review today.
 */
export async function getDueChunks(userId: string, today: Date = new Date()): Promise<UserChunk[]> {
  const userChunks = await chunkManager.getAllUserChunks(userId);
  
  return userChunks.filter(chunk => {
    const reviewDate = new Date(chunk.nextReviewDate);
    return reviewDate <= today || chunk.status === 'fragile';
  });
}

/**
 * Calculate health of a topic based on chunk statuses.
 */
export function calculateTopicHealth(chunks: UserChunk[]): number {
  if (chunks.length === 0) return 50; // Default
  
  const statusWeights = {
    acquired: 100,
    learning: 70,
    fragile: 30,
    new: 50,
  };
  
  const totalHealth = chunks.reduce((sum, chunk) => {
    return sum + statusWeights[chunk.status];
  }, 0);
  
  return Math.round(totalHealth / chunks.length);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

---

## Integration with Encounters

```typescript
// In chunkManager.ts

async recordEncounter(
  userId: string,
  chunkId: string,
  result: {
    correct: boolean;
    timeToAnswer: number;
    usedHelp: boolean;
  }
): Promise<UserChunk> {
  // Get existing user chunk
  let userChunk = await this.getUserChunk(userId, chunkId);
  
  if (!userChunk) {
    // First encounter
    userChunk = await this.createUserChunk(userId, chunkId);
  }
  
  // Calculate new SRS values
  const srsResult = calculateNextReview(userChunk, result);
  
  // Update user chunk
  const updated = await this.updateUserChunk(userChunk.id, {
    status: srsResult.status,
    nextReviewDate: srsResult.nextReviewDate.toISOString(),
    interval: srsResult.interval,
    easeFactor: srsResult.easeFactor,
    lastEncountered: new Date().toISOString(),
    totalEncounters: userChunk.totalEncounters + 1,
    correctEncounters: userChunk.correctEncounters + (result.correct ? 1 : 0),
  });
  
  return updated;
}
```

---

## Testing Checklist

- [ ] New chunks become learning after first encounter
- [ ] Learning chunks graduate to acquired
- [ ] Acquired chunks become fragile on failure
- [ ] Fragile chunks recover to acquired
- [ ] Intervals increase correctly
- [ ] Ease factor adjusts properly
- [ ] Due chunks are returned correctly

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| SRS algorithm is accurate | [ ] |
| Status transitions are correct | [ ] |
| Intervals are reasonable | [ ] |
| Health calculation is useful | [ ] |
| Integration with encounters works | [ ] |

---

## Reference
- **docs/phase-1.2/phase-1.2-overview.md** — SRS overview
- **docs/phase-1.2/task-1.2-1-learner-model-schema.md** — UserChunk schema