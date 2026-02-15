/**
 * useSunDrops Hook
 * 
 * Manages Sun Drop currency state and operations.
 * Handles earning, spending, and daily cap enforcement.
 * 
 * Features:
 * - Real-time balance tracking
 * - Daily cap management (50 Sun Drops max/day)
 * - Activity reward calculations
 * - Synchronization with backend
 * 
 * @module useSunDrops
 * @see docs/phase-1.1/GAME_DESIGN.md Section 3 for Sun Drop economy
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  calculateEarned, 
  isDailyCapReached, 
  remainingDailyAllowance,
  getDailyCap,
  calculateStars,
  calculateTreeGrowth,
} from '../services/sunDropService';
import { pb, getCurrentUserId } from '../../services/pocketbaseService';

// ============================================
// TYPES
// ============================================

/**
 * Return type for useSunDrops hook
 */
export interface UseSunDropsReturn {
  // State
  /** Current Sun Drop balance */
  balance: number;
  /** Sun Drops earned today */
  dailyEarned: number;
  /** Maximum Sun Drops per day */
  dailyCap: number;
  /** Remaining Sun Drops that can be earned today */
  remainingAllowance: number;
  /** Whether daily cap has been reached */
  isCapReached: boolean;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;

  // Actions
  /** Earn Sun Drops (respects daily cap) */
  earnSunDrops: (amount: number) => Promise<SunDropEarningResult>;
  /** Record activity earnings with modifiers */
  recordActivityEarnings: (options: ActivityEarningsOptions) => Promise<SunDropEarningResult>;
  /** Check and update daily cap status */
  checkDailyCap: () => Promise<void>;
  /** Reset error state */
  clearError: () => void;
  /** Refresh balance from server */
  refresh: () => Promise<void>;

  // Calculations
  /** Calculate reward for an activity */
  calculateActivityReward: (base: number, isRetry: boolean, usedHelp: boolean, wrongAttempts: number) => number;
  /** Calculate stars from Sun Drops earned vs max */
  calculateStarsFromDrops: (earned: number, max: number) => number;
  /** Calculate tree growth fraction */
  calculateGrowth: (earned: number, max: number) => number;
}

/**
 * Result of earning Sun Drops
 */
export interface SunDropEarningResult {
  /** Amount actually earned (may be less due to cap) */
  earned: number;
  /** New balance */
  newBalance: number;
  /** Whether daily cap was hit */
  capped: boolean;
  /** Sun Drops earned today after this action */
  dailyEarned: number;
}

/**
 * Options for recording activity earnings
 */
export interface ActivityEarningsOptions {
  /** Base Sun Drop value for the activity */
  baseValue: number;
  /** Whether this was a retry attempt */
  isRetry: boolean;
  /** Whether help button was used */
  usedHelp: boolean;
  /** Number of wrong answers before correct */
  wrongAttempts: number;
}

/**
 * Daily progress record from Pocketbase
 */
interface DailyProgressRecord {
  id: string;
  user: string;
  date: string;
  sunDropsEarned: number;
  lessonsCompleted: number;
  created: string;
  updated: string;
}

/**
 * Profile record from Pocketbase (partial)
 */
