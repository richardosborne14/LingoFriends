/**
 * Tests for i+1 Difficulty Calibration Service
 * 
 * These tests verify the core functions of the difficulty calibration system:
 * - Level calculation from learner profiles
 * - i+1 target level computation
 * - Difficulty adaptation based on performance
 * - Drop-back detection for struggling learners
 * 
 * @module difficultyCalibration.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentLevel,
  getTargetLevel,
  calibrateDifficulty,
  adaptDifficulty,
  shouldDropBack,
  mapChunksToLevel,
  levelToCEFRLabel,
  getDifficultyRange,
  summarizePerformance,
} from './difficultyCalibration';
import type { LearnerProfile, ActivityResult, PerformanceData } from '../types/pedagogy';

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Create a mock learner profile for testing.
 */
function createMockProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    id: 'test-profile-1',
    userId: 'test-user-1',
    nativeLanguage: 'English',
    targetLanguage: 'French',
    currentLevel: 30,
    levelHistory: [],
    totalChunksEncountered: 100,
    chunksAcquired: 50,
    chunksLearning: 30,
    chunksFragile: 5,
    explicitInterests: ['travel', 'food'],
    detectedInterests: [],
    averageConfidence: 0.7,
    confidenceHistory: [],
    totalSessions: 10,
    totalTimeMinutes: 120,
    averageSessionLength: 12,
    helpRequestRate: 0.1,
    wrongAnswerRate: 0.15,
    preferredActivityTypes: ['multiple_choice', 'fill_blank'],
    preferredSessionLength: 15,
    lastReflectionPrompt: '',
    coachingNotes: '',
    filterRiskScore: 0.1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock activity results for testing.
 */
function createMockActivities(results: Array<{ correct: boolean; usedHelp?: boolean }>): ActivityResult[] {
  return results.map((r, i) => ({
    id: `activity-${i}`,
    activityType: 'multiple_choice' as const,
    chunkIds: [`chunk-${i}`],
    correct: r.correct,
    responseTimeMs: 3000,
    usedHelp: r.usedHelp ?? false,
    attempts: r.correct ? 1 : 2,
    timestamp: new Date().toISOString(),
  }));
}

// ============================================================================
// TESTS: mapChunksToLevel
// ============================================================================

describe('mapChunksToLevel', () => {
  it('should return 1.0 for beginners (0 chunks)', () => {
    expect(mapChunksToLevel(0)).toBe(1.0);
  });

  it('should return 1.0 for 25 chunks', () => {
    expect(mapChunksToLevel(25)).toBe(1.0);
  });

  it('should return 1.5 for 50+ chunks (A1+)', () => {
    expect(mapChunksToLevel(50)).toBe(1.5);
  });

  it('should return 2.0 for 150+ chunks (A2)', () => {
    expect(mapChunksToLevel(150)).toBe(2.0);
    expect(mapChunksToLevel(200)).toBe(2.0);
  });

  it('should return 2.5 for 300+ chunks (A2+)', () => {
    expect(mapChunksToLevel(300)).toBe(2.5);
  });

  it('should return 3.0 for 500+ chunks (B1)', () => {
    expect(mapChunksToLevel(500)).toBe(3.0);
  });

  it('should return 3.5 for 800+ chunks (B1+)', () => {
    expect(mapChunksToLevel(800)).toBe(3.5);
  });

  it('should return 4.0 for 1200+ chunks (B2)', () => {
    expect(mapChunksToLevel(1200)).toBe(4.0);
  });

  it('should return 4.5 for 1700+ chunks (B2+)', () => {
    expect(mapChunksToLevel(1700)).toBe(4.5);
  });

  it('should return 5.0 for 2300+ chunks (C1)', () => {
    expect(mapChunksToLevel(2300)).toBe(5.0);
    expect(mapChunksToLevel(3000)).toBe(5.0);
  });
});

// ============================================================================
// TESTS: getCurrentLevel
// ============================================================================

