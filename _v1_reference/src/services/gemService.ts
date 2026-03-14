/**
 * Gem Service
 * 
 * Manages the gem currency system for LingoFriends.
 * Gems are earned through lesson performance and streaks,
 * and spent in the garden shop for decorations.
 * 
 * Earning Gems:
 * - Base gems per lesson: floor(accuracy% × 5)
 *   - 100% accuracy = 5 gems
 *   - 80% accuracy = 4 gems
 *   - 60% accuracy = 3 gems
 * - Streak multiplier:
 *   - 3+ day streak: ×1.5
 *   - 7+ day streak: ×2
 *   - 14+ day streak: ×3
 * 
 * Spending Gems:
 * - Tree care decorations: 15-50 gems (+5 days tree health)
 * - Garden decorations: 10-80 gems (cosmetic only)
 * - Avatar items: 20-100 gems
 * 
 * @module gemService
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import type { ProfileRecord } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of a gem calculation after a lesson.
 */
export interface GemEarningResult {
  /** Base gems earned from accuracy */
  baseGems: number;
  /** Streak multiplier applied */
  streakMultiplier: number;
  /** Total gems earned (base × multiplier) */
  totalGems: number;
  /** Current streak in days */
  currentStreak: number;
  /** New total gem balance */
  newBalance: number;
}

/**
 * Shop item purchasable with gems.
 */
export interface ShopItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Emoji or icon */
  emoji: string;
  /** Description for shop display */
  description: string;
  /** Gem cost */
  cost: number;
  /** Category for shop filtering */
  category: 'tree_care' | 'garden' | 'avatar' | 'special';
  /** Whether this item affects tree health */
  affectsTreeHealth: boolean;
  /** Tree health buffer days (if applicable) */
  healthBufferDays?: number;
}

/**
 * Achievement that can grant bonus gems or gifts.
 */
