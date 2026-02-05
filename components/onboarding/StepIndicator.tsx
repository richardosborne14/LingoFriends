/**
 * LingoFriends - Step Indicator Component
 * 
 * Shows progress through the onboarding flow with dots and checkmarks.
 * Displays: ✓ ● ○ pattern (completed, current, upcoming)
 * 
 * @module onboarding/StepIndicator
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface StepIndicatorProps {
  /** Total number of steps in the flow */
  totalSteps: number;
  /** Current step (1-indexed) */
  currentStep: number;
  /** Optional: Show step labels below dots */
  showLabels?: boolean;
  /** Optional: Step labels (must match totalSteps length) */
  labels?: string[];
}

// ============================================
// COMPONENT
// ============================================

/**
 * Step Indicator Component
 * 
 * Displays a row of dots showing progress through a multi-step flow.
 * - Completed steps show a checkmark (✓)
 * - Current step is highlighted and larger
 * - Upcoming steps are dimmed
 * 
 * @example
 * <StepIndicator totalSteps={3} currentStep={2} />
 * // Renders: ✓ ● ○
 */
export function StepIndicator({ 
  totalSteps, 
  currentStep, 
  showLabels = false,
  labels = [] 
}: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Dots row */}
      <div className="flex items-center gap-3">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={stepNumber}>
              {/* Connector line (between dots, not before first) */}
              {index > 0 && (
                <motion.div
                  className={`h-0.5 w-8 rounded-full ${
                    isCompleted || isCurrent
                      ? 'bg-[#58CC02]' // Green for completed/current
                      : 'bg-[#e5e5e5]' // Gray for upcoming
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                />
              )}

              {/* Step dot */}
              <motion.div
                className={`
                  relative flex items-center justify-center rounded-full
                  transition-all duration-300
                  ${isCurrent 
                    ? 'w-10 h-10 bg-[#58CC02] shadow-lg shadow-[#58CC02]/30' 
                    : isCompleted
                      ? 'w-8 h-8 bg-[#58CC02]'
                      : 'w-8 h-8 bg-[#e5e5e5]'
                  }
                `}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: index * 0.1 
                }}
                whileHover={{ scale: 1.1 }}
              >
                {/* Completed checkmark */}
                {isCompleted && (
                  <motion.svg
                    className="w-4 h-4 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                )}

                {/* Current step number */}
                {isCurrent && (
                  <motion.span
                    className="text-white font-bold text-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {stepNumber}
                  </motion.span>
                )}

                {/* Upcoming dot (empty) */}
                {isUpcoming && (
                  <span className="text-[#a3a3a3] font-medium text-xs">
                    {stepNumber}
                  </span>
                )}

                {/* Current step pulse animation */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#58CC02]"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                )}
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Optional step labels */}
      {showLabels && labels.length === totalSteps && (
        <div className="flex items-center mt-2 gap-3">
          {labels.map((label, index) => {
            const stepNumber = index + 1;
            const isCurrent = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <motion.span
                key={label}
                className={`text-xs font-medium whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#58CC02]'
                    : isCompleted
                      ? 'text-[#525252]'
                      : 'text-[#a3a3a3]'
                }`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                {label}
              </motion.span>
            );
          })}
        </div>
      )}

      {/* Step counter text */}
      <motion.p
        className="text-sm text-[#737373] mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Step {currentStep} of {totalSteps}
      </motion.p>
    </div>
  );
}

export default StepIndicator;
