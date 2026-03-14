/**
 * LingoFriends - Help Service
 *
 * Builds rich context for the AI help system when users are stuck.
 * This service gathers lesson context, user history, and learning profile
 * to provide personalized assistance.
 *
 * Key responsibilities:
 * - Build context messages for help AI
 * - Track help request history for patterns
 * - Provide regeneration triggers for broken questions
 *
 * @module helpService
 * @see docs/phase-2-world-expansion/task-2.0-7-help-system-overhaul.md
 */

import type { LessonStep, ActivityConfig } from '../types/game';
import type { LearnerProfile } from '../types/pedagogy';
import { aiProviderService } from './ai';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context passed to the help AI for generating responses.
 */
export interface HelpContext {
  /** Current lesson step being displayed */
  currentStep: LessonStep;
  
  /** Current lesson details */
  lesson: {
    id: string;
    title: string;
    stepIndex: number;
    totalSteps: number;
  };
  
  /** User's profile and learning history */
  userProfile: {
    ageGroup: '7-10' | '11-14' | '15-18';
    nativeLanguage: string;
    targetLanguage: string;
    currentLevel: number;
  };
  
  /** Chunks the user has already learned */
  learnedChunks: Array<{
    text: string;
    translation: string;
  }>;
  
  /** Chunks the user is struggling with */
  strugglingChunks: Array<{
    text: string;
    translation: string;
  }>;
  
  /** Current SunDrops in this lesson */
  currentSunDrops: number;
  
  /** Total SunDrops available in this lesson */
  totalSunDrops: number;
  
  /** The user's free-text question or problem description */
  userQuestion?: string;
}

/**
 * Response from the help AI.
 */
export interface HelpResponse {
  /** The AI's response text (to be displayed/spoken) */
  text: string;
  
  /** Whether the AI detected a broken question */
  isBrokenQuestion: boolean;
  
  /** If regeneration is needed, the new activity */
  regeneratedActivity?: ActivityConfig;
  
  /** Suggested follow-up actions */
  suggestions?: string[];
}

/**
 * Result of building help context.
 */