describe('getCurrentLevel', () => {
  it('should calculate level from acquired chunks', () => {
    const profile = createMockProfile({ chunksAcquired: 100 });
    const level = getCurrentLevel(profile);
    // 100 chunks -> base 1.5, adjusted by confidence and filter risk
    expect(level).toBeGreaterThanOrEqual(1.0);
    expect(level).toBeLessThanOrEqual(5.0);
  });

  it('should increase level for high confidence', () => {
    const lowConfidenceProfile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.5, // Neutral
      filterRiskScore: 0,
    });
    
    const highConfidenceProfile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.8, // High confidence
      filterRiskScore: 0,
    });
    
    const lowLevel = getCurrentLevel(lowConfidenceProfile);
    const highLevel = getCurrentLevel(highConfidenceProfile);
    
    expect(highLevel).toBeGreaterThan(lowLevel);
  });

  it('should decrease level for high filter risk', () => {
    const normalProfile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.7,
      filterRiskScore: 0.1,
    });
    
    const stressedProfile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.7,
      filterRiskScore: 0.8, // High filter risk
    });
    
    const normalLevel = getCurrentLevel(normalProfile);
    const stressedLevel = getCurrentLevel(stressedProfile);
    
    expect(stressedLevel).toBeLessThan(normalLevel);
  });

  it('should clamp level to valid range (1-5)', () => {
    // Very high chunks with high confidence
    const maxProfile = createMockProfile({
      chunksAcquired: 5000,
      averageConfidence: 1.0,
      filterRiskScore: 0,
    });
    
    // Very low chunks with low confidence and high stress
    const minProfile = createMockProfile({
      chunksAcquired: 0,
      averageConfidence: 0,
      filterRiskScore: 1.0,
    });
    
    expect(getCurrentLevel(maxProfile)).toBeLessThanOrEqual(5.0);
    expect(getCurrentLevel(minProfile)).toBeGreaterThanOrEqual(1.0);
  });
});

// ============================================================================
// TESTS: getTargetLevel
// ============================================================================

describe('getTargetLevel', () => {
  it('should return i+1 under normal conditions', () => {
    const profile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.7,
      filterRiskScore: 0.1,
    });
    
    const currentLevel = getCurrentLevel(profile);
    const targetLevel = getTargetLevel(profile);
    
    expect(targetLevel).toBe(currentLevel + 1);
  });

  it('should cap at level 5 for advanced learners', () => {
    const profile = createMockProfile({
      chunksAcquired: 3000,
      averageConfidence: 0.9,
      filterRiskScore: 0,
    });
    
    const targetLevel = getTargetLevel(profile);
    expect(targetLevel).toBeLessThanOrEqual(5.0);
  });

  it('should drop to i when filter risk is high', () => {
    const profile = createMockProfile({
      chunksAcquired: 100,
      averageConfidence: 0.5,
      filterRiskScore: 0.8, // High filter risk
    });
    
    const currentLevel = getCurrentLevel(profile);
    const targetLevel = getTargetLevel(profile);
    
    // Should return current level, not current + 1
    expect(targetLevel).toBe(currentLevel);
  });
});

// ============================================================================
// TESTS: calibrateDifficulty
// ============================================================================

describe('calibrateDifficulty', () => {
  it('should return complete calibration analysis', () => {
    const profile = createMockProfile({
      chunksAcquired: 200,
      averageConfidence: 0.7,
      filterRiskScore: 0.2,
    });
    
    const calibration = calibrateDifficulty(profile);
    
    expect(calibration).toHaveProperty('currentLevel');
    expect(calibration).toHaveProperty('targetLevel');
    expect(calibration).toHaveProperty('shouldDropBack');
    expect(calibration).toHaveProperty('reasoning');
    expect(calibration).toHaveProperty('factors');
    
    expect(calibration.currentLevel).toBeGreaterThan(0);
    expect(calibration.targetLevel).toBeGreaterThan(0);
    expect(typeof calibration.reasoning).toBe('string');
  });

  it('should include factor breakdown', () => {
    const profile = createMockProfile({
      chunksAcquired: 500,
      averageConfidence: 0.8,
      filterRiskScore: 0.3,
    });
    
    const calibration = calibrateDifficulty(profile);
    
    expect(calibration.factors.chunkBaseLevel).toBeDefined();
    expect(calibration.factors.confidenceAdjustment).toBeDefined();
    expect(calibration.factors.filterRiskAdjustment).toBeDefined();
  });
});

// ============================================================================
// TESTS: adaptDifficulty
// ============================================================================

