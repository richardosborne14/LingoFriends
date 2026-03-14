/**
 * useLearnerProfile Hook
 * 
 * React hook for accessing and managing learner profile data.
 * Provides a convenient interface for components to:
 * - Fetch and cache learner profile
 * - Update interests
 * - Record session data
 * - Refresh profile data
 * 
 * @see src/services/learnerProfileService.ts
 * @see docs/phase-1.2/task-1.2-4-learner-profile-service.md
 */

import { useState, useEffect, useCallback } from 'react';
import { learnerProfileService, SessionData } from '../services/learnerProfileService';
import type { LearnerProfile, DetectedInterest, CEFRSubLevel, LevelEvaluationResult } from '../types/pedagogy';
import { levelToSubLevel } from '../types/pedagogy';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Return type for the useLearnerProfile hook.
 */
export interface UseLearnerProfileReturn {
  /** The current learner profile, or null if not loaded */
  profile: LearnerProfile | null;
  
  /** Current level as display string (e.g., "A2+") */
  displayLevel: CEFRSubLevel | null;
  
  /** Whether the profile is currently loading */
  loading: boolean;
  
  /** Any error that occurred during loading */
  error: Error | null;
  
  /** Add explicit interests to the profile */
  updateInterests: (interests: string[]) => Promise<void>;
  
  /** Record a detected interest from AI observation */
  recordInterest: (interest: DetectedInterest) => Promise<void>;
  
  /** Record a completed learning session */
  recordSession: (data: SessionData) => Promise<void>;
  
  /** Update confidence after an activity */
  updateConfidence: (correct: boolean, usedHelp: boolean) => Promise<void>;
  
  /** Record a struggle event */
  recordStruggle: () => Promise<void>;
  
  /** Get the current affective filter risk score */
  getFilterRisk: () => Promise<number>;
  
  /** Evaluate level using AI */
  evaluateLevel: () => Promise<LevelEvaluationResult | null>;
  
  /** Refresh profile data from server */
  refresh: () => Promise<void>;
  
  /** Get combined interests (explicit + detected) */
  getInterests: () => Promise<string[]>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for accessing and managing learner profile data.
 * 
 * @param userId - The user ID to fetch profile for, or null if not authenticated
 * @returns Hook interface for profile management
 * 
 * @example
 * ```tsx
 * function ProfileDisplay({ userId }: { userId: string }) {
 *   const { profile, displayLevel, loading, error } = useLearnerProfile(userId);
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!profile) return <NoProfile />;
 *   
 *   return (
 *     <div>
 *       <h2>Level: {displayLevel}</h2>
 *       <p>_chunks acquired: {profile.chunksAcquired}</p>
 *       <p>Confidence: {(profile.averageConfidence * 100).toFixed(0)}%</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLearnerProfile(userId: string | null): UseLearnerProfileReturn {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch profile on mount or when userId changes
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    learnerProfileService.getOrCreateProfile(userId)
      .then(setProfile)
      .catch((err) => {
        console.error('[useLearnerProfile] Error fetching profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to load profile'));
      })
      .finally(() => setLoading(false));
  }, [userId]);
  
  // Derived values
  const displayLevel = profile ? levelToSubLevel(profile.currentLevel) : null;
  
  // Actions
  
  /**
   * Add explicit interests to the profile.
   */
  const updateInterests = useCallback(async (interests: string[]) => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot update interests: no user');
      return;
    }
    
    try {
      await learnerProfileService.addExplicitInterests(userId, interests);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error updating interests:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Record a detected interest from AI observation.
   */
  const recordInterest = useCallback(async (interest: DetectedInterest) => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot record interest: no user');
      return;
    }
    
    try {
      await learnerProfileService.recordDetectedInterest(userId, interest);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error recording interest:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Record a completed learning session.
   */
  const recordSession = useCallback(async (data: SessionData) => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot record session: no user');
      return;
    }
    
    try {
      await learnerProfileService.recordSession(userId, data);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error recording session:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Update confidence after an activity.
   */
  const updateConfidence = useCallback(async (correct: boolean, usedHelp: boolean) => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot update confidence: no user');
      return;
    }
    
    try {
      await learnerProfileService.updateConfidence(userId, correct, usedHelp);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error updating confidence:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Record a struggle event.
   */
  const recordStruggle = useCallback(async () => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot record struggle: no user');
      return;
    }
    
    try {
      await learnerProfileService.recordStruggle(userId);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error recording struggle:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Get the current affective filter risk score.
   */
  const getFilterRisk = useCallback(async (): Promise<number> => {
    if (!userId) {
      return 0;
    }
    
    try {
      return await learnerProfileService.getFilterRiskScore(userId);
    } catch (err) {
      console.error('[useLearnerProfile] Error getting filter risk:', err);
      return 0;
    }
  }, [userId]);
  
  /**
   * Evaluate level using AI.
   */
  const evaluateLevel = useCallback(async (): Promise<LevelEvaluationResult | null> => {
    if (!userId) {
      console.warn('[useLearnerProfile] Cannot evaluate level: no user');
      return null;
    }
    
    try {
      const result = await learnerProfileService.evaluateLevelWithAI(userId);
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
      return result;
    } catch (err) {
      console.error('[useLearnerProfile] Error evaluating level:', err);
      throw err;
    }
  }, [userId]);
  
  /**
   * Refresh profile data from server.
   */
  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    
    setLoading(true);
    try {
      const updated = await learnerProfileService.getProfile(userId);
      setProfile(updated);
    } catch (err) {
      console.error('[useLearnerProfile] Error refreshing profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh profile'));
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  /**
   * Get combined interests (explicit + detected).
   */
  const getInterests = useCallback(async (): Promise<string[]> => {
    if (!userId) {
      return [];
    }
    
    try {
      return await learnerProfileService.getCombinedInterests(userId);
    } catch (err) {
      console.error('[useLearnerProfile] Error getting interests:', err);
      return [];
    }
  }, [userId]);
  
  return {
    profile,
    displayLevel,
    loading,
    error,
    updateInterests,
    recordInterest,
    recordSession,
    updateConfidence,
    recordStruggle,
    getFilterRisk,
    evaluateLevel,
    refresh,
    getInterests,
  };
}

export default useLearnerProfile;