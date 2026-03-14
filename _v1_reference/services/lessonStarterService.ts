/**
 * LingoFriends - Lesson Starter Service
 * 
 * Generates personalized AI conversation starters based on:
 * - Subject (English, German, Maths, etc.)
 * - Theme (user's selected interest like K-pop, Gaming, etc.)
 * - User's profile (native language, age group, known facts)
 * 
 * This service creates the opening message when a user clicks
 * "Start Learning" from the LearningLauncher component.
 * 
 * @module services/lessonStarterService
 */

import type { 
  UserProfile, 
  AIProfileField, 
  NativeLanguage, 
  AgeGroup, 
  CEFRLevel,
  TargetSubject 
} from '../types';

// ============================================
// CONFIGURATION
// ============================================

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ============================================
// TYPES
// ============================================

export interface LessonStarterRequest {
  /** The subject being learned (English, German, etc.) */
  subject: TargetSubject | string;
  /** The theme/interest chosen for this session */
  theme: string;
  /** User's native language for AI to speak in */
  nativeLanguage: NativeLanguage;
  /** User's display name */
  userName?: string;
  /** User's age group for tone adjustment */
  ageGroup?: AgeGroup;
  /** User's current level */
  level?: CEFRLevel;
  /** Known facts about the user from previous conversations */
  aiProfileFields?: AIProfileField[];
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

/**
 * Build system prompt for lesson starter generation.
 * Creates context-aware, kid-friendly opening messages.
 */
function buildLessonStarterPrompt(request: LessonStarterRequest): string {
  const { 
    subject, 
    theme, 
    nativeLanguage, 
    userName,
    ageGroup = '11-14', 
    level = 'A1',
    aiProfileFields = [] 
  } = request;
  
  // Format known facts about the user
  const knownFacts = aiProfileFields.length > 0
    ? aiProfileFields.map(f => `- ${f.fieldName}: ${f.fieldValue}`).join('\n')
    : 'No specific facts known yet.';
  
  // Age-appropriate tone guidance
  const toneGuidance = getToneGuidance(ageGroup);
  
  return `You are Professor Finch, a friendly and encouraging language learning coach. 🦉

Your task is to generate a SINGLE opening message to start a learning conversation.

## Context
- **Subject being learned:** ${subject}
- **Today's theme:** ${theme}
- **User's name:** ${userName || 'Friend'}
- **User's native language:** ${nativeLanguage}
- **User's level:** ${level}

## Known facts about this user
${knownFacts}

## Your Response Requirements
1. **Language:** Write ENTIRELY in ${nativeLanguage}
2. **Length:** Keep it SHORT - 2-3 sentences maximum
3. **Tone:** ${toneGuidance}
4. **Structure:**
   - Acknowledge their interest in ${theme}
   - Ask an open-ended question about it
   - Make it easy for them to respond

## Examples (in English, but write in ${nativeLanguage})

For "English + K-pop":
"So you want to learn English through K-pop! 🎤 That's awesome! Do you have a favorite group or song you'd like to explore together?"

For "German + Gaming":
"Let's learn some German while talking about games! 🎮 What kind of games do you enjoy playing?"

For "English + General":
"Ready to practice some English today! 📚 What would you like to talk about - maybe something fun you did recently?"

## Important Rules
- Be warm and enthusiastic
- Use 1-2 emojis (not more)
- Never be boring or formal
- Make them excited to respond
- If theme is "General" or "Général", offer 2-3 topic suggestions

Output ONLY the opening message, nothing else.`;
}

/**
 * Get tone guidance based on age group
 */
function getToneGuidance(ageGroup: AgeGroup): string {
  switch (ageGroup) {
    case '7-10':
      return 'Very friendly, playful, and encouraging. Use simple words and show excitement!';
    case '11-14':
      return 'Friendly but not childish. Be cool and relatable. Reference things they might like.';
    case '15-18':
      return 'Conversational and respectful. Treat them like a peer, not a child.';
    default:
      return 'Friendly and encouraging.';
  }
}

// ============================================
// MAIN API FUNCTION
// ============================================

/**
 * Generate a personalized lesson starter message.
 * 
 * This is called when the user clicks "Start Learning" from the launcher.
 * Returns a conversation-starting message from the AI tutor.
 * 
 * @param request - Lesson starter parameters
 * @returns The AI's opening message
 * @throws Error if API call fails
 */
export async function generateLessonStarter(
  request: LessonStarterRequest
): Promise<string> {
  // Build the system prompt
  const systemPrompt = buildLessonStarterPrompt(request);
  
  // Simple user message to trigger generation
  const userMessage = `Generate an opening message for a ${request.subject} lesson with the theme "${request.theme}".`;
  
  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.8, // Slightly higher for variety
        max_tokens: 200, // Short response
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[LessonStarter] API error:', error);
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const openingMessage = data.choices?.[0]?.message?.content?.trim();
    
    if (!openingMessage) {
      throw new Error('Empty response from AI');
    }
    
    return openingMessage;
    
  } catch (error) {
    console.error('[LessonStarter] Failed to generate:', error);
    
    // Return a fallback message in the user's native language
    return getFallbackMessage(request.nativeLanguage, request.theme, request.userName);
  }
}

