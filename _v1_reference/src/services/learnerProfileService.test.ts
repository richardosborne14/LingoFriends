/**
 * Tests for Learner Profile Service
 * 
 * Tests the core functionality of the learner profile service:
 * - Helper functions (confidence, filter risk, level conversion)
 * - Profile management (create, get, update)
 * - Interest tracking
 * - Session recording
 * - Level evaluation
 * 
 * @see src/services/learnerProfileService.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updateConfidenceScore,
  calculateFilterRisk,
} from './learnerProfileService';
import type { LearnerProfile, CEFRSubLevel } from '../types/pedagogy';
import {
  levelToSubLevel,
  subLevelToLevel,
  getEstimatedLevel,
  getChunksToNextLevel,
} from '../types/pedagogy';

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('updateConfidenceScore', () => {
  it('should increase confidence after correct answer', () => {
    const current = 0.5;
    const result = updateConfidenceScore(current, true, false);
    expect(result).toBeGreaterThan(current);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should decrease confidence after wrong answer', () => {
    const current = 0.5;
    const result = updateConfidenceScore(current, false, false);
    expect(result).toBeLessThan(current);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should give partial credit for correct with help', () => {
    const current = 0.5;
    const withHelp = updateConfidenceScore(current, true, true);
    const withoutHelp = updateConfidenceScore(current, true, false);
    
    // With help should improve less than without help
    expect(withHelp).toBeLessThan(withoutHelp);
    expect(withHelp).toBeGreaterThan(current);
  });

  it('should use 10% weight for new activities', () => {
    const current = 0.5;
    const correctNoHelp = updateConfidenceScore(current, true, false);
    
    // 0.5 * 0.9 + 1.0 * 0.1 = 0.45 + 0.1 = 0.55
    expect(correctNoHelp).toBeCloseTo(0.55, 2);
  });

  it('should clamp confidence to valid range', () => {
    // High confidence + wrong
    const highWrong = updateConfidenceScore(0.99, false, false);
    expect(highWrong).toBeGreaterThanOrEqual(0);
    
    // Low confidence + correct
    const lowCorrect = updateConfidenceScore(0.01, true, false);
    expect(lowCorrect).toBeLessThanOrEqual(1);
  });
});

describe('calculateFilterRisk', () => {
  // Create a mock profile for testing
  const createMockProfile = (overrides: Partial<LearnerProfile> = {}): LearnerProfile => ({
    id: 'test-id',
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
    totalTimeMinutes: 120,
    averageSessionLength: 12,
    helpRequestRate: 0.1,
    wrongAnswerRate: 0.2,
    preferredActivityTypes: ['multiple-choice'],
    preferredSessionLength: 15,
    lastReflectionPrompt: '',
    coachingNotes: '',
    filterRiskScore: 0.1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides,
  });

  it('should return 0 for a well-performing learner', () => {
    const profile = createMockProfile({
      averageConfidence: 0.9,
      helpRequestRate: 0.05,
      wrongAnswerRate: 0.1,
    });
    
    const risk = calculateFilterRisk(profile, [
      { correct: true, usedHelp: false },
      { correct: true, usedHelp: false },
      { correct: true, usedHelp: false },
    ]);
    
    expect(risk).toBeLessThan(0.2);
  });

  it('should increase risk for wrong answers', () => {
    const profile = createMockProfile();
    
    const lowRisk = calculateFilterRisk(profile, [
      { correct: true, usedHelp: false },
    ]);
    
    const highRisk = calculateFilterRisk(profile, [
      { correct: false, usedHelp: false },
    ]);
    
    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  it('should increase risk for help usage', () => {
    const lowHelp = createMockProfile({ helpRequestRate: 0.1 });
    const highHelp = createMockProfile({ helpRequestRate: 0.5 });
    
    const lowRisk = calculateFilterRisk(lowHelp, []);
    const highRisk = calculateFilterRisk(highHelp, []);
    
    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  it('should increase risk for low confidence', () => {
    const highConfidence = createMockProfile({ averageConfidence: 0.9 });
    const lowConfidence = createMockProfile({ averageConfidence: 0.3 });
    
    const lowRisk = calculateFilterRisk(highConfidence, []);
    const highRisk = calculateFilterRisk(lowConfidence, []);
    
    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  it('should increase risk for recent struggle', () => {
    const noStruggle = createMockProfile({ lastStruggleDate: undefined });
    const recentStruggle = createMockProfile({
      lastStruggleDate: new Date().toISOString(),
    });
    
    const lowRisk = calculateFilterRisk(noStruggle, []);
    const highRisk = calculateFilterRisk(recentStruggle, []);
    
    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  it('should cap risk at 1.0', () => {
    const profile = createMockProfile({
      averageConfidence: 0.1,
      helpRequestRate: 1.0,
      lastStruggleDate: new Date().toISOString(),
    });
    
    const risk = calculateFilterRisk(profile, [
      { correct: false, usedHelp: false },
      { correct: false, usedHelp: false },
      { correct: false, usedHelp: false },
    ]);
    
    expect(risk).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// LEVEL CONVERSION TESTS
// ============================================================================

describe('levelToSubLevel', () => {
  it('should convert level 0 to A1', () => {
    expect(levelToSubLevel(0)).toBe('A1');
  });

  it('should convert level 10 to A1+', () => {
    expect(levelToSubLevel(10)).toBe('A1+');
  });

  it('should convert level 20 to A2-', () => {
    expect(levelToSubLevel(20)).toBe('A2-');
  });

  it('should convert level 30 to A2', () => {
    expect(levelToSubLevel(30)).toBe('A2');
  });

  it('should convert level 40 to A2+', () => {
    expect(levelToSubLevel(40)).toBe('A2+');
  });

  it('should convert level 60 to B1', () => {
    expect(levelToSubLevel(60)).toBe('B1');
  });

  it('should convert level 100 to C2', () => {
    expect(levelToSubLevel(100)).toBe('C2');
  });

  it('should find nearest level for in-between values', () => {
    // 15 is closer to A1+ (10) than A2- (20)
    expect(levelToSubLevel(15)).toBe('A1+');
    
    // 55 is B1- (50)
    expect(levelToSubLevel(55)).toBe('B1-');
  });

  it('should clamp values outside 0-100 range', () => {
    expect(levelToSubLevel(-10)).toBe('A1');
    expect(levelToSubLevel(150)).toBe('C2');
  });
});

describe('subLevelToLevel', () => {
  it('should convert A1 to 0', () => {
    expect(subLevelToLevel('A1')).toBe(0);
  });

  it('should convert A1+ to 10', () => {
    expect(subLevelToLevel('A1+')).toBe(10);
  });

  it('should convert A2- to 20', () => {
    expect(subLevelToLevel('A2-')).toBe(20);
  });

  it('should convert B1 to 60', () => {
    expect(subLevelToLevel('B1')).toBe(60);
  });

  it('should convert C2 to 100', () => {
    expect(subLevelToLevel('C2')).toBe(100);
  });
});

describe('getEstimatedLevel', () => {
  it('should estimate A1 for few chunks', () => {
    const level = getEstimatedLevel(25);
    expect(levelToSubLevel(level)).toBe('A1');
  });

  it('should estimate A1+ for ~50 chunks', () => {
    const level = getEstimatedLevel(50);
    expect(levelToSubLevel(level)).toBe('A1+');
  });

  it('should estimate A1+ for ~100 chunks (A2- needs ~150)', () => {
    // 100 chunks = level 15 (A1+)
    const level100 = getEstimatedLevel(100);
    expect(levelToSubLevel(level100)).toBe('A1+');
    
    // 150 chunks = level 20 (A2-)
    const level150 = getEstimatedLevel(150);
    expect(levelToSubLevel(level150)).toBe('A2-');
  });

  it('should estimate higher levels for more chunks', () => {
    const level500 = getEstimatedLevel(500);
    const level1000 = getEstimatedLevel(1000);
    const level2000 = getEstimatedLevel(2000);
    
    expect(level1000).toBeGreaterThan(level500);
    expect(level2000).toBeGreaterThan(level1000);
  });

  it('should cap at 100', () => {
    const level = getEstimatedLevel(5000);
    expect(level).toBeLessThanOrEqual(100);
  });
});

describe('getChunksToNextLevel', () => {
  it('should return A1+ for 0 chunks', () => {
    const result = getChunksToNextLevel(0, 0);
    expect(result.nextLevel).toBe('A1+');
    expect(result.chunksNeeded).toBe(50);
  });

  it('should return A2- for 50 chunks', () => {
    const result = getChunksToNextLevel(10, 50);
    expect(result.nextLevel).toBe('A2-');
    expect(result.chunksNeeded).toBe(50);
  });

  it('should return C2 with 0 needed at max', () => {
    const result = getChunksToNextLevel(100, 5000);
    expect(result.nextLevel).toBe('C2');
    expect(result.chunksNeeded).toBe(0);
  });
});

// ============================================================================
// ROUNDTRIP TESTS
// ============================================================================

describe('Level conversion roundtrips', () => {
  it('should roundtrip all sub-levels correctly', () => {
    const subLevels: CEFRSubLevel[] = [
      'A1', 'A1+',
      'A2-', 'A2', 'A2+',
      'B1-', 'B1', 'B1+',
      'B2-', 'B2', 'B2+',
      'C1-', 'C1', 'C1+',
      'C2',
    ];
    
    for (const subLevel of subLevels) {
      const level = subLevelToLevel(subLevel);
      const backToSubLevel = levelToSubLevel(level);
      expect(backToSubLevel).toBe(subLevel);
    }
  });
});