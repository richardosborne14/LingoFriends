/**
 * sttService.ts — Client-side Speech-to-Text Helper
 *
 * TASK-AUDIT-01: Voice Input Foundation
 *
 * This module handles everything between "the child tapped the mic button"
 * and "the transcript arrives back". It owns:
 *   1. MediaRecorder lifecycle (start / stop / auto-stop)
 *   2. Audio blob → POST /api/stt → transcript string
 *   3. MIME type detection with webm→wav fallback
 *
 * Design: all functions are pure and testable. State (recording, etc.)
 * is managed by the calling component (MicButton.svelte).
 *
 * Browser support matrix:
 *   Chrome/Edge: audio/webm;codecs=opus  ✅
 *   Firefox:     audio/webm              ✅ (no codec specifier needed)
 *   Safari:      audio/mp4               ✅ (Safari doesn't support webm)
 *   iOS Safari:  audio/mp4               ✅
 *
 * @module services/sttService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result returned from transcribeBlob() on success.
 * The caller (MicButton) inserts `text` into the input field.
 */
export interface TranscriptResult {
	/** The transcribed text, already trimmed */
	text: string;
	/** ISO language code detected or hinted (e.g. 'de') */
	language: string;
}

/**
 * Possible failure modes so callers can give appropriate error messages.
 * Keeping these as a union rather than free strings prevents typos.
 */
export type STTErrorKind =
	| 'mic_denied'         // User (or browser) rejected getUserMedia
	| 'mic_unavailable'    // No microphone hardware found
	| 'format_unsupported' // MediaRecorder can't record any format
	| 'too_short'          // Recording was < MIN_DURATION_MS
	| 'api_error'          // /api/stt returned an HTTP error
	| 'network_error'      // Fetch itself threw (offline/timeout)
	| 'empty_transcript';  // API returned 200 but text was blank

export interface STTError {
	kind: STTErrorKind;
	message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum recording duration before we send to Whisper.
 * Recordings shorter than this are almost certainly accidental taps.
 * 500ms gives a tiny buffer — a real word takes at least 300ms to say.
 */
const MIN_DURATION_MS = 500;

/**
 * MIME types to try in preference order.
 * We prefer opus (smaller files, same quality) but fall back gracefully.
 * Safari requires mp4 — it does not support WebM at all.
 */
const PREFERRED_MIME_TYPES = [
	'audio/webm;codecs=opus',
	'audio/webm',
	'audio/ogg;codecs=opus',
	'audio/mp4',
];

// ─────────────────────────────────────────────────────────────────────────────
// MIME TYPE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the best supported MIME type for MediaRecorder.
 *
 * Goes through PREFERRED_MIME_TYPES and returns the first one the current
 * browser supports. Returns undefined if none are supported (should not
 * happen in any modern browser).
 *
 * @returns Supported MIME type string, or undefined if none found
 */
export function getSupportedMimeType(): string | undefined {
	// In test environments, MediaRecorder may not exist
	if (typeof MediaRecorder === 'undefined') return undefined;

	return PREFERRED_MIME_TYPES.find((type) =>
		MediaRecorder.isTypeSupported(type)
	);
}

/**
 * Maps a MIME type to the file extension Groq Whisper expects.
 * Whisper identifies format by file extension, not MIME type.
 */
export function mimeTypeToExtension(mimeType: string): string {
	if (mimeType.startsWith('audio/webm')) return 'webm';
	if (mimeType.startsWith('audio/ogg')) return 'ogg';
	if (mimeType.startsWith('audio/mp4')) return 'mp4';
	if (mimeType.startsWith('audio/wav')) return 'wav';
	// Fallback — Whisper is lenient about extensions
	return 'webm';
}

// ─────────────────────────────────────────────────────────────────────────────
// MICROPHONE ACCESS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests microphone access and returns a MediaStream on success.
 *
 * Translates browser permission errors into our STTError type so callers
 * don't need to inspect DOMException names directly.
 *
 * @returns Resolved MediaStream, or rejected with STTError
 */
export async function requestMicAccess(): Promise<MediaStream> {
	if (!navigator.mediaDevices?.getUserMedia) {
		return Promise.reject({
			kind: 'mic_unavailable',
			message: 'Microphone is not available on this device',
		} satisfies STTError);
	}

	try {
		// audio: true requests default microphone.
		// We don't constrain sample rate / channel count — let the browser pick
		// the best settings for the current hardware.
		return await navigator.mediaDevices.getUserMedia({ audio: true });
	} catch (err) {
		const domErr = err as DOMException;

		// NotAllowedError / PermissionDeniedError = user denied
		if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
			return Promise.reject({
				kind: 'mic_denied',
				message: 'Microphone access was not allowed',
			} satisfies STTError);
		}

		// NotFoundError = no mic hardware
		if (domErr.name === 'NotFoundError' || domErr.name === 'DevicesNotFoundError') {
			return Promise.reject({
				kind: 'mic_unavailable',
				message: 'No microphone found on this device',
			} satisfies STTError);
		}

		// Any other error
		return Promise.reject({
			kind: 'mic_unavailable',
			message: `Microphone error: ${domErr.message ?? 'unknown'}`,
		} satisfies STTError);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDING SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle returned by startRecording() — used to stop the session.
 */
export interface RecordingHandle {
	/**
	 * Stops recording and resolves with the audio Blob.
	 * Call this when the child taps "stop" or when the timer fires.
	 */
	stop: () => Promise<Blob>;

	/**
	 * Aborts recording without producing a blob.
	 * Called if the component unmounts or an error occurs.
	 */
	abort: () => void;
}

/**
 * Starts a recording session on the given MediaStream.
 *
 * Uses the best available MIME type, falls back gracefully.
 * Returns a handle with stop() and abort() methods.
 *
 * @param stream - An active MediaStream from requestMicAccess()
 * @returns RecordingHandle to control the session
 * @throws STTError if MediaRecorder cannot be created
 */
export function startRecording(stream: MediaStream): RecordingHandle {
	const mimeType = getSupportedMimeType();

	if (!mimeType) {
		// This is an exceptional case — all modern browsers support at least one format
		throw {
			kind: 'format_unsupported',
			message: 'Your browser does not support audio recording',
		} satisfies STTError;
	}

	const recorder = new MediaRecorder(stream, { mimeType });
	const chunks: BlobEvent['data'][] = [];

	recorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			chunks.push(event.data);
		}
	};

