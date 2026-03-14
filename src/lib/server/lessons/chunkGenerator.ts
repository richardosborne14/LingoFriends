/**
 * LingoFriends V2 — Chunk Family Generator
 *
 * Calls the smart AI model (Haiku 4.5) to produce a ChunkFamilyContent —
 * one core sentence frame with N personalised variations (chunks).
 *
 * ARCHITECTURE RULE: This module generates CONTENT ONLY.
 * It never builds ActivityConfig objects, LessonStep objects, or LessonPlan objects.
 * That responsibility belongs entirely to lessonAssembler.ts.
 *
 * Chunk count by age group (shorter lessons for younger learners):
 *   7-10:   2 chunks × 5 steps = 10 activities (~5 min)
 *   11-14:  3 chunks × 5 steps = 15 activities (~8 min)
 *   15-18:  3 chunks × 5 steps = 15 activities (~10 min)
 *
 * @module server/lessons/chunkGenerator
 */

import { getSmartModel } from '$lib/server/ai/router';
import { extractJSON, parseJSON } from '$lib/server/ai/utils';
import { toName } from '$lib/types/language';
import type { ChunkFamilyContent, ChunkGenerationParams, GeneratedChunk } from '$lib/types/lesson';

/** Number of chunks to request per age group */
const CHUNK_COUNT_BY_AGE: Record<string, number> = {
	'7-10': 2,
	'11-14': 3,
	'15-18': 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the system prompt for chunk family generation.
 *
 * Explains the chunk family concept with GOOD/BAD examples so the model
 * understands what a "frame with variations" looks like vs. random phrases.
 *
 * @param targetLanguageName - Display name of the target language (e.g., "German")
 * @param nativeLanguageName - Display name of the native language (e.g., "English")
 * @param chunkCount - How many chunks to generate (2 or 3 based on age group)
 */
export function buildSystemPrompt(
	targetLanguageName: string,
	nativeLanguageName: string,
	chunkCount: number
): string {
	return `You are a specialist language content designer for children's language education.
You create CHUNK FAMILIES — one core sentence frame explored through ${chunkCount} natural variations.

TARGET LANGUAGE: ${targetLanguageName}
NATIVE LANGUAGE (for translations, distractors, explanations): ${nativeLanguageName}

A chunk family is a reusable sentence pattern (the "frame") with ${chunkCount} variations that
fill the frame's variable slot(s) with different, personally relevant content.

GOOD chunk family for "Introduce Yourself" (German):
  Frame: "Ich heiße ___" (My name is ___)
  1. "Ich heiße Max" (My name is Max)
  2. "Ich heiße Luna" (My name is Luna)
  3. "Ich heiße Professor Keks" (My name is Professor Cookie) ← silly variation is memorable

BAD output (NEVER produce this):
  1. "Hallo Freunde" (Hello friends)
  2. "Wie geht's?" (How are you?)
  3. "Schön dich kennenzulernen" (Nice to meet you)
  ↑ These are UNRELATED phrases. A learner cannot extract a reusable frame from this.

STRICT RULES:
1. Generate exactly ONE core frame and exactly ${chunkCount} variations
2. The frame MUST contain at least one variable slot marked with ___
3. All ${chunkCount} variations use the SAME frame with DIFFERENT slot fillers
4. All translations, distractors, explanations MUST be in ${nativeLanguageName}
5. Distractors are ALWAYS in ${nativeLanguageName} — NEVER in ${targetLanguageName}
6. If personal context is provided, at least 1 variation must reference it
7. Usage contexts describe WHEN/WHERE you would use this phrase
8. Coaching text is a warm NPC monologue — friendly, encouraging, uses simple words
9. Choose frames that are HIGH FREQUENCY, GENERATIVE, and COMMUNICATIVE
10. Keep explanations age-appropriate — no grammar jargon for young learners

Respond with ONLY valid JSON matching this exact schema. No markdown fences. No preamble.

{
  "coreFrame": "string with ___",
  "coreFrameTranslation": "native language translation with ___",
  "title": "Lesson title string",
  "chunks": [
    {
      "targetPhrase": "phrase in ${targetLanguageName}",
      "nativeTranslation": "translation in ${nativeLanguageName}",
      "exampleSentence": "example usage in ${targetLanguageName}",
      "usageNote": "brief factual note in ${nativeLanguageName}",
      "explanation": "warm learner-facing explanation in ${nativeLanguageName}",
      "distractors": ["wrong answer 1 in ${nativeLanguageName}", "wrong answer 2", "wrong answer 3"],
      "correctUsageContext": "when/where you'd say this in ${nativeLanguageName}",
      "wrongUsageContexts": ["wrong context 1", "wrong context 2", "wrong context 3"],
      "coachingText": "warm NPC introduction in ${nativeLanguageName}"
    }
  ]
}`;
}

/**
 * Builds the user prompt with the specific lesson request.
 *
 * Includes topic, learner interests, personal context, and existing chunks
 * to avoid so the lesson feels fresh and personalised.
 *
 * @param params - All chunk generation parameters
 * @param chunkCount - How many chunks to generate
 */
export function buildUserPrompt(params: ChunkGenerationParams, chunkCount: number): string {
	const { topic, ageGroup, interests, personalContext, existingChunks } = params;

	const lines = [
		`Topic: ${topic}`,
		`Age group: ${ageGroup} years old`,
		`Learner interests: ${interests.length > 0 ? interests.join(', ') : 'general topics'}`,
		`Chunks needed: ${chunkCount}`,
	];

	// Include personal context if provided — this makes the lesson feel tailored
	if (personalContext) {
		lines.push(`Personal context from pre-lesson chat: "${personalContext}"`);
		lines.push(
			`(Include at least 1 chunk variation that references this personal context naturally)`
		);
	}

	// Tell the AI which phrases to avoid — prevents repetition across lessons
	if (existingChunks && existingChunks.length > 0) {
		lines.push(`Already taught (do NOT repeat these): ${existingChunks.join(', ')}`);
	}

	lines.push('');
	lines.push(`Generate a chunk family for this lesson. Remember: ${chunkCount} chunks only.`);

	return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the raw AI response and casts it to ChunkFamilyContent.
 *
 * Throws descriptive errors for each type of validation failure so the
 * retry logic (in generateChunkFamily) knows exactly what went wrong.
 *
 * @param raw - Parsed JSON object from the AI response
 * @param expectedChunkCount - How many chunks we expected
 * @throws Error with specific message if validation fails
 */
export function validateChunkFamily(
	raw: unknown,
	expectedChunkCount: number
): ChunkFamilyContent {
	if (!raw || typeof raw !== 'object') {
		throw new Error('[chunkGenerator] Response is not an object');
	}

	const obj = raw as Record<string, unknown>;

	// Validate top-level fields
	if (typeof obj.coreFrame !== 'string' || obj.coreFrame.trim() === '') {
		throw new Error('[chunkGenerator] Missing or empty coreFrame');
	}
	if (!obj.coreFrame.includes('___')) {
		throw new Error(
			`[chunkGenerator] coreFrame must contain ___ slot: "${obj.coreFrame}"`
		);
	}
	if (typeof obj.coreFrameTranslation !== 'string' || obj.coreFrameTranslation.trim() === '') {
		throw new Error('[chunkGenerator] Missing or empty coreFrameTranslation');
	}
	if (typeof obj.title !== 'string' || obj.title.trim() === '') {
		throw new Error('[chunkGenerator] Missing or empty title');
	}
	if (!Array.isArray(obj.chunks)) {
		throw new Error('[chunkGenerator] chunks must be an array');
	}
	if (obj.chunks.length !== expectedChunkCount) {
		throw new Error(
			`[chunkGenerator] Expected ${expectedChunkCount} chunks, got ${obj.chunks.length}`
		);
	}

	// Validate each chunk has all required fields
	const requiredChunkFields: (keyof GeneratedChunk)[] = [
		'targetPhrase',
		'nativeTranslation',
		'exampleSentence',
		'usageNote',
		'explanation',
		'distractors',
		'correctUsageContext',
		'wrongUsageContexts',
		'coachingText',
	];

	for (let i = 0; i < obj.chunks.length; i++) {
		const chunk = obj.chunks[i] as Record<string, unknown>;
		for (const field of requiredChunkFields) {
			if (chunk[field] === undefined || chunk[field] === null) {
				throw new Error(`[chunkGenerator] Chunk ${i} missing field: ${field}`);
			}
		}

		// Validate array fields
		if (!Array.isArray(chunk.distractors) || chunk.distractors.length !== 3) {
			throw new Error(
				`[chunkGenerator] Chunk ${i} must have exactly 3 distractors, got ${Array.isArray(chunk.distractors) ? chunk.distractors.length : 'non-array'}`
			);
		}
		if (!Array.isArray(chunk.wrongUsageContexts) || chunk.wrongUsageContexts.length !== 3) {
			throw new Error(
				`[chunkGenerator] Chunk ${i} must have exactly 3 wrongUsageContexts, got ${Array.isArray(chunk.wrongUsageContexts) ? chunk.wrongUsageContexts.length : 'non-array'}`
			);
		}
	}

	return raw as ChunkFamilyContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a chunk family using the smart AI model (Haiku 4.5).
 *
 * Attempts generation, extracts and validates JSON, retries once on failure.
 * Personal context is optional — lesson generation works either way.
 *
 * @param params - All generation parameters including topic, languages, age group
 * @returns Validated ChunkFamilyContent ready for the lesson assembler
 * @throws Error if generation fails after retry
 */
export async function generateChunkFamily(
	params: ChunkGenerationParams
): Promise<ChunkFamilyContent> {
	const chunkCount = CHUNK_COUNT_BY_AGE[params.ageGroup] ?? 3;
	const targetLanguageName = toName(params.targetLanguage);
	const nativeLanguageName = toName(params.nativeLanguage);

	const systemPrompt = buildSystemPrompt(targetLanguageName, nativeLanguageName, chunkCount);
	const userPrompt = buildUserPrompt(params, chunkCount);

	return attemptGeneration(systemPrompt, userPrompt, chunkCount, 0);
}

/**
 * Internal generation attempt with retry support.
 *
 * @param systemPrompt - The system prompt for the AI
 * @param userPrompt - The user-facing request
 * @param expectedChunkCount - How many chunks we expect
 * @param attempt - 0 for first try, 1 for retry
 */
async function attemptGeneration(
	systemPrompt: string,
	userPrompt: string,
	expectedChunkCount: number,
	attempt: number
): Promise<ChunkFamilyContent> {
	const model = getSmartModel();

	let result;
	try {
		result = await model.complete({
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			temperature: 0.8, // Slightly creative — we want varied, natural variations
			maxTokens: 2048,
			jsonMode: true,
		});
	} catch (err) {
		if (attempt === 0) {
			console.warn('[chunkGenerator] AI call failed, retrying once:', err);
			return attemptGeneration(systemPrompt, userPrompt, expectedChunkCount, 1);
		}
		throw new Error(
			`[chunkGenerator] AI call failed after retry: ${err instanceof Error ? err.message : String(err)}`
		);
	}

	// Extract and parse JSON from the response
	const jsonText = extractJSON(result.text);
	let parsed: unknown;
	try {
		parsed = parseJSON(jsonText, 'chunk family response');
	} catch (err) {
		if (attempt === 0) {
			console.warn('[chunkGenerator] JSON parse failed, retrying once:', err);
			return attemptGeneration(systemPrompt, userPrompt, expectedChunkCount, 1);
		}
		throw err;
	}

	// Validate the structure
	try {
		return validateChunkFamily(parsed, expectedChunkCount);
	} catch (err) {
		if (attempt === 0) {
			console.warn('[chunkGenerator] Validation failed, retrying once:', err);
			return attemptGeneration(systemPrompt, userPrompt, expectedChunkCount, 1);
		}
		throw err;
	}
}
