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
 * TEACH-FIRST PEDAGOGY:
 * All lessons follow a 5-step progression for each phrase:
 * 1. INTRODUCE - Show word/phrase with translation (no quiz)
 * 2. RECOGNIZE - Guided multiple choice (answer visible)
 * 3. PRACTICE - Fill blank with hints
 * 4. RECALL - Translate without hints
 * 5. APPLY - Use in context
 * 
 * @module lessonGeneratorV2
 * @see docs/phase-1.2/task-1.2-8-lesson-generator-v2.md
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

// ============================================
// TYPES
// ============================================

/**
 * Request to generate a lesson.
 */
export interface LessonRequest {
  userId: string;
  sessionPlan: SessionPlan;
  profile: LearnerProfile;
  additionalContext?: {
    focusArea?: string;
    previousTopics?: string[];
    mood?: 'focused' | 'casual' | 'tired';
  };
}

/**
 * Result of lesson generation.
 */
export interface LessonGenerationResult {
  lesson: LessonPlan;
  meta: {
    generationTimeMs: number;
    newChunksCount: number;
    reviewChunksCount: number;
    usedFallback: boolean;
    activityTypes: GameActivityType[];
  };
}

/**
 * Options for lesson generation.
 */
export interface LessonGeneratorOptions {
  minActivities?: number;
  maxActivities?: number;
  minSunDrops?: number;
  maxSunDrops?: number;
  enableCache?: boolean;
  cacheTtl?: number;
}

/**
 * Starter phrase for fallback lessons.
 */
interface StarterPhrase {
  target: string;
  native: string;
  context?: string;
  explanation?: string;
  usage?: string; // How it's used
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_OPTIONS: Required<LessonGeneratorOptions> = {
  minActivities: 5,
  maxActivities: 15,
  minSunDrops: 15,
  maxSunDrops: 30,
  enableCache: true,
  cacheTtl: 30 * 60 * 1000,
};

function getAgeGroup(ageGroup: string | undefined): '7-10' | '11-14' | '15-18' {
  if (!ageGroup) return '11-14';
  if (ageGroup === '7-10' || ageGroup === '11-14' || ageGroup === '15-18') {
    return ageGroup;
  }
  return '11-14';
}

// ============================================
// LESSON GENERATOR SERVICE
// ============================================

export class LessonGeneratorV2 {
  
  private options: Required<LessonGeneratorOptions>;
  private lessonCache = new Map<string, { lesson: LessonPlan; timestamp: number }>();
  
  constructor(options?: LessonGeneratorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  async generateLesson(request: LessonRequest): Promise<LessonGenerationResult> {
    const startTime = Date.now();
    
    // Check cache
    if (this.options.enableCache) {
      const cacheKey = this.getCacheKey(request);
      const cached = this.lessonCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.options.cacheTtl) {
        return {
          lesson: cached.lesson,
          meta: {
            generationTimeMs: 0,
            newChunksCount: 0,
            reviewChunksCount: 0,
            usedFallback: false,
            activityTypes: this.extractActivityTypes(cached.lesson),
          },
        };
      }
    }
    
    try {
      const context = this.buildPedagogyContext(request);
      const activityCount = this.calculateActivityCount(request.sessionPlan);
      const activityTypes = this.selectActivityTypes(activityCount, request.sessionPlan.recommendedActivities);
      
      const generationRequest: LessonGenerationRequest = {
        context,
        activityTypes,
        activityCount,
        topic: request.sessionPlan.topic,
        difficultyLevel: Math.round(request.sessionPlan.difficulty),
      };
      
      const generatedLesson = await aiPedagogyClient.generateLesson(generationRequest);
      const lesson = this.convertToLessonPlan(generatedLesson, request);
      
      if (this.options.enableCache) {
        const cacheKey = this.getCacheKey(request);
        this.lessonCache.set(cacheKey, { lesson, timestamp: Date.now() });
      }
      
      return {
        lesson,
        meta: {
          generationTimeMs: Date.now() - startTime,
          newChunksCount: generatedLesson.newChunkIds.length,
          reviewChunksCount: generatedLesson.reviewChunkIds.length,
          usedFallback: false,
          activityTypes,
        },
      };
      
    } catch (error) {
      console.error('[LessonGenerator] AI generation failed, using fallback:', error);
      
      const fallbackLesson = this.generateFallbackLesson(request);
      
      return {
        lesson: fallbackLesson,
        meta: {
          generationTimeMs: Date.now() - startTime,
          newChunksCount: request.sessionPlan.targetChunks.length,
          reviewChunksCount: request.sessionPlan.reviewChunks.length,
          usedFallback: true,
          activityTypes: this.extractActivityTypes(fallbackLesson),
        },
      };
    }
  }
  
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
      ageGroup: getAgeGroup(profile.ageGroup),
      filterRiskScore: profile.filterRiskScore,
    };
    
