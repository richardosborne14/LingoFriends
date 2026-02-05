/**
 * LingoFriends - Groq AI Service
 * 
 * Handles AI chat using Groq's Llama 3.3 70B model with streaming.
 * Replaces geminiService for main chat functionality.
 * 
 * @module groqService
 */

import type { UserProfile, ChatSession, Message, AIProfileField, TargetSubject } from '../types';
import { buildSystemPrompt } from './systemPrompts';
import { filterResponse, sanitizeUserInput } from './contentFilter';

// ============================================
// CONFIGURATION
// ============================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // ms between requests

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
 * Includes theme and learned facts about the user.
 */
export interface ConversationContext {
  /** Current theme/interest for this learning session */
  currentTheme?: string | null;
  /** AI-learned facts about the user for personalization */
  aiProfileFields?: AIProfileField[];
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

/**
 * Sleep helper for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRateLimit = (error as { status?: number })?.status === 429;
      
      if (i < maxRetries - 1) {
        const delay = isRateLimit ? baseDelay * Math.pow(2, i + 1) : baseDelay * Math.pow(2, i);
        console.log(`[Groq] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Generate AI response (non-streaming)
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
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  // Build system prompt with theme and AI profile context
  const systemPrompt = buildSystemPrompt({
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    ageGroup: profile.ageGroup,
    sessionType: session.type,
    lessonTitle: session.title,
    lessonObjectives: session.objectives,
    currentDraft: session.draft,
    // NEW: Pass subject, theme, and AI profile fields for personalization
    targetSubject: profile.targetSubject,
    currentTheme: context?.currentTheme || undefined,
    aiProfileFields: context?.aiProfileFields || [],
  });

  // Convert message history
  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...convertMessages(session.messages),
    { role: 'user', content: `Profile: ${JSON.stringify(profile)}\n\nUser: ${sanitizedMessage}` },
  ];

  // Make API call with retry
  const response = await retryWithBackoff(async () => {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw Object.assign(new Error(error.message || 'Groq API error'), { status: res.status });
    }

    return res.json() as Promise<GroqResponse>;
  });

  const fullText = response.choices[0]?.message?.content || '';
  
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
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  const systemPrompt = buildSystemPrompt({
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    ageGroup: profile.ageGroup,
    sessionType: session.type,
    lessonTitle: session.title,
    lessonObjectives: session.objectives,
    currentDraft: session.draft,
  });

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...convertMessages(session.messages),
    { role: 'user', content: `Profile: ${JSON.stringify(profile)}\n\nUser: ${sanitizedMessage}` },
  ];

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              callbacks.onToken(token);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    // Filter final content
    const filtered = filterResponse(fullText);
    callbacks.onComplete(filtered.text);
    
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Detect the language of text using Groq AI.
 * Uses a fast, small model for quick detection.
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

export default {
  generateResponse,
  generateResponseStream,
  detectLanguageWithAI,
};
