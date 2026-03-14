/**
 * LingoFriends - Chunk Generator Service
 * 
 * Generates lexical chunks on-demand using AI, following the generate-first
 * architecture where content is always generated fresh for each learner,
 * with the chunk library serving as a byproduct for SRS tracking and fallback.
 * 
 * Architecture Flow:
 * 1. Pedagogy Engine calls generateChunks() with learner context
 * 2. Build AI prompt tailored to learner's interests, level, context
 * 3. Call Groq API to generate fresh chunks
 * 4. Deduplicate on save (check if chunk text+language already exists)
 * 5. Create user_chunks record for SRS tracking
 * 6. Return personalized chunks
 * 
 * The chunk_library grows organically as a record of what's been taught.
 * It's queried for SRS review sessions and fallback when Groq is unavailable.
 * 
 * @module chunkGeneratorService
 * @see docs/phase-1.2/task-1.2-3-chunk-generation-service.md
 */

import { pb } from '../../services/pocketbaseService';
import { 
  ChunkType, 
  ChunkStatus, 
  LexicalChunk, 
  UserChunk,
  getInitialEaseFactor,
} from '../types/pedagogy';
import { 
  ChunkLibraryRecord, 
  UserChunkRecord,
  chunkRecordToLexicalChunk,
  userChunkRecordToUserChunk,
} from '../types/pocketbase';
import {
  ChunkGenerationRequest,
  GeneratedChunk,
  CHUNK_GENERATION_SYSTEM_PROMPT,
  buildChunkPrompt,
  validateGeneratedChunk,
  normalizeChunkType,
} from './prompts/chunkPrompts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Groq API configuration */
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Rate limiting */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // ms between requests

