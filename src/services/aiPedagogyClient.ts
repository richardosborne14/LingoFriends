/**
 * LingoFriends - AI Pedagogy Client
 * 
 * A specialized AI client for the Pedagogy Engine that handles:
 * - Lesson generation with pedagogical context
 * - Structured JSON responses for activities
 * - Retry logic and error handling
 * - Content safety filtering
 * 
 * This client wraps the Groq API with pedagogical awareness,
 * ensuring that generated content follows:
 * - Lexical Approach (chunks, not isolated words)
 * - Krashen's Input Hypothesis (i+1 difficulty)
 * - Affective Filter awareness
 * - Language Coaching style
 * 
 * @module aiPedagogyClient
 * @see docs/phase-1.2/task-1.2-8-lesson-generator-v2.md
 */

import type {
  LexicalChunk,
  GameActivityType,
  CEFRSubLevel,
} from '../types/pedagogy';
import type { GeneratedChunkContent } from './lessonAssembler';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Rate limiting */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // ms between requests

/** Maximum retries for failed API calls */
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second base delay for retries

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for pedagogical content generation.
 * Includes all the information needed for i+1 targeting.
 */
export interface PedagogyContext {
  /** Target language being learned */
  targetLanguage: string;
  
  /** Native language of the learner */
  nativeLanguage: string;
  
  /** Current learner level (i) */
  currentLevel: number;
  
  /** Target level for new content (i+1) */
  targetLevel: number;
  
  /** Chunks the learner already knows (for scaffolding) */
  familiarChunks: LexicalChunk[];
  
  /** New chunks to introduce */
  targetChunks: LexicalChunk[];
  
  /** Chunks to review (fragile from SRS) */
  reviewChunks: LexicalChunk[];
  
  /** Learner interests for personalization */
  interests: string[];
  
  /** Age group for content appropriateness */
  ageGroup: '7-10' | '11-14' | '15-18';
  
  /** Affective filter risk score (0-1) */
  filterRiskScore: number;
  
  /** Any specific focus areas or struggles */
  focusAreas?: string[];
}

/**
 * Request to generate a lesson.
 */
export interface LessonGenerationRequest {
  /** Pedagogical context */
  context: PedagogyContext;
  
  /** Activity types to include */
  activityTypes: GameActivityType[];
  
  /** Number of activities to generate */
  activityCount: number;
  
  /** Session topic/theme */
  topic: string;
  
  /** Desired difficulty level for activities (1-5) */
  difficultyLevel: number;
}

/**
 * A generated activity from the AI.
 */
export interface GeneratedActivity {
  /** Unique identifier */
  id: string;
  
  /** Type of activity */
  type: GameActivityType;
  
  /** Primary chunk being taught/tested */
  focusChunkId: string;
  
  /** All chunk IDs involved in this activity */
  chunkIds: string[];
  
  /** Activity-specific data */
  data: ActivityData;
  
  /** Difficulty level (1-5) */
  difficulty: number;
  
  /** Tutor introduction text */
  tutorText: string;
  
  /** Help text shown when user is stuck */
  helpText: string;
  
  /** Sun Drops reward value */
  sunDrops: number;
}

/**
 * Activity-specific data structures.
 */
export interface ActivityData {
  // Multiple choice
  question?: string;
  options?: string[];
  correctIndex?: number;
  
  // Fill blank
  sentence?: string;
  blank?: string;
  correctAnswer?: string;
  
  // Matching
  pairs?: Array<{ left: string; right: string }>;
  
  // Translate
  sourceText?: string;
  acceptedAnswers?: string[];
  
  // True/False
  statement?: string;
  isTrue?: boolean;
  
  // Word arrange
  words?: string[];
  correctOrder?: string;
}

/**
 * A complete generated lesson.
 */
export interface GeneratedLesson {
  /** Unique identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Description for learner */
  description: string;
  
  /** Opening message from Professor Finch */
  intro: string;
  
