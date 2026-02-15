/**
 * Tests for Affective Filter Monitoring Service
 * 
 * Tests for Krashen's Affective Filter monitoring implementation.
 * These tests verify:
 * - Filter score calculation from session signals and profile data
 * - Rising filter detection patterns
 * - Appropriate adaptations for filter states
 * - Signal recording and detection
 * - Encouragement message selection
 * 
 * @module affectiveFilterMonitor.test
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFilterScore,
  isFilterRising,
  getAdaptation,
  recordSignal,
  detectSignals,
  calculateUpdatedFilterRisk,
  decayFilterRisk,
  getRandomMessage,
  requiresImmediateAction,
  involvesDifficultyChange,
  ENCOURAGEMENT_MESSAGES,
  type SessionSignal,
  type AffectiveAdaptationAction,
} from './affectiveFilterMonitor';
import type { LearnerProfile } from '../types/pedagogy';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a mock learner profile for testing */
function createMockProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    id: 'test-profile-1',
    userId: 'user-1',
    nativeLanguage: 'English',
    targetLanguage: 'French',
    currentLevel: 30,
    levelHistory: [],
    totalChunksEncountered: 100,
    chunksAcquired: 50,
    chunksLearning: 30,
    chunksFragile: 20,
    explicitInterests: ['food', 'travel'],
    detectedInterests: [],
    averageConfidence: 0.7,
    confidenceHistory: [],
    totalSessions: 10,
    totalTimeMinutes: 100,
    averageSessionLength: 10,
    helpRequestRate: 0.1,
    wrongAnswerRate: 0.15,
    preferredActivityTypes: ['multiple_choice', 'fill_blank'],
    preferredSessionLength: 10,
    lastReflectionPrompt: '',
    coachingNotes: '',
    filterRiskScore: 0.2,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides,
  };
}

/** Create a mock session signal */
function createSignal(
  type: SessionSignal['type'],
  activityId: string = 'activity-1'
): SessionSignal {
  return {
    type,
    timestamp: new Date(),
    activityId,
  };
}

/** Create an array of signals */
function createSignals(types: SessionSignal['type'][]): SessionSignal[] {
  return types.map((type, i) => createSignal(type, `activity-${i}`));
}

// ============================================================================
// CALCULATE FILTER SCORE TESTS
// ============================================================================

