/**
 * Tests for src/lib/server/lessons/chunkGenerator.ts
 *
 * All tests run against MockProvider — no real API calls.
 * We test the prompt builders, validator, and the full generateChunkFamily()
 * flow including retry behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	buildSystemPrompt,
	buildUserPrompt,
	validateChunkFamily,
	generateChunkFamily,
} from '$lib/server/lessons/chunkGenerator';
import { MOCK_CHUNK_FAMILY } from '$lib/server/ai/mock';
import type { ChunkGenerationParams } from '$lib/types/lesson';

// ── Force mock provider for all tests ────────────────────────────────────────
// MockProvider is deterministic — tests won't touch real APIs.
// We inline the return value rather than use require() because path aliases
// don't resolve inside vi.mock factory functions (they're hoisted before the
// module resolver runs).
const MOCK_RESPONSE = JSON.stringify({
	coreFrame: 'Ich heiße ___',
	coreFrameTranslation: 'My name is ___',
	title: 'Saying Your Name in German',
	chunks: [
		{
			targetPhrase: 'Ich heiße Max',
			nativeTranslation: 'My name is Max',
			exampleSentence: 'Hallo! Ich heiße Max.',
			usageNote: 'Used when introducing yourself for the first time.',
			explanation: 'Say this when you want to tell someone your name.',
			distractors: ['My name is Luna', 'I am hungry', 'Good morning'],
			correctUsageContext: 'When meeting someone new and telling them your name',
			wrongUsageContexts: [
				"When asking someone else's name",
				'When saying goodbye',
				'When ordering food',
			],
			coachingText: 'Ready to learn how to say your name in German?',
		},
		{
			targetPhrase: 'Ich heiße Luna',
			nativeTranslation: 'My name is Luna',
			exampleSentence: 'Guten Tag! Ich heiße Luna.',
			usageNote: 'Works for any name — just swap the name at the end.',
			explanation: 'Luna is introducing herself. The frame is the same!',
			distractors: ['My name is Max', 'I am tired', 'See you later'],
			correctUsageContext: 'When meeting someone new and telling them your name',
			wrongUsageContexts: [
				"When asking someone else's name",
				'When saying goodbye',
				'When ordering food',
			],
			coachingText: 'Now let us try another name with the same pattern!',
		},
		{
			targetPhrase: 'Ich heiße Professor Keks',
			nativeTranslation: 'My name is Professor Cookie',
			exampleSentence: 'Willkommen! Ich heiße Professor Keks.',
			usageNote: 'A fun variation — the frame works for any name, even silly ones!',
			explanation: 'Even a cookie professor uses the same frame. The pattern is reusable!',
			distractors: ['My name is Fluffy', 'I like cookies', 'Good evening'],
			correctUsageContext: 'When introducing yourself — works for any name!',
			wrongUsageContexts: [
				'When asking what time it is',
				'When saying goodbye',
				'When asking for directions',
			],
			coachingText: 'Meet Professor Cookie! Can you say it with your own name?',
		},
	],
});

vi.mock('$lib/server/ai/router', () => ({
	getSmartModel: () => ({
		id: 'mock',
		name: 'Mock Provider (inline)',
		async complete() {
			// Simulate a small delay like the real MockProvider
			await new Promise((r) => setTimeout(r, 10));
			return {
				text: MOCK_RESPONSE,
				latencyMs: 10,
				provider: 'mock',
				model: 'mock-v1',
				usage: { promptTokens: 50, completionTokens: 200 },
			};
		},
	}),
}));

// ─────────────────────────────────────────────────────────────────────────────

const BASE_PARAMS: ChunkGenerationParams = {
	topic: 'introduce-name',
	targetLanguage: 'de',
	nativeLanguage: 'en',
	ageGroup: '11-14',
	interests: ['football', 'gaming'],
};

// ─────────────────────────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
	it('includes the target language name', () => {
		const prompt = buildSystemPrompt('German', 'English', 3);
		expect(prompt).toContain('German');
	});

	it('includes the native language name', () => {
		const prompt = buildSystemPrompt('German', 'English', 3);
		expect(prompt).toContain('English');
	});

	it('specifies the chunk count', () => {
		const prompt = buildSystemPrompt('German', 'English', 2);
		expect(prompt).toContain('2');
	});

	it('includes the JSON schema structure', () => {
		const prompt = buildSystemPrompt('German', 'English', 3);
		expect(prompt).toContain('coreFrame');
		expect(prompt).toContain('chunks');
		expect(prompt).toContain('distractors');
	});

	it('instructs the model to respond with only JSON (no fences)', () => {
		const prompt = buildSystemPrompt('German', 'English', 3);
		expect(prompt.toLowerCase()).toContain('json');
		expect(prompt.toLowerCase()).toContain('no markdown');
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('buildUserPrompt', () => {
	it('includes the topic', () => {
		const prompt = buildUserPrompt(BASE_PARAMS, 3);
		expect(prompt).toContain('introduce-name');
	});

	it('includes the age group', () => {
		const prompt = buildUserPrompt(BASE_PARAMS, 3);
		expect(prompt).toContain('11-14');
	});

	it('includes interests when provided', () => {
		const prompt = buildUserPrompt(BASE_PARAMS, 3);
		expect(prompt).toContain('football');
		expect(prompt).toContain('gaming');
	});

	it('includes personal context when provided', () => {
		const params = { ...BASE_PARAMS, personalContext: 'I scored a goal today' };
		const prompt = buildUserPrompt(params, 3);
		expect(prompt).toContain('I scored a goal today');
	});

	it('does NOT include personal context section when null', () => {
		const params = { ...BASE_PARAMS, personalContext: null };
		const prompt = buildUserPrompt(params, 3);
		expect(prompt).not.toContain('personal context');
	});

	it('includes existing chunks to avoid when provided', () => {
		const params = { ...BASE_PARAMS, existingChunks: ['Ich heiße Max', 'Guten Tag'] };
		const prompt = buildUserPrompt(params, 3);
		expect(prompt).toContain('Ich heiße Max');
		expect(prompt).toContain('Guten Tag');
	});

	it('specifies chunk count', () => {
		const prompt = buildUserPrompt(BASE_PARAMS, 2);
		expect(prompt).toContain('2');
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('validateChunkFamily', () => {
	it('accepts valid MOCK_CHUNK_FAMILY', () => {
		expect(() => validateChunkFamily(MOCK_CHUNK_FAMILY, 3)).not.toThrow();
	});

	it('throws if coreFrame is missing', () => {
		const bad = { ...MOCK_CHUNK_FAMILY, coreFrame: undefined };
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/coreFrame/);
	});

	it('throws if coreFrame lacks ___ slot', () => {
		const bad = { ...MOCK_CHUNK_FAMILY, coreFrame: 'Ich heiße Max' }; // no ___
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/___/);
	});

	it('throws if chunk count is wrong', () => {
		const bad = { ...MOCK_CHUNK_FAMILY, chunks: [MOCK_CHUNK_FAMILY.chunks[0]] }; // only 1 chunk
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/Expected 3 chunks, got 1/);
	});

	it('throws if a chunk is missing a required field', () => {
		const badChunk = { ...MOCK_CHUNK_FAMILY.chunks[0], explanation: undefined };
		const bad = { ...MOCK_CHUNK_FAMILY, chunks: [badChunk, ...MOCK_CHUNK_FAMILY.chunks.slice(1)] };
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/explanation/);
	});

	it('throws if distractors count is wrong', () => {
		const badChunk = { ...MOCK_CHUNK_FAMILY.chunks[0], distractors: ['only one'] };
		const bad = { ...MOCK_CHUNK_FAMILY, chunks: [badChunk, ...MOCK_CHUNK_FAMILY.chunks.slice(1)] };
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/distractors/);
	});

	it('throws if wrongUsageContexts count is wrong', () => {
		const badChunk = { ...MOCK_CHUNK_FAMILY.chunks[0], wrongUsageContexts: ['only one'] };
		const bad = { ...MOCK_CHUNK_FAMILY, chunks: [badChunk, ...MOCK_CHUNK_FAMILY.chunks.slice(1)] };
		expect(() => validateChunkFamily(bad, 3)).toThrowError(/wrongUsageContexts/);
	});

	it('accepts 2-chunk family for age 7-10', () => {
		const twoChunk = { ...MOCK_CHUNK_FAMILY, chunks: MOCK_CHUNK_FAMILY.chunks.slice(0, 2) };
		expect(() => validateChunkFamily(twoChunk, 2)).not.toThrow();
	});
});

// ─────────────────────────────────────────────────────────────────────────────

describe('generateChunkFamily', () => {
	it('generates a valid chunk family with mock provider', async () => {
		const result = await generateChunkFamily(BASE_PARAMS);
		expect(result).toBeDefined();
		expect(result.coreFrame).toContain('___');
		expect(Array.isArray(result.chunks)).toBe(true);
	});

	it('returns 2 chunks for age group 7-10', async () => {
		// Mock returns 3 chunks but validates for 3 — for 7-10 we need to test
		// the chunk count logic. Since MockProvider always returns 3 chunks,
		// we test this at the validation level.
		const youngParams = { ...BASE_PARAMS, ageGroup: '7-10' as const };

		// The mock always returns 3 chunks, which will fail 7-10 validation (expects 2).
		// This tests that the validator correctly rejects wrong counts.
		// For a real AI, it would be prompted for 2.
		// In test: mock returns 3, validator expects 2 → retry → still 3 → throws.
		// This is intentional — the mock fixture is for 11+ age groups.
		// We verify the behavior here rather than papering over it.
		await expect(generateChunkFamily(youngParams)).rejects.toThrow();
	});

	it('returns 3 chunks for age group 11-14', async () => {
		const result = await generateChunkFamily(BASE_PARAMS);
		// MockProvider returns 3 chunks — matches 11-14 expectation
		expect(result.chunks).toHaveLength(3);
	});

	it('returns 3 chunks for age group 15-18', async () => {
		const olderParams = { ...BASE_PARAMS, ageGroup: '15-18' as const };
		const result = await generateChunkFamily(olderParams);
		expect(result.chunks).toHaveLength(3);
	});

	it('all chunks have targetPhrase', async () => {
		const result = await generateChunkFamily(BASE_PARAMS);
		for (const chunk of result.chunks) {
			expect(chunk.targetPhrase).toBeTruthy();
		}
	});

	it('all chunks have 3 distractors', async () => {
		const result = await generateChunkFamily(BASE_PARAMS);
		for (const chunk of result.chunks) {
			expect(chunk.distractors).toHaveLength(3);
		}
	});

	it('works when personalContext is null', async () => {
		const params = { ...BASE_PARAMS, personalContext: null };
		// Should not throw — personal context is always optional
		await expect(generateChunkFamily(params)).resolves.toBeDefined();
	});

	it('works when personalContext is undefined', async () => {
		const params: ChunkGenerationParams = {
			topic: 'introduce-name',
			targetLanguage: 'de',
			nativeLanguage: 'en',
			ageGroup: '11-14',
			interests: [],
		};
		await expect(generateChunkFamily(params)).resolves.toBeDefined();
	});
});
