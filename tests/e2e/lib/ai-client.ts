/**
 * LingoFriends — AI Test Client
 *
 * Direct HTTP calls to each AI provider for lesson content generation.
 * No browser dependencies — pure Node.js fetch.
 *
 * The system prompt used here mirrors aiPedagogyClient.ts exactly so tests
 * evaluate what the production code would generate.
 *
 * Provider format differences handled here:
 *   - DeepInfra + Groq: OpenAI-compatible messages API
 *   - Anthropic: Messages API (system is a top-level field, not a message)
 *
 * @module tests/e2e/lib/ai-client
 */

import { logStep, log, sleep } from './test-utils.js';
import type { ProviderKey, GeneratedChunk, ProviderConfig } from './types.js';

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

/**
 * Get provider configuration from environment variables.
 * Called at runtime so env vars are loaded by the time we need them.
 */
function getProviderConfigs(): Record<ProviderKey, ProviderConfig> {
  return {
    deepinfra: {
      baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
      model: 'zai-org/GLM-5',
      apiKey: process.env['VITE_DEEPINFRA_API_KEY'] ?? '',
      openAICompatible: true,
      rateLimitDelayMs: 500,
      // Disabled until endpoint + API key are verified working.
      // Re-enable by removing experimental: true, then run suite 08 in isolation.
      experimental: true,
    },
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      apiKey: process.env['VITE_GROQ_API_KEY'] ?? '',
      openAICompatible: true,
      rateLimitDelayMs: 2000, // Groq rate-limits more aggressively on free tier
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: process.env['VITE_ANTHROPIC_API_KEY'] ?? '',
      extraHeaders: {
        'anthropic-version': '2023-06-01',
      },
      openAICompatible: false,
      rateLimitDelayMs: 1000,
    },
  };
}

// ============================================================================
// SYSTEM PROMPT
// This matches the system prompt in aiPedagogyClient.ts EXACTLY.
// If that prompt changes, this must be updated too.
// ============================================================================

/**
 * Build the chunk generation system prompt.
 * Mirrors AIPedagogyClient.generateChunksForTopic() system prompt.
 */
function buildChunkSystemPrompt(
  targetLanguageName: string,
  nativeLanguageName: string,
  ageGroup: string,
  chunkCount: number,
  interests: string[]
): string {
  return `You are a language education content creator for children.
Your job is to generate vocabulary content for a ${targetLanguageName} lesson.
The learner's native language is ${nativeLanguageName}.
Age group: ${ageGroup}.

STRICT RULES:
1. Generate exactly ${chunkCount} lexical chunks (whole phrases, not isolated words).
2. All chunks (targetPhrase, exampleSentence) must be in ${targetLanguageName}.
3. ALL translations, explanations, usageNotes, and distractors MUST be in ${nativeLanguageName}.
4. Distractors MUST be plausible but clearly wrong. They MUST be in ${nativeLanguageName} — NEVER in ${targetLanguageName}.
5. Usage contexts (correctUsageContext, wrongUsageContexts) MUST be in ${nativeLanguageName}.
6. Keep content age-appropriate, encouraging, and positive.
${interests.length > 0 ? `7. Learner interests: ${interests.join(', ')} — connect chunks where natural.` : ''}

Respond with ONLY a JSON object with a "chunks" array. No markdown, no extra text.`;
}

/**
 * Build the chunk generation user prompt.
 * Mirrors AIPedagogyClient.generateChunksForTopic() user prompt.
 */
