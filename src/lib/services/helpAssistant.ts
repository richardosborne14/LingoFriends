/**
 * LingoFriends V2 — Help Assistant Service
 *
 * Pure functions for building AI prompts for the in-lesson help system.
 * No AI calls here — this module builds the request data; the API route
 * (POST /api/help/ask) calls the AI and streams the response back.
 *
 * ARCHITECTURE: Side-effect-free. Every function is a plain string → string
 * transformation, making each fully testable without mocking any providers.
 *
 * HOW HELP WORKS:
 *   User taps ❓ → HelpPanel opens → picks action → client calls /api/help/ask
 *   → server calls getFastModel() (Groq Llama 3.3 70B) → returns text → displayed
 *
 * The fast model (Groq) is used here, not the smart model (Haiku):
 * - Help must respond in < 2 seconds (kids won't wait)
 * - Explanations are short (2-3 sentences) — quality vs. speed trade-off is fine
 * - The activity context is simple enough for Groq to handle well
 *
 * @module services/helpAssistant
 */

import type { ActivityConfig } from '$lib/types/lesson';
import { ActivityType } from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All context needed to generate help prompts for a specific activity.
 * Derived from the current LessonStep + user profile data.
 */
export interface HelpContext {
	/** The activity config for the step the learner needs help with */
	activity: ActivityConfig;
	/** User's native language ISO code (e.g. 'fr' for French) */
	nativeLanguage: string;
	/** Target language being learned (e.g. 'de' for German) */
	targetLanguage: string;
	/**
	 * User's age group — controls vocabulary complexity in AI explanations.
	 * '7-10': very simple, very friendly
	 * '11-14': friendly but not condescending
	 * '15-18': clear and direct
	 */
	ageGroup: '7-10' | '11-14' | '15-18';
	/** User's self-reported proficiency level (e.g. 'total_beginner') */
	level: string;
}

/**
 * The action types available in the HelpPanel.
 * Drives which prompt builder is called.
 */
export type HelpAction = 'explain' | 'hint' | 'free_question';

// ─────────────────────────────────────────────────────────────────────────────
// BUG REPORT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid bug report categories.
 * Must match the report_type CHECK constraint in the bug_reports DB table.
 */
export const BUG_REPORT_TYPES = [
	'wrong_translation',
	'nonsensical',
	'audio_problem',
	'other',
] as const;

export type BugReportType = (typeof BUG_REPORT_TYPES)[number];

/**
 * Human-readable labels for each bug report type.
 * Displayed in the bug report form inside HelpPanel.
 */
export const BUG_REPORT_LABELS: Record<BugReportType, string> = {
	wrong_translation: '🔤 Wrong translation',
	nonsensical: "🤔 Doesn't make sense",
	audio_problem: '🔊 Audio problem',
	other: '🐛 Something else',
};

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE & AGE GROUP UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps ISO 639-1 language codes to full language names.
 * Used in AI system prompts (human-readable is clearer than code for LLMs).
 */
const LANGUAGE_NAMES: Record<string, string> = {
	en: 'English',
	fr: 'French',
	de: 'German',
	es: 'Spanish',
	it: 'Italian',
	pt: 'Portuguese',
	nl: 'Dutch',
	ja: 'Japanese',
	zh: 'Chinese',
};

/**
 * Returns the full language name for an ISO code.
 * Falls back to the code itself for unsupported languages.
 *
 * @param code - ISO 639-1 language code
 */
export function getLanguageName(code: string): string {
	return LANGUAGE_NAMES[code] ?? code;
}

/**
 * Maps age group keys to descriptive labels for AI system prompts.
 * The label tells the AI how to calibrate vocabulary and tone.
 */
const AGE_GROUP_LABELS: Record<string, string> = {
	'7-10': 'a child aged 7-10 (use very simple, friendly language with short sentences)',
	'11-14': 'a young learner aged 11-14 (friendly but not childish, can handle 2-step explanations)',
	'15-18': 'a teenager aged 15-18 (clear and direct, can handle more complex language)',
};

