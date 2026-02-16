/**
 * Seed Service Tests
 * 
 * Unit tests for seed earning and planting mechanics.
 * 
 * @module seedService.test
 * @see docs/phase-1.1/task-1-1-13-seed-earning.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSeedEarned,
  checkBonusSeedEarned,
  checkStreakSeedEarned,
  formatSeeds,
  calculateSeedReward,
  SEEDS_FOR_PATH_COMPLETE,
  SEEDS_FOR_PERFECT_PATH,
  SEEDS_FOR_STREAK_MILESTONE,
  MAX_SEEDS,
} from './seedService';
import type { UserTree } from '../types/game';
import { TreeStatus } from '../types/game';

// ============================================
// MOCKS
// ============================================

// Mock Pocketbase service
vi.mock('../../services/pocketbaseService', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    })),
  },
  getCurrentUserId: vi.fn(() => 'test-user-123'),
}));

// ============================================
// TEST DATA
// ============================================

/**
 * Create a mock tree for testing.
 * Updated for per-tree SunDrops architecture (Task 1.1.19).
 */
function createMockTree(overrides: Partial<UserTree> = {}): UserTree {
  return {
    id: 'tree-1',
    userId: 'test-user-123',
    skillPathId: 'path-spanish-basics',
    name: 'Spanish Basics',
    icon: '🇪🇸',
    status: TreeStatus.GROWING,
    health: 100,
    bufferDays: 0,
    lastRefreshDate: new Date().toISOString(),
    lastLessonDate: new Date().toISOString(),
    sunDropsEarned: 50,
    sunDropsTotal: 50,
    growthStage: 3,
    gridPosition: { gx: 3, gz: 3 },
    position: { x: 150, y: 150 },
    lessonsCompleted: 4,
    lessonsTotal: 5,
    decorations: [],
    giftsReceived: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// SEED EARNING CHECKS
// ============================================

describe('checkSeedEarned', () => {
  it('should not earn seed for non-final lesson', () => {
    const tree = createMockTree({
      lessonsCompleted: 2,
      lessonsTotal: 5,
    });
    
    const result = checkSeedEarned(tree, 'lesson-3', 3);
    
    expect(result.earned).toBe(false);
    expect(result.trigger).toBe('none');
  });

  it('should earn seed when completing final lesson', () => {
    const tree = createMockTree({
      lessonsCompleted: 4, // About to complete lesson 5
      lessonsTotal: 5,
    });
    
    const result = checkSeedEarned(tree, 'lesson-5', 2);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('path_complete');
    expect(result.reason).toContain('Spanish Basics');
  });

  it('should earn seed even with 1 star on final lesson', () => {
    const tree = createMockTree({
      lessonsCompleted: 4,
      lessonsTotal: 5,
    });
    
    const result = checkSeedEarned(tree, 'lesson-5', 1);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('path_complete');
  });
});

describe('checkBonusSeedEarned', () => {
  it('should not earn bonus for empty results', () => {
    const result = checkBonusSeedEarned([]);
    
    expect(result.earned).toBe(false);
    expect(result.trigger).toBe('none');
  });

  it('should not earn bonus if any lesson is not 3 stars', () => {
    const results = [
      { stars: 3 },
      { stars: 2 },
      { stars: 3 },
    ];
    
    const result = checkBonusSeedEarned(results);
    
    expect(result.earned).toBe(false);
  });

  it('should earn bonus for all 3-star lessons', () => {
    const results = [
      { stars: 3 },
      { stars: 3 },
      { stars: 3 },
      { stars: 3 },
      { stars: 3 },
    ];
    
    const result = checkBonusSeedEarned(results);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('perfect_path');
    expect(result.reason).toContain('3 stars');
  });
});

describe('checkStreakSeedEarned', () => {
  it('should not earn seed for streak under 7 days', () => {
    const result = checkStreakSeedEarned(6, 5);
    
    expect(result.earned).toBe(false);
    expect(result.trigger).toBe('none');
  });

  it('should earn seed when hitting 7-day streak', () => {
    const result = checkStreakSeedEarned(7, 6);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('streak');
    expect(result.reason).toContain('7 day');
  });

  it('should earn seed when hitting 14-day streak', () => {
    const result = checkStreakSeedEarned(14, 13);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('streak');
    expect(result.reason).toContain('14 day');
  });

  it('should not earn seed if already passed milestone', () => {
    // User was already at 7 days, now at 8
    const result = checkStreakSeedEarned(8, 7);
    
    expect(result.earned).toBe(false);
  });

  it('should earn seed at 21-day streak', () => {
    const result = checkStreakSeedEarned(21, 20);
    
    expect(result.earned).toBe(true);
    expect(result.trigger).toBe('streak');
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

describe('formatSeeds', () => {
  it('should format singular seed correctly', () => {
    expect(formatSeeds(1)).toBe('1 Seed 🌱');
  });

  it('should format plural seeds correctly', () => {
    expect(formatSeeds(5)).toBe('5 Seeds 🌱');
  });

  it('should handle zero seeds', () => {
    expect(formatSeeds(0)).toBe('0 Seeds 🌱');
  });
});

describe('calculateSeedReward', () => {
  it('should return 0 for no completion', () => {
    const result = calculateSeedReward(false, false);
    expect(result).toBe(0);
  });

  it('should return 2 for path completion without perfect', () => {
    const result = calculateSeedReward(true, false);
    expect(result).toBe(SEEDS_FOR_PATH_COMPLETE);
  });

  it('should return 1 for perfect path without completion', () => {
    // Edge case - shouldn't happen in practice
    const result = calculateSeedReward(false, true);
    expect(result).toBe(SEEDS_FOR_PERFECT_PATH);
  });

  it('should return 3 for perfect path completion', () => {
    const result = calculateSeedReward(true, true);
    expect(result).toBe(SEEDS_FOR_PATH_COMPLETE + SEEDS_FOR_PERFECT_PATH);
  });
});

// ============================================
// CONSTANTS VALIDATION
// ============================================

describe('constants', () => {
  it('should have correct path complete seeds', () => {
    expect(SEEDS_FOR_PATH_COMPLETE).toBe(2);
  });

  it('should have correct perfect path bonus', () => {
    expect(SEEDS_FOR_PERFECT_PATH).toBe(1);
  });

  it('should have correct streak milestone seeds', () => {
    expect(SEEDS_FOR_STREAK_MILESTONE).toBe(1);
  });

  it('should have reasonable max seeds cap', () => {
    expect(MAX_SEEDS).toBe(10);
    expect(MAX_SEEDS).toBeGreaterThan(0);
    // Should allow at least a few paths worth of seeds
    expect(MAX_SEEDS).toBeGreaterThanOrEqual(SEEDS_FOR_PATH_COMPLETE * 2);
  });
});

// ============================================
// INTEGRATION SCENARIOS
// ============================================

describe('seed earning scenarios', () => {
  it('should calculate total seeds for perfect path completion', () => {
    // User completes path with all 3-star lessons
    const pathCompleteSeeds = calculateSeedReward(true, true);
    
    // Should get 2 for completion + 1 bonus for perfect
    expect(pathCompleteSeeds).toBe(3);
  });

  it('should calculate seeds for normal completion', () => {
    // User completes path with mixed star ratings
    const normalSeeds = calculateSeedReward(true, false);
    
    // Should get 2 for completion only
    expect(normalSeeds).toBe(2);
  });

  it('should demonstrate streak milestone detection', () => {
    // Day 6 → Day 7: should trigger
    expect(checkStreakSeedEarned(7, 6).earned).toBe(true);
    
    // Day 7 → Day 8: should NOT trigger (same milestone)
    expect(checkStreakSeedEarned(8, 7).earned).toBe(false);
    
    // Day 13 → Day 14: should trigger (second milestone)
    expect(checkStreakSeedEarned(14, 13).earned).toBe(true);
  });
});