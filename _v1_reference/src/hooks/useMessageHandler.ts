/**
 * useMessageHandler Hook
 * Handles AI conversation logic - sending messages, processing responses, and actions
 * Extracts the core chat orchestration logic from App.tsx
 * 
 * Enhanced for Task 7:
 * - Accepts current theme for context-aware AI responses
 * - Extracts and saves AI profile fields from user messages
 */
import { useState, useCallback } from 'react';
import { generateResponse, type ConversationContext } from '../../services/groqService';
import { extractFactsFromMessage } from '../../services/lessonStarterService';
import { upsertAIProfileField, getAIProfileFields } from '../../services/pocketbaseService';
import { 
  Sender, 
  SessionType, 
  SessionStatus 
} from '../../types';
import type { 
  Message, 
  UserProfile, 
  ChatSession,
  AIProfileField,
  CompletedLessonSummary
} from '../../types';

interface UseMessageHandlerOptions {
  /** Current active session ID */
  activeSessionId: string;
  /** All sessions map */
  sessions: Record<string, ChatSession>;
  /** User profile for context */
  profile: UserProfile;
  /** Auto-TTS setting */
  autoTTS: boolean;
  /** Update messages in a session */
  updateMessages: (sessionId: string, messages: Message[]) => void;
  /** Update draft on a session */
  updateDraft: (sessionId: string, draft: unknown) => void;
  /** Update session status */
  updateStatus: (sessionId: string, status: SessionStatus) => void;
  /** Create a new session */
  createSession: (data: Partial<ChatSession>) => Promise<ChatSession>;
  /** Update user profile */
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  /** Add XP to user */
  addXP: (amount: number) => Promise<{ capped: boolean }>;
  /** Play audio for a message */
  handlePlayAudio: (messageId: string, text: string) => Promise<void>;
  /** Stop any playing audio */
  stopAudio: () => void;
  /** Current theme/interest for this learning session (Task 7) */
  currentTheme?: string | null;
  /** Completed lessons for curriculum-aware AI lesson planning */
  completedLessons?: CompletedLessonSummary[];
}

interface UseMessageHandlerReturn {
  /** Whether AI is currently generating a response */
  isThinking: boolean;
  /** Send a user message and get AI response */
  handleUserMessage: (text: string, options?: { isHidden?: boolean }) => Promise<void>;
  /** Handle activity completion (quiz, etc.) */
  handleActivityComplete: (msgId: string, score: number) => Promise<void>;
  /** Handle lesson completion */
  handleCompleteLesson: () => Promise<void>;
}

/**
 * Hook for managing AI conversation flow
 * Processes user messages, AI responses, and special actions
 */
