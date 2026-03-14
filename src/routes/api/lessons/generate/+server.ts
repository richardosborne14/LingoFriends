/**
 * POST /api/lessons/generate
 *
 * Orchestrates the full lesson generation pipeline:
 *   1. Validate request (auth, required fields)
 *   2. generateChunkFamily() — smart AI model (Haiku 4.5)
 *   3. assembleLessonPlan() — deterministic TypeScript
 *   4. validateLessonPlan() — field contract check
 *   5. Return the LessonPlan JSON to the client
 *
 * Request body:
 *   { topic, targetLanguage, nativeLanguage, ageGroup, interests?,
 *     personalContext?, existingChunks? }
 *
 * Response:
 *   200: { lesson: LessonPlan }
 *   400: { error: string }
 *   401: { error: 'Unauthorised' }
 *   500: { error: string }
 *
 * @module routes/api/lessons/generate
 */

import { json, error } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import type { RequestHandler } from './$types';

import { generateChunkFamily } from '$lib/server/lessons/chunkGenerator';
import { assembleLessonPlan } from '$lib/server/lessons/lessonAssembler';
import { validateLessonPlan } from '$lib/server/lessons/lessonValidator';
import { isValidCode } from '$lib/types/language';
import type { ChunkGenerationParams } from '$lib/types/lesson';

/**
 * Validates and normalises the request body.
 * Returns null if valid, or an error string if not.
 */
function validateBody(body: unknown): {
	params: ChunkGenerationParams;
} | { validationError: string } {
	if (!body || typeof body !== 'object') {
		return { validationError: 'Request body must be a JSON object' };
	}

	const b = body as Record<string, unknown>;

	if (!b.topic || typeof b.topic !== 'string' || !b.topic.trim()) {
		return { validationError: 'topic is required' };
	}
	if (!b.targetLanguage || typeof b.targetLanguage !== 'string') {
		return { validationError: 'targetLanguage is required' };
	}
	if (!isValidCode(b.targetLanguage)) {
		return { validationError: `Unknown targetLanguage: "${b.targetLanguage}"` };
	}
	if (!b.nativeLanguage || typeof b.nativeLanguage !== 'string') {
		return { validationError: 'nativeLanguage is required' };
	}
	if (!isValidCode(b.nativeLanguage)) {
		return { validationError: `Unknown nativeLanguage: "${b.nativeLanguage}"` };
	}
	const validAgeGroups = ['7-10', '11-14', '15-18'];
	if (!b.ageGroup || !validAgeGroups.includes(b.ageGroup as string)) {
		return { validationError: `ageGroup must be one of: ${validAgeGroups.join(', ')}` };
	}

	const params: ChunkGenerationParams = {
		topic: b.topic.trim(),
		targetLanguage: b.targetLanguage,
		nativeLanguage: b.nativeLanguage,
		ageGroup: b.ageGroup as '7-10' | '11-14' | '15-18',
		interests: Array.isArray(b.interests) ? (b.interests as string[]) : [],
		personalContext:
			typeof b.personalContext === 'string' ? b.personalContext : null,
		existingChunks: Array.isArray(b.existingChunks) ? (b.existingChunks as string[]) : [],
	};

	return { params };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth check — lesson generation is only for authenticated users
	if (!locals.user) {
		error(401, 'Unauthorised');
	}

	// Parse body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	// Validate
	const validated = validateBody(body);
	if ('validationError' in validated) {
		error(400, validated.validationError);
	}

	const { params } = validated;

	// Generate chunk family (AI call — may retry once internally)
	let chunkFamily;
	try {
		chunkFamily = await generateChunkFamily(params);
	} catch (err) {
		console.error('[/api/lessons/generate] Chunk generation failed:', err);
		error(
			500,
			`Lesson generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}

	// Assemble the lesson plan (deterministic — no AI)
	const lessonId = nanoid();
	const lessonPlan = assembleLessonPlan(chunkFamily, lessonId);

	// Validate the assembled plan before returning
	const validation = validateLessonPlan(lessonPlan);
	if (!validation.valid) {
		console.error('[/api/lessons/generate] Plan validation failed:', validation.errors);
		error(500, `Generated lesson failed validation: ${validation.errors.join('; ')}`);
	}

	if (validation.warnings.length > 0) {
		console.warn('[/api/lessons/generate] Plan warnings:', validation.warnings);
	}

	return json({ lesson: lessonPlan });
};
