/**
 * LingoFriends V2 — Audio Service (Client-Side)
 *
 * Handles all audio playback in the lesson UI.
 * Wraps the HTML5 Audio API with graceful fallback — if audio is unavailable
 * or fails, the lesson continues silently (Rule 14: graceful degradation).
 *
 * Architecture:
 *   - Client calls /api/tts to get base64-encoded MP3 from Google Cloud TTS
 *   - Base64 audio is stored in the lesson's audioMap (text → base64)
 *   - playAudioIfAvailable() looks up text in the map, plays if found
 *   - If not found: silent no-op (lesson still works, text is displayed)
 *
 * RULE 11: All lesson audio uses the TARGET language voice — even when
 * coaching text is in the native language. This is enforced by the /api/tts
 * endpoint which always takes the target language code as voice parameter.
 *
 * @module services/audioService
 */

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

/** Currently playing HTML5 Audio element — null when nothing is playing */
let currentAudio: HTMLAudioElement | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plays a base64-encoded MP3 audio string.
 * Stops any currently playing audio first (one track at a time).
 *
 * Resolves when playback completes or fails.
 * Never rejects — audio failure should never crash a lesson.
 *
 * @param base64 - Base64-encoded MP3 data (without data URL prefix)
 */
export function playAudio(base64: string): Promise<void> {
	return new Promise((resolve) => {
		// Stop any currently playing audio before starting new
		stopAudio();

		try {
			const audio = new Audio(`data:audio/mp3;base64,${base64}`);
			currentAudio = audio;

			audio.onended = () => {
				currentAudio = null;
				resolve();
			};

			audio.onerror = () => {
				// Log but don't throw — audio failure is non-fatal (Rule 14)
				console.warn('[audioService] Playback error — continuing without audio');
				currentAudio = null;
				resolve();
			};

			audio.play().catch((err) => {
				// Browser autoplay policy may block — this is fine
				console.warn('[audioService] play() blocked (autoplay policy?):', err);
				currentAudio = null;
				resolve();
			});
		} catch (err) {
			// Unexpected error constructing Audio element (e.g., SSR environment)
			console.warn('[audioService] Failed to create Audio element:', err);
			resolve();
		}
	});
}

/**
 * Plays audio for a piece of text if it exists in the provided audioMap.
 * Silent no-op if the text is not in the map.
 *
 * This is the primary function used by activity components:
 *   await playAudioIfAvailable(chunk.targetPhrase, $audioMap);
 *
 * @param text     - The text whose audio to look up
 * @param audioMap - Map from text strings to base64 MP3 audio
 */
export function playAudioIfAvailable(
	text: string,
	audioMap: Record<string, string>
): Promise<void> {
	const base64 = audioMap[text];
	if (!base64) {
		// No audio available — silent fallback (not an error)
		return Promise.resolve();
	}
	return playAudio(base64);
}

/**
 * Stops any currently playing audio immediately.
 */
export function stopAudio(): void {
	if (currentAudio) {
		currentAudio.pause();
		// Clear src to release media resources
		currentAudio.src = '';
		currentAudio = null;
	}
}

/**
 * Returns true if audio is currently playing.
 */
export function isAudioPlaying(): boolean {
	return currentAudio !== null && !currentAudio.paused;
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS FETCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches TTS audio from the server proxy (/api/tts) for a given text.
 * Returns base64 MP3, or null if the request fails.
 *
 * WHY server proxy: keeps the Google TTS API key server-side only.
 * The server always uses the target language voice (Rule 11).
 *
 * @param text           - Text to synthesise (emojis stripped server-side)
 * @param targetLanguage - Target language code (e.g., 'de') — determines voice
 */
export async function fetchTTSAudio(
	text: string,
	targetLanguage: string
): Promise<string | null> {
	if (!text?.trim()) return null;

	try {
		const response = await fetch('/api/tts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text, targetLanguage }),
		});

		if (!response.ok) {
			console.warn(`[audioService] TTS request failed: ${response.status}`);
			return null;
		}

		const data = (await response.json()) as { audioContent?: string };
		return data.audioContent ?? null;
	} catch (err) {
		// Network error — lesson continues without audio (Rule 14)
		console.warn('[audioService] TTS fetch error:', err);
		return null;
	}
}

/**
 * Fetches TTS audio and plays it immediately.
 * Convenience wrapper for one-off TTS playback (e.g., replay button tap).
 *
 * @param text           - Text to speak
 * @param targetLanguage - Target language code for voice selection
 */
export async function fetchAndPlay(text: string, targetLanguage: string): Promise<void> {
	const base64 = await fetchTTSAudio(text, targetLanguage);
	if (base64) {
		await playAudio(base64);
	}
	// Silently skip if no audio available
}

/**
 * Pre-fetches TTS audio for multiple texts in parallel.
 * Returns an audioMap (text → base64) for all that succeed.
 *
 * Used by the lesson page to pre-cache audio for upcoming steps,
 * so playback starts instantly when a step renders.
 *
 * Failed fetches are silently omitted from the map.
 *
 * @param texts          - Array of texts to pre-fetch
 * @param targetLanguage - Target language code for all voices
 */
export async function prefetchAudioMap(
	texts: string[],
	targetLanguage: string
): Promise<Record<string, string>> {
	const entries = await Promise.allSettled(
		texts.map(async (text) => {
			const audio = await fetchTTSAudio(text, targetLanguage);
			return audio ? [text, audio] : null;
		})
	);

	const audioMap: Record<string, string> = {};
	for (const result of entries) {
		if (result.status === 'fulfilled' && result.value) {
			const [text, audio] = result.value as [string, string];
			audioMap[text] = audio;
		}
	}
	return audioMap;
}