/** Simple in-memory cache for recent generations (per topic/language/difficulty) */
const generationCache = new Map<string, { chunks: LexicalChunk[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of chunk generation.
 */
export interface ChunkGenerationResult {
  /** Generated chunks ready for use */
  chunks: LexicalChunk[];
  
  /** Number of chunks newly generated (vs cached) */
  generated: number;
  
  /** Number of chunks from cache/fallback */
  cached: number;
  
  /** Whether fallback was used (Groq unavailable) */
  usedFallback: boolean;
}

/**
 * Context for first encounter recording.
 */
export interface EncounterContext {
  /** Topic ID where chunk was encountered */
  topicId: string;
  
  /** Lesson ID where chunk was encountered (optional) */
  lessonId?: string;
}

/**
 * Options for getOrGenerateChunks.
 */
export interface GetChunksOptions {
  /** Chunk types to generate (default: all types) */
  chunkTypes?: ChunkType[];
  
  /** User-provided context for personalization */
  userContext?: string;
  
  /** Force new generation (skip cache) */
  forceNew?: boolean;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Chunk Generator Service
 * 
 * Main service for generating and managing lexical chunks.
 * Implements the generate-first architecture where chunks are always
 * created fresh for each learner.
 */
export class ChunkGeneratorService {
  
  /**
   * Generate fresh chunks tailored to a specific learner.
   * 
   * This is the primary method called by the Pedagogy Engine.
   * It always generates new content, checking cache only to avoid
   * redundant API calls within a short time window.
   * 
   * @param request - Chunk generation request with learner context
   * @returns Generation result with chunks and metadata
   */
  async generateChunks(request: ChunkGenerationRequest): Promise<ChunkGenerationResult> {
    console.log('[ChunkGenerator] Generating chunks for:', request.topic);
    
    // Check cache for recent identical request (avoid duplicate API calls)
    const cacheKey = this.getCacheKey(request);
    if (!request.forceNew) {
      const cached = generationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[ChunkGenerator] Using cached chunks');
        return {
          chunks: cached.chunks,
          generated: 0,
          cached: cached.chunks.length,
          usedFallback: false,
        };
      }
    }
    
    try {
      // Call Groq API to generate chunks
      const generatedChunks = await this.callGroqForChunks(request);
      
      // Validate and store chunks
      const storedChunks: LexicalChunk[] = [];
      for (const gc of generatedChunks) {
        // Normalize and validate
        const normalized = this.normalizeGeneratedChunk(gc);
        if (!validateGeneratedChunk(normalized)) {
          console.warn('[ChunkGenerator] Invalid chunk generated, skipping:', gc.text);
          continue;
        }
        
        // Store in chunk_library (with deduplication)
        const stored = await this.storeChunk(normalized, request);
        storedChunks.push(stored);
      }
      
      // Update cache
      generationCache.set(cacheKey, {
        chunks: storedChunks,
        timestamp: Date.now(),
      });
      
      return {
        chunks: storedChunks,
        generated: storedChunks.length,
        cached: 0,
        usedFallback: false,
      };
      
    } catch (error) {
      console.error('[ChunkGenerator] Generation failed:', error);
      
      // Use fallback: get existing chunks from library
      const fallbackChunks = await this.getFallbackChunks(
        request.targetLanguage,
        request.difficulty,
        request.count
      );
      
      return {
        chunks: fallbackChunks,
        generated: 0,
        cached: fallbackChunks.length,
        usedFallback: true,
      };
    }
  }
  
  /**
   * Get chunks due for SRS review.
   * 
   * This queries user_chunks for chunks that need to be reviewed
   * based on their next_review_date. This is the primary method
   * for retrieving existing chunks for review sessions.
   * 
   * @param userId - User ID
   * @param limit - Maximum number of chunks to return
   * @returns Array of UserChunk records with chunk data populated
   */
  async getChunksForReview(userId: string, limit: number = 10): Promise<UserChunk[]> {
    try {
      const now = new Date().toISOString();
      
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, limit, {
        filter: `user = "${userId}" && next_review_date <= "${now}"`,
        sort: 'next_review_date',
        expand: 'chunk', // Populate chunk data
      });
      
      return records.items.map(userChunkRecordToUserChunk);
      
    } catch (error) {
      console.error('[ChunkGenerator] Failed to get review chunks:', error);
      return [];
    }
  }
  
  /**
   * Record the first encounter of a chunk by a user.
   * 
   * Creates a user_chunks record with initial SRS parameters.
   * This should be called when a generated chunk is first presented
   * to a learner in a lesson.
   * 
   * @param userId - User ID
   * @param chunkId - Chunk ID from chunk_library
   * @param context - Context where chunk was encountered
   * @returns The created UserChunk record
   */
  async recordFirstEncounter(
    userId: string,
    chunkId: string,
    context: EncounterContext
  ): Promise<UserChunk> {
    try {
      // Check if user has already encountered this chunk
      const existing = await pb.collection('user_chunks').getList<UserChunkRecord>(1, 1, {
        filter: `user = "${userId}" && chunk = "${chunkId}"`,
      });
      
      if (existing.items.length > 0) {
        // Already encountered - just update last encountered
        const updated = await pb.collection('user_chunks').update<UserChunkRecord>(
          existing.items[0].id,
          {
            total_encounters: existing.items[0].total_encounters + 1,
            last_encountered_in: context.topicId,
            last_encountered_at: new Date().toISOString(),
          }
        );
        return userChunkRecordToUserChunk(updated);
      }
      
      // Create new user_chunks record
      const now = new Date().toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Get chunk's base interval
      const chunk = await pb.collection('chunk_library').getOne<ChunkLibraryRecord>(chunkId);
      const baseInterval = chunk.base_interval || 1;
      
      const record = await pb.collection('user_chunks').create<UserChunkRecord>({
        user: userId,
        chunk: chunkId,
        status: ChunkStatus.NEW,
        
        // SRS fields (SM-2 defaults)
        ease_factor: getInitialEaseFactor(),
        interval: baseInterval,
        next_review_date: tomorrow,
        repetitions: 0,
        
        // Performance tracking
        total_encounters: 1,
        correct_first_try: 0,
        wrong_attempts: 0,
        help_used_count: 0,
        
        // Context
        first_encountered_in: context.topicId,
        first_encountered_at: now,
        last_encountered_in: context.topicId,
        last_encountered_at: now,
        
        // Confidence
        confidence_score: 0.5,
      });
      
      console.log('[ChunkGenerator] Recorded first encounter:', chunkId, 'for user:', userId);
      return userChunkRecordToUserChunk(record);
      
    } catch (error) {
      console.error('[ChunkGenerator] Failed to record encounter:', error);
      throw error;
    }
  }
  
  /**
   * Get texts of chunks the user has already seen.
   * Used to exclude from generation prompts.
   * 
   * @param userId - User ID
   * @param limit - Maximum number to return
   * @returns Array of chunk texts
   */
  async getSeenChunkTexts(userId: string, limit: number = 50): Promise<string[]> {
    try {
      // Get user's chunks with chunk data expanded
      const records = await pb.collection('user_chunks').getList<UserChunkRecord>(1, limit, {
        filter: `user = "${userId}"`,
        expand: 'chunk',
        sort: '-last_encountered_at',
      });
      
      // Extract texts from expanded chunk data
      return records.items
        .filter(r => r.expand?.chunk)
        .map(r => (r.expand!.chunk as ChunkLibraryRecord).text);
        
    } catch (error) {
      console.error('[ChunkGenerator] Failed to get seen chunks:', error);
      return [];
    }
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Call Groq API to generate chunks.
   */
  private async callGroqForChunks(request: ChunkGenerationRequest): Promise<GeneratedChunk[]> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await this.sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();
    
    const systemPrompt = CHUNK_GENERATION_SYSTEM_PROMPT;
    const userPrompt = buildChunkPrompt(request);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7, // Some creativity but consistent
        max_tokens: 3000, // Enough for multiple chunks
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from Groq');
    }
    
    // Parse JSON response
    return this.parseChunkResponse(content);
  }
  
  /**
   * Parse JSON response from Groq.
   */
  private parseChunkResponse(content: string): GeneratedChunk[] {
    try {
      // Try to extract JSON from the response
      let jsonStr = content.trim();
      
      // Handle markdown code blocks
      const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      } else {
        // Try to find raw JSON object/array
        const jsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Handle {"chunks": [...]} format
      if (parsed.chunks && Array.isArray(parsed.chunks)) {
        return parsed.chunks;
      }
      
      // Handle direct array format
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      console.warn('[ChunkGenerator] Unexpected JSON format');
      return [];
      
    } catch (error) {
      console.error('[ChunkGenerator] Failed to parse chunk response:', content.slice(0, 200));
      throw new Error('Invalid chunk response format from AI');
    }
  }
  
  /**
   * Normalize a generated chunk from AI.
   */
  private normalizeGeneratedChunk(gc: GeneratedChunk): GeneratedChunk {
    return {
      text: gc.text?.trim() || '',
      translation: gc.translation?.trim() || '',
      chunkType: normalizeChunkType(gc.chunkType as string),
      difficulty: Math.max(1, Math.min(5, gc.difficulty || 1)),
      notes: gc.notes?.trim(),
      culturalContext: gc.culturalContext?.trim(),
      slots: gc.slots?.map(s => ({
        position: s.position,
        placeholder: s.placeholder,
        type: s.type,
        examples: s.examples || [],
      })),
      ageAppropriate: gc.ageAppropriate || ['11-14'], // Default to middle age
    };
  }
  
  /**
   * Store a chunk in the library with deduplication.
   * If the chunk already exists (same text + target_language), returns existing.
   */
  private async storeChunk(
    gc: GeneratedChunk,
    request: ChunkGenerationRequest
  ): Promise<LexicalChunk> {
    try {
      // Check for existing chunk (deduplication)
      const existing = await this.findExistingChunk(gc.text, request.targetLanguage);
      if (existing) {
        console.log('[ChunkGenerator] Chunk already exists, linking:', gc.text);
        return existing;
      }
      
      // Create new chunk
      const record = await pb.collection('chunk_library').create<ChunkLibraryRecord>({
        text: gc.text,
        translation: gc.translation,
        chunk_type: gc.chunkType as string,
        target_language: request.targetLanguage,
        native_language: request.nativeLanguage,
        slots: gc.slots,
        difficulty: gc.difficulty,
        topics: [], // Topics can be assigned later
        frequency: 0, // Unknown for generated chunks
        base_interval: this.getDefaultInterval(gc.difficulty),
        notes: gc.notes,
        cultural_context: gc.culturalContext,
        age_appropriate: gc.ageAppropriate,
      });
      
      console.log('[ChunkGenerator] Stored new chunk:', gc.text);
      return chunkRecordToLexicalChunk(record);
      
    } catch (error) {
      console.error('[ChunkGenerator] Failed to store chunk:', error);
      throw error;
    }
  }
  
  /**
   * Find existing chunk by text and language.
   */
  private async findExistingChunk(
    text: string,
    targetLanguage: string
  ): Promise<LexicalChunk | null> {
    try {
      const existing = await pb.collection('chunk_library').getFirstListItem<ChunkLibraryRecord>(
        `text = "${text}" && target_language = "${targetLanguage}"`
      );
      return chunkRecordToLexicalChunk(existing);
    } catch {
      return null; // Not found
    }
  }
  
  /**
   * Get fallback chunks when Groq is unavailable.
   */
  private async getFallbackChunks(
    targetLanguage: string,
    difficulty: number,
    count: number
  ): Promise<LexicalChunk[]> {
    console.log('[ChunkGenerator] Using fallback chunks from library');
    
    try {
      // Get chunks matching language and approximate difficulty
      const minDiff = Math.max(1, difficulty - 1);
      const maxDiff = Math.min(5, difficulty + 1);
      
      const records = await pb.collection('chunk_library').getList<ChunkLibraryRecord>(1, count, {
        filter: `target_language = "${targetLanguage}" && difficulty >= ${minDiff} && difficulty <= ${maxDiff}`,
        sort: '-created', // Most recent first
      });
      
      return records.items.map(chunkRecordToLexicalChunk);
      
    } catch (error) {
      console.error('[ChunkGenerator] Fallback also failed:', error);
      return [];
    }
  }
  
  /**
   * Get default SRS interval based on difficulty.
   */
  private getDefaultInterval(difficulty: number): number {
    // Easier chunks get longer initial interval
    const intervals: Record<number, number> = {
      1: 3,  // Easy: 3 days
      2: 2,  // Elementary: 2 days
      3: 1,  // Intermediate: 1 day
      4: 1,  // Upper-Intermediate: 1 day
      5: 1,  // Advanced: 1 day
    };
    return intervals[difficulty] || 1;
  }
  
  /**
   * Generate cache key for request.
   */
  private getCacheKey(request: ChunkGenerationRequest): string {
    return `${request.targetLanguage}:${request.topic}:${request.difficulty}:${request.count}`;
  }
  
  /**
   * Sleep helper for rate limiting.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of the chunk generator service */
export const chunkGenerator = new ChunkGeneratorService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get chunks for a specific user, considering their profile.
 * 
 * This is a convenience function that combines:
 * 1. Getting user's seen chunks (to exclude)
 * 2. Generating fresh chunks based on their profile
 * 
 * @param userId - User ID
 * @param topic - Topic to generate chunks for
 * @param count - Number of chunks needed
 * @param profile - User's learner profile
 * @param options - Additional options
 * @returns Generated chunks with first encounter recorded
 */
export async function getChunksForUser(
  userId: string,
  topic: string,
  count: number,
  profile: {
    nativeLanguage: string;
    targetLanguage: string;
    ageGroup: string;
    currentLevel: number;
    explicitInterests: string[];
  },
  options?: GetChunksOptions
): Promise<LexicalChunk[]> {
  const { levelToCEFR } = await import('../types/pedagogy');
  
  // Get chunks user has already seen
  const seenTexts = await chunkGenerator.getSeenChunkTexts(userId, 50);
  
  // Build generation request
  const request: ChunkGenerationRequest = {
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    ageGroup: profile.ageGroup,
    cefrLevel: levelToCEFR(profile.currentLevel),
    internalLevel: profile.currentLevel,
    difficulty: Math.ceil(profile.currentLevel / 20) || 1, // Convert 0-100 to 1-5
    topic,
    interests: profile.explicitInterests,
    userContext: options?.userContext,
    chunkTypes: options?.chunkTypes || [
      ChunkType.POLYWORD,
      ChunkType.COLLOCATION,
      ChunkType.UTTERANCE,
      ChunkType.FRAME,
    ],
    count,
    excludeChunkTexts: seenTexts,
  };
  
  // Generate chunks
  const result = await chunkGenerator.generateChunks(request);
  
  // Record first encounters
  for (const chunk of result.chunks) {
    await chunkGenerator.recordFirstEncounter(userId, chunk.id, {
      topicId: topic, // Using topic as context
    });
  }
  
  return result.chunks;
}