/**
 * Returns the age group description for an AI prompt.
 * Falls back to a generic "learner" label for unknown groups.
 */
export function getAgeGroupLabel(ageGroup: string): string {
	return AGE_GROUP_LABELS[ageGroup] ?? 'a learner';
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY SUMMARY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a concise human-readable summary of the current activity.
 * This is injected into the AI system prompt so the AI understands the context.
 *
 * Extracts the most relevant fields per activity type rather than dumping the
 * entire ActivityConfig (which would include distractor arrays, correctIndex,
 * etc. that the AI doesn't need and might "accidentally" reveal the answer).
 *
 * IMPORTANT: For hint/explain prompts, do NOT include the correct answer or
 * correctIndex — the AI must discover relevant hints from the context only.
 *
 * @param activity - The ActivityConfig for the step requiring help
 */
export function buildActivitySummary(activity: ActivityConfig): string {
	switch (activity.type) {
		case ActivityType.INFO:
			return [
				`Activity type: Introduction (INFO)`,
				`Target phrase: "${activity.targetPhrase}"`,
				`Translation: "${activity.nativeTranslation}"`,
				activity.explanation ? `Explanation: "${activity.explanation}"` : '',
			]
				.filter(Boolean)
				.join('\n');

		case ActivityType.MULTIPLE_CHOICE:
			return [
				`Activity type: Multiple choice question`,
				`Question: "${activity.question}"`,
				`Phrase being tested: "${activity.targetPhrase}"`,
				// Include options for context — AI can reference them without revealing
				// which is correct (it doesn't know correctIndex)
				`Options: ${activity.options.join(' | ')}`,
			].join('\n');

		case ActivityType.FILL_BLANK:
			return [
				`Activity type: Fill in the blank`,
				`Sentence (with blank): "${activity.sentence}"`,
				`Phrase being practised: "${activity.targetPhrase}"`,
				activity.hint ? `Hint already shown: "${activity.hint}"` : '',
			]
				.filter(Boolean)
				.join('\n');

		case ActivityType.TRANSLATE:
			return [
				`Activity type: Translation challenge`,
				`Phrase to translate: "${activity.sourcePhrase}"`,
				// Do NOT include correctAnswer here — that would trivially reveal the answer
				`Phrase being tested: "${activity.targetPhrase}"`,
			].join('\n');

		case ActivityType.TRUE_FALSE:
			return [
				`Activity type: True or False`,
				`Statement to evaluate: "${activity.question}"`,
				activity.targetPhrase ? `Phrase this relates to: "${activity.targetPhrase}"` : '',
			]
				.filter(Boolean)
				.join('\n');

		case ActivityType.WORD_ARRANGE:
			return [
				`Activity type: Arrange the words in the correct order`,
				`Available words: ${activity.scrambledWords.join(' | ')}`,
				// Do NOT include targetSentence — that reveals the answer
			].join('\n');

		case ActivityType.MATCHING:
			return [
				`Activity type: Match each word to its translation`,
				`Left column: ${activity.pairs.map((p) => `"${p.left}"`).join(', ')}`,
				`Right column: ${activity.pairs.map((p) => `"${p.right}"`).join(', ')}`,
			].join('\n');

		case ActivityType.COACHING_CHAT:
			return [
				`Activity type: Coaching conversation`,
				`Phrase being introduced: "${activity.targetPhrase}"`,
				`Coach said: "${activity.coachingText}"`,
				`Discovery question: "${activity.discoveryQuestion}"`,
			].join('\n');

		default:
			// TypeScript exhaustive check — if a new activity type is added,
			// this must be updated. The fallback string is safe but uninformative.
			return 'Activity type: Unknown';
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the system prompt for the AI tutor assistant.
 *
 * The system prompt establishes:
 * - The AI's role (friendly tutor, not examiner)
 * - The learner's language and age context
 * - The current activity context
 * - Hard rules (respond in native language, never reveal the answer, be brief)
 *
 * This same system prompt is used for all help actions (explain, hint, free).
 * The differentiation is in the user message built by the action-specific builders.
 *
 * @param ctx - The full help context (activity + profile data)
 */
export function buildSystemPrompt(ctx: HelpContext): string {
	const nativeLang = getLanguageName(ctx.nativeLanguage);
	const targetLang = getLanguageName(ctx.targetLanguage);
	const ageLabel = getAgeGroupLabel(ctx.ageGroup);

	return [
		`You are a warm, encouraging language tutor helping someone learn ${targetLang}.`,
		`The learner is ${ageLabel}.`,
		`Their native language is ${nativeLang}. They are at the "${ctx.level}" proficiency level.`,
		``,
		`STRICT RULES:`,
		`1. ALWAYS respond in ${nativeLang} — never in ${targetLang} for explanations.`,
		`2. Keep responses to 2-3 sentences maximum. Children have short attention spans.`,
		`3. Use warm, encouraging language. Never say "wrong", "incorrect", or "bad".`,
		`4. NEVER directly give away the answer. Help them think, don't think for them.`,
		`5. If referencing ${targetLang} words or phrases, write them clearly.`,
		``,
		`Current lesson activity:`,
		buildActivitySummary(ctx.activity),
	].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MESSAGE BUILDERS (one per help action)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the user message for the "Explain this question" action.
 *
 * The AI should explain WHAT is being asked, in the native language,
 * WITHOUT hinting at the correct answer. This is for when the learner
 * doesn't understand the question format itself.
 *
 * @param ctx - Help context
 */
export function buildExplainPrompt(ctx: HelpContext): string {
	const nativeLang = getLanguageName(ctx.nativeLanguage);
	return `Please explain what this activity is asking me to do, in ${nativeLang}. Do NOT give me the answer — just help me understand the question clearly.`;
}

/**
 * Builds the user message for the "Give me a hint" action.
 *
 * The AI should give a hint that points toward the answer without revealing it.
 * A good hint reduces the solution space without eliminating the thinking work.
 * Example hint: "Think about what you'd say if someone asked your name!"
 *
 * @param ctx - Help context
 */
export function buildHintPrompt(ctx: HelpContext): string {
	const nativeLang = getLanguageName(ctx.nativeLanguage);
	return `Give me a helpful hint in ${nativeLang} to point me toward the answer. The hint should help me think it through — but do NOT just tell me the answer directly. Make it encouraging and fun!`;
}

/**
 * Builds the user message for a free-text question.
 *
 * Used when the learner types their own question or uses voice input.
 * The question is passed through as-is — the system prompt context ensures
 * the AI understands the lesson situation and stays within the rules.
 *
 * @param question - The raw text from the learner's input
 * @param ctx      - Help context (used only for system prompt, not this message)
 */
export function buildFreeQuestionPrompt(question: string, _ctx: HelpContext): string {
	// The question is passed directly — the system prompt handles the framing.
	// We strip whitespace to prevent empty questions getting AI responses.
	return question.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG REPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard: validates a bug report type string against the known types.
 * Used by the API route to reject invalid report types before DB insert.
 *
 * @param type - The string to check
 */
export function validateBugReportType(type: string): type is BugReportType {
	return (BUG_REPORT_TYPES as readonly string[]).includes(type);
}

/**
 * Builds a summary string for a bug report.
 * This is stored in the bug_reports.activity_data field as human-readable context,
 * and also used as context if we attempt to regenerate the broken question.
 *
 * @param ctx         - The current help context
 * @param reportType  - The category of issue
 * @param description - Optional free-text description from the learner
 */
export function buildBugReportSummary(
	ctx: HelpContext,
	reportType: BugReportType,
	description?: string
): string {
	return [
		`Bug type: ${reportType}`,
		`Target language: ${getLanguageName(ctx.targetLanguage)}`,
		`Activity context:`,
		buildActivitySummary(ctx.activity),
		description ? `Learner's description: "${description}"` : '',
	]
		.filter(Boolean)
		.join('\n');
}
