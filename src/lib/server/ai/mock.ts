/**
 * LingoFriends V2 — Mock AI Provider
 *
 * Returns pre-canned responses that match the exact ChunkFamilyContent schema.
 * Used in tests and local development to avoid burning API tokens.
 *
 * Enabled by setting AI_PROVIDER=mock in your .env file.
 * The mock introduces a small artificial delay to simulate real latency.
 *
 * @module server/ai/mock
 */

import type { AIProvider, AICompletionOptions, AICompletionResult } from './types';
import type { ChunkFamilyContent } from '$lib/types/lesson';

/** Simulated latency in milliseconds — realistic enough for testing loading states */
const MOCK_LATENCY_MS = 120;

/**
 * A realistic mock ChunkFamilyContent response for the "introduce-name" topic.
 * Uses German as target language and English as native language.
 * This is the canonical test fixture used across all lesson engine tests.
 */
export const MOCK_CHUNK_FAMILY: ChunkFamilyContent = {
	coreFrame: 'Ich heiße ___',
	coreFrameTranslation: 'My name is ___',
	title: 'Saying Your Name',
	chunks: [
		{
			targetPhrase: 'Ich heiße Max',
			nativeTranslation: 'My name is Max',
			exampleSentence: 'Hallo! Ich heiße Max. Und du?',
			usageNote: 'The most common way to introduce yourself in German.',
			explanation:
				'Say this when you meet someone new. "Ich" means "I", "heiße" means "am called".',
			distractors: ['I am hungry', 'I like football', 'Good morning'],
			correctUsageContext: 'Meeting someone new at school',
			wrongUsageContexts: [
				'Ordering food at a restaurant',
				'Saying goodbye to a friend',
				'Asking for directions',
			],
			coachingText:
				"Hey! In German, when you want to tell someone your name, you say 'Ich heiße' and then your name. 'Ich' means 'I', and 'heiße' is like 'am called'. So 'Ich heiße Max' means 'My name is Max'. Easy, right?",
		},
		{
			targetPhrase: 'Ich heiße Luna',
			nativeTranslation: 'My name is Luna',
			exampleSentence: 'Guten Tag! Ich heiße Luna.',
			usageNote: 'Same pattern — just swap in your own name!',
			explanation:
				'This is exactly the same frame. Change "Luna" to any name. That is the power of a chunk family!',
			distractors: ['I am tired', 'Nice to meet you', 'How are you?'],
			correctUsageContext: 'Introducing yourself to a new teacher',
			wrongUsageContexts: [
				'Asking someone their name',
				'Saying you are leaving',
				'Ordering a drink',
			],
			coachingText:
				"Great! Now let's try it with a different name. 'Ich heiße Luna' means 'My name is Luna'. You can swap any name in after 'heiße'. What would it be with your name?",
		},
		{
			targetPhrase: 'Ich heiße Professor Keks',
			nativeTranslation: 'My name is Professor Cookie',
			exampleSentence: 'Ich heiße Professor Keks. Sehr erfreut!',
			usageNote: 'A silly name to make the pattern memorable and fun!',
			explanation:
				'"Keks" means "cookie" in German. Using funny variations helps the frame stick in your memory.',
			distractors: ['I want cookies', 'See you later', 'I do not know'],
			correctUsageContext: 'Playing a pretend game with a silly character',
			wrongUsageContexts: ['Asking for food', 'Saying hello informally', 'Describing the weather'],
			coachingText:
				"Haha! 'Professor Keks' means 'Professor Cookie'! Any name works in this frame. 'Ich heiße ___' is your superpower for introducing yourself in German!",
		},
	],
};

/**
 * Mock AI provider for testing and development.
 *
 * Returns MOCK_CHUNK_FAMILY as JSON for any prompt that looks like a chunk
 * generation request. For other prompts, returns a generic assistant message.
 */
export class MockProvider implements AIProvider {
	id = 'mock';
	name = 'Mock Provider (Test)';

	/**
	 * Simulates an AI completion with a pre-canned response.
	 * Adds a small artificial delay to test loading states.
	 */
	async complete(options: AICompletionOptions): Promise<AICompletionResult> {
		const start = Date.now();

		// Simulate network latency — short enough for fast tests, long enough to test loading
		await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

		// Determine response type from the user message content
		const lastUserMessage = options.messages.findLast((m) => m.role === 'user')?.content ?? '';
		const isChunkRequest =
			lastUserMessage.toLowerCase().includes('topic:') ||
			lastUserMessage.toLowerCase().includes('chunk') ||
			options.messages.some((m) => m.content.toLowerCase().includes('chunk family'));

		// Return appropriate mock response
		const responseText = isChunkRequest
			? JSON.stringify(MOCK_CHUNK_FAMILY)
			: '{"readyToStart": true, "personalContext": "The learner likes football and gaming."}';

		return {
			text: responseText,
			usage: {
				// Realistic token counts for cost estimation tests
				promptTokens: 450,
				completionTokens: 380,
			},
			latencyMs: Date.now() - start,
			provider: this.id,
			model: 'mock-v1',
		};
	}
}
