/**
 * POST /api/tts
 *
 * Server-side proxy to Google Cloud Text-to-Speech API.
 * Keeps the API key server-only (never exposed to the client).
 *
 * RULE 11: The voice is ALWAYS set to the target language, even when the
 * coaching text is partially in the native language. This guarantees correct
 * pronunciation of target language words that appear in mixed-language text.
 * (e.g., "This phrase — Ich heiße Max — means My name is Max" → de-DE voice)
 *
 * Uses Journey voices (v1beta1 endpoint) — highest quality, handle code-switching
 * well, appropriate for children. Falls back gracefully if unavailable.
 *
 * Request body:
 *   { text: string, targetLanguage: LanguageCode }
 *
 * Response:
 *   200: { audioContent: string }  ← base64 MP3
 *   400: { error: string }
 *   503: { error: string }         ← TTS unavailable (no API key / API error)
 *
 * @module routes/api/tts
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidCode, getTTSCode } from '$lib/types/language';
import type { LanguageCode } from '$lib/types/language';
// SvelteKit private env — process.env does not reliably expose non-VITE_ vars in dev
import { GOOGLE_TTS_API_KEY } from '$env/static/private';

// ─────────────────────────────────────────────────────────────────────────────
// VOICE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps language codes to Google TTS Journey voice names.
 * Journey voices are only available on the v1beta1 endpoint (not v1).
 *
 * WHY Journey: highest quality available, natural prosody, handles
 * code-switching (mixed languages in one sentence) best of all voice tiers.
 * Used in v1 reference: fr-FR-Journey-F, de-DE-Journey-F — both confirmed working.
 */
const JOURNEY_VOICES: Record<LanguageCode, string> = {
	de: 'de-DE-Journey-F',
	en: 'en-GB-Journey-F',
	fr: 'fr-FR-Journey-F',
	es: 'es-ES-Journey-F',
};

/**
 * Google Cloud TTS endpoint.
 * MUST use v1beta1 — Journey voices are not available on v1.
 * See v1 reference: this was the fix for silent voice failures.
 */
const TTS_URL = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';

// ─────────────────────────────────────────────────────────────────────────────
// TEXT CLEANING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips emojis from text before sending to TTS.
 * Google TTS reads emoji names aloud ("face with tears of joy") which sounds jarring.
 * Adapted from v1 reference ttsService.ts cleanTextForTTS().
 */
function cleanTextForTTS(text: string): string {
	return text
		.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
		.replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
		.replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
		.replace(/[\u{1F700}-\u{1FAFF}]/gu, '') // Extended symbols
		.replace(/[\u{2600}-\u{27BF}]/gu, '') // Misc symbols + Dingbats
		.replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
		.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicators (flags)
		.replace(/[\u{200D}]/gu, '') // Zero Width Joiner
		.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '') // Skin tone modifiers
		.replace(/\s+/g, ' ')
		.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
	// Parse body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const b = body as Record<string, unknown>;

	// Validate text
	if (!b.text || typeof b.text !== 'string' || !b.text.trim()) {
		error(400, 'text is required');
	}

	// Validate targetLanguage
	if (!b.targetLanguage || typeof b.targetLanguage !== 'string') {
		error(400, 'targetLanguage is required');
	}
	if (!isValidCode(b.targetLanguage)) {
		error(400, `Unknown targetLanguage: "${b.targetLanguage}"`);
	}

	const targetLanguage = b.targetLanguage as LanguageCode;

	// Resolve API key via SvelteKit private env (imported at module top)
	// process.env does NOT work reliably in SvelteKit dev server for non-VITE_ vars
	const apiKey = GOOGLE_TTS_API_KEY;

	if (!apiKey) {
		// No TTS key configured — return 503, client falls back silently (Rule 14)
		console.warn('[/api/tts] No GOOGLE_TTS_API_KEY configured — TTS unavailable');
		error(503, 'TTS service not configured');
	}

	// Get voice config for target language
	const ttsLanguageCode = getTTSCode(targetLanguage); // e.g., 'de-DE'
	const voiceName = JOURNEY_VOICES[targetLanguage]; // e.g., 'de-DE-Journey-F'

	// Clean text (remove emojis)
	const cleanedText = cleanTextForTTS(b.text as string);
	if (!cleanedText) {
		error(400, 'Text is empty after cleaning');
	}

	// Build Google TTS request
	// Speaking rate 0.95 — slightly slower for language learners
	const requestBody = {
		input: { text: cleanedText },
		voice: {
			languageCode: ttsLanguageCode,
			name: voiceName,
			ssmlGender: 'FEMALE',
		},
		audioConfig: {
			audioEncoding: 'MP3',
			speakingRate: 0.95,
			// Note: Journey voices do NOT support pitch parameter — omit it
			// (v1 reference learned this the hard way — causes API errors)
			volumeGainDb: 0.0,
		},
	};

	try {
		const response = await fetch(`${TTS_URL}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorBody = await response.text().catch(() => '');
			console.error(`[/api/tts] Google TTS API error ${response.status}:`, errorBody);
			error(503, `TTS API error: ${response.status}`);
		}

		const result = (await response.json()) as { audioContent?: string };

		if (!result.audioContent) {
			console.error('[/api/tts] No audioContent in Google TTS response');
			error(503, 'TTS returned no audio');
		}

		return json({ audioContent: result.audioContent });
	} catch (err) {
		// Re-throw SvelteKit errors (from our own error() calls above)
		if (err && typeof err === 'object' && 'status' in err) throw err;

		// Unexpected network/parse error
		console.error('[/api/tts] Unexpected error:', err);
		error(503, 'TTS service unavailable');
	}
};
