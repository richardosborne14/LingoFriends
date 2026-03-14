/**
 * Tests for src/lib/server/tts/googleTTS.ts
 *
 * Tests the text cleaning and API call behaviour.
 * The actual Google TTS API call is mocked — we test the logic, not the network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanTextForTTS, callGoogleTTS } from '$lib/server/tts/googleTTS';

// ─────────────────────────────────────────────────────────────────────────────
// cleanTextForTTS
// ─────────────────────────────────────────────────────────────────────────────

describe('cleanTextForTTS', () => {
	it('returns plain text unchanged', () => {
		expect(cleanTextForTTS('Hallo, wie heißt du?')).toBe('Hallo, wie heißt du?');
	});

	it('strips emoticons', () => {
		expect(cleanTextForTTS('Guten Morgen! 😀')).toBe('Guten Morgen!');
	});

	it('strips flag emojis', () => {
		expect(cleanTextForTTS('Hello 🇬🇧 world')).toBe('Hello world');
	});

	it('strips misc symbols and pictographs', () => {
		expect(cleanTextForTTS('Check ✨ this out')).toBe('Check this out');
	});

	it('collapses multiple spaces after stripping', () => {
		// Emoji removal can leave double spaces — these should collapse
		const result = cleanTextForTTS('Hello  world'); // double space intentional
		expect(result).toBe('Hello world');
	});

	it('trims leading/trailing whitespace', () => {
		expect(cleanTextForTTS('  hello  ')).toBe('hello');
	});

	it('returns empty string for emoji-only input', () => {
		expect(cleanTextForTTS('🌱✨🎵')).toBe('');
	});

	it('preserves special characters important for target languages', () => {
		// German umlauts, French accents, Spanish tilde must survive
		expect(cleanTextForTTS('Ich heiße Max — Ñoño')).toBe('Ich heiße Max — Ñoño');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// callGoogleTTS
// ─────────────────────────────────────────────────────────────────────────────

describe('callGoogleTTS', () => {
	beforeEach(() => {
		// Reset global fetch mock before each test
		vi.resetAllMocks();
	});

	it('returns base64 audio on successful API response', async () => {
		const mockAudio = 'SGVsbG8gV29ybGQ='; // base64 "Hello World"
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ audioContent: mockAudio }),
		}));

		const result = await callGoogleTTS('Hallo', 'de', 'test-api-key');
		expect(result).toBe(mockAudio);
	});

	it('returns null when API returns non-OK status', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			text: async () => 'API key invalid',
		}));

		const result = await callGoogleTTS('Hallo', 'de', 'bad-key');
		expect(result).toBeNull();
	});

	it('returns null when API returns no audioContent', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ audioContent: undefined }),
		}));

		const result = await callGoogleTTS('Hallo', 'de', 'test-key');
		expect(result).toBeNull();
	});

	it('returns null when fetch throws (network error)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

		const result = await callGoogleTTS('Hallo', 'de', 'test-key');
		expect(result).toBeNull();
	});

	it('returns null for empty text after cleaning', async () => {
		// Emoji-only text → empty after clean → should not call API
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const result = await callGoogleTTS('🌱✨', 'de', 'test-key');
		expect(result).toBeNull();
		// Importantly, fetch should NOT have been called
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('uses the target language voice (RULE 11)', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ audioContent: 'abc123' }),
		});
		vi.stubGlobal('fetch', fetchMock);

		await callGoogleTTS('Bonjour', 'de', 'test-key');

		const calledUrl = fetchMock.mock.calls[0][0] as string;
		const calledBody = JSON.parse(fetchMock.mock.calls[0][1].body);

		// Voice should be German (de), even though text is French ("Bonjour")
		expect(calledBody.voice.name).toBe('de-DE-Journey-F');
		expect(calledBody.voice.languageCode).toBe('de-DE');
		// URL should contain the API key
		expect(calledUrl).toContain('test-key');
	});
});
