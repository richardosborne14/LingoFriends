/**
 * LingoFriends - Info Display Component
 * 
 * Teaching step that displays information without a quiz.
 * This is the INTRODUCE step in the teach-first pedagogy.
 * 
 * Shows:
 * - Word/phrase in target language
 * - Translation in native language
 * - Explanation of usage
 * - Example context
 * 
 * User clicks "Got it!" to continue - no answer required.
 * 
 * @module InfoDisplay
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ActivityConfig } from '../../../types/game';
import { GameActivityType } from '../../../types/game';

// ============================================
// TYPES
// ============================================

export interface InfoDisplayProps {
  /** Activity configuration */
  data: ActivityConfig;
  /** Callback when user acknowledges the info */
  onComplete: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * InfoDisplay - Teaching step that shows information.
 * 
 * This is NOT a quiz - it's a teaching step where the user
 * learns new content before being tested on it.
 * 
 * The user simply reads the information and clicks "Got it!"
 * to continue to the next step.
 */
export const InfoDisplay: React.FC<InfoDisplayProps> = ({
  data,
  onComplete,
}) => {
  const [isReady, setIsReady] = useState(false);
  
  // Enable continue button after a brief reading delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500); // 1.5 seconds minimum reading time
    
    return () => clearTimeout(timer);
  }, []);
  
  // Extract data
  const title = data.title || 'New Word';
  const content = data.content || '';
  const explanation = data.explanation || data.hint || '';
  const example = data.example || '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-5 border-2 border-sky-200 shadow-lg"
    >
      {/* Header with book icon */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">📚</span>
        <span className="font-bold text-lg text-sky-700">Learn Something New!</span>
      </div>
      
      {/* Main content card */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        {/* Title / Word */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {title}
        </h2>
        
        {/* Translation / Content */}
        {content && (
          <p className="text-lg text-slate-700 font-medium mb-3">
            {content}
          </p>
        )}
        
        {/* Explanation */}
        {explanation && (
          <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 mb-3">
            <span className="text-lg">💡</span>
            <p className="text-sm text-slate-600 leading-relaxed">
              {explanation}
            </p>
          </div>
        )}
        
        {/* Example usage */}
        {example && (
          <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
            <span className="text-lg">💬</span>
            <div>
              <p className="text-xs text-green-600 font-semibold mb-1">Example:</p>
              <p className="text-sm text-slate-700 italic">
                {example}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Continue button */}
      <motion.button
        whileTap={isReady ? { scale: 0.95 } : undefined}
        onClick={isReady ? onComplete : undefined}
        disabled={!isReady}
        className={`w-full py-3 rounded-2xl font-bold text-lg transition-all ${
          isReady
            ? 'bg-[#58CC02] text-white shadow-lg cursor-pointer'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
        style={isReady ? { boxShadow: '0 4px 0 0 rgba(88, 204, 2, 0.3)' } : {}}
      >
        {isReady ? (
          <>Got it! →</>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            Reading...
          </span>
        )}
      </motion.button>
      
      {/* Helper text */}
      {!isReady && (
        <p className="text-center text-xs text-slate-400 mt-2">
          Take a moment to read and remember this!
        </p>
      )}
    </motion.div>
  );
};

/**
 * Type guard to check if activity is INFO type
 */
export function isInfoActivity(data: ActivityConfig): boolean {
  return data.type === GameActivityType.INFO;
}

export default InfoDisplay;