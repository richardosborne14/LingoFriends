/**
 * Gift Service
 * 
 * Manages the gift system for LingoFriends social features.
 * Players earn gifts from lessons and send them to friends.
 * Gifts help trees stay healthy by adding buffer days to decay.
 * 
 * Gift Types & Effects:
 * - 💧 Water Drop: +10 days buffer (any lesson)
 * - ✨ Sparkle: +5 days buffer (20+ Sun Drops)
 * - 🎀 Ribbon: Decoration only (3+ lessons/day)
 * - 🌸 Golden Flower: +15 days buffer (3 stars)
 * - 🌱 Seed: Start new path (all lessons in path)
 * 
 * @module giftService
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 * @see docs/phase-1.1/GAME_DESIGN.md Section 10 (Gift System)
 */

import { pb, getCurrentUserId } from '../../services/pocketbaseService';
import type { GiftType, GiftItem } from '../types/game';
import { GiftType as GiftTypeEnum } from '../types/game';
import type { GiftRecord } from '../types/pocketbase';
import { giftRecordToGiftItem } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of completing a lesson.
 * Used to determine which gift to unlock.
 */
export interface LessonResult {
  /** Sun Drops earned in this lesson */
  sunDropsEarned: number;
  /** Maximum possible Sun Drops */
  sunDropsMax: number;
  /** Star rating (1-3) */
  stars: number;
  /** Number of lessons completed today (for ribbon) */
  lessonsCompletedToday?: number;
  /** Whether all lessons in path are complete (for seed) */
  pathComplete?: boolean;
}

/**
 * Gift configuration for display and effects.
 */
