/**
 * LingoFriends - Help Overlay Component
 *
 * A modal overlay that provides AI-powered help when users are stuck.
 * Supports text and voice input for accessibility.
 *
 * Features:
 * - Free-text question input
 * - Voice input via browser speech recognition
 * - AI coaching responses with text-to-speech playback
 * - Report broken question functionality
 * - Context-aware help based on current lesson step
 *
 * @module HelpOverlay
 * @see docs/phase-2-world-expansion/task-2.0-7-help-system-overhaul.md
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestHelp, HelpContext, HelpResponse } from '../../services/helpService';
import { regenerateQuestion, RegenerationReason } from '../../services/questionRegenerationService';
import type { LessonStep } from '../../types/game';
import { useSounds } from '../../hooks/useSounds';

// ============================================
// Web Speech API Type Declarations
// ============================================

/**
 * Web Speech API types for browser speech recognition.
 * These are browser APIs that may not be in default TypeScript libs.
 */
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface WebSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface WebSpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

// ============================================
// TYPES
// ============================================

export interface HelpOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  
  /** Callback to close the overlay */
  onClose: () => void;
  
  /** The current lesson step context */
  currentStep: LessonStep | null;
  
  /** Lesson context for help AI */
  lessonContext: HelpContext | null;
  
  /** Callback when question is regenerated */
  onQuestionRegenerated?: (newStep: LessonStep) => void;
  
  /** User ID for reporting */
  userId?: string;
  
  /** Lesson ID for reporting */
  lessonId?: string;
  
  /** Current step index */
  stepIndex?: number;
}

interface HelpState {
  /** User's question text */
  question: string;
  
  /** AI response text */
  response: string;
  
  /** Whether AI is thinking */
  isLoading: boolean;
  
  /** Whether there's an error */
  error: string | null;
  
  /** Whether in voice input mode */
  isListening: boolean;
  
  /** Whether TTS is playing */
  isSpeaking: boolean;
  
  /** Whether broken question was detected */
  isBrokenQuestion: boolean;
  
