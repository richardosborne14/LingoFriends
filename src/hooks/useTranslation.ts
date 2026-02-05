/**
 * useTranslation Hook
 * Handles message translation state and operations
 * Provides clean interface for translating AI messages
 */
import { useState, useCallback } from 'react';
import { translateText } from '../../services/geminiService';
import type { Message, NativeLanguage, ChatSession } from '../../types';

interface UseTranslationOptions {
  nativeLanguage: NativeLanguage;
  sessions: Record<string, ChatSession>;
  updateMessages: (sessionId: string, messages: Message[]) => void;
}

interface UseTranslationReturn {
  /** ID of the message currently being translated */
  translationLoadingId: string | null;
  /** Translate a message to native language */
  handleTranslate: (messageId: string, text: string) => Promise<void>;
}

/**
 * Hook for managing message translations
 * Finds message across sessions and updates with translation pairs
 */
export function useTranslation({
  nativeLanguage,
  sessions,
  updateMessages,
}: UseTranslationOptions): UseTranslationReturn {
  const [translationLoadingId, setTranslationLoadingId] = useState<string | null>(null);

  /**
   * Translate a message and update session state
   * Translation pairs show word-by-word breakdown for learning
   */
  const handleTranslate = useCallback(async (messageId: string, text: string) => {
    setTranslationLoadingId(messageId);
    
    // Find which session contains this message
    let foundSessionId: string | undefined;
    for (const sId in sessions) {
      if (sessions[sId].messages.some(msg => msg.id === messageId)) {
        foundSessionId = sId;
        break;
      }
    }
    
    if (!foundSessionId) {
      setTranslationLoadingId(null);
      return;
    }

    const pairs = await translateText(text, nativeLanguage);
    setTranslationLoadingId(null);

    if (pairs) {
      // Translation is not persisted to DB - just displayed in UI for this session
      // This is acceptable as users can re-translate if needed after refresh
      const session = sessions[foundSessionId];
      if (session) {
        const updatedMsgs = session.messages.map(m => 
          m.id === messageId 
            ? { ...m, translation: pairs, translationLanguage: nativeLanguage } 
            : m
        );
        updateMessages(foundSessionId, updatedMsgs);
      }
    }
  }, [nativeLanguage, sessions, updateMessages]);

  return {
    translationLoadingId,
    handleTranslate,
  };
}
