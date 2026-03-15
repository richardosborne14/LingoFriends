/**
 * POST /api/stt — Speech-to-Text via Groq Whisper Large v3
 *
 * TASK-AUDIT-01: Voice Input Foundation
 *
 * This endpoint acts as a secure server-side proxy for the Groq Whisper API.
 * The GROQ_API_KEY never leaves the server — the client sends raw audio and
 * receives a text transcript.
 *
 * PRIVACY NOTE: Audio blobs are streamed directly to Groq and NOT stored by us.
 * Groq's data policy applies (they do not retain audio for free-tier Whisper
 * requests). No audio touches our database at any point.
 *
 * Request: multipart/form-data
 *   audio    File   — The recorded audio blob (.webm, .wav, .mp4)
 *   language string — ISO 639-1 hint code (e.g. 'de', 'fr'). Optional but
 *                     recommended for accuracy on short utterances.
 *
 * Response: { text: string, language: string }
 *   text     — The transcribed speech, trimmed
 *   language — The detected language (from Whisper's detection, or the hint)
 *
 * Error responses:
 *   401 — Not authenticated
 *   400 — Missing audio file
 *   502 — Groq Whisper API error (upstream failure)
 *   500 — Unexpected server error
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';

/** The Groq OpenAI-compatible transcription endpoint */
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * The Whisper model to use.
 * whisper-large-v3 has the best accuracy for children's voices and non-native
 * speakers. It handles accents and pronunciation mistakes better than the
 * turbo variant, which is critical for language learners.
 */
const WHISPER_MODEL = 'whisper-large-v3';

export const POST: RequestHandler = async ({ request, locals }) => {
	// ── Auth guard ────────────────────────────────────────────────────────────
	// STT must only be accessible to logged-in users — no anonymous voice input.
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// ── Parse multipart form data ─────────────────────────────────────────────
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		throw error(400, 'Invalid form data — expected multipart/form-data');
	}

	const audioFile = formData.get('audio') as File | null;

	// Language hint is optional but improves accuracy for short utterances.
	// For Speak It activities: target language. For coaching chat: native language.
	const languageHint = (formData.get('language') as string | null) ?? undefined;

	if (!audioFile || audioFile.size === 0) {
		throw error(400, 'No audio file provided or file is empty');
	}

	// ── Forward to Groq Whisper ───────────────────────────────────────────────
	const groqForm = new FormData();

	// Groq requires the file to have an extension it recognises.
	// The client sends webm/opus or wav; we preserve the original filename/type.
	const filename = audioFile.name || 'recording.webm';
	groqForm.append('file', audioFile, filename);
	groqForm.append('model', WHISPER_MODEL);

	// response_format=json returns { text, language } — concise and sufficient.
	// verbose_json would include word timestamps, which we don't need.
	groqForm.append('response_format', 'json');

	// Language hint helps Whisper on short utterances (< 5 seconds) where
	// auto-detection can be unreliable. It's a HINT, not a constraint —
	// Whisper will still transcribe whatever it hears.
	if (languageHint) {
		groqForm.append('language', languageHint);
	}

	let groqResponse: Response;
	try {
		groqResponse = await fetch(GROQ_WHISPER_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${GROQ_API_KEY}`,
				// Note: Do NOT set Content-Type — fetch sets it automatically
				// with the correct multipart boundary when body is FormData.
			},
			body: groqForm,
		});
	} catch (fetchErr) {
		// Network-level failure (timeout, DNS error, etc.)
		console.error('[STT] Network error reaching Groq:', fetchErr);
		throw error(502, 'Could not reach speech recognition service');
	}

	if (!groqResponse.ok) {
		const errorBody = await groqResponse.text().catch(() => '(unreadable)');
		console.error('[STT] Groq Whisper error:', groqResponse.status, errorBody);

		// Map common Groq error codes to meaningful messages
		if (groqResponse.status === 413) {
			throw error(400, 'Audio file too large — please keep recordings under 25MB');
		}
		if (groqResponse.status === 415) {
			throw error(400, 'Unsupported audio format — please use webm or wav');
		}
		throw error(502, 'Speech recognition failed — please try again');
	}

	// ── Parse and return transcript ───────────────────────────────────────────
	const result = await groqResponse.json();

	return json({
		// Trim whitespace — Whisper sometimes adds trailing spaces
		text: (result.text ?? '').trim(),
		// language field is present in json response_format
		language: result.language ?? languageHint ?? 'unknown',
	});
};
