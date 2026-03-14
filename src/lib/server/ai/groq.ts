/**
 * LingoFriends V2 — Groq Llama 3.3 70B Provider
 *
 * The "fast model" used for real-time in-lesson chat.
 * Groq's inference speed is best-in-class — typically sub-second responses —
 * making it ideal for the help chat where kids need immediate feedback.
 *
 * Uses OpenAI-compatible API at api.groq.com with the openai SDK.
 * Has native JSON mode (response_format: json_object), so we don't need
 * the prompt instruction hack required for Haiku.
 *
 * @module server/ai/groq
 */

import OpenAI from 'openai';
import type { AIProvider, AICompletionOptions, AICompletionResult } from './types';

/** Groq model — Llama 3.3 70B is the best balance of speed and quality */
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Default max tokens — kept lower than Haiku since responses should be concise */
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Groq Llama 3.3 70B provider.
 *
 * Used for: in-lesson help chat, activity answer evaluation, real-time feedback.
 * NOT used for: lesson content generation (quality matters more than speed there).
 */
export class GroqProvider implements AIProvider {
	id = 'groq-llama';
	name = 'Groq Llama 3.3 70B';

	private client: OpenAI;

	/**
	 * @param apiKey - Groq API key. Pass explicitly from the router so that
	 *   SvelteKit's $env/static/private (not process.env) supplies the value.
	 *   Falls back to process.env for unit-test contexts where $env is unavailable.
	 */
	constructor(apiKey?: string) {
		const key = apiKey ?? process.env.GROQ_API_KEY ?? '';
		if (!key) {
			throw new Error('[groq] GROQ_API_KEY is not set — add it to your .env file');
		}
		// Groq uses an OpenAI-compatible API — same SDK, different base URL + key
		this.client = new OpenAI({
			apiKey: key,
			baseURL: 'https://api.groq.com/openai/v1',
		});
	}

	/**
	 * Sends a completion request to Groq Llama 3.3 70B.
	 * Uses native JSON mode when jsonMode is requested.
	 * No retry logic — Groq is fast enough that timeouts are rare.
	 */
	async complete(options: AICompletionOptions): Promise<AICompletionResult> {
		const start = Date.now();

		try {
			const response = await this.client.chat.completions.create({
				model: GROQ_MODEL,
				max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
				temperature: options.temperature ?? 0.7,
				messages: options.messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
				// Groq has native JSON mode — cleaner than prompt hacking
				...(options.jsonMode && {
					response_format: { type: 'json_object' as const },
				}),
			});

			const text = response.choices[0]?.message?.content ?? '';

			return {
				text,
				usage: response.usage
					? {
							promptTokens: response.usage.prompt_tokens,
							completionTokens: response.usage.completion_tokens,
						}
					: undefined,
				latencyMs: Date.now() - start,
				provider: this.id,
				model: GROQ_MODEL,
			};
		} catch (err) {
			throw new Error(
				`[groq] Groq API error after ${Date.now() - start}ms: ` +
					(err instanceof Error ? err.message : String(err))
			);
		}
	}
}
