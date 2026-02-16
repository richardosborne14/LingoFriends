/**
 * Learner Profile Service
 * 
 * Manages learner profiles for the Pedagogy Engine. This service handles:
 * - Profile initialization and retrieval
 * - Session recording and engagement tracking
 * - Interest management (explicit and detected)
 * - Confidence scoring with rolling averages
 * - Affective filter risk assessment
 * - AI-assisted level evaluation
 * 
 * The learner profile is the "brain" of personalization, tracking:
 * - Current level and progress over time
 * - Interest profile (explicit + AI-detected)
 * - Engagement signals and patterns
 * - Affective filter risk indicators
 * 
 * @see docs/phase-1.2/task-1.2-4-learner-profile-service.md
 * @see src/types/pedagogy.ts for type definitions
 */

import { pb } from '../../services/pocketbaseService';
import type {
  LearnerProfile,
  DetectedInterest,
  ProgressSnapshot,
  CEFRSubLevel,
  LevelEvaluationInput,
  LevelEvaluationResult,
} from '../types/pedagogy';
import {
  levelToSubLevel,
  subLevelToLevel,
  getEstimatedLevel,
} from '../types/pedagogy';
import type { LearnerProfileRecord } from '../types/pocketbase';
import { learnerProfileRecordToLearnerProfile } from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data recorded when a learning session completes.
 */
export interface SessionData {
  /** Duration of the session in minutes */
  durationMinutes: number;
  /** Number of chunks encountered during the session */
  chunksEncountered: number;
  /** Activities answered correctly on first try */
  correctFirstTry: number;
  /** Times help button was used */
  helpUsed: number;
}

/**
 * Recent activity result for filter risk calculation.
 */
export interface ActivityResult {
  /** Whether the answer was correct */
  correct: boolean;
  /** Whether help was used */
  usedHelp: boolean;
  /** Response time in seconds */
  responseTime?: number;
}

/**
 * Service interface for learner profile management.
 */
export interface LearnerProfileService {
  initializeProfile(userId: string, options: {
    nativeLanguage: string;
    targetLanguage: string;
    interests: string[];
  }): Promise<LearnerProfile>;
  
  getProfile(userId: string): Promise<LearnerProfile | null>;
  getOrCreateProfile(userId: string, defaults?: Partial<LearnerProfile>): Promise<LearnerProfile>;
  updateProfile(userId: string, updates: Partial<LearnerProfile>): Promise<LearnerProfile>;
  
  recordSession(userId: string, sessionData: SessionData): Promise<void>;
  
  addExplicitInterests(userId: string, interests: string[]): Promise<void>;
  recordDetectedInterest(userId: string, interest: DetectedInterest): Promise<void>;
  getCombinedInterests(userId: string): Promise<string[]>;
  
  updateConfidence(userId: string, correct: boolean, usedHelp: boolean): Promise<void>;
  recordStruggle(userId: string): Promise<void>;
  getFilterRiskScore(userId: string): Promise<number>;
  
  updateChunkStats(userId: string): Promise<void>;
  recalculateLevel(userId: string): Promise<number>;
  
