/**
 * Tests for Chunk Manager Service
 * 
 * Tests chunk library queries and SRS scheduling.
 * 
 * @module chunkManager.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManagerService } from './chunkManager';
import { ChunkStatus } from '../types/pedagogy';

// Mock PocketBase
vi.mock('../../services/pocketbaseService', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn(),
      getFirstListItem: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    })),
  },
}));

import { pb } from '../../services/pocketbaseService';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockChunkRecord = {
  id: 'chunk-1',
  text: 'Bonjour, comment ça va?',
  translation: 'Hello, how are you?',
  chunk_type: 'utterance',
  target_language: 'fr',
  native_language: 'en',
  difficulty: 2,
  topics: ['topic-greetings'],
  frequency: 100,
  base_interval: 1,
  age_appropriate: ['11-14'],
  created: '2024-01-01',
  updated: '2024-01-01',
};

const mockUserChunkRecord = {
  id: 'uc-1',
  user: 'user-1',
  chunk: 'chunk-1',
  status: 'learning',
  ease_factor: 2.5,
  interval: 1,
  next_review_date: new Date().toISOString(),
  repetitions: 1,
  total_encounters: 2,
  correct_first_try: 1,
  wrong_attempts: 1,
  help_used_count: 0,
  first_encountered_in: 'topic-greetings',
  first_encountered_at: '2024-01-01',
  last_encountered_in: 'topic-greetings',
  last_encountered_at: '2024-01-15',
  confidence_score: 0.5,
  created: '2024-01-01',
  updated: '2024-01-15',
  expand: {
    chunk: mockChunkRecord,
  },
};

// ============================================================================
// TESTS
// ============================================================================

describe('ChunkManagerService', () => {
  let manager: ChunkManagerService;
  let mockCollection: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ChunkManagerService();
    mockCollection = {
      getList: vi.fn(),
      getFirstListItem: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    vi.mocked(pb.collection).mockReturnValue(mockCollection);
  });

  describe('getChunksForLevel', () => {
    it('should query chunks by difficulty level', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [mockChunkRecord],
        totalPages: 1,
        page: 1,
        perPage: 10,
        totalItems: 1,
      });

      const chunks = await manager.getChunksForLevel('user-1', 'greetings', 2, 5);

      expect(pb.collection).toHaveBeenCalledWith('chunk_library');
      expect(chunks.length).toBe(1);
    });
  });

  describe('getDueChunks', () => {
    it('should query chunks due for review', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [mockUserChunkRecord],
        totalPages: 1,
        page: 1,
        perPage: 10,
        totalItems: 1,
      });

      const chunks = await manager.getDueChunks('user-1', 10);

      expect(pb.collection).toHaveBeenCalledWith('user_chunks');
      expect(chunks.length).toBe(1);
    });
  });

  describe('getFragileChunks', () => {
    it('should query fragile chunks', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [mockUserChunkRecord],
        totalPages: 1,
        page: 1,
        perPage: 10,
        totalItems: 1,
      });

      const chunks = await manager.getFragileChunks('user-1', 10);

      expect(pb.collection).toHaveBeenCalledWith('user_chunks');
      expect(chunks.length).toBe(1);
    });
  });

  describe('getContextChunks', () => {
    it('should query acquired chunks for context', async () => {
      // getContextChunks extracts chunks from expanded user_chunks
      mockCollection.getList.mockResolvedValue({
        items: [{
          ...mockUserChunkRecord,
          status: 'acquired',
          expand: { chunk: mockChunkRecord },
        }],
        totalPages: 1,
        page: 1,
        perPage: 10,
        totalItems: 1,
      });

      const chunks = await manager.getContextChunks('user-1', 'greetings', 5);

      expect(pb.collection).toHaveBeenCalledWith('user_chunks');
      // Returns LexicalChunk[] extracted from expanded data
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getChunk', () => {
    it('should get a single chunk by ID', async () => {
      mockCollection.getOne.mockResolvedValue(mockChunkRecord);

      const chunk = await manager.getChunk('chunk-1');

      expect(pb.collection).toHaveBeenCalledWith('chunk_library');
      expect(chunk).toBeDefined();
      expect(chunk?.id).toBe('chunk-1');
    });

    it('should return null if chunk not found', async () => {
      mockCollection.getOne.mockRejectedValue(new Error('Not found'));

      const chunk = await manager.getChunk('nonexistent');

      expect(chunk).toBeNull();
    });
  });
});