function buildChunkUserPrompt(
  targetLanguageName: string,
  nativeLanguageName: string,
  topic: string,
  chunkCount: number
): string {
  return `Generate ${chunkCount} ${targetLanguageName} chunks for the topic: "${topic}"

Return a JSON object with this exact structure:
{
  "chunks": [
    {
      "targetPhrase": "phrase in ${targetLanguageName}",
      "nativeTranslation": "translation in ${nativeLanguageName}",
      "exampleSentence": "short sentence using the phrase in ${targetLanguageName}",
      "usageNote": "when/how to use this phrase — in ${nativeLanguageName}",
      "explanation": "simple explanation for kids — in ${nativeLanguageName}",
      "distractors": ["wrong1 in ${nativeLanguageName}", "wrong2 in ${nativeLanguageName}", "wrong3 in ${nativeLanguageName}"],
      "correctUsageContext": "correct situation to use this phrase — in ${nativeLanguageName}",
      "wrongUsageContexts": ["wrong situation 1 in ${nativeLanguageName}", "wrong situation 2", "wrong situation 3"],
      "coachingText": "A friendly 1-2 sentence introduction in ${nativeLanguageName} that will be spoken by the NPC teacher."
    }
  ]
}

Return exactly ${chunkCount} chunks in the array. Nothing else.`;
}

// ============================================================================
// AI TEST CLIENT
// ============================================================================

/**
 * Direct HTTP client for AI provider calls in the test harness.
 * Every call is logged with provider, duration, and token usage.
 */
export class AITestClient {
  private configs: Record<ProviderKey, ProviderConfig>;

  constructor() {
    // Configs loaded at construction so env is already set
    this.configs = getProviderConfigs();
  }

  /**
   * Get list of available providers.
   * Excludes providers with no API key OR marked as experimental.
   * Experimental providers are preserved in config but skipped in runs.
   */
  getAvailableProviders(): ProviderKey[] {
    return (Object.keys(this.configs) as ProviderKey[]).filter(
      key => this.configs[key].apiKey.length > 0 && !this.configs[key].experimental
    );
  }

  /**
   * Check if a specific provider is available (has key and is not experimental).
   */
  isAvailable(provider: ProviderKey): boolean {
    const config = this.configs[provider];
    return config.apiKey.length > 0 && !config.experimental;
  }

  /**
   * Generate lesson chunk content using a specific provider.
   *
   * This is the core method — it calls the AI with the same prompt as
   * aiPedagogyClient.ts to generate chunks for assembly.
   *
   * @returns Array of GeneratedChunk objects + response metadata
   */
  async generateChunks(
    provider: ProviderKey,
    request: {
      targetLanguage: string;    // "German", "French"
      nativeLanguage: string;    // "English", "French"
      topic: string;             // "Greetings", "Food"
      level: string;             // "A1", "A2"
      interests: string[];       // ["music", "sports"]
      chunkCount: number;        // 3
      ageGroup: string;          // "11-14"
    }
  ): Promise<{
    chunks: GeneratedChunk[];
    responseTimeMs: number;
    rawResponse: string;
    parseSuccess: boolean;
    error?: string;
  }> {
    const config = this.configs[provider];
    if (!config.apiKey) {
      return {
        chunks: [],
        responseTimeMs: 0,
        rawResponse: '',
        parseSuccess: false,
        error: `Provider ${provider} has no API key configured`,
      };
    }

    const systemPrompt = buildChunkSystemPrompt(
      request.targetLanguage,
      request.nativeLanguage,
      request.ageGroup,
      request.chunkCount,
      request.interests
    );

    const userPrompt = buildChunkUserPrompt(
      request.targetLanguage,
      request.nativeLanguage,
      request.topic,
      request.chunkCount
    );

    logStep(`  🤖 [${provider}] Generating ${request.chunkCount} chunks: ${request.targetLanguage}/${request.nativeLanguage} - "${request.topic}"`);

    const start = Date.now();

    try {
      const rawResponse = await this.callProvider(provider, systemPrompt, userPrompt, 3000);
      const responseTimeMs = Date.now() - start;

      logStep(`  ⏱️  [${provider}] Response: ${responseTimeMs}ms`);

      // Parse response
      const { chunks, error } = this.parseChunksResponse(rawResponse, request.chunkCount);

      if (error) {
        logStep(`  ❌ [${provider}] Parse error: ${error}`);
        return { chunks: [], responseTimeMs, rawResponse, parseSuccess: false, error };
      }

      logStep(`  ✅ [${provider}] Parsed ${chunks.length} chunks`);

      return { chunks, responseTimeMs, rawResponse, parseSuccess: true };
    } catch (e) {
      const responseTimeMs = Date.now() - start;
      const error = (e as Error).message;
      logStep(`  ❌ [${provider}] Call failed after ${responseTimeMs}ms: ${error}`);
      return { chunks: [], responseTimeMs, rawResponse: '', parseSuccess: false, error };
    }
  }