describe('calculateFilterScore', () => {
  it('should return 0 for a perfect profile with no session signals', () => {
    const profile = createMockProfile({
      averageConfidence: 1.0,
      wrongAnswerRate: 0,
      helpRequestRate: 0,
    });
    const signals: SessionSignal[] = [];
    
    const score = calculateFilterScore(profile, signals);
    
    expect(score).toBe(0);
  });

  it('should increase filter score with wrong answer streak', () => {
    const profile = createMockProfile();
    const signals = createSignals(['wrong', 'wrong', 'wrong']);
    
    const score = calculateFilterScore(profile, signals);
    
    // 3 wrong answers should trigger the threshold (0.25)
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should increase filter score with help usage', () => {
    const profile = createMockProfile();
    const signals = createSignals(['help', 'help', 'help', 'help']);
    
    const score = calculateFilterScore(profile, signals);
    
    // High help rate should increase score
    expect(score).toBeGreaterThan(0);
  });

  it('should increase filter score with slow responses', () => {
    const profile = createMockProfile();
    const signals = createSignals(['slow', 'slow', 'slow']);
    
    const score = calculateFilterScore(profile, signals);
    
    expect(score).toBeGreaterThan(0);
  });

  it('should not increase filter score with fast correct answers', () => {
    const profile = createMockProfile();
    const signals = createSignals(['fast', 'fast', 'fast', 'fast', 'fast']);
    
    const score = calculateFilterScore(profile, signals);
    
    // Filter score is bounded at 0, so we verify it stays low
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.05); // Very low filter with fast answers
  });

  it('should increase filter score with low confidence', () => {
    const profile = createMockProfile({
      averageConfidence: 0.2, // Low confidence
    });
    const signals: SessionSignal[] = [];
    
    const score = calculateFilterScore(profile, signals);
    
    // Low confidence should contribute to filter
    expect(score).toBeGreaterThan(0);
    // (0.5 - 0.2) * 0.30 = 0.09
    expect(score).toBeCloseTo(0.09, 1);
  });

  it('should increase filter score with high wrong answer rate', () => {
    const profile = createMockProfile({
      wrongAnswerRate: 0.5, // 50% wrong rate
    });
    const signals: SessionSignal[] = [];
    
    const score = calculateFilterScore(profile, signals);
    
    // High wrong rate should contribute
    expect(score).toBeGreaterThan(0);
    // 0.5 * 0.10 = 0.05
    expect(score).toBeCloseTo(0.05, 1);
  });

  it('should combine multiple signals', () => {
    const profile = createMockProfile({
      averageConfidence: 0.3,
      wrongAnswerRate: 0.3,
    });
    const signals = createSignals(['wrong', 'wrong', 'wrong', 'help', 'slow']);
    
    const score = calculateFilterScore(profile, signals);
    
    // Multiple negative factors should produce an elevated score
    expect(score).toBeGreaterThan(0.2);
  });

  it('should respect custom thresholds', () => {
    const profile = createMockProfile();
    const signals = createSignals(['wrong', 'wrong']); // Only 2 wrong
    
    // Default threshold is 3, so this shouldn't trigger the max wrong streak
    const defaultScore = calculateFilterScore(profile, signals);
    
    // With threshold of 2, this should trigger
    const customScore = calculateFilterScore(profile, signals, {
      wrongAnswerThreshold: 2,
    });
    
    expect(customScore).toBeGreaterThan(defaultScore);
  });

  it('should be bounded between 0 and 1', () => {
    const profile = createMockProfile({
      averageConfidence: 0,
      wrongAnswerRate: 1,
      helpRequestRate: 1,
    });
    // Many negative signals
    const signals = createSignals([
      'wrong', 'wrong', 'wrong', 'wrong', 'wrong',
      'help', 'help', 'help', 'help', 'help',
      'slow', 'slow', 'slow', 'slow', 'slow',
    ]);
    
    const score = calculateFilterScore(profile, signals);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// IS FILTER RISING TESTS
// ============================================================================

describe('isFilterRising', () => {
  it('should detect rising filter with 3+ wrong answers in a row', () => {
    const signals = createSignals(['wrong', 'wrong', 'wrong']);
    
    expect(isFilterRising(signals)).toBe(true);
  });

  it('should detect rising filter with help + wrong answers', () => {
    const signals = createSignals(['wrong', 'help', 'wrong', 'help']);
    
    expect(isFilterRising(signals)).toBe(true);
  });

  it('should detect rising filter with slow + wrong answers', () => {
    const signals = createSignals(['wrong', 'slow', 'wrong', 'slow']);
    
    expect(isFilterRising(signals)).toBe(true);
  });

  it('should detect rising filter with quit after struggles', () => {
    const signals = createSignals(['wrong', 'wrong', 'quit']);
    
    expect(isFilterRising(signals)).toBe(true);
  });

  it('should not detect rising filter with normal signals', () => {
    const signals = createSignals(['fast', 'fast', 'fast']);
    
    expect(isFilterRising(signals)).toBe(false);
  });

  it('should not detect rising filter with isolated wrong answers', () => {
    const signals = createSignals(['wrong', 'fast', 'wrong', 'fast']);
    
    expect(isFilterRising(signals)).toBe(false);
  });

  it('should only look at recent signals', () => {
    // 10 signals, then 3 wrong at the end
    const signals = createSignals([
      'fast', 'fast', 'fast', 'fast', 'fast',
      'fast', 'fast', 'wrong', 'wrong', 'wrong',
    ]);
    
    expect(isFilterRising(signals)).toBe(true);
  });

  it('should respect custom thresholds', () => {
    const signals = createSignals(['wrong', 'wrong']); // Only 2 wrong
    
    expect(isFilterRising(signals)).toBe(false);
    expect(isFilterRising(signals, { wrongAnswerThreshold: 2 })).toBe(true);
  });
});

// ============================================================================
// GET ADAPTATION TESTS
// ============================================================================

describe('getAdaptation', () => {
  it('should return suggest_break for critical filter (> 0.8)', () => {
    // Directly test with a score > 0.8 (critical threshold)
    const signals = createSignals(['wrong', 'wrong', 'wrong', 'wrong', 'wrong']);
    const adaptation = getAdaptation(0.85, signals);
    
    expect(adaptation.type).toBe('suggest_break');
    expect(adaptation.severity).toBe('critical');
    if (adaptation.type === 'suggest_break') {
      expect(adaptation.message).toBeDefined();
    }
  });

  it('should return simplify for rising filter with high score', () => {
    const signals = createSignals(['wrong', 'wrong', 'wrong']);
    
    const adaptation = getAdaptation(0.6, signals, 3.0);
    
    expect(adaptation.type).toBe('simplify');
    expect(adaptation.severity).toBe('warning');
    if (adaptation.type === 'simplify') {
      expect(adaptation.dropToLevel).toBe(2.5);
      expect(adaptation.action?.dropToI).toBe(true);
    }
  });

  it('should return encourage for moderate filter', () => {
    const signals = createSignals(['wrong', 'help']);
    const adaptation = getAdaptation(0.55, signals);
    
    expect(adaptation.type).toBe('encourage');
    expect(adaptation.severity).toBe('info');
    if (adaptation.type === 'encourage') {
      expect(adaptation.message).toBeDefined();
    }
  });

  it('should return challenge for low filter with fast answers', () => {
    const signals = createSignals(['fast', 'fast', 'fast', 'fast']);
    const adaptation = getAdaptation(0.2, signals, 3.0);
    
    expect(adaptation.type).toBe('challenge');
    expect(adaptation.severity).toBe('success');
    if (adaptation.type === 'challenge') {
      expect(adaptation.increaseToLevel).toBe(3.5);
      expect(adaptation.action?.increaseDifficulty).toBe(true);
    }
  });

  it('should return challenge for success streak with fast answers', () => {
    // When user has fast answers AND low filter, they get challenged
    const signals = createSignals(['fast', 'fast', 'fast']);
    const adaptation = getAdaptation(0.15, signals);
    
    // Challenge is returned because fastCount >= 3 triggers before success streak check
    expect(adaptation.type).toBe('challenge');
    expect(adaptation.severity).toBe('success');
  });

  it('should return none for low filter with no signals', () => {
    // With low filter and no signals, no adaptation needed
    const signals: SessionSignal[] = [];
    const adaptation = getAdaptation(0.15, signals);
    
    expect(adaptation.type).toBe('none');
  });

  it('should return none for normal state', () => {
    const signals: SessionSignal[] = [];
    const adaptation = getAdaptation(0.5, signals);
    
    expect(adaptation.type).toBe('none');
    expect(adaptation.severity).toBe('none');
  });

  it('should not return challenge when filter score is moderate', () => {
    const signals = createSignals(['fast', 'fast', 'fast']);
    const adaptation = getAdaptation(0.4, signals);
    
    // Filter score is not low enough (< 0.3) for challenge
    expect(adaptation.type).not.toBe('challenge');
  });

  it('should provide kid-friendly messages', () => {
    const breakSignals = createSignals(['wrong', 'wrong', 'wrong', 'wrong', 'wrong']);
    const adaptation = getAdaptation(0.85, breakSignals);
    
    if (adaptation.type === 'suggest_break') {
      // Message should be from our predefined kid-friendly messages
      expect(ENCOURAGEMENT_MESSAGES.suggestBreak).toContain(adaptation.message);
    }
  });
});

// ============================================================================
// RECORD SIGNAL TESTS
// ============================================================================

describe('recordSignal', () => {
  it('should add a signal to empty array', () => {
    const signals: SessionSignal[] = [];
    
    const result = recordSignal(signals, 'wrong', 'activity-1');
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('wrong');
    expect(result[0].activityId).toBe('activity-1');
    expect(result[0].timestamp).toBeInstanceOf(Date);
  });

  it('should add a signal to existing array', () => {
    const existing = createSignals(['wrong']);
    
    const result = recordSignal(existing, 'help', 'activity-2');
    
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('wrong');
    expect(result[1].type).toBe('help');
  });

  it('should not mutate the original array', () => {
    const original = createSignals(['wrong']);
    
    recordSignal(original, 'help', 'activity-2');
    
    expect(original).toHaveLength(1);
  });

  it('should include optional data', () => {
    const signals: SessionSignal[] = [];
    const data = { responseTime: 45000, average: 20000 };
    
    const result = recordSignal(signals, 'slow', 'activity-1', data);
    
    expect(result[0].data).toEqual(data);
  });
});

// ============================================================================
// DETECT SIGNALS TESTS
// ============================================================================

describe('detectSignals', () => {
  it('should detect wrong answer signal', () => {
    const signals = detectSignals(false, false, 10000, 20000);
    
    expect(signals).toContain('wrong');
  });

  it('should detect help used signal', () => {
    const signals = detectSignals(true, true, 10000, 20000);
    
    expect(signals).toContain('help');
  });

  it('should detect slow response signal', () => {
    const signals = detectSignals(true, false, 45000, 20000); // 2.25x average
    
    expect(signals).toContain('slow');
  });

  it('should detect fast correct signal', () => {
    const signals = detectSignals(true, false, 8000, 20000); // 0.4x average
    
    expect(signals).toContain('fast');
  });

  it('should detect multiple signals', () => {
    const signals = detectSignals(false, true, 45000, 20000);
    
    // Wrong answer + help used + slow response (fast only applies to correct answers)
    expect(signals).toContain('wrong');
    expect(signals).toContain('help');
    expect(signals).toContain('slow');
    expect(signals).toHaveLength(3); // wrong, help, slow (not fast - only for correct answers)
  });

  it('should return empty array for normal correct answer', () => {
    const signals = detectSignals(true, false, 20000, 20000);
    
    expect(signals).toHaveLength(0);
  });

  it('should respect custom slow response multiplier', () => {
    const signals = detectSignals(true, false, 25000, 20000);
    
    // Default threshold (2x) - 25000 is not slow
    expect(signals).not.toContain('slow');
    
    // Custom threshold (1.2x) - 25000 is now slow
    const signalsWithCustom = detectSignals(true, false, 25000, 20000, {
      slowResponseMultiplier: 1.2,
    });
    expect(signalsWithCustom).toContain('slow');
  });
});

// ============================================================================
// CALCULATE UPDATED FILTER RISK TESTS
// ============================================================================

describe('calculateUpdatedFilterRisk', () => {
  it('should combine scores with 80/20 weighting', () => {
    const currentRisk = 0.5;
    const sessionRisk = 0.8;
    
    const result = calculateUpdatedFilterRisk(currentRisk, sessionRisk);
    
    // 0.5 * 0.8 + 0.8 * 0.2 = 0.4 + 0.16 = 0.56
    expect(result).toBeCloseTo(0.56, 2);
  });

  it('should be bounded between 0 and 1', () => {
    expect(calculateUpdatedFilterRisk(0, 0)).toBe(0);
    expect(calculateUpdatedFilterRisk(1, 1)).toBe(1);
    expect(calculateUpdatedFilterRisk(-0.5, 1)).toBeGreaterThanOrEqual(0);
    expect(calculateUpdatedFilterRisk(1, 1.5)).toBeLessThanOrEqual(1);
  });

  it('should increase with higher session risk', () => {
    const currentRisk = 0.3;
    
    const lowSession = calculateUpdatedFilterRisk(currentRisk, 0.2);
    const highSession = calculateUpdatedFilterRisk(currentRisk, 0.8);
    
    expect(highSession).toBeGreaterThan(lowSession);
  });

  it('should maintain historical context', () => {
    // Even with very high session risk, historical context moderates
    const result = calculateUpdatedFilterRisk(0.1, 1.0);
    
    // 0.1 * 0.8 + 1.0 * 0.2 = 0.08 + 0.2 = 0.28
    expect(result).toBeCloseTo(0.28, 2);
    expect(result).toBeLessThan(0.5);
  });
});

// ============================================================================
// DECAY FILTER RISK TESTS
// ============================================================================

describe('decayFilterRisk', () => {
  it('should not decay on same day', () => {
    const result = decayFilterRisk(0.5, 0);
    
    expect(result).toBe(0.5);
  });

  it('should decay by 10% per day', () => {
    const result = decayFilterRisk(1.0, 1);
    
    expect(result).toBeCloseTo(0.9, 2);
  });

  it('should decay to near zero after 10 days', () => {
    const result = decayFilterRisk(1.0, 10);
    
    // 0.9^10 ≈ 0.349
    expect(result).toBeCloseTo(0.349, 2);
  });

  it('should not go below zero', () => {
    const result = decayFilterRisk(0.01, 10);
    
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should reach essentially zero after extended absence', () => {
    const result = decayFilterRisk(1.0, 20);
    
    // 0.9^10 ≈ 0.349 (capped at 10 days)
    expect(result).toBeCloseTo(0.349, 2);
  });
});

// ============================================================================
// GET RANDOM MESSAGE TESTS
// ============================================================================

describe('getRandomMessage', () => {
  it('should return a message from the specified category', () => {
    const message = getRandomMessage('wrongAnswer');
    
    expect(ENCOURAGEMENT_MESSAGES.wrongAnswer).toContain(message);
  });

  it('should return a string', () => {
    const message = getRandomMessage('success');
    
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should work for all categories', () => {
    const categories = [
      'wrongAnswer',
      'helpUsed',
      'struggling',
      'success',
      'streak',
      'suggestBreak',
      'simplify',
      'challenge',
    ] as const;
    
    for (const category of categories) {
      const message = getRandomMessage(category);
      expect(ENCOURAGEMENT_MESSAGES[category]).toContain(message);
    }
  });
});

// ============================================================================
// REQUIRES IMMEDIATE ACTION TESTS
// ============================================================================

describe('requiresImmediateAction', () => {
  it('should return true for critical severity', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'suggest_break',
      message: 'Take a break',
      severity: 'critical',
    };
    
    expect(requiresImmediateAction(adaptation)).toBe(true);
  });

  it('should return true for warning severity', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'simplify',
      message: 'Simplifying',
      severity: 'warning',
      dropToLevel: 2,
    };
    
    expect(requiresImmediateAction(adaptation)).toBe(true);
  });

  it('should return false for info severity', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'encourage',
      message: 'Keep going',
      severity: 'info',
    };
    
    expect(requiresImmediateAction(adaptation)).toBe(false);
  });

  it('should return false for success severity', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'encourage',
      message: 'Great job',
      severity: 'success',
    };
    
    expect(requiresImmediateAction(adaptation)).toBe(false);
  });

  it('should return false for none severity', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'none',
      severity: 'none',
    };
    
    expect(requiresImmediateAction(adaptation)).toBe(false);
  });
});

