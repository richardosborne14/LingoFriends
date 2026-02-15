# Task 1.2.7: Affective Filter Monitoring

**Status:** ✅ Complete
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.5 (Pedagogy Engine Core)
**Estimated Time:** 4-5 hours
**Completed:** 2026-02-15

---

## Objective

Implement monitoring for Krashen's "Affective Filter" — the emotional barrier that prevents acquisition when learners are anxious, unmotivated, or lacking confidence. The system must detect rising filters and adapt accordingly.

---

## Deliverables

### Files to Create
- `src/services/affectiveFilterMonitor.ts` — Filter detection and adaptation

---

## Theoretical Background

From **Krashen's Affective Filter Hypothesis**:
> Learners with high anxiety, low motivation, or low self-confidence have a "filter" that blocks input from reaching the language acquisition device.

**Key principle:** When the filter is high, acquisition stops — even if input is optimal i+1.

---

## Signals to Monitor

| Signal | Threshold | Interpretation |
|--------|-----------|----------------|
| Wrong answers in a row | ≥ 3 | Frustration or too hard |
| Help button usage | > 30% of activities | Confusion |
| Time per activity | > 2x average | Struggling or disengaged |
| Session length | < 5 min | Low motivation |
| Time since last session | > 3 days | Losing interest |
| Confidence drop | > 0.2 in session | Something went wrong |

---

## Implementation

```typescript
// src/services/affectiveFilterMonitor.ts

import type { LearnerProfile } from '@/types/pedagogy';
import { learnerProfileService } from './learnerProfileService';

interface SessionSignal {
  type: 'wrong' | 'help' | 'slow' | 'fast' | 'quit';
  timestamp: Date;
  activityId: string;
}

/**
 * Calculate the current affective filter score (0-1).
 * Higher scores = higher filter = more blocked learning.
 */
export function calculateFilterScore(
  profile: LearnerProfile,
  sessionSignals: SessionSignal[]
): number {
  let score = 0;
  
  // === Current session signals ===
  
  // Recent wrong answers
  const recentWrong = sessionSignals.filter(s => s.type === 'wrong').slice(-5).length;
  score += Math.min(0.3, recentWrong * 0.06); // Up to 0.3
  
  // Help requests
  const helpRate = sessionSignals.filter(s => s.type === 'help').length / 
                   Math.max(1, sessionSignals.length);
  score += helpRate * 0.2;
  
  // Slow responses (frustration)
  const slowCount = sessionSignals.filter(s => s.type === 'slow').length;
  score += Math.min(0.15, slowCount * 0.05);
  
  // === Profile signals ===
  
  // Low confidence
  if (profile.averageConfidence < 0.5) {
    score += (0.5 - profile.averageConfidence) * 0.3;
  }
  
  // Wrong answer rate
  score += profile.wrongAnswerRate * 0.15;
  
  // Engagement drop (gap since last session)
  const daysSinceLastSession = getDaysSince(profile.lastActiveDate);
  if (daysSinceLastSession > 3) {
    score += Math.min(0.1, (daysSinceLastSession - 3) * 0.02);
  }
  
  return Math.min(1.0, score);
}

/**
 * Determine if the filter is rising during this session.
 */
export function isFilterRising(sessionSignals: SessionSignal[]): boolean {
  // Look at last 10 signals
  const recent = sessionSignals.slice(-10);
  
  // Check for pattern of struggle
  const wrongCount = recent.filter(s => s.type === 'wrong').length;
  const helpCount = recent.filter(s => s.type === 'help').length;
  const slowCount = recent.filter(s => s.type === 'slow').length;
  
  // Rising if: 3+ wrong, or help + wrong, or slow + wrong
  return wrongCount >= 3 || 
         (helpCount >= 2 && wrongCount >= 2) ||
         (slowCount >= 2 && wrongCount >= 2);
}

/**
 * Get the appropriate adaptation for a rising filter.
 */
export function getAdaptation(
  filterScore: number,
  sessionSignals: SessionSignal[]
): AdaptationAction {
  const isRising = isFilterRising(sessionSignals);
  
  // === Critical filter (very high) ===
  if (filterScore > 0.8) {
    return {
      type: 'suggest_break',
      message: "You've been working hard! Let's take a short break and come back fresh.",
      severity: 'critical',
    };
  }
  
  // === Rising filter (increasing) ===
  if (isRising && filterScore > 0.5) {
    return {
      type: 'simplify',
      message: "Let's try something a bit easier to build confidence.",
      severity: 'warning',
      action: { dropToI: true },
    };
  }
  
  // === Moderate filter (stable but elevated) ===
  if (filterScore > 0.5) {
    return {
      type: 'encourage',
      message: "You're doing great! Learning takes time. Let's keep going!",
      severity: 'info',
    };
  }
  
  // === Low filter (good state) ===
  if (filterScore < 0.3 && sessionSignals.some(s => s.type === 'fast')) {
    return {
      type: 'challenge',
      message: "You're on fire! Ready for something more challenging?",
      severity: 'success',
      action: { increaseDifficulty: true },
    };
  }
  
  // Normal state, no adaptation needed
  return { type: 'none', severity: 'none' };
}

type AdaptationAction = 
  | { type: 'none'; severity: 'none' }
  | { type: 'suggest_break'; message: string; severity: 'critical' }
  | { type: 'simplify'; message: string; severity: 'warning'; action: { dropToI: boolean } }
  | { type: 'encourage'; message: string; severity: 'info' }
  | { type: 'challenge'; message: string; severity: 'success'; action: { increaseDifficulty: boolean } };

/**
 * Record a signal in the session.
 */
export function recordSignal(
  sessionSignals: SessionSignal[],
  type: SessionSignal['type'],
  activityId: string
): SessionSignal[] {
  return [...sessionSignals, {
    type,
    timestamp: new Date(),
    activityId,
  }];
}

/**
 * Get encouraging messages for various situations.
 */
export const ENCOURAGEMENT_MESSAGES = {
  wrongAnswer: [
    "That's okay! Learning is about making mistakes.",
    "Good try! You're getting closer.",
    "Don't worry, we'll see this again.",
    "That was a common mistake. Let's remember it!",
  ],
  helpUsed: [
    "Asking for help is smart!",
    "Great question! That's how we learn.",
    "I'm here to help you understand.",
  ],
  struggling: [
    "You're working hard, and it shows!",
    "This one is tricky. Let's break it down.",
    "You've got this! Take your time.",
  ],
  success: [
    "Excellent work!",
    "You're making great progress!",
    "That's the way to do it!",
    "Perfect! You're really getting this!",
  ],
  streak: [
    "You're on a roll!",
    "Hot streak! Keep it up!",
    "You're unstoppable today!",
  ],
};

function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
}
```