  evaluateLevelWithAI(userId: string): Promise<LevelEvaluationResult>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a default learner profile.
 */
function createDefaultProfile(
  userId: string,
  nativeLanguage: string = 'English',
  targetLanguage: string = 'French',
  interests: string[] = []
): LearnerProfile {
  const now = new Date().toISOString();
  
  return {
    id: '', // Will be set by Pocketbase
    userId,
    nativeLanguage,
    targetLanguage,
    currentLevel: 0, // A1
    levelHistory: [{
      date: now,
      value: 0,
    }],
    totalChunksEncountered: 0,
    chunksAcquired: 0,
    chunksLearning: 0,
    chunksFragile: 0,
    explicitInterests: interests,
    detectedInterests: [],
    averageConfidence: 0.5, // Neutral starting point
    confidenceHistory: [{
      date: now,
      value: 0.5,
    }],
    totalSessions: 0,
    totalTimeMinutes: 0,
    averageSessionLength: 0,
    helpRequestRate: 0,
    wrongAnswerRate: 0,
    preferredActivityTypes: [],
    preferredSessionLength: 10, // Default 10 minutes
    lastReflectionPrompt: '',
    coachingNotes: '',
    filterRiskScore: 0,
    created: now,
    updated: now,
  };
}

/**
 * Update confidence score using a rolling average.
 * New activities have 10% weight.
 * 
 * @param current - Current confidence score (0-1)
 * @param correct - Whether the answer was correct
 * @param usedHelp - Whether help was used
 * @returns Updated confidence score
 */
export function updateConfidenceScore(
  current: number,
  correct: boolean,
  usedHelp: boolean
): number {
  // Weight: more recent activities matter more (10% weight to new activity)
  const weight = 0.1;
  
  // Score for this activity
  let activityScore = correct ? 1.0 : 0.0;
  
  // Correct with help is less confident (partial credit)
  if (correct && usedHelp) {
    activityScore = 0.7;
  }
  
  // Calculate rolling average
  const newScore = current * (1 - weight) + activityScore * weight;
  
  // Clamp to valid range
  return Math.max(0, Math.min(1, newScore));
}

/**
 * Calculate affective filter risk score.
 * Higher score = more likely disengaged or frustrated.
 * 
 * @param profile - Current learner profile
 * @param recentPerformance - Recent activity results (last 10-20)
 * @returns Risk score (0-1)
 */
export function calculateFilterRisk(
  profile: LearnerProfile,
  recentPerformance: ActivityResult[]
): number {
  let risk = 0;
  
  // Base risk from wrong answers in recent performance (max 0.3)
  if (recentPerformance.length > 0) {
    const wrongRate = recentPerformance.filter(p => !p.correct).length / recentPerformance.length;
    risk += wrongRate * 0.3;
  }
  
  // Risk from help usage (max 0.2)
  risk += profile.helpRequestRate * 0.2;
  
  // Risk from low confidence (max 0.2)
  risk += (1 - profile.averageConfidence) * 0.2;
  
  // Risk from recent struggle (max 0.2)
  if (profile.lastStruggleDate) {
    const daysSinceStruggle = daysSince(profile.lastStruggleDate);
    // Decay the struggle impact over 3 days
    if (daysSinceStruggle <= 3) {
      risk += 0.2 * (1 - daysSinceStruggle / 3);
    }
  }
  
  // Cap at 1.0
  return Math.min(1.0, risk);
}

/**
 * Calculate days since a given date.
 */
function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is recent (within specified days).
 */
function isRecent(dateString: string, days: number): boolean {
  return daysSince(dateString) <= days;
}

/**
 * Add a snapshot to history, keeping only the last N entries.
 */
function addSnapshot(
  history: ProgressSnapshot[],
  value: number,
  maxEntries: number = 30
): ProgressSnapshot[] {
  const newSnapshot: ProgressSnapshot = {
    date: new Date().toISOString(),
    value,
  };
  
  const updated = [...history, newSnapshot];
  
  // Keep only the last maxEntries
  if (updated.length > maxEntries) {
    return updated.slice(-maxEntries);
  }
  
  return updated;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Learner Profile Service Implementation
 * 
 * Provides methods for managing learner profiles, including
 * initialization, updates, interest tracking, and level evaluation.
 */
export const learnerProfileService: LearnerProfileService = {
  // === INITIALIZATION ===
  
  /**
   * Create a new learner profile for a user.
   * Called during onboarding after language/interest selection.
   */
  async initializeProfile(
    userId: string,
    options: {
      nativeLanguage: string;
      targetLanguage: string;
      interests: string[];
    }
  ): Promise<LearnerProfile> {
    // Check if profile already exists
    const existing = await this.getProfile(userId);
    if (existing) {
      return existing;
    }
    
    // Create new profile
    const profile = createDefaultProfile(
      userId,
      options.nativeLanguage,
      options.targetLanguage,
      options.interests
    );
    
    try {
      const record = await pb.collection('learner_profiles').create<LearnerProfileRecord>({
        user: userId,
        native_language: options.nativeLanguage,
        target_language: options.targetLanguage,
        current_level: profile.currentLevel,
        level_history: profile.levelHistory,
        total_chunks_encountered: profile.totalChunksEncountered,
        chunks_acquired: profile.chunksAcquired,
        chunks_learning: profile.chunksLearning,
        chunks_fragile: profile.chunksFragile,
        explicit_interests: options.interests,
        detected_interests: [],
        average_confidence: profile.averageConfidence,
        confidence_history: profile.confidenceHistory,
        total_sessions: profile.totalSessions,
        total_time_minutes: profile.totalTimeMinutes,
        average_session_length: profile.averageSessionLength,
        help_request_rate: profile.helpRequestRate,
        wrong_answer_rate: profile.wrongAnswerRate,
        preferred_activity_types: [],
        preferred_session_length: profile.preferredSessionLength,
        last_reflection_prompt: '',
        coaching_notes: '',
        filter_risk_score: profile.filterRiskScore,
      });
      
      return learnerProfileRecordToLearnerProfile(record);
    } catch (error) {
      console.error('[LearnerProfileService] Error creating profile:', error);
      throw new Error('Failed to create learner profile');
    }
  },
  
  /**
   * Get a learner's profile. Returns null if not exists.
   */
  async getProfile(userId: string): Promise<LearnerProfile | null> {
    try {
      const records = await pb.collection('learner_profiles').getList<LearnerProfileRecord>(1, 1, {
        filter: `user = "${userId}"`,
      });
      
      if (records.items.length === 0) {
        return null;
      }
      
      return learnerProfileRecordToLearnerProfile(records.items[0]);
    } catch (error) {
      console.error('[LearnerProfileService] Error fetching profile:', error);
      return null;
    }
  },
  
  /**
   * Get or create a learner's profile.
   */
  async getOrCreateProfile(
    userId: string,
    defaults?: Partial<LearnerProfile>
  ): Promise<LearnerProfile> {
    const existing = await this.getProfile(userId);
    if (existing) {
      return existing;
    }
    
    // Create with defaults
    return this.initializeProfile(userId, {
      nativeLanguage: defaults?.nativeLanguage || 'English',
      targetLanguage: defaults?.targetLanguage || 'French',
      interests: defaults?.explicitInterests || [],
    });
  },
  
  /**
   * Update a learner's profile.
   */
  async updateProfile(userId: string, updates: Partial<LearnerProfile>): Promise<LearnerProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    // Map to Pocketbase fields
    const pbUpdates: Partial<LearnerProfileRecord> = {};
    
    if (updates.currentLevel !== undefined) pbUpdates.current_level = updates.currentLevel;
    if (updates.levelHistory !== undefined) pbUpdates.level_history = updates.levelHistory;
    if (updates.totalChunksEncountered !== undefined) pbUpdates.total_chunks_encountered = updates.totalChunksEncountered;
    if (updates.chunksAcquired !== undefined) pbUpdates.chunks_acquired = updates.chunksAcquired;
    if (updates.chunksLearning !== undefined) pbUpdates.chunks_learning = updates.chunksLearning;
    if (updates.chunksFragile !== undefined) pbUpdates.chunks_fragile = updates.chunksFragile;
    if (updates.explicitInterests !== undefined) pbUpdates.explicit_interests = updates.explicitInterests;
    if (updates.detectedInterests !== undefined) pbUpdates.detected_interests = updates.detectedInterests;
    if (updates.averageConfidence !== undefined) pbUpdates.average_confidence = updates.averageConfidence;
    if (updates.confidenceHistory !== undefined) pbUpdates.confidence_history = updates.confidenceHistory;
    if (updates.totalSessions !== undefined) pbUpdates.total_sessions = updates.totalSessions;
    if (updates.totalTimeMinutes !== undefined) pbUpdates.total_time_minutes = updates.totalTimeMinutes;
    if (updates.averageSessionLength !== undefined) pbUpdates.average_session_length = updates.averageSessionLength;
    if (updates.helpRequestRate !== undefined) pbUpdates.help_request_rate = updates.helpRequestRate;
    if (updates.wrongAnswerRate !== undefined) pbUpdates.wrong_answer_rate = updates.wrongAnswerRate;
    if (updates.preferredActivityTypes !== undefined) pbUpdates.preferred_activity_types = updates.preferredActivityTypes;
    if (updates.preferredSessionLength !== undefined) pbUpdates.preferred_session_length = updates.preferredSessionLength;
    if (updates.lastReflectionPrompt !== undefined) pbUpdates.last_reflection_prompt = updates.lastReflectionPrompt;
    if (updates.coachingNotes !== undefined) pbUpdates.coaching_notes = updates.coachingNotes;
    if (updates.filterRiskScore !== undefined) pbUpdates.filter_risk_score = updates.filterRiskScore;
    if (updates.lastStruggleDate !== undefined) pbUpdates.last_struggle_date = updates.lastStruggleDate;
    
    // Always update the 'updated' timestamp
    pbUpdates.updated = new Date().toISOString();
    
    try {
      const record = await pb.collection('learner_profiles').update<LearnerProfileRecord>(
        profile.id,
        pbUpdates
      );
      
      return learnerProfileRecordToLearnerProfile(record);
    } catch (error) {
      console.error('[LearnerProfileService] Error updating profile:', error);
      throw new Error('Failed to update learner profile');
    }
  },
  
  // === SESSION RECORDING ===
  
  /**
   * Record a completed session.
   * Updates session counts, time, and engagement metrics.
   */
  async recordSession(userId: string, sessionData: SessionData): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      console.warn('[LearnerProfileService] Cannot record session: profile not found');
      return;
    }
    
