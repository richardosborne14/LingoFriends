# Task 1.2.5: Pedagogy Engine Core Service

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.1, 1.2.4
**Estimated Time:** 6-8 hours

---

## Objective

Create the central orchestration service that coordinates all pedagogy components: difficulty calibration, chunk selection, lesson generation, and learner adaptation.

---

## Deliverables

### Files to Create
- `src/services/pedagogyEngine.ts` — Main orchestration service
- `src/services/chunkManager.ts` — Chunk library queries and SRS scheduling

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     pedagogyEngine.ts                           │
│  (Orchestrator: coordinates all pedagogy components)           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │difficultyCal │  │affectiveFltr │  │ lessonGen    │          │
│  │ibration.ts   │  │Monitor.ts    │  │ (Task 1.2.8) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           │                                      │
│  ┌──────────────────────┴──────────────────────┐               │
│  │                chunkManager.ts               │               │
│  │  (Chunk queries, SRS, status management)    │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Methods

```typescript
// src/services/pedagogyEngine.ts

export interface PedagogyEngine {
  /**
   * Get chunks for a learning session.
   * This is the main entry point for starting a lesson.
   */
  prepareSession(userId: string, options: {
    topic?: string;           // Optional topic preference
    duration: number;         // Target session length (minutes)
    activityTypes?: string[]; // Preferred activity types
  }): Promise<SessionPlan>;
  
  /**
   * Report activity completion.
   * Updates learner model and triggers adaptations.
   */
  reportActivityCompletion(userId: string, activity: ActivityResult): Promise<void>;
  
  /**
   * Get next activity recommendation.
   * Called after each activity to decide what's next.
   */
  getNextActivity(userId: string, session: SessionContext): Promise<ActivityRecommendation>;
  
  /**
   * Check if session should end.
   * Based on duration, fatigue signals, or completion.
   */
  shouldEndSession(userId: string, session: SessionContext): Promise<boolean>;
  
  /**
   * Generate end-of-session summary.
   * Includes stats, new chunks, recommendations.
   */
  generateSessionSummary(userId: string, session: SessionContext): Promise<SessionSummary>;
}

interface SessionPlan {
  sessionId: string;
  topic: string;
  targetChunks: LexicalChunk[];    // New chunks to introduce
  reviewChunks: LexicalChunk[];    // Fragile chunks to reinforce
  contextChunks: LexicalChunk[];   // Familiar chunks for context
  activities: ActivityType[];       // Recommended activity sequence
  estimatedDuration: number;
  difficulty: number;               // i+1 level (e.g., 2.3)
}

interface ActivityRecommendation {
  activityType: GameActivityType;
  chunks: LexicalChunk[];
  reason: string;
  difficulty: number;
  adaptation?: AdaptationAction;
}
```

---

## Chunk Manager

```typescript
// src/services/chunkManager.ts

export interface ChunkManager {
  /**
   * Get chunks at the learner's i+1 level for a topic.
   */
  getChunksForLevel(userId: string, topic: string, level: number, count: number): Promise<LexicalChunk[]>;
  
  /**
   * Get chunks due for review.
   */
  getDueChunks(userId: string, count: number): Promise<UserChunk[]>;
  
  /**
   * Get fragile chunks for the learner.
   */
  getFragileChunks(userId: string, count: number): Promise<UserChunk[]>;
  
  /**
   * Record an encounter with a chunk.
   * Updates SRS and status.
   */
  recordEncounter(userId: string, chunkId: string, result: {
    correct: boolean;
    timeToAnswer: number;
    usedHelp: boolean;
  }): Promise<UserChunk>;
  
  /**
   * Get chunks for context (already acquired).
   */
  getContextChunks(userId: string, topic: string, count: number): Promise<LexicalChunk[]>;
  
  /**
   * Search chunks by topic and difficulty.
   */
  searchChunks(options: {
    topic?: string;
    difficulty?: number[];
    language: string;
    limit: number;
  }): Promise<LexicalChunk[]>;
}
```

---

## i+1 Level Calculation

```typescript
function calculateIPlusOne(profile: LearnerProfile): number {
  const baseLevel = profile.currentLevel / 20; // Convert 0-100 to 0-5 scale
  const confidenceBonus = profile.averageConfidence * 0.5; // Up to +0.5
  const filterPenalty = profile.filterRiskScore * 0.3; // Up to -0.3 if filter is high
  
  const iplus1 = baseLevel + 1 + confidenceBonus - filterPenalty;
  return Math.max(1, Math.min(5, iplus1)); // Clamp to 1-5
}
```

---

## Testing Checklist

- [ ] Engine prepares session with correct i+1 chunks
- [ ] Chunk manager queries chunks by difficulty
- [ ] SRS updates correctly on encounters
- [ ] Adaptation triggers when filter risk is high
- [ ] Session summary includes all stats

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Session preparation works | [ ] |
| i+1 calculation is accurate | [ ] |
| Chunk queries are efficient | [ ] |
| SRS updates correctly | [ ] |
| Adaptations are timely | [ ] |

---

## Reference
- **docs/phase-1.2/phase-1.2-overview.md** — Architecture
- **docs/phase-1.2/task-1.2-6-difficulty-calibration.md** — i+1 details
- **docs/phase-1.2/task-1.2-10-chunk-srs.md** — SRS details