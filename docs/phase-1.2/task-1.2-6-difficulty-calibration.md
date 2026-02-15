# Task 1.2.6: i+1 Difficulty Calibration

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.5 (Pedagogy Engine Core)
**Estimated Time:** 4-5 hours

---

## Objective

Implement the i+1 difficulty calibration system based on Krashen's Input Hypothesis. The system must select content that is slightly above the learner's current level, ensuring optimal acquisition without overwhelming the learner.

---

## Deliverables

### Files to Create
- `src/services/difficultyCalibration.ts` — i+1 calculation and chunk selection

---

## Theoretical Background

From **Krashen's Input Hypothesis**:
> Learners acquire language best when exposed to input that is slightly beyond their current level (i+1), not too easy (i) or too hard (i+2+).

**Key principle:** The learner should understand most of the content, with just enough new elements to stretch their abilities.

---

## Implementation

```typescript
// src/services/difficultyCalibration.ts

import type { LearnerProfile, LexicalChunk, UserChunk } from '@/types/pedagogy';
import { chunkManager } from './chunkManager';
import { learnerProfileService } from './learnerProfileService';

/**
 * Calculate the learner's current "i" level (1-5 scale).
 * This represents their current competence.
 */
export function getCurrentLevel(profile: LearnerProfile): number {
  // Base level from acquired chunks (mapped to 1-5)
  const chunkLevel = mapChunksToLevel(profile.chunksAcquired);
  
  // Adjust based on confidence
  const confidenceAdj = profile.averageConfidence * 0.3;
  
  // Adjust based on filter risk (reduce level if stressed)
  const filterAdj = -profile.filterRiskScore * 0.2;
  
  return Math.max(1, Math.min(5, chunkLevel + confidenceAdj + filterAdj));
}

/**
 * Calculate the target i+1 level for new content.
 */
export function getTargetLevel(profile: LearnerProfile): number {
  const i = getCurrentLevel(profile);
  return Math.min(5, i + 1);
}

/**
 * Select chunks at the learner's i+1 level.
 * These are the target chunks for a learning session.
 */
export async function selectChunksForLevel(
  userId: string,
  topic: string,
  count: number
): Promise<LexicalChunk[]> {
  const profile = await learnerProfileService.getProfile(userId);
  if (!profile) throw new Error('Learner profile not found');
  
  const targetLevel = getTargetLevel(profile);
  
  // Get chunks at target difficulty (±0.5 tolerance)
  const chunks = await chunkManager.searchChunks({
    topic,
    difficulty: [targetLevel - 0.5, targetLevel + 0.5],
    language: profile.targetLanguage,
    limit: count * 3, // Get more than needed for variety
  });
  
  // Filter out already acquired chunks
  const acquiredIds = await getAcquiredChunkIds(userId);
  const newChunks = chunks.filter(c => !acquiredIds.includes(c.id));
  
  // Prioritize by frequency
  return newChunks
    .sort((a, b) => a.frequency - b.frequency)
    .slice(0, count);
}

/**
 * Get chunks for context (i level - already acquired).
 * These provide familiar scaffolding around new content.
 */
export async function getContextChunks(
  userId: string,
  topic: string,
  count: number
): Promise<LexicalChunk[]> {
  const profile = await learnerProfileService.getProfile(userId);
  if (!profile) throw new Error('Learner profile not found');
  
  const currentLevel = getCurrentLevel(profile);
  
  // Get chunks at or below current level
  const chunks = await chunkManager.searchChunks({
    topic,
    difficulty: [1, currentLevel],
    language: profile.targetLanguage,
    limit: count * 2,
  });
  
  // Only include acquired or learning chunks
  const userChunks = await chunkManager.getUserChunksForTopic(userId, topic);
  const knownIds = userChunks
    .filter(uc => uc.status === 'acquired' || uc.status === 'learning')
    .map(uc => uc.chunkId);
  
  return chunks
    .filter(c => knownIds.includes(c.id))
    .slice(0, count);
}

/**
 * Adapt difficulty based on performance.
 * Called after each activity to adjust the i+1 target.
 */
export function adaptDifficulty(
  currentTarget: number,
  performance: {
    correct: number;
    total: number;
    avgTimeMs: number;
    helpUsed: number;
  }
): number {
  const accuracy = performance.correct / performance.total;
  const helpRate = performance.helpUsed / performance.total;
  
  // High accuracy with low help = increase difficulty
  if (accuracy >= 0.9 && helpRate < 0.1) {
    return Math.min(5, currentTarget + 0.2);
  }
  
  // Low accuracy or high help = decrease difficulty
  if (accuracy < 0.6 || helpRate > 0.3) {
    return Math.max(1, currentTarget - 0.3);
  }
  
  // Otherwise, maintain current level
  return currentTarget;
}

/**
 * Determine if we should drop back to "i" level.
 * Used when the affective filter is rising.
 */
export function shouldDropBack(
  profile: LearnerProfile,
  recentPerformance: ActivityResult[]
): boolean {
  // Check for 3+ wrong answers in last 5 activities
  const recentWrong = recentPerformance.slice(-5).filter(p => !p.correct).length;
  if (recentWrong >= 3) return true;
  
  // Check for high filter risk
  if (profile.filterRiskScore > 0.7) return true;
  
  // Check for low confidence
  if (profile.averageConfidence < 0.4) return true;
  
  return false;
}

/**
 * Map acquired chunk count to CEFR-based level (1-5).
 */
function mapChunksToLevel(acquiredCount: number): number {
  // Approximate CEFR mapping based on research
  // These numbers may need calibration
  if (acquiredCount < 50) return 1;     // A1 beginner
  if (acquiredCount < 150) return 1.5;  // A1 high
  if (acquiredCount < 300) return 2;    // A2
  if (acquiredCount < 500) return 2.5;  // A2 high
  if (acquiredCount < 800) return 3;    // B1
  if (acquiredCount < 1200) return 3.5; // B1 high
  if (acquiredCount < 1700) return 4;   // B2
  if (acquiredCount < 2300) return 4.5; // B2 high
  return 5;                              // C1+
}

async function getAcquiredChunkIds(userId: string): Promise<string[]> {
  // Implementation to get user's acquired chunk IDs
  const userChunks = await chunkManager.getChunksByStatus(userId, 'acquired');
  return userChunks.map(uc => uc.chunkId);
}
```

