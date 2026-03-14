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

/**
 * Returns true when the mock provider should be used.
 * Triggered by AI_PROVIDER=mock env var.
 *
 * This file is server-side only (in src/lib/server/), so process.env is
 * always available. We check both AI_PROVIDER and VITE_AI_PROVIDER to
 * support both SvelteKit .env files and raw Node env vars in tests.
 */
function isMockMode(): boolean {
	const envProvider =
		process.env.AI_PROVIDER ?? process.env.VITE_AI_PROVIDER ?? '';
	return envProvider === 'mock';
}

/**
 * Returns the smart AI model (Haiku 4.5).
 *
 * Use for: chunk family generation, pre-lesson chat, learner profile updates.
 * Falls back to MockProvider when AI_PROVIDER=mock.
 */
export function getSmartModel(): AIProvider {
	if (isMockMode()) {
		return new MockProvider();
	}
	return new HaikuProvider();
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
	return new GroqProvider();
}
