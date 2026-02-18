/**
 * Lesson Plan Service — V2 wiring (Task E)
 *
 * Replaces the Phase 1.1 mock stub with the full Phase 1.2 pedagogy pipeline:
 *
 *   SkillPathLesson
 *       ↓
 *   pedagogyEngine.prepareSession()  — i+1 targeting, chunk selection
 *       ↓  SessionPlan
 *   lessonGeneratorV2.generateLesson()  — AI-generated activities via Groq
 *       ↓  LessonPlan
 *   LessonView  — renders the lesson to the user
 *
 * Falls back to the mock generator if:
 *   - User is not authenticated (development / tests)
 *   - PocketBase or Groq is unreachable
 *   - Any step of the pedagogy pipeline throws
 *
 * @module lessonPlanService
 */

import type { SkillPathLesson, LessonPlan } from '../types/game';
import { generateMockLessonPlan } from '../data/mockGameData';
import { getCurrentUserId } from '../../services/pocketbaseService';
import { pedagogyEngine } from './pedagogyEngine';
import { learnerProfileService } from './learnerProfileService';
import lessonGeneratorV2 from './lessonGeneratorV2';

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

      // Step 1: Load learner profile (creates one if first time)
      const profile = await learnerProfileService.getOrCreateProfile(userId);

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
      // Non-fatal: log and fall through to mock
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[lessonPlanService] V2 pipeline failed, using mock fallback:', msg);
    }
  } else {
    console.log('[lessonPlanService] No authenticated user — using mock lesson (dev mode)');
  }

  // ── Fallback: mock generator ─────────────────────────────────────
  // Slight delay to simulate async for consistent UX (loading state shows)
  await new Promise(resolve => setTimeout(resolve, 100));
  return generateMockLessonPlan(lesson);
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