---

## Usage Example

```typescript
// In a session preparation
async function prepareLesson(userId: string, topic: string) {
  // Get learner's current i level
  const profile = await learnerProfileService.getProfile(userId);
  const currentLevel = getCurrentLevel(profile);
  const targetLevel = getTargetLevel(profile);
  
  console.log(`Learner is at level ${currentLevel.toFixed(1)}, targeting ${targetLevel.toFixed(1)}`);
  
  // Select new chunks at i+1
  const newChunks = await selectChunksForLevel(userId, topic, 5);
  
  // Get context chunks at i
  const contextChunks = await getContextChunks(userId, topic, 10);
  
  // Check if we should drop back
  if (shouldDropBack(profile, recentPerformance)) {
    console.log('Dropping back to i level for consolidation');
    return consolidateAtCurrentLevel(userId, topic);
  }
  
  return { newChunks, contextChunks, targetLevel };
}
```

---

## Testing Checklist

- [ ] getCurrentLevel returns accurate level
- [ ] getTargetLevel correctly adds 1
- [ ] selectChunksForLevel returns appropriate chunks
- [ ] getContextChunks returns only known chunks
- [ ] adaptDifficulty adjusts correctly
- [ ] shouldDropBack triggers at right thresholds

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| i+1 calculation matches pedagogy | [ ] |
| Chunk selection is efficient | [ ] |
| Adaptation is responsive | [ ] |
| Drop-back prevents frustration | [ ] |
| Level mapping is accurate | [ ] |

---

## Reference
- **PEDAGOGY.md** — Section 2 (Krashen's Input Hypothesis)
- **docs/phase-1.2/phase-1.2-overview.md** — Difficulty calibration overview
- **docs/phase-1.2/task-1.2-5-pedagogy-engine-core.md** — Engine integration