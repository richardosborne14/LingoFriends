/**
 * sttService.test.ts — Unit tests for the client-side STT helper
 *
 * TASK-AUDIT-01: Voice Input Foundation
 *
 * Tests the pure functions in sttService.ts that can run without a browser:
 *   - getSupportedMimeType() — MIME type detection
 *   - mimeTypeToExtension()  — MIME → file extension mapping
 *   - transcribeBlob()       — HTTP layer (mocked fetch)
 *
 * startRecording() and requestMicAccess() rely on browser APIs (MediaRecorder,
 * navigator.mediaDevices) that are not available in jsdom. Those functions are
 * verified through integration/browser testing.
 *
 * @module tests/services/sttService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getSupportedMimeType,
	mimeTypeToExtension,
	transcribeBlob,
	type STTError,
} from '$lib/services/sttService';

// ─────────────────────────────────────────────────────────────────────────────
// MIME TYPE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

describe('getSupportedMimeType', () => {
	it('returns undefined when MediaRecorder is not defined (SSR / test env)', () => {
		// jsdom does not implement MediaRecorder — confirm graceful undefined
		const result = getSupportedMimeType();
		// In the test environment MediaRecorder is undefined, so we get undefined
		expect(result).toBeUndefined();
	});

	it('returns first supported type when MediaRecorder exists', () => {
		// Simulate a browser that supports audio/webm
		const mockMediaRecorder = {
			isTypeSupported: vi.fn((type: string) => type === 'audio/webm;codecs=opus'),
		};
		// Temporarily inject the mock
		const original = (global as Record<string, unknown>).MediaRecorder;
		(global as Record<string, unknown>).MediaRecorder = mockMediaRecorder;

		const result = getSupportedMimeType();
		expect(result).toBe('audio/webm;codecs=opus');

		// Restore
		(global as Record<string, unknown>).MediaRecorder = original;
	});

	it('falls back to next type when preferred type is unsupported', () => {
		const mockMediaRecorder = {
			isTypeSupported: vi.fn(
				(type: string) => type === 'audio/webm' // no codec specifier works, opus doesn't
			),
		};
		const original = (global as Record<string, unknown>).MediaRecorder;
		(global as Record<string, unknown>).MediaRecorder = mockMediaRecorder;

		const result = getSupportedMimeType();
		expect(result).toBe('audio/webm');

		(global as Record<string, unknown>).MediaRecorder = original;
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// MIME → EXTENSION MAPPING
// ─────────────────────────────────────────────────────────────────────────────

describe('mimeTypeToExtension', () => {
	it('maps audio/webm;codecs=opus to webm', () => {
		expect(mimeTypeToExtension('audio/webm;codecs=opus')).toBe('webm');
	});

	it('maps audio/webm to webm', () => {
		expect(mimeTypeToExtension('audio/webm')).toBe('webm');
	});

	it('maps audio/ogg;codecs=opus to ogg', () => {
		expect(mimeTypeToExtension('audio/ogg;codecs=opus')).toBe('ogg');
	});

	it('maps audio/mp4 to mp4', () => {
		expect(mimeTypeToExtension('audio/mp4')).toBe('mp4');
	});

	it('maps audio/wav to wav', () => {
		expect(mimeTypeToExtension('audio/wav')).toBe('wav');
	});

	it('falls back to webm for unknown types', () => {
		// Unknown MIME types default to webm — Whisper is lenient about extensions
		expect(mimeTypeToExtension('audio/unknown-format')).toBe('webm');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// transcribeBlob — HTTP layer tests
// ─────────────────────────────────────────────────────────────────────────────

describe('transcribeBlob', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns transcript result on successful API call', async () => {
		// Mock a successful /api/stt response
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: 'Wie geht es dir?', language: 'de' }),
		} as Response);

		const blob = new Blob(['fake audio'], { type: 'audio/webm' });
		const result = await transcribeBlob(blob, 'de', 2000);

		expect(result.text).toBe('Wie geht es dir?');
		expect(result.language).toBe('de');
	});

	it('sends languageHint as form field when provided', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: 'Bonjour', language: 'fr' }),
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });
		await transcribeBlob(blob, 'fr', 1000);

		const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const body = callArgs[1].body as FormData;
		expect(body.get('language')).toBe('fr');
	});

	it('does not send language field when hint is omitted', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: 'Hello', language: 'en' }),
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });
		await transcribeBlob(blob, undefined, 1000);

		const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const body = callArgs[1].body as FormData;
		// When no hint, the field should not be present
		expect(body.get('language')).toBeNull();
	});

	it('throws too_short error when durationMs is under 500ms', async () => {
		const blob = new Blob(['audio'], { type: 'audio/webm' });

		// 400ms is below the minimum — should throw immediately without a fetch call
		await expect(transcribeBlob(blob, 'de', 400)).rejects.toMatchObject({
			kind: 'too_short',
		} satisfies Partial<STTError>);

		// Confirm no fetch was made
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('does not throw too_short error when durationMs is exactly 500ms', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: 'Hi', language: 'en' }),
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });
		// 500ms is exactly at the threshold — should proceed
		const result = await transcribeBlob(blob, 'en', 500);
		expect(result.text).toBe('Hi');
	});

	it('throws api_error when server returns non-OK status', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: false,
			status: 502,
			text: () => Promise.resolve('Groq Whisper error'),
		} as unknown as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });

		await expect(transcribeBlob(blob, 'de', 2000)).rejects.toMatchObject({
			kind: 'api_error',
		} satisfies Partial<STTError>);
	});

	it('throws network_error when fetch itself throws', async () => {
		// Simulate offline / DNS failure
		global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

		const blob = new Blob(['audio'], { type: 'audio/webm' });

		await expect(transcribeBlob(blob, 'de', 2000)).rejects.toMatchObject({
			kind: 'network_error',
		} satisfies Partial<STTError>);
	});

	it('throws empty_transcript when API returns blank text', async () => {
		// Whisper returns 200 but with empty transcript (recorded silence)
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: '   ', language: 'de' }),
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });

		await expect(transcribeBlob(blob, 'de', 2000)).rejects.toMatchObject({
			kind: 'empty_transcript',
		} satisfies Partial<STTError>);
	});

	it('trims whitespace from the returned text', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: '  Hallo Welt  ', language: 'de' }),
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });
		const result = await transcribeBlob(blob, 'de', 2000);

		expect(result.text).toBe('Hallo Welt');
	});

	it('uses languageHint as fallback when API does not return language', async () => {
		// Some Whisper responses omit the language field
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ text: 'Bonjour' }), // no language field
		} as Response);

		const blob = new Blob(['audio'], { type: 'audio/webm' });
		const result = await transcribeBlob(blob, 'fr', 2000);

		expect(result.language).toBe('fr');
	});
});