// ============================================
// FALLBACK MESSAGES
// ============================================

/**
 * Fallback messages when AI generation fails.
 * Better than showing an error to kids!
 */
function getFallbackMessage(
  language: NativeLanguage, 
  theme: string,
  userName?: string
): string {
  const name = userName || 'friend';
  
  // Fallback messages by language
  const fallbacks: Record<string, string> = {
    English: `Hi ${name}! 👋 I'm excited to learn with you today. What would you like to explore about ${theme}?`,
    French: `Salut ${name} ! 👋 Je suis ravi d'apprendre avec toi aujourd'hui. Qu'est-ce que tu aimerais découvrir sur ${theme} ?`,
    Spanish: `¡Hola ${name}! 👋 Estoy emocionado de aprender contigo hoy. ¿Qué te gustaría explorar sobre ${theme}?`,
    German: `Hallo ${name}! 👋 Ich freue mich, heute mit dir zu lernen. Was möchtest du über ${theme} entdecken?`,
  };
  
  return fallbacks[language] || fallbacks.English;
}

// ============================================
// HELPER: EXTRACT PROFILE FACTS FROM AI
// ============================================

/**
 * Pattern to detect facts that should be saved from AI responses.
 * Used in the message handler to extract learnable information.
 * 
 * This is exported for use in useMessageHandler to detect and save
 * profile facts during conversations.
 */
export const FACT_EXTRACTION_PATTERNS = [
  // Favorite things
  { pattern: /favorite (?:band|group|artist) (?:is|are) ([^.!?]+)/i, field: 'favorite_music_artist' },
  { pattern: /favorite (?:game|video game) (?:is|are) ([^.!?]+)/i, field: 'favorite_game' },
  { pattern: /favorite (?:sport|activity) (?:is|are) ([^.!?]+)/i, field: 'favorite_sport' },
  { pattern: /favorite (?:food|meal|dish) (?:is|are) ([^.!?]+)/i, field: 'favorite_food' },
  { pattern: /favorite (?:movie|film) (?:is|are) ([^.!?]+)/i, field: 'favorite_movie' },
  { pattern: /favorite (?:book|story) (?:is|are) ([^.!?]+)/i, field: 'favorite_book' },
  
  // Personal info (safe)
  { pattern: /(?:I have|I've got) (\d+) (?:brother|sister|sibling)/i, field: 'siblings_count' },
  { pattern: /(?:I have|I've got) a (?:pet )?(dog|cat|bird|fish|hamster)/i, field: 'pet_type' },
  { pattern: /my (?:pet|dog|cat)(?:'s| is) name(?:d| is) ([^.!?]+)/i, field: 'pet_name' },
  
  // Learning motivation
  { pattern: /I want to learn .+ (?:because|to|so) ([^.!?]+)/i, field: 'learning_motivation' },
  { pattern: /I(?:'m| am) learning .+ (?:because|to|so) ([^.!?]+)/i, field: 'learning_motivation' },
];

/**
 * Attempt to extract facts from a user message.
 * Returns array of {fieldName, fieldValue, confidence} objects.
 * 
 * @param message - The user's message text
 * @returns Array of extracted facts
 */
export function extractFactsFromMessage(message: string): Array<{
  fieldName: string;
  fieldValue: string;
  confidence: number;
}> {
  const facts: Array<{ fieldName: string; fieldValue: string; confidence: number }> = [];
  
  for (const { pattern, field } of FACT_EXTRACTION_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      facts.push({
        fieldName: field,
        fieldValue: match[1].trim(),
        confidence: 0.7, // Medium confidence for pattern matching
      });
    }
  }
  
  return facts;
}

export default {
  generateLessonStarter,
  extractFactsFromMessage,
  FACT_EXTRACTION_PATTERNS,
};
