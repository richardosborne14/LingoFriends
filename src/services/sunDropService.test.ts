/**
 * Unit Tests for Sun Drop Service
 * 
 * Tests for the currency calculation functions used in the game-based learning system.
 * Run with: npm test -- src/services/sunDropService.test.ts
 * 
 * @see docs/phase-1.1/task-1-1-1-types-sun-drops.md for specifications
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEarned,
  calculatePenalty,
  calculateTreeHealth,
  daysUntilNextDecay,
  calculateStars,
  isDailyCapReached,
  remainingDailyAllowance,
  getDailyCap,
  calculateTreeGrowth,
  getHealthCategory,
  getHealthIndicator,
  daysSinceLastRefresh,
  treeNeedsAttention,
  getHealthDescription,
} from './sunDropService';

// ============================================================================
// CALCULATE EARNED TESTS
// ============================================================================

describe('calculateEarned', () => {
  describe('full value scenarios', () => {
    it('returns full value on first try with no help and no wrong attempts', () => {
      expect(calculateEarned(3, false, false, 0)).toBe(3);
      expect(calculateEarned(1, false, false, 0)).toBe(1);
      expect(calculateEarned(4, false, false, 0)).toBe(4);
    });

    it('handles maximum Sun Drop value (4)', () => {
      expect(calculateEarned(4, false, false, 0)).toBe(4);
    });

    it('handles minimum Sun Drop value (1)', () => {
      expect(calculateEarned(1, false, false, 0)).toBe(1);
    });
  });

  describe('half value scenarios (retry or help)', () => {
    it('returns half value (rounded up) on retry', () => {
      // ceil(3/2) = 2
      expect(calculateEarned(3, true, false, 0)).toBe(2);
      // ceil(4/2) = 2
      expect(calculateEarned(4, true, false, 0)).toBe(2);
      // ceil(1/2) = 1
      expect(calculateEarned(1, true, false, 0)).toBe(1);
    });

    it('returns half value (rounded up) after help usage', () => {
      expect(calculateEarned(3, false, true, 0)).toBe(2);
      expect(calculateEarned(4, false, true, 0)).toBe(2);
      expect(calculateEarned(1, false, true, 0)).toBe(1);
    });

    it('does not double-penalize for both retry AND help', () => {
      // Should still be half, not quarter
      expect(calculateEarned(4, true, true, 0)).toBe(2);
    });
  });

  describe('wrong attempt penalties', () => {
    it('subtracts 1 Sun Drop per wrong attempt', () => {
      // 3 base - 1 wrong = 2
      expect(calculateEarned(3, false, false, 1)).toBe(2);
      // 3 base - 2 wrong = 1
      expect(calculateEarned(3, false, false, 2)).toBe(1);
    });

    it('floors at 0 (no negative earnings)', () => {
      // 3 base - 5 wrong = -2, floored to 0
      expect(calculateEarned(3, false, false, 5)).toBe(0);
    });

    it('applies penalty after half-value calculation', () => {
      // ceil(3/2) = 2, then -1 wrong = 1
      expect(calculateEarned(3, true, false, 1)).toBe(1);
      // ceil(2/2) = 1, then -1 wrong = 0
      expect(calculateEarned(2, true, false, 1)).toBe(0);
    });
  });

  describe('combined scenarios', () => {
    it('handles retry + wrong attempts', () => {
      // ceil(4/2) = 2, - 1 wrong = 1
      expect(calculateEarned(4, true, false, 1)).toBe(1);
    });

    it('handles help + multiple wrong attempts', () => {
      // ceil(4/2) = 2, - 3 wrong = -1, floored to 0
      expect(calculateEarned(4, false, true, 3)).toBe(0);
    });
  });
});

// ============================================================================
// CALCULATE PENALTY TESTS
// ============================================================================

describe('calculatePenalty', () => {
  it('always returns 1', () => {
    expect(calculatePenalty()).toBe(1);
  });
});

// ============================================================================
// CALCULATE TREE HEALTH TESTS
// ============================================================================

describe('calculateTreeHealth', () => {
  describe('decay schedule without gifts', () => {
    it('returns 100% for 0-2 days', () => {
      expect(calculateTreeHealth(0, 0)).toBe(100);
      expect(calculateTreeHealth(1, 0)).toBe(100);
      expect(calculateTreeHealth(2, 0)).toBe(100);
    });

    it('returns 85% for 3-5 days', () => {
      expect(calculateTreeHealth(3, 0)).toBe(85);
      expect(calculateTreeHealth(4, 0)).toBe(85);
      expect(calculateTreeHealth(5, 0)).toBe(85);
    });

    it('returns 60% for 6-10 days', () => {
      expect(calculateTreeHealth(6, 0)).toBe(60);
      expect(calculateTreeHealth(8, 0)).toBe(60);
      expect(calculateTreeHealth(10, 0)).toBe(60);
    });

    it('returns 35% for 11-14 days', () => {
      expect(calculateTreeHealth(11, 0)).toBe(35);
      expect(calculateTreeHealth(12, 0)).toBe(35);
      expect(calculateTreeHealth(14, 0)).toBe(35);
    });

    it('returns 15% for 15-21 days', () => {
      expect(calculateTreeHealth(15, 0)).toBe(15);
      expect(calculateTreeHealth(18, 0)).toBe(15);
      expect(calculateTreeHealth(21, 0)).toBe(15);
    });

    it('returns 5% minimum for 22+ days', () => {
      expect(calculateTreeHealth(22, 0)).toBe(5);
      expect(calculateTreeHealth(30, 0)).toBe(5);
      expect(calculateTreeHealth(100, 0)).toBe(5);
    });
  });

  describe('gift buffer', () => {
    it('each gift adds 10 days of buffer', () => {
      // 7 days with 1 gift = effective 0 days = 100%
      expect(calculateTreeHealth(7, 1)).toBe(100);
      // 15 days with 1 gift = effective 5 days = 85%
      expect(calculateTreeHealth(15, 1)).toBe(85);
      // 25 days with 2 gifts = effective 5 days = 85%
      expect(calculateTreeHealth(25, 2)).toBe(85);
    });

    it('multiple gifts stack', () => {
      // 30 days with 3 gifts = effective 0 days = 100%
      expect(calculateTreeHealth(30, 3)).toBe(100);
    });

    it('does not go below 5% even with no gifts', () => {
      expect(calculateTreeHealth(365, 0)).toBe(5);
    });
  });
});

// ============================================================================
// DAYS UNTIL NEXT DECAY TESTS
// ============================================================================

describe('daysUntilNextDecay', () => {
  it('returns null for minimum health (5%)', () => {
    expect(daysUntilNextDecay(5)).toBeNull();
    expect(daysUntilNextDecay(3)).toBeNull();
  });

  it('returns correct days for each tier', () => {
    // At 15%, next decay is at 22 days
    expect(daysUntilNextDecay(15)).toBe(22);
    // At 35%, next decay is at 15 days
    expect(daysUntilNextDecay(35)).toBe(15);
    // At 60%, next decay is at 11 days
    expect(daysUntilNextDecay(60)).toBe(11);
    // At 85%, next decay is at 6 days
    expect(daysUntilNextDecay(85)).toBe(6);
    // At 100%, next decay is at 3 days
    expect(daysUntilNextDecay(100)).toBe(3);
  });
});

// ============================================================================
// CALCULATE STARS TESTS
// ============================================================================

describe('calculateStars', () => {
  describe('3 stars (90%+)', () => {
    it('returns 3 stars for 90% exactly', () => {
      expect(calculateStars(18, 20)).toBe(3);
    });

    it('returns 3 stars for 100%', () => {
      expect(calculateStars(20, 20)).toBe(3);
    });

    it('returns 3 stars for 95%', () => {
      expect(calculateStars(19, 20)).toBe(3);
    });
  });

  describe('2 stars (60-89%)', () => {
    it('returns 2 stars for 60% exactly', () => {
      expect(calculateStars(12, 20)).toBe(2);
    });

    it('returns 2 stars for 89%', () => {
      expect(calculateStars(17, 19)).toBe(2); // ~89.5%
    });

    it('returns 2 stars for 75%', () => {
      expect(calculateStars(15, 20)).toBe(2);
    });
  });

  describe('1 star (below 60%)', () => {
    it('returns 1 star for 59%', () => {
      expect(calculateStars(11, 19)).toBe(1); // ~58%
    });

    it('returns 1 star for 50%', () => {
      expect(calculateStars(10, 20)).toBe(1);
    });

    it('returns 1 star for 0%', () => {
      expect(calculateStars(0, 20)).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('returns 1 star for max=0 (edge case)', () => {
      expect(calculateStars(0, 0)).toBe(1);
    });
  });
});

// ============================================================================
// DAILY CAP TESTS
// ============================================================================

describe('isDailyCapReached', () => {
  it('returns false when below cap', () => {
    expect(isDailyCapReached(0)).toBe(false);
    expect(isDailyCapReached(25)).toBe(false);
    expect(isDailyCapReached(49)).toBe(false);
  });

  it('returns true when at cap', () => {
    expect(isDailyCapReached(50)).toBe(true);
  });

  it('returns true when over cap', () => {
    expect(isDailyCapReached(51)).toBe(true);
    expect(isDailyCapReached(100)).toBe(true);
  });
});

describe('remainingDailyAllowance', () => {
  it('returns remaining allowance when below cap', () => {
    expect(remainingDailyAllowance(0)).toBe(50);
    expect(remainingDailyAllowance(25)).toBe(25);
    expect(remainingDailyAllowance(49)).toBe(1);
  });

  it('returns 0 when at or over cap', () => {
    expect(remainingDailyAllowance(50)).toBe(0);
    expect(remainingDailyAllowance(100)).toBe(0);
  });
});

describe('getDailyCap', () => {
  it('returns 50', () => {
    expect(getDailyCap()).toBe(50);
  });
});

// ============================================================================
// TREE GROWTH TESTS
// ============================================================================

describe('calculateTreeGrowth', () => {
  it('returns 0 when max is 0', () => {
    expect(calculateTreeGrowth(10, 0)).toBe(0);
  });

  it('returns correct fraction', () => {
    expect(calculateTreeGrowth(10, 20)).toBe(0.5);
    expect(calculateTreeGrowth(15, 20)).toBe(0.75);
    expect(calculateTreeGrowth(5, 20)).toBe(0.25);
  });

  it('caps at 1', () => {
    expect(calculateTreeGrowth(25, 20)).toBe(1);
    expect(calculateTreeGrowth(100, 20)).toBe(1);
  });

  it('returns 0 for 0 earned', () => {
    expect(calculateTreeGrowth(0, 20)).toBe(0);
  });
});

// ============================================================================
// HEALTH CATEGORY TESTS
// ============================================================================

describe('getHealthCategory', () => {
  it('returns "healthy" for health >= 80', () => {
    expect(getHealthCategory(100)).toBe('healthy');
    expect(getHealthCategory(80)).toBe('healthy');
    expect(getHealthCategory(95)).toBe('healthy');
  });

  it('returns "thirsty" for health 40-79', () => {
    expect(getHealthCategory(79)).toBe('thirsty');
    expect(getHealthCategory(60)).toBe('thirsty');
    expect(getHealthCategory(40)).toBe('thirsty');
  });

  it('returns "dying" for health < 40', () => {
    expect(getHealthCategory(39)).toBe('dying');
    expect(getHealthCategory(15)).toBe('dying');
    expect(getHealthCategory(5)).toBe('dying');
  });
});

describe('getHealthIndicator', () => {
  it('returns correct indicator for healthy trees', () => {
    const indicator = getHealthIndicator(100);
    expect(indicator.text).toBe('Healthy');
    expect(indicator.emoji).toBe('✓');
    expect(indicator.color).toBe('green');
  });

  it('returns correct indicator for thirsty trees', () => {
    const indicator = getHealthIndicator(60);
    expect(indicator.text).toBe('Thirsty');
    expect(indicator.emoji).toBe('💧');
    expect(indicator.color).toBe('amber');
  });

  it('returns correct indicator for dying trees', () => {
    const indicator = getHealthIndicator(20);
    expect(indicator.text).toBe('Dying!');
    expect(indicator.emoji).toBe('🆘');
    expect(indicator.color).toBe('red');
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('daysSinceLastRefresh', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString();
    expect(daysSinceLastRefresh(today)).toBe(0);
  });

  it('returns correct number of days for past dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceLastRefresh(threeDaysAgo)).toBe(3);
  });

  it('returns 0 for future dates', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceLastRefresh(tomorrow)).toBe(0);
  });
});

describe('treeNeedsAttention', () => {
  it('returns false for 100% health', () => {
    expect(treeNeedsAttention(100)).toBe(false);
  });

  it('returns true for < 100% health', () => {
    expect(treeNeedsAttention(99)).toBe(true);
    expect(treeNeedsAttention(50)).toBe(true);
    expect(treeNeedsAttention(5)).toBe(true);
  });
});

describe('getHealthDescription', () => {
  it('returns appropriate descriptions', () => {
    expect(getHealthDescription(100)).toContain('perfect health');
    expect(getHealthDescription(85)).toContain('doing well');
    expect(getHealthDescription(60)).toContain('needs some attention');
    expect(getHealthDescription(15)).toContain('critical condition');
  });
});