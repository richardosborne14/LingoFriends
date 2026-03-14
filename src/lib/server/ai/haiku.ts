/**
 * LingoFriends V2 — Anthropic Haiku 4.5 Provider
 *
 * The "smart model" used for lesson content generation.
 * Haiku 4.5 has excellent reasoning for structured JSON output and produces
 * educationally sound chunk families with good personalisation.
 *
 * JSON mode is achieved via system prompt instruction (Anthropic doesn't have
 * a native json_object mode like OpenAI/Groq). The system prompt explicitly
 * instructs the model to respond with only valid JSON.
 *
 * Includes 1 automatic retry on timeout, as Anthropic API can occasionally
 * take >10s on first cold requests.
 *
 * @module server/ai/haiku
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AICompletionOptions, AICompletionResult } from './types';

/** Model identifier — pinned to specific version for reproducibility */
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/** Timeout before triggering a retry (milliseconds) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Default max tokens if not specified in options */
const DEFAULT_MAX_TOKENS = 2048;

/**
 * Anthropic Haiku 4.5 provider.
 *
 * Used for: chunk family generation, pre-lesson chat, learner profile updates.
 * NOT used for: real-time lesson chat (too slow — use GroqProvider instead).
 */
export class HaikuProvider implements AIProvider {
	id = 'haiku-4.5';
	name = 'Anthropic Haiku 4.5';

	private client: Anthropic;

	/**
	 * @param apiKey - Anthropic API key. Pass explicitly from the router so that
	 *   SvelteKit's $env/static/private supplies the value. Falls back to
	 *   process.env.ANTHROPIC_API_KEY for test contexts where $env is unavailable.
	 */
	constructor(apiKey?: string) {
		// Pass key explicitly — Anthropic SDK auto-reads ANTHROPIC_API_KEY from
		// process.env as a fallback, but SvelteKit .env vars need $env/static/private.
		this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
	}

	/**
	 * Sends a completion request to Anthropic Haiku 4.5.
	 * Retries once on timeout. Throws on auth errors or quota exceeded.
	 */
	async complete(options: AICompletionOptions): Promise<AICompletionResult> {
		return this.attemptCompletion(options, 0);
	}

	/**
	 * Internal implementation with retry support.
	 * @param attempt - 0 for first attempt, 1 for retry
	 */
	private async attemptCompletion(
		options: AICompletionOptions,
		attempt: number
	): Promise<AICompletionResult> {
		const start = Date.now();

		// Separate system messages from conversation messages
		// Anthropic API requires system prompt as a top-level parameter
		const systemMessages = options.messages.filter((m) => m.role === 'system');
		const conversationMessages = options.messages.filter((m) => m.role !== 'system');

		// Build system prompt — append JSON instruction if jsonMode requested
		let systemContent =
			systemMessages.map((m) => m.content).join('\n\n') ||
			'You are a helpful language learning assistant.';

		if (options.jsonMode) {
			// Haiku doesn't have native json_object mode — instruct via system prompt
			systemContent +=
				'\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences. No preamble text. No explanation.';
		}

		try {
			const response = await this.client.messages.create({
				model: HAIKU_MODEL,
				max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
				temperature: options.temperature ?? 0.7,
				system: systemContent,
				messages: conversationMessages.map((m) => ({
					role: m.role as 'user' | 'assistant',
					content: m.content,
				})),
			});

			// Extract text from the first content block
			const firstBlock = response.content[0];
			const text = firstBlock?.type === 'text' ? firstBlock.text : '';

			return {
				text,
				usage: {
					promptTokens: response.usage.input_tokens,
					completionTokens: response.usage.output_tokens,
				},
				latencyMs: Date.now() - start,
				provider: this.id,
				model: HAIKU_MODEL,
			};
		} catch (err) {
			const isTimeout =
				err instanceof Error &&
				(err.message.includes('timeout') || err.message.includes('ETIMEDOUT'));

			// Retry once on timeout (cold start or network blip)
			if (isTimeout && attempt === 0) {
				console.warn('[haiku] Request timed out, retrying once...');
				return this.attemptCompletion(options, 1);
			}

			// Re-throw all other errors (auth, quota, etc.) with context
			throw new Error(
				`[haiku] Anthropic API error after ${Date.now() - start}ms: ` +
					(err instanceof Error ? err.message : String(err))
			);
		}
	}
}
