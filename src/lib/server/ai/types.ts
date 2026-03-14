/**
 * LingoFriends V2 — AI Provider Interface
 *
 * Defines the abstraction layer for all AI models used in the app.
 * Every AI provider (Haiku, Groq, Mock) implements the AIProvider interface,
 * enabling the router to swap providers transparently.
 *
 * WHY: Isolates AI provider details from business logic. Enables mock testing
 * without real API calls, and makes future model swaps a 1-line change.
 *
 * @module server/ai/types
 */

/**
 * A single message in a conversation.
 * Follows the OpenAI/Anthropic message format (both use this shape).
 */
export interface AIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/**
 * Options passed to AIProvider.complete().
 * All fields except messages are optional with sensible defaults.
 */
export interface AICompletionOptions {
	/** The conversation history including system prompt */
	messages: AIMessage[];
	/**
	 * Sampling temperature (0.0 = deterministic, 1.0 = creative).
	 * Default: 0.7 — balanced for language learning content.
	 */
	temperature?: number;
	/**
	 * Maximum tokens in the response.
	 * Default varies by provider — typically 1024.
	 */
	maxTokens?: number;
	/**
	 * Request JSON-formatted output.
	 * Haiku: achieved via system prompt instruction.
	 * Groq: uses native response_format: { type: "json_object" }.
	 */
	jsonMode?: boolean;
}

/**
 * The result returned by AIProvider.complete().
 * Includes the response text, token usage, and performance metadata.
 */
export interface AICompletionResult {
	/** The raw text response from the model */
	text: string;
	/**
	 * Token usage — present if the provider reports it.
	 * Used for cost monitoring and rate limit management.
	 */
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
	/** Time from request start to full response receipt, in milliseconds */
	latencyMs: number;
	/** Provider identifier (e.g., 'haiku-4.5', 'groq-llama', 'mock') */
	provider: string;
	/** Model name (e.g., 'claude-haiku-4-5-20251001') */
	model: string;
}

/**
 * The core AI provider interface.
 * All providers (Haiku, Groq, Mock) must implement this.
 */
export interface AIProvider {
	/** Short identifier used in logs and AICompletionResult */
	id: string;
	/** Human-readable display name */
	name: string;
	/**
	 * Send a completion request to the AI model.
	 * @throws Error on unrecoverable failures (auth errors, quota exceeded)
	 * @returns AICompletionResult including text, usage, and latency
	 */
	complete(options: AICompletionOptions): Promise<AICompletionResult>;
}
