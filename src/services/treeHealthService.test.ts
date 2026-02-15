/**
 * Unit Tests for Tree Health Service
 * 
 * Tests for the tree health and decay system, which implements
 * the spaced repetition mechanic for the garden-based learning system.
 * 
 * Run with: npm test -- src/services/treeHealthService.test.ts
 * 
 * @see docs/phase-1.1/task-1-1-10-tree-health-decay.md for specifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateHealth,
  calculateDaysSinceRefresh,
  calculateBufferDays,
  getHealthCategory,
  getHealthIndicator,
  getGiftBufferDays,
  getTreesNeedingRefresh,
  getDyingTrees,
  treeNeedsAttention,
  getHealthDescription,
  TREE_HEALTH_CONSTANTS,
} from './treeHealthService';
import type { UserTree, GiftItem } from '../types/game';
import { GiftType } from '../types/game';

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Create a mock tree for testing.
 */
function createMockTree(overrides: Partial<UserTree> = {}): UserTree {
  return {
    id: 'tree-1',
    skillPathId: 'spanish-greetings',
    name: 'Spanish Greetings',
    icon: '🇪🇸',
    status: 'growing' as any,
    health: 100,
    lastRefreshDate: new Date().toISOString(),
    sunDropsTotal: 50,
    lessonsCompleted: 3,
    lessonsTotal: 10,
    position: { x: 100, y: 200 },
    decorations: [],
    giftsReceived: [],
    ...overrides,
  };
}

/**
 * Create a mock gift for testing.
 */
function createMockGift(overrides: Partial<GiftItem> = {}): GiftItem {
  return {
    id: 'gift-1',
    type: GiftType.WATER_DROP,
    fromUserId: 'user-2',
    fromUserName: 'Friend',
    ...overrides,
  };
}

// ============================================================================
// CALCULATE HEALTH TESTS
// ============================================================================

describe('calculateHealth', () => {
  describe('basic decay schedule', () => {
    it('returns 100% for 0 days (just refreshed)', () => {
      const tree = createMockTree({
        lastRefreshDate: new Date().toISOString(),
      });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('returns 100% for 1 day since refresh', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const tree = createMockTree({ lastRefreshDate: oneDayAgo });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('returns 100% for 2 days since refresh', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const tree = createMockTree({ lastRefreshDate: twoDaysAgo });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('returns 85% for 3-5 days since refresh', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const tree3 = createMockTree({ lastRefreshDate: threeDaysAgo });
      expect(calculateHealth(tree3)).toBe(85);

      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      const tree4 = createMockTree({ lastRefreshDate: fourDaysAgo });
      expect(calculateHealth(tree4)).toBe(85);

      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const tree5 = createMockTree({ lastRefreshDate: fiveDaysAgo });
      expect(calculateHealth(tree5)).toBe(85);
    });

    it('returns 60% for 6-10 days since refresh', () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const tree6 = createMockTree({ lastRefreshDate: sixDaysAgo });
      expect(calculateHealth(tree6)).toBe(60);

      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const tree10 = createMockTree({ lastRefreshDate: tenDaysAgo });
      expect(calculateHealth(tree10)).toBe(60);
    });

    it('returns 35% for 11-14 days since refresh', () => {
      const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
      const tree11 = createMockTree({ lastRefreshDate: elevenDaysAgo });
      expect(calculateHealth(tree11)).toBe(35);

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const tree14 = createMockTree({ lastRefreshDate: fourteenDaysAgo });
      expect(calculateHealth(tree14)).toBe(35);
    });

    it('returns 15% for 15-21 days since refresh', () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const tree15 = createMockTree({ lastRefreshDate: fifteenDaysAgo });
      expect(calculateHealth(tree15)).toBe(15);

      const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      const tree21 = createMockTree({ lastRefreshDate: twentyOneDaysAgo });
      expect(calculateHealth(tree21)).toBe(15);
    });

    it('returns 5% minimum for 22+ days since refresh', () => {
      const twentyTwoDaysAgo = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString();
      const tree22 = createMockTree({ lastRefreshDate: twentyTwoDaysAgo });
      expect(calculateHealth(tree22)).toBe(5);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const tree30 = createMockTree({ lastRefreshDate: thirtyDaysAgo });
      expect(calculateHealth(tree30)).toBe(5);

      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      const tree100 = createMockTree({ lastRefreshDate: hundredDaysAgo });
      expect(calculateHealth(tree100)).toBe(5);
    });
  });

  describe('new trees', () => {
    it('returns 100% for tree with no lastRefreshDate', () => {
      const tree = createMockTree({ lastRefreshDate: undefined as any });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('returns 100% for tree with empty lastRefreshDate', () => {
      const tree = createMockTree({ lastRefreshDate: '' as any });
      expect(calculateHealth(tree)).toBe(100);
    });
  });

  describe('gift buffers', () => {
    it('water_drop provides 10 days of buffer', () => {
      // 10 days since refresh, but with water_drop gift = effective 0 days = 100%
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({ type: GiftType.WATER_DROP, appliedDate: undefined });
      const tree = createMockTree({
        lastRefreshDate: tenDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('sparkle provides 5 days of buffer', () => {
      // 5 days since refresh, with sparkle = effective 0 days = 100%
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({ type: GiftType.SPARKLE, appliedDate: undefined });
      const tree = createMockTree({
        lastRefreshDate: fiveDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(100);

      // 6 days since refresh, with sparkle = effective 1 day = still 100%
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const tree2 = createMockTree({
        lastRefreshDate: sixDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree2)).toBe(100);
    });

    it('golden_flower provides 15 days of buffer', () => {
      // 15 days since refresh, with golden_flower = effective 0 days = 100%
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({ type: GiftType.GOLDEN_FLOWER, appliedDate: undefined });
      const tree = createMockTree({
        lastRefreshDate: fifteenDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('seed provides 0 buffer days (no effect on health)', () => {
      // 5 days since refresh, with seed = still 5 days = 85%
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({ type: GiftType.SEED, appliedDate: undefined });
      const tree = createMockTree({
        lastRefreshDate: fiveDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(85);
    });

    it('ribbon provides 0 buffer days (decoration only)', () => {
      // 5 days since refresh, with ribbon = still 5 days = 85%
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({ type: GiftType.RIBBON, appliedDate: undefined });
      const tree = createMockTree({
        lastRefreshDate: fiveDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(85);
    });

    it('multiple gifts stack', () => {
      // 20 days since refresh, with 2 water_drops = 20 buffer = effective 0 days = 100%
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const gifts = [
        createMockGift({ id: 'gift-1', type: GiftType.WATER_DROP, appliedDate: undefined }),
        createMockGift({ id: 'gift-2', type: GiftType.WATER_DROP, appliedDate: undefined }),
      ];
      const tree = createMockTree({
        lastRefreshDate: twentyDaysAgo,
        giftsReceived: gifts,
      });
      expect(calculateHealth(tree)).toBe(100);
    });

    it('applied gifts do not count toward buffer', () => {
      // 10 days since refresh, but gift already applied = no buffer = 60%
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const gift = createMockGift({
        type: GiftType.WATER_DROP,
        appliedDate: new Date().toISOString(),
      });
      const tree = createMockTree({
        lastRefreshDate: tenDaysAgo,
        giftsReceived: [gift],
      });
      expect(calculateHealth(tree)).toBe(60);
    });

    it('mixed applied and unused gifts should only count unused', () => {
      // 15 days since refresh
      // 1 applied water_drop (no buffer)
      // 1 unused water_drop (10 days buffer)
      // effective days = 15 - 10 = 5 = 85%
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
      const gifts = [
        createMockGift({
          id: 'gift-1',
          type: GiftType.WATER_DROP,
          appliedDate: new Date().toISOString(),
        }),
        createMockGift({
          id: 'gift-2',
          type: GiftType.WATER_DROP,
          appliedDate: undefined,
        }),
      ];
      const tree = createMockTree({
        lastRefreshDate: fifteenDaysAgo,
        giftsReceived: gifts,
      });
      expect(calculateHealth(tree)).toBe(85);
    });
  });
});

// ============================================================================
// CALCULATE DAYS SINCE REFRESH TESTS
// ============================================================================

describe('calculateDaysSinceRefresh', () => {
  it('returns 0 for today', () => {
    const tree = createMockTree({
      lastRefreshDate: new Date().toISOString(),
    });
    expect(calculateDaysSinceRefresh(tree)).toBe(0);
  });

  it('returns correct days for past dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({ lastRefreshDate: threeDaysAgo });
    expect(calculateDaysSinceRefresh(tree)).toBe(3);
  });

  it('returns 0 for future dates (clock skew protection)', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({ lastRefreshDate: tomorrow });
    expect(calculateDaysSinceRefresh(tree)).toBe(0);
  });

  it('returns 0 for tree with no lastRefreshDate', () => {
    const tree = createMockTree({ lastRefreshDate: undefined as any });
    expect(calculateDaysSinceRefresh(tree)).toBe(0);
  });
});

// ============================================================================
// CALCULATE BUFFER DAYS TESTS
// ============================================================================

describe('calculateBufferDays', () => {
  it('returns 0 for tree with no gifts', () => {
    const tree = createMockTree({ giftsReceived: [] });
    expect(calculateBufferDays(tree)).toBe(0);
  });

  it('returns 0 for tree with only applied gifts', () => {
    const tree = createMockTree({
      giftsReceived: [
        createMockGift({ type: GiftType.WATER_DROP, appliedDate: new Date().toISOString() }),
        createMockGift({ type: GiftType.SPARKLE, appliedDate: new Date().toISOString() }),
      ],
    });
    expect(calculateBufferDays(tree)).toBe(0);
  });

  it('calculate buffer correctly for single gift', () => {
    const tree = createMockTree({
      giftsReceived: [createMockGift({ type: GiftType.WATER_DROP, appliedDate: undefined })],
    });
    expect(calculateBufferDays(tree)).toBe(10);
  });

  it('calculates buffer correctly for multiple gifts', () => {
    const tree = createMockTree({
      giftsReceived: [
        createMockGift({ id: '1', type: GiftType.WATER_DROP, appliedDate: undefined }), // 10
        createMockGift({ id: '2', type: GiftType.SPARKLE, appliedDate: undefined }),    // 5
        createMockGift({ id: '3', type: GiftType.GOLDEN_FLOWER, appliedDate: undefined }), // 15
      ],
    });
    expect(calculateBufferDays(tree)).toBe(30); // 10 + 5 + 15
  });

  it('ignores seed and ribbon (0 buffer)', () => {
    const tree = createMockTree({
      giftsReceived: [
        createMockGift({ id: '1', type: GiftType.SEED, appliedDate: undefined }),
        createMockGift({ id: '2', type: GiftType.RIBBON, appliedDate: undefined }),
      ],
    });
    expect(calculateBufferDays(tree)).toBe(0);
  });
});

// ============================================================================
// GET HEALTH CATEGORY TESTS
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
    expect(getHealthCategory(0)).toBe('dying');
  });
});

// ============================================================================
// GET HEALTH INDICATOR TESTS
// ============================================================================

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

  it('threshold boundaries are correct', () => {
    // 80 is healthy
    expect(getHealthIndicator(80).color).toBe('green');
    // 79 is thirsty
    expect(getHealthIndicator(79).color).toBe('amber');
    // 40 is thirsty
    expect(getHealthIndicator(40).color).toBe('amber');
    // 39 is dying
    expect(getHealthIndicator(39).color).toBe('red');
  });
});

// ============================================================================
// GET GIFT BUFFER DAYS TESTS
// ============================================================================

describe('getGiftBufferDays', () => {
  it('returns correct buffer days for each gift type', () => {
    expect(getGiftBufferDays(GiftType.WATER_DROP)).toBe(10);
    expect(getGiftBufferDays(GiftType.SPARKLE)).toBe(5);
    expect(getGiftBufferDays(GiftType.SEED)).toBe(0);
    expect(getGiftBufferDays(GiftType.RIBBON)).toBe(0);
    expect(getGiftBufferDays(GiftType.GOLDEN_FLOWER)).toBe(15);
  });
});

// ============================================================================
// GET TREES NEEDING REFRESH TESTS
// ============================================================================

describe('getTreesNeedingRefresh', () => {
  it('returns empty array for healthy trees', () => {
    const trees = [
      createMockTree({ id: 'tree-1', lastRefreshDate: new Date().toISOString() }),
      createMockTree({ id: 'tree-2', lastRefreshDate: new Date().toISOString() }),
    ];
    expect(getTreesNeedingRefresh(trees)).toHaveLength(0);
  });

  it('returns trees with health < 50%', () => {
    const today = new Date().toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    
    const trees = [
      createMockTree({ id: 'tree-1', lastRefreshDate: today }), // 100%
      createMockTree({ id: 'tree-2', lastRefreshDate: tenDaysAgo }), // 60%
      createMockTree({ id: 'tree-3', lastRefreshDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }), // 15%
    ];
    
    const needingRefresh = getTreesNeedingRefresh(trees);
    // tree-2 (60%) is above 50%, tree-3 (15%) is below
    expect(needingRefresh).toHaveLength(1);
    expect(needingRefresh[0].id).toBe('tree-3');
  });

  it('returns trees at 35% health (11-14 days)', () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString();
    const trees = [createMockTree({ id: 'tree-1', lastRefreshDate: elevenDaysAgo })];
    
    const needingRefresh = getTreesNeedingRefresh(trees);
    expect(needingRefresh).toHaveLength(1);
  });
});

// ============================================================================
// GET DYING TREES TESTS
// ============================================================================

describe('getDyingTrees', () => {
  it('returns empty array for healthy trees', () => {
    const trees = [
      createMockTree({ id: 'tree-1', lastRefreshDate: new Date().toISOString() }),
      createMockTree({ id: 'tree-2', lastRefreshDate: new Date().toISOString() }),
    ];
    expect(getDyingTrees(trees)).toHaveLength(0);
  });

  it('returns only trees with health < 40%', () => {
    const trees = [
      createMockTree({ id: 'tree-1', lastRefreshDate: new Date().toISOString() }), // 100%
      createMockTree({ id: 'tree-2', lastRefreshDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }), // 60%
      createMockTree({ id: 'tree-3', lastRefreshDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }), // 15%
    ];
    
    const dying = getDyingTrees(trees);
    expect(dying).toHaveLength(1);
    expect(dying[0].id).toBe('tree-3');
  });

  it('includes trees at minimum health (5%)', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const trees = [createMockTree({ id: 'tree-1', lastRefreshDate: thirtyDaysAgo })];
    
    const dying = getDyingTrees(trees);
    expect(dying).toHaveLength(1);
  });
});

// ============================================================================
// TREE NEEDS ATTENTION TESTS
// ============================================================================

describe('treeNeedsAttention', () => {
  it('returns false for tree at 100% health', () => {
    const tree = createMockTree({ lastRefreshDate: new Date().toISOString() });
    expect(treeNeedsAttention(tree)).toBe(false);
  });

  it('returns true for tree below 100% health', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({ lastRefreshDate: fiveDaysAgo });
    expect(treeNeedsAttention(tree)).toBe(true);
  });
});

// ============================================================================
// GET HEALTH DESCRIPTION TESTS
// ============================================================================

describe('getHealthDescription', () => {
  it('describes perfect health', () => {
    const tree = createMockTree({ lastRefreshDate: new Date().toISOString() });
    const desc = getHealthDescription(tree);
    expect(desc).toContain('perfect health');
  });

  it('describes healthy trees (80-99%)', () => {
    const tree = createMockTree({
      lastRefreshDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }); // 85%
    const desc = getHealthDescription(tree);
    expect(desc).toContain('doing well');
  });

  it('mentions gift protection when gifts are available', () => {
    // 15 days since refresh with 1 water_drop (10 days buffer)
    // = effective 5 days = 85% health, but with gift protection
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({
      lastRefreshDate: fifteenDaysAgo,
      giftsReceived: [createMockGift({ type: GiftType.WATER_DROP, appliedDate: undefined })],
    });
    const desc = getHealthDescription(tree);
    expect(desc).toContain('protection');
    expect(desc).toContain('10');
  });

  it('describes thirsty trees', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({ lastRefreshDate: tenDaysAgo }); // 60%
    const desc = getHealthDescription(tree);
    expect(desc).toContain('attention');
  });

  it('describes dying trees', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const tree = createMockTree({ lastRefreshDate: fifteenDaysAgo }); // 15%
    const desc = getHealthDescription(tree);
    expect(desc).toContain('critical');
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('TREE_HEALTH_CONSTANTS', () => {
  it('exports correct minimum health', () => {
    expect(TREE_HEALTH_CONSTANTS.MIN_HEALTH).toBe(5);
  });

  it('exports correct maximum health', () => {
    expect(TREE_HEALTH_CONSTANTS.MAX_HEALTH).toBe(100);
  });

  it('exports correct thresholds', () => {
    expect(TREE_HEALTH_CONSTANTS.NEEDS_REFRESH_THRESHOLD).toBe(50);
    expect(TREE_HEALTH_CONSTANTS.DYING_THRESHOLD).toBe(40);
  });

  it('exports gift buffer days', () => {
    expect(TREE_HEALTH_CONSTANTS.GIFT_BUFFER_DAYS).toBeDefined();
    expect(TREE_HEALTH_CONSTANTS.GIFT_BUFFER_DAYS[GiftType.WATER_DROP]).toBe(10);
  });

  it('exports health thresholds array', () => {
    expect(TREE_HEALTH_CONSTANTS.HEALTH_THRESHOLDS).toBeDefined();
    expect(TREE_HEALTH_CONSTANTS.HEALTH_THRESHOLDS).toHaveLength(5);
  });
});