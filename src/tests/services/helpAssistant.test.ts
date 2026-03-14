/**
 * Tests for helpAssistant.ts
 *
 * Coverage:
 *  - Language & age group utilities
 *  - buildActivitySummary (one test per activity type)
 *  - buildSystemPrompt (verifies key rules are present)
 *  - buildExplainPrompt / buildHintPrompt / buildFreeQuestionPrompt
 *  - validateBugReportType (all valid + invalid cases)
 *  - buildBugReportSummary
 */

import { describe, it, expect } from 'vitest';
import {
	getLanguageName,
	getAgeGroupLabel,
	buildActivitySummary,
	buildSystemPrompt,
	buildExplainPrompt,
	buildHintPrompt,
	buildFreeQuestionPrompt,
	validateBugReportType,
	buildBugReportSummary,
	BUG_REPORT_TYPES,
	BUG_REPORT_LABELS,
	type HelpContext,
} from '$lib/services/helpAssistant';
import { ActivityType } from '$lib/types/lesson';
import type { ActivityConfig } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal INFO activity for context construction */
function makeInfoActivity(): ActivityConfig {
	return {
		type: ActivityType.INFO,
		targetPhrase: 'Guten Morgen',
		nativeTranslation: 'Good morning',
		explanation: 'Used as a greeting in the morning',
	} as ActivityConfig;
}

/** Minimal multiple-choice activity */
function makeMCActivity(): ActivityConfig {
	return {
		type: ActivityType.MULTIPLE_CHOICE,
		question: 'What does "Guten Morgen" mean?',
		targetPhrase: 'Guten Morgen',
		options: ['Good morning', 'Good evening', 'Goodbye', 'Good night'],
		correctIndex: 0,
	} as ActivityConfig;
}

