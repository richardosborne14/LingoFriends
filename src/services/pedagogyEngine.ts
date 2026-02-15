/**
 * LingoFriends - Pedagogy Engine Core Service
 * 
 * The central orchestration service that coordinates all pedagogy components:
 * - Difficulty calibration (i+1 targeting)
 * - Chunk selection and SRS scheduling
 * - Affective filter monitoring
 * - Session planning and adaptation
 * 
 * This service is the "brain" of the learning system, making decisions about
 * what content to present and when, based on learner performance and state.
 * 
 * @module pedagogyEngine
 * @see docs/phase-1.2/task-1.2-5-pedagogy-engine-core.md
 * @see docs/phase-1.2/phase-1.2-overview.md for architecture
 */

import type {
  LearnerProfile,
  LexicalChunk,
  UserChunk,
  SessionPlan,
  SessionContext,
  SessionOptions,
  SessionSummary,
  ActivityResult,
  ActivityRecommendation,
  GameActivityType,
  AdaptationAction,
  FilterSignal,
  PerformanceData,
} from '../types/pedagogy';
import {
  calculateFilterScore,
  isFilterRising,
  getAdaptation,
  recordSignal,
  detectSignals,
  calculateUpdatedFilterRisk,
  decayFilterRisk,
  type SessionSignal,
  type AffectiveAdaptationAction,
} from './affectiveFilterMonitor';
import { ChunkStatus, levelToCEFR, ChunkType } from '../types/pedagogy';
import { learnerProfileService } from './learnerProfileService';
import { chunkManager, ChunkStats } from './chunkManager';
import { chunkGenerator } from './chunkGeneratorService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Internal state for tracking session performance.
 */
interface SessionPerformance {
  correct: number;
  total: number;
  totalResponseTimeMs: number;
  helpUsedCount: number;
  wrongStreak: number;
  correctStreak: number;
}

/**
 * Options for the pedagogy engine initialization.
 */
export interface PedagogyEngineOptions {
  /** Default session duration in minutes */
  defaultSessionDuration?: number;
  
  /** Maximum new chunks per session */
  maxNewChunksPerSession?: number;
  
  /** Maximum review chunks per session */
  maxReviewChunksPerSession?: number;
  
  /** Context chunks to include for scaffolding */
  contextChunksCount?: number;
  
  /** Filter risk threshold for adaptation */
  filterRiskThreshold?: number;
  
  /** Wrong streak threshold for difficulty drop */
  wrongStreakThreshold?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default options for the pedagogy engine */
const DEFAULT_OPTIONS: Required<PedagogyEngineOptions> = {
  defaultSessionDuration: 10,
  maxNewChunksPerSession: 5,
  maxReviewChunksPerSession: 10,
  contextChunksCount: 5,
  filterRiskThreshold: 0.6,
  wrongStreakThreshold: 3,
};

/** Recommended activity types in order of difficulty */
const ACTIVITY_ORDER: GameActivityType[] = [
  'multiple_choice',
  'true_false',
  'matching',
  'fill_blank',
  'translate',
];

/** SunDrops earned per correct answer */
const SUNDROPS_PER_CORRECT = 5;

/** Bonus SunDrops for perfect streaks */
const SUNDROPS_STREAK_BONUS = 10;

// ============================================================================
// PEDAGOGY ENGINE SERVICE
// ============================================================================

/**
 * Pedagogy Engine Service
 * 
 * The main orchestration service for the adaptive learning system.
 * Coordinates between:
 * - Learner Profile Service (user data)
 * - Chunk Manager (content selection and SRS)
 * - Chunk Generator (AI content creation)
 * 
 * Philosophy:
 * - Present content at i+1 (slightly above current level)
 * - Monitor affective filter (frustration, disengagement)
 * - Adapt difficulty and content in real-time
 * - Use spaced repetition for long-term retention
 */
export class PedagogyEngineService {
  
  private options: Required<PedagogyEngineOptions>;
  
