/**
 * LingoFriends - Lesson Generator V2
 * 
 * Upgraded lesson generator that uses chunk-based content and integrates
 * all four pedagogical frameworks:
 * 
 * - Lexical Approach (Michael Lewis): Teach chunks, not isolated words
 * - Input Hypothesis (Stephen Krashen): i+1 difficulty targeting
 * - Affective Filter: Detect struggle and adapt
 * - Language Coaching: Build learner autonomy
 * 
 * This service replaces the Phase 1.1 vocabulary-based generator with
 * a chunk-based approach that integrates with the Pedagogy Engine.
 * 
 * @module lessonGeneratorV2
 * @see docs/phase-1.2/task-1.2-8-lesson-generator-v2.md
 * @see PEDAGOGY.md for pedagogical foundation
 */

import type {
  LexicalChunk,
  GameActivityType,
  LearnerProfile,
  SessionPlan,
  SessionOptions,
} from '../types/pedagogy';
import {
  aiPedagogyClient,
  type PedagogyContext,
  type LessonGenerationRequest,
  type GeneratedLesson,
  type GeneratedActivity,
  type ActivityData,
} from './aiPedagogyClient';
import type { LessonPlan, LessonStep, ActivityConfig } from '../types/game';
import { GameActivityType as LegacyActivityType } from '../types/game';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Request to generate a lesson.
 * This is the main input for the lesson generator.
 */
export interface LessonRequest {
  /** User ID */
  userId: string;
  
  /** Session plan from Pedagogy Engine */
  sessionPlan: SessionPlan;
  
  /** Learner's profile for personalization */
  profile: LearnerProfile;
  
  /** Additional context for generation */
  additionalContext?: {
    /** Specific focus area */
    focusArea?: string;
    /** Previous lesson topics to avoid repetition */
    previousTopics?: string[];
    /** User's current mood or preference */
    mood?: 'focused' | 'casual' | 'tired';
  };
}

/**
 * Result of lesson generation.
 */
export interface LessonGenerationResult {
  /** The generated lesson */
  lesson: LessonPlan;
  
  /** Metadata about generation */
  meta: {
    /** Time taken to generate (ms) */
    generationTimeMs: number;
    /** Number of new chunks introduced */
    newChunksCount: number;
    /** Number of review chunks included */
    reviewChunksCount: number;
    /** Whether fallback was used */
    usedFallback: boolean;
    /** Activity types included */
    activityTypes: GameActivityType[];
  };
}

/**
 * Options for lesson generation.
 */
export interface LessonGeneratorOptions {
  /** Minimum activities per lesson */
  minActivities?: number;
  
  /** Maximum activities per lesson */
  maxActivities?: number;
  
  /** Minimum Sun Drops per activity */
  minSunDrops?: number;
  
  /** Maximum Sun Drops per activity */
  maxSunDrops?: number;
  
  /** Enable caching of generated lessons */
  enableCache?: boolean;
  
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default options for lesson generation */
const DEFAULT_OPTIONS: Required<LessonGeneratorOptions> = {
  minActivities: 5,
  maxActivities: 8,
  minSunDrops: 15,
  maxSunDrops: 30,
  enableCache: true,
  cacheTtl: 30 * 60 * 1000, // 30 minutes
};

/** Activity type distribution for balanced lessons */
const DEFAULT_ACTIVITY_DISTRIBUTION: GameActivityType[] = [
  'multiple_choice',
  'true_false',
  'fill_blank',
  'matching',
  'translate',
];

/** Age group mapping for prompts */
function getAgeGroup(ageGroup: string | undefined): '7-10' | '11-14' | '15-18' {
  if (!ageGroup) return '11-14';
  if (ageGroup === '7-10' || ageGroup === '11-14' || ageGroup === '15-18') {
    return ageGroup;
  }
  return '11-14';
}

// ============================================================================
// LESSON GENERATOR SERVICE
// ============================================================================

/**
 * Lesson Generator V2 Service
 * 
 * Generates structured lessons with chunk-based content that follows
 * the Lexical Approach and adapts to learner needs.
 */
export class LessonGeneratorV2 {
  
  private options: Required<LessonGeneratorOptions>;
  
