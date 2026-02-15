/**
 * Tests for Lesson Generator V2
 * 
 * Tests the chunk-based lesson generation system that integrates
 * all four pedagogical frameworks.
 * 
 * @module lessonGeneratorV2.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LessonGeneratorV2, type LessonRequest } from './lessonGeneratorV2';
import { aiPedagogyClient } from './aiPedagogyClient';
import type { 
  LexicalChunk, 
  LearnerProfile, 
  SessionPlan,
  ChunkType,
} from '../types/pedagogy';
import type { GeneratedLesson } from './aiPedagogyClient';
import type { LessonPlan } from '../types/game';

// ============================================
// MOCKS
// ============================================

// Mock the AI pedagogy client
vi.mock('./aiPedagogyClient', () => ({
  aiPedagogyClient: {
    generateLesson: vi.fn(),
    generateActivity: vi.fn(),
  },
}));

// Mock console.log to suppress noise in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
});

// ============================================
// TEST FIXTURES
// ============================================

const createMockChunk = (id: string, text: string, translation: string): LexicalChunk => ({
  id,
  text,
  translation,
  chunkType: 'utterance' as ChunkType,
  targetLanguage: 'fr',
  nativeLanguage: 'en',
  difficulty: 2,
  topicIds: ['topic_restaurant'],
  frequency: 100,
  baseInterval: 1,
  ageAppropriate: ['11-14'],
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
});

const createMockProfile = (): LearnerProfile => ({
  id: 'profile_1',
  userId: 'user_1',
  nativeLanguage: 'en',
  targetLanguage: 'fr',
  currentLevel: 30,
  levelHistory: [],
  totalChunksEncountered: 50,
  chunksAcquired: 20,
  chunksLearning: 25,
  chunksFragile: 5,
  explicitInterests: ['sports', 'music', 'travel'],
  detectedInterests: [],
  averageConfidence: 0.75,
  confidenceHistory: [],
  totalSessions: 10,
  totalTimeMinutes: 150,
  averageSessionLength: 15,
  helpRequestRate: 0.1,
  wrongAnswerRate: 0.15,
  preferredActivityTypes: ['multiple_choice', 'fill_blank'],
  preferredSessionLength: 15,
  lastReflectionPrompt: '',
  coachingNotes: '',
  filterRiskScore: 0.2,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
});

const createMockSessionPlan = (): SessionPlan => ({
  sessionId: 'session_1',
  topic: 'Restaurant French',
  targetChunks: [
    createMockChunk('chunk_1', "Je voudrais un café", "I would like a coffee"),
    createMockChunk('chunk_2', "L'addition, s'il vous plaît", "The check, please"),
  ],
  reviewChunks: [
    createMockChunk('chunk_3', "Bon appétit", "Enjoy your meal"),
  ],
  contextChunks: [
    createMockChunk('chunk_4', "Bonjour", "Hello"),
    createMockChunk('chunk_5', "Merci", "Thank you"),
  ],
  recommendedActivities: ['multiple_choice', 'fill_blank', 'translate'],
  estimatedDuration: 10,
  difficulty: 2,
  reasoning: 'Test session plan',
});

const createMockLessonRequest = (): LessonRequest => ({
  userId: 'user_1',
  sessionPlan: createMockSessionPlan(),
  profile: createMockProfile(),
});

const createMockGeneratedLesson = () => ({
  id: 'lesson_123',
  title: 'Restaurant Basics',
  description: 'Learn essential restaurant phrases',
  intro: "Let's learn how to order at a French restaurant!",
  transitions: ["Great job! Now let's try something new.", "You're doing well!"],
  conclusion: 'Excellent work! You can now order in French!',
  activities: [
    {
      id: 'act_1',
      type: 'multiple_choice' as const,
      focusChunkId: 'chunk_1',
      chunkIds: ['chunk_1'],
      difficulty: 2,
      tutorText: "Let's start with ordering a coffee!",
      helpText: "Think about how to say 'I would like'",
      sunDrops: 2,
      data: {
        question: 'How do you say "I would like a coffee" in French?',
        options: ['Je voudrais un café', "J'aime le café", 'Je prends café', 'Café, svp'],
        correctIndex: 0,
      },
    },
    {
      id: 'act_2',
      type: 'translate' as const,
      focusChunkId: 'chunk_2',
      chunkIds: ['chunk_2'],
      difficulty: 2,
      tutorText: 'Now translate this phrase!',
      helpText: 'Ask for the check politely',
      sunDrops: 3,
      data: {
        sourceText: 'The check, please',
        acceptedAnswers: ["L'addition, s'il vous plaît"],
      },
    },
    {
      id: 'act_3',
      type: 'fill_blank' as const,
      focusChunkId: 'chunk_3',
      chunkIds: ['chunk_3'],
      difficulty: 1,
      tutorText: 'Fill in the blank!',
      helpText: 'This is said before a meal',
      sunDrops: 2,
      data: {
        sentence: 'Bon ____!',
        correctAnswer: 'appétit',
      },
    },
  ],
  newChunkIds: ['chunk_1', 'chunk_2'],
  reviewChunkIds: ['chunk_3'],
  totalSunDrops: 7,
});

// ============================================
// TESTS
// ============================================

describe('LessonGeneratorV2', () => {
  let generator: LessonGeneratorV2;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new LessonGeneratorV2();
  });

  describe('generateLesson', () => {
    it('should generate a lesson from a session plan', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      const result = await generator.generateLesson(createMockLessonRequest());

      expect(result.lesson).toBeDefined();
      expect(result.lesson.title).toBe('Restaurant Basics');
      expect(result.lesson.steps).toHaveLength(3);
      expect(result.meta.usedFallback).toBe(false);
      expect(result.meta.newChunksCount).toBe(2);
      expect(result.meta.reviewChunksCount).toBe(1);
    });

    it('should call AI client with correct context', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      await generator.generateLesson(createMockLessonRequest());

      expect(aiPedagogyClient.generateLesson).toHaveBeenCalled();
      const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
      
      expect(callArgs.topic).toBe('Restaurant French');
      expect(callArgs.context.targetLanguage).toBe('fr');
      expect(callArgs.context.nativeLanguage).toBe('en');
      expect(callArgs.context.targetChunks).toHaveLength(2);
      expect(callArgs.context.reviewChunks).toHaveLength(1);
    });

    it('should use fallback lesson when AI fails', async () => {
      vi.mocked(aiPedagogyClient.generateLesson).mockRejectedValueOnce(
        new Error('AI API Error')
      );

      const result = await generator.generateLesson(createMockLessonRequest());

      expect(result.lesson).toBeDefined();
      expect(result.meta.usedFallback).toBe(true);
      expect(result.lesson.title).toContain('Restaurant French');
    });

    it('should cache lessons by default', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValue(mockGeneratedLesson);

      // First call
      await generator.generateLesson(createMockLessonRequest());
      expect(aiPedagogyClient.generateLesson).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await generator.generateLesson(createMockLessonRequest());
      expect(aiPedagogyClient.generateLesson).toHaveBeenCalledTimes(1);
      expect(result.meta.generationTimeMs).toBe(0);
    });

    it('should respect cache TTL', async () => {
      // Create generator with very short TTL
      const shortTTLGenerator = new LessonGeneratorV2({ cacheTtl: 10 });
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValue(mockGeneratedLesson);

      // First call
      await shortTTLGenerator.generateLesson(createMockLessonRequest());
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Second call should hit API again
      await shortTTLGenerator.generateLesson(createMockLessonRequest());
      expect(aiPedagogyClient.generateLesson).toHaveBeenCalledTimes(2);
    });

    it('should disable caching when configured', async () => {
      const noCacheGenerator = new LessonGeneratorV2({ enableCache: false });
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValue(mockGeneratedLesson);

      await noCacheGenerator.generateLesson(createMockLessonRequest());
      await noCacheGenerator.generateLesson(createMockLessonRequest());
      
      expect(aiPedagogyClient.generateLesson).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateSingleActivity', () => {
    it('should generate a single activity for a chunk', async () => {
      const mockActivity = {
        id: 'act_single',
        type: 'multiple_choice' as const,
        focusChunkId: 'chunk_1',
        chunkIds: ['chunk_1'],
        difficulty: 2,
        tutorText: 'Test question',
        helpText: 'Hint',
        sunDrops: 2,
        data: {
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        },
      };
      vi.mocked(aiPedagogyClient.generateActivity).mockResolvedValueOnce(mockActivity);

      const chunk = createMockChunk('chunk_1', 'Test', 'Translation');
      const profile = createMockProfile();
      
      const activity = await generator.generateSingleActivity(chunk, 'multiple_choice', profile);

      expect(activity).toBeDefined();
      expect(activity.type).toBe('multiple_choice');
      expect(activity.question).toBe('Test question?');
      expect(activity.sunDrops).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear cached lessons', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValue(mockGeneratedLesson);

      await generator.generateLesson(createMockLessonRequest());
      generator.clearCache();
      await generator.generateLesson(createMockLessonRequest());

      expect(aiPedagogyClient.generateLesson).toHaveBeenCalledTimes(2);
    });
  });

  describe('fallback lesson generation', () => {
    it('should create valid activities for each chunk type', async () => {
      vi.mocked(aiPedagogyClient.generateLesson).mockRejectedValueOnce(
        new Error('AI unavailable')
      );

      const request = createMockLessonRequest();
      const result = await generator.generateLesson(request);

      // Should have activities
      expect(result.lesson.steps.length).toBeGreaterThan(0);
      
      // Each step should have valid activity
      result.lesson.steps.forEach(step => {
        expect(step.activity.type).toBeDefined();
        expect(step.activity.sunDrops).toBeGreaterThanOrEqual(1);
        expect(step.tutorText).toBeDefined();
        expect(step.helpText).toBeDefined();
      });
    });

    it('should create multiple choice activities with correct structure', async () => {
      vi.mocked(aiPedagogyClient.generateLesson).mockRejectedValueOnce(
        new Error('AI unavailable')
      );

      const request = createMockLessonRequest();
      const result = await generator.generateLesson(request);

      const mcStep = result.lesson.steps.find(
        s => s.activity.type === 'multiple_choice'
      );

      if (mcStep) {
        expect(mcStep.activity.question).toBeDefined();
        expect(mcStep.activity.options).toBeDefined();
        expect(mcStep.activity.options).toHaveLength(4);
        expect(mcStep.activity.correctIndex).toBeDefined();
      }
    });

    it('should create translate activities with correct structure', async () => {
      vi.mocked(aiPedagogyClient.generateLesson).mockRejectedValueOnce(
        new Error('AI unavailable')
      );

      const request = createMockLessonRequest();
      const result = await generator.generateLesson(request);

      const translateStep = result.lesson.steps.find(
        s => s.activity.type === 'translate'
      );

      if (translateStep) {
        expect(translateStep.activity.sourcePhrase).toBeDefined();
        expect(translateStep.activity.acceptedAnswers).toBeDefined();
        expect(translateStep.activity.acceptedAnswers!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('activity count calculation', () => {
    it('should respect minimum activities', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      // Create request with very few chunks
      const request = createMockLessonRequest();
      request.sessionPlan.targetChunks = [];
      request.sessionPlan.reviewChunks = [];

      await generator.generateLesson(request);

      const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
      expect(callArgs.activityCount).toBeGreaterThanOrEqual(5); // Default min
    });

    it('should respect maximum activities', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      // Create request with many chunks
      const request = createMockLessonRequest();
      request.sessionPlan.targetChunks = Array(20).fill(null).map((_, i) => 
        createMockChunk(`chunk_${i}`, `Text ${i}`, `Translation ${i}`)
      );

      await generator.generateLesson(request);

      const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
      expect(callArgs.activityCount).toBeLessThanOrEqual(8); // Default max
    });
  });

  describe('difficulty handling', () => {
    it('should pass difficulty level to AI client', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      const request = createMockLessonRequest();
      request.sessionPlan.difficulty = 4;

      await generator.generateLesson(request);

      const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
      expect(callArgs.difficultyLevel).toBe(4);
    });

    it('should use affective filter score in context', async () => {
      const mockGeneratedLesson = createMockGeneratedLesson();
      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockGeneratedLesson);

      const request = createMockLessonRequest();
      request.profile.filterRiskScore = 0.7; // High filter risk

      await generator.generateLesson(request);

      const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
      expect(callArgs.context.filterRiskScore).toBe(0.7);
    });
  });

  describe('activity type conversion', () => {
    it('should convert all activity types correctly', async () => {
      // Create a complete mock lesson with all activity types
      const mockLesson: GeneratedLesson = {
        id: 'lesson_all_types',
        title: 'All Activity Types',
        description: 'Test all activity types',
        intro: 'Test intro',
        transitions: [],
        conclusion: 'Test conclusion',
        activities: [
          {
            id: 'act_1',
            type: 'multiple_choice',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { question: 'Q?', options: ['A', 'B'], correctIndex: 0 },
          },
          {
            id: 'act_2',
            type: 'fill_blank',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { sentence: '___', correctAnswer: 'test' },
          },
          {
            id: 'act_3',
            type: 'matching',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { pairs: [{ left: 'A', right: '1' }] },
          },
          {
            id: 'act_4',
            type: 'translate',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { sourceText: 'Hello', acceptedAnswers: ['Hola'] },
          },
          {
            id: 'act_5',
            type: 'true_false',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { statement: 'Test', isTrue: true },
          },
          {
            id: 'act_6',
            type: 'word_arrange',
            focusChunkId: 'chunk_1',
            chunkIds: ['chunk_1'],
            difficulty: 2,
            tutorText: 'Test',
            helpText: 'Hint',
            sunDrops: 2,
            data: { words: ['a', 'b'], correctOrder: 'a b' },
          },
        ],
        newChunkIds: ['chunk_1'],
        reviewChunkIds: [],
        totalSunDrops: 12,
      };

      vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockLesson);

      const result = await generator.generateLesson(createMockLessonRequest());

      const convertedTypes = result.lesson.steps.map(s => s.activity.type);
      expect(convertedTypes).toContain('multiple_choice');
      expect(convertedTypes).toContain('fill_blank');
      expect(convertedTypes).toContain('matching');
      expect(convertedTypes).toContain('translate');
      expect(convertedTypes).toContain('true_false');
      expect(convertedTypes).toContain('word_arrange');
    });
  });
});

describe('LessonPlan conversion', () => {
  let generator: LessonGeneratorV2;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new LessonGeneratorV2();
  });

  it('should preserve tutor and help text', async () => {
    const mockLesson = createMockGeneratedLesson();
    mockLesson.activities = [{
      id: 'act_1',
      type: 'multiple_choice',
      focusChunkId: 'chunk_1',
      chunkIds: ['chunk_1'],
      difficulty: 2,
      tutorText: 'Welcome to this activity!',
      helpText: 'Here is a helpful hint',
      sunDrops: 3,
      data: {
        question: 'Question?',
        options: ['A', 'B'],
        correctIndex: 0,
      },
    }];

    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockLesson);

    const result = await generator.generateLesson(createMockLessonRequest());

    expect(result.lesson.steps[0].tutorText).toBe('Welcome to this activity!');
    expect(result.lesson.steps[0].helpText).toBe('Here is a helpful hint');
  });

  it('should calculate total Sun Drops correctly', async () => {
    const mockLesson = createMockGeneratedLesson();
    mockLesson.activities = [
      { ...mockLesson.activities[0], sunDrops: 3 },
      { ...mockLesson.activities[1], sunDrops: 2 },
      { ...mockLesson.activities[2], sunDrops: 4 },
    ];

    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockLesson);

    const result = await generator.generateLesson(createMockLessonRequest());

    expect(result.lesson.totalSunDrops).toBe(9);
  });

  it('should include skill path ID in lesson plan', async () => {
    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(createMockGeneratedLesson());

    const result = await generator.generateLesson(createMockLessonRequest());

    expect(result.lesson.skillPathId).toBe('Restaurant French');
  });
});

describe('Edge cases', () => {
  let generator: LessonGeneratorV2;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new LessonGeneratorV2();
  });

  it('should handle empty target chunks', async () => {
    const request = createMockLessonRequest();
    request.sessionPlan.targetChunks = [];
    
    const mockLesson = createMockGeneratedLesson();
    mockLesson.newChunkIds = [];
    
    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockLesson);

    const result = await generator.generateLesson(request);

    expect(result.meta.newChunksCount).toBe(0);
  });

  it('should handle empty review chunks', async () => {
    const request = createMockLessonRequest();
    request.sessionPlan.reviewChunks = [];
    
    const mockLesson = createMockGeneratedLesson();
    mockLesson.reviewChunkIds = [];
    
    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(mockLesson);

    const result = await generator.generateLesson(request);

    expect(result.meta.reviewChunksCount).toBe(0);
  });

  it('should handle high filter risk score', async () => {
    const request = createMockLessonRequest();
    request.profile.filterRiskScore = 0.9; // Very high
    
    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(createMockGeneratedLesson());

    await generator.generateLesson(request);

    const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
    expect(callArgs.context.filterRiskScore).toBe(0.9);
  });

  it('should handle no interests', async () => {
    const request = createMockLessonRequest();
    request.profile.explicitInterests = [];
    
    vi.mocked(aiPedagogyClient.generateLesson).mockResolvedValueOnce(createMockGeneratedLesson());

    await generator.generateLesson(request);

    const callArgs = vi.mocked(aiPedagogyClient.generateLesson).mock.calls[0][0];
    expect(callArgs.context.interests).toEqual([]);
  });
});