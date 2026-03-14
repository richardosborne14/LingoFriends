/**
 * Tests for src/lib/server/ai/mock.ts
 *
 * The MockProvider is the backbone of all lesson engine tests —
 * every downstream test (chunkGenerator, lessonAssembler, etc.) depends on it.
 * It must produce valid ChunkFamilyContent JSON and report latency.
 */

import { describe, it, expect } from 'vitest';
import { MockProvider, MOCK_CHUNK_FAMILY } from '$lib/server/ai/mock';

const provider = new MockProvider();

// ─────────────────────────────────────────────────────────────────────────────

describe('MockProvider', () => {
	it('has correct id and name', () => {
		expect(provider.id).toBe('mock');
		expect(provider.name).toContain('Mock');
	});

	it('returns a valid AICompletionResult shape', async () => {
		const result = await provider.complete({
			messages: [{ role: 'user', content: 'topic: introduce-name' }],
		});

		expect(result).toHaveProperty('text');
		expect(result).toHaveProperty('latencyMs');
		expect(result).toHaveProperty('provider');
		expect(result).toHaveProperty('model');
		expect(result.provider).toBe('mock');
	});

	it('returns JSON text that matches ChunkFamilyContent schema', async () => {
		const result = await provider.complete({
			messages: [
				{
					role: 'system',
					content: 'You are a chunk family generator.',
				},
				{
					role: 'user',
					content:
						'Topic: introduce-name. Generate a chunk family for a beginner German learner.',
				},
			],
			jsonMode: true,
		});

		// The response must be valid JSON
		expect(() => JSON.parse(result.text)).not.toThrow();

		const parsed = JSON.parse(result.text);

		// Must have coreFrame with blank slot
		expect(typeof parsed.coreFrame).toBe('string');
		expect(parsed.coreFrame).toContain('___');

		// Must have coreFrameTranslation
		expect(typeof parsed.coreFrameTranslation).toBe('string');

		// Must have title
		expect(typeof parsed.title).toBe('string');

		// Must have chunks array with at least 1 chunk
		expect(Array.isArray(parsed.chunks)).toBe(true);
		expect(parsed.chunks.length).toBeGreaterThanOrEqual(1);
	});

	it('each mock chunk has all required fields', async () => {
		const result = await provider.complete({
			messages: [{ role: 'user', content: 'chunk family for topic: introduce-name' }],
		});

		const parsed = JSON.parse(result.text);
		const requiredChunkFields = [
			'targetPhrase',
			'nativeTranslation',
			'exampleSentence',
			'usageNote',
			'explanation',
			'distractors',
			'correctUsageContext',
			'wrongUsageContexts',
			'coachingText',
		];

		for (const chunk of parsed.chunks) {
			for (const field of requiredChunkFields) {
				expect(chunk, `chunk missing field: ${field}`).toHaveProperty(field);
			}
			// Distractors must have 3 items
			expect(chunk.distractors).toHaveLength(3);
			// Wrong usage contexts must have 3 items
			expect(chunk.wrongUsageContexts).toHaveLength(3);
		}
	});

	it('measures and reports latency', async () => {
		const result = await provider.complete({
			messages: [{ role: 'user', content: 'topic: test' }],
		});

		// Latency should be a positive number
		expect(result.latencyMs).toBeGreaterThan(0);
		// Should be at least the mock delay
		expect(result.latencyMs).toBeGreaterThanOrEqual(100);
	});

	it('reports usage token counts', async () => {
		const result = await provider.complete({
			messages: [{ role: 'user', content: 'hello' }],
		});

		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MOCK_CHUNK_FAMILY fixture', () => {
	it('coreFrame contains a blank slot (___)', () => {
		expect(MOCK_CHUNK_FAMILY.coreFrame).toContain('___');
	});

	it('has exactly 3 chunks (for 11+ age group testing)', () => {
		expect(MOCK_CHUNK_FAMILY.chunks).toHaveLength(3);
	});

	it('all chunks share the same core frame pattern', () => {
		// Each chunk targetPhrase should start with "Ich heiße"
		for (const chunk of MOCK_CHUNK_FAMILY.chunks) {
			expect(chunk.targetPhrase.toLowerCase()).toContain('ich heiße');
		}
	});

	it('all distractors are in native language (English), not target (German)', () => {
		// A rough check: distractors should not contain "Ich" or "heiße"
		for (const chunk of MOCK_CHUNK_FAMILY.chunks) {
			for (const distractor of chunk.distractors) {
				expect(distractor.toLowerCase()).not.toContain('ich heiße');
			}
		}
	});
});
