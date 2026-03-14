/**
 * Tests for src/lib/services/audioService.ts
 *
 * Focuses on the pure-logic parts that don't require real audio playback:
 *   - playAudioIfAvailable: silent no-op when text not in map
 *   - prefetchAudioMap: correctly assembles the map from successful fetches
 *   - fetchTTSAudio: handles missing text gracefully
 *
 * Audio playback (playAudio) is tested via jsdom's HTMLAudioElement mock.
 * We test that it resolves without throwing rather than testing actual sound.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	playAudioIfAvailable,
	stopAudio,
	isAudioPlaying,
	fetchTTSAudio,
	prefetchAudioMap,
} from '$lib/services/audioService';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK AUDIO ELEMENT
// jsdom doesn't implement HTMLAudioElement.play() — mock it
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
	// Reset any stale audio state between tests
	stopAudio();

	// Mock HTMLAudioElement: play() resolves immediately, onended fires after
	vi.spyOn(window, 'Audio').mockImplementation(() => {
		const el: Partial<HTMLAudioElement> & { onended?: (() => void) | null } = {
			src: '',
			paused: false,
			volume: 1,
			onended: null,
			onerror: null,
			pause: vi.fn(),
			play: vi.fn().mockImplementation(() => {
				// Simulate async playback completion
				setTimeout(() => el.onended?.(), 0);
				return Promise.resolve();
			}),
		};
		return el as HTMLAudioElement;
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// playAudioIfAvailable
// ─────────────────────────────────────────────────────────────────────────────

describe('playAudioIfAvailable()', () => {
	it('resolves immediately when text is not in the audioMap', async () => {
		const audioMap = { hello: 'base64data' };
		// 'goodbye' is not in the map — should silently resolve
		await expect(playAudioIfAvailable('goodbye', audioMap)).resolves.toBeUndefined();
	});

	it('resolves immediately when audioMap is empty', async () => {
		await expect(playAudioIfAvailable('Ich heiße Max', {})).resolves.toBeUndefined();
	});

	it('does not throw when called with an empty string key', async () => {
		await expect(playAudioIfAvailable('', { '': 'base64' })).resolves.toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// isAudioPlaying / stopAudio
// ─────────────────────────────────────────────────────────────────────────────

describe('stopAudio()', () => {
	it('does not throw when no audio is playing', () => {
		expect(() => stopAudio()).not.toThrow();
	});

	it('calling twice does not throw', () => {
		stopAudio();
		stopAudio();
		expect(true).toBe(true); // just checking no exception
	});
});

describe('isAudioPlaying()', () => {
	it('returns false when no audio has been started', () => {
		expect(isAudioPlaying()).toBe(false);
	});

	it('returns false after stopAudio()', () => {
		stopAudio();
		expect(isAudioPlaying()).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchTTSAudio
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchTTSAudio()', () => {
	it('returns null for empty text', async () => {
		const result = await fetchTTSAudio('', 'de');
		expect(result).toBeNull();
	});

	it('returns null for whitespace-only text', async () => {
		const result = await fetchTTSAudio('   ', 'de');
		expect(result).toBeNull();
	});

	it('returns null when fetch fails (network error)', async () => {
		// Mock fetch to reject
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new Error('Network error'))
		);
		const result = await fetchTTSAudio('Ich heiße Max', 'de');
		expect(result).toBeNull();
		vi.unstubAllGlobals();
	});

	it('returns null when API returns non-OK status', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 503,
			})
		);
		const result = await fetchTTSAudio('Ich heiße Max', 'de');
		expect(result).toBeNull();
		vi.unstubAllGlobals();
	});

	it('returns base64 audio string on success', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({ audioContent: 'SGVsbG8=' }), // base64 "Hello"
			})
		);
		const result = await fetchTTSAudio('Ich heiße Max', 'de');
		expect(result).toBe('SGVsbG8=');
		vi.unstubAllGlobals();
	});

	it('returns null when response has no audioContent field', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({}), // no audioContent
			})
		);
		const result = await fetchTTSAudio('Ich heiße Max', 'de');
		expect(result).toBeNull();
		vi.unstubAllGlobals();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// prefetchAudioMap
// ─────────────────────────────────────────────────────────────────────────────

describe('prefetchAudioMap()', () => {
	it('returns empty map for empty input', async () => {
		const result = await prefetchAudioMap([], 'de');
		expect(result).toEqual({});
	});

	it('includes only successful fetches in the map', async () => {
		// First call succeeds, second fails
		vi.stubGlobal(
			'fetch',
			vi.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ audioContent: 'audio1' }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
				})
		);

		const result = await prefetchAudioMap(['phrase1', 'phrase2'], 'de');
		expect(result).toEqual({ phrase1: 'audio1' });
		// phrase2 is absent because its fetch failed
		expect(result['phrase2']).toBeUndefined();
		vi.unstubAllGlobals();
	});

	it('returns empty map when all fetches fail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new Error('all failed'))
		);
		const result = await prefetchAudioMap(['a', 'b', 'c'], 'de');
		expect(result).toEqual({});
		vi.unstubAllGlobals();
	});

	it('maps each text to its returned base64', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ audioContent: 'audio_a' }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue({ audioContent: 'audio_b' }),
				})
		);

		const result = await prefetchAudioMap(['hello', 'world'], 'de');
		expect(result).toEqual({ hello: 'audio_a', world: 'audio_b' });
		vi.unstubAllGlobals();
	});
});
