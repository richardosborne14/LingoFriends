/**
 * LingoFriends V2 — Google Cloud TTS Client (Server-Side Direct)
 *
 * Direct Google TTS API call used by server-side code (lesson generation pipeline).
 * This module is intentionally separate from /api/tts so the lesson generator
 * can pre-generate TTS for all lesson phrases without going through an HTTP round-trip.
 *
 * RULE 11: The voice is ALWAYS set to the target language, even when the
 * text being synthesised is in the native language (e.g., a French explanation
 * read by a German voice). This guarantees correct pronunciation of any
 * target-language words embedded in the text.
 *
 * WHY extract this module: /api/tts is the client-facing proxy. This module
 * is the raw API call that both the proxy and the lesson generator share.
 * Avoids duplicating the TTS request logic.
 *
 * @module server/tts/googleTTS
 */

import type { LanguageCode } from '$lib/types/language';
import { getTTSCode } from '$lib/types/language';

// ─────────────────────────────────────────────────────────────────────────────
// VOICE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Google Journey voice names, keyed by language code.
 * Journey voices (v1beta1 only) give the best quality and handle
 * mixed-language text (code-switching) better than Standard or WaveNet voices.
 *
 * Confirmed working from v1 reference: fr-FR-Journey-F, de-DE-Journey-F
 */
const JOURNEY_VOICES: Record<LanguageCode, string> = {
	de: 'de-DE-Journey-F',
	en: 'en-GB-Journey-F',
	fr: 'fr-FR-Journey-F',
	es: 'es-ES-Journey-F',
};

/**
 * v1beta1 endpoint is REQUIRED for Journey voices.
 * The standard v1 endpoint does not support Journey tier voices.
 */
const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';

// ─────────────────────────────────────────────────────────────────────────────
// TEXT CLEANING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips emoji characters before sending text to Google TTS.
 *
 * WHY: Google TTS reads emoji names aloud ("face with tears of joy"),
 * which sounds jarring in a children's language learning context.
 * Copied from /api/tts route handler for consistency.
 *
 * @param text - Raw text that may contain emojis
 * @returns Cleaned text safe for TTS
 */
export function cleanTextForTTS(text: string): string {
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
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls Google Cloud TTS API and returns base64-encoded MP3 audio.
 *
 * Always uses the target language voice (RULE 11).
 * Returns null on any failure — callers should handle absence of audio gracefully.
 *
 * @param text           - Text to synthesise (emojis stripped internally)
 * @param targetLanguage - Language code determining which voice to use
 * @param apiKey         - Google Cloud TTS API key
 * @returns base64 MP3 string, or null if generation fails
 */
export async function callGoogleTTS(
	text: string,
	targetLanguage: LanguageCode,
	apiKey: string
): Promise<string | null> {
	// Guard: empty text after cleaning should produce no audio
	const cleanedText = cleanTextForTTS(text);
	if (!cleanedText) {
		console.warn('[googleTTS] Text was empty after cleaning, skipping');
		return null;
	}

	const ttsLanguageCode = getTTSCode(targetLanguage); // e.g., 'de-DE'
	const voiceName = JOURNEY_VOICES[targetLanguage]; // e.g., 'de-DE-Journey-F'

	// Build the Google TTS request payload
	// Speaking rate 0.95: slightly slower than normal — aids language learners
	// NOTE: Journey voices do NOT support the `pitch` parameter — omit it
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
			// pitch is intentionally absent — Journey voices reject it
			volumeGainDb: 0.0,
		},
	};

	try {
		const response = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			console.warn(`[googleTTS] API error ${response.status}:`, body);
			return null;
		}

		const result = (await response.json()) as { audioContent?: string };

		if (!result.audioContent) {
			console.warn('[googleTTS] API returned no audioContent');
			return null;
		}

		return result.audioContent;
	} catch (err) {
		// Network / parse errors — non-fatal, lesson continues without audio
		console.warn('[googleTTS] Unexpected error:', err);
		return null;
	}
}