    const {
      durationMinutes,
      chunksEncountered,
      correctFirstTry,
      helpUsed,
    } = sessionData;
    
    // Calculate new averages
    const totalSessions = profile.totalSessions + 1;
    const totalTimeMinutes = profile.totalTimeMinutes + durationMinutes;
    const averageSessionLength = totalTimeMinutes / totalSessions;
    
    // Calculate activity stats
    const totalActivities = profile.totalChunksEncountered + chunksEncountered;
    const newCorrectFirstTry = profile.chunksAcquired + correctFirstTry; // Approximate
    
    // Update rates (simplified - could be more sophisticated with tracking per-session)
    // For now, use a rolling estimate
    const sessionWrongRate = chunksEncountered > 0 
      ? (chunksEncountered - correctFirstTry) / chunksEncountered 
      : 0;
    const sessionHelpRate = chunksEncountered > 0 
      ? helpUsed / chunksEncountered 
      : 0;
    
    // Rolling average with 10% weight for new data
    const wrongAnswerRate = profile.wrongAnswerRate * 0.9 + sessionWrongRate * 0.1;
    const helpRequestRate = profile.helpRequestRate * 0.9 + sessionHelpRate * 0.1;
    
    await this.updateProfile(userId, {
      totalSessions,
      totalTimeMinutes,
      averageSessionLength,
      totalChunksEncountered: totalActivities,
      wrongAnswerRate,
      helpRequestRate,
    });
  },
  
  // === INTERESTS ===
  
  /**
   * Add explicit interests (from onboarding or settings).
   */
  async addExplicitInterests(userId: string, interests: string[]): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      console.warn('[LearnerProfileService] Cannot add interests: profile not found');
      return;
    }
    
    // Merge with existing, deduplicate
    const merged = Array.from(new Set([...profile.explicitInterests, ...interests]));
    
    await this.updateProfile(userId, {
      explicitInterests: merged,
    });
  },
  
  /**
   * Record a detected interest (from AI observation).
   */
  async recordDetectedInterest(userId: string, interest: DetectedInterest): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      console.warn('[LearnerProfileService] Cannot record interest: profile not found');
      return;
    }
    
    const existing = profile.detectedInterests;
    
    // Check if this topic already exists
    const existingIndex = existing.findIndex(i => i.topic === interest.topic);
    
    let updated: DetectedInterest[];
    if (existingIndex >= 0) {
      // Update existing, taking the higher strength
      const current = existing[existingIndex];
      updated = [...existing];
      updated[existingIndex] = {
        topic: interest.topic,
        strength: Math.max(current.strength, interest.strength),
        detectedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      updated = [...existing, interest];
    }
    
    // Sort by strength (highest first)
    updated.sort((a, b) => b.strength - a.strength);
    
    // Keep only top 20 interests
    if (updated.length > 20) {
      updated = updated.slice(0, 20);
    }
    
    await this.updateProfile(userId, {
      detectedInterests: updated,
    });
  },
  
  /**
   * Get combined interests (explicit + detected).
   */
  async getCombinedInterests(userId: string): Promise<string[]> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return [];
    }
    
    // Start with explicit interests
    const combined = new Set(profile.explicitInterests);
    
    // Add detected interests with strength >= 0.5
    for (const detected of profile.detectedInterests) {
      if (detected.strength >= 0.5) {
        combined.add(detected.topic);
      }
    }
    
    return Array.from(combined) as string[];
  },
  
  // === CONFIDENCE ===
  
  /**
   * Update confidence score based on activity performance.
   * Uses rolling average with 10% weight to new activity.
   */
  async updateConfidence(
    userId: string,
    correct: boolean,
    usedHelp: boolean
  ): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      console.warn('[LearnerProfileService] Cannot update confidence: profile not found');
      return;
    }
    
    const newConfidence = updateConfidenceScore(
      profile.averageConfidence,
      correct,
      usedHelp
    );
    
    const newHistory = addSnapshot(profile.confidenceHistory, newConfidence);
    
    await this.updateProfile(userId, {
      averageConfidence: newConfidence,
      confidenceHistory: newHistory,
    });
  },
  
  /**
   * Record a struggle event (for affective filter monitoring).
   */
  async recordStruggle(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      console.warn('[LearnerProfileService] Cannot record struggle: profile not found');
      return;
    }
    
    // Update filter risk score
    const newRisk = Math.min(1.0, profile.filterRiskScore + 0.15);
    
    await this.updateProfile(userId, {
      filterRiskScore: newRisk,
      lastStruggleDate: new Date().toISOString(),
    });
  },
  
  /**
   * Get the current affective filter risk score.
   */
  async getFilterRiskScore(userId: string): Promise<number> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return 0;
    }
    
    return profile.filterRiskScore;
  },
  
  // === STATISTICS ===
  
  /**
   * Update chunk statistics (called when user_chunks change).
   * Queries user_chunks table and updates profile counts.
   */
  async updateChunkStats(userId: string): Promise<void> {
    try {
      // Query user_chunks for counts by status
      const [acquired, learning, fragile, total] = await Promise.all([
        pb.collection('user_chunks').getList(1, 1, {
          filter: `user = "${userId}" && status = "acquired"`,
        }).then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, {
          filter: `user = "${userId}" && status = "learning"`,
        }).then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, {
          filter: `user = "${userId}" && status = "fragile"`,
        }).then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, {
          filter: `user = "${userId}"`,
        }).then(r => r.totalItems),
      ]);
      
      await this.updateProfile(userId, {
        chunksAcquired: acquired,
        chunksLearning: learning,
        chunksFragile: fragile,
        totalChunksEncountered: total,
      });
    } catch (error) {
      console.error('[LearnerProfileService] Error updating chunk stats:', error);
    }
  },
  
  /**
   * Recalculate level based on acquired chunks.
   * This is a rough estimate - AI evaluation is authoritative.
   */
  async recalculateLevel(userId: string): Promise<number> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return 0;
    }
    
    // Get a rough level estimate from chunks
    const estimatedLevel = getEstimatedLevel(profile.chunksAcquired);
    
    // Update level history if changed significantly (5+ points)
    if (Math.abs(estimatedLevel - profile.currentLevel) >= 5) {
      const newHistory = addSnapshot(profile.levelHistory, estimatedLevel);
      
      await this.updateProfile(userId, {
        currentLevel: estimatedLevel,
        levelHistory: newHistory,
      });
    }
    
    return estimatedLevel;
  },
  
  // === AI LEVEL EVALUATION ===
  
  /**
   * Evaluate level using AI.
   * Called periodically or on-demand for accurate level assessment.
   */
  async evaluateLevelWithAI(userId: string): Promise<LevelEvaluationResult> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    // Get recent activity data
    // TODO: Wire this up to actual activity storage
    // For now, return a mock evaluation based on chunk stats
    const currentSubLevel = levelToSubLevel(profile.currentLevel);
    
    // Gather data for AI
    const input: LevelEvaluationInput = {
      recentResponses: [], // TODO: Fetch from activity log
      currentLevel: currentSubLevel,
      chunkStats: {
        acquired: profile.chunksAcquired,
        learning: profile.chunksLearning,
        fragile: profile.chunksFragile,
      },
      confidenceTrend: profile.confidenceHistory.slice(-10).map(h => h.value),
    };
    
    // TODO: Call AI service for evaluation
    // For now, return a reasonable default based on performance
    const avgConfidence = profile.averageConfidence;
    const suggestedLevel: CEFRSubLevel = avgConfidence > 0.7 
      ? levelToSubLevel(profile.currentLevel + 5) // Good progress, level up
      : avgConfidence < 0.4
        ? levelToSubLevel(Math.max(0, profile.currentLevel - 5)) // Struggling, level down
        : currentSubLevel; // Stay at current level
    
    const result: LevelEvaluationResult = {
      suggestedLevel,
      strengths: avgConfidence > 0.7 ? ['Vocabulary retention', 'Response accuracy'] : [],
      areas: avgConfidence < 0.5 ? ['Grammar accuracy', 'Speaking fluency'] : [],
      confidence: 0.8, // Confidence in the AI's assessment
      reasoning: `Based on ${profile.chunksAcquired} acquired chunks and ${(avgConfidence * 100).toFixed(0)}% average confidence, suggesting ${suggestedLevel} level.`,
    };
    
    // Update profile if AI confidence is high enough
    if (result.confidence >= 0.7) {
      const newLevel = subLevelToLevel(result.suggestedLevel);
      
      // Only update if significantly different
      if (Math.abs(newLevel - profile.currentLevel) >= 3) {
        const newHistory = addSnapshot(profile.levelHistory, newLevel);
        
        await this.updateProfile(userId, {
          currentLevel: newLevel,
          levelHistory: newHistory,
          coachingNotes: `Strengths: ${result.strengths.join(', ')}. Areas: ${result.areas.join(', ')}`,
        });
      }
    }
    
    return result;
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default learnerProfileService;