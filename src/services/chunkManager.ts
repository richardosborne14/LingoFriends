/**
 * LingoFriends - Chunk Manager Service
 * 
 * Manages the chunk library for the Pedagogy Engine. This service handles:
 * - Querying chunks by difficulty, topic, and other criteria
 * - SRS (Spaced Repetition System) scheduling using SM-2 algorithm
 * - Chunk status management (new, learning, acquired, fragile)
 * - Recording encounters and updating SRS parameters
 * 
 * The Chunk Manager is the data layer for the Pedagogy Engine,
 * while chunkGeneratorService handles content generation.
 * 
 * @module chunkManager
 * @see docs/phase-1.2/task-1.2-5-pedagogy-engine-core.md
 * @see docs/phase-1.2/task-1.2-10-chunk-srs.md
 */

import { pb } from '../../services/pocketbaseService';
import type {
  LexicalChunk,
  UserChunk,
  ChunkStatus,
} from '../types/pedagogy';
import { determineChunkStatus, getInitialEaseFactor } from '../types/pedagogy';
import type {
  ChunkLibraryRecord,
  UserChunkRecord,
} from '../types/pocketbase';
import {
  chunkRecordToLexicalChunk,
  userChunkRecordToUserChunk,
} from '../types/pocketbase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for searching chunks in the library.
 */
export interface ChunkSearchOptions {
  /** Topic ID to filter by */
  topic?: string;
  
  /** Difficulty range [min, max] */
  difficulty?: [number, number];
  
  /** Target language code */
  language: string;
  
  /** Maximum number of chunks to return */
  limit: number;
  
  /** Exclude chunk IDs (already seen, etc.) */
  excludeIds?: string[];
  
  /** Age group filter */
  ageGroup?: string;
  
  /** Chunk types to include */
  chunkTypes?: string[];
}

/**
 * Result of recording an encounter with a chunk.
 */
export interface EncounterResult {
  /** Updated UserChunk record */
  userChunk: UserChunk;
  
  /** Whether the status changed */
  statusChanged: boolean;
  
  /** Previous status (if changed) */
  previousStatus?: ChunkStatus;
  
  /** New interval in days */
  newInterval: number;
}

/**
 * Statistics about a user's chunks.
 */
export interface ChunkStats {
  /** Total chunks encountered */
  total: number;
  
  /** Chunks by status */
  byStatus: {
    new: number;
    learning: number;
    acquired: number;
    fragile: number;
  };
  
  /** Chunks due for review */
  dueForReview: number;
  
  /** Average ease factor */
  avgEaseFactor: number;
}

// ============================================================================
// SM-2 ALGORITHM CONSTANTS
// ============================================================================

/**
 * SM-2 Spaced Repetition Algorithm parameters.
 * 
 * The SM-2 algorithm schedules reviews based on:
 * - Ease Factor (EF): How easy the item is (1.3-2.5, starts at 2.5)
 * - Interval: Days until next review
 * - Repetitions: Consecutive successful reviews
 * 
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

/** Minimum ease factor (very difficult items) */
const MIN_EASE_FACTOR = 1.3;

/** Maximum ease factor (very easy items) */
const MAX_EASE_FACTOR = 2.5;

/** Default ease factor for new items */
const DEFAULT_EASE_FACTOR = 2.5;

/** Ease factor change on correct answer */
const EF_CORRECT_BONUS = 0.1;

/** Ease factor change on wrong answer */
const EF_WRONG_PENALTY = 0.2;

/** First interval after first successful review (days) */
const FIRST_INTERVAL = 1;

/** Second interval (days) after second successful review */
const SECOND_INTERVAL = 3;

// ============================================================================
// CHUNK MANAGER SERVICE
// ============================================================================

/**
 * Chunk Manager Service
 * 
 * Provides methods for querying and managing chunks in the learning system.
 * This service focuses on the data layer - retrieving chunks, updating SRS
 * state, and tracking chunk status.
 * 
 * For AI-generated chunks, use chunkGeneratorService instead.
 */
export class ChunkManagerService {
  
  // ==========================================================================
  // CHUNK QUERIES
  // ==========================================================================
  
  /**
   * Get chunks at a specific difficulty level for a topic.
   * Used when preparing i+1 content for a learner.
   * 
   * @param userId - User ID to exclude already-seen chunks
   * @param topic - Topic ID to search within
   * @param level - Target difficulty level (1-5)
   * @param count - Maximum chunks to return
   * @returns Array of chunks at the target level
   */
  async getChunksForLevel(
    userId: string,
    topic: string,
    level: number,
    count: number
  ): Promise<LexicalChunk[]> {
    try {
      // Get user's seen chunks to exclude
      const seenChunkIds = await this.getSeenChunkIds(userId);
      
      // Build filter
      const filterParts: string[] = [
        `difficulty >= ${Math.max(1, level - 0.5)}`,
        `difficulty <= ${Math.min(5, level + 0.5)}`,
      ];
      
      // Add topic filter if provided
      if (topic) {
        filterParts.push(`topics ~ "${topic}"`);
      }
      
      // Exclude seen chunks (limit to avoid query too long)
      if (seenChunkIds.length > 0 && seenChunkIds.length < 100) {
        const excludeFilter = seenChunkIds.map(id => `id != "${id}"`).join(' && ');
        filterParts.push(`(${excludeFilter})`);
      }
      
      const filter = filterParts.join(' && ');
      
      const records = await pb.collection('chunk_library').getList<ChunkLibraryRecord>(1, count, {
        filter,
        sort: 'frequency', // Prefer more common chunks
      });
      
      return records.items.map(chunkRecordToLexicalChunk);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting chunks for level:', error);
      return [];
    }
  }
  