    const generated = await aiPedagogyClient.generateActivity(chunk, type, context);
    return this.convertToActivityConfig(generated);
  }
  
  clearCache(): void {
    this.lessonCache.clear();
  }
  
  // ===========================================
  // PRIVATE METHODS
  // ===========================================
  
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
      ageGroup: getAgeGroup(profile.ageGroup),
      filterRiskScore: profile.filterRiskScore,
      focusAreas: additionalContext?.focusArea ? [additionalContext.focusArea] : undefined,
    };
  }
  
  private calculateActivityCount(plan: SessionPlan): number {
    const chunkCount = plan.targetChunks.length + plan.reviewChunks.length;
    const baseCount = Math.round(chunkCount * 1.5);
    return Math.max(this.options.minActivities, Math.min(this.options.maxActivities, baseCount));
  }
  
  private selectActivityTypes(count: number, recommended?: GameActivityType[]): GameActivityType[] {
    if (recommended && recommended.length > 0) {
      const types: GameActivityType[] = [];
      for (let i = 0; i < count; i++) {
        types.push(recommended[i % recommended.length]);
      }
      return types;
    }
    
    // Default: teach-first progression
    return ['multiple_choice', 'multiple_choice', 'fill_blank', 'translate', 'multiple_choice'];
  }
  
  private convertToLessonPlan(generated: GeneratedLesson, request: LessonRequest): LessonPlan {
    const steps: LessonStep[] = generated.activities.map((activity) => ({
      tutorText: activity.tutorText,
      helpText: activity.helpText,
      activity: this.convertToActivityConfig(activity),
    }));
    
    const totalSunDrops = steps.reduce((sum, step) => sum + step.activity.sunDrops, 0);
    
    return {
      id: generated.id,
      title: generated.title,
      icon: '📚',
      skillPathId: request.sessionPlan.topic,
      lessonIndex: 0,
      steps,
      totalSunDrops,
    };
  }
  
  private convertToActivityConfig(generated: GeneratedActivity): ActivityConfig {
    const config: ActivityConfig = {
      type: this.convertActivityType(generated.type),
      sunDrops: generated.sunDrops,
      hint: generated.helpText,
    };
    
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
  
  private convertActivityType(type: GameActivityType): LegacyActivityType {
    const mapping: Record<GameActivityType, LegacyActivityType> = {
      multiple_choice: LegacyActivityType.MULTIPLE_CHOICE,
      fill_blank: LegacyActivityType.FILL_BLANK,
      matching: LegacyActivityType.MATCHING,
      translate: LegacyActivityType.TRANSLATE,
      true_false: LegacyActivityType.TRUE_FALSE,
      word_arrange: LegacyActivityType.WORD_ARRANGE,
      listening: LegacyActivityType.MULTIPLE_CHOICE,
      speaking: LegacyActivityType.FILL_BLANK,
    };
    return mapping[type] || LegacyActivityType.MULTIPLE_CHOICE;
  }
  
  private extractActivityTypes(lesson: LessonPlan): GameActivityType[] {
    return lesson.steps.map(step => {
      const legacyType = step.activity.type;
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
  
  private getCacheKey(request: LessonRequest): string {
    const targetIds = request.sessionPlan.targetChunks.map(c => c.id).sort().join(',');
    const reviewIds = request.sessionPlan.reviewChunks.map(c => c.id).sort().join(',');
    return `${request.userId}:${request.sessionPlan.topic}:${targetIds}:${reviewIds}`;
  }
  
  // ===========================================
  // FALLBACK LESSON GENERATION
  // ===========================================
  
  /**
   * Generate a fallback lesson with TEACH-FIRST pedagogy.
   * 
   * Each phrase follows:
   * 1. INTRODUCE - Show phrase + translation (information step)
   * 2. RECOGNIZE - Multiple choice with answer visible
   * 3. PRACTICE - Fill blank with hint
   * 4. RECALL - Translate without hint
   * 5. APPLY - Use in context
   */
  private generateFallbackLesson(request: LessonRequest): LessonPlan {
    const { sessionPlan, profile } = request;
    
    const allChunks = [...sessionPlan.targetChunks, ...sessionPlan.reviewChunks];
    
    let steps: LessonStep[];
    
    if (allChunks.length === 0) {
      // No chunks - use teach-first starter activities
      const phrases = this.getTopicStarters(sessionPlan.topic, profile.targetLanguage, profile.nativeLanguage);
      steps = this.createTeachFirstSteps(phrases.slice(0, 3), profile); // Max 3 phrases
    } else {
      // Use existing chunks with teach-first structure
      steps = this.createTeachFirstStepsFromChunks(allChunks.slice(0, 3), profile);
    }
    
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
   * Create teach-first steps for starter phrases.
   */
  private createTeachFirstSteps(phrases: StarterPhrase[], profile: LearnerProfile): LessonStep[] {
    const steps: LessonStep[] = [];
    const targetLang = profile.targetLanguage || 'German';
    const nativeLang = profile.nativeLanguage || 'English';
    
    for (const phrase of phrases) {
      // STEP 1: INTRODUCE (Information - no quiz)
      steps.push({
        tutorText: `📚 New Word: "${phrase.target}"`,
        helpText: `${phrase.explanation || ''} ${phrase.usage || ''}`,
        activity: {
          type: LegacyActivityType.INFO,
          title: phrase.target,
          content: `${phrase.target} = "${phrase.native}"`,
          explanation: phrase.explanation,
          example: phrase.context,
          sunDrops: 0,
        },
      });
      
      // STEP 2: RECOGNIZE (Guided multiple choice)
      steps.push({
        tutorText: `Let's check: What does "${phrase.target}" mean?`,
        helpText: `Remember: "${phrase.target}" means "${phrase.native}"`,
        activity: {
          type: LegacyActivityType.MULTIPLE_CHOICE,
          question: `What does "${phrase.target}" mean?`,
          options: [
            phrase.native,
            this.getDistractor(phrase.native, 0),
            this.getDistractor(phrase.native, 1),
            this.getDistractor(phrase.native, 2),
          ],
          correctIndex: 0,
          sunDrops: 1,
          hint: `"${phrase.target}" = "${phrase.native}"`,
        },
      });
      
      // STEP 3: PRACTICE (Fill blank with hint)
      const words = phrase.target.split(' ');
      const blankWord = words.length > 1 ? words[0] : phrase.target;
      steps.push({
        tutorText: `Practice: Complete the word!`,
        helpText: `The answer starts with "${blankWord[0]}"`,
        activity: {
          type: LegacyActivityType.FILL_BLANK,
          sentence: phrase.context || `___ means "${phrase.native}"`,
          correctAnswer: blankWord,
          acceptedAnswers: [blankWord, phrase.target],
          sunDrops: 2,
          hint: `"${phrase.target}" = "${phrase.native}"`,
        },
      });
      
      // STEP 4: RECALL (Translate)
      steps.push({
        tutorText: `Your turn: Translate "${phrase.native}"`,
        helpText: `Say it in ${targetLang}`,
        activity: {
          type: LegacyActivityType.TRANSLATE,
          sourcePhrase: phrase.native,
          acceptedAnswers: [phrase.target, phrase.target.toLowerCase()],
          sunDrops: 3,
          hint: phrase.explanation,
        },
      });
      
      // STEP 5: APPLY (Context question)
      steps.push({
        tutorText: `When would you use "${phrase.target}"?`,
        helpText: phrase.usage || phrase.explanation,
        activity: {
          type: LegacyActivityType.MULTIPLE_CHOICE,
          question: phrase.usage 
            ? `When do you say "${phrase.target}"?`
            : `Is "${phrase.target}" formal or casual?`,
          options: this.getUsageOptions(phrase),
          correctIndex: 0,
          sunDrops: 2,
          hint: phrase.explanation,
        },
      });
    }
    
    return steps;
  }
  
  /**
   * Create teach-first steps from existing chunks.
   */
  private createTeachFirstStepsFromChunks(chunks: LexicalChunk[], profile: LearnerProfile): LessonStep[] {
    const steps: LessonStep[] = [];
    
    for (const chunk of chunks) {
      // STEP 1: INTRODUCE
      steps.push({
        tutorText: `📚 Learn: "${chunk.text}"`,
        helpText: chunk.notes || `This means "${chunk.translation}"`,
        activity: {
          type: LegacyActivityType.INFO,
          title: chunk.text,
          content: `${chunk.text} = "${chunk.translation}"`,
          explanation: chunk.notes,
          sunDrops: 0,
        },
      });
      
      // STEP 2: RECOGNIZE
      steps.push({
        tutorText: `Quick check: What does "${chunk.text}" mean?`,
        helpText: `"${chunk.text}" = "${chunk.translation}"`,
        activity: {
          type: LegacyActivityType.MULTIPLE_CHOICE,
          question: `What does "${chunk.text}" mean?`,
          options: [
            chunk.translation,
            'Something else',
            'I don\'t know',
            'None of these',
          ],
          correctIndex: 0,
          sunDrops: 1,
          hint: `Remember: "${chunk.text}" = "${chunk.translation}"`,
        },
      });
      
      // STEP 3: PRACTICE
      steps.push({
        tutorText: `Practice using "${chunk.text}"`,
        helpText: `Hint: "${chunk.translation}"`,
        activity: {
          type: LegacyActivityType.TRANSLATE,
          sourcePhrase: chunk.translation,
          acceptedAnswers: [chunk.text, chunk.text.toLowerCase()],
          sunDrops: 2,
          hint: chunk.notes,
        },
      });
    }
    
    return steps;
  }
  
  /**
   * Get usage options for apply step.
   */
  private getUsageOptions(phrase: StarterPhrase): string[] {
    // Default usage question options
    if (phrase.usage?.toLowerCase().includes('casual') || phrase.usage?.toLowerCase().includes('friend')) {
      return [
        'With friends and people I know well',
        'In formal situations',
        'With strangers',
        'In business meetings',
      ];
    }
    if (phrase.usage?.toLowerCase().includes('formal') || phrase.usage?.toLowerCase().includes('polite')) {
      return [
        'In formal situations',
        'With friends',
        'With family',
        'Casual settings',
      ];
    }
    // Generic options
    return [
      phrase.usage || 'Everyday situations',
      'Only in writing',
      'Never',
      'Only to older people',
    ];
  }
  
  /**
   * Get distractor for multiple choice.
   */
  private getDistractor(correctAnswer: string, index: number): string {
    const distractors = [
      'Good morning',
      'Goodbye',
      'Hello',
      'Thank you',
      'Please',
      'Sorry',
      'Yes',
      'No',
    ];
    // Filter out the correct answer
    const filtered = distractors.filter(d => d.toLowerCase() !== correctAnswer.toLowerCase());
    return filtered[index % filtered.length];
  }
  
  /**
   * Get topic-specific starter phrases.
   */
  private getTopicStarters(
    topic: string,
    targetLang: string,
    nativeLang: string
  ): StarterPhrase[] {
    // German phrases
    const germanPhrases: Record<string, StarterPhrase[]> = {
      'Greetings & Basics': [
        { 
          target: 'Hallo', 
          native: 'Hello', 
          explanation: 'A casual, friendly greeting for any time of day',
          usage: 'Use with friends, family, and people you know',
          context: 'Hallo, wie geht\'s?' 
        },
        { 
          target: 'Guten Morgen', 
          native: 'Good morning', 
          explanation: 'A polite morning greeting',
          usage: 'Use until about noon, can be formal or casual',
          context: 'Guten Morgen! Wie geht es dir?' 
        },
        { 
          target: 'Tschüss', 
          native: 'Bye', 
          explanation: 'A casual way to say goodbye',
          usage: 'Use with friends and people you know well - this is INFORMAL',
          context: 'Tschüss! Bis morgen!' 
        },
        { 
          target: 'Auf Wiedersehen', 
          native: 'Goodbye (formal)', 
          explanation: 'A formal way to say goodbye',
          usage: 'Use with strangers, in business, or formal situations',
          context: 'Auf Wiedersehen, Herr Schmidt.' 
        },
        { 
          target: 'Danke', 
          native: 'Thank you', 
          explanation: 'Express gratitude',
          usage: 'Use in any situation',
          context: 'Danke schön!' 
        },
      ],
      'default': [
        { target: 'Hallo', native: 'Hello', explanation: 'A common greeting', usage: 'Casual, any time' },
        { target: 'Danke', native: 'Thank you', explanation: 'Express gratitude', usage: 'Any situation' },
        { target: 'Bitte', native: 'Please/You\'re welcome', explanation: 'Polite word', usage: 'Any situation' },
        { target: 'Tschüss', native: 'Bye', explanation: 'Casual goodbye', usage: 'With friends' },
        { target: 'Ja', native: 'Yes', explanation: 'Affirmative', usage: 'Any situation' },
      ],
    };
    
    // French phrases
    const frenchPhrases: Record<string, StarterPhrase[]> = {
      'Greetings & Basics': [
        { target: 'Bonjour', native: 'Hello/Good day', explanation: 'The most common French greeting', usage: 'Any time of day, can be formal or casual' },
        { target: 'Salut', native: 'Hi/Bye', explanation: 'Casual greeting or goodbye', usage: 'With friends only - this is INFORMAL' },
        { target: 'Au revoir', native: 'Goodbye', explanation: 'Standard way to say goodbye', usage: 'Any situation' },
        { target: 'Merci', native: 'Thank you', explanation: 'Express gratitude', usage: 'Any situation' },
        { target: 'Bonsoir', native: 'Good evening', explanation: 'Evening greeting', usage: 'After about 6pm' },
      ],
      'default': [
        { target: 'Bonjour', native: 'Hello', explanation: 'Common greeting' },
        { target: 'Merci', native: 'Thank you', explanation: 'Express gratitude' },
        { target: 'Au revoir', native: 'Goodbye', explanation: 'Standard goodbye' },
        { target: 'Oui', native: 'Yes', explanation: 'Affirmative' },
        { target: 'Non', native: 'No', explanation: 'Negative' },
      ],
    };
    
    // Select language
    const normalizedLang = targetLang.toLowerCase();
    let topicPhrases: Record<string, StarterPhrase[]>;
    
    if (normalizedLang.includes('german') || normalizedLang === 'deutsch') {
      topicPhrases = germanPhrases;
    } else {
      topicPhrases = frenchPhrases;
    }
    
    // Find matching topic
    const normalizedTopic = topic.toLowerCase();
    for (const [key, phrases] of Object.entries(topicPhrases)) {
      if (normalizedTopic.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedTopic)) {
        return phrases;
      }
    }
    
    return topicPhrases['default'];
  }
}

// ===========================================
// SINGLETON EXPORT
// ===========================================

export const lessonGeneratorV2 = new LessonGeneratorV2();

export default lessonGeneratorV2;