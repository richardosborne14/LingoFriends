/**
 * micPermission.test.ts — Unit tests for the mic permission store
 *
 * TASK-AUDIT-01: Voice Input Foundation
 *
 * Tests the state machine, derived stores, and action functions
 * in micPermission.ts. These are pure Svelte store operations —
 * no browser APIs involved, fully testable in vitest.
 *
 * @module tests/stores/micPermission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	micPermissionState,
	micEnabled,
	shouldShowPermissionPrompt,
	micIsReady,
	markPromptShown,
	markGranted,
	markDenied,
	markUnavailable,
	chooseTextOnly,
	resetMicPermission,
} from '$lib/stores/micPermission';

// Reset store before each test to ensure isolation
beforeEach(() => {
	resetMicPermission();
});

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('initial state', () => {
	it('starts in unknown state', () => {
		expect(get(micPermissionState)).toBe('unknown');
	});

	it('micEnabled is true in unknown state (show the mic button)', () => {
		// When we haven't determined if mic exists yet, show the button
		expect(get(micEnabled)).toBe(true);
	});

	it('shouldShowPermissionPrompt is true in unknown state', () => {
		// Unknown = first time → show our friendly modal
		expect(get(shouldShowPermissionPrompt)).toBe(true);
	});

	it('micIsReady is false in unknown state', () => {
		// Not ready until getUserMedia succeeds
		expect(get(micIsReady)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// STATE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('markPromptShown', () => {
	it('transitions from unknown to prompt_shown', () => {
		markPromptShown();
		expect(get(micPermissionState)).toBe('prompt_shown');
	});

	it('shouldShowPermissionPrompt becomes false after prompt is shown', () => {
		markPromptShown();
		// We already showed the modal — don't show it again
		expect(get(shouldShowPermissionPrompt)).toBe(false);
	});

	it('micEnabled remains true after prompt is shown', () => {
		markPromptShown();
		expect(get(micEnabled)).toBe(true);
	});
});

describe('markGranted', () => {
	it('transitions to granted state', () => {
		markGranted();
		expect(get(micPermissionState)).toBe('granted');
	});

	it('micIsReady becomes true when granted', () => {
		markGranted();
		expect(get(micIsReady)).toBe(true);
	});

	it('micEnabled remains true when granted', () => {
		markGranted();
		expect(get(micEnabled)).toBe(true);
	});

	it('shouldShowPermissionPrompt is false when granted', () => {
		markGranted();
		// Already granted — no need to show the modal again
		expect(get(shouldShowPermissionPrompt)).toBe(false);
	});
});

describe('markDenied', () => {
	it('transitions to denied state', () => {
		markDenied();
		expect(get(micPermissionState)).toBe('denied');
	});

	it('micIsReady is false when denied', () => {
		markDenied();
		expect(get(micIsReady)).toBe(false);
	});

	it('micEnabled is still true when denied (so button can show error)', () => {
		// We keep the button visible so it can show "denied" error state
		markDenied();
		expect(get(micEnabled)).toBe(true);
	});
});

describe('markUnavailable', () => {
	it('transitions to unavailable state', () => {
		markUnavailable();
		expect(get(micPermissionState)).toBe('unavailable');
	});

	it('micEnabled becomes false when unavailable (hides the button entirely)', () => {
		// No point showing a mic button if there is no mic hardware
		markUnavailable();
		expect(get(micEnabled)).toBe(false);
	});

	it('micIsReady is false when unavailable', () => {
		markUnavailable();
		expect(get(micIsReady)).toBe(false);
	});
});

describe('chooseTextOnly', () => {
	it('transitions to text_only state', () => {
		chooseTextOnly();
		expect(get(micPermissionState)).toBe('text_only');
	});

	it('micEnabled becomes false in text_only (hides the mic button entirely)', () => {
		// User has explicitly opted out of voice — respect that choice
		chooseTextOnly();
		expect(get(micEnabled)).toBe(false);
	});

	it('micIsReady is false in text_only', () => {
		chooseTextOnly();
		expect(get(micIsReady)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL STATE MACHINE WALKTHROUGH
// ─────────────────────────────────────────────────────────────────────────────

describe('happy path: unknown → prompt_shown → granted', () => {
	it('follows the complete permission grant flow', () => {
		// 1. Initial state
		expect(get(micPermissionState)).toBe('unknown');
		expect(get(shouldShowPermissionPrompt)).toBe(true);

		// 2. Show our custom modal
		markPromptShown();
		expect(get(micPermissionState)).toBe('prompt_shown');
		expect(get(shouldShowPermissionPrompt)).toBe(false);
		expect(get(micIsReady)).toBe(false);

		// 3. getUserMedia succeeds
		markGranted();
		expect(get(micPermissionState)).toBe('granted');
		expect(get(micIsReady)).toBe(true);
		expect(get(micEnabled)).toBe(true);
	});
});

describe('denied path: unknown → prompt_shown → denied', () => {
	it('handles permission denial gracefully', () => {
		markPromptShown();
		markDenied();

		expect(get(micPermissionState)).toBe('denied');
		// Button stays visible (shows the "denied" error state) but not "ready"
		expect(get(micEnabled)).toBe(true);
		expect(get(micIsReady)).toBe(false);
	});
});

describe('text-only path: user chose to type', () => {
	it('hides the mic button completely', () => {
		markPromptShown();
		chooseTextOnly();

		expect(get(micPermissionState)).toBe('text_only');
		expect(get(micEnabled)).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────────────────────────────────────

describe('resetMicPermission', () => {
	it('resets to unknown state from any state', () => {
		markGranted();
		expect(get(micPermissionState)).toBe('granted');

		resetMicPermission();
		expect(get(micPermissionState)).toBe('unknown');
	});

	it('restores shouldShowPermissionPrompt to true after reset', () => {
		markGranted();
		resetMicPermission();
		expect(get(shouldShowPermissionPrompt)).toBe(true);
	});
});