  /**
   * Get chunks due for SRS review.
   * These are chunks whose next_review_date has passed.
   * 
   * @param userId - User ID
   * @param count - Maximum chunks to return
   * @returns Array of UserChunks with chunk data populated
   */
  async getDueChunks(userId: string, count: number = 10): Promise<UserChunk[]> {
    try {
      const now = new Date().toISOString();
      
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, count, {
        filter: `user = "${userId}" && next_review_date <= "${now}" && status != "new"`,
        sort: 'next_review_date', // Most overdue first
        expand: 'chunk', // Populate chunk data
      });
      
      return records.items.map(userChunkRecordToUserChunk);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting due chunks:', error);
      return [];
    }
  }
  
  /**
   * Get fragile chunks that need reinforcement.
   * Fragile chunks have been acquired but are starting to decay.
   * 
   * @param userId - User ID
   * @param count - Maximum chunks to return
   * @returns Array of UserChunks with status "fragile"
   */
  async getFragileChunks(userId: string, count: number = 5): Promise<UserChunk[]> {
    try {
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, count, {
        filter: `user = "${userId}" && status = "fragile"`,
        // No sort — 'updated' is a virtual column that can't be sorted without an explicit index.
        // Fragile chunk order doesn't affect correctness; all fragile chunks surface for review.
        expand: 'chunk',
      });
      
      return records.items.map(userChunkRecordToUserChunk);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting fragile chunks:', error);
      return [];
    }
  }
  
  /**
   * Get chunks that are acquired and can be used for context.
   * Context chunks provide familiar scaffolding around new content.
   * 
   * @param userId - User ID
   * @param topic - Topic ID (optional filter)
   * @param count - Maximum chunks to return
   * @returns Array of LexicalChunks that are acquired
   */
  async getContextChunks(
    userId: string,
    topic: string | undefined,
    count: number
  ): Promise<LexicalChunk[]> {
    try {
      // Get user chunks with status "acquired"
      let filter = `user = "${userId}" && status = "acquired"`;
      
      const userChunks = await pb.collection('user_chunks').getList<UserChunkRecord>(1, count * 2, {
        filter,
        sort: '-confidence_score', // Highest confidence first
        expand: 'chunk',
      });
      
      // Extract chunks from expanded data
      let chunks = userChunks.items
        .filter(uc => uc.expand?.chunk)
        .map(uc => chunkRecordToLexicalChunk(uc.expand!.chunk as ChunkLibraryRecord));
      
      // Filter by topic if provided
      if (topic) {
        chunks = chunks.filter(c => c.topicIds.includes(topic));
      }
      
      return chunks.slice(0, count);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting context chunks:', error);
      return [];
    }
  }
  
  /**
   * Search chunks in the library with various filters.
   * 
   * @param options - Search options
   * @returns Array of matching chunks
   */
  async searchChunks(options: ChunkSearchOptions): Promise<LexicalChunk[]> {
    try {
      const filterParts: string[] = [];
      
      // Language filter (required)
      filterParts.push(`target_language = "${options.language}"`);
      
      // Topic filter
      if (options.topic) {
        filterParts.push(`topics ~ "${options.topic}"`);
      }
      
      // Difficulty range
      if (options.difficulty) {
        filterParts.push(`difficulty >= ${options.difficulty[0]}`);
        filterParts.push(`difficulty <= ${options.difficulty[1]}`);
      }
      
      // Age group filter
      if (options.ageGroup) {
        filterParts.push(`age_appropriate ~ "${options.ageGroup}"`);
      }
      
      // Chunk types filter
      if (options.chunkTypes && options.chunkTypes.length > 0) {
        const typeFilter = options.chunkTypes.map(t => `chunk_type = "${t}"`).join(' || ');
        filterParts.push(`(${typeFilter})`);
      }
      
      // Exclude IDs
      if (options.excludeIds && options.excludeIds.length > 0 && options.excludeIds.length < 100) {
        const excludeFilter = options.excludeIds.map(id => `id != "${id}"`).join(' && ');
        filterParts.push(`(${excludeFilter})`);
      }
      
      const filter = filterParts.join(' && ');
      
      const records = await pb.collection('chunk_library').getList<ChunkLibraryRecord>(1, options.limit, {
        filter,
        sort: 'frequency', // Prefer common chunks
      });
      
      return records.items.map(chunkRecordToLexicalChunk);
      
    } catch (error) {
      console.error('[ChunkManager] Error searching chunks:', error);
      return [];
    }
  }
  
  /**
   * Get chunks by status for a user.
   * 
   * @param userId - User ID
   * @param status - Status to filter by
   * @param count - Maximum chunks to return
   * @returns Array of UserChunks
   */
  async getChunksByStatus(
    userId: string,
    status: ChunkStatus,
    count: number = 20
  ): Promise<UserChunk[]> {
    try {
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, count, {
        filter: `user = "${userId}" && status = "${status}"`,
        // No sort — 'updated' is a virtual column that returns 400 without an explicit index.
        // Results arrive in PB's natural order which is acceptable for decay processing.
        expand: 'chunk',
      });
      
      return records.items.map(userChunkRecordToUserChunk);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting chunks by status:', error);
      return [];
    }
  }
  
  /**
   * Get user's chunks for a specific topic.
   * 
   * @param userId - User ID
   * @param topic - Topic ID
   * @param count - Maximum chunks to return
   * @returns Array of UserChunks related to the topic
   */
  async getUserChunksForTopic(
    userId: string,
    topic: string,
    count: number = 20
  ): Promise<UserChunk[]> {
    try {
      // First get chunks for the topic
      const chunkRecords = await pb.collection('chunk_library').getList<ChunkLibraryRecord>(1, 100, {
        filter: `topics ~ "${topic}"`,
      });
      
      const chunkIds = chunkRecords.items.map(c => c.id);
      
      if (chunkIds.length === 0) {
        return [];
      }
      
      // Then get user_chunks for those chunks
      // Build filter for chunk IDs (in batches if needed)
      const userChunks: UserChunk[] = [];
      const batchSize = 50;
      
      for (let i = 0; i < chunkIds.length; i += batchSize) {
        const batch = chunkIds.slice(i, i + batchSize);
        const chunkFilter = batch.map(id => `chunk = "${id}"`).join(' || ');
        
        const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, count, {
          filter: `user = "${userId}" && (${chunkFilter})`,
          expand: 'chunk',
        });
        
        userChunks.push(...records.items.map(userChunkRecordToUserChunk));
        
        if (userChunks.length >= count) {
          break;
        }
      }
      
      return userChunks.slice(0, count);
      
    } catch (error) {
      console.error('[ChunkManager] Error getting user chunks for topic:', error);
      return [];
    }
  }
  
  /**
   * Get a single chunk by ID.
   * 
   * @param chunkId - Chunk ID
   * @returns LexicalChunk or null
   */
  async getChunk(chunkId: string): Promise<LexicalChunk | null> {
    try {
      const record = await pb.collection('chunk_library').getOne<ChunkLibraryRecord>(chunkId);
      return chunkRecordToLexicalChunk(record);
    } catch (error) {
      console.error('[ChunkManager] Error getting chunk:', error);
      return null;
    }
  }
  
  /**
   * Get a user's chunk record for a specific chunk.
   * 
   * @param userId - User ID
   * @param chunkId - Chunk ID
   * @returns UserChunk or null
   */
  async getUserChunk(userId: string, chunkId: string): Promise<UserChunk | null> {
    try {
      const record = await pb.collection('user_chunks').getFirstListItem<UserChunkRecord>(
        `user = "${userId}" && chunk = "${chunkId}"`
      );
      return userChunkRecordToUserChunk(record);
    } catch {
      return null;
    }
  }
  
  // ==========================================================================
  // SRS OPERATIONS
  // ==========================================================================
  
  /**
   * Record an encounter with a chunk.
   * This is the main SRS update method.
   * 
   * Updates:
   * - SRS parameters (ease factor, interval, next review date)
   * - Status (new → learning, learning → acquired, acquired → fragile, etc.)
   * - Encounter counts
   * 
   * @param userId - User ID
   * @param chunkId - Chunk ID
   * @param result - Result of the encounter
   * @returns Updated UserChunk and status change info
   */
  async recordEncounter(
    userId: string,
    chunkId: string,
    result: {
      correct: boolean;
      timeToAnswerMs: number;
      usedHelp: boolean;
    }
  ): Promise<EncounterResult> {
    try {
      // Get or create user_chunks record
      let userChunk = await this.getUserChunk(userId, chunkId);
      const isNew = !userChunk;
      
      if (isNew) {
        // Create new user_chunk record
        userChunk = await this.createUserChunk(userId, chunkId);
      }
      
      const previousStatus = userChunk!.status;
      
      // Calculate new SRS parameters using SM-2 algorithm
      const { newEaseFactor, newInterval, newRepetitions } = this.calculateSRSUpdate(
        userChunk!.easeFactor,
        userChunk!.interval,
        userChunk!.repetitions,
        result.correct
      );
      
      // Calculate next review date
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      
      // Determine new status
      const daysSinceLastEncounter = userChunk!.lastEncounteredAt
        ? Math.floor((Date.now() - new Date(userChunk!.lastEncounteredAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const newStatus = determineChunkStatus(
        newRepetitions,
        newEaseFactor,
        daysSinceLastEncounter,
        newInterval
      );
      
      // Update encounter counts
      const newCorrectFirstTry = result.correct && !result.usedHelp
        ? userChunk!.correctFirstTry + 1
        : userChunk!.correctFirstTry;
      
      const newWrongAttempts = result.correct ? userChunk!.wrongAttempts : userChunk!.wrongAttempts + 1;
      const newHelpUsedCount = result.usedHelp ? userChunk!.helpUsedCount + 1 : userChunk!.helpUsedCount;
      
      // Calculate new confidence score
      const newConfidenceScore = this.calculateConfidence(
        newCorrectFirstTry,
        userChunk!.totalEncounters + 1,
        newHelpUsedCount
      );
      
      // Update the record
      const updatedRecord = await pb.collection('user_chunks').update<UserChunkRecord>(
        userChunk!.id,
        {
          status: newStatus,
          ease_factor: newEaseFactor,
          interval: newInterval,
          next_review_date: nextReviewDate.toISOString(),
          repetitions: newRepetitions,
          total_encounters: userChunk!.totalEncounters + 1,
          correct_first_try: newCorrectFirstTry,
          wrong_attempts: newWrongAttempts,
          help_used_count: newHelpUsedCount,
          confidence_score: newConfidenceScore,
          last_encountered_at: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
      );
      
      const updatedUserChunk = userChunkRecordToUserChunk(updatedRecord);
      
      return {
        userChunk: updatedUserChunk,
        statusChanged: previousStatus !== newStatus,
        previousStatus: previousStatus !== newStatus ? previousStatus : undefined,
        newInterval,
      };
      
    } catch (error) {
      console.error('[ChunkManager] Error recording encounter:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics about a user's chunks.
   * 
   * @param userId - User ID
   * @returns Chunk statistics
   */
  async getChunkStats(userId: string): Promise<ChunkStats> {
    try {
      const now = new Date().toISOString();
      
      // Get counts by status
      const [newCount, learningCount, acquiredCount, fragileCount, dueCount, totalResult] = await Promise.all([
        pb.collection('user_chunks').getList(1, 1, { filter: `user = "${userId}" && status = "new"` })
          .then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, { filter: `user = "${userId}" && status = "learning"` })
          .then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, { filter: `user = "${userId}" && status = "acquired"` })
          .then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, { filter: `user = "${userId}" && status = "fragile"` })
          .then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, {
          filter: `user = "${userId}" && next_review_date <= "${now}" && status != "new"`
        }).then(r => r.totalItems),
        pb.collection('user_chunks').getList(1, 1, { filter: `user = "${userId}"` })
          .then(r => r.totalItems),
      ]);
      
      // Get average ease factor
      let avgEaseFactor = DEFAULT_EASE_FACTOR;
      try {
        // This is a simplified approach - ideally we'd use aggregation
        const recentChunks = await pb.collection('user_chunks').getList<UserChunkRecord>(1, 50, {
          filter: `user = "${userId}"`,
          // No sort — 'updated' is a virtual column that returns 400 without an explicit index.
          // Any 50 chunks are fine for computing the average ease factor.
        });
        
        if (recentChunks.items.length > 0) {
          const totalEF = recentChunks.items.reduce((sum, uc) => sum + uc.ease_factor, 0);
          avgEaseFactor = totalEF / recentChunks.items.length;
        }
      } catch {
        // Use default
      }
      
      return {
        total: totalResult,
        byStatus: {
          new: newCount,
          learning: learningCount,
          acquired: acquiredCount,
          fragile: fragileCount,
        },
        dueForReview: dueCount,
        avgEaseFactor,
      };
      
    } catch (error) {
      console.error('[ChunkManager] Error getting chunk stats:', error);
      return {
        total: 0,
        byStatus: { new: 0, learning: 0, acquired: 0, fragile: 0 },
        dueForReview: 0,
        avgEaseFactor: DEFAULT_EASE_FACTOR,
      };
    }
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  /**
   * Get IDs of chunks the user has already seen.
   */
  private async getSeenChunkIds(userId: string): Promise<string[]> {
    try {
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, 200, {
        filter: `user = "${userId}"`,
        fields: 'chunk', // Only get chunk IDs
      });
      
      return records.items.map(uc => uc.chunk);
    } catch {
      return [];
    }
  }
  
  /**
   * Create a new user_chunks record for a first encounter.
   */
  private async createUserChunk(userId: string, chunkId: string): Promise<UserChunk> {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Get chunk's base interval
    let baseInterval = 1;
    try {
      const chunk = await pb.collection('chunk_library').getOne<ChunkLibraryRecord>(chunkId);
      baseInterval = chunk.base_interval || 1;
    } catch {
      // Use default
    }
    
    const record = await pb.collection('user_chunks').create<UserChunkRecord>({
      user: userId,
      chunk: chunkId,
      status: 'new',
      ease_factor: getInitialEaseFactor(),
      interval: baseInterval,
      next_review_date: tomorrow,
      repetitions: 0,
      total_encounters: 0,
      correct_first_try: 0,
      wrong_attempts: 0,
      help_used_count: 0,
      first_encountered_at: now,
      last_encountered_at: now,
      confidence_score: 0.5,
    });
    
    return userChunkRecordToUserChunk(record);
  }
  
  /**
   * Calculate SRS update using SM-2 algorithm.
   * 
   * @param currentEF - Current ease factor
   * @param currentInterval - Current interval in days
   * @param repetitions - Current consecutive successful reviews
   * @param correct - Whether this answer was correct
   * @returns New SRS parameters
   */
  private calculateSRSUpdate(
    currentEF: number,
    currentInterval: number,
    repetitions: number,
    correct: boolean
  ): { newEaseFactor: number; newInterval: number; newRepetitions: number } {
    if (correct) {
      // Correct answer: increase interval
      let newInterval: number;
      let newRepetitions = repetitions + 1;
      
      if (newRepetitions === 1) {
        newInterval = FIRST_INTERVAL;
      } else if (newRepetitions === 2) {
        newInterval = SECOND_INTERVAL;
      } else {
        newInterval = Math.round(currentInterval * currentEF);
      }
      
      // Increase ease factor
      const newEaseFactor = Math.min(
        MAX_EASE_FACTOR,
        currentEF + EF_CORRECT_BONUS
      );
      
      return { newEaseFactor, newInterval, newRepetitions };
      
    } else {
      // Wrong answer: reset interval and decrease ease factor
      const newEaseFactor = Math.max(
        MIN_EASE_FACTOR,
        currentEF - EF_WRONG_PENALTY
      );
      
      // Reset to beginning, but don't go back to day 0
      // User sees it again tomorrow
      return {
        newEaseFactor,
        newInterval: FIRST_INTERVAL,
        newRepetitions: 0,
      };
    }
  }
  
  /**
   * Calculate confidence score for a chunk.
   */
  private calculateConfidence(
    correctFirstTry: number,
    totalEncounters: number,
    helpUsedCount: number
  ): number {
    if (totalEncounters === 0) return 0.5;
    
    const correctRate = correctFirstTry / totalEncounters;
    const helpPenalty = Math.min(0.2, helpUsedCount * 0.05);
    
    return Math.max(0, Math.min(1, correctRate - helpPenalty));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of the chunk manager service */
export const chunkManager = new ChunkManagerService();

export default chunkManager;