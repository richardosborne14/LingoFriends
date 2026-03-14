/**
 * POST /api/help/ask
 *
 * In-lesson AI assistant endpoint. Called when the learner taps ❓ and
 * chooses "Explain this", "Give me a hint", or types a free question.
 *
 * Flow:
 *   Client sends { action, context, question? }
 *   → Server validates input
 *   → Builds AI messages using helpAssistant pure functions
 *   → Calls getFastModel() (Groq Llama 3.3 70B — fast response, < 2s)
 *   → Returns { response: string }
 *
 * WHY FAST MODEL: Help must respond quickly. Kids lose focus if they wait.
 * The fast model is perfectly capable of 2-3 sentence explanations.
 * The smart model is overkill here and costs 10x more per call.
 *
 * Error handling:
 * - 401: not authenticated
 * - 400: missing/invalid fields
 * - 503: AI provider unavailable (rare, logged)
 *
 * @module routes/api/help/ask
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFastModel } from '$lib/server/ai/router';
import {
	buildSystemPrompt,
	buildExplainPrompt,
	buildHintPrompt,
	buildFreeQuestionPrompt,
	type HelpContext,
	type HelpAction,
} from '$lib/services/helpAssistant';
import type { AIMessage } from '$lib/server/ai/types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Must be logged in to use help — prevents abuse of the AI endpoint
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const b = body as Record<string, unknown>;

	// ── Validate action ────────────────────────────────────────────────────
	const validActions: HelpAction[] = ['explain', 'hint', 'free_question'];
	if (!b.action || !validActions.includes(b.action as HelpAction)) {
		error(400, `action must be one of: ${validActions.join(', ')}`);
	}

	const action = b.action as HelpAction;

	// ── Validate context ───────────────────────────────────────────────────
	// context is the HelpContext built client-side from the current step + profile
	if (!b.context || typeof b.context !== 'object') {
		error(400, 'context is required');
	}

	const ctx = b.context as HelpContext;
	if (!ctx.activity) error(400, 'context.activity is required');
	if (!ctx.nativeLanguage) error(400, 'context.nativeLanguage is required');
	if (!ctx.targetLanguage) error(400, 'context.targetLanguage is required');
	if (!ctx.ageGroup) error(400, 'context.ageGroup is required');

	// ── Validate free question text (only required for free_question action) ──
	if (action === 'free_question') {
		if (typeof b.question !== 'string' || !b.question.trim()) {
			error(400, 'question is required for free_question action');
		}
	}

	// ── Build AI messages ──────────────────────────────────────────────────
	// System prompt is always the same — action-specific user message differs
	const systemPrompt = buildSystemPrompt(ctx);

	let userMessage: string;
	switch (action) {
		case 'explain':
			userMessage = buildExplainPrompt(ctx);
			break;
		case 'hint':
			userMessage = buildHintPrompt(ctx);
			break;
		case 'free_question':
			userMessage = buildFreeQuestionPrompt(b.question as string, ctx);
			break;
	}

	const messages: AIMessage[] = [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: userMessage },
	];

	// ── Call the fast AI model ─────────────────────────────────────────────
	try {
		const ai = getFastModel();

		const result = await ai.complete({
			messages,
			temperature: 0.7, // Some variation so repeated help requests aren't identical
			maxTokens: 200, // 2-3 sentences maximum — hard limit to keep responses brief
		});

		// Clean up the response: trim whitespace, remove wrapping quotes if any
		const response = result.text.trim().replace(/^["']|["']$/g, '');

		return json({
			response,
			// Include latency in dev/debug mode so we can monitor help response times
			latencyMs: result.latencyMs,
		});
	} catch (aiError) {
		// Log but return a graceful fallback — help should NEVER crash the lesson
		console.error('[help/ask] AI error:', aiError);
		return json(
			{
				response: `Sorry, I can't help right now! Try reading the question again carefully — you can do it! 💪`,
			},
			{ status: 503 }
		);
	}
};
