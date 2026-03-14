/**
 * LingoFriends - Groq AI Service
 * 
 * Handles AI chat using provider abstraction with Groq as fallback.
 * Speech-to-text (Whisper) and language detection still use Groq directly.
 * 
 * @module groqService
 */

import type { UserProfile, ChatSession, Message, AIProfileField, CompletedLessonSummary } from '../types';
import { buildSystemPrompt } from './systemPrompts';
import { filterResponse, sanitizeUserInput } from './contentFilter';
import { aiProviderService } from '../src/services/ai';

// ============================================
// CONFIGURATION
// ============================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ============================================
// TYPES
// ============================================

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  id: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Additional context for AI conversations.
 * Includes theme, learned facts, and completed lesson history
 * so the AI can build on prior learning instead of repeating.
 */
export interface ConversationContext {
  /** Current theme/interest for this learning session */
  currentTheme?: string | null;
  /** AI-learned facts about the user for personalization */
  aiProfileFields?: AIProfileField[];
  /** Completed lessons so AI can build on prior learning */
  completedLessons?: CompletedLessonSummary[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert app messages to Groq format
 */
function convertMessages(messages: Message[], limit = 15): GroqMessage[] {
  return messages
    .filter(m => !m.isHidden)
    .slice(-limit)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text,
    }));
}

/**
 * Extract JSON actions from AI response
 * Returns any[] to match geminiService signature for compatibility
 */
function extractActions(text: string): { text: string; actions: any[] } {
  let textContent = text;
  let actions: any[] = [];
  let jsonString = '';

  // Try markdown code block first
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    jsonString = jsonBlockMatch[1];
    textContent = text.replace(jsonBlockMatch[0], '').trim();
  } else {
    // Fallback: Look for raw JSON at the end
    const match = text.match(/(\{|\[)\s*"?action"?/);
    if (match && match.index !== undefined) {
      jsonString = text.substring(match.index);
      textContent = text.substring(0, match.index).trim();
    }
  }

  if (jsonString) {
    jsonString = jsonString.trim();
    try {
      const parsed = JSON.parse(jsonString);
      actions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Try fixing concatenated objects
      try {
        const fixed = '[' + jsonString.replace(/}\s*{/g, '},{') + ']';
        actions = JSON.parse(fixed);
      } catch {
        console.warn('[Groq] Failed to parse JSON actions');
      }
    }
  }

  return { text: textContent, actions };
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Generate AI response using the provider abstraction.
 * Falls back through DeepInfra -> Groq -> Anthropic automatically.
 * 
 * Drop-in replacement for geminiService.generateResponse
 * 
 * @param session - Current chat session
 * @param profile - User profile
 * @param userMessage - User's message text
 * @param context - Optional additional context (theme, AI profile fields)
 */
export async function generateResponse(
  session: ChatSession,
  profile: UserProfile,
  userMessage: string,
  context?: ConversationContext
): Promise<{ text: string; actions: any[] }> {
  // Sanitize input
  const sanitizedMessage = sanitizeUserInput(userMessage);

  // Build system prompt with theme, AI profile, and completed lessons context
  const systemPrompt = buildSystemPrompt({
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    ageGroup: profile.ageGroup,
    sessionType: session.type,
    lessonTitle: session.title,
    lessonObjectives: session.objectives,
    currentDraft: session.draft,
    targetSubject: profile.targetSubject,
    currentTheme: context?.currentTheme || undefined,
    aiProfileFields: context?.aiProfileFields || [],
    completedLessons: context?.completedLessons || [],
  });

  // Convert message history
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...convertMessages(session.messages),
    { role: 'user' as const, content: `Profile: ${JSON.stringify(profile)}\n\nUser: ${sanitizedMessage}` },
  ];

  // Use AI provider service (handles fallback automatically)
  const result = await aiProviderService.complete({
    messages,
    temperature: 0.7,
    maxTokens: 1024,
  });

  const fullText = result.text;
  
  // Extract actions and filter content
  const { text, actions } = extractActions(fullText);
  const filtered = filterResponse(text);
  
  return { text: filtered.text, actions };
}

/**
 * Generate AI response with streaming
 * For real-time character-by-character display
 */
export async function generateResponseStream(
  session: ChatSession,
  profile: UserProfile,
  userMessage: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const sanitizedMessage = sanitizeUserInput(userMessage);

  const systemPrompt = buildSystemPrompt({
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    ageGroup: profile.ageGroup,
    sessionType: session.type,
    lessonTitle: session.title,
    lessonObjectives: session.objectives,
    currentDraft: session.draft,
  });

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...convertMessages(session.messages),
    { role: 'user' as const, content: `Profile: ${JSON.stringify(profile)}\n\nUser: ${sanitizedMessage}` },
  ];

  try {
    await aiProviderService.stream(
      {
        messages,
        temperature: 0.7,
        maxTokens: 1024,
      },
      {
        onToken: callbacks.onToken,
        onComplete: (fullText) => {
          const filtered = filterResponse(fullText);
          callbacks.onComplete(filtered.text);
        },
        onError: callbacks.onError,
      }
    );
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

// ============================================
// LANGUAGE DETECTION (Still uses Groq directly)
// ============================================

/**
 * Detect the language of text using Groq AI.
 * Uses a fast, small model for quick detection.
 * 
 * Note: This keeps using Groq directly as it needs a specific fast model.
 * 
 * @param text - Text to analyze (will use first 200 chars)
 * @returns ISO language code or 'en' as fallback
 */
export async function detectLanguageWithAI(text: string): Promise<string> {
  if (!text || text.length < 3) {
    return 'en';
  }
  
  // Use only first 200 chars for speed and cost
  const sample = text.slice(0, 200);
  
  // Check if Groq key is available
  if (!GROQ_API_KEY) {
    console.warn('[Groq] No API key for language detection, using fallback');
    return 'en';
  }
  
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast, small model for detection
        messages: [
          {
            role: 'system',
            content: 'You are a language detector. Respond with ONLY the ISO 639-1 two-letter language code (e.g., en, fr, de, es, it). Nothing else.'
          },
          {
            role: 'user',
            content: `Detect the language: "${sample}"`
          }
        ],
        temperature: 0,
        max_tokens: 5,
      }),
    });

    if (!res.ok) {
      console.warn('[Groq] Language detection failed, using fallback');
      return 'en';
    }

    const data = await res.json() as GroqResponse;
    const detected = data.choices[0]?.message?.content?.trim().toLowerCase().slice(0, 2);
    
    // Validate it's a known language code
    const validCodes = ['en', 'fr', 'de', 'es', 'it', 'pt', 'zh', 'ja', 'ko', 'ru'];
    if (detected && validCodes.includes(detected)) {
      console.log(`[Groq] Detected language: ${detected}`);
      return detected;
    }
    
    return 'en';
  } catch (error) {
    console.error('[Groq] Language detection error:', error);
    return 'en';
  }
}

/**
 * Check if the AI provider service is ready.
 * Returns true if at least one provider is available.
 */
export function isProviderReady(): boolean {
  return aiProviderService.isReady();
}

/**
 * Get information about available AI providers.
 */
export function getProviderInfo(): Array<{ id: string; name: string; available: boolean; description: string }> {
  return aiProviderService.getProviderInfo();
}

export default {
  generateResponse,
  generateResponseStream,
  detectLanguageWithAI,
  isProviderReady,
  getProviderInfo,
};