/**
 * Lesson Plan Service — V2 Production Pipeline
 *
 * Uses the Phase 1.2 pedagogy pipeline with proper language handling:
 *
 *   SkillPathLesson
 *       ↓
 *   pedagogyEngine.prepareSession()  — i+1 targeting, chunk selection
 *       ↓  SessionPlan
 *   lessonGeneratorV2.generateLesson()  — AI-generated activities via Groq
 *       ↓  LessonPlan (with built-in fallback for language-appropriate content)
 *       ↓
 *   LessonView  — renders the lesson to the user
 *
 * The lessonGeneratorV2 has its own fallback mechanism that generates
 * language-appropriate content. We do NOT use mock data - all lessons
 * are generated based on user's target language.
 *
 * @module lessonPlanService
 */

import type { SkillPathLesson, LessonPlan } from '../types/game';
import type { LearnerProfile } from '../types/pedagogy';
import { getCurrentUserId } from '../../services/pocketbaseService';
import { pedagogyEngine } from './pedagogyEngine';
import { learnerProfileService } from './learnerProfileService';
import lessonGeneratorV2 from './lessonGeneratorV2';
// Rule 3 (.clinerules): ALL language name ↔ code conversion MUST use languageUtils
import { toLanguageCode } from '../utils/languageUtils';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a minimal default learner profile for unauthenticated/fallback scenarios.
 * This matches the structure from learnerProfileService.createDefaultProfile.
 */
function createDefaultProfile(
  userId: string,
  nativeLanguage: string = 'English',
  targetLanguage: string = 'German'
): LearnerProfile {
  const now = new Date().toISOString();
  
  return {
    id: `temp-${userId}`,
    userId,
    nativeLanguage: toLanguageCode(nativeLanguage),
    targetLanguage: toLanguageCode(targetLanguage),
    currentLevel: 0,
    levelHistory: [{ date: now, value: 0 }],
    totalChunksEncountered: 0,
    chunksAcquired: 0,
    chunksLearning: 0,
    chunksFragile: 0,
    explicitInterests: [],
    detectedInterests: [],
    averageConfidence: 0.5,
    confidenceHistory: [{ date: now, value: 0.5 }],
    totalSessions: 0,
    totalTimeMinutes: 0,
    averageSessionLength: 0,
    helpRequestRate: 0,
    wrongAnswerRate: 0,
    preferredActivityTypes: [],
    preferredSessionLength: 10,
    lastReflectionPrompt: '',
    coachingNotes: '',
    filterRiskScore: 0,
    created: now,
    updated: now,
  };
}

// ============================================
// TYPES
// ============================================

/**
 * Options for generating a lesson plan.
 */
export interface GenerateLessonPlanOptions {
  /** The lesson node selected by the user */
  lesson: SkillPathLesson;
  /** User's target language — passed to pedagogy engine as topic context */
  targetLanguage?: string;
  /** Desired session duration in minutes (default: 10) */
  durationMinutes?: number;
}

// ============================================
// SERVICE
// ============================================

/**
 * Generate an AI-powered lesson plan using the Phase 1.2 pedagogy pipeline.
 *
 * Pipeline:
 *   1. Get the authenticated user ID
 *   2. Load / create learner profile (PocketBase)
 *   3. Build a SessionPlan via pedagogyEngine (i+1 targeting, chunk selection)
 *   4. Generate lesson content via lessonGeneratorV2 (Groq / Llama 3.3)
 *   5. Return the LessonPlan for LessonView to render
 *
 * Falls back gracefully to mock data if any step fails so the dev/test
 * experience stays smooth even without live API keys.
 *
 * @param options - Lesson generation options
 * @returns A LessonPlan ready for LessonView
 */