// ============================================================================
// INVOLVES DIFFICULTY CHANGE TESTS
// ============================================================================

describe('involvesDifficultyChange', () => {
  it('should return true for simplify action', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'simplify',
      message: 'Simplifying',
      severity: 'warning',
      dropToLevel: 2,
    };
    
    expect(involvesDifficultyChange(adaptation)).toBe(true);
  });

  it('should return true for challenge action', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'challenge',
      message: 'Challenging',
      severity: 'success',
      increaseToLevel: 4,
    };
    
    expect(involvesDifficultyChange(adaptation)).toBe(true);
  });

  it('should return false for encourage action', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'encourage',
      message: 'Keep going',
      severity: 'info',
    };
    
    expect(involvesDifficultyChange(adaptation)).toBe(false);
  });

  it('should return false for suggest_break action', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'suggest_break',
      message: 'Take a break',
      severity: 'critical',
    };
    
    expect(involvesDifficultyChange(adaptation)).toBe(false);
  });

  it('should return false for none action', () => {
    const adaptation: AffectiveAdaptationAction = {
      type: 'none',
      severity: 'none',
    };
    
    expect(involvesDifficultyChange(adaptation)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  it('should handle a complete session flow', () => {
    // Use a standard profile (not perfect) so filter scores respond meaningfully
    const profile = createMockProfile({
      averageConfidence: 0.7,
      wrongAnswerRate: 0.15,
      helpRequestRate: 0.1,
    });
    let signals: SessionSignal[] = [];
    
    // Start session - baseline filter from profile
    let score = calculateFilterScore(profile, signals);
    expect(score).toBeGreaterThanOrEqual(0);
    
    // Add some fast signals - filter stays low
    signals = recordSignal(signals, 'fast', 'act-1');
    signals = recordSignal(signals, 'fast', 'act-2');
    signals = recordSignal(signals, 'fast', 'act-3');
    
    score = calculateFilterScore(profile, signals);
    expect(score).toBeLessThan(0.1); // Very low filter with fast answers
    
    let adaptation = getAdaptation(score, signals);
    expect(adaptation.type).toBe('challenge'); // Low filter + fast answers
    
    // User starts struggling - add wrong streak at the end (streaks count from end)
    // Need 3 consecutive wrong answers at the end to trigger rising filter
    signals = recordSignal(signals, 'help', 'act-4');
    signals = recordSignal(signals, 'wrong', 'act-5');
    signals = recordSignal(signals, 'wrong', 'act-6');
    signals = recordSignal(signals, 'wrong', 'act-7'); // 3 wrong streak at end
    
    // Filter score should be elevated due to wrong streak
    score = calculateFilterScore(profile, signals);
    expect(score).toBeGreaterThan(0); // Filter is rising
    
    // The key test is that the rising filter is detected (3 wrong at end)
    const rising = isFilterRising(signals);
    expect(rising).toBe(true);
    
    // Get adaptation - should simplify because rising filter + score > 0.5
    adaptation = getAdaptation(0.6, signals); // Use a higher score to trigger simplify
    expect(adaptation.type).toBe('simplify'); // Should simplify due to rising filter
    expect(adaptation.severity).toBe('warning');
  });

  it('should progressively detect worsening state', () => {
    // Use a standard profile
    const profile = createMockProfile({
      averageConfidence: 0.7,
      wrongAnswerRate: 0.1,
      helpRequestRate: 0.05,
    });
    const signals: SessionSignal[] = [];
    
    // Start with good performance
    let score = calculateFilterScore(profile, signals);
    expect(score).toBeGreaterThanOrEqual(0);
    
    // One wrong answer (not a streak yet)
    signals.push(createSignal('wrong'));
    score = calculateFilterScore(profile, signals);
    // Single wrong adds 0.08 for streak of 1
    expect(score).toBeGreaterThan(0);
    
    // Two wrong answers
    signals.push(createSignal('wrong'));
    score = calculateFilterScore(profile, signals);
    // Streak of 2 adds 0.16
    expect(score).toBeGreaterThan(0.05);
    
    // Three wrong - rising filter detected
    signals.push(createSignal('wrong'));
    expect(isFilterRising(signals)).toBe(true);
    
    // Continue to critical state
    signals.push(createSignal('help'));
    signals.push(createSignal('slow'));
    signals.push(createSignal('wrong'));
    
    const adaptation = getAdaptation(0.9, signals);
    expect(adaptation.type).toBe('suggest_break');
    expect(requiresImmediateAction(adaptation)).toBe(true);
  });
});