export interface GemAchievement {
  /** Achievement type */
  type: 'streak_3' | 'streak_7' | 'streak_14' | 'streak_30' | 'perfect_lesson' | 'pathway_complete' | 'five_pathways';
  /** Bonus gems awarded */
  bonusGems: number;
  /** Optional gift type awarded */
  giftType?: 'decoration' | 'golden_flower';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Streak multipliers for gem earnings.
 */
const STREAK_MULTIPLIERS = [
  { minDays: 14, multiplier: 3 },
  { minDays: 7, multiplier: 2 },
  { minDays: 3, multiplier: 1.5 },
  { minDays: 0, multiplier: 1 },
] as const;

/**
 * Achievement bonuses.
 */
const ACHIEVEMENT_BONUSES: Record<string, GemAchievement> = {
  streak_3: { type: 'streak_3', bonusGems: 5 },
  streak_7: { type: 'streak_7', bonusGems: 15, giftType: 'decoration' },
  streak_14: { type: 'streak_14', bonusGems: 30, giftType: 'decoration' },
  streak_30: { type: 'streak_30', bonusGems: 100, giftType: 'golden_flower' },
  perfect_lesson: { type: 'perfect_lesson', bonusGems: 3 },
  pathway_complete: { type: 'pathway_complete', bonusGems: 20 },
  five_pathways: { type: 'five_pathways', bonusGems: 100, giftType: 'golden_flower' },
};

/**
 * Shop catalogue with all purchasable items.
 * Items organized by category for the shop UI.
 */
export const SHOP_CATALOGUE: ShopItem[] = [
  // Tree Care - Items that boost tree health
  {
    id: 'watering_can',
    name: 'Watering Can',
    emoji: '🚿',
    description: 'Keeps your tree healthy for 5 days!',
    cost: 15,
    category: 'tree_care',
    affectsTreeHealth: true,
    healthBufferDays: 5,
  },
  {
    id: 'sun_lamp',
    name: 'Sun Lamp',
    emoji: '💡',
    description: 'Provides light for 5 days of health!',
    cost: 20,
    category: 'tree_care',
    affectsTreeHealth: true,
    healthBufferDays: 5,
  },
  {
    id: 'fertilizer',
    name: 'Magic Fertilizer',
    emoji: '✨',
    description: 'Boosts tree health for 5 days!',
    cost: 25,
    category: 'tree_care',
    affectsTreeHealth: true,
    healthBufferDays: 5,
  },
  {
    id: 'rainbow_pot',
    name: 'Rainbow Pot',
    emoji: '🌈',
    description: 'A beautiful pot that keeps trees happy for 5 days!',
    cost: 30,
    category: 'tree_care',
    affectsTreeHealth: true,
    healthBufferDays: 5,
  },
  
  // Garden - Pure cosmetic decorations
  {
    id: 'garden_gnome',
    name: 'Garden Gnome',
    emoji: '🗿',
    description: 'A friendly guardian for your garden!',
    cost: 25,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    emoji: '🦋',
    description: 'A beautiful butterfly for your garden!',
    cost: 15,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'birdhouse',
    name: 'Birdhouse',
    emoji: '🏠',
    description: 'Attracts friendly birds to your garden!',
    cost: 30,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'flower_bed',
    name: 'Flower Bed',
    emoji: '🌷',
    description: 'A colorful flower bed!',
    cost: 20,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'stepping_stone',
    name: 'Stepping Stone',
    emoji: '🪨',
    description: 'A pretty path through your garden!',
    cost: 10,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'pond',
    name: 'Garden Pond',
    emoji: 'pond',
    description: 'A peaceful pond with fish!',
    cost: 55,
    category: 'garden',
    affectsTreeHealth: false,
  },
  {
    id: 'fountain',
    name: 'Fountain',
    emoji: '⛲',
    description: 'An elegant fountain for your garden!',
    cost: 80,
    category: 'garden',
    affectsTreeHealth: false,
  },
  
  // Avatar - Character customization
  {
    id: 'fox_avatar',
    name: 'Fox Avatar',
    emoji: '🦊',
    description: 'Change your avatar to a cute fox!',
    cost: 50,
    category: 'avatar',
    affectsTreeHealth: false,
  },
  {
    id: 'cat_avatar',
    name: 'Cat Avatar',
    emoji: '🐱',
    description: 'Change your avatar to a friendly cat!',
    cost: 50,
    category: 'avatar',
    affectsTreeHealth: false,
  },
  {
    id: 'owl_avatar',
    name: 'Owl Avatar',
    emoji: '🦉',
    description: 'Change your avatar to a wise owl!',
    cost: 50,
    category: 'avatar',
    affectsTreeHealth: false,
  },
  {
    id: 'party_hat',
    name: 'Party Hat',
    emoji: '🎉',
    description: 'A festive party hat for your avatar!',
    cost: 30,
    category: 'avatar',
    affectsTreeHealth: false,
  },
  {
    id: 'crown',
    name: 'Golden Crown',
    emoji: '👑',
    description: 'Be the ruler of your garden!',
    cost: 100,
    category: 'avatar',
    affectsTreeHealth: false,
  },
];

// ============================================================================
// GEM EARNING FUNCTIONS
// ============================================================================

/**
 * Calculate gems earned from a lesson.
 * 
 * Formula: floor(accuracy% × 5) × streakMultiplier
 * 
 * @param correctAnswers - Number of correct answers
 * @param totalQuestions - Total number of questions
 * @param currentStreak - Current streak in days
 * @returns Gem earning result
 * 
 * @example
 * // Perfect score with 7-day streak
 * const result = calculateGemEarning(10, 10, 7);
 * // baseGems: 5, streakMultiplier: 2, totalGems: 10
 */
export function calculateGemEarning(
  correctAnswers: number,
  totalQuestions: number,
  currentStreak: number
): GemEarningResult {
  // Calculate accuracy percentage (0-100)
  const accuracyPercent = totalQuestions > 0 
    ? (correctAnswers / totalQuestions) * 100 
    : 0;
  
  // Base gems: floor(accuracy% × 5) / 100 × 5
  // So 100% = 5 gems, 80% = 4 gems, etc.
  const baseGems = Math.floor(accuracyPercent / 20);
  
  // Apply streak multiplier
  const streakMultiplier = getStreakMultiplier(currentStreak);
  const totalGems = Math.floor(baseGems * streakMultiplier);
  
  return {
    baseGems,
    streakMultiplier,
    totalGems,
    currentStreak,
    newBalance: 0, // Will be set by addGems
  };
}

/**
 * Get the streak multiplier based on current streak.
 * 
 * @param streak - Current streak in days
 * @returns Multiplier (1, 1.5, 2, or 3)
 */
export function getStreakMultiplier(streak: number): number {
  for (const tier of STREAK_MULTIPLIERS) {
    if (streak >= tier.minDays) {
      return tier.multiplier;
    }
  }
  return 1;
}

/**
 * Get the achievement for a streak milestone.
 * 
 * @param streak - Current streak in days
 * @returns Achievement if milestone reached, null otherwise
 */
export function getStreakAchievement(streak: number): GemAchievement | null {
  // Check for specific streak milestones
  if (streak === 3) return ACHIEVEMENT_BONUSES.streak_3;
  if (streak === 7) return ACHIEVEMENT_BONUSES.streak_7;
  if (streak === 14) return ACHIEVEMENT_BONUSES.streak_14;
  if (streak === 30) return ACHIEVEMENT_BONUSES.streak_30;
  return null;
}

// ============================================================================
// GEM BALANCE FUNCTIONS
// ============================================================================

/**
 * Get the current gem balance for a user.
 * 
 * @param userId - The user's ID
 * @returns Current gem balance
 */
export async function getGemBalance(userId: string): Promise<number> {
  try {
    const profile = await pb.collection('profiles').getOne<ProfileRecord>(userId);
    return profile.gems || 0;
  } catch (error) {
    console.error('[gemService] Failed to get gem balance:', error);
    return 0;
  }
}

/**
 * Add gems to a user's balance.
 * 
 * @param userId - The user's ID
 * @param amount - Amount of gems to add
 * @returns New gem balance
 */
export async function addGems(userId: string, amount: number): Promise<number> {
  try {
    const currentBalance = await getGemBalance(userId);
    const newBalance = currentBalance + amount;
    
    await pb.collection('profiles').update(userId, {
      gems: newBalance,
    });
    
    return newBalance;
  } catch (error) {
    console.error('[gemService] Failed to add gems:', error);
    throw new Error('Failed to add gems. Please try again.');
  }
}

/**
 * Spend gems on a purchase.
 * 
 * @param userId - The user's ID
 * @param amount - Amount of gems to spend
 * @returns New gem balance after purchase
 * @throws Error if insufficient balance
 */
export async function spendGems(userId: string, amount: number): Promise<number> {
  try {
    const currentBalance = await getGemBalance(userId);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient gems. Need ${amount}, have ${currentBalance}.`);
    }
    
    const newBalance = currentBalance - amount;
    
    await pb.collection('profiles').update(userId, {
      gems: newBalance,
    });
    
    return newBalance;
  } catch (error) {
    console.error('[gemService] Failed to spend gems:', error);
    throw error;
  }
}

/**
 * Check if user can afford an item.
 * 
 * @param userId - The user's ID
 * @param itemId - Shop item ID
 * @returns True if user can afford the item
 */
export async function canAfford(userId: string, itemId: string): Promise<boolean> {
  const item = SHOP_CATALOGUE.find(i => i.id === itemId);
  if (!item) return false;
  
  const balance = await getGemBalance(userId);
  return balance >= item.cost;
}

// ============================================================================
// SHOP FUNCTIONS
// ============================================================================

/**
 * Get all items in a shop category.
 * 
 * @param category - Shop category
 * @returns Items in that category
 */
export function getShopItemsByCategory(category: ShopItem['category']): ShopItem[] {
  return SHOP_CATALOGUE.filter(item => item.category === category);
}

/**
 * Get a specific shop item.
 * 
 * @param itemId - The item's ID
 * @returns Shop item or undefined
 */
export function getShopItem(itemId: string): ShopItem | undefined {
  return SHOP_CATALOGUE.find(item => item.id === itemId);
}

/**
 * Purchase an item from the shop.
 * 
 * @param userId - The user's ID
 * @param itemId - Shop item ID
 * @returns New gem balance after purchase
 * @throws Error if item not found or insufficient gems
 */
export async function purchaseItem(userId: string, itemId: string): Promise<{
  newBalance: number;
  item: ShopItem;
}> {
  const item = getShopItem(itemId);
  
  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }
  
  const newBalance = await spendGems(userId, item.cost);
  
  // Note: The actual item delivery (adding to inventory, applying effects)
  // is handled by separate services based on item category
  // - tree_care: Apply health buffer to tree
  // - garden: Add to garden_objects collection
  // - avatar: Update profile.avatar
  
  return { newBalance, item };
}

// ============================================================================
// SYNC UTILITIES
// ============================================================================

/**
 * Award gems after completing a lesson.
 * This combines calculation, achievement check, and balance update.
 * 
 * @param userId - The user's ID
 * @param correctAnswers - Number of correct answers
 * @param totalQuestions - Total questions
 * @param currentStreak - Current streak in days
 * @returns Complete earning result with achievement if any
 */
export async function awardGemsForLesson(
  userId: string,
  correctAnswers: number,
  totalQuestions: number,
  currentStreak: number
): Promise<GemEarningResult & { achievement?: GemAchievement }> {
  // Calculate gems
  const result = calculateGemEarning(correctAnswers, totalQuestions, currentStreak);
  
  // Add gems to balance
  const newBalance = await addGems(userId, result.totalGems);
  
  // Check for streak achievement
  const achievement = getStreakAchievement(currentStreak);
  
  // Award achievement bonus gems
  if (achievement) {
    await addGems(userId, achievement.bonusGems);
  }
  
  return {
    ...result,
    newBalance: achievement ? newBalance + achievement.bonusGems : newBalance,
    achievement,
  };
}

/**
 * Get the emoji for gems (purple crystal).
 * Using a purple gem/crystal emoji for the currency.
 */
export const GEM_EMOJI = '💎';

/**
 * Format gems for display.
 * 
 * @param amount - Gem amount
 * @returns Formatted string with emoji
 */
export function formatGems(amount: number): string {
  return `${GEM_EMOJI} ${amount}`;
}