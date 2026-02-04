/**
 * LingoFriends - Sessions Hook
 * 
 * Manages chat sessions with Pocketbase persistence.
 * Handles loading, saving, and auto-sync of sessions.
 * 
 * Usage:
 *   const { sessions, activeSession, createSession, updateMessages } = useSessions();
 * 
 * @module useSessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSessions,
  createSession as pbCreateSession,
  updateSession as pbUpdateSession,
  getOrCreateMainSession,
} from '../../services/pocketbaseService';
import { useAuth } from './useAuth';
import type { ChatSession, Message, SessionType, SessionStatus, TargetLanguage, LessonDraft } from '../../types';
import { SessionType as ST, SessionStatus as SS } from '../../types';

// ============================================
// TYPES
// ============================================

interface SessionsState {
  /** All sessions indexed by ID */
  sessions: Record<string, ChatSession>;
  /** Currently active session ID */
  activeSessionId: string | null;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
}

interface SessionsMethods {
  /** Set the active session */
  setActiveSessionId: (id: string) => void;
  /** Create a new session */
  createSession: (session: Omit<ChatSession, 'id' | 'createdAt'>) => Promise<ChatSession>;
  /** Update messages in a session (debounced save) */
  updateMessages: (sessionId: string, messages: Message[]) => void;
  /** Update session status */
  updateStatus: (sessionId: string, status: SessionStatus) => void;
  /** Update session draft */
  updateDraft: (sessionId: string, draft: LessonDraft | null) => void;
  /** Get or create main session for a language */
  getOrCreateMain: (targetLanguage: TargetLanguage) => Promise<ChatSession>;
  /** Force save all pending changes */
  flushPendingChanges: () => Promise<void>;
}

type UseSessionsReturn = SessionsState & SessionsMethods & {
  /** Get the currently active session */
  activeSession: ChatSession | null;
  /** Get active lessons (LESSON type, ACTIVE status) */
  activeLessons: ChatSession[];
  /** Get completed lessons */
  completedLessons: ChatSession[];
};

// ============================================
// CONSTANTS
// ============================================

/** Debounce delay for message updates (ms) */
const SAVE_DEBOUNCE_MS = 2000;

// ============================================
// HOOK
// ============================================

/**
 * Sessions Hook
 * 
 * Manages chat sessions with automatic Pocketbase persistence.
 * Messages are debounced to avoid excessive API calls while typing.
 */
