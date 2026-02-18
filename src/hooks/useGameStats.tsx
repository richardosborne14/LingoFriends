/**
 * useGameStats Hook
 *
 * Provides real game statistics loaded from Pocketbase (gems, sunDrops, streak).
 * Replaces MOCK_USER_PROGRESS in App.tsx so the header shows real data.
 *
 * Features:
 * - Loads stats on mount
 * - Exposes refreshStats() for callers to trigger after mutations
 *   (e.g., after lesson completion, after tree care purchase)
 * - Subscribes to profile changes for multi-device sync
 * - Falls back gracefully to zeros if PB is unreachable
 *
 * Usage:
 *   const { stats, refreshStats } = useGameStats();
 *   // stats.gems, stats.sunDrops, stats.streak
 *
 * @module useGameStats
 * @see src/services/gameProgressService.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getGameStats, type GameStats } from '../services/gameProgressService';
import { pb, isAuthenticated } from '../../services/pocketbaseService';

// ============================================
// HOOK
// ============================================

export interface UseGameStatsReturn {
  /** Real game stats loaded from PB (gems, sunDrops, streak, seeds) */
  stats: GameStats;
  /** Call after any mutation (lesson complete, shop purchase) to re-read from PB */
  refreshStats: () => Promise<void>;
  /** True while the initial load is in progress */
  isLoading: boolean;
}

/**
 * Hook for real game statistics from Pocketbase.
 *
 * @example
 * const { stats, refreshStats } = useGameStats();
 * return <AppHeader gems={stats.gems} streak={stats.streak} />;
 */
export function useGameStats(): UseGameStatsReturn {
  const [stats, setStats] = useState<GameStats>({
    sunDrops: 0,
    gems: 0,
    seeds: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Track whether we're subscribed to avoid double-subscribe
  const subscribedRef = useRef(false);

  /**
   * Load stats from PB and update state.
   * Non-throwing — on failure stats stay at current values.
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const newStats = await getGameStats();
      setStats(newStats);
    } catch (err) {
      // Non-fatal — header just shows stale data
      console.warn('[useGameStats] Refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount + subscribe to profile changes
  useEffect(() => {
    refreshStats();

    // Real-time subscription: whenever the profile record changes (e.g., another
    // device completes a lesson), refresh stats automatically.
    if (isAuthenticated() && !subscribedRef.current) {
      subscribedRef.current = true;

      pb.collection('profiles').subscribe('*', (_event) => {
        // Re-fetch on any profile change rather than parsing the event payload,
        // since we need specific game fields not always included in the event.
        refreshStats();
      }).catch(err => {
        console.warn('[useGameStats] Subscription failed (non-fatal):', err);
      });
    }

    return () => {
      // Unsubscribe on unmount (only if we subscribed)
      if (subscribedRef.current) {
        pb.collection('profiles').unsubscribe().catch(() => {});
        subscribedRef.current = false;
      }
    };
  }, [refreshStats]);

  return { stats, refreshStats, isLoading };
}
