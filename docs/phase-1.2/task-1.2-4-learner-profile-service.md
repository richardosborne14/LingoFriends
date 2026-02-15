# Task 1.2.4: Learner Profile Service

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.1 (Learner Model Schema)
**Estimated Time:** 3-4 hours

---

## Objective

Create the service that manages learner profiles, including initialization, updates, interest tracking, and engagement signal processing.

---

## Deliverables

### Files to Create
- `src/services/learnerProfileService.ts` — Main service for learner profile management
- `src/hooks/useLearnerProfile.tsx` — React hook for learner profile access

---

## Service Interface

```typescript
// src/services/learnerProfileService.ts

import type { LearnerProfile, UserChunk, ChunkStatus, DetectedInterest } from '@/types/pedagogy';

export interface LearnerProfileService {
  // === Initialization ===
  
  /**
   * Create a new learner profile for a user.
   * Called during onboarding after language/interest selection.
   */
  initializeProfile(userId: string, options: {
    nativeLanguage: string;
    targetLanguage: string;
    interests: string[];
  }): Promise<LearnerProfile>;
  
  /**
   * Get a learner's profile. Returns null if not exists.
   */
  getProfile(userId: string): Promise<LearnerProfile | null>;
  
  /**
   * Get or create a learner's profile.
   */
  getOrCreateProfile(userId: string, defaults?: Partial<LearnerProfile>): Promise<LearnerProfile>;
  
  // === Updates ===
  
  /**
   * Update a learner's profile.
   */
  updateProfile(userId: string, updates: Partial<LearnerProfile>): Promise<LearnerProfile>;
  
  /**
   * Record a completed session.
   * Updates session counts, time, and engagement metrics.
   */
  recordSession(userId: string, sessionData: {
    durationMinutes: number;
    chunksEncountered: number;
    correctFirstTry: number;
    helpUsed: number;
  }): Promise<void>;
  
  // === Interests ===
  
  /**
   * Add explicit interests (from onboarding or settings).
   */
  addExplicitInterests(userId: string, interests: string[]): Promise<void>;
  
  /**
   * Record a detected interest (from AI observation).
   */
  recordDetectedInterest(userId: string, interest: DetectedInterest): Promise<void>;
  
  /**
   * Get combined interests (explicit + detected).
   */
  getCombinedInterests(userId: string): Promise<string[]>;
  
  // === Engagement ===
  
  /**
   * Update confidence score based on activity performance.
   * Uses rolling average with decay.
   */
  updateConfidence(userId: string, correct: boolean, usedHelp: boolean): Promise<void>;
  
  /**
   * Record a struggle event (for affective filter monitoring).
   */
  recordStruggle(userId: string): Promise<void>;
  
  /**
   * Get the current affective filter risk score.
   */
  getFilterRiskScore(userId: string): Promise<number>;
  
  // === Statistics ===
  
  /**
   * Update chunk statistics (called when user_chunks change).
   */
  updateChunkStats(userId: string): Promise<void>;
  
  /**
   * Recalculate level based on acquired chunks.
   */
  recalculateLevel(userId: string): Promise<number>;
}
```

---

## Implementation Notes

### Level Calculation

Level (0-100) is derived from chunk acquisition, mapped to CEFR:

| CEFR | Level Range | Chunks Acquired (approx.) |
|------|-------------|---------------------------|
| A1 | 0-20 | 0-100 |
| A2 | 21-40 | 101-300 |
| B1 | 41-60 | 301-600 |
| B2 | 61-80 | 601-1000 |
| C1 | 81-90 | 1001-1500 |
| C2 | 91-100 | 1501+ |

```typescript
function levelFromChunks(acquired: number): number {
  if (acquired < 100) return Math.floor(acquired / 5); // 0-20
  if (acquired < 300) return 21 + Math.floor((acquired - 100) / 10); // 21-40
  if (acquired < 600) return 41 + Math.floor((acquired - 300) / 15); // 41-60
  if (acquired < 1000) return 61 + Math.floor((acquired - 600) / 20); // 61-80
  if (acquired < 1500) return 81 + Math.floor((acquired - 1000) / 50); // 81-90
  return 91 + Math.min(9, Math.floor((acquired - 1500) / 100)); // 91-100
}
```

### Confidence Calculation

Confidence is a rolling average (0-1) updated after each activity:

```typescript
function updateConfidenceScore(current: number, correct: boolean, usedHelp: boolean): number {
  // Weight: more recent activities matter more
  const weight = 0.1; // 10% weight to new activity
  
  let activityScore = correct ? 1.0 : 0.0;
  if (correct && usedHelp) activityScore = 0.7; // Correct with help is less confident
  
  return current * (1 - weight) + activityScore * weight;
}
```

### Filter Risk Score

The affective filter risk score (0-1) increases with:
- Multiple wrong answers in a row
- Frequent help requests
- Sudden drop in confidence
- Session abandonment

```typescript
function calculateFilterRisk(profile: LearnerProfile, recentPerformance: ActivityResult[]): number {
  let risk = 0;
  
  // Base risk from wrong answers
  const wrongRate = recentPerformance.filter(p => !p.correct).length / recentPerformance.length;
  risk += wrongRate * 0.3;
  
  // Risk from help usage
  risk += profile.helpRequestRate * 0.2;
  
  // Risk from low confidence
  risk += (1 - profile.averageConfidence) * 0.2;
  
  // Risk from recent struggle
  if (profile.lastStruggleDate && isRecent(profile.lastStruggleDate, 1)) {
    risk += 0.2;
  }
  
  // Cap at 1.0
  return Math.min(1.0, risk);
}
```

---

## React Hook

```typescript
// src/hooks/useLearnerProfile.tsx

import { useState, useEffect, useCallback } from 'react';
import { learnerProfileService } from '@/services/learnerProfileService';
import type { LearnerProfile } from '@/types/pedagogy';

export function useLearnerProfile(userId: string | null) {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    learnerProfileService.getOrCreateProfile(userId)
      .then(setProfile)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);
  
  const updateInterests = useCallback(async (interests: string[]) => {
    if (!userId) return;
    await learnerProfileService.addExplicitInterests(userId, interests);
    const updated = await learnerProfileService.getProfile(userId);
    setProfile(updated);
  }, [userId]);
  
  const recordSession = useCallback(async (data: SessionData) => {
    if (!userId) return;
    await learnerProfileService.recordSession(userId, data);
    const updated = await learnerProfileService.getProfile(userId);
    setProfile(updated);
  }, [userId]);
  
  return {
    profile,
    loading,
    error,
    updateInterests,
    recordSession,
    refresh: () => learnerProfileService.getProfile(userId).then(setProfile),
  };
}
```

---

## Testing Checklist

- [ ] Profile initializes with correct defaults
- [ ] Level updates when chunks are acquired
- [ ] Confidence score updates after activities
- [ ] Detected interests are recorded with timestamps
- [ ] Filter risk score increases with struggles
- [ ] Session data updates engagement metrics
- [ ] Hook returns correct loading states

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Service implements all methods | [ ] |
| Level calculation is accurate | [ ] |
| Confidence uses rolling average | [ ] |
| Filter risk is calculated correctly | [ ] |
| Hook provides useful interface | [ ] |

---

## Reference

- **docs/phase-1.2/task-1.2-1-learner-model-schema.md** — Schema definition
- **docs/phase-1.2/phase-1.2-overview.md** — Learner profile data model
- **src/types/pedagogy.ts** — Type definitions