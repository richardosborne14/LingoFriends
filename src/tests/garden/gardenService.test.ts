/**
 * Tests — Garden Service (pure functions only)
 *
 * We only test the pure, exported functions from gardenService.
 * The async DB functions (getUserTrees, getGardenProfile) require a live DB
 * and are covered by integration tests (out of scope for unit tests).
 *
 * Tested here:
 *   - buildLessonSteps: state assignment logic (completed/current/locked)
 */

import { describe, it, expect } from 'vitest';
import { buildLessonSteps } from '$lib/server/garden/gardenService';

// Sample lesson definitions (matches shape expected by gardenService)
const DEFS = [
	{ title: 'Greetings', icon: '👋', topic: 'greetings', order: 0 },
	{ title: 'Numbers', icon: '🔢', topic: 'numbers', order: 1 },
	{ title: 'Colours', icon: '🎨', topic: 'colours', order: 2 },
	{ title: 'Food', icon: '🍎', topic: 'food', order: 3 },
	{ title: 'Animals', icon: '🐶', topic: 'animals', order: 4 },
];

const TREE_ID = 'tree-test-uuid-001';

// ─────────────────────────────────────────────────────────────────────────────
// buildLessonSteps — basic cases
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLessonSteps — basic state assignment', () => {
	it('first lesson is current when nothing is completed', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set());
		expect(steps[0].state).toBe('current');
		expect(steps[0].title).toBe('Greetings');
	});

	it('all remaining lessons after current are locked', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set());
		expect(steps[1].state).toBe('locked');
		expect(steps[2].state).toBe('locked');
		expect(steps[3].state).toBe('locked');
		expect(steps[4].state).toBe('locked');
	});

	it('returns correct number of steps', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set());
		expect(steps).toHaveLength(5);
	});

	it('returns empty array when no lesson definitions', () => {
		const steps = buildLessonSteps(TREE_ID, [], new Set());
		expect(steps).toHaveLength(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLessonSteps — progression logic
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLessonSteps — progression', () => {
	it('completed lessons have state=completed', () => {
		const completed = new Set([0, 1]);
		const steps = buildLessonSteps(TREE_ID, DEFS, completed);
		expect(steps[0].state).toBe('completed');
		expect(steps[1].state).toBe('completed');
	});

	it('first uncompleted lesson is current', () => {
		const completed = new Set([0, 1]);
		const steps = buildLessonSteps(TREE_ID, DEFS, completed);
		expect(steps[2].state).toBe('current');
	});

	it('everything after current is locked', () => {
		const completed = new Set([0, 1]);
		const steps = buildLessonSteps(TREE_ID, DEFS, completed);
		expect(steps[3].state).toBe('locked');
		expect(steps[4].state).toBe('locked');
	});

	it('all lessons completed → no current, no locked', () => {
		const completed = new Set([0, 1, 2, 3, 4]);
		const steps = buildLessonSteps(TREE_ID, DEFS, completed);
		expect(steps.every((s) => s.state === 'completed')).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLessonSteps — lessonId generation
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLessonSteps — lessonId', () => {
	it('completed steps have lessonId set', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set([0]));
		expect(steps[0].lessonId).toBe(`${TREE_ID}-0`);
	});

	it('current step has lessonId set', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set([0]));
		expect(steps[1].lessonId).toBe(`${TREE_ID}-1`);
	});

	it('locked steps have no lessonId', () => {
		const steps = buildLessonSteps(TREE_ID, DEFS, new Set([0]));
		expect(steps[2].lessonId).toBeUndefined();
		expect(steps[3].lessonId).toBeUndefined();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildLessonSteps — ordering
// ─────────────────────────────────────────────────────────────────────────────

describe('buildLessonSteps — ordering', () => {
	it('steps are sorted by the order field, not array position', () => {
		// Shuffled definitions
		const shuffled = [
			{ title: 'Food', icon: '🍎', topic: 'food', order: 3 },
			{ title: 'Greetings', icon: '👋', topic: 'greetings', order: 0 },
			{ title: 'Numbers', icon: '🔢', topic: 'numbers', order: 1 },
		];
		const steps = buildLessonSteps(TREE_ID, shuffled, new Set());
		// First step after sort should be Greetings (order 0)
		expect(steps[0].title).toBe('Greetings');
		expect(steps[1].title).toBe('Numbers');
		expect(steps[2].title).toBe('Food');
	});
});
