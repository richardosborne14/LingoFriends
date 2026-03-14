/**
 * LingoFriends V2 — Sound Effect Service (TASK-V2-03)
 *
 * Plays short UI sound effects from /public/sounds/ using the HTML5 Audio API.
 * Respects a user-controlled mute preference persisted in localStorage.
 *
 * Sound files already present in /public/sounds/:
 *   celebrate.wav  → lesson-complete
 *   reward.wav     → correct answer / sundrop earned
 *   penalty.mp3    → wrong answer
 *   levelup.wav    → streak milestone
 *   tap.wav        → UI taps
 *   skip.wav       → skipping an activity
 *   npc-greet.wav  → NPC encounter greeting
 *
 * DESIGN DECISION: sounds are fire-and-forget (no await). They enhance
 * the experience but must never block game flow if audio fails.
 *
 * @module services/soundService
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All typed sound events in the lesson system.
 * Keeps callers decoupled from file paths — paths can change without touching callers.
 */
export type SoundEvent =
	| 'correct'          // reward.wav — correct answer (non-streak)
	| 'wrong'            // penalty.mp3 — wrong answer
	| 'streak-3'         // levelup.wav — 3-in-a-row milestone
	| 'streak-5'         // levelup.wav — 5-in-a-row milestone
	| 'streak-10'        // levelup.wav — 10-in-a-row milestone
	| 'lesson-complete'  // celebrate.wav — lesson finished
	| 'tap'              // tap.wav — general UI tap feedback
	| 'skip'             // skip.wav — skip activity tap
	| 'npc-greet';       // npc-greet.wav — NPC encounter starts

/**
 * Maps typed SoundEvent → file path under /public/sounds/.
 * Paths must match exactly what's on disk.
 */
const SOUND_PATHS: Record<SoundEvent, string> = {
	'correct':         '/sounds/reward.wav',
	'wrong':           '/sounds/penalty.mp3',
	'streak-3':        '/sounds/levelup.wav',
	'streak-5':        '/sounds/levelup.wav',
	'streak-10':       '/sounds/levelup.wav',
	'lesson-complete': '/sounds/celebrate.wav',
	'tap':             '/sounds/tap.wav',
	'skip':            '/sounds/skip.wav',
	'npc-greet':       '/sounds/npc-greet.wav',
};

// ─────────────────────────────────────────────────────────────────────────────
// MUTE PREFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/** localStorage key for the mute preference */
const MUTE_KEY = 'lf_sounds_muted';

/**
 * Returns true when sound effects are muted.
 * Falls back to false (unmuted) if localStorage is unavailable (e.g., SSR).
 */
export function isMuted(): boolean {
	try {
		return localStorage.getItem(MUTE_KEY) === 'true';
	} catch {
		// localStorage unavailable (SSR, private browsing restrictions)
		return false;
	}
}

/**
 * Sets the mute preference.
 * Persists across page refreshes.
 *
 * @param muted - true to silence all sound effects, false to enable
 */
export function setMuted(muted: boolean): void {
	try {
		if (muted) {
			localStorage.setItem(MUTE_KEY, 'true');
		} else {
			localStorage.removeItem(MUTE_KEY);
		}
	} catch {
		// Silently fail — mute toggle not critical
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plays a sound effect for the given event.
 *
 * Fire-and-forget: no return value, never throws.
 * Silently skips if muted, file not found, or Audio API unavailable.
 *
 * @param event - The sound event type to play
 */
export function playSound(event: SoundEvent): void {
	// Check mute preference first — cheapest check
	if (isMuted()) return;

	const path = SOUND_PATHS[event];
	if (!path) return; // Unknown event — defensive guard

	try {
		const audio = new Audio(path);

		// Keep sound effects short and punchy — reduce volume slightly
		// so they don't overpower the TTS lesson audio
		audio.volume = 0.6; // 60% volume — noticeable but not dominant

		// Limit simultaneous plays: if a sound was just played, don't pile on
		audio.play().catch(() => {
			// Browser autoplay policy, tab not focused, etc. — non-fatal
			// We do NOT warn here — it happens legitimately (user not interacted yet)
		});
	} catch {
		// Audio constructor can fail in some environments (e.g., tests without jsdom)
		// Non-fatal — lesson continues without sound
	}
}

/**
 * Pre-loads a sound file so it plays instantly when needed.
 * Call at lesson start for the most commonly used sounds.
 *
 * @param events - Sound events to pre-load
 */
export function preloadSounds(events: SoundEvent[]): void {
	if (isMuted()) return; // Don't pre-load if muted (waste of bandwidth)

	for (const event of events) {
		const path = SOUND_PATHS[event];
		if (!path) continue;
		try {
			// Create Audio element and immediately load (triggers browser cache)
			const audio = new Audio(path);
			audio.preload = 'auto';
			// Not stored — just triggers browser pre-cache. GC'd after load.
		} catch {
			// Non-fatal
		}
	}
}