  /**
   * Ask the help system a question about a specific activity.
   * Used in test 05 to validate help responses.
   */
  async requestHelp(
    provider: ProviderKey,
    context: {
      activityType: string;
      activityData: Record<string, unknown>;
      targetLanguage: string;
      nativeLanguage: string;
      userQuestion: string;
    }
  ): Promise<{ text: string; isBrokenQuestion: boolean; responseTimeMs: number }> {
    const config = this.configs[provider];
    if (!config.apiKey) {
      throw new Error(`Provider ${provider} has no API key`);
    }

    const systemPrompt = `You are a friendly language learning assistant helping a child understand a ${context.targetLanguage} lesson.
The child's native language is ${context.nativeLanguage}.

RULES:
1. Always respond in ${context.nativeLanguage} (the child's native language).
2. Be warm, encouraging, and age-appropriate.
3. CRITICAL: Do NOT state the correct answer or repeat any of the answer options verbatim.
   Instead, give ONLY hints: explain the grammar rule, give a memory tip, describe the context.
   Example of a BAD hint: "The answer is Good morning"
   Example of a GOOD hint: "Think about what time of day Guten Morgen is used — it has the word 'Morgen' in it!"
4. If the question itself appears to be broken/wrong/confusing (not a comprehension issue), set isBrokenQuestion to true.
5. If it's a valid question the child is struggling with, set isBrokenQuestion to false.

Always respond with JSON: {"text": "your help message", "isBrokenQuestion": boolean}`;

    const userPrompt = `The child is working on a ${context.activityType} activity.
Activity data: ${JSON.stringify(context.activityData)}
Child's question: "${context.userQuestion}"

Respond with JSON only.`;

    const start = Date.now();
    const rawResponse = await this.callProvider(provider, systemPrompt, userPrompt, 1000);
    const responseTimeMs = Date.now() - start;

    // Parse response
    try {
      let text = rawResponse.trim();
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) text = match[1].trim();
      const parsed = JSON.parse(text) as { text: string; isBrokenQuestion: boolean };
      return { text: parsed.text, isBrokenQuestion: parsed.isBrokenQuestion ?? false, responseTimeMs };
    } catch {
      return { text: rawResponse, isBrokenQuestion: false, responseTimeMs };
    }
  }

  // ── PROVIDER DISPATCH ─────────────────────────────────────────────────────

  /**
   * Call an AI provider and return the raw text response.
   * Handles both OpenAI-compatible and Anthropic message formats.
   */
  async callProvider(
    provider: ProviderKey,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    const config = this.configs[provider];

    // Apply rate limiting delay
    if (config.rateLimitDelayMs > 0) {
      await sleep(config.rateLimitDelayMs);
    }

    if (config.openAICompatible) {
      return this.callOpenAICompatible(config, systemPrompt, userPrompt, maxTokens);
    } else {
      return this.callAnthropic(config, systemPrompt, userPrompt, maxTokens);
    }
  }

  /**
   * Call an OpenAI-compatible endpoint (DeepInfra, Groq).
   */
  private async callOpenAICompatible(
    config: ProviderConfig,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    const body = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...(config.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 300)}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from provider');

    return content;
  }

  /**
   * Call the Anthropic Messages API.
   * Different format: system is top-level, not in messages array.
   */
  private async callAnthropic(
    config: ProviderConfig,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    const body = {
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    };

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...(config.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic HTTP ${response.status}: ${errorText.substring(0, 300)}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock?.text) throw new Error('Empty response from Anthropic');

    return textBlock.text;
  }

  // ── PARSING ───────────────────────────────────────────────────────────────

  /**
   * Parse the raw AI response into GeneratedChunk objects.
   * Mirrors the parsing logic in AIPedagogyClient.parseChunkContentResponse().
   */
  private parseChunksResponse(
    rawResponse: string,
    expectedCount: number
  ): { chunks: GeneratedChunk[]; error?: string } {
    let jsonStr = rawResponse.trim();

    // Strip markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let parsed: unknown[];

    try {
      const raw = JSON.parse(jsonStr) as unknown;
      if (Array.isArray(raw)) {
        parsed = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const arr = obj['chunks'] ?? obj['data'] ?? obj['items'] ?? null;
        if (Array.isArray(arr)) {
          parsed = arr;
        } else {
          return { chunks: [], error: 'No chunks array found in response' };
        }
      } else {
        return { chunks: [], error: 'Unexpected JSON structure' };
      }
    } catch (e) {
      return { chunks: [], error: `JSON parse error: ${(e as Error).message}` };
    }

    if (parsed.length === 0) {
      return { chunks: [], error: 'Empty chunks array' };
    }

    const chunks: GeneratedChunk[] = [];
    for (const item of parsed) {
      const chunk = this.validateChunk(item);
      if (chunk) chunks.push(chunk);
    }

    if (chunks.length === 0) {
      return { chunks: [], error: 'All chunks failed validation' };
    }

    if (chunks.length < expectedCount) {
      logStep(`  ⚠️  Only ${chunks.length}/${expectedCount} chunks passed validation`);
    }

    return { chunks };
  }

  /**
   * Validate a single raw chunk object. Returns null if invalid.
   */
  private validateChunk(raw: unknown): GeneratedChunk | null {
    if (!raw || typeof raw !== 'object') return null;

    const obj = raw as Record<string, unknown>;

    // Required fields
    const required = ['targetPhrase', 'nativeTranslation', 'distractors', 'correctUsageContext', 'wrongUsageContexts'];
    for (const field of required) {
      if (!obj[field]) return null;
    }

    // Validate arrays
    if (!Array.isArray(obj['distractors']) || (obj['distractors'] as unknown[]).length < 3) return null;
    if (!Array.isArray(obj['wrongUsageContexts']) || (obj['wrongUsageContexts'] as unknown[]).length < 3) return null;

    const distractors = obj['distractors'] as unknown[];
    const wrongContexts = obj['wrongUsageContexts'] as unknown[];

    return {
      targetPhrase: String(obj['targetPhrase']).trim(),
      nativeTranslation: String(obj['nativeTranslation']).trim(),
      exampleSentence: obj['exampleSentence'] ? String(obj['exampleSentence']).trim() : String(obj['targetPhrase']).trim(),
      usageNote: obj['usageNote'] ? String(obj['usageNote']).trim() : 'Use in conversation',
      explanation: obj['explanation'] ? String(obj['explanation']).trim() : `"${obj['targetPhrase']}" means "${obj['nativeTranslation']}"`,
      distractors: [
        String(distractors[0]).trim(),
        String(distractors[1]).trim(),
        String(distractors[2]).trim(),
      ],
      correctUsageContext: String(obj['correctUsageContext']).trim(),
      wrongUsageContexts: [
        String(wrongContexts[0]).trim(),
        String(wrongContexts[1]).trim(),
        String(wrongContexts[2]).trim(),
      ],
      coachingText: obj['coachingText'] ? String(obj['coachingText']).trim() : undefined,
    };
  }
}

/** Singleton AI test client */
export const aiTestClient = new AITestClient();
