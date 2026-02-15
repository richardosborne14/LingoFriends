/**
 * Lesson Plan Service
 * 
 * Generates lesson plans for the lesson view.
 * Currently uses mock data - will be replaced with AI generation in Task 1.1.9.
 * 
 * @module lessonPlanService
 */

import type { SkillPathLesson, LessonPlan } from '../types/game';
import { generateMockLessonPlan } from '../data/mockGameData';

// ============================================
// TYPES
// ============================================

/**
 * Options for generating a lesson plan
 */
export interface GenerateLessonPlanOptions {
  /** The lesson to generate a plan for */
  lesson: SkillPathLesson;
  /** User's target language (for future AI generation) */
  targetLanguage?: string;
  /** User's skill level (for future AI generation) */
  skillLevel?: string;
}

// ============================================
// SERVICE
// ============================================

/**
 * Generate a lesson plan for the given lesson.
 * 
 * Currently returns mock data. In Task 1.1.9, this will call
 * the AI service to generate personalized lesson content.
 * 
 * @param options - Lesson generation options
 * @returns A lesson plan with tutor text and activities
 * 
 * @example
 * const lessonPlan = await generateLessonPlan({
 *   lesson: currentLesson,
 *   targetLanguage: 'Spanish',
 * });
 */
export async function generateLessonPlan(
  options: GenerateLessonPlanOptions
): Promise<LessonPlan> {
  const { lesson } = options;

  // TODO: Task 1.1.9 - Replace with AI-generated content
  // For now, return mock data immediately
  // Simulate slight delay for realistic feel
  await new Promise(resolve => setTimeout(resolve, 100));

  return generateMockLessonPlan(lesson);
}

/**
 * Check if a lesson plan can be generated for the given lesson.
 * Always returns true for now, but may add validation in the future.
 */
export function canGenerateLessonPlan(lesson: SkillPathLesson | null): boolean {
  return lesson !== null && lesson.status !== 'locked';
}

/**
 * Get a cached lesson plan if available.
 * This will be implemented with proper caching in Task 1.1.9.
 */
export function getCachedLessonPlan(lessonId: string): LessonPlan | null {
  // TODO: Implement caching strategy in Task 1.1.9
  console.log(`[lessonPlanService] Cache lookup for lesson: ${lessonId}`);
  return null;
}

export default generateLessonPlan;