export interface GiftConfig {
  /** Display name */
  name: string;
  /** Emoji icon */
  emoji: string;
  /** Short description */
  description: string;
  /** Buffer days added to tree health */
  bufferDays: number;
  /** Whether this gift is a decoration */
  isDecoration: boolean;
  /** Rarity level for UI styling */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * Friend info for gift sending UI.
 */
export interface FriendInfo {
  /** User ID */
  id: string;
  /** Display name */
  username: string;
  /** Avatar emoji */
  avatar?: string;
}

/**
 * Gift with sender information for inbox display.
 */
export interface GiftWithSender extends GiftItem {
  /** Sender's display name */
  fromUserName: string;
  /** Optional message from sender */
  message?: string;
  /** When the gift was sent */
  sentAt?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Gift configurations with all display and effect data.
 */
export const GIFT_CONFIGS: Record<GiftType, GiftConfig> = {
  water_drop: {
    name: 'Water Drop',
    emoji: '💧',
    description: 'Keep a friend\'s tree healthy!',
    bufferDays: 10,
    isDecoration: false,
    rarity: 'common',
  },
  sparkle: {
    name: 'Sparkle',
    emoji: '✨',
    description: 'Add some magic to a tree!',
    bufferDays: 5,
    isDecoration: false,
    rarity: 'uncommon',
  },
  seed: {
    name: 'Seed',
    emoji: '🌱',
    description: 'Start a new learning path!',
    bufferDays: 0,
    isDecoration: false,
    rarity: 'rare',
  },
  ribbon: {
    name: 'Ribbon',
    emoji: '🎀',
    description: 'Decorate a special tree!',
    bufferDays: 0,
    isDecoration: true,
    rarity: 'uncommon',
  },
  golden_flower: {
    name: 'Golden Flower',
    emoji: '🌸',
    description: 'A rare gift for a special friend!',
    bufferDays: 15,
    isDecoration: true,
    rarity: 'legendary',
  },
};

/**
 * Gift unlock rules ordered by priority (highest tier first).
 * The first matching rule determines the gift.
 */
const GIFT_UNLOCK_RULES: Array<{
  type: GiftType;
  condition: (result: LessonResult) => boolean;
  priority: number;
}> = [
  {
    type: GiftTypeEnum.GOLDEN_FLOWER,
    condition: (r) => r.stars === 3,
    priority: 4,
  },
  {
    type: GiftTypeEnum.SEED,
    condition: (r) => r.pathComplete === true,
    priority: 3,
  },
  {
    type: GiftTypeEnum.SPARKLE,
    condition: (r) => r.sunDropsEarned >= 20,
    priority: 2,
  },
  {
    type: GiftTypeEnum.RIBBON,
    condition: (r) => (r.lessonsCompletedToday || 0) >= 3,
    priority: 1,
  },
  {
    type: GiftTypeEnum.WATER_DROP,
    condition: () => true, // Default gift for any lesson
    priority: 0,
  },
];

// ============================================================================
// GIFT UNLOCK FUNCTIONS
// ============================================================================

/**
 * Check if a lesson result unlocks a gift.
 * Returns the highest-tier gift unlocked based on performance.
 * 
 * @param result - The lesson completion result
 * @returns The unlocked gift type, or null if no gift
 * 
 * @example
 * // Perfect score unlocks golden flower
 * const gift = checkGiftUnlock({ sunDropsEarned: 22, sunDropsMax: 22, stars: 3 });
 * // Returns 'golden_flower'
 * 
 * @example
 * // Good performance unlocks sparkle
 * const gift = checkGiftUnlock({ sunDropsEarned: 20, sunDropsMax: 24, stars: 2 });
 * // Returns 'sparkle'
 */
export function checkGiftUnlock(result: LessonResult): GiftType | null {
  // Sort by priority (highest first) and find first match
  const sortedRules = [...GIFT_UNLOCK_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    if (rule.condition(result)) {
      return rule.type;
    }
  }
  
  return null;
}

/**
 * Get the configuration for a gift type.
 * 
 * @param giftType - The type of gift
 * @returns Gift configuration
 */
export function getGiftConfig(giftType: GiftType): GiftConfig {
  return GIFT_CONFIGS[giftType];
}

/**
 * Get emoji for a gift type.
 * 
 * @param giftType - The type of gift
 * @returns Emoji string
 */
export function getGiftEmoji(giftType: GiftType): string {
  return GIFT_CONFIGS[giftType].emoji;
}

/**
 * Get display name for a gift type.
 * 
 * @param giftType - The type of gift
 * @returns Display name
 */
export function getGiftName(giftType: GiftType): string {
  return GIFT_CONFIGS[giftType].name;
}

// ============================================================================
// GIFT CRUD FUNCTIONS
// ============================================================================

/**
 * Create a new gift in the user's inventory.
 * Called when a gift is unlocked from a lesson.
 * 
 * @param userId - The user who unlocked the gift
 * @param giftType - The type of gift
 * @returns The created gift item
 * 
 * @example
 * const gift = await createGift(userId, 'water_drop');
 * console.log(gift.id); // New gift ID
 */
export async function createGift(
  userId: string,
  giftType: GiftType
): Promise<GiftItem> {
  try {
    const now = new Date().toISOString();
    
    const record = await pb.collection('gifts').create<GiftRecord>({
      type: giftType,
      fromUser: userId,
      toUser: null, // Not sent yet
      toItem: null,
      message: '',
      unlockedAt: now,
      sentAt: null,
      appliedAt: null,
    });
    
    return {
      id: record.id,
      type: record.type as GiftType,
      fromUserId: record.fromUser,
      fromUserName: '', // Will be populated when displayed
      appliedDate: record.appliedAt || undefined,
    };
  } catch (error) {
    console.error('[giftService] Failed to create gift:', error);
    throw new Error('Failed to create gift. Please try again.');
  }
}

/**
 * Send a gift to a friend.
 * 
 * @param fromUserId - The sender's user ID
 * @param toUserId - The recipient's user ID
 * @param giftId - The gift ID to send
 * @param message - Optional message to include
 * @returns The updated gift record
 * 
 * @example
 * await sendGift(userId, friendId, 'gift-123', 'Thanks for being my friend!');
 */
export async function sendGift(
  fromUserId: string,
  toUserId: string,
  giftId: string,
  message?: string
): Promise<GiftItem> {
  try {
    const now = new Date().toISOString();
    
    const record = await pb.collection('gifts').update<GiftRecord>(giftId, {
      fromUser: fromUserId,
      toUser: toUserId,
      sentAt: now,
      message: message || '',
    });
    
    return {
      id: record.id,
      type: record.type as GiftType,
      fromUserId: record.fromUser,
      fromUserName: '', // Will be populated when displayed
      appliedDate: record.appliedAt || undefined,
    };
  } catch (error) {
    console.error('[giftService] Failed to send gift:', error);
    throw new Error('Failed to send gift. Please try again.');
  }
}

/**
 * Get all gifts available to send (not yet sent).
 * 
 * @param userId - The user's ID
 * @returns Array of available gifts
 */
export async function getAvailableGifts(userId: string): Promise<GiftItem[]> {
  try {
    const records = await pb.collection('gifts').getList<GiftRecord>(1, 50, {
      filter: `fromUser = "${userId}" && sentAt = null && appliedAt = null`,
      sort: '-created',
    });
    
    return records.items.map(giftRecordToGiftItem);
  } catch (error) {
    console.error('[giftService] Failed to get available gifts:', error);
    return [];
  }
}

/**
 * Get all pending gifts received by a user.
 * These are gifts waiting to be accepted/declined.
 * 
 * @param userId - The recipient's user ID
 * @returns Array of pending gifts with sender info
 */
export async function getPendingGifts(userId: string): Promise<GiftWithSender[]> {
  try {
    const records = await pb.collection('gifts').getList<GiftRecord>(1, 50, {
      filter: `toUser = "${userId}" && appliedAt = null`,
      sort: '-sentAt',
      expand: 'fromUser', // Expand to get sender info
    });
    
    return records.items.map((record) => {
      // Get sender name from expanded relation
      const senderProfile = record.expand?.fromUser as { display_name?: string } | undefined;
      const senderName = senderProfile?.display_name || 'A friend';
      
      return {
        id: record.id,
        type: record.type as GiftType,
        fromUserId: record.fromUser,
        fromUserName: senderName,
        appliedDate: record.appliedAt || undefined,
        message: record.message,
        sentAt: record.sentAt,
      };
    });
  } catch (error) {
    console.error('[giftService] Failed to get pending gifts:', error);
    return [];
  }
}

/**
 * Get all gifts sent by a user.
 * 
 * @param userId - The sender's user ID
 * @returns Array of sent gifts
 */
export async function getSentGifts(userId: string): Promise<GiftWithSender[]> {
  try {
    const records = await pb.collection('gifts').getList<GiftRecord>(1, 50, {
      filter: `fromUser = "${userId}" && sentAt != null`,
      sort: '-sentAt',
      expand: 'toUser',
    });
    
    return records.items.map((record) => {
      const recipientProfile = record.expand?.toUser as { display_name?: string } | undefined;
      const recipientName = recipientProfile?.display_name || 'A friend';
      
      return {
        id: record.id,
        type: record.type as GiftType,
        fromUserId: record.fromUser,
        fromUserName: recipientName, // Reusing field for recipient
        appliedDate: record.appliedAt || undefined,
        message: record.message,
        sentAt: record.sentAt,
      };
    });
  } catch (error) {
    console.error('[giftService] Failed to get sent gifts:', error);
    return [];
  }
}

// ============================================================================
// GIFT APPLICATION FUNCTIONS
// ============================================================================

/**
 * Apply a gift to a tree.
 * This adds the gift's buffer days to the tree's health decay protection.
 * 
 * For decoration gifts (ribbon, golden_flower), the gift is added to the
 * tree's decorations array and displayed on the tree.
 * 
 * @param giftId - The gift ID to apply
 * @param treeId - The tree ID to apply the gift to
 * @returns The updated tree ID
 * 
 * @example
 * // Apply a water drop (10 days buffer)
 * await applyGift('gift-123', 'tree-456');
 */
export async function applyGift(giftId: string, treeId: string): Promise<string> {
  try {
    // Get the gift to check its type
    const gift = await pb.collection('gifts').getOne<GiftRecord>(giftId);
    
    if (gift.appliedAt) {
      throw new Error('This gift has already been applied.');
    }
    
    const now = new Date().toISOString();
    
    // Mark gift as applied
    await pb.collection('gifts').update(giftId, {
      appliedAt: now,
      toItem: treeId,
    });
    
    // If it's a decoration, add to tree's decorations array
    const isDecoration = GIFT_CONFIGS[gift.type as GiftType]?.isDecoration;
    
    if (isDecoration) {
      // Get current tree decorations
      const tree = await pb.collection('user_trees').getOne(treeId);
      const currentDecorations = tree.decorations || [];
      
      // Add this gift
      await pb.collection('user_trees').update(treeId, {
        decorations: [...currentDecorations, giftId],
      });
    }
    
    // Note: Buffer days are calculated dynamically from unused gifts
    // in treeHealthService.calculateBufferDays()
    // The gift's appliedAt being null means it's still providing buffer
    
    return treeId;
  } catch (error) {
    console.error('[giftService] Failed to apply gift:', error);
    
    // Check for specific error types
    const err = error as { message?: string };
    if (err.message?.includes('already been applied')) {
      throw error;
    }
    
    throw new Error('Failed to apply gift. Please try again.');
  }
}

/**
 * Decline a gift (delete it).
 * 
 * @param giftId - The gift ID to decline
 * 
 * @example
 * await declineGift('gift-123');
 */
export async function declineGift(giftId: string): Promise<void> {
  try {
    await pb.collection('gifts').delete(giftId);
  } catch (error) {
    console.error('[giftService] Failed to decline gift:', error);
    throw new Error('Failed to decline gift. Please try again.');
  }
}

/**
 * Get the count of unused gifts (providing buffer) for a tree.
 * This is used by treeHealthService but can also be called directly.
 * 
 * @param treeId - The tree ID
 * @returns Number of unused gifts
 */
export async function getTreeGiftCount(treeId: string): Promise<number> {
  try {
    const result = await pb.collection('gifts').getList(1, 1, {
      filter: `toItem = "${treeId}" && appliedAt != null`,
    });
    
    return result.totalItems;
  } catch (error) {
    console.error('[giftService] Failed to get tree gift count:', error);
    return 0;
  }
}

// ============================================================================
// FRIEND FUNCTIONS (PLACEHOLDER)
// ============================================================================

/**
 * Friendship record structure from Pocketbase.
 */
interface FriendshipRecord {
  id: string;
  user_a: string;
  user_b: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  initiated_by: string;
  expand?: {
    user_a?: { id: string; display_name?: string; avatarEmoji?: string };
    user_b?: { id: string; display_name?: string; avatarEmoji?: string };
  };
}

/**
 * Get user's friends for gift sending.
 * 
 * Note: This is a placeholder implementation. The full friend system
 * with friend codes and friend requests is a separate feature.
 * 
 * @param userId - The user's ID
 * @returns Array of friends
 */
export async function getFriends(userId: string): Promise<FriendInfo[]> {
  try {
    // Get accepted friendships where user is either party
    const friendships = await pb.collection('friendships').getList<FriendshipRecord>(1, 50, {
      filter: `(user_a = "${userId}" || user_b = "${userId}") && status = "ACCEPTED"`,
      expand: 'user_a,user_b',
    });
    
    // Extract friend IDs and names
    const friends: FriendInfo[] = [];
    
    for (const friendship of friendships.items) {
      // Determine which user is the friend (not current user)
      const isUserA = friendship.user_a === userId;
      const friendKey = isUserA ? 'user_b' : 'user_a';
      const friendProfile = friendship.expand?.[friendKey];
      
      if (friendProfile) {
        friends.push({
          id: friendProfile.id,
          username: friendProfile.display_name || 'Friend',
          avatar: friendProfile.avatarEmoji,
        });
      }
    }
    
    return friends;
  } catch (error) {
    console.error('[giftService] Failed to get friends:', error);
    // The friendships collection might not exist yet
    // Return empty array rather than throwing
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a gift's sent date for display.
 * 
 * @param sentAt - ISO date string
 * @returns Human-readable date string
 */
export function formatGiftDate(sentAt: string | undefined): string {
  if (!sentAt) return 'Recently';
  
  const date = new Date(sentAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Check if user has any pending gifts (for notification badge).
 * 
 * @param userId - The user's ID
 * @returns True if user has pending gifts
 */
export async function hasPendingGifts(userId: string): Promise<boolean> {
  try {
    const result = await pb.collection('gifts').getList(1, 1, {
      filter: `toUser = "${userId}" && appliedAt = null`,
    });
    
    return result.totalItems > 0;
  } catch (error) {
    console.error('[giftService] Failed to check pending gifts:', error);
    return false;
  }
}

/**
 * Get count of pending gifts for notification badge.
 * 
 * @param userId - The user's ID
 * @returns Number of pending gifts
 */
export async function getPendingGiftCount(userId: string): Promise<number> {
  try {
    const result = await pb.collection('gifts').getList(1, 1, {
      filter: `toUser = "${userId}" && appliedAt = null`,
    });
    
    return result.totalItems;
  } catch (error) {
    console.error('[giftService] Failed to get pending gift count:', error);
    return 0;
  }
}

/**
 * Format a message to accompany a gift.
 * 
 * @param giftType - The type of gift
 * @param senderName - The sender's name
 * @returns A kid-friendly message
 */
export function getDefaultGiftMessage(giftType: GiftType, senderName: string): string {
  const config = GIFT_CONFIGS[giftType];
  
  const messages: Record<GiftType, string> = {
    water_drop: `${senderName} sent you a Water Drop! Your trees will stay healthy longer! 💧`,
    sparkle: `${senderName} sent you a Sparkle! It's glowing with magic! ✨`,
    seed: `${senderName} sent you a Seed! Plant it to grow something new! 🌱`,
    ribbon: `${senderName} sent you a Ribbon! It looks so pretty on your tree! 🎀`,
    golden_flower: `Wow! ${senderName} sent you a Golden Flower! That's super rare! 🌸`,
  };
  
  return messages[giftType];
}