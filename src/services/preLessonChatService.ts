/**
 * LingoFriends — Pre-Lesson Chat Service (Phase 3, Task 3.3)
 *
 * Runs a short, friendly AI conversation BEFORE lesson generation to collect
 * personal context. The context is used by the chunk family generator to
 * produce personalised examples (e.g. "Ich habe eine Katze" if the learner
 * mentioned they have a cat).
 *
 * ARCHITECTURE RULES FOLLOWED:
 *   Rule 12: Uses the FAST model (Groq Llama 3.3) — NOT the smart model.
 *     Pre-lesson chat must feel instant for kids. Content quality matters
 *     less here than speed; the smart model is reserved for chunk generation.
 *   Rule 9:  Personal context is OPTIONAL and NEVER BLOCKING.
 *     If this service throws, the caller must catch and proceed with null.
 *     The lesson must always work without personal context.
 *   Rule 13: Age-appropriate exchange counts.
 *     - 7-10:  1 exchange (just 1 question)
 *     - 11-14: 2 exchanges (2 questions)
 *     - 15-18: 2-3 exchanges (up to 3 questions)
 *
 * OUTPUT:
 *   A compact plain-text string summarising what we learned:
 *   "User is 11 years old, has a dog called Max, and loves Minecraft."
 *   This is passed as `personalContext` to the chunk generator.
 *
 * @module preLessonChatService
 * @see docs/phase-3-ai-assisted-content/
 */

import { aiProviderService } from './ai';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single question + answer pair from the pre-lesson chat.
 */
export interface ChatExchange {
  /** The question shown to the learner */
  question: string;
  /** The learner's answer (typed or selected quick reply) */
  answer: string;
}

/**
 * Options for starting a pre-lesson chat session.
 */
export interface PreLessonChatOptions {
  /** Lesson topic — used to make questions relevant */
  lessonTopic: string;
  /** Target language name, e.g. "German" */
  targetLanguageName: string;
  /** Learner's age group */
  ageGroup: '7-10' | '11-14' | '15-18';
  /** Optional existing interests to avoid asking about already-known preferences */
  knownInterests?: string[];
}

/**
 * Result from a completed pre-lesson chat.
 */
export interface PreLessonChatResult {
  /** The raw exchanges that were collected */
  exchanges: ChatExchange[];
  /** Compact summary string for the chunk generator */
  personalContext: string;
}

/**
 * A single question with optional quick-reply suggestions.
 */
export interface ChatQuestion {
  /** The question text to show the learner */
  text: string;
  /** Optional quick-reply options (shown as tap-to-select buttons) */
  quickReplies?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum exchanges per age group — Rule 13 */
const MAX_EXCHANGES: Record<string, number> = {
  '7-10': 1,
  '11-14': 2,
  '15-18': 3,
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * PreLessonChatService
 *
 * Generates personalised questions and summarises the learner's answers
 * into a compact context string for the chunk generator.
 */
export class PreLessonChatService {

  /**
   * Generate the first question for the pre-lesson chat.
   *
   * Returns a question + optional quick-reply options.
   * The question is always in the NATIVE language (English etc.).
   *
   * Uses the FAST model (Rule 12) — latency must be <2s.
   *
   * @param options - Chat configuration
   * @returns The first question with quick replies
   */
  async getFirstQuestion(options: PreLessonChatOptions): Promise<ChatQuestion> {
    const maxExchanges = MAX_EXCHANGES[options.ageGroup] ?? 2;

    const systemPrompt = `You are a friendly language app making a lesson personal for a child.
Age group: ${options.ageGroup}. Lesson topic: "${options.lessonTopic}" (${options.targetLanguageName}).
Ask ONE short, warm question to help personalise the lesson. Keep it simple and fun.
The question should help us add personal details to the ${options.targetLanguageName} phrases we'll teach.
For age 7-10: very simple, max 8 words. For 11-14: friendly, max 12 words. For 15-18: normal.
Also suggest 3-5 quick reply options (short phrases the learner can tap instead of typing).
Respond with ONLY valid JSON: { "question": "...", "quickReplies": ["...", "...", "..."] }`;

    const userPrompt = `Lesson: "${options.lessonTopic}" in ${options.targetLanguageName}. Age: ${options.ageGroup}.${
      options.knownInterests?.length ? ` Known interests: ${options.knownInterests.join(', ')}.` : ''
    } Generate the first personalisation question.`;

    try {
      const result = await aiProviderService.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        maxTokens: 200,
        jsonMode: true,
      });

      const parsed = JSON.parse(result.text) as { question?: string; quickReplies?: string[] };
      return {
        text: parsed.question || `What's something you enjoy doing? 😊`,
        quickReplies: parsed.quickReplies?.slice(0, 5),
      };
    } catch {
      // Fallback question if AI fails — Rule 9: never blocking
      return {
        text: `Tell me something about yourself — what do you like? 🌟`,
        quickReplies: ['I love sports', 'I like music', 'I enjoy gaming', 'I love animals'],
      };
    }
  }

