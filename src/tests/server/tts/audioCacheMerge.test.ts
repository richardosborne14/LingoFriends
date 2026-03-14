/**
 * Tests for the audioCache merge in lesson store's initLesson().
 *
 * Verifies that plan.audioCache is properly merged into the audioMap store
 * so that pre-generated server-side audio is available instantly.
 *
 * These tests import the store directly — no browser environment needed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	audioMap,
	lessonPhase,
	initLesson,
	resetLesson,
} from '$lib/stores/lesson';
import { ActivityType } from '$lib/types/lesson';
import type { LessonPlan } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

function makeMinimalPlan(overrides: Partial<LessonPlan> = {}): LessonPlan {
	return {
		id: 'test-lesson-1',
		title: 'Test Lesson',
		icon: '🌱',
		steps: [
			{
				id: 'step-1',
				tutorText: 'Learn this phrase',
				helpText: 'Hint text',
				sunDrops: 0,
				activity: {
					type: ActivityType.INFO,
					targetPhrase: 'Hallo',
					nativeTranslation: 'Hello',
					explanation: 'A common greeting',
					sunDrops: 0,
				},
			},
		],
		totalSunDrops: 8,
		chunkCount: 1,
		...overrides,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('initLesson audioCache merge', () => {
	beforeEach(() => {
		resetLesson();
	});

	it('seeds audioMap with plan.audioCache when present', () => {
		const plan = makeMinimalPlan({
			audioCache: {
				'Hallo': 'base64-hallo-audio',
				'A common greeting': 'base64-explanation-audio',
			},
		});

		initLesson(plan);

		const map = get(audioMap);
		expect(map['Hallo']).toBe('base64-hallo-audio');
		expect(map['A common greeting']).toBe('base64-explanation-audio');
	});

	it('produces empty audioMap when plan has no audioCache', () => {
		const plan = makeMinimalPlan(); // no audioCache field
		initLesson(plan);

		const map = get(audioMap);
		// Should be empty — no error, graceful degradation
		expect(Object.keys(map)).toHaveLength(0);
	});

	it('extra audio passed to initLesson extends the plan cache', () => {
		const plan = makeMinimalPlan({
			audioCache: { 'Hallo': 'cached-audio' },
		});

		// Client-side extra audio (e.g., on-demand fetch result)
		const extraAudio = { 'Guten Tag': 'extra-audio' };
		initLesson(plan, extraAudio);

		const map = get(audioMap);
		expect(map['Hallo']).toBe('cached-audio');
		expect(map['Guten Tag']).toBe('extra-audio');
	});

	it('explicit audio param overrides plan cache for same key', () => {
		const plan = makeMinimalPlan({
			audioCache: { 'Hallo': 'old-cached-audio' },
		});

		const freshAudio = { 'Hallo': 'fresh-audio' };
		initLesson(plan, freshAudio);

		const map = get(audioMap);
		// Fresh audio wins (extra param spreads after plan cache)
		expect(map['Hallo']).toBe('fresh-audio');
	});

	it('transitions to preview phase after init', () => {
		const plan = makeMinimalPlan();
		initLesson(plan);
		expect(get(lessonPhase)).toBe('preview');
	});
});
