/**
 * LingoFriends - NPC Visitor Manager Service
 *
 * Manages NPC visitors that appear in the garden to quiz players.
 * NPCs spawn periodically and offer quick translation quizzes for gem rewards.
 *
 * Features:
 * - Random spawn timing (every 5-15 minutes)
 * - Lifecycle management (spawn, interact, despawn)
 * - Random chunk selection from user's learned phrases
 * - Gem rewards for correct answers
 * - Cooldown period after answering
 *
 * @module services/npcVisitorManager
 * @see docs/phase-2-world-expansion/task-2.0-10-npc-garden-visitors.md
 */

import { chunkManager } from './chunkManager';
import { addGems } from './gemService';
import { generateNPC } from './npcGenerator';
import type { AvatarOptions } from '../renderer/types';
import type { ChunkStatus } from '../types/pedagogy';

// ============================================
// TYPES
// ============================================

/**
 * NPC character data for garden visitors.
 */
export interface NPCCharacter {
  /** Unique ID for this NPC */
  id: string;
  
  /** Display name for the NPC */
  name: string;
  
  /** Avatar visual options */
  avatar: AvatarOptions;
}

/**
 * Represents an NPC visitor in the garden.
 */
export interface NPCVisitor {
  /** Unique ID for this visitor instance */
  id: string;
  
  /** NPC character data (name, avatar, personality) */
  character: NPCCharacter;
  
  /** The phrase chunk to quiz the user on */
  chunk: ChunkForQuiz;
  
  /** Position in the garden (grid coordinates) */
  position: { x: number; y: number };
  
  /** When this visitor spawned (timestamp) */
  spawnedAt: number;
  
  /** How long this visitor stays (ms) */
  duration: number;
  
  /** Whether the user has interacted with this visitor */
  hasInteracted: boolean;
  
  /** Whether the user answered correctly */
  wasCorrect: boolean | null;
}

/**
 * A chunk formatted for quiz display.
 */
export interface ChunkForQuiz {
  /** Chunk ID */
  id: string;
  
  /** Target language phrase */
  targetPhrase: string;
  
  /** Native language translation */
  translation: string;
  
  /** Target language code */
  targetLanguage: string;
  
  /** Native language code */
  nativeLanguage: string;
}

/**
 * Result of an NPC quiz interaction.
 */
export interface NPCQuizResult {
  /** Whether the answer was correct */
  correct: boolean;
  
  /** Gems earned (0 if wrong) */
  gemsEarned: number;
  
  /** Updated visitor state */
  visitor: NPCVisitor;
}

/**
 * Configuration for NPC spawning.
 */
export interface NPCSpawnConfig {
  /** Minimum time between spawns (ms) */
  minInterval: number;
  
  /** Maximum time between spawns (ms) */
  maxInterval: number;
  
  /** How long NPC stays before despawning (ms) */
  visitorDuration: number;
  
  /** Base gems for correct answer */
  baseGems: number;
  
  /** Bonus gems for streak */
  streakBonus: number;
  
  /** Maximum visitors at once */
  maxConcurrent: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Default spawn configuration */
const DEFAULT_CONFIG: NPCSpawnConfig = {
  minInterval: 5 * 60 * 1000, // 5 minutes
  maxInterval: 15 * 60 * 1000, // 15 minutes
  visitorDuration: 2 * 60 * 1000, // 2 minutes
  baseGems: 5,
  streakBonus: 2,
  maxConcurrent: 1,
};

/** NPC names for random selection */
const NPC_NAMES = [
  'Pierre', 'Marie', 'Jacques', 'Sophie', 'Louis', 'Claire',
  'Henri', 'Emma', 'Lucas', 'Lea', 'Antoine', 'Camille',
  'Julien', 'Manon', 'Nathan', 'Chloe', 'Paul', 'Sarah',
  'Thomas', 'Alice', 'Maxime', 'Julie', 'Nicolas', 'Laura',
];

// ============================================
// SERVICE CLASS
// ============================================

/**
 * NPC Visitor Manager Service
 *
 * Singleton class that manages NPC visitors in the garden.
 */
class NPCVisitorManager {
  private config: NPCSpawnConfig;
  private visitors: Map<string, NPCVisitor> = new Map();
  private spawnTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(visitors: NPCVisitor[]) => void> = new Set();
  private userId: string | null = null;
  private currentStreak: number = 0;
  private lastAnswerTime: number = 0;