  /** Cache of generated lessons */
  private lessonCache = new Map<string, { lesson: LessonPlan; timestamp: number }>();
  
  constructor(options?: LessonGeneratorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Generate a lesson from a session plan.
   * 
   * This is the main entry point. It:
   * 1. Converts session plan to pedagogy context
   * 2. Calls AI to generate activities
   * 3. Converts to LessonPlan format for UI
   * 
   * @param request - Lesson generation request
   * @returns Generated lesson with metadata
   */
  async generateLesson(request: LessonRequest): Promise<LessonGenerationResult> {
    const startTime = Date.now();
    
    // Check cache first
    if (this.options.enableCache) {
      const cacheKey = this.getCacheKey(request);
      const cached = this.lessonCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.options.cacheTtl) {
        console.log('[LessonGenerator] Using cached lesson');
        return {
          lesson: cached.lesson,
          meta: {
            generationTimeMs: 0,
            newChunksCount: cached.lesson.steps.filter(s => 
              request.sessionPlan.targetChunks.some(c => 
                s.activity.correctAnswer?.includes(c.text)
              )
            ).length,
            reviewChunksCount: cached.lesson.steps.filter(s => 
              request.sessionPlan.reviewChunks.some(c => 
                s.activity.correctAnswer?.includes(c.text)
              )
            ).length,
            usedFallback: false,
            activityTypes: this.extractActivityTypes(cached.lesson),
          },
        };
      }
    }
    
    try {
      // Build pedagogy context
      const context = this.buildPedagogyContext(request);
      
      // Determine activity count and types
      const activityCount = this.calculateActivityCount(request.sessionPlan);
      const activityTypes = this.selectActivityTypes(
        activityCount,
        request.sessionPlan.recommendedActivities
      );
      
      // Build the generation request
      const generationRequest: LessonGenerationRequest = {
        context,
        activityTypes,
        activityCount,
        topic: request.sessionPlan.topic,
        difficultyLevel: Math.round(request.sessionPlan.difficulty),
      };
      
      // Call the AI client
      const generatedLesson = await aiPedagogyClient.generateLesson(generationRequest);
      
      // Convert to LessonPlan format for UI
      const lesson = this.convertToLessonPlan(generatedLesson, request);
      
      // Cache the result
      if (this.options.enableCache) {
        const cacheKey = this.getCacheKey(request);
        this.lessonCache.set(cacheKey, { lesson, timestamp: Date.now() });
      }
      
      const generationTimeMs = Date.now() - startTime;
      
      return {
        lesson,
        meta: {
          generationTimeMs,
          newChunksCount: generatedLesson.newChunkIds.length,
          reviewChunksCount: generatedLesson.reviewChunkIds.length,
          usedFallback: false,
          activityTypes,
        },
      };
      
    } catch (error) {
      console.error('[LessonGenerator] AI generation failed, using fallback:', error);
      
      // Use fallback lesson
      const fallbackLesson = this.generateFallbackLesson(request);
      const generationTimeMs = Date.now() - startTime;
      
      return {
        lesson: fallbackLesson,
        meta: {
          generationTimeMs,
          newChunksCount: request.sessionPlan.targetChunks.length,
          reviewChunksCount: request.sessionPlan.reviewChunks.length,
          usedFallback: true,
          activityTypes: this.extractActivityTypes(fallbackLesson),
        },
      };
    }
  }
  
  /**
   * Generate a single activity for a chunk.
   * Useful for dynamic generation during a session.
   * 
   * @param chunk - Chunk to create activity for
   * @param type - Activity type to generate
   * @param profile - Learner profile
   * @returns Generated activity converted to ActivityConfig
   */
  async generateSingleActivity(
    chunk: LexicalChunk,
    type: GameActivityType,
    profile: LearnerProfile
  ): Promise<ActivityConfig> {
    const context: PedagogyContext = {
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage,
      currentLevel: profile.currentLevel,
      targetLevel: profile.currentLevel + 1,
      familiarChunks: [],
      targetChunks: [chunk],
      reviewChunks: [],
      interests: profile.explicitInterests,
      ageGroup: getAgeGroup(undefined), // TODO: Get from profile
      filterRiskScore: profile.filterRiskScore,
    };
    
    const generated = await aiPedagogyClient.generateActivity(chunk, type, context);
    return this.convertToActivityConfig(generated);
  }
  
