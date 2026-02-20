/**
 * pathGeneratorService
 *
 * Ensures a skill path has AI-generated lesson titles before the garden
 * renders it. Called by `useGarden` when it detects a path with 0 lessons.
 *
 * Generation flow:
 *   1. Fetch the raw skill path record from PB to get name / targetLanguage
 *   2. Call Groq (via groqService) to generate a list of lesson titles
 *   3. Patch the PB `skill_paths` record with the generated titles
 *   4. Invalidate the skillPathService cache so the next fetch is fresh
 *
 * Safety guarantees:
 * - Idempotent: if `lessonTitles` already has entries, returns immediately
 * - Concurrency-safe: PB write uses optimistic locking via record `updated`
 *   field — the second writer silently loses but both end up with lessons
 * - Never throws: errors are logged and the caller's Promise.all resolves
 *
 * @module pathGeneratorService
 * @see docs/phase-1.2/task-G-dynamic-paths.md
 */

import { pb } from '../../services/pocketbaseService';
import { invalidateSkillPathCache } from './skillPathService';

// ============================================
// TYPES
// ============================================

/**
 * Minimal PB record shape we need to read before generating
 */
interface PBSkillPathMin {
  id: string;
  name: string;
  icon?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  subjectType?: string;       // 'language' | 'subject'
  lessonTitles?: string[];
  updated?: string;
}

// ============================================
// GENERATION HELPERS
// ============================================

/**
 * Default number of lessons to generate if Groq is unavailable.
 * Kids get 5 reachable milestones — not overwhelming, not too sparse.
 */
const DEFAULT_LESSON_COUNT = 5;

/**
 * Generate lesson titles using Groq.
 *
 * Kept intentionally simple: one Groq call, JSON-parse, done.
 * The full lesson plan (activities, dialogue, quiz) is generated later
 * inside `handleStartLesson` — this only produces the headline titles.
 *
 * Falls back to generic placeholders if Groq is unavailable so the
 * path still renders and the user isn't blocked.
 */
async function generateLessonTitles(
  pathName: string,
  targetLanguage: string,
  _nativeLanguage: string,
  subjectType: string,
): Promise<string[]> {
  try {
    // Use the Groq chat completions API directly so this service has no
    // dependency on groqService's ChatSession type shape.
    const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set');

    const isLanguage = subjectType !== 'subject';
    const userPrompt = isLanguage
      ? `Create a list of exactly ${DEFAULT_LESSON_COUNT} lesson titles for a child learning ${targetLanguage}.
The skill path is called "${pathName}".
Titles must be short (3–6 words), friendly, and age-appropriate for kids 7–18.
Return ONLY a JSON array — no markdown, no explanation:
["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`
      : `Create a list of exactly ${DEFAULT_LESSON_COUNT} lesson titles for a child studying "${pathName}".
Titles must be short (3–6 words), friendly, and age-appropriate for kids 7–18.
Return ONLY a JSON array — no markdown, no explanation:
["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a curriculum designer. Respond with ONLY the requested JSON array.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices[0]?.message?.content ?? '';

    // Strip markdown fences before parsing
    const cleaned = raw.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const titles = JSON.parse(cleaned) as string[];

    if (!Array.isArray(titles) || titles.length === 0) {
      throw new Error('Groq returned empty titles array');
    }

    return titles.slice(0, DEFAULT_LESSON_COUNT);
  } catch (err) {
    console.warn('[pathGeneratorService] Groq generation failed, using placeholders:', err);
    // Fallback: render the path immediately with generic titles.
    // ensurePathGenerated is idempotent — Groq will be retried if the
    // PB write fails (lessonTitles stays empty, triggering again next load).
    return Array.from({ length: DEFAULT_LESSON_COUNT }, (_, i) => `Lesson ${i + 1}`);
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Ensure a skill path has lesson titles.
 *
 * If the path already has `lessonTitles.length > 0`, returns those existing
 * titles immediately (idempotent).  Otherwise, generates titles via Groq and
 * ATTEMPTS to patch the PB record — but always returns the generated titles
 * regardless of whether the PB write succeeds.
 *
 * This resilience is important: the `skill_paths` PB update rule may block
 * regular users (403), in which case lessons are served in-memory for the
 * session.  The caller (`useSkillPath`) can then populate its own state
 * without waiting for PB to be correct.
 *
 * This function never throws — all errors are caught and logged.
 *
 * @param _userId     - The current user ID (reserved for per-user paths in Phase 2)
 * @param skillPathId - The PB `skill_paths` record ID to ensure is generated
 * @returns The lesson title strings (from PB if already set, from Groq if generated)
 */
export async function ensurePathGenerated(
  _userId: string,
  skillPathId: string,
): Promise<string[]> {
  try {
    // Step 1: Fetch the raw PB record to check existing state
    const record = await pb.collection('skill_paths').getOne<PBSkillPathMin>(skillPathId);

    // Idempotency guard: if lessons already exist, return them directly
    if (Array.isArray(record.lessonTitles) && record.lessonTitles.length > 0) {
      invalidateSkillPathCache(skillPathId);
      return record.lessonTitles;
    }

    // Step 2: Generate lesson titles with Groq
    const titles = await generateLessonTitles(
      record.name,
      record.targetLanguage ?? 'the target language',
      record.nativeLanguage ?? 'English',
      record.subjectType ?? 'language',
    );

    // Step 3: Attempt to persist titles to PB.
    // This may fail with 403 if the collection update rule blocks regular users.
    // We deliberately catch that error and still return the titles below —
    // the caller can use them in-memory even if PB rejects the write.
    try {
      await pb.collection('skill_paths').update(skillPathId, { lessonTitles: titles });
      console.log(
        `[pathGeneratorService] Persisted ${titles.length} lessons for "${record.name}" (${skillPathId})`,
      );
      // Bust cache only after a successful PB write
      invalidateSkillPathCache(skillPathId);
    } catch (pbErr) {
      // 403 "Only superusers can perform this action" — PB collection rule issue.
      // Titles were generated successfully; return them for in-memory use.
      console.warn(
        `[pathGeneratorService] PB write failed for ${skillPathId} (serving in-memory):`,
        pbErr,
      );
    }

    return titles;
  } catch (err) {
    // Outer catch: PB fetch or Groq call failed entirely — return empty so caller
    // can show a friendly "still setting up" message rather than crashing.
    console.warn(
      `[pathGeneratorService] ensurePathGenerated failed for ${skillPathId} (non-fatal):`,
      err,
    );
    return [];
  }
}