---

## Integration with Pedagogy Engine

```typescript
// In pedagogyEngine.ts

async function afterActivity(userId: string, activity: ActivityResult, session: SessionContext) {
  // Record signal
  if (!activity.correct) {
    session.signals = recordSignal(session.signals, 'wrong', activity.id);
  }
  if (activity.usedHelp) {
    session.signals = recordSignal(session.signals, 'help', activity.id);
  }
  if (activity.timeMs > activity.averageTimeMs * 2) {
    session.signals = recordSignal(session.signals, 'slow', activity.id);
  }
  
  // Check filter
  const profile = await learnerProfileService.getProfile(userId);
  const filterScore = calculateFilterScore(profile, session.signals);
  const adaptation = getAdaptation(filterScore, session.signals);
  
  // Apply adaptation
  if (adaptation.type !== 'none') {
    session.adaptations.push(adaptation);
    
    if (adaptation.type === 'simplify' && adaptation.action?.dropToI) {
      session.targetLevel = session.currentLevel; // Drop to i
    }
  }
  
  return { session, adaptation };
}
```

---

## Testing Checklist

- [ ] Filter score increases with wrong answers
- [ ] Filter score increases with help requests
- [ ] Rising filter detection works
- [ ] Adaptations are appropriate to severity
- [ ] Encouragement messages display correctly
- [ ] Integration with engine works

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Signal detection is accurate | [ ] |
| Filter score correlates with frustration | [ ] |
| Adaptations are appropriate | [ ] |
| Integration doesn't slow session | [ ] |
| Messages are kid-friendly | [ ] |

---

## Reference
- **PEDAGOGY.md** — Section 2 (Affective Filter Hypothesis)
- **docs/phase-1.2/phase-1.2-overview.md** — Affective filter overview
- **docs/phase-1.2/task-1.2-4-learner-profile-service.md** — Profile signals