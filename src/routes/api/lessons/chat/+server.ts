/**
 * POST /api/lessons/chat
 *
 * Pre-lesson chat endpoint.
 * Uses the FAST model (Groq Llama 3.3) for real-time conversation.
 * Collects personal context to personalise the upcoming lesson.
 *
 * Per Rule 9: personal context is ALWAYS optional — if this endpoint fails
 * or the user skips, lesson generation continues with null context.
 *
 * Request body:
 *   { messages: ChatMessage[], targetLanguage, nativeLanguage, topic }
 *
 * Response:
 *   200: { reply: string }
 *   400: { error: string }
 *   401: { error: 'Unauthorised' }
 *
 * @module routes/api/lessons/chat
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFastModel } from '$lib/server/ai/router';
import { toName, isValidCode } from '$lib/types/language';
import type { LanguageCode } from '$lib/types/language';

/**
 * System prompt for the pre-lesson chat NPC.
 * Warm, curious, age-appropriate. Never pushy — if they don't want to share, that's fine.
 */
function buildChatSystemPrompt(
	targetLanguageName: string,
	nativeLanguageName: string,
	topic: string
): string {
	return `You are a friendly language learning companion for children learning ${targetLanguageName}.
The learner speaks ${nativeLanguageName} as their native language.

Your job: Have a SHORT, warm conversation to learn about the learner before their lesson on "${topic}".
The information will help personalise their lesson.

RULES:
- Maximum 2-3 questions total across the whole conversation
- Keep ALL responses to 1-2 sentences maximum  
- Use simple words suitable for children ages 7-18
- Be encouraging and positive — no pressure if they don't want to share
- Ask about things relevant to "${topic}" (e.g., their name, hobbies, favourite things)
- When you have enough context (or after 2-3 exchanges), end with a positive encouragement
- NEVER ask for: full name, age, school, address, or any personal identifying information
- Keep it light and fun — this should feel like chatting with a friend

If the learner seems done or says they want to start, respond with just: "START_LESSON"

Respond in ${nativeLanguageName}.`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	if (!body || typeof body !== 'object') {
		error(400, 'Request body must be a JSON object');
	}

	const b = body as Record<string, unknown>;

	if (!Array.isArray(b.messages) || b.messages.length === 0) {
		error(400, 'messages array is required');
	}
	if (typeof b.targetLanguage !== 'string' || !isValidCode(b.targetLanguage)) {
		error(400, 'targetLanguage must be a valid language code');
	}
	if (typeof b.nativeLanguage !== 'string' || !isValidCode(b.nativeLanguage)) {
		error(400, 'nativeLanguage must be a valid language code');
	}
	if (typeof b.topic !== 'string') error(400, 'topic is required');

	// Cast is safe — we validated with isValidCode above
	const targetName = toName(b.targetLanguage as LanguageCode);
	const nativeName = toName(b.nativeLanguage as LanguageCode);
	const systemPrompt = buildChatSystemPrompt(targetName, nativeName, b.topic);

	// Build messages array for the AI
	const messages = [
		{ role: 'system' as const, content: systemPrompt },
		...b.messages.map((m: Record<string, unknown>) => ({
			role: (m.role as 'user' | 'assistant') ?? 'user',
			content: String(m.content ?? ''),
		})),
	];

	// Use fast model — this must feel conversational (< 2s response time)
	const model = getFastModel();
	let result;
	try {
		result = await model.complete({ messages, temperature: 0.9, maxTokens: 150 });
	} catch (err) {
		console.error('[/api/lessons/chat] Fast model failed:', err);
		// Fail gracefully — return a canned response so the lesson can still start
		return json({ reply: "Ready to start? Let's go!", skipToLesson: true });
	}

	return json({ reply: result.text });
};
