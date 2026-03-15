/**
 * micPermission.ts — Microphone Permission State (Session-Scoped)
 *
 * TASK-AUDIT-01: Voice Input Foundation
 *
 * Tracks whether the user has:
 *   a) Been shown the friendly "Can I hear you speak?" prompt (once per session)
 *   b) Granted or denied microphone access
 *   c) Chosen to always use text input for this session
 *
 * WHY A SVELTE STORE (not sessionStorage):
 * sessionStorage survives hard refreshes but we want this to reset on every
 * new app session anyway. A Svelte store resets on page load, which is the
 * right behaviour — we don't want to silently assume permission persists.
 * The store is reactive, so MicButton can respond immediately when permission
 * state changes from another component.
 *
 * BROWSER PERMISSIONS API:
 * We do NOT query navigator.permissions.query() on init because:
 * 1. It prompts the permission check before the user has done anything (bad UX)
 * 2. iOS Safari doesn't support it reliably
 * 3. The actual getUserMedia() call is the real gate — we just need to track
 *    whether we've shown our own friendly modal first.
 *
 * @module stores/micPermission
 */

import { writable, derived } from 'svelte/store';

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Possible states for microphone access in this session.
 *
 * 'unknown'     — No interaction yet. The friendly modal hasn't been shown.
 * 'prompt_shown'— Our custom modal has been shown; awaiting getUserMedia response.
 * 'granted'     — getUserMedia succeeded (mic is accessible).
 * 'denied'      — getUserMedia threw NotAllowedError. Fallback to text input.
 * 'unavailable' — No mic hardware or API not supported. Fallback to text input.
 * 'text_only'   — User explicitly chose "I'll type instead". Suppress mic UI.
 */
export type MicPermissionState =
	| 'unknown'
	| 'prompt_shown'
	| 'granted'
	| 'denied'
	| 'unavailable'
	| 'text_only';

/**
 * The core permission state store.
 * Starts at 'unknown' on every page load.
 */
export const micPermissionState = writable<MicPermissionState>('unknown');

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when the mic button should be shown at all.
 * Hidden when the user has chosen text-only or there's no mic hardware.
 * This is what MicButton checks before rendering.
 */
export const micEnabled = derived(
	micPermissionState,
	($state) => $state !== 'text_only' && $state !== 'unavailable'
);

/**
 * True when we should show our friendly permission prompt before
 * triggering the browser's native getUserMedia dialog.
 * Only shown once per session (state returns to 'unknown' on reload).
 */
export const shouldShowPermissionPrompt = derived(
	micPermissionState,
	($state) => $state === 'unknown'
);

/**
 * True when the mic is confirmed accessible and ready to record.
 * Used by MicButton to know whether to skip straight to recording
 * (skips the custom modal on second use).
 */
export const micIsReady = derived(
	micPermissionState,
	($state) => $state === 'granted'
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when our custom modal is shown.
 * Transitions from 'unknown' → 'prompt_shown'.
 */
export function markPromptShown(): void {
	micPermissionState.set('prompt_shown');
}

/**
 * Called after getUserMedia() succeeds.
 * The browser has granted access — we can record immediately on next tap.
 */
export function markGranted(): void {
	micPermissionState.set('granted');
}

/**
 * Called after getUserMedia() throws NotAllowedError.
 * The mic button will show an error state and suggest typing instead.
 */
export function markDenied(): void {
	micPermissionState.set('denied');
}

/**
 * Called when no microphone hardware is detected or the API is unavailable.
 * Hides the mic button entirely — no point showing it.
 */
export function markUnavailable(): void {
	micPermissionState.set('unavailable');
}

/**
 * Called when the user taps "I'll type instead" in the permission modal.
 * Suppresses all mic UI for the rest of this session.
 */
export function chooseTextOnly(): void {
	micPermissionState.set('text_only');
}

/**
 * Resets the state — used in tests only.
 * (In production, the store resets automatically on page load.)
 */
export function resetMicPermission(): void {
	micPermissionState.set('unknown');
}