export interface ContextBuildResult {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  metadata: {
    languagePair: string;
    levelRange: string;
    chunkCount: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** System prompt template for help AI */
const HELP_SYSTEM_PROMPT_TEMPLATE = `You are a friendly language tutor helping a {ageGroup}-year-old who speaks {nativeLanguage} and is learning {targetLanguage}.

CURRENT LESSON CONTEXT:
- Lesson: "{lessonTitle}"
- Step: {stepIndex} of {totalSteps}
- Activity type: {activityType}
- Current progress: {currentSunDrops}/{totalSunDrops} SunDrops earned

CURRENT ACTIVITY:
{activityDescription}

USER LEARNING HISTORY:
- Chunks already mastered: {masteredChunks}
- Chunks struggling with: {strugglingChunks}
- Overall level: {level}

RULES:
1. Respond ONLY in {nativeLanguage} (the user's native language)
2. Use {targetLanguage} only for examples in the target language
3. Be encouraging and patient - never make the user feel bad
4. Keep responses SHORT (2-4 sentences) - they'll be spoken aloud
5. If explaining a concept, use simple language appropriate for {ageGroup} year olds
6. If the user describes a BROKEN QUESTION (wrong language, mismatched pairs, impossible answers):
   - Acknowledge YOUR mistake and apologize
   - End your response with exactly: [REGENERATE_QUESTION]
   - Example: "Oh, you're right! That question has both options in French instead of English. That's my mistake, sorry! Let me fix that for you. [REGENERATE_QUESTION]"
7. DO NOT blame the user or make them feel wrong about reporting issues
8. CRITICAL - NO ANSWER LEAKAGE: Never state the correct answer verbatim, and never repeat any
   answer option from the question back to the user. Instead give:
   - Memory tips ("The word 'Morgen' means morning in German, so think about time of day...")
   - Grammar patterns ("German greetings often match the time of day...")
   - Context clues ("You'd use this phrase when you first see someone in the...")
   BAD: "The answer is Good morning"
   GOOD: "Think about when you'd greet someone first thing in the day!"`;
                                    

// ============================================================================
// HELP CONTEXT BUILDER
// ============================================================================

/**
 * Build the system and user messages for the help AI.
 *
 * This creates a rich context including:
 * - Current lesson/activity details
 * - User's learning profile
 * - Their progress in this lesson
 * - Their history with this content
 *
 * @param ctx - The help context object
 * @returns Formatted messages ready for AI completion
 */
export function buildHelpContext(ctx: HelpContext): ContextBuildResult {
  // Format learned chunks
  const masteredChunks = ctx.learnedChunks.length > 0
    ? ctx.learnedChunks.slice(0, 5).map(c => `"${c.text}"`).join(', ')
    : 'None yet - this is your first lesson!';
  
  // Format struggling chunks
  const strugglingChunks = ctx.strugglingChunks.length > 0
    ? ctx.strugglingChunks.slice(0, 3).map(c => `"${c.text}"`).join(', ')
    : 'None - you are doing great!';
  
  // Build activity description
  const activityDescription = formatActivityForHelp(ctx.currentStep);
  
  // Build system prompt with all context
  const systemPrompt = HELP_SYSTEM_PROMPT_TEMPLATE
    .replace('{ageGroup}', ctx.userProfile.ageGroup)
    .replace(/{nativeLanguage}/g, ctx.userProfile.nativeLanguage)
    .replace(/{targetLanguage}/g, ctx.userProfile.targetLanguage)
    .replace('{lessonTitle}', ctx.lesson.title)
    .replace('{stepIndex}', String(ctx.lesson.stepIndex + 1))
    .replace('{totalSteps}', String(ctx.lesson.totalSteps))
    .replace('{activityType}', ctx.currentStep.activity.type)
    .replace('{activityDescription}', activityDescription)
    .replace('{masteredChunks}', masteredChunks)
    .replace('{strugglingChunks}', strugglingChunks)
    .replace('{level}', getLevelName(ctx.userProfile.currentLevel))
    .replace('{currentSunDrops}', String(ctx.currentSunDrops))
    .replace('{totalSunDrops}', String(ctx.totalSunDrops));
  
  // User message - their question or a default greeting
  const userMessage = ctx.userQuestion 
    ? ctx.userQuestion
    : "I'm stuck. Can you help me with this question?";
  
  return {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    metadata: {
      languagePair: `${ctx.userProfile.nativeLanguage} → ${ctx.userProfile.targetLanguage}`,
      levelRange: getLevelName(ctx.userProfile.currentLevel),
      chunkCount: ctx.learnedChunks.length + ctx.strugglingChunks.length,
    },
  };
}

// ============================================================================
// HELP REQUEST
// ============================================================================

/**
 * Send a help request to the AI and get a response.
 *
 * @param ctx - The help context
 * @returns The AI's response including whether regeneration is needed
 */
export async function requestHelp(ctx: HelpContext): Promise<HelpResponse> {
  const { messages } = buildHelpContext(ctx);
  
  try {
    const result = await aiProviderService.complete({
      messages,
      temperature: 0.7,
      maxTokens: 500,
      jsonMode: false,
    });
    
    const responseText = result.text.trim();
    
    // Check if AI detected a broken question
    const isBrokenQuestion = responseText.includes('[REGENERATE_QUESTION]');
    
    // Clean up the response - remove the marker
    const cleanText = responseText
      .replace('[REGENERATE_QUESTION]', '')
      .trim();
    
    return {
      text: cleanText,
      isBrokenQuestion,
      suggestions: extractSuggestions(responseText),
    };
    
  } catch (error) {
    console.error('[HelpService] AI request failed:', error);
    
    // Return a fallback response
    return {
      text: `I'm here to help! Let's think about this step together. Remember: "${ctx.currentStep.activity.hint || 'Take your time and think about it.'}"`,
      isBrokenQuestion: false,
    };
  }
}

// ============================================================================
// ACTIVITY FORMATTING
// ============================================================================

/**
 * Format an activity for help context display.
 * Creates a human-readable description of the current question.
 *
 * @param step - The lesson step with activity
 * @returns Human-readable activity description
 */
function formatActivityForHelp(step: LessonStep): string {
  const activity = step.activity;
  
  switch (activity.type) {
    case 'info':
      return `Teaching step: "${activity.title || activity.content || 'Introduction'}"`;
    
    case 'multiple_choice': {
      const options = activity.options?.join(', ') || 'options';
      return `Multiple choice question: "${activity.question}"
Options: ${options}
Hint: "${activity.hint || 'None'}"`;
    }
    
    case 'fill_blank': {
      return `Fill in the blank: "${activity.sentence}"
Correct answer: "${activity.correctAnswer}"
Hint: "${activity.hint || 'None'}"`;
    }
    
    case 'translate': {
      return `Translation question: "${activity.sourcePhrase}"
Accepted answers: ${activity.acceptedAnswers?.join(', ') || activity.correctAnswer}
Hint: "${activity.hint || 'None'}"`;
    }
    
    case 'true_false': {
      const statement = activity.statement || activity.question || 'statement';
      return `True/False question: "${statement}"
Correct answer: ${activity.isTrue ? 'True' : 'False'}
Hint: "${activity.hint || 'None'}"`;
    }
    
    case 'matching': {
      const pairs = activity.pairs?.map(p => `${p.left} → ${p.right}`).join(', ') || 'pairs';
      return `Matching question: Match the pairs.
Pairs: ${pairs}`;
    }
    
    case 'word_arrange': {
      return `Word arrangement: Arrange these words to form "${activity.targetSentence}"
Words: ${activity.scrambledWords?.join(', ') || 'words'}
Hint: "${activity.hint || 'None'}"`;
    }
    
    default:
      return `Activity type: ${activity.type}`;
  }
}

/**
 * Extract suggestions from AI response.
 * Looks for numbered or bulleted lists.
 */
function extractSuggestions(text: string): string[] {
  // Look for numbered suggestions: "1. ..." or bulleted: "- ..."
  const lines = text.split('\n');
  const suggestions: string[] = [];
  
  for (const line of lines) {
    const match = line.match(/^\s*(?:\d+\.|-)\s*(.+)$/);
    if (match && match[1]) {
      suggestions.push(match[1].trim());
    }
  }
  
  return suggestions;
}

/**
 * Get a human-readable level name from numeric level.
 */
function getLevelName(level: number): string {
  if (level <= 20) return 'A1 (Beginner)';
  if (level <= 40) return 'A2 (Elementary)';
  if (level <= 60) return 'B1 (Intermediate)';
  if (level <= 80) return 'B2 (Upper Intermediate)';
  if (level <= 90) return 'C1 (Advanced)';
  return 'C2 (Proficient)';
}

// ============================================================================
// CONVERSATION HISTORY
// ============================================================================

/**
 * Conversation history for multi-turn help sessions.
 */
export class HelpConversation {
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private context: HelpContext | null = null;
  
