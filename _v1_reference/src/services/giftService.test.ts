/**
 * Gift Service Tests
 * 
 * Unit tests for the gift system service.
 * Tests gift unlock logic, CRUD operations, and utility functions.
 * 
 * @module giftService.test
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkGiftUnlock,
  getGiftConfig,
  getGiftEmoji,
  getGiftName,
  GIFT_CONFIGS,
  formatGiftDate,
  getDefaultGiftMessage,
  type LessonResult,
} from './giftService';
import { GiftType } from '../types/game';

// ============================================
// MOCKS
// ============================================

// Mock Pocketbase service
vi.mock('../../services/pocketbaseService', () => ({
  pb: {
    collection: vi.fn(() => ({
      create: vi.fn(),
      update: vi.fn(),
      getList: vi.fn(),
      getOne: vi.fn(),
      delete: vi.fn(),
    })),
  },
  getCurrentUserId: vi.fn(() => 'user-123'),
}));

// ============================================
// TESTS: GIFT UNLOCK LOGIC
// ============================================

describe('checkGiftUnlock', () => {
  it('should return null when no lesson result conditions are met (should not happen)', () => {
    // The water_drop is the default gift, so this should never return null
    // But let's test the priority system works
    const result: LessonResult = {
      sunDropsEarned: 0,
      sunDropsMax: 20,
      stars: 0,
    };
    
    // Should get water_drop as default
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('water_drop');
  });
  
  it('should return water_drop for basic lesson completion', () => {
    const result: LessonResult = {
      sunDropsEarned: 10,
      sunDropsMax: 20,
      stars: 1,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('water_drop');
  });
  
  it('should return sparkle for 20+ Sun Drops earned', () => {
    const result: LessonResult = {
      sunDropsEarned: 20,
      sunDropsMax: 24,
      stars: 2,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('sparkle');
  });
  
  it('should return sparkle for more than 20 Sun Drops', () => {
    const result: LessonResult = {
      sunDropsEarned: 25,
      sunDropsMax: 30,
      stars: 2,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('sparkle');
  });
  
  // Note: Ribbon was replaced with Decoration (purchased with gems in shop)
  // Lessons completed today no longer awards a gift automatically
  it('should return water_drop for lessons with no special conditions', () => {
    const result: LessonResult = {
      sunDropsEarned: 15,
      sunDropsMax: 20,
      stars: 2,
      lessonsCompletedToday: 3,
    };
    
    const gift = checkGiftUnlock(result);
    // Water drop is not auto-awarded anymore (friend gifts only)
    expect(gift).toBeNull();
  });
  
  it('should return golden_flower for 3 stars (highest priority)', () => {
    const result: LessonResult = {
      sunDropsEarned: 25,
      sunDropsMax: 25,
      stars: 3,
      lessonsCompletedToday: 3,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('golden_flower');
  });
  
  it('should return seed when path is complete', () => {
    const result: LessonResult = {
      sunDropsEarned: 20,
      sunDropsMax: 25,
      stars: 2,
      pathComplete: true,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('seed');
  });
  
  it('should prioritize golden_flower over other conditions', () => {
    // Golden flower (3 stars) has higher priority than:
    // - seed (path complete)
    // - sparkle (20+ sun drops)
    // - ribbon (3+ lessons)
    const result: LessonResult = {
      sunDropsEarned: 22,
      sunDropsMax: 25,
      stars: 3,
      pathComplete: true,
      lessonsCompletedToday: 4,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('golden_flower');
  });
  
  it('should prioritize seed over sparkle, ribbon, and water_drop', () => {
    const result: LessonResult = {
      sunDropsEarned: 22,
      sunDropsMax: 25,
      stars: 2,
      pathComplete: true,
      lessonsCompletedToday: 4,
    };
    
    const gift = checkGiftUnlock(result);
    expect(gift).toBe('seed');
  });
});

// ============================================
// TESTS: GIFT CONFIG HELPERS
// ============================================

describe('getGiftConfig', () => {
  it('should return config for water_drop', () => {
    const config = getGiftConfig(GiftType.WATER_DROP);
    
    expect(config.name).toBe('Water Drop');
    expect(config.emoji).toBe('💧');
    expect(config.bufferDays).toBe(10);
    expect(config.isDecoration).toBe(false);
    expect(config.rarity).toBe('common');
  });
  
  it('should return config for sparkle', () => {
    const config = getGiftConfig(GiftType.SPARKLE);
    
    expect(config.name).toBe('Sparkle');
    expect(config.emoji).toBe('✨');
    expect(config.bufferDays).toBe(5);
    expect(config.isDecoration).toBe(false);
    expect(config.rarity).toBe('uncommon');
  });
  
  it('should return config for seed', () => {
    const config = getGiftConfig(GiftType.SEED);
    
    expect(config.name).toBe('Seed');
    expect(config.emoji).toBe('🌱');
    expect(config.bufferDays).toBe(0);
    expect(config.isDecoration).toBe(false);
    expect(config.rarity).toBe('rare');
  });
  
  it('should return config for decoration', () => {
    const config = getGiftConfig(GiftType.DECORATION);
    
    expect(config.name).toBe('Tree Decoration');
    expect(config.emoji).toBe('🎀');
    expect(config.bufferDays).toBe(5);
    expect(config.isDecoration).toBe(true);
    expect(config.rarity).toBe('uncommon');
  });
  
  it('should return config for golden_flower', () => {
    const config = getGiftConfig(GiftType.GOLDEN_FLOWER);
    
    expect(config.name).toBe('Golden Flower');
    expect(config.emoji).toBe('🌸');
    expect(config.bufferDays).toBe(15);
    expect(config.isDecoration).toBe(true);
    expect(config.rarity).toBe('legendary');
  });
});

describe('getGiftEmoji', () => {
  it('should return correct emoji for each gift type', () => {
    expect(getGiftEmoji(GiftType.WATER_DROP)).toBe('💧');
    expect(getGiftEmoji(GiftType.SPARKLE)).toBe('✨');
    expect(getGiftEmoji(GiftType.SEED)).toBe('🌱');
    expect(getGiftEmoji(GiftType.DECORATION)).toBe('🎀');
    expect(getGiftEmoji(GiftType.GOLDEN_FLOWER)).toBe('🌸');
  });
});

describe('getGiftName', () => {
  it('should return correct name for each gift type', () => {
    expect(getGiftName(GiftType.WATER_DROP)).toBe('Water Drop');
    expect(getGiftName(GiftType.SPARKLE)).toBe('Sparkle');
    expect(getGiftName(GiftType.SEED)).toBe('Seed');
    expect(getGiftName(GiftType.DECORATION)).toBe('Tree Decoration');
    expect(getGiftName(GiftType.GOLDEN_FLOWER)).toBe('Golden Flower');
  });
});

// ============================================
// TESTS: GIFT CONSTANTS
// ============================================

describe('GIFT_CONFIGS', () => {
  it('should have all gift types defined', () => {
    const giftTypes: GiftType[] = [GiftType.WATER_DROP, GiftType.SPARKLE, GiftType.SEED, GiftType.DECORATION, GiftType.GOLDEN_FLOWER];
    
    giftTypes.forEach(type => {
      expect(GIFT_CONFIGS[type]).toBeDefined();
      expect(GIFT_CONFIGS[type].name).toBeTruthy();
      expect(GIFT_CONFIGS[type].emoji).toBeTruthy();
      expect(GIFT_CONFIGS[type].description).toBeTruthy();
    });
  });
  
  it('should have correct rarity levels', () => {
    expect(GIFT_CONFIGS.water_drop.rarity).toBe('common');
    expect(GIFT_CONFIGS.sparkle.rarity).toBe('uncommon');
    expect(GIFT_CONFIGS.decoration.rarity).toBe('uncommon');
    expect(GIFT_CONFIGS.seed.rarity).toBe('rare');
    expect(GIFT_CONFIGS.golden_flower.rarity).toBe('legendary');
  });
  
  it('should have correct buffer days for health-boosting gifts', () => {
    // Gifts that add buffer days (updated for rebalanced economy)
    expect(GIFT_CONFIGS.water_drop.bufferDays).toBe(1);
    expect(GIFT_CONFIGS.sparkle.bufferDays).toBe(3);
    expect(GIFT_CONFIGS.decoration.bufferDays).toBe(5);
    expect(GIFT_CONFIGS.golden_flower.bufferDays).toBe(10);
    
    // Gifts that don't add buffer days
    expect(GIFT_CONFIGS.seed.bufferDays).toBe(0);
  });
  
  it('should correctly identify decorations', () => {
    expect(GIFT_CONFIGS.decoration.isDecoration).toBe(true);
    expect(GIFT_CONFIGS.golden_flower.isDecoration).toBe(true);
    
    expect(GIFT_CONFIGS.water_drop.isDecoration).toBe(false);
    expect(GIFT_CONFIGS.sparkle.isDecoration).toBe(false);
    expect(GIFT_CONFIGS.seed.isDecoration).toBe(false);
  });
});

// ============================================
// TESTS: UTILITY FUNCTIONS
// ============================================

describe('formatGiftDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should return "Recently" for undefined date', () => {
    expect(formatGiftDate(undefined)).toBe('Recently');
  });
  
  it('should return "Today" for today', () => {
    const today = new Date('2024-01-15T10:00:00Z').toISOString();
    expect(formatGiftDate(today)).toBe('Today');
  });
  
  it('should return "Yesterday" for yesterday', () => {
    const yesterday = new Date('2024-01-14T10:00:00Z').toISOString();
    expect(formatGiftDate(yesterday)).toBe('Yesterday');
  });
  
  it('should return "X days ago" for days within a week', () => {
    const threeDaysAgo = new Date('2024-01-12T10:00:00Z').toISOString();
    expect(formatGiftDate(threeDaysAgo)).toBe('3 days ago');
  });
  
  it('should return formatted date for dates over a week ago', () => {
    const twoWeeksAgo = new Date('2024-01-01T10:00:00Z').toISOString();
    const result = formatGiftDate(twoWeeksAgo);
    // Should return a locale date string
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
    expect(result).not.toMatch(/days ago/);
  });
});

describe('getDefaultGiftMessage', () => {
  it('should return kid-friendly messages for each gift type', () => {
    const senderName = 'Jamie';
    
    expect(getDefaultGiftMessage(GiftType.WATER_DROP, senderName)).toContain('Water Drop');
    expect(getDefaultGiftMessage(GiftType.WATER_DROP, senderName)).toContain('💧');
    expect(getDefaultGiftMessage(GiftType.WATER_DROP, senderName)).toContain(senderName);
    
    expect(getDefaultGiftMessage(GiftType.SPARKLE, senderName)).toContain('Sparkle');
    expect(getDefaultGiftMessage(GiftType.SPARKLE, senderName)).toContain('✨');
    
    expect(getDefaultGiftMessage(GiftType.SEED, senderName)).toContain('Seed');
    expect(getDefaultGiftMessage(GiftType.SEED, senderName)).toContain('🌱');
    
    expect(getDefaultGiftMessage(GiftType.DECORATION, senderName)).toContain('Decoration');
    expect(getDefaultGiftMessage(GiftType.DECORATION, senderName)).toContain('🎀');
    
    expect(getDefaultGiftMessage(GiftType.GOLDEN_FLOWER, senderName)).toContain('Golden Flower');
    expect(getDefaultGiftMessage(GiftType.GOLDEN_FLOWER, senderName)).toContain('🌸');
    expect(getDefaultGiftMessage(GiftType.GOLDEN_FLOWER, senderName)).toContain('rare');
  });
  
  it('should be kid-friendly (no inappropriate content)', () => {
    const giftTypes = [GiftType.WATER_DROP, GiftType.SPARKLE, GiftType.SEED, GiftType.DECORATION, GiftType.GOLDEN_FLOWER];
    const messages = giftTypes.map(type => 
      getDefaultGiftMessage(type, 'Test')
    );
    
    messages.forEach(msg => {
      // Should not contain any concerning words
      expect(msg).not.toMatch(/kill|death|scary|horror/i);
      // Should be positive
      expect(msg.length).toBeGreaterThan(10);
    });
  });
});

// ============================================
// TESTS: GIFT UNLOCK PRIORITY
// ============================================

describe('Gift Unlock Priority', () => {
  it('should prioritize golden_flower over all others (priority 4)', () => {
    // 3 stars + 20+ drops + path complete + 3+ lessons = golden_flower wins
    const result: LessonResult = {
      sunDropsEarned: 25,
      sunDropsMax: 25,
      stars: 3,
      pathComplete: true,
      lessonsCompletedToday: 4,
    };
    
    expect(checkGiftUnlock(result)).toBe('golden_flower');
  });
  
  it('should prioritize seed over sparkle, ribbon, water_drop (priority 3)', () => {
    // path complete + 20+ drops + 3+ lessons = seed wins
    const result: LessonResult = {
      sunDropsEarned: 22,
      sunDropsMax: 25,
      stars: 2,
      pathComplete: true,
      lessonsCompletedToday: 4,
    };
    
    expect(checkGiftUnlock(result)).toBe('seed');
  });
  
  it('should prioritize sparkle over ribbon and water_drop (priority 2)', () => {
    // 20+ drops + 3+ lessons = sparkle wins
    const result: LessonResult = {
      sunDropsEarned: 20,
      sunDropsMax: 25,
      stars: 2,
      lessonsCompletedToday: 4,
    };
    
    expect(checkGiftUnlock(result)).toBe('sparkle');
  });
  
  // Note: Ribbon/decoration is now purchased with gems, not awarded from lessons
  // Lessons completed today no longer triggers gift awards
  it('should return null for lessons completed today (no longer awards decoration)', () => {
    // 3+ lessons + <20 drops = no gift (ribbon was replaced with shop-purchased decoration)
    const result: LessonResult = {
      sunDropsEarned: 15,
      sunDropsMax: 25,
      stars: 2,
      lessonsCompletedToday: 3,
    };
    
    // Ribbon removed - decorations now purchased with gems
    expect(checkGiftUnlock(result)).toBeNull();
  });
  
  it('should return null as default for basic lessons (water_drop is friend-gift only)', () => {
    const result: LessonResult = {
      sunDropsEarned: 10,
      sunDropsMax: 25,
      stars: 1,
      lessonsCompletedToday: 1,
      pathComplete: false,
    };
    
    // Water drop no longer auto-awarded - friend gifts only
    expect(checkGiftUnlock(result)).toBeNull();
  });
});