/** Standard HelpContext for a French learner studying German */
function makeContext(activity: ActivityConfig = makeInfoActivity()): HelpContext {
	return {
		activity,
		nativeLanguage: 'fr',
		targetLanguage: 'de',
		ageGroup: '11-14',
		level: 'total_beginner',
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

describe('getLanguageName', () => {
	it('returns "French" for "fr"', () => {
		expect(getLanguageName('fr')).toBe('French');
	});

	it('returns "German" for "de"', () => {
		expect(getLanguageName('de')).toBe('German');
	});

	it('returns "English" for "en"', () => {
		expect(getLanguageName('en')).toBe('English');
	});

	it('falls back to the raw code for unknown languages', () => {
		expect(getLanguageName('xx')).toBe('xx');
	});
});

describe('getAgeGroupLabel', () => {
	it('returns a string for each known age group', () => {
		const groups = ['7-10', '11-14', '15-18'];
		for (const g of groups) {
			expect(getAgeGroupLabel(g).length).toBeGreaterThan(0);
		}
	});

	it('mentions age numbers for 7-10 group', () => {
		expect(getAgeGroupLabel('7-10')).toContain('7-10');
	});

	it('returns a generic label for unknown group', () => {
		expect(getAgeGroupLabel('25-30')).toBe('a learner');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildActivitySummary — one test per activity type
// ─────────────────────────────────────────────────────────────────────────────

describe('buildActivitySummary', () => {
	it('includes activity type and phrase for INFO', () => {
		const summary = buildActivitySummary(makeInfoActivity());
		expect(summary).toContain('Introduction');
		expect(summary).toContain('Guten Morgen');
		expect(summary).toContain('Good morning');
	});

	it('includes question and options for MULTIPLE_CHOICE', () => {
		const summary = buildActivitySummary(makeMCActivity());
		expect(summary).toContain('Multiple choice');
		expect(summary).toContain('Good morning');
		expect(summary).toContain('Good evening');
	});

	it('does NOT include correctIndex for MULTIPLE_CHOICE (would reveal answer)', () => {
		const activity = makeMCActivity();
		const summary = buildActivitySummary(activity);
		expect(summary).not.toContain('correctIndex');
		expect(summary).not.toContain('"0"');
	});

	it('includes sentence for FILL_BLANK', () => {
		const activity: ActivityConfig = {
			type: ActivityType.FILL_BLANK,
			sentence: 'Ich heiße ___.',
			targetPhrase: 'heiße',
			correctAnswer: 'heiße',
			hint: 'Think about introducing yourself',
		} as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary).toContain('Fill in the blank');
		expect(summary).toContain('Ich heiße ___.');
	});

	it('does NOT include correctAnswer for TRANSLATE (would reveal answer)', () => {
		const activity: ActivityConfig = {
			type: ActivityType.TRANSLATE,
			sourcePhrase: 'Good morning',
			targetPhrase: 'Guten Morgen',
			correctAnswer: 'Guten Morgen',
		} as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary).toContain('Translation');
		expect(summary).not.toContain('correctAnswer');
	});

	it('includes statement for TRUE_FALSE', () => {
		const activity = {
			type: ActivityType.TRUE_FALSE,
			question: '"Guten Morgen" means "Good evening"',
			isTrue: false,
			targetPhrase: 'Guten Morgen',
			sunDrops: 2,
		} as unknown as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary).toContain('True or False');
		expect(summary).toContain('Good evening');
	});

	it('includes scrambled words for WORD_ARRANGE but NOT the target sentence', () => {
		const activity: ActivityConfig = {
			type: ActivityType.WORD_ARRANGE,
			scrambledWords: ['Morgen', 'Guten'],
			targetSentence: 'Guten Morgen',
		} as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary).toContain('Arrange the words');
		expect(summary).toContain('Morgen');
		// Should NOT reveal the correct ordering as a complete sentence
		expect(summary).not.toContain('targetSentence');
	});

	it('includes pairs for MATCHING', () => {
		const activity: ActivityConfig = {
			type: ActivityType.MATCHING,
			pairs: [{ left: 'Guten Morgen', right: 'Good morning' }],
		} as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary).toContain('Match each word');
		expect(summary).toContain('Guten Morgen');
	});

	it('returns a non-empty fallback for unknown type', () => {
		const activity = { type: 'unknown_type' } as unknown as ActivityConfig;
		const summary = buildActivitySummary(activity);
		expect(summary.length).toBeGreaterThan(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSystemPrompt
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
	it('contains the native language name', () => {
		const prompt = buildSystemPrompt(makeContext());
		expect(prompt).toContain('French');
	});

	it('contains the target language name', () => {
		const prompt = buildSystemPrompt(makeContext());
		expect(prompt).toContain('German');
	});

	it('contains age group description', () => {
		const prompt = buildSystemPrompt(makeContext());
		expect(prompt).toContain('11-14');
	});

	it('includes a rule about responding in the native language', () => {
		const prompt = buildSystemPrompt(makeContext());
		// Rule 1 should mention French as the response language
		expect(prompt).toMatch(/French/);
	});

	it('includes a rule about NOT revealing the answer', () => {
		const prompt = buildSystemPrompt(makeContext());
		expect(prompt.toLowerCase()).toContain('never');
	});

	it('includes the activity summary', () => {
		const prompt = buildSystemPrompt(makeContext(makeInfoActivity()));
		// The activity summary is injected into the system prompt
		expect(prompt).toContain('Guten Morgen');
	});

	it('returns a non-empty string', () => {
		expect(buildSystemPrompt(makeContext()).length).toBeGreaterThan(100);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MESSAGE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainPrompt', () => {
	it('returns a non-empty string', () => {
		expect(buildExplainPrompt(makeContext()).length).toBeGreaterThan(0);
	});

	it('mentions the native language', () => {
		const prompt = buildExplainPrompt(makeContext());
		expect(prompt).toContain('French');
	});

	it('explicitly says NOT to give the answer', () => {
		const prompt = buildExplainPrompt(makeContext()).toLowerCase();
		expect(prompt).toMatch(/not|don.t|never/);
		expect(prompt).toContain('answer');
	});
});

describe('buildHintPrompt', () => {
	it('returns a non-empty string', () => {
		expect(buildHintPrompt(makeContext()).length).toBeGreaterThan(0);
	});

	it('mentions the native language', () => {
		const prompt = buildHintPrompt(makeContext());
		expect(prompt).toContain('French');
	});

	it('explicitly says NOT to just give the answer', () => {
		const prompt = buildHintPrompt(makeContext()).toLowerCase();
		expect(prompt).toMatch(/not|don.t/);
	});

	it('includes encouraging language', () => {
		const prompt = buildHintPrompt(makeContext()).toLowerCase();
		expect(prompt).toMatch(/fun|encouraging|help/);
	});
});

describe('buildFreeQuestionPrompt', () => {
	it('returns the trimmed question text', () => {
		const ctx = makeContext();
		expect(buildFreeQuestionPrompt('  What is this word?  ', ctx)).toBe('What is this word?');
	});

	it('returns empty string for whitespace-only input', () => {
		expect(buildFreeQuestionPrompt('   ', makeContext())).toBe('');
	});

	it('passes through multi-line questions correctly', () => {
		const q = 'Line 1\nLine 2';
		expect(buildFreeQuestionPrompt(q, makeContext())).toBe(q);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

describe('BUG_REPORT_TYPES', () => {
	it('contains 4 report types', () => {
		expect(BUG_REPORT_TYPES).toHaveLength(4);
	});

	it('includes wrong_translation, nonsensical, audio_problem, other', () => {
		expect(BUG_REPORT_TYPES).toContain('wrong_translation');
		expect(BUG_REPORT_TYPES).toContain('nonsensical');
		expect(BUG_REPORT_TYPES).toContain('audio_problem');
		expect(BUG_REPORT_TYPES).toContain('other');
	});
});

describe('BUG_REPORT_LABELS', () => {
	it('has a label for every bug report type', () => {
		for (const type of BUG_REPORT_TYPES) {
			expect(BUG_REPORT_LABELS[type]).toBeTruthy();
		}
	});
});

describe('validateBugReportType', () => {
	it('returns true for all known types', () => {
		for (const type of BUG_REPORT_TYPES) {
			expect(validateBugReportType(type)).toBe(true);
		}
	});

	it('returns false for an unknown type', () => {
		expect(validateBugReportType('spam')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(validateBugReportType('')).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBugReportSummary
// ─────────────────────────────────────────────────────────────────────────────

describe('buildBugReportSummary', () => {
	it('includes the report type', () => {
		const summary = buildBugReportSummary(makeContext(), 'wrong_translation');
		expect(summary).toContain('wrong_translation');
	});

	it('includes the target language name', () => {
		const summary = buildBugReportSummary(makeContext(), 'nonsensical');
		expect(summary).toContain('German');
	});

	it('includes the activity summary', () => {
		const summary = buildBugReportSummary(makeContext(makeInfoActivity()), 'other');
		expect(summary).toContain('Guten Morgen');
	});

	it('includes the optional description when provided', () => {
		const summary = buildBugReportSummary(makeContext(), 'other', 'The translation is backwards');
		expect(summary).toContain('The translation is backwards');
	});

	it('does not include description line when none provided', () => {
		const summary = buildBugReportSummary(makeContext(), 'other');
		expect(summary).not.toContain('Learner\'s description');
	});

	it('returns a non-empty string', () => {
		expect(buildBugReportSummary(makeContext(), 'audio_problem').length).toBeGreaterThan(0);
	});
});