  constructor(options?: PedagogyEngineOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  // ==========================================================================
  // SESSION PREPARATION
  // ==========================================================================
  
  /**
   * Prepare a learning session for a user.
   * This is the main entry point for starting a lesson.
   * 
   * The method:
   * 1. Loads the learner profile
   * 2. Calculates i+1 target level
   * 3. Gets new chunks at target level
   * 4. Gets review chunks (due/fragile)
   * 5. Gets context chunks (acquired) for scaffolding
   * 6. Returns a session plan
   * 
   * @param userId - User ID
   * @param options - Session options
   * @returns Session plan with chunks and activities
   */
  async prepareSession(
    userId: string,
    options: SessionOptions
  ): Promise<SessionPlan> {
    console.log('[PedagogyEngine] Preparing session for user:', userId);
    
    // Get learner profile
    const profile = await learnerProfileService.getOrCreateProfile(userId);
    
    // Calculate i+1 target level
    const currentLevel = this.calculateCurrentLevel(profile);
    const targetLevel = this.calculateIPlusOne(profile, currentLevel);
    
    console.log(`[PedagogyEngine] Level: current=${currentLevel.toFixed(1)}, i+1=${targetLevel.toFixed(1)}`);
    
    // Determine topic
    const topic = options.topic || await this.selectTopic(profile);
    
    // Get chunks for the session
    const [targetChunks, reviewChunks, contextChunks] = await Promise.all([
      this.getTargetChunks(userId, profile, topic, targetLevel, options),
      this.getReviewChunks(userId, options),
      this.getContextChunks(userId, topic),
    ]);
    
    // Generate session ID (using crypto.randomUUID if available, fallback to timestamp-based)
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine recommended activities
    const recommendedActivities = this.selectActivities(
      targetChunks.length + reviewChunks.length,
      profile.preferredActivityTypes
    );
    
    // Build session plan
    const plan: SessionPlan = {
      sessionId,
      topic,
      targetChunks,
      reviewChunks,
      contextChunks,
      recommendedActivities,
      estimatedDuration: options.duration || this.options.defaultSessionDuration,
      difficulty: targetLevel,
      reasoning: `i+1 targeting level ${targetLevel.toFixed(1)} based on ${profile.chunksAcquired} acquired chunks, ${(profile.averageConfidence * 100).toFixed(0)}% confidence`,
    };
    
    console.log(`[PedagogyEngine] Session prepared: ${targetChunks.length} new, ${reviewChunks.length} review, ${contextChunks.length} context`);
    
    return plan;
  }
  
  /**
   * Select a topic based on learner interests and review needs.
   * Falls back to a default topic if no interests are set.
   */
  private async selectTopic(profile: LearnerProfile): Promise<string> {
    // Check for fragile chunks - prioritize topics with fragile chunks
    // This would require a query, so for now we use interests
    
    // Use explicit interests first, then detected interests
    const interests = [
      ...profile.explicitInterests,
      ...profile.detectedInterests.map(i => i.topic),
    ];
    
    if (interests.length > 0) {
      // Pick a random interest for variety
      return interests[Math.floor(Math.random() * interests.length)];
    }
    
    // Default topic
    return 'everyday-conversations';
  }
  
  /**
   * Get target chunks (new content at i+1 level).
   */
  private async getTargetChunks(
    userId: string,
    profile: LearnerProfile,
    topic: string,
    targetLevel: number,
    options: SessionOptions
  ): Promise<LexicalChunk[]> {
    const maxNew = options.maxNewChunks ?? this.options.maxNewChunksPerSession;
    
    // First, try to get existing chunks at the target level
    let chunks = await chunkManager.getChunksForLevel(
      userId,
      topic,
      targetLevel,
      maxNew
    );
    
    // If not enough chunks, generate new ones
    if (chunks.length < maxNew) {
      try {
        // Convert target level (1-5 scale) to CEFR level (A1-C2)
        // Level 1-2 = A1, 2-3 = A2, 3-4 = B1, 4-5 = B2, 5 = C1
        const cefrLevel = targetLevel <= 2 ? 'A1' : 
                          targetLevel <= 3 ? 'A2' : 
                          targetLevel <= 4 ? 'B1' : 'B2';
        
        const generatedChunks = await chunkGenerator.generateChunks({
          targetLanguage: profile.targetLanguage,
          nativeLanguage: profile.nativeLanguage,
          ageGroup: '11-14', // TODO: Get from profile
          cefrLevel: cefrLevel,
          internalLevel: profile.currentLevel,
          difficulty: Math.round(targetLevel),
          topic,
          interests: profile.explicitInterests,
          count: maxNew - chunks.length,
          chunkTypes: [ChunkType.POLYWORD, ChunkType.COLLOCATION, ChunkType.UTTERANCE, ChunkType.FRAME], // Include all chunk types
        });
        
        chunks = [...chunks, ...generatedChunks.chunks];
      } catch (error) {
        console.warn('[PedagogyEngine] Could not generate chunks:', error);
      }
    }
    
    return chunks.slice(0, maxNew);
  }
  
  /**
   * Get review chunks (due for SRS or fragile).
   */
  private async getReviewChunks(
    userId: string,
    options: SessionOptions
  ): Promise<LexicalChunk[]> {
    if (options.includeReviews === false) {
      return [];
    }
    
    const maxReview = this.options.maxReviewChunksPerSession;
    
    // Get chunks due for review
    const dueChunks = await chunkManager.getDueChunks(userId, Math.ceil(maxReview / 2));
    
    // Get fragile chunks
    const fragileChunks = await chunkManager.getFragileChunks(userId, Math.ceil(maxReview / 2));
    
    // Combine, filtering out duplicates
    const seen = new Set<string>();
    const reviewChunks: LexicalChunk[] = [];
    
    for (const uc of [...dueChunks, ...fragileChunks]) {
      if (!seen.has(uc.chunkId)) {
        seen.add(uc.chunkId);
        // We need to get the actual LexicalChunk
        const chunk = await chunkManager.getChunk(uc.chunkId);
        if (chunk) {
          reviewChunks.push(chunk);
        }
      }
    }
    
    return reviewChunks.slice(0, maxReview);
  }
  
  /**
   * Get context chunks (already acquired) for scaffolding.
   */
  private async getContextChunks(
    userId: string,
    topic: string | undefined
  ): Promise<LexicalChunk[]> {
    return chunkManager.getContextChunks(
      userId,
      topic,
      this.options.contextChunksCount
    );
  }
  
  // ==========================================================================
  // DIFFICULTY CALIBRATION
  // ==========================================================================
  
  /**
   * Calculate the learner's current level (on 1-5 scale).
   * Based on acquired chunks and confidence.
   */
  private calculateCurrentLevel(profile: LearnerProfile): number {
    // Base level from acquired chunks
    const chunkLevel = this.mapChunksToLevel(profile.chunksAcquired);
    
    // Adjust for confidence (can boost or reduce)
    const confidenceAdj = (profile.averageConfidence - 0.5) * 0.5;
    
    // Adjust for filter risk (reduce if stressed)
    const filterAdj = -profile.filterRiskScore * 0.3;
    
    return Math.max(1, Math.min(5, chunkLevel + confidenceAdj + filterAdj));
  }
  
  /**
   * Calculate i+1 target level.
   * This is slightly above the learner's current level.
   */
  private calculateIPlusOne(profile: LearnerProfile, currentLevel: number): number {
    // i+1 is one level above current
    let targetLevel = currentLevel + 1;
    
    // But if filter risk is high, drop back to current level (i, not i+1)
    if (profile.filterRiskScore > this.options.filterRiskThreshold) {
      targetLevel = currentLevel;
    }
    
    // Clamp to valid range
    return Math.max(1, Math.min(5, targetLevel));
  }
  
  /**
   * Map acquired chunk count to level (1-5 scale).
   */
  private mapChunksToLevel(acquiredCount: number): number {
    if (acquiredCount < 50) return 1;       // A1
    if (acquiredCount < 150) return 1.5;    // A1 high
    if (acquiredCount < 300) return 2;      // A2
    if (acquiredCount < 500) return 2.5;    // A2 high
    if (acquiredCount < 800) return 3;      // B1
    if (acquiredCount < 1200) return 3.5;   // B1 high
    if (acquiredCount < 1700) return 4;     // B2
    if (acquiredCount < 2300) return 4.5;   // B2 high
    return 5;                                // C1+
  }
  
  /**
   * Adapt difficulty based on recent performance.
   * Called after each activity to potentially adjust i+1.
   */
  adaptDifficulty(
    currentTarget: number,
    performance: PerformanceData
  ): number {
    const accuracy = performance.correct / Math.max(1, performance.total);
    const helpRate = performance.helpUsedCount / Math.max(1, performance.total);
    
    // High accuracy with low help = increase difficulty
    if (accuracy >= 0.9 && helpRate < 0.1) {
      return Math.min(5, currentTarget + 0.2);
    }
    
    // Low accuracy or high help = decrease difficulty
    if (accuracy < 0.6 || helpRate > 0.3) {
      return Math.max(1, currentTarget - 0.3);
    }
    
    // Strong performance = slight increase
    if (accuracy >= 0.8 && helpRate < 0.2) {
      return Math.min(5, currentTarget + 0.1);
    }
    
    // Maintain current level
    return currentTarget;
  }
  
  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  
  /**
   * Create a new session context.
   */
  createSessionContext(
    sessionId: string,
    userId: string,
    topic: string,
    targetLevel: number
  ): SessionContext {
    return {
      sessionId,
      userId,
      topic,
      startedAt: new Date().toISOString(),
      activities: [],
      currentTargetLevel: targetLevel,
      baseTargetLevel: targetLevel,
      newChunkIds: [],
      reviewChunkIds: [],
      filterSignals: [],
      adaptations: [],
      isComplete: false,
    };
  }
  
  /**
   * Report activity completion.
   * Updates learner model and triggers adaptations.
   */
  async reportActivityCompletion(
    userId: string,
    activity: ActivityResult,
    context: SessionContext
  ): Promise<{
    context: SessionContext;
    adaptation: AdaptationAction;
  }> {
    // Record filter signals
    const signals: FilterSignal[] = [];
    
    if (!activity.correct) {
      signals.push({
        type: 'wrong_answer',
        timestamp: activity.timestamp,
        activityId: activity.id,
      });
    }
    
    if (activity.usedHelp) {
      signals.push({
        type: 'help_used',
        timestamp: activity.timestamp,
        activityId: activity.id,
      });
    }
    
    // Calculate average response time for comparison
    const avgResponseTime = context.activities.length > 0
      ? context.activities.reduce((sum, a) => sum + a.responseTimeMs, 0) / context.activities.length
      : activity.responseTimeMs;
    
    if (activity.responseTimeMs > avgResponseTime * 2) {
      signals.push({
        type: 'slow_response',
        timestamp: activity.timestamp,
        activityId: activity.id,
        data: { responseTime: activity.responseTimeMs, average: avgResponseTime },
      });
    }
    
    // Update context
    const updatedContext: SessionContext = {
      ...context,
      activities: [...context.activities, activity],
      filterSignals: [...context.filterSignals, ...signals],
    };
    
    // Record encounters for each chunk
    for (const chunkId of activity.chunkIds) {
      await chunkManager.recordEncounter(userId, chunkId, {
        correct: activity.correct,
        timeToAnswerMs: activity.responseTimeMs,
        usedHelp: activity.usedHelp,
      });
    }
    
    // Update confidence
    await learnerProfileService.updateConfidence(
      userId,
      activity.correct,
      activity.usedHelp
    );
    
    // Calculate adaptation
    const adaptation = this.calculateAdaptation(updatedContext);
    
    // Apply adaptation to context
    if (adaptation.type === 'simplify') {
      updatedContext.currentTargetLevel = adaptation.dropToLevel;
      updatedContext.adaptations.push(adaptation);
    } else if (adaptation.type === 'challenge') {
      updatedContext.currentTargetLevel = adaptation.increaseToLevel;
      updatedContext.adaptations.push(adaptation);
    } else if (adaptation.type !== 'none') {
      updatedContext.adaptations.push(adaptation);
    }
    
    // Record struggle if needed
    if (!activity.correct && !activity.usedHelp) {
      // Check for struggle pattern
      const wrongStreak = this.getWrongStreak(updatedContext);
      if (wrongStreak >= this.options.wrongStreakThreshold) {
        await learnerProfileService.recordStruggle(userId);
      }
    }
    
    return { context: updatedContext, adaptation };
  }
  
  /**
   * Get next activity recommendation.
   * Called after each activity to decide what to do next.
   */
  async getNextActivity(
    userId: string,
    context: SessionContext,
    plan: SessionPlan
  ): Promise<ActivityRecommendation> {
    // Get current performance
    const performance = this.calculatePerformance(context);
    const activityCount = context.activities.length;
    
    // Determine if we should focus on new chunks or reviews
    const newChunksCompleted = context.newChunkIds.length;
    const reviewChunksCompleted = context.reviewChunkIds.length;
    
    // Decide chunk type to focus on
    let isReview = false;
    let chunks: LexicalChunk[] = [];
    let reason = '';
    
    // Prioritize reviews if struggling
    if (performance.wrongStreak >= 2 && plan.reviewChunks.length > 0) {
      isReview = true;
      chunks = plan.reviewChunks.filter(c => 
        !context.reviewChunkIds.includes(c.id)
      ).slice(0, 2);
      reason = 'Reviewing to build confidence after some mistakes.';
    }
    // Alternate between new and review
    else if (activityCount % 3 === 0 && plan.reviewChunks.length > 0) {
      isReview = true;
      chunks = plan.reviewChunks.filter(c => 
        !context.reviewChunkIds.includes(c.id)
      ).slice(0, 2);
      reason = 'Scheduled review to reinforce learning.';
    }
    // Focus on new chunks
    else if (newChunksCompleted < plan.targetChunks.length) {
      chunks = plan.targetChunks.filter(c => 
        !context.newChunkIds.includes(c.id)
      ).slice(0, 2);
      reason = 'Introducing new content at your level.';
    }
    // Fall back to reviews
    else if (reviewChunksCompleted < plan.reviewChunks.length) {
      isReview = true;
      chunks = plan.reviewChunks.filter(c => 
        !context.reviewChunkIds.includes(c.id)
      ).slice(0, 2);
      reason = 'Reinforcing previous learning.';
    }
    
    // Determine activity type
    const activityType = this.selectNextActivityType(
      context,
      isReview,
      performance
    );
    
    // Get adaptation if any
    const recentAdaptation = context.adaptations[context.adaptations.length - 1];
    
    return {
      activityType,
      chunks,
      reason,
      difficulty: context.currentTargetLevel,
      adaptation: recentAdaptation?.type !== 'none' ? recentAdaptation : undefined,
      isReview,
    };
  }
  
  /**
   * Check if session should end.
   * Based on duration, fatigue signals, or completion.
   */
  shouldEndSession(
    context: SessionContext,
    options: SessionOptions
  ): { shouldEnd: boolean; reason: string } {
    // Check if all chunks are done
    const totalActivities = context.activities.length;
    
    // Check for session fatigue (10+ activities with high wrong rate)
    if (totalActivities >= 10) {
      const wrongCount = context.activities.filter(a => !a.correct).length;
      const wrongRate = wrongCount / totalActivities;
      
      if (wrongRate > 0.5) {
        return { shouldEnd: true, reason: 'High error rate suggests fatigue. Time for a break.' };
      }
    }
    
    // Check for critical filter state
    const criticalFilter = context.filterSignals.filter(s => s.type === 'wrong_answer').length >= 5;
    if (criticalFilter) {
      return { shouldEnd: true, reason: 'Multiple struggles detected. Better to rest and return fresh.' };
    }
    
    // Check for session time (approximation based on activities)
    const estimatedMinutes = totalActivities * 1.5; // ~1.5 min per activity
    if (estimatedMinutes >= (options.duration || this.options.defaultSessionDuration)) {
      return { shouldEnd: true, reason: 'Good session! Time to wrap up.' };
    }
    
    return { shouldEnd: false, reason: '' };
  }
  
  /**
   * Generate end-of-session summary.
   */
  async generateSessionSummary(
    userId: string,
    context: SessionContext,
    plan: SessionPlan
  ): Promise<SessionSummary> {
    const startTime = new Date(context.startedAt).getTime();
    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    const activities = context.activities;
    const correctFirstTry = activities.filter(a => a.correct && a.attempts === 1).length;
    const totalActivities = activities.length;
    const accuracy = totalActivities > 0 ? correctFirstTry / totalActivities : 0;
    
    // Calculate SunDrops earned
    let sunDropsEarned = correctFirstTry * SUNDROPS_PER_CORRECT;
    
    // Streak bonus
    const streak = this.getMaxCorrectStreak(activities);
    if (streak >= 5) {
      sunDropsEarned += SUNDROPS_STREAK_BONUS;
    }
    
    // Get updated profile for filter risk
    const profile = await learnerProfileService.getProfile(userId);
    const filterRiskScore = profile?.filterRiskScore ?? 0;
    
    // Update profile stats
    if (profile) {
      await learnerProfileService.updateProfile(userId, {
        totalSessions: profile.totalSessions + 1,
        totalTimeMinutes: profile.totalTimeMinutes + durationMinutes,
      });
      await learnerProfileService.updateChunkStats(userId);
    }
    
    // Determine confidence change
    const confidenceStart = profile?.confidenceHistory.length 
      ? profile.confidenceHistory[profile.confidenceHistory.length - 1]?.value ?? 0.5
      : 0.5;
    const confidenceEnd = profile?.averageConfidence ?? 0.5;
    const confidenceChange = confidenceEnd - confidenceStart;
    
    // Identify struggling and mastered chunks
    const chunkResults = new Map<string, { correct: number; total: number }>();
    for (const activity of activities) {
      for (const chunkId of activity.chunkIds) {
        const current = chunkResults.get(chunkId) || { correct: 0, total: 0 };
        current.total++;
        if (activity.correct) current.correct++;
        chunkResults.set(chunkId, current);
      }
    }
    
    const strugglingChunks: string[] = [];
    const masteredChunks: string[] = [];
    
    chunkResults.forEach((result, chunkId) => {
      if (result.correct / result.total < 0.5) {
        strugglingChunks.push(chunkId);
      } else if (result.correct === result.total && result.total >= 2) {
        masteredChunks.push(chunkId);
      }
    });
    
    // Generate tips
    const tips = this.generateSessionTips(accuracy, durationMinutes, strugglingChunks.length);
    
    return {
      sessionId: context.sessionId,
      durationMinutes,
      activitiesCompleted: totalActivities,
      correctFirstTry,
      accuracy,
      newChunksLearned: context.newChunkIds.length,
      chunksAcquired: masteredChunks.length,
      chunksReviewed: context.reviewChunkIds.length,
      sunDropsEarned,
      confidenceChange,
      filterRiskScore,
      tips,
      strugglingChunks,
      masteredChunks,
    };
  }
  
  // ==========================================================================
  // ADAPTATION
  // ==========================================================================
  
  /**
   * Calculate adaptation based on session context.
   */
  private calculateAdaptation(context: SessionContext): AdaptationAction {
    const signals = context.filterSignals;
    const recentSignals = signals.slice(-10);
    
    // Count recent signals
    const wrongCount = recentSignals.filter(s => s.type === 'wrong_answer').length;
    const helpCount = recentSignals.filter(s => s.type === 'help_used').length;
    const slowCount = recentSignals.filter(s => s.type === 'slow_response').length;
    
    // Calculate filter score
    let filterScore = 0;
    filterScore += Math.min(0.3, wrongCount * 0.06);
    filterScore += Math.min(0.2, helpCount * 0.05);
    filterScore += Math.min(0.15, slowCount * 0.05);
    
    // Critical: too many wrong answers
    if (wrongCount >= 3) {
      return {
        type: 'simplify',
        message: "Let's try something a bit easier. You've got this!",
        dropToLevel: Math.max(1, context.baseTargetLevel - 0.5),
      };
    }
    
    // Warning: high help use + wrong answers
    if (helpCount >= 2 && wrongCount >= 2) {
      return {
        type: 'encourage',
        message: "Learning takes time! Take a breath and try again.",
      };
    }
    
    // Struggling: slow responses + wrong answers
    if (slowCount >= 2 && wrongCount >= 2) {
      return {
        type: 'encourage',
        message: "No rush! Take your time to think through it.",
      };
    }
    
    // Success: on a streak
    const activities = context.activities;
    const recentActivities = activities.slice(-5);
    if (recentActivities.length >= 5 && recentActivities.every(a => a.correct)) {
      return {
        type: 'challenge',
        message: "You're on a roll! Ready for something more challenging?",
        increaseToLevel: Math.min(5, context.baseTargetLevel + 0.5),
      };
    }
    
    // No adaptation needed
    return { type: 'none' };
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  /**
   * Select activity types for a session.
   */
  private selectActivities(
    totalChunks: number,
    preferredTypes?: string[]
  ): GameActivityType[] {
    // Use preferred types if available
    if (preferredTypes && preferredTypes.length > 0) {
      return preferredTypes.slice(0, 4) as GameActivityType[];
    }
    
    // Otherwise, select based on chunk count
    const activityCount = Math.min(4, totalChunks);
    return ACTIVITY_ORDER.slice(0, activityCount);
  }
  
  /**
   * Select the next activity type based on context.
   */
  private selectNextActivityType(
    context: SessionContext,
    isReview: boolean,
    performance: SessionPerformance
  ): GameActivityType {
    // For reviews, prefer simpler activities
    if (isReview) {
      return 'multiple_choice';
    }
    
    // If struggling, use easier activities
    if (performance.wrongStreak >= 2) {
      return 'true_false';
    }
    
    // Rotate through activities
    const activityIndex = context.activities.length % ACTIVITY_ORDER.length;
    return ACTIVITY_ORDER[activityIndex];
  }
  
  /**
   * Calculate performance from session context.
   */
  private calculatePerformance(context: SessionContext): SessionPerformance {
    const activities = context.activities;
    
    let wrongStreak = 0;
    let correctStreak = 0;
    let currentWrongStreak = 0;
    let currentCorrectStreak = 0;
    
    for (const activity of activities) {
      if (!activity.correct) {
        currentWrongStreak++;
        currentCorrectStreak = 0;
        wrongStreak = Math.max(wrongStreak, currentWrongStreak);
      } else {
        currentCorrectStreak++;
        currentWrongStreak = 0;
        correctStreak = Math.max(correctStreak, currentCorrectStreak);
      }
    }
    
    return {
      correct: activities.filter(a => a.correct).length,
      total: activities.length,
      totalResponseTimeMs: activities.reduce((sum, a) => sum + a.responseTimeMs, 0),
      helpUsedCount: activities.filter(a => a.usedHelp).length,
      wrongStreak,
      correctStreak,
    };
  }
  
  /**
   * Get current wrong answer streak.
   */
  private getWrongStreak(context: SessionContext): number {
    let streak = 0;
    for (let i = context.activities.length - 1; i >= 0; i--) {
      if (!context.activities[i].correct) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
  
  /**
   * Get maximum correct answer streak.
   */
  private getMaxCorrectStreak(activities: ActivityResult[]): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const activity of activities) {
      if (activity.correct) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }
  
  /**
   * Generate tips for session summary.
   */
  private generateSessionTips(
    accuracy: number,
    duration: number,
    strugglingCount: number
  ): string[] {
    const tips: string[] = [];
    
    if (accuracy >= 0.9) {
      tips.push("Excellent work! You're really getting the hang of this.");
    } else if (accuracy >= 0.7) {
      tips.push("Good progress! Keep practicing to solidify what you learned.");
    } else if (accuracy >= 0.5) {
      tips.push("You're learning! Reviewing these chunks again will help them stick.");
    } else {
      tips.push("This topic is challenging. Don't give up - practice makes progress!");
    }
    
    if (duration < 5) {
      tips.push("A bit longer next time will help reinforce your learning.");
    } else if (duration > 20) {
      tips.push("Great dedication! Remember, shorter sessions more often can be more effective.");
    }
    
    if (strugglingCount > 2) {
      tips.push(`Focus on the ${strugglingCount} chunks that were tricky - they'll click with practice.`);
    }
    
    return tips;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of the Pedagogy Engine */
export const pedagogyEngine = new PedagogyEngineService();

export default pedagogyEngine;