  /** Transition messages between activities */
  transitions: string[];
  
  /** Closing message after all activities */
  conclusion: string;
  
  /** All activities in order */
  activities: GeneratedActivity[];
  
  /** IDs of chunks introduced in this lesson */
  newChunkIds: string[];
  
  /** IDs of chunks reviewed in this lesson */
  reviewChunkIds: string[];
  
  /** Total Sun Drops available */
  totalSunDrops: number;
}

/**
 * Response from the Groq API.
 */
interface GroqResponse {
  id: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep helper for rate limiting and retries.
 */
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Generate a unique ID for activities.
 */
function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retry with exponential backoff.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      const isRateLimit = (error as { status?: number })?.status === 429;
      const delay = isRateLimit 
        ? baseDelay * Math.pow(2, attempt + 1)  // Longer delay for rate limits
        : baseDelay * Math.pow(2, attempt);
      
      console.warn(`[AIPedagogyClient] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// ============================================================================
// MAIN CLIENT CLASS
// ============================================================================

/**
 * AI Pedagogy Client
 * 
 * Handles AI generation for pedagogical content with:
 * - Proper pedagogy context injection
 * - Structured JSON output
 * - Error handling and retries
 * - Content safety
 */
export class AIPedagogyClient {
  
  /**
   * Generate chunk content for a topic.
   *
   * The AI generates ONLY pedagogical content:
   *   - Target phrases with native-language translations
   *   - Example sentences and usage notes
   *   - Plausible distractors (ALWAYS in the native language)
   *   - Correct and wrong usage contexts (in the native language)
   *
   * The AI does NOT generate activities, ActivityConfig, or any UI structure.
   * Activity assembly happens in lessonAssembler.ts.
   *
   * @param params - Topic, language info, and learner context
   * @returns Array of GeneratedChunkContent objects ready for lessonAssembler
   */
  async generateChunksForTopic(params: {
    topic: string;
    targetLanguageCode: string;
    nativeLanguageCode: string;
    targetLanguageName: string;
    nativeLanguageName: string;
    chunkCount: number;
    ageGroup: '7-10' | '11-14' | '15-18';
    interests: string[];
    existingChunks?: string[];
  }): Promise<GeneratedChunkContent[]> {
    const systemPrompt = `You are a language education content creator for children.
Your job is to generate vocabulary content for a ${params.targetLanguageName} lesson.
The learner's native language is ${params.nativeLanguageName}.
Age group: ${params.ageGroup}.

STRICT RULES:
1. Generate exactly ${params.chunkCount} lexical chunks (whole phrases, not isolated words).
2. All chunks (targetPhrase, exampleSentence) must be in ${params.targetLanguageName}.
3. ALL translations, explanations, usageNotes, and distractors MUST be in ${params.nativeLanguageName}.
4. Distractors MUST be plausible but clearly wrong. They MUST be in ${params.nativeLanguageName} — NEVER in ${params.targetLanguageName}.
5. Usage contexts (correctUsageContext, wrongUsageContexts) MUST be in ${params.nativeLanguageName}.
6. Keep content age-appropriate, encouraging, and positive.
${params.interests.length > 0 ? `7. Learner interests: ${params.interests.join(', ')} — connect chunks where natural.` : ''}
${params.existingChunks?.length ? `8. Do NOT repeat these phrases: ${params.existingChunks.join(', ')}` : ''}

Respond with ONLY a JSON object with a "chunks" array. No markdown, no extra text.`;

    const userPrompt = `Generate ${params.chunkCount} ${params.targetLanguageName} chunks for the topic: "${params.topic}"

Return a JSON object with this exact structure:
{
  "chunks": [
    {
      "targetPhrase": "phrase in ${params.targetLanguageName}",
      "nativeTranslation": "translation in ${params.nativeLanguageName}",
      "exampleSentence": "short sentence using the phrase in ${params.targetLanguageName}",
      "usageNote": "when/how to use this phrase — in ${params.nativeLanguageName}",
      "explanation": "simple explanation for kids — in ${params.nativeLanguageName}",
      "distractors": ["wrong1 in ${params.nativeLanguageName}", "wrong2 in ${params.nativeLanguageName}", "wrong3 in ${params.nativeLanguageName}"],
      "correctUsageContext": "correct situation to use this phrase — in ${params.nativeLanguageName}",
      "wrongUsageContexts": ["wrong situation 1 in ${params.nativeLanguageName}", "wrong situation 2", "wrong situation 3"]
    }
  ]
}

Return exactly ${params.chunkCount} chunks in the array. Nothing else.`;

    console.log(`[AIPedagogyClient] Generating ${params.chunkCount} chunks for topic: "${params.topic}"`);

    const response = await this.callGroq(systemPrompt, userPrompt, 3000);
    return this.parseChunkContentResponse(response, params.chunkCount);
  }

  /**
   * Parse and validate chunk content from an AI response.
   *
   * Handles both:
   *   { "chunks": [...] }  — preferred format
   *   [...]                — bare array (legacy)
   *
   * Invalid chunks are skipped with a warning. If ALL chunks fail
   * validation, throws an Error so the caller can fall back.
   *
   * @param content - Raw string from Groq
   * @param expectedCount - How many chunks we asked for (for logging)
   * @returns Array of validated GeneratedChunkContent objects
   */
  private parseChunkContentResponse(
    content: string,
    expectedCount: number
  ): GeneratedChunkContent[] {
    let jsonStr = content.trim();

    // Strip markdown fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: unknown[];
    try {
      const raw: unknown = JSON.parse(jsonStr);
      if (Array.isArray(raw)) {
        // Bare array
        parsed = raw;
      } else if (raw && typeof raw === 'object') {
        // { "chunks": [...] } or { "data": [...] }
        const obj = raw as Record<string, unknown>;
        const arr = obj['chunks'] ?? obj['data'] ?? obj['items'] ?? null;
        if (Array.isArray(arr)) {
          parsed = arr;
        } else {
          throw new Error('Could not find a chunks array in the response object');
        }
      } else {
        throw new Error('Unexpected JSON structure from AI');
      }
    } catch (e) {
      console.error('[AIPedagogyClient] Failed to parse chunk JSON:', e);
      console.error('[AIPedagogyClient] Raw response:', content.substring(0, 500));
      throw new Error('AI returned invalid JSON for chunk content');
    }

    if (parsed.length === 0) {
      throw new Error('AI returned an empty chunks array');
    }

    // Validate each chunk — skip bad ones, warn loudly
    const validated: GeneratedChunkContent[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const chunk = this.validateChunkContent(parsed[i], i + 1);
      if (chunk) {
        validated.push(chunk);
      }
    }

    if (validated.length === 0) {
      throw new Error('All AI-generated chunks failed validation — cannot build lesson');
    }

    if (validated.length < expectedCount) {
      console.warn(
        `[AIPedagogyClient] Only ${validated.length}/${expectedCount} chunks passed validation`
      );
    }

    console.log(`[AIPedagogyClient] ✅ ${validated.length} chunks validated`);
    return validated;
  }

  /**
   * Validate a single raw chunk object from the AI.
   *
   * Returns null (with a console.warn) if required fields are missing.
   * Attempts to salvage non-critical missing fields with safe defaults.
   *
   * @param raw - The raw parsed object
   * @param index - 1-based position for logging
   * @returns Validated GeneratedChunkContent or null
   */
  private validateChunkContent(raw: unknown, index: number): GeneratedChunkContent | null {
    if (!raw || typeof raw !== 'object') {
      console.warn(`[AIPedagogyClient] Chunk ${index}: not an object`);
      return null;
    }

    const obj = raw as Record<string, unknown>;

    // Critical fields — cannot salvage
    const criticalFields = ['targetPhrase', 'nativeTranslation', 'distractors', 'correctUsageContext', 'wrongUsageContexts'];
    for (const field of criticalFields) {
      if (!obj[field]) {
        console.warn(`[AIPedagogyClient] Chunk ${index}: missing critical field "${field}"`, obj);
        return null;
      }
    }

    // Validate array fields
    if (!Array.isArray(obj['distractors']) || (obj['distractors'] as unknown[]).length < 3) {
      console.warn(`[AIPedagogyClient] Chunk ${index}: distractors must be array of 3`);
      return null;
    }
    if (!Array.isArray(obj['wrongUsageContexts']) || (obj['wrongUsageContexts'] as unknown[]).length < 3) {
      console.warn(`[AIPedagogyClient] Chunk ${index}: wrongUsageContexts must be array of 3`);
      return null;
    }

    const targetPhrase = String(obj['targetPhrase']).trim();
    const nativeTranslation = String(obj['nativeTranslation']).trim();

    // Salvageable optional fields
    const exampleSentence = obj['exampleSentence'] ? String(obj['exampleSentence']).trim() : targetPhrase;
    const usageNote = obj['usageNote'] ? String(obj['usageNote']).trim() : 'Use in conversation';
    const explanation = obj['explanation'] ? String(obj['explanation']).trim() : `"${targetPhrase}" means "${nativeTranslation}"`;

    const distractors = obj['distractors'] as unknown[];
    const wrongUsageContexts = obj['wrongUsageContexts'] as unknown[];

    return {
      targetPhrase,
      nativeTranslation,
      exampleSentence,
      usageNote,
      explanation,
      distractors: [
        String(distractors[0]).trim(),
        String(distractors[1]).trim(),
        String(distractors[2]).trim(),
      ],
      correctUsageContext: String(obj['correctUsageContext']).trim(),
      wrongUsageContexts: [
        String(wrongUsageContexts[0]).trim(),
        String(wrongUsageContexts[1]).trim(),
        String(wrongUsageContexts[2]).trim(),
      ],
    };
  }

  // ============================================================================
  // DEPRECATED METHODS — kept for backward compatibility, do not use in new code
  // ============================================================================

  /**
   * @deprecated Use generateChunksForTopic() + lessonAssembler instead.
   * This method asks the AI to generate full activity JSON which frequently
   * produces wrong field names, missing fields, and language errors.
   * It will be removed in a future refactor.
   *
   * @param request - Lesson generation request
   * @returns Generated lesson with activities
   */
  async generateLesson(request: LessonGenerationRequest): Promise<GeneratedLesson> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildLessonPrompt(request);
    
    const response = await this.callGroq(systemPrompt, userPrompt, 4000);
    const lesson = this.parseLessonResponse(response, request);
    
    return lesson;
  }
  
  /**
   * Generate a single activity for a chunk.
   * 
   * Useful for dynamic activity generation during a session.
   * 
   * @param chunk - The chunk to create an activity for
   * @param type - Type of activity to generate
   * @param context - Pedagogical context
   * @returns Generated activity
   */
  async generateActivity(
    chunk: LexicalChunk,
    type: GameActivityType,
    context: PedagogyContext
  ): Promise<GeneratedActivity> {
    const systemPrompt = this.buildSystemPrompt({ 
      context, 
      activityTypes: [type], 
      activityCount: 1,
      topic: 'single activity',
      difficultyLevel: chunk.difficulty,
    });
    const userPrompt = this.buildActivityPrompt(chunk, type, context);
    
    const response = await this.callGroq(systemPrompt, userPrompt, 1000);
    const activity = this.parseActivityResponse(response, chunk, type);
    
    return activity;
  }
  
  /**
   * Build the system prompt with pedagogical context.
   */
  private buildSystemPrompt(request: LessonGenerationRequest): string {
    const { context, difficultyLevel } = request;
    
    return `## Persona
You are Professor Finch, a warm, encouraging language coach who helps learners discover language naturally through meaningful chunks.

## Teaching Philosophy

### Lexical Approach (Michael Lewis)
- Always teach language in chunks, never as isolated words
- Focus on phrases learners can use immediately
- Highlight patterns within chunks, not grammar rules
- Use sentence frames to show flexibility: "I'd like ___" (a coffee, the salad, the check)

### Input Hypothesis (Stephen Krashen)
- Pitch content at i+1: just above current level
- Current learner level: ${context.currentLevel} → Target: ${context.targetLevel}
- Surround new chunks with familiar context (comprehensible input)
- Don't introduce too many new chunks at once (2-3 per activity)
- Focus on meaning over form

### Affective Filter
- Keep the emotional barrier LOW
- Celebrate every attempt
- Never make learners feel wrong
- Current filter risk: ${context.filterRiskScore < 0.3 ? 'Low' : context.filterRiskScore < 0.6 ? 'Medium' : 'High'} - ${context.filterRiskScore > 0.5 ? 'SIMPLIFY content' : 'Normal difficulty'}
- If struggling, simplify; if excelling, challenge

### Language Coaching
- Help learners discover patterns themselves
- Ask reflective questions: "What do you notice about...?"
- Connect to their interests: ${context.interests.slice(0, 3).join(', ')}
- Build confidence and autonomy

## Content Rules

1. **Chunks, not words**
   - "I would like a coffee" not "would" + "like" + "coffee"
   - Teach whole phrases with natural translations

2. **i+1 Calibration**
   - Difficulty level: ${difficultyLevel}/5
   - Introduce 1-2 new chunks per activity
   - Surround with familiar chunks for context

3. **Context First**
   - Present chunks in meaningful situations
   - Use scenarios related to learner's interests
   - Connect to real-world use

4. **Activity Types**
   - multiple_choice: 4 options, one correct (2-3 SunDrops)
   - fill_blank: Complete sentence with missing chunk (2-3 SunDrops)
   - matching: Match 4 terms to definitions (3-4 SunDrops)
   - translate: Type translation of phrase (3 SunDrops)
   - true_false: Is statement correct? (1-2 SunDrops)
   - word_arrange: Arrange scrambled words into sentence (3 SunDrops)

5. **Safety**
   - Age group: ${context.ageGroup}
   - NO violence, scary themes, or romantic content
   - Positive, encouraging tone always
   - Age-appropriate vocabulary

## Response Format

You MUST respond with valid JSON matching this structure:
{
  "title": "Lesson title",
  "description": "Brief description for learner",
  "intro": "Professor Finch's opening message",
  "activities": [...],
  "transitions": ["Transition 1", "Transition 2", ...],
  "conclusion": "Summary and encouragement"
}`;
  }
  
  /**
   * Build the user prompt for lesson generation.
   */
  private buildLessonPrompt(request: LessonGenerationRequest): string {
    const { context, activityTypes, activityCount, topic } = request;
    
    // Format chunks for the prompt
    const formatChunks = (chunks: LexicalChunk[], label: string) => {
      if (chunks.length === 0) return `No ${label}`;
      return chunks.map(c => 
        `- "${c.text}" = "${c.translation}" (difficulty: ${c.difficulty})`
      ).join('\n');
    };
    
    return `Create a lesson for learning ${context.targetLanguage} (${context.nativeLanguage} speaker).

**Topic:** ${topic}

**NEW CHUNKS TO TEACH (Focus on these):**
${formatChunks(context.targetChunks, 'new chunks')}

**REVIEW CHUNKS (Reinforce these):**
${formatChunks(context.reviewChunks, 'review chunks')}

**FAMILIAR CHUNKS (Use for context/scaffolding):**
${formatChunks(context.familiarChunks, 'familiar chunks')}

**Lesson Requirements:**
- ${activityCount} activities
- Activity types to use: ${activityTypes.join(', ')}
- Difficulty: ${request.difficultyLevel}/5
- Age group: ${context.ageGroup}
- Include a mix of new chunks and review
- Start with easier activities, progress to harder ones
- Total SunDrops should be 15-25

**Activity JSON structure:**
{
  "type": "multiple_choice|fill_blank|matching|translate|true_false|word_arrange",
  "focusChunkId": "id of main chunk",
  "chunkIds": ["array of chunk ids used"],
  "difficulty": 1-5,
  "tutorText": "Friendly intro to the activity",
  "helpText": "Hint when stuck",
  "sunDrops": 1-4,
  "data": { /* activity-specific fields */ }
}

Generate the complete lesson as JSON now.`;
  }
  
  /**
   * Build prompt for a single activity.
   */
  private buildActivityPrompt(
    chunk: LexicalChunk,
    type: GameActivityType,
    context: PedagogyContext
  ): string {
    // Get some familiar chunks for distractors
    const familiarTexts = context.familiarChunks
      .slice(0, 3)
      .map(c => c.text)
      .join(', ');
    
    return `Create a ${type} activity for this chunk:

**Target Chunk:**
- Text: "${chunk.text}"
- Translation: "${chunk.translation}"
- Type: ${chunk.chunkType}
- Difficulty: ${chunk.difficulty}

**Familiar chunks for context/distractors:**
${familiarTexts || 'None available'}

**Requirements:**
- Activity type: ${type}
- Age group: ${context.ageGroup}
- Difficulty: ${chunk.difficulty}/5
- Include tutorText (friendly intro) and helpText (hint)
- SunDrops: ${type === 'true_false' ? '1-2' : type === 'matching' ? '3-4' : '2-3'}

Generate a single activity as JSON:
{
  "type": "${type}",
  "focusChunkId": "${chunk.id}",
  "chunkIds": ["${chunk.id}"],
  "difficulty": ${chunk.difficulty},
  "tutorText": "...",
  "helpText": "...",
  "sunDrops": 2,
  "data": { /* appropriate for type */ }
}`;
  }
  
  /**
   * Call Groq API with retry logic.
   */
  private async callGroq(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4000
  ): Promise<string> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();
    
    return retryWithBackoff(async () => {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const apiError = new Error(`Groq API error: ${response.status}`);
        (apiError as any).status = response.status;
        (apiError as any).details = error;
        throw apiError;
      }
      
      const data = await response.json() as GroqResponse;
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response content from Groq');
      }
      
      return content;
    });
  }
  
  /**
   * Parse the lesson response from AI.
   */
  private parseLessonResponse(
    content: string,
    request: LessonGenerationRequest
  ): GeneratedLesson {
    try {
      // Parse JSON
      let jsonStr = content.trim();
      
      // Handle markdown code blocks
      const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Build the lesson
      const activities: GeneratedActivity[] = (parsed.activities || []).map(
        (act: any, index: number) => this.parseActivity(act, index, request.context)
      );
      
      // Calculate total SunDrops
      const totalSunDrops = activities.reduce((sum, act) => sum + act.sunDrops, 0);
      
      // Extract chunk IDs
      const newChunkIds = [
        ...new Set(
          activities
            .filter(act => request.context.targetChunks.some(c => c.id === act.focusChunkId))
            .map(act => act.focusChunkId)
        )
      ];
      
      const reviewChunkIds = [
        ...new Set(
          activities
            .filter(act => request.context.reviewChunks.some(c => c.id === act.focusChunkId))
            .map(act => act.focusChunkId)
        )
      ];
      
      return {
        id: `lesson_${Date.now()}`,
        title: parsed.title || 'Learning Session',
        description: parsed.description || '',
        intro: parsed.intro || "Let's learn something new!",
        transitions: parsed.transitions || [],
        conclusion: parsed.conclusion || 'Great work!',
        activities,
        newChunkIds,
        reviewChunkIds,
        totalSunDrops,
      };
      
    } catch (error) {
      console.error('[AIPedagogyClient] Failed to parse lesson response:', error);
      throw new Error('Invalid lesson response format from AI');
    }
  }
  
  /**
   * Parse a single activity from AI response.
   */
  private parseActivity(
    act: any,
    index: number,
    context: PedagogyContext
  ): GeneratedActivity {
    const type = this.validateActivityType(act.type);
    
    return {
      id: generateId(),
      type,
      focusChunkId: act.focusChunkId || '',
      chunkIds: act.chunkIds || [act.focusChunkId].filter(Boolean),
      difficulty: Math.max(1, Math.min(5, act.difficulty || 2)),
      tutorText: act.tutorText || "Let's try this!",
      helpText: act.helpText || "Take your time and think about it.",
      sunDrops: Math.max(1, Math.min(4, act.sunDrops || 2)),
      data: this.parseActivityData(act.data || act, type),
    };
  }
  
  /**
   * Parse activity response for single activity generation.
   */
  private parseActivityResponse(
    content: string,
    chunk: LexicalChunk,
    expectedType: GameActivityType
  ): GeneratedActivity {
    try {
      let jsonStr = content.trim();
      const jsonBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1];
      }
      
      const act = JSON.parse(jsonStr);
      const type = this.validateActivityType(act.type);
      
      return {
        id: generateId(),
        type,
        focusChunkId: chunk.id,
        chunkIds: act.chunkIds || [chunk.id],
        difficulty: Math.max(1, Math.min(5, act.difficulty || chunk.difficulty)),
        tutorText: act.tutorText || "Let's try this!",
        helpText: act.helpText || "Take your time and think about it.",
        sunDrops: Math.max(1, Math.min(4, act.sunDrops || 2)),
        data: this.parseActivityData(act.data || act, type),
      };
      
    } catch (error) {
      console.error('[AIPedagogyClient] Failed to parse activity response:', error);
      throw new Error('Invalid activity response format from AI');
    }
  }
  
  /**
   * Parse activity-specific data.
   */
  private parseActivityData(data: any, type: GameActivityType): ActivityData {
    switch (type) {
      case 'multiple_choice':
        return {
          question: data.question || '',
          options: data.options || [],
          correctIndex: typeof data.correctIndex === 'number' ? data.correctIndex : 0,
        };
        
      case 'fill_blank':
        return {
          sentence: data.sentence || data.template || '',
          blank: data.blank || '___',
          correctAnswer: data.correctAnswer || data.answer || '',
        };
        
      case 'matching':
        return {
          pairs: data.pairs || [],
        };
        
      case 'translate':
        return {
          sourceText: data.sourceText || data.source || '',
          acceptedAnswers: data.acceptedAnswers || [data.correctAnswer].filter(Boolean),
        };
        
      case 'true_false':
        return {
          statement: data.statement || data.question || '',
          isTrue: typeof data.isTrue === 'boolean' ? data.isTrue : false,
        };
        
      case 'word_arrange':
        return {
          words: data.words || data.scrambledWords || [],
          correctOrder: data.correctOrder || data.targetSentence || '',
        };
        
      default:
        return {};
    }
  }
  
  /**
   * Validate and normalize activity type.
   */
  private validateActivityType(type: string): GameActivityType {
    const validTypes: GameActivityType[] = [
      'multiple_choice',
      'fill_blank',
      'matching',
      'translate',
      'true_false',
      'word_arrange',
    ];
    
    const normalized = type?.toLowerCase().trim();
    
    if (validTypes.includes(normalized as GameActivityType)) {
      return normalized as GameActivityType;
    }
    
    // Default to multiple choice if invalid
    console.warn(`[AIPedagogyClient] Invalid activity type "${type}", defaulting to multiple_choice`);
    return 'multiple_choice';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of the AI Pedagogy Client */
export const aiPedagogyClient = new AIPedagogyClient();

export default aiPedagogyClient;