export function useSessions(): UseSessionsReturn {
  const { isAuthenticated, profile } = useAuth();
  
  const [state, setState] = useState<SessionsState>({
    sessions: {},
    activeSessionId: null,
    isLoading: true,
    error: null,
  });

  // Track pending message updates for debounced saves
  const pendingUpdates = useRef<Record<string, Message[]>>({});
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Load all sessions from Pocketbase on mount/auth change
   * Auto-creates Main Hall session for new users
   */
  useEffect(() => {
    const loadSessions = async () => {
      if (!isAuthenticated) {
        setState({
          sessions: {},
          activeSessionId: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const sessionsList = await getSessions();
        
        // Convert array to record by ID
        const sessionsRecord: Record<string, ChatSession> = {};
        for (const session of sessionsList) {
          sessionsRecord[session.id] = session;
        }

        // Find or set active session based on profile language
        const targetLang = profile?.targetLanguage || 'English';
        let activeId: string | null = null;

        // Look for existing main session
        let mainSession = sessionsList.find(
          s => s.type === ST.MAIN && s.title.includes(targetLang === 'French' ? 'French' : 'Main Hall')
        );

        // AUTO-CREATE: If no main session exists, create one now
        // This ensures new users always land in the Main Hall
        if (!mainSession) {
          console.log('No main session found, creating one for:', targetLang);
          try {
            mainSession = await getOrCreateMainSession(targetLang);
            sessionsRecord[mainSession.id] = mainSession;
          } catch (err) {
            console.error('Failed to auto-create main session:', err);
          }
        }

        if (mainSession) {
          activeId = mainSession.id;
        }

        setState({
          sessions: sessionsRecord,
          activeSessionId: activeId,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load your conversations. Please refresh.',
        }));
      }
    };

    loadSessions();
  }, [isAuthenticated, profile?.targetLanguage]);

  /**
   * Set active session ID
   */
  const setActiveSessionId = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeSessionId: id }));
  }, []);

  /**
   * Create a new session
   */
  const createSession = useCallback(async (
    sessionData: Omit<ChatSession, 'id' | 'createdAt'>
  ): Promise<ChatSession> => {
    try {
      const created = await pbCreateSession(sessionData);
      
      setState(prev => ({
        ...prev,
        sessions: {
          ...prev.sessions,
          [created.id]: created,
        },
      }));

      return created;
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  }, []);

  /**
   * Update messages with debounced save
   * Updates local state immediately, saves to Pocketbase after delay
   */
  const updateMessages = useCallback((sessionId: string, messages: Message[]) => {
    // Update local state immediately for responsive UI
    setState(prev => {
      const session = prev.sessions[sessionId];
      if (!session) return prev;

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [sessionId]: {
            ...session,
            messages,
          },
        },
      };
    });

    // Track pending update
    pendingUpdates.current[sessionId] = messages;

    // Clear existing timeout
    if (saveTimeouts.current[sessionId]) {
      clearTimeout(saveTimeouts.current[sessionId]);
    }

    // Set new debounced save
    saveTimeouts.current[sessionId] = setTimeout(async () => {
      try {
        // Strip audio data before saving (too large for DB)
        const messagesWithoutAudio = messages.map(msg => {
          const { audioData, ...rest } = msg;
          return rest;
        });

        await pbUpdateSession(sessionId, { messages: messagesWithoutAudio });
        delete pendingUpdates.current[sessionId];
      } catch (err) {
        console.error('Failed to save messages:', err);
        // Keep pending update for retry
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  /**
   * Update session status (immediately saved)
   */
  const updateStatus = useCallback(async (sessionId: string, status: SessionStatus) => {
    // Update local state
    setState(prev => {
      const session = prev.sessions[sessionId];
      if (!session) return prev;

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [sessionId]: {
            ...session,
            status,
          },
        },
      };
    });

    // Save to Pocketbase immediately
    try {
      await pbUpdateSession(sessionId, { status });
    } catch (err) {
      console.error('Failed to update session status:', err);
    }
  }, []);

  /**
   * Update session draft (debounced save)
   */
  const updateDraft = useCallback((sessionId: string, draft: LessonDraft | null) => {
    setState(prev => {
      const session = prev.sessions[sessionId];
      if (!session) return prev;

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [sessionId]: {
            ...session,
            draft: draft || undefined,
          },
        },
      };
    });

    // Debounced save (reuse message timeout logic)
    if (saveTimeouts.current[`draft-${sessionId}`]) {
      clearTimeout(saveTimeouts.current[`draft-${sessionId}`]);
    }

    saveTimeouts.current[`draft-${sessionId}`] = setTimeout(async () => {
      try {
        await pbUpdateSession(sessionId, { draft });
      } catch (err) {
        console.error('Failed to save draft:', err);
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  /**
   * Get or create main session for a language
   */
  const getOrCreateMain = useCallback(async (targetLanguage: TargetLanguage): Promise<ChatSession> => {
    try {
      const session = await getOrCreateMainSession(targetLanguage);
      
      // Add to local state if new
      setState(prev => ({
        ...prev,
        sessions: {
          ...prev.sessions,
          [session.id]: session,
        },
        activeSessionId: session.id,
      }));

      return session;
    } catch (err) {
      console.error('Failed to get/create main session:', err);
      throw err;
    }
  }, []);

  /**
   * Flush all pending changes immediately
   * Call this on page unload or app blur
   */
  const flushPendingChanges = useCallback(async () => {
    // Clear all timeouts
    Object.values(saveTimeouts.current).forEach(clearTimeout);
    saveTimeouts.current = {};

    // Save all pending updates
    const savePromises = Object.entries(pendingUpdates.current).map(
      async ([sessionId, messages]) => {
        try {
          const messagesWithoutAudio = messages.map(msg => {
            const { audioData, ...rest } = msg;
            return rest;
          });
          await pbUpdateSession(sessionId, { messages: messagesWithoutAudio });
        } catch (err) {
          console.error(`Failed to save session ${sessionId}:`, err);
        }
      }
    );

    await Promise.all(savePromises);
    pendingUpdates.current = {};
  }, []);

  /**
   * Auto-save on page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sync save (blocking) - note: async won't complete
      // Using sendBeacon would be better but requires API endpoint
      flushPendingChanges();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Cleanup timeouts
      Object.values(saveTimeouts.current).forEach(clearTimeout);
    };
  }, [flushPendingChanges]);

  // Computed values
  const activeSession = state.activeSessionId ? state.sessions[state.activeSessionId] : null;
  
  const activeLessons = Object.values(state.sessions)
    .filter(s => s.type === ST.LESSON && s.status === SS.ACTIVE)
    .sort((a, b) => b.createdAt - a.createdAt);

  const completedLessons = Object.values(state.sessions)
    .filter(s => s.type === ST.LESSON && s.status === SS.COMPLETED)
    .sort((a, b) => b.createdAt - a.createdAt);

  return {
    ...state,
    activeSession,
    activeLessons,
    completedLessons,
    setActiveSessionId,
    createSession,
    updateMessages,
    updateStatus,
    updateDraft,
    getOrCreateMain,
    flushPendingChanges,
  };
}

export default useSessions;
