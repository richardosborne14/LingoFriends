/**
 * Tests for src/lib/server/tts/ttsCache.ts
 *
 * Tests preGenerateAudioCache: collecting texts, calling TTS, returning map.
 * The Google TTS module is mocked — we test orchestration logic, not the API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preGenerateAudioCache } from '$lib/server/tts/ttsCache';
import { ActivityType } from '$lib/types/lesson';
import type { LessonStep } from '$lib/types/lesson';

// Mock the googleTTS module — we don't want real API calls in tests
vi.mock('$lib/server/tts/googleTTS', () => ({
	callGoogleTTS: vi.fn(),
}));

import { callGoogleTTS } from '$lib/server/tts/googleTTS';
const mockCallGoogleTTS = vi.mocked(callGoogleTTS);

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** A minimal INFO step for testing */
function makeInfoStep(targetPhrase: string, explanation: string): LessonStep {
	return {
		id: 'step-1',
		tutorText: '',
		helpText: '',
		sunDrops: 0,
		activity: {
			type: ActivityType.INFO,
			targetPhrase,
			nativeTranslation: 'translation',
			explanation,
			sunDrops: 0,
		},
	};
}

/** A non-INFO step (should be ignored by the pre-generator) */
function makeMCStep(): LessonStep {
	return {
		id: 'step-2',
		tutorText: '',
		helpText: '',
		sunDrops: 2,
		activity: {
			type: ActivityType.MULTIPLE_CHOICE,
			question: 'What does X mean?',
			options: ['A', 'B', 'C', 'D'],
			correctIndex: 0,
			targetPhrase: 'Ich heiße',
			sunDrops: 2,
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('preGenerateAudioCache', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns empty map when no API key is provided', async () => {
		const steps = [makeInfoStep('Hallo', 'Hello in German')];
		const result = await preGenerateAudioCache(steps, 'de', undefined);
		expect(result).toEqual({});
		// Should not have attempted any TTS calls
		expect(mockCallGoogleTTS).not.toHaveBeenCalled();
	});

	it('returns empty map when no INFO steps exist', async () => {
		const steps = [makeMCStep()];
		const result = await preGenerateAudioCache(steps, 'de', 'test-key');
		expect(result).toEqual({});
		expect(mockCallGoogleTTS).not.toHaveBeenCalled();
	});

	it('generates audio for targetPhrase and explanation of INFO steps', async () => {
		mockCallGoogleTTS.mockResolvedValueOnce('audio-phrase-base64');
		mockCallGoogleTTS.mockResolvedValueOnce('audio-explanation-base64');

		const steps = [makeInfoStep('Ich heiße Max', 'This phrase means my name is Max')];
		const result = await preGenerateAudioCache(steps, 'de', 'test-key');

		// Both phrase and explanation should be in the result
		expect(result['Ich heiße Max']).toBe('audio-phrase-base64');
		expect(result['This phrase means my name is Max']).toBe('audio-explanation-base64');
	});

	it('deduplicates identical phrases across steps', async () => {
		// Two INFO steps with the SAME targetPhrase should only call TTS once
		mockCallGoogleTTS.mockResolvedValue('audio-base64');

		const steps = [
			makeInfoStep('Ich heiße Max', 'Explanation 1'),
			makeInfoStep('Ich heiße Max', 'Explanation 1'), // duplicate
		];
		const result = await preGenerateAudioCache(steps, 'de', 'test-key');

		// Only unique texts should generate audio — total 2 (phrase + explanation)
		// not 4 (which would be the result of no deduplication)
		expect(mockCallGoogleTTS).toHaveBeenCalledTimes(2);
		expect(result['Ich heiße Max']).toBeDefined();
	});

	it('skips steps without an explanation gracefully', async () => {
		mockCallGoogleTTS.mockResolvedValueOnce('phrase-audio');

		const step: LessonStep = {
			id: 'step-1',
			tutorText: '',
			helpText: '',
			sunDrops: 0,
			activity: {
				type: ActivityType.INFO,
				targetPhrase: 'Hallo',
				nativeTranslation: 'Hello',
				// explanation is intentionally absent
				sunDrops: 0,
			},
		};

		const result = await preGenerateAudioCache([step], 'de', 'test-key');
		expect(result['Hallo']).toBe('phrase-audio');
		// Only 1 TTS call (just phrase, no explanation)
		expect(mockCallGoogleTTS).toHaveBeenCalledTimes(1);
	});

	it('omits failed TTS results from the returned map', async () => {
		// First call succeeds, second fails
		mockCallGoogleTTS
			.mockResolvedValueOnce('good-audio')
			.mockResolvedValueOnce(null); // TTS failure

		const steps = [makeInfoStep('Guten Tag', 'Good afternoon')];
		const result = await preGenerateAudioCache(steps, 'de', 'test-key');

		expect(result['Guten Tag']).toBe('good-audio');
		// Failed result (null) should NOT appear in the map
		expect('Good afternoon' in result).toBe(false);
	});

	it('ignores non-INFO steps', async () => {
		mockCallGoogleTTS.mockResolvedValue('audio');

		const steps = [makeMCStep(), makeInfoStep('Auf Wiedersehen', 'Goodbye')];
		await preGenerateAudioCache(steps, 'de', 'test-key');

		// Only texts from the INFO step should be requested (2 calls: phrase + explanation)
		expect(mockCallGoogleTTS).toHaveBeenCalledTimes(2);
	});

	it('passes the target language to callGoogleTTS (RULE 11)', async () => {
		mockCallGoogleTTS.mockResolvedValue('audio');

		const steps = [makeInfoStep('Bonjour', 'Hello in French')];
		await preGenerateAudioCache(steps, 'fr', 'test-key');

		// Both calls should use 'fr' as target language
		for (const call of mockCallGoogleTTS.mock.calls) {
			expect(call[1]).toBe('fr'); // second argument is targetLanguage
		}
	});
});
