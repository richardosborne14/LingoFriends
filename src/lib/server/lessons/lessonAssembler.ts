/**
 * LingoFriends V2 — Lesson Assembler
 *
 * DETERMINISTIC TypeScript — ZERO AI calls.
 * Takes ChunkFamilyContent (AI output) → builds a validated LessonPlan.
 *
 * Every chunk gets the teach-first 5-step progression (per PEDAGOGY-SUMMARY.md):
 *   1. INTRODUCE  (INFO)            — 0 SunDrops
 *   2. RECOGNIZE  (MULTIPLE_CHOICE) — 1 SunDrop
 *   3. PRACTICE   (FILL_BLANK)      — 2 SunDrops
 *   4. RECALL     (TRANSLATE)       — 3 SunDrops
 *   5. APPLY      (MULTIPLE_CHOICE) — 2 SunDrops
 *
 * Plus optional coaching chat per chunk and a final matching activity.
 * SunDrops per lesson: (0+1+2+3+2) × N chunks + 3 for matching.
 *
 * @module server/lessons/lessonAssembler
 */

import { nanoid } from 'nanoid';
import {
	ActivityType,
	type ActivityConfig,
	type ChunkFamilyContent,
	type GeneratedChunk,
	type InfoActivity,
	type MultipleChoiceActivity,
	type FillBlankActivity,
	type TranslateActivity,
	type MatchingActivity,
	type CoachingChatActivity,
	type LessonStep,
	type LessonPlan,
} from '$lib/types/lesson';

// ─────────────────────────────────────────────────────────────────────────────
// SHUFFLE UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle. Returns a new array (non-mutating).
 * Used to randomise multiple choice option order.
 */
function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Shuffles an array of options and returns both the shuffled options and
 * the new index of the correct answer.
 *
 * @param options - All options (correct + distractors)
 * @param correctValue - The value that should be tracked
 * @returns { shuffled: string[], correctIndex: number }
 */
