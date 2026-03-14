/**
 * LingoFriends - NPC Quiz Modal Component
 *
 * A modal that displays when an NPC visitor quizzes the user.
 * Shows a translation challenge from the user's learned phrases.
 *
 * Features:
 * - Displays NPC character with avatar
 * - Translation quiz from learned chunks
 * - Voice input for answering
 * - Gem rewards for correct answers
 * - Streak tracking and display
 *
 * @module components/garden/NPCQuizModal
 * @see docs/phase-2-world-expansion/task-2.0-10-npc-garden-visitors.md
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NPCVisitor } from '../../services/npcVisitorManager';
import type { AvatarOptions } from '../../renderer/types';
import { useSounds } from '../../hooks/useSounds';

// ============================================
// TYPES
// ============================================

export interface NPCQuizModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  
  /** The NPC visitor data */
  visitor: NPCVisitor | null;
  
  /** Callback when user submits an answer */
  onAnswer: (visitorId: string, answer: string) => Promise<void>;
  
  /** Callback when user dismisses the NPC */
  onDismiss: (visitorId: string) => void;
  
  /** Current answer streak */
  streak?: number;
}

// ============================================
// COMPONENT
// ============================================

/**
 * NPCQuizModal - Translation quiz modal for garden NPC visitors.
 *
 * Usage:
 * ```tsx
 * <NPCQuizModal
 *   visible={showModal}
 *   visitor={activeVisitor}
 *   onAnswer={handleAnswer}
 *   onDismiss={handleDismiss}
 *   streak={currentStreak}
 * />
 * ```
 */
export const NPCQuizModal: React.FC<NPCQuizModalProps> = ({
  visible,
  visitor,
  onAnswer,
  onDismiss,
  streak = 0,
}) => {
  const { playTap } = useSounds();
  
  // State
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // ============================================
  // HANDLERS
  // ============================================
  
  /**
   * Handle answer submission.
   */
  const handleSubmit = useCallback(async () => {
    if (!visitor || !answer.trim() || isSubmitting) return;
    
    playTap();
    setIsSubmitting(true);
    
    try {
      // The parent component handles the actual answer checking
      await onAnswer(visitor.id, answer.trim());
      
      // Note: Result is determined by parent, we'll show feedback
      // based on whether the answer was correct
    } catch (error) {
      console.error('[NPCQuizModal] Answer submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [visitor, answer, isSubmitting, playTap, onAnswer]);
  
  /**
   * Handle voice input for answer.
   */
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[NPCQuizModal] Voice input not supported');
      return;
    }
    
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition; SpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition;
    
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = visitor?.chunk.nativeLanguage === 'de' ? 'de-DE' : 
                       visitor?.chunk.nativeLanguage === 'fr' ? 'fr-FR' : 
                       visitor?.chunk.nativeLanguage === 'es' ? 'es-ES' : 'en-US';
    
    recognition.onresult = (event: Event) => {
      const speechEvent = event as unknown as { results: { [index: number]: { [index: number]: { transcript: string } } } };
      const transcript = speechEvent.results[0][0].transcript;
      setAnswer(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
    setIsListening(true);
  }, [visitor]);
  
  /**
   * Handle skip/dismiss.
   */
  const handleSkip = useCallback(() => {
    if (!visitor) return;
    playTap();
    onDismiss(visitor.id);
  }, [visitor, playTap, onDismiss]);
  
  /**
   * Handle key press.
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && answer.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  }, [answer, handleSubmit]);
  
  // ============================================
  // RENDER
  // ============================================
  
  if (!visitor) return null;
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && handleSkip()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 overflow-hidden"
          >
            {/* Header with NPC avatar */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
              <div className="flex items-center gap-3">
                {/* NPC Avatar */}
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                  {visitor.character.avatar.gender === 'girl' ? '👩' : '👨'}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{visitor.character.name}</h3>
                  <p className="text-sm opacity-90">Challenge me! 💎</p>
                </div>
              </div>
              
              {/* Streak display */}
              {streak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <span>🔥</span>
                  <span>{streak} streak!</span>
                </div>
              )}
            </div>
            
            {/* Quiz content */}
            <div className="p-4">
              {/* Question */}
              <div className="bg-stone-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-stone-500 mb-1">Translate this phrase:</p>
                <p className="text-xl font-bold text-stone-800">
                  {visitor.chunk.targetPhrase}
                </p>
              </div>
              
              {/* Hint */}
              <p className="text-xs text-stone-400 mb-3">
                Type or speak the translation in {visitor.chunk.nativeLanguage.toUpperCase()}
              </p>
              
              {/* Answer input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Your answer..."
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={isSubmitting}
                  autoFocus
                />
                
                {/* Voice input button */}
                <button
                  onClick={isListening ? () => {} : startListening}
                  className={`p-2 rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-100 text-red-500 animate-pulse'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                  aria-label={isListening ? 'Listening...' : 'Voice input'}
                  disabled={isSubmitting}
                >
                  🎤
                </button>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-2 px-4 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                    answer.trim() && !isSubmitting
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Checking...' : 'Submit'}
                </button>
              </div>
            </div>
            
            {/* Reward info */}
            <div className="px-4 pb-3">
              <p className="text-xs text-center text-stone-400">
                Correct answer: 💎 5 gems {streak > 0 && `+ 🔥 ${streak * 2} bonus`}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NPCQuizModal;