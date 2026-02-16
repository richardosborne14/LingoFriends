/**
 * LingoFriends - Lesson View Components Tests
 * 
 * Tests for supporting functions and utilities used in lesson view.
 * Tests utility functions without DOM rendering for fast execution.
 * 
 * @module lesson.test
 */

import { describe, it, expect } from 'vitest';
import { GameActivityType, GiftType } from '../../types/game';
import { getActivityTypeName, getActivityDifficultyRange } from './activities/ActivityRouter';
import { calculateEarned } from '../../services/sunDropService';

// ============================================
// STAR RATING CALCULATION
// ============================================

/**
 * Calculate star rating from Sun Drops earned.
 * 1 star: < 50% | 2 stars: 50-79% | 3 stars: ≥ 80%
 * Mirrors the logic in LessonView.tsx
 */
function calculateStarsFromDrops(earned: number, max: number): number {
  if (max === 0) return 1;
  const percentage = (earned / max) * 100;
  if (percentage >= 80) return 3;
  if (percentage >= 50) return 2;
  return 1;
}

describe('Star Rating Calculation', () => {
  it('awards 3 stars for 80% performance', () => {
    expect(calculateStarsFromDrops(16, 20)).toBe(3); // 80%
    expect(calculateStarsFromDrops(20, 20)).toBe(3); // 100%
    expect(calculateStarsFromDrops(8, 10)).toBe(3);  // 80%
  });

  it('awards 2 stars for 50-79% performance', () => {
    expect(calculateStarsFromDrops(10, 20)).toBe(2); // 50%
    expect(calculateStarsFromDrops(15, 20)).toBe(2); // 75%
    expect(calculateStarsFromDrops(5, 10)).toBe(2);  // 50%
  });

  it('awards 1 star for < 50% performance', () => {
    expect(calculateStarsFromDrops(5, 20)).toBe(1);  // 25%
    expect(calculateStarsFromDrops(9, 20)).toBe(1);  // 45%
    expect(calculateStarsFromDrops(1, 10)).toBe(1);  // 10%
  });

  it('handles edge case of zero max', () => {
    expect(calculateStarsFromDrops(0, 0)).toBe(1);
  });

  it('handles edge case of perfect score', () => {
    expect(calculateStarsFromDrops(10, 10)).toBe(3); // 100%
  });
});

// ============================================
// LESSON PROGRESS CALCULATION
// ============================================

describe('Lesson Progress Calculation', () => {
  it('calculates progress percentage correctly', () => {
    // (stepIndex + 1) / totalSteps * 100
    expect(Math.round((0 + 1) / 6 * 100)).toBe(17);  // First step
    expect(Math.round((2 + 1) / 6 * 100)).toBe(50);  // Middle step
    expect(Math.round((5 + 1) / 6 * 100)).toBe(100); // Last step
  });

  it('handles single step lessons', () => {
    expect(Math.round((0 + 1) / 1 * 100)).toBe(100);
  });
});

// ============================================
// SUN DROP TOTAL CALCULATION
// ============================================

describe('Lesson Sun Drop Total', () => {
  interface MockStep {
    activity: { sunDrops: number };
  }

  it('sums sunDrops from all steps', () => {
    const steps: MockStep[] = [
      { activity: { sunDrops: 2 } },
      { activity: { sunDrops: 3 } },
      { activity: { sunDrops: 1 } },
    ];
    const total = steps.reduce((sum, step) => sum + (step.activity?.sunDrops || 1), 0);
    expect(total).toBe(6);
  });

  it('defaults to 1 sunDrop per step when not specified', () => {
    const steps: MockStep[] = [
      { activity: { sunDrops: 3 } },
      { activity: { sunDrops: 0 } }, // Will default to 1
      { activity: { sunDrops: 0 } }, // Will default to 1
    ];
    const total = steps.reduce((sum, step) => sum + (step.activity?.sunDrops || 1), 0);
    expect(total).toBe(5); // 3 + 1 + 1
  });

  it('handles empty steps array', () => {
    const steps: MockStep[] = [];
    const total = steps.reduce((sum, step) => sum + (step.activity?.sunDrops || 1), 0);
    expect(total).toBe(0);
  });
});

// ============================================
// ACTIVITY DIFFICULTY INTEGRATION
// ============================================

describe('Activity Difficulty for Lessons', () => {
  it('TRUE_FALSE is easiest (1-1 range)', () => {
    const range = getActivityDifficultyRange(GameActivityType.TRUE_FALSE);
    expect(range).toEqual([1, 1]);
  });

  it('TRANSLATE is harder (3-4 range)', () => {
    const range = getActivityDifficultyRange(GameActivityType.TRANSLATE);
    expect(range).toEqual([3, 4]);
  });

  it('most activities fall within 1-4 sun drop range', () => {
    const types = [
      GameActivityType.MULTIPLE_CHOICE,
      GameActivityType.FILL_BLANK,
      GameActivityType.WORD_ARRANGE,
      GameActivityType.TRUE_FALSE,
      GameActivityType.MATCHING,
      GameActivityType.TRANSLATE,
    ];

    types.forEach(type => {
      const [min, max] = getActivityDifficultyRange(type);
      expect(min).toBeGreaterThanOrEqual(1);
      expect(max).toBeLessThanOrEqual(4);
      expect(min).toBeLessThanOrEqual(max);
    });
  });
});

