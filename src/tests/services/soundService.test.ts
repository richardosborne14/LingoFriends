/**
 * Tests for src/lib/services/soundService.ts
 *
 * Sound service tests focus on the mute preference logic (pure state)
 * since actual Audio playback requires a real browser environment.
 *
 * The isMuted/setMuted/playSound interaction is tested with a mocked
 * localStorage that jsdom provides automatically.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	isMuted,
	setMuted,
	playSound,
} from '$lib/services/soundService';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
	// Clear localStorage between tests to prevent state leakage
	localStorage.clear();
	vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// isMuted
// ─────────────────────────────────────────────────────────────────────────────

describe('isMuted()', () => {
	it('returns false by default (sounds enabled)', () => {
		expect(isMuted()).toBe(false);
	});

	it('returns true after setMuted(true)', () => {
		setMuted(true);
		expect(isMuted()).toBe(true);
	});

	it('returns false after setMuted(false)', () => {
		setMuted(true);
		setMuted(false);
		expect(isMuted()).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// setMuted
// ─────────────────────────────────────────────────────────────────────────────

describe('setMuted()', () => {
	it('persists mute=true across calls to isMuted()', () => {
		setMuted(true);
		// Simulate what isMuted() reads
		expect(localStorage.getItem('lf_sounds_muted')).toBe('true');
	});

	it('removes the key from localStorage when setMuted(false)', () => {
		setMuted(true);
		setMuted(false);
		expect(localStorage.getItem('lf_sounds_muted')).toBeNull();
	});

	it('can toggle multiple times', () => {
		setMuted(true);
		expect(isMuted()).toBe(true);
		setMuted(false);
		expect(isMuted()).toBe(false);
		setMuted(true);
		expect(isMuted()).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// playSound
// ─────────────────────────────────────────────────────────────────────────────

describe('playSound()', () => {
	it('does not throw when called with a valid event', () => {
		// Audio may fail in jsdom — we just check it doesn't throw
		expect(() => playSound('correct')).not.toThrow();
	});

	it('does not throw when called with any valid SoundEvent', () => {
		const events = [
			'correct', 'wrong', 'streak-3', 'streak-5', 'streak-10',
			'lesson-complete', 'tap', 'skip', 'npc-greet',
		] as const;
		for (const event of events) {
			expect(() => playSound(event)).not.toThrow();
		}
	});

	it('silently skips playback when muted', () => {
		setMuted(true);
		// Mock the Audio constructor to detect if it was called
		const AudioMock = vi.fn(() => ({
			play: vi.fn().mockResolvedValue(undefined),
			volume: 0,
		}));
		vi.stubGlobal('Audio', AudioMock);

		playSound('correct');

		// When muted, Audio constructor should NOT have been called
		expect(AudioMock).not.toHaveBeenCalled();
	});

	it('attempts to create Audio when not muted', () => {
		setMuted(false);
		const AudioMock = vi.fn(() => ({
			play: vi.fn().mockResolvedValue(undefined),
			volume: 0,
		}));
		vi.stubGlobal('Audio', AudioMock);

		playSound('correct');

		expect(AudioMock).toHaveBeenCalledOnce();
	});
});