function shuffleWithTracking(
	options: string[],
	correctValue: string
): { shuffled: string[]; correctIndex: number } {
	const shuffled = shuffle(options);
	const correctIndex = shuffled.indexOf(correctValue);
	return { shuffled, correctIndex };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILL-BLANK HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the variable part of a phrase based on the core frame.
 *
 * Example:
 *   frame: "Ich heiße ___"
 *   phrase: "Ich heiße Max"
 *   → returns "Max"
 *
 * Falls back to the full phrase if the frame slot isn't matchable.
 */
function extractSlotFiller(coreFrame: string, targetPhrase: string): string {
	// Replace the ___ in the frame with a regex capture group
	// Escape special regex chars in the frame except ___
	const escapedFrame = coreFrame.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('___', '(.+)');
	const match = targetPhrase.match(new RegExp(escapedFrame, 'i'));
	if (match && match[1]) {
		return match[1].trim();
	}
	// Fallback: return the whole target phrase as the answer
	return targetPhrase;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 0 (optional) — COACHING_CHAT
 * NPC introduces the chunk warmly before the quiz sequence begins.
 * Awards 0 SunDrops — no failure state in coaching steps.
 */
function buildCoachingStep(chunk: GeneratedChunk): LessonStep {
	const activity: CoachingChatActivity = {
		type: ActivityType.COACHING_CHAT,
		coachingText: chunk.coachingText,
		discoveryQuestion: `What do you think "${chunk.targetPhrase}" means?`,
		discoveryOptions: [
			chunk.nativeTranslation,
			...chunk.distractors.slice(0, 2), // Take 2 distractors for discovery options
		],
		targetPhrase: chunk.targetPhrase,
		sunDrops: 0,
	};

	return {
		id: nanoid(),
		tutorText: "Let's learn something new!",
		helpText: `"${chunk.targetPhrase}" means "${chunk.nativeTranslation}". ${chunk.explanation}`,
		activity,
		sunDrops: 0,
	};
}

/**
 * Step 1 — INTRODUCE (INFO)
 * Shows the phrase, translation, and explanation. No question.
 * Awards 0 SunDrops — the learner must see content before being quizzed.
 */
function buildIntroduceStep(chunk: GeneratedChunk): LessonStep {
	const activity: InfoActivity = {
		type: ActivityType.INFO,
		targetPhrase: chunk.targetPhrase,
		nativeTranslation: chunk.nativeTranslation,
		explanation: chunk.explanation,
		exampleSentence: chunk.exampleSentence,
		sunDrops: 0,
	};

	return {
		id: nanoid(),
		tutorText: 'Here is a new phrase for you!',
		helpText: `${chunk.usageNote} Example: "${chunk.exampleSentence}"`,
		activity,
		sunDrops: 0,
	};
}

/**
 * Step 2 — RECOGNIZE (MULTIPLE_CHOICE)
 * "What does [phrase] mean?" — recognition, not recall.
 * 4 options: correct translation + 3 distractors (all in native language).
 * Awards 1 SunDrop.
 */
function buildRecognizeStep(chunk: GeneratedChunk): LessonStep {
	const options = [chunk.nativeTranslation, ...chunk.distractors];
	const { shuffled, correctIndex } = shuffleWithTracking(options, chunk.nativeTranslation);

	const activity: MultipleChoiceActivity = {
		type: ActivityType.MULTIPLE_CHOICE,
		question: `What does "${chunk.targetPhrase}" mean?`,
		options: shuffled,
		correctIndex,
		targetPhrase: chunk.targetPhrase,
		sunDrops: 1,
	};

	return {
		id: nanoid(),
		tutorText: 'Can you recognise what this means?',
		helpText: `"${chunk.targetPhrase}" means "${chunk.nativeTranslation}". ${chunk.explanation}`,
		activity,
		sunDrops: 1,
	};
}

/**
 * Step 3 — PRACTICE (FILL_BLANK)
 * Learner completes the sentence frame.
 * The blank replaces the variable part of the target phrase.
 * Awards 2 SunDrops.
 */
function buildPracticeStep(chunk: GeneratedChunk, coreFrame: string): LessonStep {
	// The sentence uses the core frame so the blank is the variable slot
	const correctAnswer = extractSlotFiller(coreFrame, chunk.targetPhrase);

	// Replace the slot in the core frame with ___ (or use core frame directly)
	const sentence = coreFrame.includes('___') ? coreFrame : `${coreFrame} ___`;

	const activity: FillBlankActivity = {
		type: ActivityType.FILL_BLANK,
		sentence,
		correctAnswer,
		targetPhrase: chunk.targetPhrase,
		hint: `Think: "${chunk.nativeTranslation}"`,
		sunDrops: 2,
	};

	return {
		id: nanoid(),
		tutorText: 'Complete the sentence!',
		helpText: `The full phrase is "${chunk.targetPhrase}". Fill in: "${correctAnswer}"`,
		activity,
		sunDrops: 2,
	};
}

/**
 * Step 4 — RECALL (TRANSLATE)
 * Translate from native language → target language.
 * This is the hardest step — producing the phrase from scratch.
 * Awards 3 SunDrops (highest per step).
 */
function buildRecallStep(chunk: GeneratedChunk): LessonStep {
	const activity: TranslateActivity = {
		type: ActivityType.TRANSLATE,
		sourcePhrase: chunk.nativeTranslation,
		correctAnswer: chunk.targetPhrase,
		// Include a few accepted variations — trimmed + case-insensitive handled by UI
		acceptedAnswers: [chunk.targetPhrase, chunk.targetPhrase.toLowerCase()],
		targetPhrase: chunk.targetPhrase,
		sunDrops: 3,
	};

	return {
		id: nanoid(),
		tutorText: 'Now translate it yourself!',
		helpText: `"${chunk.nativeTranslation}" translates to "${chunk.targetPhrase}". ${chunk.usageNote}`,
		activity,
		sunDrops: 3,
	};
}

/**
 * Step 5 — APPLY (MULTIPLE_CHOICE)
 * "When would you say [phrase]?" — contextual usage understanding.
 * 4 options: correct usage context + 3 wrong contexts (all in native language).
 * Awards 2 SunDrops.
 */
function buildApplyStep(chunk: GeneratedChunk): LessonStep {
	const options = [chunk.correctUsageContext, ...chunk.wrongUsageContexts];
	const { shuffled, correctIndex } = shuffleWithTracking(
		options,
		chunk.correctUsageContext
	);

	const activity: MultipleChoiceActivity = {
		type: ActivityType.MULTIPLE_CHOICE,
		question: `When would you say "${chunk.targetPhrase}"?`,
		options: shuffled,
		correctIndex,
		targetPhrase: chunk.targetPhrase,
		sunDrops: 2,
	};

	return {
		id: nanoid(),
		tutorText: 'When do you use this phrase?',
		helpText: `You say "${chunk.targetPhrase}" when: ${chunk.correctUsageContext}. ${chunk.usageNote}`,
		activity,
		sunDrops: 2,
	};
}

/**
 * Final step — MATCHING
 * Connect all chunks (target phrase ↔ native translation).
 * Pairs are shuffled for variety.
 * Awards 3 SunDrops.
 */
function buildMatchingStep(chunks: GeneratedChunk[]): LessonStep {
	// Shuffle the pairs so they're not in lesson order
	const pairs = shuffle(
		chunks.map((chunk) => ({
			left: chunk.targetPhrase,
			right: chunk.nativeTranslation,
		}))
	);

	const activity: MatchingActivity = {
		type: ActivityType.MATCHING,
		pairs,
		sunDrops: 3,
	};

	return {
		id: nanoid(),
		tutorText: 'Match everything you learned!',
		helpText: 'Connect each phrase to its translation. Take your time!',
		activity,
		sunDrops: 3,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ASSEMBLY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assembles a complete LessonPlan from ChunkFamilyContent.
 *
 * Enforces the teach-first 5-step progression per chunk and adds
 * an optional coaching chat before each chunk's teach sequence.
 * Final step is a matching activity covering all chunks.
 *
 * ZERO AI calls in this function. Deterministic output given the same input
 * (except for shuffle order, which is intentionally random).
 *
 * @param content - Validated ChunkFamilyContent from the AI
 * @param lessonId - Pre-generated unique ID for this lesson
 * @returns A complete LessonPlan ready for validateLessonPlan()
 */
export function assembleLessonPlan(content: ChunkFamilyContent, lessonId: string): LessonPlan {
	const steps: LessonStep[] = [];
	const coreFrame = content.coreFrame;

	for (const chunk of content.chunks) {
		// Optional: coaching chat introduces the chunk before the quiz sequence
		// Only add if coachingText is present and meaningful
		if (chunk.coachingText && chunk.coachingText.trim().length > 0) {
			steps.push(buildCoachingStep(chunk));
		}

		// The 5-step teach-first sequence (NEVER skip or reorder these)
		steps.push(buildIntroduceStep(chunk)); // 0 SunDrops
		steps.push(buildRecognizeStep(chunk)); // 1 SunDrop
		steps.push(buildPracticeStep(chunk, coreFrame)); // 2 SunDrops
		steps.push(buildRecallStep(chunk)); // 3 SunDrops
		steps.push(buildApplyStep(chunk)); // 2 SunDrops
	}

	// Final matching step covers all chunks — only add if we have 2+ chunks
	if (content.chunks.length >= 2) {
		steps.push(buildMatchingStep(content.chunks));
	}

	const totalSunDrops = steps.reduce((sum, step) => sum + step.sunDrops, 0);

	return {
		id: lessonId,
		title: content.title,
		icon: '📖',
		coreFrame: content.coreFrame,
		coreFrameTranslation: content.coreFrameTranslation,
		steps,
		totalSunDrops,
		chunkCount: content.chunks.length,
	};
}
