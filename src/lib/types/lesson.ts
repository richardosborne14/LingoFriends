/**
 * LingoFriends V2 — Lesson & Activity Types
 *
 * Core type system for the lesson engine. These types flow through the entire
 * lesson generation pipeline:
 *   ChunkFamilyContent → LessonPlan → LessonStep → ActivityConfig
 *
 * ARCHITECTURE RULE: The AI generates ChunkFamilyContent (raw content).
 * The lessonAssembler builds LessonPlan from it (pure TypeScript, no AI).
 * ActivityConfig objects are NEVER produced by AI.
 *
 * @module types/lesson
 */

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All supported activity types in the lesson engine.
 * String enum for readable debug output.
 */
export enum ActivityType {
	INFO = 'info',
	MULTIPLE_CHOICE = 'multiple_choice',
	FILL_BLANK = 'fill_blank',
	TRANSLATE = 'translate',
	TRUE_FALSE = 'true_false',
	WORD_ARRANGE = 'word_arrange',
	MATCHING = 'matching',
	COACHING_CHAT = 'coaching_chat',
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-ACTIVITY CONFIG INTERFACES
// Each type has a strictly typed config. Missing required fields = lesson error.
// ─────────────────────────────────────────────────────────────────────────────

/** Step 1 — INTRODUCE. Shows phrase + translation + audio. No question. */
export interface InfoActivity {
	type: ActivityType.INFO;
	targetPhrase: string; // The target language phrase being introduced
	nativeTranslation: string; // Native language translation
	explanation?: string; // Optional warm coaching explanation
	exampleSentence?: string; // Optional example usage sentence
	sunDrops: 0; // Introducing new content awards no SunDrops
}

/** Steps 2 & 5 — RECOGNIZE and APPLY. 4 options, 1 correct. */
export interface MultipleChoiceActivity {
	type: ActivityType.MULTIPLE_CHOICE;
	question: string; // "What does X mean?" or "When would you say X?"
	options: string[]; // 4 options (shuffled at assembly time)
	correctIndex: number; // 0-3, updated after shuffle
	targetPhrase: string; // The phrase being tested (for teach-before-test check)
	sunDrops: number;
}

/** Step 3 — PRACTICE. Sentence with ___ blank. */
export interface FillBlankActivity {
	type: ActivityType.FILL_BLANK;
	sentence: string; // Contains ___ where the answer goes
	correctAnswer: string; // The word/phrase that fills the blank
	targetPhrase: string; // Full target phrase (for teach-before-test check)
	hint?: string; // Optional hint for younger learners
	sunDrops: number;
}

/** Step 4 — RECALL. Translate from native → target language. */
export interface TranslateActivity {
	type: ActivityType.TRANSLATE;
	sourcePhrase: string; // Native language phrase to translate
	correctAnswer: string; // Canonical correct translation (target language)
	acceptedAnswers: string[]; // All acceptable variations (incl. correctAnswer)
	targetPhrase: string; // Target phrase (for teach-before-test check)
	sunDrops: number;
}

/** Bonus activity — True/False about a chunk's usage or meaning. */
export interface TrueFalseActivity {
	type: ActivityType.TRUE_FALSE;
	question: string; // Statement to evaluate
	isTrue: boolean; // Whether the statement is correct
	targetPhrase?: string; // Optional: the phrase this tests
	sunDrops: number;
}

/** Bonus activity — Scrambled words to arrange. */
export interface WordArrangeActivity {
	type: ActivityType.WORD_ARRANGE;
	targetSentence: string; // The correct assembled sentence
	scrambledWords: string[]; // Words in random order (min 2)
	targetPhrase?: string;
	sunDrops: number;
}

/** Final activity — Match target phrases to native translations. */
export interface MatchingActivity {
	type: ActivityType.MATCHING;
	pairs: { left: string; right: string }[]; // left=target, right=native
	sunDrops: number;
}

/**
 * Phase 3 activity — NPC coach introduces a chunk warmly.
 * Awards 0 SunDrops. No failure state — all responses get encouragement.
 */
export interface CoachingChatActivity {
	type: ActivityType.COACHING_CHAT;
	coachingText: string; // NPC's warm introduction of the chunk
	discoveryQuestion: string; // "What do you think 'Ich heiße' means?"
	discoveryOptions?: string[]; // Optional tappable options (required for ages 7-10)
	targetPhrase: string; // The phrase being introduced
	sunDrops: 0;
}

/** Union of all activity config types. */
export type ActivityConfig =
	| InfoActivity
	| MultipleChoiceActivity
	| FillBlankActivity
	| TranslateActivity
	| TrueFalseActivity
	| WordArrangeActivity
	| MatchingActivity
	| CoachingChatActivity;

// ─────────────────────────────────────────────────────────────────────────────
// LESSON PLAN TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single step within a lesson.
 * Each step wraps one activity with tutor text and help text.
 */
export interface LessonStep {
	/** Unique step ID (nanoid) */
	id: string;
	/** Brief encouragement shown above the activity (e.g., "Great! Now let's try...") */
	tutorText: string;
	/** Contextual help shown when learner taps "Ask for help" */
	helpText: string;
	/** The activity configuration for this step */
	activity: ActivityConfig;
	/** SunDrops awarded for completing this step */
	sunDrops: number;
}

/**
 * The complete lesson plan — output of the lessonAssembler.
 * Validated by lessonValidator before reaching the UI.
 */
export interface LessonPlan {
	/** Unique lesson ID (nanoid) */
	id: string;
	/** Display title (e.g., "Saying Your Name") */
	title: string;
	/** Emoji icon for the lesson */
	icon: string;
	/** The core sentence frame (e.g., "Ich heiße ___") */
	coreFrame?: string;
	/** Native translation of the core frame */
	coreFrameTranslation?: string;
	/** All lesson steps in order */
	steps: LessonStep[];
	/** Sum of all step sunDrops */
	totalSunDrops: number;
	/** Number of chunks in this lesson */
	chunkCount: number;
	/**
	 * True if this is a review (SRS refresh) lesson rather than a new lesson.
	 * Review lessons: no INTRODUCE steps, only PRACTICE/RECALL.
	 * Used by the lesson page to show "Review" badge instead of "Lesson N".
	 */
	isReview?: boolean;
	/**
	 * Target language ISO code (e.g. 'de') — optional, populated by review lesson
	 * builder so the lesson page can pass correct language to TTS.
	 */
	targetLanguage?: string;
	/** Native language ISO code — optional, same use case as targetLanguage */
	nativeLanguage?: string;
	/**
	 * Pre-generated TTS audio map: text → base64 MP3.
	 * Populated server-side by preGenerateAudioCache() during lesson generation.
	 * Persisted automatically in lessonHistory.lessonData (JSONB) when the lesson
	 * completes — meaning replay always has cached audio, no TTS API re-calls.
	 *
	 * Keyed by the TEXT ITSELF (targetPhrase or explanation), not by step ID,
	 * so the client can look up any string directly: audioCache[chunk.explanation]
	 */
	audioCache?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONTENT TYPES (what the AI produces — NOT ActivityConfig)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single lexical chunk — one variation of the core frame.
 * This is raw content from the AI. The assembler converts it into 5 LessonSteps.
 */
export interface GeneratedChunk {
	/** The target language phrase (e.g., "Ich heiße Max") */
	targetPhrase: string;
	/** Native language translation (e.g., "My name is Max") */
	nativeTranslation: string;
	/** Example sentence showing the phrase in context */
	exampleSentence: string;
	/** Brief factual usage note (e.g., "Most common way to introduce yourself") */
	usageNote: string;
	/** Warm coaching explanation for the learner */
	explanation: string;
	/**
	 * 3 plausible wrong answers in the NATIVE language.
	 * NEVER in the target language — that would test the wrong skill.
	 */
	distractors: string[];
	/** Correct context (e.g., "Meeting someone new at school") */
	correctUsageContext: string;
	/** 3 wrong contexts (e.g., "Ordering food", "Saying goodbye") */
	wrongUsageContexts: string[];
	/** NPC coach monologue introducing this chunk warmly */
	coachingText: string;
}

/**
 * The complete AI output for one lesson.
 * Contains a core frame + N variations (chunks).
 * This is NEVER stored as-is — always converted to a LessonPlan via the assembler.
 */
export interface ChunkFamilyContent {
	/** The reusable sentence pattern (e.g., "Ich heiße ___") */
	coreFrame: string;
	/** Native translation of the core frame (e.g., "My name is ___") */
	coreFrameTranslation: string;
	/** Display title for the lesson */
	title: string;
	/** The chunk variations (2 for ages 7-10, 3 for ages 11-18) */
	chunks: GeneratedChunk[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CHUNK GENERATION INPUT
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageCode } from './language';

/**
 * Parameters passed to generateChunkFamily().
 * All fields are used to personalise the AI prompt.
 */
export interface ChunkGenerationParams {
	/** Lesson topic (e.g., "introduce-name") */
	topic: string;
	/** Target language being learned (e.g., 'de' for German) */
	targetLanguage: LanguageCode;
	/** Learner's native language (e.g., 'fr' for French) */
	nativeLanguage: LanguageCode;
	/** Learner's age group — controls chunk count and vocabulary complexity */
	ageGroup: '7-10' | '11-14' | '15-18';
	/** Learner's interests for relevance (e.g., ['football', 'gaming']) */
	interests: string[];
	/**
	 * Personal context from pre-lesson chat (e.g., "I played football today").
	 * Optional — lesson generation MUST work when this is null.
	 */
	personalContext?: string | null;
	/** Previously generated phrases to avoid repeating */
	existingChunks?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON RESULTS (sent to the completion API)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-chunk result reported when a lesson completes. */
export interface ChunkResult {
	targetPhrase: string;
	correct: boolean;
	wrongAttempts: number;
	usedHelp: boolean;
}

/** Full results payload sent to POST /api/lessons/complete */
export interface LessonResults {
	sunDropsEarned: number;
	sunDropsMax: number;
	correctCount: number;
	wrongCount: number;
	helpUsed: number;
	timeSpentMs: number;
	chunkResults: ChunkResult[];
	lessonData?: LessonPlan; // Full plan for history storage
	personalContext?: string;
}