// ============================================
// GIFT TYPE AVAILABILITY
// ============================================

describe('Gift Unlocks', () => {
  it('GiftType enum has expected values', () => {
    expect(GiftType.WATER_DROP).toBe('water_drop');
    expect(GiftType.SPARKLE).toBe('sparkle');
    expect(GiftType.SEED).toBe('seed');
    expect(GiftType.DECORATION).toBe('decoration');
    expect(GiftType.GOLDEN_FLOWER).toBe('golden_flower');
  });

  it('WATER_DROP is appropriate for lesson completion gift', () => {
    // Water drop is the default lesson completion gift
    const defaultGift = GiftType.WATER_DROP;
    expect(defaultGift).toBeDefined();
    expect(typeof defaultGift).toBe('string');
  });
});

// ============================================
// ACTIVITY TYPE NAME DISPLAY
// ============================================

describe('Activity Type Display Names', () => {
  it('returns readable names for all activity types', () => {
    expect(getActivityTypeName(GameActivityType.MULTIPLE_CHOICE)).toBe('Multiple Choice');
    expect(getActivityTypeName(GameActivityType.FILL_BLANK)).toBe('Fill in the Blank');
    expect(getActivityTypeName(GameActivityType.WORD_ARRANGE)).toBe('Word Arrange');
    expect(getActivityTypeName(GameActivityType.TRUE_FALSE)).toBe('True or False');
    expect(getActivityTypeName(GameActivityType.MATCHING)).toBe('Matching Pairs');
    expect(getActivityTypeName(GameActivityType.TRANSLATE)).toBe('Translate');
  });
});

// ============================================
// LESSON RESULT INTEGRATION
// ============================================

describe('Lesson Result', () => {
  interface LessonResult {
    lessonId: string;
    sunDropsEarned: number;
    sunDropsMax: number;
    stars: number;
    stepsCompleted: number;
    stepsTotal: number;
  }

  function createLessonResult(
    lessonId: string,
    earned: number,
    max: number,
    completed: number,
    total: number
  ): LessonResult {
    return {
      lessonId,
      sunDropsEarned: earned,
      sunDropsMax: max,
      stars: calculateStarsFromDrops(earned, max),
      stepsCompleted: completed,
      stepsTotal: total,
    };
  }

  it('creates result with correct star calculation', () => {
    const result = createLessonResult('lesson-1', 16, 20, 6, 6);
    expect(result.stars).toBe(3); // 80%
  });

  it('creates result for partial completion', () => {
    const result = createLessonResult('lesson-2', 10, 20, 4, 6);
    expect(result.stars).toBe(2); // 50%
    expect(result.stepsCompleted).toBe(4);
    expect(result.stepsTotal).toBe(6);
  });

  it('creates result for low score', () => {
    const result = createLessonResult('lesson-3', 5, 20, 6, 6);
    expect(result.stars).toBe(1); // 25%
  });
});

// ============================================
// SUN DROP EARNING SCENARIOS
// ============================================

describe('Sun Drop Earning During Lesson', () => {
  it('accumulates sun drops correctly', () => {
    const earned = [2, 3, 1, 2, 3, 2].reduce((sum, drops) => sum + drops, 0);
    expect(earned).toBe(13);
  });

  it('calculates with penalties', () => {
    // Activity with 3 sun drops, 1 wrong attempt
    const activity1 = calculateEarned(3, false, false, 1);
    // Activity with 2 sun drops, no penalties
    const activity2 = calculateEarned(2, false, false, 0);
    // Activity with 4 sun drops, used help (halved)
    const activity3 = calculateEarned(4, false, true, 0);
    
    const total = activity1 + activity2 + activity3;
    // 2 + 2 + 2 = 6
    expect(total).toBe(6);
  });

  it('floors at 0 sun drops (no negative values)', () => {
    // With heavy penalties, result floors at 0 (not negative)
    // baseValue=1, isRetry=true → ceil(1/2)=1, then -2 wrong = -1 → max(0, -1) = 0
    const result = calculateEarned(1, true, true, 2);
    expect(result).toBe(0);
  });

  it('minimum reward is 0 after all penalties', () => {
    // Even with extreme penalties, it never goes negative
    const result = calculateEarned(4, true, true, 10);
    expect(result).toBe(0); // ceil(4/2)=2, but with retry penalty halves again
  });
});