export async function generateLessonPlan(
  options: GenerateLessonPlanOptions
): Promise<LessonPlan> {
  const { lesson, targetLanguage, durationMinutes = 10 } = options;

  // ── Try V2 pipeline ─────────────────────────────────────────────
  const userId = getCurrentUserId();

  if (userId) {
    try {
      console.log('[lessonPlanService] Using V2 pedagogy pipeline for lesson:', lesson.title);

      // Step 1: Load learner profile (creates one if first time).
      // Pass targetLanguage as a default so the in-memory fallback (used when
      // PocketBase learner_profiles schema isn't set up yet) uses the correct
      // language instead of the hard-coded 'French' default.
      const profile = await learnerProfileService.getOrCreateProfile(userId, {
        targetLanguage: targetLanguage,
        nativeLanguage: 'English',
      });

      // Step 2: Build a SessionPlan — the engine picks target chunks,
      //         review chunks, i+1 difficulty, and recommended activity types
      // Embed the target language in the topic string so Groq generates
      // vocabulary relevant to both the skill node AND the target language.
      // SessionOptions has no dedicated targetLanguage field.
      const topicWithLanguage = targetLanguage
        ? `${lesson.title} (${targetLanguage})`
        : lesson.title;

      const sessionPlan = await pedagogyEngine.prepareSession(userId, {
        topic: topicWithLanguage,
        duration: durationMinutes,
      });

      // Step 3: Generate AI lesson content from the session plan
      const result = await lessonGeneratorV2.generateLesson({
        userId,
        sessionPlan,
        profile,
        additionalContext: {
          // SkillPathLesson has no description field — use title as focus area
          focusArea: lesson.title,
        },
      });

      console.log(
        `[lessonPlanService] V2 lesson generated in ${result.meta.generationTimeMs}ms`,
        `— ${result.meta.newChunksCount} new chunks, ${result.meta.reviewChunksCount} review`,
      );

      return result.lesson;

    } catch (error) {
      // Re-throw with more context - the lessonGeneratorV2 has its own fallback
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[lessonPlanService] V2 pipeline failed:', msg);
      throw new Error(`Failed to generate lesson: ${msg}`);
    }
  }

  // No authenticated user - create a temporary profile for V2 generator
  // The V2 generator has built-in fallback with language-appropriate content
  console.log('[lessonPlanService] No authenticated user — generating lesson with defaults');
  
  // Use the helper function to create a properly-typed profile
  const tempProfile = createDefaultProfile(
    'temp-user',
    'English',
    targetLanguage || 'German'
  );

  // Build session plan with target language
  const topicWithLanguage = targetLanguage
    ? `${lesson.title} (${targetLanguage})`
    : lesson.title;

  try {
    const sessionPlan = await pedagogyEngine.prepareSession('temp-user', {
      topic: topicWithLanguage,
      duration: durationMinutes,
    });

    const result = await lessonGeneratorV2.generateLesson({
      userId: 'temp-user',
      sessionPlan,
      profile: tempProfile,
      additionalContext: {
        focusArea: lesson.title,
      },
    });

    console.log(
      `[lessonPlanService] Generated lesson in ${result.meta.generationTimeMs}ms`,
      `(fallback: ${result.meta.usedFallback ? 'yes' : 'no'})`
    );

    return result.lesson;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[lessonPlanService] Failed to generate lesson:', msg);
    throw new Error(`Failed to generate lesson: ${msg}`);
  }
}

/**
 * Check if a lesson plan can be generated for the given lesson.
 * Locked lessons are never generatable regardless of backend state.
 */
export function canGenerateLessonPlan(lesson: SkillPathLesson | null): boolean {
  return lesson !== null && lesson.status !== 'locked';
}

/**
 * Get a cached lesson plan if available.
 * Caching is handled internally by LessonGeneratorV2 (Map-based TTL cache).
 * This stub exists for hook compatibility.
 */
export function getCachedLessonPlan(_lessonId: string): LessonPlan | null {
  // V2 generator manages its own cache — no separate cache needed here
  return null;
}

export default generateLessonPlan;