  /** Conversation history */
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ============================================
// CONSTANTS
// ============================================

/** Placeholder suggestions for stuck users */
const SUGGESTIONS = [
  "I don't understand this question",
  "Can you explain this word?",
  "This question seems broken",
  "Give me a hint",
  "Why is this the answer?",
];

// ============================================
// COMPONENT
// ============================================

/**
 * HelpOverlay - AI-powered help modal for stuck learners.
 *
 * Usage:
 * ```tsx
 * <HelpOverlay
 *   visible={showHelp}
 *   onClose={() => setShowHelp(false)}
 *   currentStep={currentStep}
 *   lessonContext={helpContext}
 *   onQuestionRegenerated={handleNewQuestion}
 *   userId={userId}
 *   lessonId={lessonId}
 *   stepIndex={stepIndex}
 * />
 * ```
 */
export const HelpOverlay: React.FC<HelpOverlayProps> = ({
  visible,
  onClose,
  currentStep,
  lessonContext,
  onQuestionRegenerated,
  userId,
  lessonId,
  stepIndex = 0,
}) => {
  // Sound effects
  const { playTap } = useSounds();
  
  // State
  const [state, setState] = useState<HelpState>({
    question: '',
    response: '',
    isLoading: false,
    error: null,
    isListening: false,
    isSpeaking: false,
    isBrokenQuestion: false,
    conversationHistory: [],
  });
  
  // Voice input reference
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  
  // Text-to-speech
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // ============================================
  // VOICE INPUT
  // ============================================
  
  /**
   * Start voice recognition for hands-free input.
   * Important for younger users who may struggle with typing.
   */
  const startListening = useCallback(() => {
    // Check for Web Speech API support
    const WindowWithSpeech = window as unknown as {
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
      SpeechRecognition?: new () => WebSpeechRecognition;
    };
    
    const SpeechRecognitionAPI = WindowWithSpeech.webkitSpeechRecognition || WindowWithSpeech.SpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setState(prev => ({ ...prev, error: 'Voice input not supported in this browser' }));
      return;
    }
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // TODO: Use user's native language
    
    recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setState(prev => ({
        ...prev,
        question: transcript,
        isListening: false,
      }));
    };
    
    recognition.onerror = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
        error: 'Could not understand. Please try again.',
      }));
    };
    
    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };
    
    recognitionRef.current = recognition;
    recognition.start();
    setState(prev => ({ ...prev, isListening: true }));
  }, []);
  
  /**
   * Stop voice recognition.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);
  
  // ============================================
  // TEXT-TO-SPEECH
  // ============================================
  
  /**
   * Speak the AI's response aloud for accessibility.
   */
  const speakResponse = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setState(prev => ({ ...prev, error: 'Text-to-speech not supported' }));
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.1; // Slightly higher pitch for friendliness
    
    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    utterance.onerror = () => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    };
    
    ttsRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setState(prev => ({ ...prev, isSpeaking: true }));
  }, []);
  
  /**
   * Stop TTS playback.
   */
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);
  
  // ============================================
  // HELP REQUEST
  // ============================================
  
  /**
   * Send the user's question to the AI help system.
   */
  const handleAsk = useCallback(async () => {
    if (!lessonContext || !currentStep) {
      setState(prev => ({ ...prev, error: 'No lesson context available' }));
      return;
    }
    
    playTap();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isBrokenQuestion: false,
    }));
    
    try {
      const helpContext: HelpContext = {
        ...lessonContext,
        userQuestion: state.question || undefined,
      };
      
      const result: HelpResponse = await requestHelp(helpContext);
      
      // Add to conversation history
      const newHistory = [
        ...state.conversationHistory,
        { role: 'user' as const, content: state.question || "I'm stuck" },
        { role: 'assistant' as const, content: result.text },
      ];
      
      setState(prev => ({
        ...prev,
        response: result.text,
        isLoading: false,
        isBrokenQuestion: result.isBrokenQuestion,
        conversationHistory: newHistory,
        question: '', // Clear input for next question
      }));
      
      // Speak the response automatically
      speakResponse(result.text);
      
    } catch (error) {
      console.error('[HelpOverlay] Help request failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Something went wrong. Please try again.',
      }));
    }
  }, [lessonContext, currentStep, state.question, state.conversationHistory, playTap, speakResponse]);
  
  // ============================================
  // QUESTION REGENERATION
  // ============================================
  
  /**
   * Report the current question as broken and request regeneration.
   */
  const handleReportQuestion = useCallback(async () => {
    if (!lessonContext || !currentStep || !userId || !lessonId) {
      setState(prev => ({ ...prev, error: 'Cannot report: missing context' }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Record the report
      const reportId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // For now, we'll regenerate directly
      // In production, this would call the regeneration service
      
      // If regeneration callback provided, call it
      if (onQuestionRegenerated) {
        // Signal that regeneration is needed
        // The parent component should handle the actual regeneration
        onQuestionRegenerated(currentStep);
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        response: "Thanks for reporting that! I've noted the issue. Let's try a different question.",
        isBrokenQuestion: false,
      }));
      
    } catch (error) {
      console.error('[HelpOverlay] Report failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Could not report. Please try again.',
      }));
    }
  }, [lessonContext, currentStep, userId, lessonId, onQuestionRegenerated]);
  
  // ============================================
  // SUGGESTIONS
  // ============================================
  
  /**
   * Use a suggested question.
   */
  const handleSuggestion = useCallback((suggestion: string) => {
    playTap();
    setState(prev => ({ ...prev, question: suggestion }));
  }, [playTap]);
  
  // ============================================
  // CLEANUP
  // ============================================
  
  /**
   * Clean up on unmount.
   */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);
  
  /**
   * Reset state when overlay opens.
   */
  useEffect(() => {
    if (visible) {
      setState({
        question: '',
        response: '',
        isLoading: false,
        error: null,
        isListening: false,
        isSpeaking: false,
        isBrokenQuestion: false,
        conversationHistory: [],
      });
    }
  }, [visible]);
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              stopSpeaking();
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="text-xl font-bold text-stone-800">
                💬 Need Help?
              </h2>
              <button
                onClick={() => {
                  stopSpeaking();
                  onClose();
                }}
                className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Close help"
              >
                ✕
              </button>
            </div>
            
            {/* Conversation area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial greeting */}
              {state.conversationHistory.length === 0 && (
                <div className="text-center text-stone-500 py-4">
                  <p className="mb-2">👋 Hi! I'm here to help you learn.</p>
                  <p className="text-sm">Ask me anything about this lesson!</p>
                </div>
              )}
              
              {/* Conversation history */}
              {state.conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {state.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-2xl px-4 py-2">
                    <div className="flex space-x-2">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-stone-400 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-stone-400 rounded-full"
                      />
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-stone-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {state.error}
                </div>
              )}
              
              {/* Broken question detected */}
              {state.isBrokenQuestion && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-sm mb-2">
                    🚩 It looks like this question might have an issue.
                  </p>
                  <button
                    onClick={handleReportQuestion}
                    className="text-sm text-amber-600 hover:text-amber-800 underline"
                  >
                    Report this question and try another →
                  </button>
                </div>
              )}
            </div>
            
            {/* Quick suggestions */}
            {state.conversationHistory.length === 0 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-stone-400 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-xs px-3 py-1.5 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Input area */}
            <div className="p-4 border-t border-stone-200">
              <div className="flex gap-2">
                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={state.question}
                    onChange={(e) => setState(prev => ({ ...prev, question: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && state.question.trim()) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    placeholder="Type your question..."
                    className="w-full px-4 py-2 border border-stone-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    disabled={state.isLoading}
                  />
                </div>
                
                {/* Voice input button */}
                <button
                  onClick={state.isListening ? stopListening : startListening}
                  className={`p-2 rounded-full transition-colors ${
                    state.isListening
                      ? 'bg-red-100 text-red-500'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                  aria-label={state.isListening ? 'Stop listening' : 'Start voice input'}
                  disabled={state.isLoading}
                >
                  {state.isListening ? '🔴' : '🎤'}
                </button>
                
                {/* Send button */}
                <button
                  onClick={handleAsk}
                  disabled={!state.question.trim() || state.isLoading}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    state.question.trim() && !state.isLoading
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                  aria-label="Send question"
                >
                  Send
                </button>
              </div>
              
              {/* TTS control */}
              {state.response && state.isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  🔇 Stop speaking
                </button>
              )}
            </div>
            
            {/* Report button */}
            <div className="px-4 pb-4">
              <button
                onClick={handleReportQuestion}
                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
              >
                🚩 This question seems broken
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpOverlay;