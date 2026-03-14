/**
 * LingoFriends V2 — Lesson TTS Pre-Generator
 *
 * Pre-generates TTS audio for every INFO step in a lesson plan.
 * Returns an `audioCache` map (text → base64 MP3) that gets embedded
 * directly in the LessonPlan JSON.
 *
 * WHY embed in lesson plan: LessonPlan is stored in lessonHistory.lessonData
 * (a JSONB column) when a lesson completes. This means all pre-generated audio
 * is automatically persisted in the DB — lesson replays have instant audio
 * with zero additional TTS API calls.
 *
 * WHAT we pre-generate for each INFO step:
 *   1. targetPhrase  → played when user taps the 🔊 phrase button in ChunkIntroduction
 *   2. explanation   → auto-played on ChunkIntroduction mount (the "NPC speaking" text)
 *
 * Generation runs in parallel, capped at MAX_CONCURRENT requests to avoid
 * hammering the TTS API rate limits.
 *
 * All TTS uses the target-language voice (RULE 11), even for native-language
 * explanation text. This is intentional — see docs/new-docs/03-AI-STRATEGY.md.
 *
 * @module server/tts/ttsCache
 */

import { ActivityType, type LessonStep } from '$lib/types/lesson';
import type { LanguageCode } from '$lib/types/language';
import { callGoogleTTS } from './googleTTS';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum concurrent TTS API calls during pre-generation.
 * 5 is conservative — avoids rate limit errors while still being fast.
 * A typical lesson has 3 chunks × 2 texts = 6 TTS calls, so this handles
 * the whole lesson in roughly 2 batches.
 */
const MAX_CONCURRENT = 5;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs an array of async tasks with a concurrency limit.
 * Returns results in the same order as the input tasks.
 *
 * WHY not Promise.all: Promise.all fires all tasks simultaneously.
 * With 6+ TTS calls, that risks hitting Google's rate limit (10 QPS).
 *
 * @param tasks     - Array of async factory functions
 * @param limit     - Maximum number of tasks running at once
 */
async function withConcurrencyLimit<T>(
	tasks: Array<() => Promise<T>>,
	limit: number
): Promise<T[]> {
	const results: T[] = new Array(tasks.length);
	let nextIndex = 0;

	// Worker function: pulls the next task index until all are consumed
	async function worker() {
		while (nextIndex < tasks.length) {
			const i = nextIndex++;
			results[i] = await tasks[i]();
		}
	}

	// Start `limit` workers concurrently
	const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
	await Promise.all(workers);

	return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-generates TTS audio for all INFO steps in a lesson.
 *
 * Collects unique texts from INFO steps (targetPhrase + explanation),
 * generates audio in parallel (with rate-limit cap), and returns a map
 * that can be embedded in the LessonPlan as `audioCache`.
 *
 * Returns an empty map if:
 *   - No API key is provided (TTS not configured)
 *   - All TTS calls fail (graceful degradation — lesson still works)
 *
 * @param steps          - Lesson steps to scan for INFO activities
 * @param targetLanguage - Voice language (RULE 11: always target language)
 * @param apiKey         - Google Cloud TTS API key (may be empty/undefined)
 * @returns audioCache map: text → base64 MP3
 */
export async function preGenerateAudioCache(
	steps: LessonStep[],
	targetLanguage: LanguageCode,
	apiKey: string | undefined
): Promise<Record<string, string>> {
	// Early exit: no API key configured — return empty, lesson degrades gracefully
	if (!apiKey) {
		console.info('[ttsCache] No API key — skipping audio pre-generation');
		return {};
	}

	// ── Collect unique texts from INFO steps ──────────────────────────────────
	// We use a Set to avoid duplicate TTS calls (same phrase across chunks).
	const textsToGenerate = new Set<string>();

	for (const step of steps) {
		if (step.activity.type === ActivityType.INFO) {
			const { targetPhrase, explanation } = step.activity;

			// targetPhrase: played when user taps the phrase audio button
			if (targetPhrase?.trim()) {
				textsToGenerate.add(targetPhrase.trim());
			}

			// explanation: auto-played on ChunkIntroduction mount (RULE 11 voice)
			// This is intentionally in the native language but uses target-lang voice
			if (explanation?.trim()) {
				textsToGenerate.add(explanation.trim());
			}
		}
	}

	if (textsToGenerate.size === 0) {
		// No INFO steps — nothing to pre-generate
		return {};
	}

	// ── Generate TTS in parallel with concurrency cap ─────────────────────────
	const textArray = Array.from(textsToGenerate);

	const tasks = textArray.map((text) => async () => {
		const audio = await callGoogleTTS(text, targetLanguage, apiKey);
		return { text, audio };
	});

	const results = await withConcurrencyLimit(tasks, MAX_CONCURRENT);

	// ── Build the audio cache map ─────────────────────────────────────────────
	const audioCache: Record<string, string> = {};
	let successCount = 0;

	for (const { text, audio } of results) {
		if (audio) {
			audioCache[text] = audio;
			successCount++;
		}
		// Failed entries are silently omitted — the lesson works without audio
	}

	console.info(
		`[ttsCache] Pre-generated ${successCount}/${textArray.length} audio clips for lesson`
	);

	return audioCache;
}