  /**
   * Generate a follow-up question based on the previous answer.
   *
   * Only called for age 11-14 (≤2 exchanges) and 15-18 (≤3 exchanges).
   * Returns null when no more questions are needed.
   *
   * @param options - Chat configuration
   * @param previousExchanges - Q&A pairs collected so far
   * @param questionIndex - 0-based index of the follow-up (0 = first follow-up)
   * @returns Next question, or null if we have enough context
   */
  async getFollowUpQuestion(
    options: PreLessonChatOptions,
    previousExchanges: ChatExchange[],
    questionIndex: number
  ): Promise<ChatQuestion | null> {
    const maxExchanges = MAX_EXCHANGES[options.ageGroup] ?? 2;

    // Stop if we've reached the max for this age group
    if (questionIndex >= maxExchanges - 1) return null;

    const context = previousExchanges.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n');

    const systemPrompt = `You are a friendly language app. You already asked ${previousExchanges.length} question(s).
Now ask ONE more short follow-up to get a bit more personal context for a ${options.targetLanguageName} lesson on "${options.lessonTopic}".
Build on what you already know. Keep it fun and brief.
Respond with ONLY valid JSON: { "question": "...", "quickReplies": ["...", "...", "..."] }`;

    try {
      const result = await aiProviderService.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Previous exchanges:\n${context}` },
        ],
        temperature: 0.8,
        maxTokens: 150,
        jsonMode: true,
      });

      const parsed = JSON.parse(result.text) as { question?: string; quickReplies?: string[] };
      if (!parsed.question) return null;
      return {
        text: parsed.question,
        quickReplies: parsed.quickReplies?.slice(0, 5),
      };
    } catch {
      // If follow-up generation fails, stop here — Rule 9
      return null;
    }
  }

  /**
   * Summarise the collected exchanges into a compact context string.
   *
   * This string is passed directly to the chunk family generator as
   * `personalContext`. It should be 1-3 sentences max.
   *
   * @param exchanges - All Q&A pairs from the chat
   * @param lessonTopic - The lesson topic for relevance
   * @returns Compact personal context string, or empty string if no data
   */
  async summariseContext(
    exchanges: ChatExchange[],
    lessonTopic: string
  ): Promise<string> {
    if (exchanges.length === 0) return '';

    const rawExchanges = exchanges.map(e => `Q: ${e.question} / A: ${e.answer}`).join('\n');

    const systemPrompt = `Summarise these chat exchanges into 1-3 sentences of personal context.
Write in 3rd person: "The learner..." or "User likes...".
Focus on details useful for personalising ${lessonTopic} lesson examples.
Be specific about names, hobbies, pets etc. Do NOT include ages.
Respond with ONLY plain text (no JSON, no quotes).`;

    try {
      const result = await aiProviderService.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawExchanges },
        ],
        temperature: 0.3,
        maxTokens: 120,
        jsonMode: false,
      });

      const summary = result.text.trim();
      // Sanity check — if the summary is empty or too long, use a fallback
      if (!summary || summary.length > 400) {
        return this.buildFallbackSummary(exchanges);
      }
      return summary;
    } catch {
      return this.buildFallbackSummary(exchanges);
    }
  }

  /**
   * Build a simple fallback summary by concatenating answers.
   * Used when the AI summarisation call fails — Rule 9.
   */
  private buildFallbackSummary(exchanges: ChatExchange[]): string {
    const answers = exchanges.map(e => e.answer).filter(Boolean);
    if (answers.length === 0) return '';
    return `The learner mentioned: ${answers.join('; ')}.`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance */
export const preLessonChatService = new PreLessonChatService();
export default preLessonChatService;