describe('adaptDifficulty', () => {
  it('should increase difficulty for strong performance', () => {
    const performance: PerformanceData = {
      correct: 9,
      total: 10,
      avgResponseTimeMs: 3000,
      helpUsedCount: 0,
    };
    
    const newTarget = adaptDifficulty(3.0, performance);
    
    // 90% accuracy, no help -> increase by 0.2
    expect(newTarget).toBe(3.2);
  });

  it('should decrease difficulty for poor accuracy', () => {
    const performance: PerformanceData = {
      correct: 4,
      total: 10,
      avgResponseTimeMs: 5000,
      helpUsedCount: 1,
    };
    
    const newTarget = adaptDifficulty(3.0, performance);
    
    // 40% accuracy -> decrease by 0.3
    expect(newTarget).toBe(2.7);
  });

  it('should decrease difficulty for high help usage', () => {
    const performance: PerformanceData = {
      correct: 8,
      total: 10,
      avgResponseTimeMs: 4000,
      helpUsedCount: 4, // 40% help rate
    };
    
    const newTarget = adaptDifficulty(3.0, performance);
    
    // Help rate > 30% -> decrease
    expect(newTarget).toBe(2.7);
  });

  it('should maintain difficulty for average performance', () => {
    const performance: PerformanceData = {
      correct: 7,
      total: 10,
      avgResponseTimeMs: 3500,
      helpUsedCount: 1,
    };
    
    const newTarget = adaptDifficulty(3.0, performance);
    
    // 70% accuracy, 10% help rate -> maintain level (not below 70% threshold)
    expect(newTarget).toBe(3.0);
  });

  it('should not exceed level 5', () => {
    const performance: PerformanceData = {
      correct: 10,
      total: 10,
      avgResponseTimeMs: 2000,
      helpUsedCount: 0,
    };
    
    const newTarget = adaptDifficulty(4.9, performance);
    
    expect(newTarget).toBeLessThanOrEqual(5.0);
  });

  it('should not go below level 1', () => {
    const performance: PerformanceData = {
      correct: 0,
      total: 10,
      avgResponseTimeMs: 8000,
      helpUsedCount: 5,
    };
    
    const newTarget = adaptDifficulty(1.1, performance);
    
    expect(newTarget).toBeGreaterThanOrEqual(1.0);
  });

  it('should slightly increase for good performance with some help', () => {
    const performance: PerformanceData = {
      correct: 8,
      total: 10,
      avgResponseTimeMs: 3000,
      helpUsedCount: 2, // 20% help rate
    };
    
    const newTarget = adaptDifficulty(3.0, performance);
    
    // 80% accuracy, 20% help -> small increase (0.1)
    expect(newTarget).toBe(3.1);
  });
});

// ============================================================================
// TESTS: shouldDropBack
// ============================================================================

describe('shouldDropBack', () => {
  it('should return false for healthy profile', () => {
    const profile = createMockProfile({
      filterRiskScore: 0.2,
      averageConfidence: 0.7,
    });
    
    const activities = createMockActivities([
      { correct: true },
      { correct: true },
      { correct: false },
      { correct: true },
      { correct: true },
    ]);
    
    expect(shouldDropBack(profile, activities)).toBe(false);
  });

  it('should return true for high filter risk', () => {
    const profile = createMockProfile({
      filterRiskScore: 0.8,
      averageConfidence: 0.7,
    });
    
    const activities = createMockActivities([
      { correct: true },
      { correct: true },
    ]);
    
    expect(shouldDropBack(profile, activities)).toBe(true);
  });

  it('should return true for low confidence', () => {
    const profile = createMockProfile({
      filterRiskScore: 0.2,
      averageConfidence: 0.3, // Low confidence
    });
    
    const activities = createMockActivities([
      { correct: true },
      { correct: true },
    ]);
    
    expect(shouldDropBack(profile, activities)).toBe(true);
  });

  it('should return true for 3+ wrong answers in last 5', () => {
    const profile = createMockProfile({
      filterRiskScore: 0.2,
      averageConfidence: 0.7,
    });
    
    const activities = createMockActivities([
      { correct: true },
      { correct: false },
      { correct: false },
      { correct: false },
      { correct: true },
    ]);
    
    expect(shouldDropBack(profile, activities)).toBe(true);
  });

  it('should only consider last 5 activities', () => {
    const profile = createMockProfile({
      filterRiskScore: 0.2,
      averageConfidence: 0.7,
    });
    
    // 5 correct, then 3 wrong in last 5
    const activities = createMockActivities([
      { correct: true },
      { correct: true },
      { correct: true },
      { correct: true },
      { correct: true },
      { correct: false },
      { correct: false },
      { correct: false },
      { correct: true },
      { correct: true },
    ]);
    
    expect(shouldDropBack(profile, activities)).toBe(true);
  });
});

// ============================================================================
// TESTS: levelToCEFRLabel
// ============================================================================

