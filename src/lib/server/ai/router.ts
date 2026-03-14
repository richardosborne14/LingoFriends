/**
 * LingoFriends V2 — AI Model Router
 *
 * Returns the correct AI provider based on the task and environment.
 * This is the ONLY place that decides which provider to use — all other
 * code calls getSmartModel() or getFastModel() and stays provider-agnostic.
 *
 * Environment control:
 *   AI_PROVIDER=mock  → All calls go to MockProvider (tests, local dev)
 *   AI_PROVIDER=real  → Real providers (default in production)
 *   Unset             → Real providers
 *
 * WHY SEPARATE SMART/FAST: Per architecture rules, lesson content generation
 * uses the smart model (Haiku 4.5) for quality. Real-time chat uses the fast
 * model (Groq Llama 3.3) for speed. These are never swapped.
 *
 * @module server/ai/router
 */

import type { AIProvider } from './types';
import { MockProvider } from './mock';
import { HaikuProvider } from './haiku';
import { GroqProvider } from './groq';

// Read API keys via SvelteKit's $env/static/private — the only reliable way
// to access .env variables in server-side SvelteKit code. process.env does NOT
// work for .env values in the Vite-managed SvelteKit server context.
import {
	GROQ_API_KEY,
	ANTHROPIC_API_KEY,
} from '$env/static/private';

/**
 * Returns true when the mock provider should be used.
 * Triggered by AI_PROVIDER=mock env var (checked via process.env for test compat).
 */
function isMockMode(): boolean {
	// process.env works for inline env vars set before the process starts (e.g. in
	// tests), even though .env file values require $env/static/private at runtime.
	const envProvider =
		process.env.AI_PROVIDER ?? process.env.VITE_AI_PROVIDER ?? '';
	return envProvider === 'mock';
}

/**
 * Returns true when a valid Anthropic API key is configured.
 * Anthropic keys start with "sk-ant-". Vertex AI tokens are not compatible
 * with the standard SDK and fall through to the Groq fallback.
 */
function hasAnthropicKey(): boolean {
	const key = ANTHROPIC_API_KEY ?? '';
	return key.startsWith('sk-ant-') && key.length > 20;
}

/**
 * Returns the smart AI model (Haiku 4.5, or Groq fallback).
 *
 * Use for: chunk family generation, pre-lesson chat, learner profile updates.
 * Falls back to MockProvider when AI_PROVIDER=mock.
 * Falls back to GroqProvider when ANTHROPIC_API_KEY is absent or invalid.
 */
export function getSmartModel(): AIProvider {
	if (isMockMode()) {
		return new MockProvider();
	}
	if (!hasAnthropicKey()) {
		// Graceful degradation: Groq (Llama 3.3 70B) as smart model fallback.
		// Quality is slightly lower than Haiku 4.5 but fully functional.
		console.warn('[router] ANTHROPIC_API_KEY not set or invalid — using Groq as smart model fallback');
		return new GroqProvider(GROQ_API_KEY);
	}
	return new HaikuProvider(ANTHROPIC_API_KEY);
}

/**
 * Returns the fast AI model (Groq Llama 3.3 70B).
 *
 * Use for: in-lesson help chat, real-time feedback, answer evaluation.
 * Falls back to MockProvider when AI_PROVIDER=mock.
 */
export function getFastModel(): AIProvider {
	if (isMockMode()) {
		return new MockProvider();
	}
	return new GroqProvider(GROQ_API_KEY);
}
