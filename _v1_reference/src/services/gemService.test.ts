/**
 * Unit Tests for Gem Service
 * 
 * Tests for the gem currency system including:
 * - Gem earning calculation based on accuracy
 * - Streak multiplier logic
 * - Streak achievement detection
 * - Shop catalogue items
 * 
 * Run with: npm test -- src/services/gemService.test.ts
 * 
 * @see docs/phase-1.1/task-1-1-11-gift-system.md for specifications
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGemEarning,
  getStreakMultiplier,
  getStreakAchievement,
  formatGems,
  getShopItemsByCategory,
  getShopItem,
  SHOP_CATALOGUE,
  type GemEarningResult,
} from './gemService';

// ============================================================================
// CALCULATE GEM EARNING TESTS
// ============================================================================

describe('calculateGemEarning', () => {
  describe('base gem calculation', () => {
    it('awards 5 gems for 100% accuracy', () => {
      const result = calculateGemEarning(25, 25, 0);
      expect(result.baseGems).toBe(5);
      expect(result.totalGems).toBe(5);
    });

    it('awards 4 gems for 80% accuracy', () => {
      const result = calculateGemEarning(20, 25, 0);
      expect(result.baseGems).toBe(4);
      expect(result.totalGems).toBe(4);
    });

    it('awards 3 gems for 60% accuracy', () => {
      const result = calculateGemEarning(15, 25, 0);
      expect(result.baseGems).toBe(3);
      expect(result.totalGems).toBe(3);
    });

    it('awards 2 gems for 40% accuracy', () => {
      const result = calculateGemEarning(10, 25, 0);
      expect(result.baseGems).toBe(2);
      expect(result.totalGems).toBe(2);
    });

    it('awards 1 gem for 20% accuracy', () => {
      const result = calculateGemEarning(5, 25, 0);
      expect(result.baseGems).toBe(1);
      expect(result.totalGems).toBe(1);
    });

    it('awards 0 gems for 0% accuracy', () => {
      const result = calculateGemEarning(0, 25, 0);
      expect(result.baseGems).toBe(0);
      expect(result.totalGems).toBe(0);
    });

    it('uses floor division for accuracy calculation', () => {
      // 79% should round down to 3 gems (floor(79/20) = 3)
      const result = calculateGemEarning(19, 24, 0);
      expect(result.baseGems).toBe(3);
    });

    it('handles edge case: 99% accuracy', () => {
      // floor(99/20) = 4
      const result = calculateGemEarning(99, 100, 0);
      expect(result.baseGems).toBe(4);
    });
  });

  describe('streak multiplier', () => {
    it('no multiplier for 0-day streak', () => {
      const result = calculateGemEarning(20, 25, 0);
      expect(result.streakMultiplier).toBe(1);
      expect(result.totalGems).toBe(4);
    });

    it('no multiplier for 1-day streak', () => {
      const result = calculateGemEarning(20, 25, 1);
      expect(result.streakMultiplier).toBe(1);
      expect(result.totalGems).toBe(4);
    });

    it('no multiplier for 2-day streak', () => {
      const result = calculateGemEarning(20, 25, 2);
      expect(result.streakMultiplier).toBe(1);
      expect(result.totalGems).toBe(4);
    });

    it('×1.5 multiplier for 3-day streak', () => {
      // 4 gems × 1.5 = 6
      const result = calculateGemEarning(20, 25, 3);
      expect(result.streakMultiplier).toBe(1.5);
      expect(result.totalGems).toBe(6);
    });

    it('×1.5 multiplier for 5-day streak', () => {
      // 4 gems × 1.5 = 6
      const result = calculateGemEarning(20, 25, 5);
      expect(result.streakMultiplier).toBe(1.5);
      expect(result.totalGems).toBe(6);
    });

    it('×2 multiplier for 7-day streak', () => {
      // 4 gems × 2 = 8
      const result = calculateGemEarning(20, 25, 7);
      expect(result.streakMultiplier).toBe(2);
      expect(result.totalGems).toBe(8);
    });

    it('×2 multiplier for 10-day streak', () => {
      // 4 gems × 2 = 8
      const result = calculateGemEarning(20, 25, 10);
      expect(result.streakMultiplier).toBe(2);
      expect(result.totalGems).toBe(8);
    });

    it('×3 multiplier for 14-day streak', () => {
      // 4 gems × 3 = 12
      const result = calculateGemEarning(20, 25, 14);
      expect(result.streakMultiplier).toBe(3);
      expect(result.totalGems).toBe(12);
    });

    it('×3 multiplier for 30-day streak', () => {
      // 5 gems × 3 = 15
      const result = calculateGemEarning(25, 25, 30);
      expect(result.streakMultiplier).toBe(3);
      expect(result.totalGems).toBe(15);
    });
  });

  describe('edge cases', () => {
    it('handles zero totalQuestions gracefully', () => {
      const result = calculateGemEarning(0, 0, 0);
      expect(result.baseGems).toBe(0);
    });

    it('handles correctAnswers greater than totalQuestions', () => {
      // Over 100% accuracy - 30/25 = 120% = floor(120/20) = 6 gems
      // Note: This edge case shouldn't happen in practice but the function
      // doesn't cap accuracy at 100%
      const result = calculateGemEarning(30, 25, 0);
      expect(result.baseGems).toBe(6);
    });

    it('rounds total gems correctly', () => {
      // 3 gems × 1.5 = 4.5 → should round to 4 or 5
      const result = calculateGemEarning(15, 25, 3);
      expect(result.totalGems).toBeGreaterThanOrEqual(4);
      expect(result.totalGems).toBeLessThanOrEqual(5);
    });
    
    it('includes currentStreak in result', () => {
      const result = calculateGemEarning(20, 25, 5);
      expect(result.currentStreak).toBe(5);
    });
  });
});

// ============================================================================
// GET STREAK MULTIPLIER TESTS
// ============================================================================

describe('getStreakMultiplier', () => {
  it('returns 1 for 0-day streak', () => {
    expect(getStreakMultiplier(0)).toBe(1);
  });

  it('returns 1 for 1-day streak', () => {
    expect(getStreakMultiplier(1)).toBe(1);
  });

  it('returns 1 for 2-day streak', () => {
    expect(getStreakMultiplier(2)).toBe(1);
  });

  it('returns 1.5 for 3-day streak', () => {
    expect(getStreakMultiplier(3)).toBe(1.5);
  });

  it('returns 1.5 for 6-day streak', () => {
    expect(getStreakMultiplier(6)).toBe(1.5);
  });

  it('returns 2 for 7-day streak', () => {
    expect(getStreakMultiplier(7)).toBe(2);
  });

  it('returns 2 for 13-day streak', () => {
    expect(getStreakMultiplier(13)).toBe(2);
  });

  it('returns 3 for 14-day streak', () => {
    expect(getStreakMultiplier(14)).toBe(3);
  });

  it('returns 3 for 100-day streak', () => {
    expect(getStreakMultiplier(100)).toBe(3);
  });
});

// ============================================================================
// GET STREAK ACHIEVEMENT TESTS
// ============================================================================

describe('getStreakAchievement', () => {
  it('returns null for 0-day streak', () => {
    expect(getStreakAchievement(0)).toBeNull();
  });

  it('returns null for 2-day streak', () => {
    expect(getStreakAchievement(2)).toBeNull();
  });

  it('returns achievement for 3-day streak', () => {
    const achievement = getStreakAchievement(3);
    expect(achievement).not.toBeNull();
    expect(achievement?.type).toBe('streak_3');
    expect(achievement?.bonusGems).toBe(5);
    expect(achievement?.giftType).toBeUndefined();
  });

  it('returns achievement for 7-day streak with decoration', () => {
    const achievement = getStreakAchievement(7);
    expect(achievement).not.toBeNull();
    expect(achievement?.type).toBe('streak_7');
    expect(achievement?.bonusGems).toBe(15);
    expect(achievement?.giftType).toBe('decoration');
  });

  it('returns achievement for 14-day streak with decoration', () => {
    const achievement = getStreakAchievement(14);
    expect(achievement).not.toBeNull();
    expect(achievement?.type).toBe('streak_14');
    expect(achievement?.bonusGems).toBe(30);
    expect(achievement?.giftType).toBe('decoration');
  });

  it('returns achievement for 30-day streak with golden flower', () => {
    const achievement = getStreakAchievement(30);
    expect(achievement).not.toBeNull();
    expect(achievement?.type).toBe('streak_30');
    expect(achievement?.bonusGems).toBe(100);
    expect(achievement?.giftType).toBe('golden_flower');
  });

  it('returns null for days beyond milestones', () => {
    // Achievements only trigger on exact milestone days
    expect(getStreakAchievement(4)).toBeNull();
    expect(getStreakAchievement(8)).toBeNull();
    expect(getStreakAchievement(15)).toBeNull();
    expect(getStreakAchievement(31)).toBeNull();
    expect(getStreakAchievement(100)).toBeNull();
  });
});

// ============================================================================
// FORMAT GEMS TESTS
// ============================================================================

describe('formatGems', () => {
  it('formats 1 gem correctly', () => {
    expect(formatGems(1)).toBe('💎 1');
  });

  it('formats 10 gems correctly', () => {
    expect(formatGems(10)).toBe('💎 10');
  });

  it('formats 100 gems correctly', () => {
    expect(formatGems(100)).toBe('💎 100');
  });

  it('formats 0 gems correctly', () => {
    expect(formatGems(0)).toBe('💎 0');
  });
});

// ============================================================================
// SHOP CATALOGUE TESTS
// ============================================================================

describe('SHOP_CATALOGUE', () => {
  it('contains items', () => {
    expect(SHOP_CATALOGUE.length).toBeGreaterThan(0);
  });

  it('all items have required fields', () => {
    SHOP_CATALOGUE.forEach(item => {
      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.emoji).toBeDefined();
      expect(item.cost).toBeGreaterThan(0);
      expect(['tree_care', 'garden', 'avatar', 'special']).toContain(item.category);
    });
  });

  it('tree care items have healthBufferDays', () => {
    const treeCareItems = SHOP_CATALOGUE.filter(item => item.category === 'tree_care');
    expect(treeCareItems.length).toBeGreaterThan(0);
    
    treeCareItems.forEach(item => {
      expect(item.affectsTreeHealth).toBe(true);
      expect(item.healthBufferDays).toBe(5);
    });
  });

  it('garden items do not affect tree health', () => {
    const gardenItems = SHOP_CATALOGUE.filter(item => item.category === 'garden');
    expect(gardenItems.length).toBeGreaterThan(0);
    
    gardenItems.forEach(item => {
      expect(item.affectsTreeHealth).toBe(false);
    });
  });

  it('avatar items do not affect tree health', () => {
    const avatarItems = SHOP_CATALOGUE.filter(item => item.category === 'avatar');
    expect(avatarItems.length).toBeGreaterThan(0);
    
    avatarItems.forEach(item => {
      expect(item.affectsTreeHealth).toBe(false);
    });
  });

  it('golden crown is most expensive item', () => {
    const crown = SHOP_CATALOGUE.find(item => item.id === 'crown');
    expect(crown).toBeDefined();
    expect(crown?.cost).toBe(100);
    
    const maxCost = Math.max(...SHOP_CATALOGUE.map(item => item.cost));
    expect(crown?.cost).toBe(maxCost);
  });
});

// ============================================================================
// SHOP HELPER FUNCTIONS TESTS
// ============================================================================

describe('getShopItemsByCategory', () => {
  it('returns tree care items', () => {
    const items = getShopItemsByCategory('tree_care');
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.category).toBe('tree_care');
    });
  });

  it('returns garden items', () => {
    const items = getShopItemsByCategory('garden');
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.category).toBe('garden');
    });
  });

  it('returns avatar items', () => {
    const items = getShopItemsByCategory('avatar');
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.category).toBe('avatar');
    });
  });
});

describe('getShopItem', () => {
  it('returns item by id', () => {
    const item = getShopItem('watering_can');
    expect(item).toBeDefined();
    expect(item?.name).toBe('Watering Can');
    expect(item?.cost).toBe(15);
  });

  it('returns undefined for unknown id', () => {
    const item = getShopItem('nonexistent_item');
    expect(item).toBeUndefined();
  });
});