describe('levelToCEFRLabel', () => {
  it('should return A1 for level 1.0', () => {
    expect(levelToCEFRLabel(1.0)).toBe('A1');
    expect(levelToCEFRLabel(1.4)).toBe('A1');
  });

  it('should return A1+ for level 1.5-1.9', () => {
    expect(levelToCEFRLabel(1.5)).toBe('A1+');
    expect(levelToCEFRLabel(1.9)).toBe('A1+');
  });

  it('should return A2 for level 2.0-2.4', () => {
    expect(levelToCEFRLabel(2.0)).toBe('A2');
    expect(levelToCEFRLabel(2.4)).toBe('A2');
  });

  it('should return A2+ for level 2.5-2.9', () => {
    expect(levelToCEFRLabel(2.5)).toBe('A2+');
  });

  it('should return B1 for level 3.0-3.4', () => {
    expect(levelToCEFRLabel(3.0)).toBe('B1');
  });

  it('should return B1+ for level 3.5-3.9', () => {
    expect(levelToCEFRLabel(3.5)).toBe('B1+');
  });

  it('should return B2 for level 4.0-4.4', () => {
    expect(levelToCEFRLabel(4.0)).toBe('B2');
  });

  it('should return B2+ for level 4.5-4.9', () => {
    expect(levelToCEFRLabel(4.5)).toBe('B2+');
    expect(levelToCEFRLabel(4.9)).toBe('B2+');
  });

  it('should return C1 for level 5.0', () => {
    expect(levelToCEFRLabel(5.0)).toBe('C1');
  });
});

// ============================================================================
// TESTS: getDifficultyRange
// ============================================================================

describe('getDifficultyRange', () => {
  it('should return range with default tolerance', () => {
    const range = getDifficultyRange(3.0);
    expect(range).toEqual([2.5, 3.5]);
  });

  it('should accept custom tolerance', () => {
    const range = getDifficultyRange(3.0, 0.3);
    expect(range).toEqual([2.7, 3.3]);
  });

  it('should clamp minimum to 1', () => {
    const range = getDifficultyRange(1.2, 0.5);
    expect(range[0]).toBe(1);
    expect(range[1]).toBe(1.7);
  });

  it('should clamp maximum to 5', () => {
    const range = getDifficultyRange(4.8, 0.5);
    expect(range[0]).toBe(4.3);
    expect(range[1]).toBe(5);
  });
});

// ============================================================================
// TESTS: summarizePerformance
// ============================================================================

describe('summarizePerformance', () => {
  it('should calculate correct summary', () => {
    const activities = createMockActivities([
      { correct: true },
      { correct: true },
      { correct: false },
      { correct: true, usedHelp: true },
      { correct: false },
    ]);
    
    const summary = summarizePerformance(activities);
    
    expect(summary.correct).toBe(3);
    expect(summary.total).toBe(5);
    expect(summary.helpUsedCount).toBe(1);
    expect(summary.avgResponseTimeMs).toBe(3000);
  });

  it('should handle empty activities', () => {
    const summary = summarizePerformance([]);
    
    expect(summary.correct).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.helpUsedCount).toBe(0);
    expect(summary.avgResponseTimeMs).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Difficulty Calibration Integration', () => {
  it('should provide consistent calibration flow', () => {
    // Simulate a beginner learner
    const beginnerProfile = createMockProfile({
      chunksAcquired: 30,
      averageConfidence: 0.6,
      filterRiskScore: 0.2,
    });
    
    const currentLevel = getCurrentLevel(beginnerProfile);
    const targetLevel = getTargetLevel(beginnerProfile);
    const calibration = calibrateDifficulty(beginnerProfile);
    
    // Beginner should be at level 1.x
    expect(currentLevel).toBeLessThan(2);
    expect(targetLevel).toBe(currentLevel + 1);
    expect(calibration.shouldDropBack).toBe(false);
  });

  it('should detect struggling learner and drop back', () => {
    const strugglingProfile = createMockProfile({
      chunksAcquired: 200,
      averageConfidence: 0.35, // Low confidence
      filterRiskScore: 0.75, // High filter risk
    });
    
    const calibration = calibrateDifficulty(strugglingProfile);
    
    expect(calibration.shouldDropBack).toBe(true);
    // Target should equal current level (no +1)
    expect(calibration.targetLevel).toBe(calibration.currentLevel);
  });

  it('should adapt difficulty based on performance trajectory', () => {
    let targetLevel = 3.0;
    
    // Strong performance -> increase
    targetLevel = adaptDifficulty(targetLevel, {
      correct: 9,
      total: 10,
      avgResponseTimeMs: 2500,
      helpUsedCount: 0,
    });
    expect(targetLevel).toBeCloseTo(3.2, 5);
    
    // Continue strong -> increase more
    targetLevel = adaptDifficulty(targetLevel, {
      correct: 10,
      total: 10,
      avgResponseTimeMs: 2000,
      helpUsedCount: 0,
    });
    expect(targetLevel).toBeCloseTo(3.4, 5);
    
    // Struggle -> decrease
    targetLevel = adaptDifficulty(targetLevel, {
      correct: 4,
      total: 10,
      avgResponseTimeMs: 6000,
      helpUsedCount: 2,
    });
    expect(targetLevel).toBeCloseTo(3.1, 5); // 3.4 - 0.3
  });
});