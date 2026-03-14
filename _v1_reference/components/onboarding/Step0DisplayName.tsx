/**
 * LingoFriends - Onboarding Step 0: Display Name
 * 
 * Pre-step to collect display name if not already set.
 * This is shown only if the user's name is empty or "Learner".
 * 
 * @module onboarding/Step0DisplayName
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../ui';
import type { NativeLanguage } from '../../types';
import { getOnboardingTranslations } from './translations';

// ============================================
// TYPES
// ============================================

export interface Step0DisplayNameProps {
  /** Current display name (might be empty or "Learner") */
  currentName: string;
  /** Called when name changes */
  onNameChange: (name: string) => void;
  /** Current display language for translations */
  displayLanguage: NativeLanguage;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Step 0: Display Name Collection
 * 
 * Simple input for the user's display name.
 * Pre-filled if they already have a name from signup.
 */
export function Step0DisplayName({ 
  currentName, 
  onNameChange,
  displayLanguage 
}: Step0DisplayNameProps) {
  const t = getOnboardingTranslations(displayLanguage);
  
  // Local state for input
  const [name, setName] = useState(
    currentName === 'Learner' || !currentName ? '' : currentName
  );

  // Sync name changes up
  useEffect(() => {
    onNameChange(name);
  }, [name, onNameChange]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.span
          className="text-6xl mb-4 inline-block"
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            repeatDelay: 2 
          }}
        >
          👋
        </motion.span>
        
        <h2 className="text-2xl md:text-3xl font-bold text-[#262626] mb-2">
          {displayLanguage === 'French' ? "Comment tu t'appelles ?" : "What's your name?"}
        </h2>
        <p className="text-[#737373]">
          {displayLanguage === 'French' 
            ? "C'est comme ça que ton ami d'apprentissage t'appellera !" 
            : "This is what your learning buddy will call you!"}
        </p>
      </motion.div>

      {/* Name Input */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder={displayLanguage === 'French' ? "Ton prénom..." : "Your name..."}
          className="text-center text-xl"
          autoFocus
        />
        
        <p className="text-xs text-[#a3a3a3] text-center mt-2">
          {displayLanguage === 'French' 
            ? "Tu peux toujours le changer plus tard dans les paramètres" 
            : "You can always change it later in settings"}
        </p>
      </motion.div>

      {/* Fun decoration */}
      {name && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <span className="text-[#58CC02] font-bold text-lg">
            {displayLanguage === 'French' ? 'Super' : 'Nice'}, {name}! ✨
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default Step0DisplayName;
