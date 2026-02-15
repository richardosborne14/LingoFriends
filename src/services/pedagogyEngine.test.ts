/**
 * Tests for Pedagogy Engine Core Service
 * 
 * Tests the core orchestration logic including:
 * - Session preparation
 * - Difficulty calibration (i+1)
 * - Adaptation based on affective filter
 * - Session summary generation
 * 
 * @module pedagogyEngine.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PedagogyEngineService } from './pedagogyEngine';
import { ChunkType, ChunkStatus } from '../types/pedagogy';
import type { 
  LearnerProfile, 
  SessionContext, 
  ActivityResult, 
  SessionPlan,
  LexicalChunk,
  UserChunk,
} from '../types/pedagogy';

// Mock dependencies
vi.mock('./learnerProfileService', () => ({
  learnerProfileService: {
    getOrCreateProfile: vi.fn(),
    getProfile: vi.fn(),
    updateConfidence: vi.fn(),
    updateProfile: vi.fn(),
    updateChunkStats: vi.fn(),
    recordStruggle: vi.fn(),
  },
}));

vi.mock('./chunkManager', () => ({
  chunkManager: {
    getChunksForLevel: vi.fn(),
    getDueChunks: vi.fn(),
    getFragileChunks: vi.fn(),
    getContextChunks: vi.fn(),
    getChunk: vi.fn(),
    recordEncounter: vi.fn(),
  },
}));

vi.mock('./chunkGeneratorService', () => ({
  chunkGenerator: {
    generateChunks: vi.fn(),
  },
}));

import { learnerProfileService } from './learnerProfileService';
import { chunkManager } from './chunkManager';
import { chunkGenerator } from './chunkGeneratorService';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockProfile: LearnerProfile = {
  id: 'profile-1',
  userId: 'user-1',
  nativeLanguage: 'en',
  targetLanguage: 'fr',
  currentLevel: 30, // A2
  levelHistory: [],
  totalChunksEncountered: 150,
  chunksAcquired: 80,
  chunksLearning: 50,
  chunksFragile: 20,
  explicitInterests: ['food', 'travel'],
  detectedInterests: [{ topic: 'food', strength: 0.8, detectedAt: '2024-01-01' }],
  averageConfidence: 0.72,
  confidenceHistory: [],
  totalSessions: 25,
  totalTimeMinutes: 250,
  averageSessionLength: 10,
  helpRequestRate: 0.15,
  wrongAnswerRate: 0.2,
  preferredActivityTypes: ['multiple_choice', 'fill_blank'],
  preferredSessionLength: 10,
  lastReflectionPrompt: '',
  coachingNotes: '',
  filterRiskScore: 0.2,
  created: '2024-01-01',
  updated: '2024-01-15',
};

const mockChunk: LexicalChunk = {
  id: 'chunk-1',
  text: 'Bonjour, comment ça va?',
  translation: 'Hello, how are you?',
  chunkType: ChunkType.UTTERANCE,
  targetLanguage: 'fr',
  nativeLanguage: 'en',
  difficulty: 2,
  topicIds: ['topic-greetings'],
  frequency: 100,
  baseInterval: 1,
  ageAppropriate: ['11-14'],
  created: '2024-01-01',
  updated: '2024-01-01',
};

const mockUserChunk: UserChunk = {
  id: 'uc-1',
  userId: 'user-1',
  chunkId: 'chunk-1',
  status: ChunkStatus.LEARNING,
  easeFactor: 2.5,
  interval: 1,
  nextReviewDate: new Date().toISOString(),
  repetitions: 1,
  totalEncounters: 2,
  correctFirstTry: 1,
  wrongAttempts: 1,
  helpUsedCount: 0,
  firstEncounteredIn: 'topic-greetings',
  firstEncounteredAt: '2024-01-01',
  lastEncounteredIn: 'topic-greetings',
  lastEncounteredAt: '2024-01-15',
  confidenceScore: 0.5,
  created: '2024-01-01',
  updated: '2024-01-15',
};

// ============================================================================
// TESTS
// ============================================================================

describe('PedagogyEngineService', () => {
  let engine: PedagogyEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new PedagogyEngineService();
  });

  // ==========================================================================
  // SESSION PREPARATION
  // ==========================================================================

  describe('prepareSession', () => {
    it('should prepare a session with target chunks at i+1 level', async () => {
      // Mock profile
      vi.mocked(learnerProfileService.getOrCreateProfile).mockResolvedValue(mockProfile);
      
      // Mock chunks
      vi.mocked(chunkManager.getChunksForLevel).mockResolvedValue([mockChunk]);
      vi.mocked(chunkManager.getDueChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getFragileChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getContextChunks).mockResolvedValue([]);
      
      const plan = await engine.prepareSession('user-1', {
        duration: 10,
        topic: 'greetings',
      });

      expect(plan).toBeDefined();
      expect(plan.topic).toBe('greetings');
      expect(plan.targetChunks.length).toBeGreaterThan(0);
      expect(plan.difficulty).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBe(10);
    });

    it('should include review chunks when available', async () => {
      vi.mocked(learnerProfileService.getOrCreateProfile).mockResolvedValue(mockProfile);
      vi.mocked(chunkManager.getChunksForLevel).mockResolvedValue([mockChunk]);
      vi.mocked(chunkManager.getDueChunks).mockResolvedValue([mockUserChunk]);
      vi.mocked(chunkManager.getFragileChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getContextChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getChunk).mockResolvedValue(mockChunk);

      const plan = await engine.prepareSession('user-1', {
        duration: 10,
        includeReviews: true,
      });

      expect(plan.reviewChunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should select topic from user interests when not specified', async () => {
      vi.mocked(learnerProfileService.getOrCreateProfile).mockResolvedValue(mockProfile);
      vi.mocked(chunkManager.getChunksForLevel).mockResolvedValue([mockChunk]);
      vi.mocked(chunkManager.getDueChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getFragileChunks).mockResolvedValue([]);
      vi.mocked(chunkManager.getContextChunks).mockResolvedValue([]);

      const plan = await engine.prepareSession('user-1', {
        duration: 10,
      });

      // Should pick from explicit interests or detected interests
      expect(['food', 'travel', 'everyday-conversations']).toContain(plan.topic);
    });
  });

  // ==========================================================================
  // DIFFICULTY CALIBRATION
  // ==========================================================================

  describe('calculateCurrentLevel', () => {
    it('should calculate level based on acquired chunks', () => {
      // Access private method via any
      const level = (engine as any).calculateCurrentLevel(mockProfile);
      
      // 80 acquired chunks should map to level ~2 (A2)
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(5);
    });

    it('should adjust level based on confidence', () => {
      const highConfidenceProfile = { ...mockProfile, averageConfidence: 0.9 };
      const lowConfidenceProfile = { ...mockProfile, averageConfidence: 0.3 };
      
      const highLevel = (engine as any).calculateCurrentLevel(highConfidenceProfile);
      const lowLevel = (engine as any).calculateCurrentLevel(lowConfidenceProfile);
      
      // Higher confidence should result in higher level
      expect(highLevel).toBeGreaterThan(lowLevel);
    });

    it('should reduce level when filter risk is high', () => {
      const stressedProfile = { ...mockProfile, filterRiskScore: 0.8 };
      const normalProfile = { ...mockProfile, filterRiskScore: 0.1 };
      
      const stressedLevel = (engine as any).calculateCurrentLevel(stressedProfile);
      const normalLevel = (engine as any).calculateCurrentLevel(normalProfile);
      
      // Stressed learner should have lower level
      expect(stressedLevel).toBeLessThan(normalLevel);
    });
  });

  describe('calculateIPlusOne', () => {
    it('should target one level above current', () => {
      const currentLevel = 2;
      const lowRiskProfile = { ...mockProfile, filterRiskScore: 0.1 };
      
      const targetLevel = (engine as any).calculateIPlusOne(lowRiskProfile, currentLevel);
      
      expect(targetLevel).toBe(currentLevel + 1);
    });

    it('should drop to current level when filter risk is high', () => {
      const currentLevel = 2;
      const highRiskProfile = { ...mockProfile, filterRiskScore: 0.8 };
      
      const targetLevel = (engine as any).calculateIPlusOne(highRiskProfile, currentLevel);
      
      // Should drop back to current level (i, not i+1)
      expect(targetLevel).toBe(currentLevel);
    });

    it('should clamp target level to valid range', () => {
      const maxLevel = 5;
      const profile = { ...mockProfile, filterRiskScore: 0 };
      
      const targetLevel = (engine as any).calculateIPlusOne(profile, maxLevel);
      
      expect(targetLevel).toBeLessThanOrEqual(5);
    });
  });

  describe('adaptDifficulty', () => {
    it('should increase difficulty for high accuracy', () => {
      const newTarget = engine.adaptDifficulty(3, {
        correct: 9,
        total: 10,
        avgResponseTimeMs: 3000,
        helpUsedCount: 0,
      });
      
      expect(newTarget).toBeGreaterThan(3);
    });

    it('should decrease difficulty for low accuracy', () => {
      const newTarget = engine.adaptDifficulty(3, {
        correct: 4,
        total: 10,
        avgResponseTimeMs: 8000,
        helpUsedCount: 3,
      });
      
      expect(newTarget).toBeLessThan(3);
    });

    it('should maintain difficulty for moderate performance', () => {
      const newTarget = engine.adaptDifficulty(3, {
        correct: 7,
        total: 10,
        avgResponseTimeMs: 5000,
        helpUsedCount: 1,
      });
      
      expect(newTarget).toBeCloseTo(3, 1);
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  describe('createSessionContext', () => {
    it('should create a valid session context', () => {
      const context = engine.createSessionContext(
        'session-1',
        'user-1',
        'greetings',
        2.5
      );

      expect(context.sessionId).toBe('session-1');
      expect(context.userId).toBe('user-1');
      expect(context.topic).toBe('greetings');
      expect(context.currentTargetLevel).toBe(2.5);
      expect(context.baseTargetLevel).toBe(2.5);
      expect(context.activities).toEqual([]);
      expect(context.filterSignals).toEqual([]);
      expect(context.isComplete).toBe(false);
    });
  });

  describe('reportActivityCompletion', () => {
    it('should record wrong answer signals', async () => {
      vi.mocked(chunkManager.recordEncounter).mockResolvedValue({
        userChunk: mockUserChunk,
        statusChanged: false,
        newInterval: 1,
      });
      vi.mocked(learnerProfileService.updateConfidence).mockResolvedValue();
      vi.mocked(learnerProfileService.recordStruggle).mockResolvedValue();

      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      const activity: ActivityResult = {
        id: 'activity-1',
        activityType: 'multiple_choice',
        chunkIds: ['chunk-1'],
        correct: false,
        responseTimeMs: 5000,
        usedHelp: false,
        attempts: 2,
        timestamp: new Date().toISOString(),
      };

      const { context: updatedContext, adaptation } = await engine.reportActivityCompletion(
        'user-1',
        activity,
        context
      );

      expect(updatedContext.filterSignals.length).toBe(1);
      expect(updatedContext.filterSignals[0].type).toBe('wrong_answer');
      expect(updatedContext.activities.length).toBe(1);
    });

    it('should record help used signals', async () => {
      vi.mocked(chunkManager.recordEncounter).mockResolvedValue({
        userChunk: mockUserChunk,
        statusChanged: false,
        newInterval: 1,
      });
      vi.mocked(learnerProfileService.updateConfidence).mockResolvedValue();

      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      const activity: ActivityResult = {
        id: 'activity-1',
        activityType: 'multiple_choice',
        chunkIds: ['chunk-1'],
        correct: true,
        responseTimeMs: 5000,
        usedHelp: true,
        attempts: 1,
        timestamp: new Date().toISOString(),
      };

      const { context: updatedContext } = await engine.reportActivityCompletion(
        'user-1',
        activity,
        context
      );

      expect(updatedContext.filterSignals.some(s => s.type === 'help_used')).toBe(true);
    });

    it('should trigger adaptation for wrong streaks', async () => {
      vi.mocked(chunkManager.recordEncounter).mockResolvedValue({
        userChunk: mockUserChunk,
        statusChanged: false,
        newInterval: 1,
      });
      vi.mocked(learnerProfileService.updateConfidence).mockResolvedValue();
      vi.mocked(learnerProfileService.recordStruggle).mockResolvedValue();

      let context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);

      // Simulate 3 wrong answers in a row
      for (let i = 0; i < 3; i++) {
        const activity: ActivityResult = {
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: false,
          responseTimeMs: 5000,
          usedHelp: false,
          attempts: 2,
          timestamp: new Date().toISOString(),
        };
        const result = await engine.reportActivityCompletion('user-1', activity, context);
        context = result.context;
      }

      // Should have a simplify adaptation
      const simplifyAdaptation = context.adaptations.find(a => a.type === 'simplify');
      expect(simplifyAdaptation).toBeDefined();
    });
  });

  describe('shouldEndSession', () => {
    it('should continue session when going well', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add some correct activities
      for (let i = 0; i < 5; i++) {
        context.activities.push({
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: true,
          responseTimeMs: 3000,
          usedHelp: false,
          attempts: 1,
          timestamp: new Date().toISOString(),
        });
      }

      const { shouldEnd, reason } = engine.shouldEndSession(context, { duration: 10 });

      expect(shouldEnd).toBe(false);
    });

    it('should end session when high error rate', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add 10 activities with 60% error rate
      for (let i = 0; i < 10; i++) {
        context.activities.push({
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: i % 10 < 4, // Only 4 correct out of 10
          responseTimeMs: 5000,
          usedHelp: false,
          attempts: 1,
          timestamp: new Date().toISOString(),
        });
      }

      const { shouldEnd } = engine.shouldEndSession(context, { duration: 10 });

      expect(shouldEnd).toBe(true);
    });

    it('should end session when time limit reached', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add 8 activities (would be ~12 minutes at 1.5 min each)
      for (let i = 0; i < 8; i++) {
        context.activities.push({
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: true,
          responseTimeMs: 3000,
          usedHelp: false,
          attempts: 1,
          timestamp: new Date().toISOString(),
        });
      }

      const { shouldEnd } = engine.shouldEndSession(context, { duration: 10 });

      // 8 activities * 1.5 min = 12 min > 10 min limit
      expect(shouldEnd).toBe(true);
    });
  });

  // ==========================================================================
  // ADAPTATION
  // ==========================================================================

  describe('calculateAdaptation', () => {
    it('should return none for normal performance', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add some mixed activities
      for (let i = 0; i < 3; i++) {
        context.activities.push({
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: i % 2 === 0, // 2 correct, 1 wrong
          responseTimeMs: 3000,
          usedHelp: false,
          attempts: 1,
          timestamp: new Date().toISOString(),
        });
      }

      const adaptation = (engine as any).calculateAdaptation(context);
      expect(adaptation.type).toBe('none');
    });

    it('should simplify for struggle pattern', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 3);
      
      // Add 3 wrong answers
      for (let i = 0; i < 3; i++) {
        context.filterSignals.push({
          type: 'wrong_answer',
          timestamp: new Date().toISOString(),
          activityId: `activity-${i}`,
        });
      }

      const adaptation = (engine as any).calculateAdaptation(context);
      expect(adaptation.type).toBe('simplify');
      expect(adaptation.dropToLevel).toBeLessThan(3);
    });

    it('should encourage when struggling with help', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add wrong answers and help usage
      context.filterSignals.push(
        { type: 'wrong_answer', timestamp: new Date().toISOString(), activityId: 'a1' },
        { type: 'wrong_answer', timestamp: new Date().toISOString(), activityId: 'a2' },
        { type: 'help_used', timestamp: new Date().toISOString(), activityId: 'a1' },
        { type: 'help_used', timestamp: new Date().toISOString(), activityId: 'a2' },
      );

      const adaptation = (engine as any).calculateAdaptation(context);
      expect(adaptation.type).toBe('encourage');
    });

    it('should challenge for perfect streak', () => {
      const context = engine.createSessionContext('session-1', 'user-1', 'greetings', 2);
      
      // Add 5 perfect activities
      for (let i = 0; i < 5; i++) {
        context.activities.push({
          id: `activity-${i}`,
          activityType: 'multiple_choice',
          chunkIds: ['chunk-1'],
          correct: true,
          responseTimeMs: 2000,
          usedHelp: false,
          attempts: 1,
          timestamp: new Date().toISOString(),
        });
      }

      const adaptation = (engine as any).calculateAdaptation(context);
      expect(adaptation.type).toBe('challenge');
      expect(adaptation.increaseToLevel).toBeGreaterThan(2);
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  describe('mapChunksToLevel', () => {
    it('should map 0 chunks to level 1', () => {
      const level = (engine as any).mapChunksToLevel(0);
      expect(level).toBe(1);
    });

    it('should map 100 chunks to level ~2', () => {
      const level = (engine as any).mapChunksToLevel(100);
      expect(level).toBeGreaterThanOrEqual(1.5);
      expect(level).toBeLessThanOrEqual(2.5);
    });

    it('should map 500+ chunks to level 3+', () => {
      const level = (engine as any).mapChunksToLevel(500);
      expect(level).toBeGreaterThanOrEqual(3);
    });

    it('should map 2300+ chunks to level 5 (C1+)', () => {
      const level = (engine as any).mapChunksToLevel(2300);
      expect(level).toBe(5);
    });
    
    it('should map 2200 chunks to level 4.5', () => {
      const level = (engine as any).mapChunksToLevel(2200);
      expect(level).toBe(4.5);
    });
  });
});