interface ProfileRecord {
  id: string;
  user: string;
  sunDrops: number;
  [key: string]: unknown;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing Sun Drop currency
 * 
 * @example
 * const {
 *   balance,
 *   dailyEarned,
 *   earnSunDrops,
 *   calculateActivityReward,
 * } = useSunDrops();
 * 
 * // Calculate and earn Sun Drops from activity
 * const earned = calculateActivityReward(3, false, true, 1);
 * await earnSunDrops(earned);
 */
export function useSunDrops(): UseSunDropsReturn {
  // State for Sun Drop balance
  const [balance, setBalance] = useState<number>(0);
  // State for today's earnings
  const [dailyEarned, setDailyEarned] = useState<number>(0);
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Daily cap constant
  const dailyCap = getDailyCap(); // 50

  // ==========================================
  // Initialize state on mount
  // ==========================================
  
  useEffect(() => {
    loadSunDropState();
  }, []);

  /**
   * Load Sun Drop balance and daily progress from Pocketbase
   */
  const loadSunDropState = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get profile for balance
      const profileRecords = await pb.collection('profiles').getList<ProfileRecord>(1, 1, {
        filter: `user = "${userId}"`,
      });

      if (profileRecords.items.length > 0) {
        // Use type assertion to handle sunDrops field that may not be in type
        const profile = profileRecords.items[0] as ProfileRecord & { sunDrops?: number };
        setBalance(profile.sunDrops ?? 0);
      }

      // Get daily progress for today
      const today = new Date().toISOString().split('T')[0];
      const progressRecords = await pb.collection('daily_progress').getList<DailyProgressRecord>(1, 1, {
        filter: `user = "${userId}" && date = "${today}"`,
      });

      if (progressRecords.items.length > 0) {
        setDailyEarned(progressRecords.items[0].sunDropsEarned);
      } else {
        // No progress for today yet
        setDailyEarned(0);
      }
    } catch (err) {
      console.error('[useSunDrops] Failed to load state:', err);
      setError('Failed to load Sun Drops');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Actions
  // ==========================================

  /**
   * Earn Sun Drops with daily cap enforcement
   * 
   * @param amount - Amount to earn
   * @returns Earning result with capped amount
   */
  const earnSunDrops = useCallback(async (amount: number): Promise<SunDropEarningResult> => {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Calculate remaining allowance
    const remaining = remainingDailyAllowance(dailyEarned);
    
    // Cap the earned amount
    const actualEarned = Math.min(amount, remaining);
    
    // If already at cap, return early
    if (actualEarned <= 0) {
      return {
        earned: 0,
        newBalance: balance,
        capped: true,
        dailyEarned,
      };
    }

    try {
      setError(null);

      // Update profile balance
      const profileRecords = await pb.collection('profiles').getList<ProfileRecord>(1, 1, {
        filter: `user = "${userId}"`,
      });

      if (profileRecords.items.length === 0) {
        throw new Error('Profile not found');
      }

      const profileId = profileRecords.items[0].id;
      const newBalance = balance + actualEarned;

      await pb.collection('profiles').update(profileId, {
        sunDrops: newBalance,
        last_activity: new Date().toISOString(),
      });

      // Update or create daily progress
      const today = new Date().toISOString().split('T')[0];
      const newDailyEarned = dailyEarned + actualEarned;
      
      const progressRecords = await pb.collection('daily_progress').getList<DailyProgressRecord>(1, 1, {
        filter: `user = "${userId}" && date = "${today}"`,
      });

      if (progressRecords.items.length > 0) {
        // Update existing record
        await pb.collection('daily_progress').update(progressRecords.items[0].id, {
          sunDropsEarned: newDailyEarned,
        });
      } else {
        // Create new record for today
        await pb.collection('daily_progress').create({
          user: userId,
          date: today,
          sunDropsEarned: newDailyEarned,
          lessonsCompleted: 0,
        });
      }

      // Update local state
      setBalance(newBalance);
      setDailyEarned(newDailyEarned);

      return {
        earned: actualEarned,
        newBalance,
        capped: actualEarned < amount,
        dailyEarned: newDailyEarned,
      };
    } catch (err) {
      console.error('[useSunDrops] Failed to earn Sun Drops:', err);
      setError('Failed to earn Sun Drops');
      throw err;
    }
  }, [balance, dailyEarned]);

  /**
   * Record earnings from an activity with all modifiers
   * 
   * @param options - Activity earning options
   * @returns Earning result
   */
  const recordActivityEarnings = useCallback(async (options: ActivityEarningsOptions): Promise<SunDropEarningResult> => {
    const { baseValue, isRetry, usedHelp, wrongAttempts } = options;
    
    // Calculate earnings with modifiers
    const earned = calculateActivityReward(baseValue, isRetry, usedHelp, wrongAttempts);
    
    // Earn the Sun Drops
    return earnSunDrops(earned);
  }, [earnSunDrops]);

  /**
   * Check and update daily cap status
   * This is called when the day might have changed
   */
  const checkDailyCap = useCallback(async (): Promise<void> => {
    await loadSunDropState();
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh balance from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadSunDropState();
  }, []);

  // ==========================================
  // Calculations
  // ==========================================

  /**
   * Calculate reward for an activity with modifiers
   * Takes daily cap into account
   */
  const calculateActivityReward = useCallback((
    base: number,
    isRetry: boolean,
    usedHelp: boolean,
    wrongAttempts: number
  ): number => {
    // Calculate raw earnings
    const earned = calculateEarned(base, isRetry, usedHelp, wrongAttempts);
    
    // Account for daily cap
    const remaining = remainingDailyAllowance(dailyEarned);
    
    return Math.min(earned, remaining);
  }, [dailyEarned]);

  /**
   * Calculate star rating from Sun Drops
   */
  const calculateStarsFromDrops = useCallback((earned: number, max: number): number => {
    return calculateStars(earned, max);
  }, []);

  /**
   * Calculate tree growth fraction
   */
  const calculateGrowth = useCallback((earned: number, max: number): number => {
    return calculateTreeGrowth(earned, max);
  }, []);

  // ==========================================
  // Derived state
  // ==========================================

  const remainingAllowance = remainingDailyAllowance(dailyEarned);
  const isCapReached = isDailyCapReached(dailyEarned);

  // ==========================================
  // Return
  // ==========================================

  return {
    // State
    balance,
    dailyEarned,
    dailyCap,
    remainingAllowance,
    isCapReached,
    isLoading,
    error,

    // Actions
    earnSunDrops,
    recordActivityEarnings,
    checkDailyCap,
    clearError,
    refresh,

    // Calculations
    calculateActivityReward,
    calculateStarsFromDrops,
    calculateGrowth,
  };
}

export default useSunDrops;