export function useMessageHandler({
  activeSessionId,
  sessions,
  profile,
  autoTTS,
  updateMessages,
  updateDraft,
  updateStatus,
  createSession,
  updateProfile,
  addXP,
  handlePlayAudio,
  stopAudio,
  currentTheme,
  completedLessons,
}: UseMessageHandlerOptions): UseMessageHandlerReturn {
  const [isThinking, setIsThinking] = useState(false);
  
  // Cache for AI profile fields - refreshed on each message
  const [cachedAIFields, setCachedAIFields] = useState<AIProfileField[]>([]);

  /**
   * Helper to add messages to the current session
   * Now accepts optional existingMessages to avoid stale closure issues
   * when adding multiple messages in a single flow
   */
  const addMessagesToSession = useCallback((
    sessionId: string, 
    newMsgs: Message[],
    existingMessages?: Message[]
  ) => {
    const session = sessions[sessionId];
    if (!session) return;
    // Use provided existingMessages if available, otherwise use session.messages
    // This avoids stale state when adding user msg then AI msg in same flow
    const baseMessages = existingMessages ?? session.messages;
    const updatedMsgs = [...baseMessages, ...newMsgs];
    updateMessages(sessionId, updatedMsgs);
    return updatedMsgs; // Return for chaining
  }, [sessions, updateMessages]);

  /**
   * Send a user message and process AI response
   * Handles all AI actions (profile updates, activities, lessons, etc.)
   * 
   * Enhanced for Task 7:
   * - Passes current theme and AI profile fields for context
   * - Extracts facts from user messages and saves them
   */
  const handleUserMessage = useCallback(async (text: string, options: { isHidden?: boolean } = {}) => {
    stopAudio();
    const currentSession = sessions[activeSessionId];
    if (!currentSession) return;

    // Create user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text: text,
      timestamp: Date.now(),
      isHidden: options.isHidden
    };

    // Add user message and capture the updated messages array
    const messagesWithUser = addMessagesToSession(activeSessionId, [userMsg]);
    setIsThinking(true);

    try {
      // Extract facts from user message (non-hidden only)
      // This runs in background, doesn't block the response
      if (!options.isHidden) {
        const extractedFacts = extractFactsFromMessage(text);
        if (extractedFacts.length > 0) {
          console.log('[MessageHandler] Extracted facts:', extractedFacts);
          // Save facts to Pocketbase (fire and forget)
          for (const fact of extractedFacts) {
            upsertAIProfileField(
              fact.fieldName,
              fact.fieldValue,
              fact.confidence,
              activeSessionId
            ).catch(err => {
              console.error('[MessageHandler] Failed to save AI profile field:', err);
            });
          }
        }
      }

      // Fetch AI profile fields for context (if not cached or stale)
      let aiProfileFields = cachedAIFields;
      try {
        aiProfileFields = await getAIProfileFields();
        setCachedAIFields(aiProfileFields);
      } catch (err) {
        console.warn('[MessageHandler] Failed to fetch AI profile fields:', err);
      }

      // Build conversation context for AI — includes completed lessons
      // so the AI can build on prior learning instead of repeating
      const context: ConversationContext = {
        currentTheme: currentTheme || undefined,
        aiProfileFields,
        completedLessons: completedLessons || [],
      };

      // Pass the WHOLE session object to get context-aware responses
      // We construct a temp session with the new user message for the API call
      const tempSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMsg]
      };

      // Pass context to generateResponse for theme-aware AI
      const aiResponse = await generateResponse(tempSession, profile, text, context);
      
      let activityData = undefined;
      let lessonInviteData = undefined;

      // Process Actions (Iterate through array)
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          console.log("Processing action:", action);

          if (action.action === "UPDATE_PROFILE") {
            // Sync profile updates to Pocketbase
            const profileUpdates: Partial<UserProfile> = {
              onboardingComplete: true
            };
            if (action.data.level) profileUpdates.level = action.data.level;
            if (action.data.goals) profileUpdates.goals = action.data.goals;
            if (action.data.interests) profileUpdates.interests = action.data.interests;
            
            updateProfile(profileUpdates).catch(err => {
              console.error('Failed to update profile from AI action:', err);
            });
          } 
          else if (action.action === "ADD_TRAIT") {
            // Check if trait already exists before adding
            const existingTraits = profile.traits || [];
            if (!existingTraits.some(t => t.label === action.data.label)) {
              updateProfile({
                traits: [...existingTraits, action.data]
              }).catch(err => {
                console.error('Failed to add trait:', err);
              });
            }
          }
          else if (action.action === "START_ACTIVITY") {
            activityData = action.data;
          }
          else if (action.action === "UPDATE_DRAFT") {
            // Update draft via hook
            updateDraft(activeSessionId, action.data);
          }
          else if (action.action === "CREATE_LESSON") {
            // Clear draft on parent session
            updateDraft(activeSessionId, null);

            try {
              // Create new lesson session via Pocketbase
              // Pass targetLanguage from profile so it's stored correctly
              const newLesson = await createSession({
                type: SessionType.LESSON,
                status: SessionStatus.ACTIVE,
                title: action.data.title,
                objectives: action.data.objectives,
                parentId: activeSessionId,
                targetLanguage: profile.targetLanguage, // Fix: was hardcoded to 'English'
                messages: [
                  {
                    id: Date.now().toString(),
                    sender: Sender.AI,
                    text: action.data.initialMessage || `Welcome to your lesson on ${action.data.title}!`,
                    timestamp: Date.now()
                  }
                ]
              });

              lessonInviteData = {
                sessionId: newLesson.id,
                title: action.data.title,
                objectives: action.data.objectives
              };
              
              console.log('[MessageHandler] Lesson created successfully:', newLesson.id, action.data.title);
            } catch (lessonError) {
              console.error('[MessageHandler] Failed to create lesson session:', lessonError);
              // Don't let the lesson creation failure break the whole response
              // The AI text will still show, just no invite card
            }
          }
        }
      }

      // Create AI response message
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: aiMsgId,
        sender: Sender.AI,
        text: aiResponse.text,
        timestamp: Date.now(),
        activity: activityData,
        lessonInvite: lessonInviteData
      };

      // Use messagesWithUser to avoid stale state - this ensures user msg is included
      addMessagesToSession(activeSessionId, [aiMsg], messagesWithUser);
      
      // Auto-play TTS if enabled
      if (autoTTS && aiResponse.text) {
        handlePlayAudio(aiMsgId, aiResponse.text);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  }, [
    activeSessionId, 
    sessions, 
    profile, 
    autoTTS, 
    addMessagesToSession, 
    stopAudio, 
    updateDraft, 
    createSession, 
    updateProfile, 
    handlePlayAudio,
    currentTheme,
    cachedAIFields,
    completedLessons,
  ]);

  /**
   * Handle activity completion (quiz, fill-in-blank, etc.)
   * Awards XP and triggers follow-up from AI
   */
  const handleActivityComplete = useCallback(async (msgId: string, score: number) => {
    // Mark activity as completed in messages
    const session = sessions[activeSessionId];
    if (session) {
      const updatedMsgs = session.messages.map(msg => 
        msg.id === msgId ? { ...msg, activityCompleted: true } : msg
      );
      updateMessages(activeSessionId, updatedMsgs);
    }

    // Add XP via Pocketbase with daily cap enforcement
    const result = await addXP(score);
    
    // Show feedback if daily cap was hit
    if (result.capped) {
      console.log('Daily XP cap reached! Great work today.');
    }

    // Trigger AI follow-up message
    setTimeout(() => {
      handleUserMessage(`[System: User completed the activity with score ${score}. Praise them and continue.]`, { isHidden: true });
    }, 500);
  }, [activeSessionId, sessions, updateMessages, addXP, handleUserMessage]);

  /**
   * Handle lesson completion
   * Marks session as completed and awards bonus XP
   */
  const handleCompleteLesson = useCallback(async () => {
    // Update session status via hook
    updateStatus(activeSessionId, SessionStatus.COMPLETED);
    
    // Award bonus XP for completing lesson via Pocketbase
    const result = await addXP(50);
    
    if (result.capped) {
      console.log('Daily XP cap reached! Great work today.');
    }
  }, [activeSessionId, updateStatus, addXP]);

  return {
    isThinking,
    handleUserMessage,
    handleActivityComplete,
    handleCompleteLesson,
  };
}