  constructor(config: Partial<NPCSpawnConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the manager for a specific user.
   * Call this when the garden loads.
   */
  initialize(userId: string): void {
    this.userId = userId;
    this.visitors.clear();
    this.currentStreak = 0;
    this.scheduleNextSpawn();
    console.log('[NPCVisitorManager] Initialized for user:', userId);
  }

  /**
   * Clean up when leaving the garden.
   */
  destroy(): void {
    if (this.spawnTimer) {
      clearTimeout(this.spawnTimer);
      this.spawnTimer = null;
    }
    this.visitors.clear();
    this.listeners.clear();
    this.userId = null;
    console.log('[NPCVisitorManager] Destroyed');
  }

  // ============================================
  // SPAWNING
  // ============================================

  /**
   * Schedule the next NPC spawn.
   */
  private scheduleNextSpawn(): void {
    if (this.spawnTimer) {
      clearTimeout(this.spawnTimer);
    }

    const delay = this.getRandomSpawnDelay();
    console.log('[NPCVisitorManager] Next spawn in', Math.round(delay / 1000), 'seconds');

    this.spawnTimer = setTimeout(() => {
      this.spawnVisitor();
      this.scheduleNextSpawn();
    }, delay);
  }

  /**
   * Get a random spawn delay within configured range.
   */
  private getRandomSpawnDelay(): number {
    return this.config.minInterval +
      Math.random() * (this.config.maxInterval - this.config.minInterval);
  }

  /**
   * Spawn a new NPC visitor in the garden.
   */
  private async spawnVisitor(): Promise<void> {
    if (!this.userId) {
      console.warn('[NPCVisitorManager] Cannot spawn: not initialized');
      return;
    }

    // Check max concurrent
    if (this.visitors.size >= this.config.maxConcurrent) {
      console.log('[NPCVisitorManager] Max concurrent visitors reached');
      return;
    }

    try {
      // Get a random chunk from user's learned phrases
      const chunk = await this.getRandomChunk();
      if (!chunk) {
        console.log('[NPCVisitorManager] No chunks available for quiz');
        return;
      }

      // Get a random NPC character
      const npcConfig = generateNPC(0, 1, Date.now());
      const character: NPCCharacter = {
        id: `npc_${Date.now()}`,
        name: this.getRandomNPCName(),
        avatar: npcConfig.avatar,
      };

      // Create visitor
      const visitor: NPCVisitor = {
        id: `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        character,
        chunk,
        position: this.getRandomPosition(),
        spawnedAt: Date.now(),
        duration: this.config.visitorDuration,
        hasInteracted: false,
        wasCorrect: null,
      };

      // Add to visitors
      this.visitors.set(visitor.id, visitor);
      console.log('[NPCVisitorManager] Spawned visitor:', visitor.character.name);

      // Notify listeners
      this.notifyListeners();

      // Schedule auto-despawn
      setTimeout(() => {
        this.despawnVisitor(visitor.id);
      }, visitor.duration);

    } catch (error) {
      console.error('[NPCVisitorManager] Failed to spawn visitor:', error);
    }
  }

  /**
   * Get a random position in the garden for the NPC.
   */
  private getRandomPosition(): { x: number; y: number } {
    // Random position in garden grid (avoid edges)
    return {
      x: 1 + Math.floor(Math.random() * 6), // 1-6
      y: 1 + Math.floor(Math.random() * 4), // 1-4
    };
  }

  /**
   * Get a random NPC name.
   */
  private getRandomNPCName(): string {
    return NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
  }

  /**
   * Get a random chunk from user's learned phrases.
   */
  private async getRandomChunk(): Promise<ChunkForQuiz | null> {
    if (!this.userId) return null;

    try {
      // Get user's acquired chunks (learned phrases)
      const acquiredChunks = await chunkManager.getChunksByStatus(this.userId, 'acquired' as ChunkStatus, 50);
      
      if (!acquiredChunks || acquiredChunks.length === 0) {
        // Fall back to learning chunks if no acquired
        const learningChunks = await chunkManager.getChunksByStatus(this.userId, 'learning' as ChunkStatus, 50);
        if (!learningChunks || learningChunks.length === 0) {
          return null;
        }
        // Pick a random chunk from learning
        const randomChunk = learningChunks[Math.floor(Math.random() * learningChunks.length)];
        return this.userChunkToQuizChunk(randomChunk);
      }

      // Pick a random chunk from acquired
      const randomChunk = acquiredChunks[Math.floor(Math.random() * acquiredChunks.length)];
      return this.userChunkToQuizChunk(randomChunk);
      
    } catch (error) {
      console.error('[NPCVisitorManager] Failed to get random chunk:', error);
      return null;
    }
  }

  /**
   * Convert a UserChunk to a ChunkForQuiz.
   */
  private userChunkToQuizChunk(userChunk: { id: string; chunkId: string; chunk?: { targetPhrase: string; translation: string; targetLanguage: string; nativeLanguage: string } }): ChunkForQuiz | null {
    if (!userChunk.chunk) return null;
    
    return {
      id: userChunk.chunkId,
      targetPhrase: userChunk.chunk.targetPhrase,
      translation: userChunk.chunk.translation,
      targetLanguage: userChunk.chunk.targetLanguage,
      nativeLanguage: userChunk.chunk.nativeLanguage,
    };
  }

  /**
   * Remove a visitor from the garden.
   */
  private despawnVisitor(visitorId: string): void {
    if (this.visitors.has(visitorId)) {
      this.visitors.delete(visitorId);
      console.log('[NPCVisitorManager] Despawned visitor:', visitorId);
      this.notifyListeners();
    }
  }

  // ============================================
  // INTERACTIONS
  // ============================================

  /**
   * Handle user answering an NPC quiz.
   */
  async answerQuiz(visitorId: string, answer: string): Promise<NPCQuizResult> {
    const visitor = this.visitors.get(visitorId);

    if (!visitor) {
      throw new Error('Visitor not found');
    }

    if (visitor.hasInteracted) {
      throw new Error('Visitor already interacted with');
    }

    // Check answer (case-insensitive)
    const correctAnswer = visitor.chunk.translation.toLowerCase().trim();
    const userAnswer = answer.toLowerCase().trim();
    const isCorrect = correctAnswer === userAnswer;

    // Calculate gems
    let gemsEarned = 0;
    if (isCorrect) {
      // Update streak
      const now = Date.now();
      if (now - this.lastAnswerTime < 5 * 60 * 1000) { // Within 5 minutes = streak
        this.currentStreak++;
      } else {
        this.currentStreak = 1;
      }
      this.lastAnswerTime = now;

      // Calculate gems with streak bonus
      gemsEarned = this.config.baseGems +
        (this.currentStreak - 1) * this.config.streakBonus;

      // Award gems using addGems function
      if (this.userId) {
        await addGems(this.userId, gemsEarned);
      }
    } else {
      // Reset streak on wrong answer
      this.currentStreak = 0;
      this.lastAnswerTime = 0;
    }

    // Update visitor state
    visitor.hasInteracted = true;
    visitor.wasCorrect = isCorrect;

    // Schedule immediate despawn after interaction
    setTimeout(() => {
      this.despawnVisitor(visitorId);
    }, 2000); // Show result for 2 seconds

    this.notifyListeners();

    return {
      correct: isCorrect,
      gemsEarned,
      visitor,
    };
  }

  /**
   * Skip/dismiss a visitor without answering.
   */
  dismissVisitor(visitorId: string): void {
    this.despawnVisitor(visitorId);
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to visitor updates.
   * Returns unsubscribe function.
   */
  subscribe(callback: (visitors: NPCVisitor[]) => void): () => void {
    this.listeners.add(callback);

    // Immediately call with current state
    callback(this.getActiveVisitors());

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    const visitors = this.getActiveVisitors();
    this.listeners.forEach(callback => callback(visitors));
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Get all active visitors.
   */
  getActiveVisitors(): NPCVisitor[] {
    return Array.from(this.visitors.values());
  }

  /**
   * Get current streak count.
   */
  getStreak(): number {
    return this.currentStreak;
  }

  /**
   * Check if there's an active visitor.
   */
  hasActiveVisitor(): boolean {
    return this.visitors.size > 0;
  }

  /**
   * Get a specific visitor by ID.
   */
  getVisitor(visitorId: string): NPCVisitor | undefined {
    return this.visitors.get(visitorId);
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const npcVisitorManager = new NPCVisitorManager();
export default npcVisitorManager;