  /**
   * Clear the lesson cache.
   */
  clearCache(): void {
    this.lessonCache.clear();
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Build pedagogy context from lesson request.
   */
  private buildPedagogyContext(request: LessonRequest): PedagogyContext {
    const { sessionPlan, profile, additionalContext } = request;
    
    return {
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage,
      currentLevel: profile.currentLevel,
      targetLevel: sessionPlan.difficulty,
      familiarChunks: sessionPlan.contextChunks,
      targetChunks: sessionPlan.targetChunks,
      reviewChunks: sessionPlan.reviewChunks,
      interests: profile.explicitInterests,
      ageGroup: getAgeGroup(undefined), // TODO: Get from profile
      filterRiskScore: profile.filterRiskScore,
      focusAreas: additionalContext?.focusArea ? [additionalContext.focusArea] : undefined,
    };
  }
  
  /**
   * Calculate the number of activities based on session plan.
   */
  private calculateActivityCount(plan: SessionPlan): number {
    // Base count on chunks
    const chunkCount = plan.targetChunks.length + plan.reviewChunks.length;
    
    // Aim for 1.5 activities per chunk
    const baseCount = Math.round(chunkCount * 1.5);
    
    // Clamp to min/max
    return Math.max(
      this.options.minActivities,
      Math.min(this.options.maxActivities, baseCount)
    );
  }
  
  /**
   * Select activity types for the lesson.
   */
  private selectActivityTypes(
    count: number,
    recommended?: GameActivityType[]
  ): GameActivityType[] {
    if (recommended && recommended.length > 0) {
      // Use recommended types, cycling if needed
      const types: GameActivityType[] = [];
      for (let i = 0; i < count; i++) {
        types.push(recommended[i % recommended.length]);
      }
      return types;
    }
    
    // Use default distribution
    const types: GameActivityType[] = [];
    for (let i = 0; i < count; i++) {
      types.push(DEFAULT_ACTIVITY_DISTRIBUTION[i % DEFAULT_ACTIVITY_DISTRIBUTION.length]);
    }
    return types;
  }
  
  /**
   * Convert generated lesson to LessonPlan format for UI.
   */
  private convertToLessonPlan(
    generated: GeneratedLesson,
    request: LessonRequest
  ): LessonPlan {
    const steps: LessonStep[] = generated.activities.map((activity, index) => ({
      tutorText: activity.tutorText,
      helpText: activity.helpText,
      activity: this.convertToActivityConfig(activity),
    }));
    
    // Calculate total Sun Drops
    const totalSunDrops = steps.reduce((sum, step) => sum + step.activity.sunDrops, 0);
    
    return {
      id: generated.id,
      title: generated.title,
      icon: '📚', // TODO: Get from topic or generate
      skillPathId: request.sessionPlan.topic,
      lessonIndex: 0, // Set by caller
      steps,
      totalSunDrops,
    };
  }
  
  /**
   * Convert generated activity to ActivityConfig format.
   */
  private convertToActivityConfig(generated: GeneratedActivity): ActivityConfig {
    const config: ActivityConfig = {
      type: this.convertActivityType(generated.type),
      sunDrops: generated.sunDrops,
      hint: generated.helpText,
    };
    
    // Add type-specific fields
    switch (generated.type) {
      case 'multiple_choice':
        config.question = generated.data.question;
        config.options = generated.data.options;
        config.correctIndex = generated.data.correctIndex;
        break;
        
      case 'fill_blank':
        config.sentence = generated.data.sentence;
        config.correctAnswer = generated.data.correctAnswer;
        break;
        
      case 'matching':
        config.pairs = generated.data.pairs;
        break;
        
      case 'translate':
        config.sourcePhrase = generated.data.sourceText;
        config.acceptedAnswers = generated.data.acceptedAnswers;
        break;
        
      case 'true_false':
        config.statement = generated.data.statement;
        config.isTrue = generated.data.isTrue;
        break;
        
      case 'word_arrange':
        config.targetSentence = generated.data.correctOrder;
        config.scrambledWords = generated.data.words;
        break;
    }
    
    return config;
  }
  
  /**
   * Convert GameActivityType to legacy ActivityType.
   */
  private convertActivityType(type: GameActivityType): LegacyActivityType {
    const mapping: Record<GameActivityType, LegacyActivityType> = {
      multiple_choice: LegacyActivityType.MULTIPLE_CHOICE,
      fill_blank: LegacyActivityType.FILL_BLANK,
      matching: LegacyActivityType.MATCHING,
      translate: LegacyActivityType.TRANSLATE,
      true_false: LegacyActivityType.TRUE_FALSE,
      word_arrange: LegacyActivityType.WORD_ARRANGE,
      listening: LegacyActivityType.MULTIPLE_CHOICE, // Fallback
      speaking: LegacyActivityType.FILL_BLANK, // Fallback
    };
    return mapping[type] || LegacyActivityType.MULTIPLE_CHOICE;
  }
  
  /**
   * Extract activity types from a lesson plan.
   */
  private extractActivityTypes(lesson: LessonPlan): GameActivityType[] {
    return lesson.steps.map(step => {
      const legacyType = step.activity.type;
      // Map back to GameActivityType
      const mapping: Record<string, GameActivityType> = {
        [LegacyActivityType.MULTIPLE_CHOICE]: 'multiple_choice',
        [LegacyActivityType.FILL_BLANK]: 'fill_blank',
        [LegacyActivityType.MATCHING]: 'matching',
        [LegacyActivityType.TRANSLATE]: 'translate',
        [LegacyActivityType.TRUE_FALSE]: 'true_false',
        [LegacyActivityType.WORD_ARRANGE]: 'word_arrange',
      };
      return mapping[legacyType] || 'multiple_choice';
    });
  }
  
  /**
   * Generate a cache key for the lesson.
   */
  private getCacheKey(request: LessonRequest): string {
    const targetIds = request.sessionPlan.targetChunks.map(c => c.id).sort().join(',');
    const reviewIds = request.sessionPlan.reviewChunks.map(c => c.id).sort().join(',');
    return `${request.userId}:${request.sessionPlan.topic}:${targetIds}:${reviewIds}`;
  }
  
  /**
   * Generate a fallback lesson when AI fails.
   */
  private generateFallbackLesson(request: LessonRequest): LessonPlan {
    const { sessionPlan, profile } = request;
    
    // Combine new and review chunks
    const allChunks = [...sessionPlan.targetChunks, ...sessionPlan.reviewChunks];
    
    // Generate simple activities for each chunk
    const steps: LessonStep[] = allChunks.slice(0, this.options.maxActivities).map((chunk, index) => {
      // Cycle through activity types
      const activityType = DEFAULT_ACTIVITY_DISTRIBUTION[index % DEFAULT_ACTIVITY_DISTRIBUTION.length];
      
      return this.createFallbackStep(chunk, activityType, index);
    });
    
    const totalSunDrops = steps.reduce((sum, step) => sum + step.activity.sunDrops, 0);
    
    return {
      id: `fallback_lesson_${Date.now()}`,
      title: `${sessionPlan.topic} Practice`,
      icon: '📚',
      skillPathId: sessionPlan.topic,
      lessonIndex: 0,
      steps,
      totalSunDrops,
    };
  }
  
  /**
   * Create a fallback step for a chunk.
   */
  private createFallbackStep(
    chunk: LexicalChunk,
    activityType: GameActivityType,
    index: number
  ): LessonStep {
    // Create different activity types based on the type
    let activity: ActivityConfig;
    
    switch (activityType) {
      case 'multiple_choice':
        activity = this.createMultipleChoiceActivity(chunk, index);
        break;
      case 'true_false':
        activity = this.createTrueFalseActivity(chunk);
        break;
      case 'fill_blank':
        activity = this.createFillBlankActivity(chunk);
        break;
      case 'matching':
        activity = this.createMatchingActivity(chunk);
        break;
      case 'translate':
        activity = this.createTranslateActivity(chunk);
        break;
      default:
        activity = this.createMultipleChoiceActivity(chunk, index);
    }
    
    return {
      tutorText: `Let's practice "${chunk.text}"!`,
      helpText: `This means "${chunk.translation}"`,
      activity,
    };
  }
  
  /**
   * Create a multiple choice activity.
   */
  private createMultipleChoiceActivity(chunk: LexicalChunk, index: number): ActivityConfig {
    // Create simple distractors by modifying the translation
    const correctAnswer = chunk.translation;
    const distractors = [
      `Option A (not ${correctAnswer})`,
      `Option B (not ${correctAnswer})`,
      `Option C (not ${correctAnswer})`,
    ];
    
    // Shuffle options
    const options = [correctAnswer, ...distractors];
    const correctIndex = Math.floor(Math.random() * 4);
    const temp = options[0];
    options[0] = options[correctIndex];
    options[correctIndex] = temp;
    
    return {
      type: LegacyActivityType.MULTIPLE_CHOICE,
      question: `What does "${chunk.text}" mean?`,
      options,
      correctIndex,
      sunDrops: 2,
      hint: chunk.notes || `This is a ${chunk.chunkType} phrase.`,
    };
  }
  
  /**
   * Create a true/false activity.
   */
  private createTrueFalseActivity(chunk: LexicalChunk): ActivityConfig {
    const isTrue = Math.random() > 0.5;
    const statement = isTrue
      ? `"${chunk.text}" means "${chunk.translation}"`
      : `"${chunk.text}" means "something else"`;
    
    return {
      type: LegacyActivityType.TRUE_FALSE,
      statement,
      isTrue,
      sunDrops: 1,
      hint: `Think about what you've learned about this phrase.`,
    };
  }
  
  /**
   * Create a fill in the blank activity.
   */
  private createFillBlankActivity(chunk: LexicalChunk): ActivityConfig {
    // For chunks with slots, use those; otherwise create a simple blank
    if (chunk.slots && chunk.slots.length > 0) {
      const slot = chunk.slots[0];
      const sentence = chunk.text.replace(slot.placeholder || '___', '___');
      return {
        type: LegacyActivityType.FILL_BLANK,
        sentence,
        correctAnswer: slot.examples[0] || '',
        sunDrops: 2,
        hint: `Think about what fits naturally here.`,
      };
    }
    
    // Otherwise, use a portion of the chunk
    const words = chunk.text.split(' ');
    const blankIndex = Math.floor(words.length / 2);
    const blankWord = words[blankIndex];
    words[blankIndex] = '___';
    
    return {
      type: LegacyActivityType.FILL_BLANK,
      sentence: words.join(' '),
      correctAnswer: blankWord,
      sunDrops: 2,
      hint: `The phrase means "${chunk.translation}"`,
    };
  }
  
  /**
   * Create a matching activity.
   * Note: This is simplified - real matching needs multiple pairs.
   */
  private createMatchingActivity(chunk: LexicalChunk): ActivityConfig {
    // Create pseudo-pairs for the chunk
    const pairs = [
      { left: chunk.text, right: chunk.translation },
    ];
    
    // Add some placeholder pairs
    pairs.push({ left: 'Example 1', right: 'Translation 1' });
    pairs.push({ left: 'Example 2', right: 'Translation 2' });
    pairs.push({ left: 'Example 3', right: 'Translation 3' });
    
    return {
      type: LegacyActivityType.MATCHING,
      pairs,
      sunDrops: 3,
      hint: 'Match each phrase with its translation.',
    };
  }
  
  /**
   * Create a translation activity.
   */
  private createTranslateActivity(chunk: LexicalChunk): ActivityConfig {
    // Randomly choose direction
    const fromTarget = Math.random() > 0.5;
    
    if (fromTarget) {
      return {
        type: LegacyActivityType.TRANSLATE,
        sourcePhrase: chunk.text,
        acceptedAnswers: [chunk.translation],
        sunDrops: 3,
        hint: `Translate this ${chunk.targetLanguage} phrase to ${chunk.nativeLanguage}.`,
      };
    } else {
      return {
        type: LegacyActivityType.TRANSLATE,
        sourcePhrase: chunk.translation,
        acceptedAnswers: [chunk.text],
        sunDrops: 3,
        hint: `Translate this to ${chunk.targetLanguage}.`,
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of the Lesson Generator V2 */
export const lessonGeneratorV2 = new LessonGeneratorV2();

export default lessonGeneratorV2;