	recorder.start();

	const stop = (): Promise<Blob> => {
		return new Promise((resolve) => {
			recorder.onstop = () => {
				// Combine all chunks into a single Blob with the correct MIME type
				const blob = new Blob(chunks, { type: mimeType });
				// Stop all tracks so the browser releases the mic (removes red indicator)
				stream.getTracks().forEach((track) => track.stop());
				resolve(blob);
			};
			recorder.stop();
		});
	};

	const abort = () => {
		try {
			recorder.stop();
		} catch {
			// Already stopped — harmless
		}
		stream.getTracks().forEach((track) => track.stop());
	};

	return { stop, abort };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSCRIPTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends an audio Blob to /api/stt and returns the transcript.
 *
 * This is the final step after recording completes. The blob is uploaded
 * as multipart form data. The server handles the Groq API call.
 *
 * @param blob - The recorded audio Blob
 * @param languageHint - ISO language code hint (e.g. 'de' for German). Optional.
 * @param durationMs - How long the recording was in ms (for too-short detection)
 * @returns TranscriptResult on success
 * @throws STTError on any failure
 */
export async function transcribeBlob(
	blob: Blob,
	languageHint?: string,
	durationMs?: number
): Promise<TranscriptResult> {
	// Guard against recordings that are too short to contain real speech
	if (durationMs !== undefined && durationMs < MIN_DURATION_MS) {
		throw {
			kind: 'too_short',
			message: 'Recording too short — please speak for at least half a second',
		} satisfies STTError;
	}

	// Build the file name with the correct extension for Groq
	const ext = mimeTypeToExtension(blob.type);
	const file = new File([blob], `recording.${ext}`, { type: blob.type });

	const form = new FormData();
	form.append('audio', file);
	if (languageHint) {
		form.append('language', languageHint);
	}

	let response: Response;
	try {
		response = await fetch('/api/stt', {
			method: 'POST',
			body: form,
		});
	} catch (fetchErr) {
		throw {
			kind: 'network_error',
			message: 'Could not connect to speech recognition — check your internet connection',
		} satisfies STTError;
	}

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw {
			kind: 'api_error',
			message: text || `Speech recognition failed (${response.status})`,
		} satisfies STTError;
	}

	const data = await response.json();
	const text = (data.text ?? '').trim();

	// A successful API call with empty text usually means Whisper heard silence
	if (!text) {
		throw {
			kind: 'empty_transcript',
			message: "I didn't catch that — please try speaking again",
		} satisfies STTError;
	}

	return {
		text,
		language: data.language ?? languageHint ?? 'unknown',
	};
}
