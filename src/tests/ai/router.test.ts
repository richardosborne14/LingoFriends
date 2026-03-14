/**
 * Tests for src/lib/server/ai/router.ts
 *
 * The router must return the correct provider based on the AI_PROVIDER env var.
 * These tests manipulate process.env to verify the routing logic without
 * instantiating real providers (which would require API keys).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mock the heavy provider classes to avoid instantiation side effects
// (HaikuProvider and GroqProvider make network calls in their constructors)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('$lib/server/ai/haiku', () => ({
	HaikuProvider: class MockHaiku {
		id = 'haiku-4.5';
		name = 'Anthropic Haiku 4.5';
		async complete() {
			return { text: '', latencyMs: 0, provider: 'haiku-4.5', model: 'claude-haiku-4-5-20251001' };
		}
	},
}));

vi.mock('$lib/server/ai/groq', () => ({
	GroqProvider: class MockGroq {
		id = 'groq-llama';
		name = 'Groq Llama 3.3 70B';
		async complete() {
			return { text: '', latencyMs: 0, provider: 'groq-llama', model: 'llama-3.3-70b-versatile' };
		}
	},
}));

import { getSmartModel, getFastModel } from '$lib/server/ai/router';
import { MockProvider } from '$lib/server/ai/mock';

// ─────────────────────────────────────────────────────────────────────────────

describe('AI Router', () => {
	// Store original env to restore after each test
	const originalEnv = { ...process.env };

	afterEach(() => {
		// Restore env vars after each test — important for test isolation
		process.env.AI_PROVIDER = originalEnv.AI_PROVIDER;
		process.env.VITE_AI_PROVIDER = originalEnv.VITE_AI_PROVIDER;
		vi.resetModules();
	});

	describe('getSmartModel()', () => {
		it('returns MockProvider when AI_PROVIDER=mock', async () => {
			process.env.AI_PROVIDER = 'mock';
			// Re-import to pick up env change
			const { getSmartModel: getSmartFresh } = await import('$lib/server/ai/router');
			const model = getSmartFresh();
			// Use id check — instanceof fails with dynamic re-imports due to module identity
			expect(model.id).toBe('mock');
		});

		it('returns HaikuProvider when AI_PROVIDER is unset', async () => {
			delete process.env.AI_PROVIDER;
			delete process.env.VITE_AI_PROVIDER;
			const { getSmartModel: getSmartFresh } = await import('$lib/server/ai/router');
			const model = getSmartFresh();
			// HaikuProvider is mocked — check by id
			expect(model.id).toBe('haiku-4.5');
		});

		it('returns HaikuProvider when AI_PROVIDER=real', async () => {
			process.env.AI_PROVIDER = 'real';
			const { getSmartModel: getSmartFresh } = await import('$lib/server/ai/router');
			const model = getSmartFresh();
			expect(model.id).toBe('haiku-4.5');
		});
	});

	describe('getFastModel()', () => {
		it('returns MockProvider when AI_PROVIDER=mock', async () => {
			process.env.AI_PROVIDER = 'mock';
			const { getFastModel: getFastFresh } = await import('$lib/server/ai/router');
			const model = getFastFresh();
			// Use id check — instanceof fails with dynamic re-imports due to module identity
			expect(model.id).toBe('mock');
		});

		it('returns GroqProvider when AI_PROVIDER is unset', async () => {
			delete process.env.AI_PROVIDER;
			delete process.env.VITE_AI_PROVIDER;
			const { getFastModel: getFastFresh } = await import('$lib/server/ai/router');
			const model = getFastFresh();
			// GroqProvider is mocked — check by id
			expect(model.id).toBe('groq-llama');
		});
	});

	describe('VITE_AI_PROVIDER fallback', () => {
		it('uses VITE_AI_PROVIDER when AI_PROVIDER is unset', async () => {
			delete process.env.AI_PROVIDER;
			process.env.VITE_AI_PROVIDER = 'mock';
			const { getSmartModel: getSmartFresh } = await import('$lib/server/ai/router');
			const model = getSmartFresh();
			expect(model.id).toBe('mock');
		});
	});
});