  /**
   * Start a new help conversation.
   */
  start(context: HelpContext): void {
    this.context = context;
    this.messages = [];
  }
  
  /**
   * Add a user message to the conversation.
   */
  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }
  
  /**
   * Add an assistant message to the conversation.
   */
  addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
  }
  
  /**
   * Get the conversation history for context.
   */
  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.messages];
  }
  
  /**
   * Get the original help context.
   */
  getContext(): HelpContext | null {
    return this.context;
  }
  
  /**
   * Reset the conversation.
   */
  reset(): void {
    this.messages = [];
    this.context = null;
  }
  
  /**
   * Continue the help conversation with a follow-up message.
   */
  async continue(userMessage: string): Promise<HelpResponse> {
    if (!this.context) {
      throw new Error('No help session in progress. Call start() first.');
    }
    
    // Add user message
    this.addUserMessage(userMessage);
    
    // Build context with conversation history
    const { messages: baseMessages } = buildHelpContext(this.context);
    
    // Add conversation history
    for (const msg of this.messages) {
      baseMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
    
    try {
      const result = await aiProviderService.complete({
        messages: baseMessages,
        temperature: 0.7,
        maxTokens: 500,
        jsonMode: false,
      });
      
      const responseText = result.text.trim();
      const isBrokenQuestion = responseText.includes('[REGENERATE_QUESTION]');
      const cleanText = responseText.replace('[REGENERATE_QUESTION]', '').trim();
      
      // Add to history
      this.addAssistantMessage(cleanText);
      
      return {
        text: cleanText,
        isBrokenQuestion,
      };
      
    } catch (error) {
      console.error('[HelpService] Continue failed:', error);
      return {
        text: "I'm having trouble understanding. Could you try rephrasing your question?",
        isBrokenQuestion: false,
      };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton help conversation instance */
export const helpConversation = new HelpConversation();

export default {
  buildHelpContext,
  requestHelp,
  HelpConversation,
  helpConversation,
};