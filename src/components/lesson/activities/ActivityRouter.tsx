/**
 * LingoFriends - Activity Router Component
 * 
 * Routes to the appropriate activity component based on the activity type.
 * Provides a unified interface for rendering any activity type.
 * 
 * @module ActivityRouter
 */

import React from 'react';
import { GameActivityType, ActivityConfig } from '../../../types/game';
import type { TargetLanguage } from '../../../../types';
import { MultipleChoice } from './MultipleChoice';
import { FillBlank } from './FillBlank';
import { WordArrange } from './WordArrange';
import { TrueFalse } from './TrueFalse';
import { MatchingPairs } from './MatchingPairs';
import { Translate } from './Translate';
import { InfoDisplay } from './InfoDisplay';

// ============================================
// TYPES
// ============================================

/**
 * Common props shared by all activity components.
 */
export interface ActivityProps {
  /** Activity configuration */
  data: ActivityConfig;
  /** Hint text for help button */
  helpText: string;
  /** Callback when activity is completed correctly */
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  /** Callback when wrong answer is given (for penalty tracking) */
  onWrong: () => void;
  /** Callback when user skips the question (optional - advances without reward/penalty) */
  onSkip?: () => void;
  /** Callback when user reports a broken question (optional - triggers regeneration) */
  onReport?: () => void;
  /** Whether a report is currently being processed */
  isReporting?: boolean;
  /**
   * Target language code (e.g. 'German', 'French') for STT on Translate activities.
   * Passed through to Translate so recognition.lang targets the correct language.
   */
  targetLanguage?: TargetLanguage;
  /**
   * Callback to open the AI help overlay from within an activity.
   * Wired by LessonView so activities can surface the full AI assistant
   * as a second tier after the local static help hint.
   */
  onOpenHelp?: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * ActivityRouter - Renders the correct activity component based on type.
 * 
 * This component abstracts away the activity type switching logic,
 * providing a single entry point for rendering any activity.
 * 
 * @example
 * <ActivityRouter
 *   data={{
 *     type: GameActivityType.MULTIPLE_CHOICE,
 *     question: "What is 'bonjour'?",
 *     options: ["Hello", "Goodbye", "Thanks", "Please"],
 *     correctIndex: 0,
 *     sunDrops: 2,
 *   }}
 *   helpText="This is a common greeting"
 *   onComplete={(correct, drops) => console.log(correct, drops)}
 *   onWrong={() => console.log('Wrong answer')}
 * />
 */
export const ActivityRouter: React.FC<ActivityProps> = ({
  data,
  helpText,
  onComplete,
  onWrong,
  onSkip,
  onReport,
  isReporting,
  targetLanguage,
  onOpenHelp,
}) => {
  // Route to the correct component based on activity type
  switch (data.type) {
    case GameActivityType.MULTIPLE_CHOICE:
      return (
        <MultipleChoice
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
        />
      );

    case GameActivityType.FILL_BLANK:
      return (
        <FillBlank
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
        />
      );

    case GameActivityType.WORD_ARRANGE:
      return (
        <WordArrange
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
        />
      );

    case GameActivityType.TRUE_FALSE:
      return (
        <TrueFalse
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
        />
      );

    case GameActivityType.MATCHING:
      return (
        <MatchingPairs
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
        />
      );

    case GameActivityType.TRANSLATE:
      return (
        <Translate
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
          onSkip={onSkip}
          onReport={onReport}
          isReporting={isReporting}
          targetLanguage={targetLanguage}
          onOpenHelp={onOpenHelp}
        />
      );

    case GameActivityType.INFO:
      // INFO is a teaching step - always completes with 0 sunDrops (no quiz)
      // onSkip is not used for INFO since there's no skip button
      return (
        <InfoDisplay
          data={data}
          onComplete={() => onComplete(true, 0)}
        />
      );

    case GameActivityType.COACHING_CHAT:
      // Phase 3: Coached discovery step.
      // The CoachingChat component is implemented in Task 3.4.
      // Until then, fall through to the default error display.
      // This case is here to satisfy exhaustive Record checks in TypeScript.
      console.warn('[ActivityRouter] COACHING_CHAT should be rendered by CoachingChat component, not ActivityRouter');
      // Fallthrough intentional — show error until Task 3.4 wires CoachingChat
      return (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-700">
          <p className="font-bold">🚧 Coaching step coming soon!</p>
          <p className="text-sm">This feature is being implemented in Task 3.4.</p>
          <button
            className="mt-2 px-4 py-2 bg-amber-400 rounded-lg text-white text-sm"
            onClick={() => onComplete(true, 0)}
          >
            Continue →
          </button>
        </div>
      );

    default:
      // Fallback for unknown types - should not happen in production
      console.error(`Unknown activity type: ${data.type}`);
      return (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-600">
          <p className="font-bold">Unknown activity type: {data.type}</p>
          <p className="text-sm">This activity type is not yet implemented.</p>
        </div>
      );
  }
};

/**
 * Get a human-readable name for an activity type.
 * Useful for debugging and analytics.
 */
export function getActivityTypeName(type: GameActivityType): string {
  const names: Record<GameActivityType, string> = {
    [GameActivityType.INFO]: 'Learn',
    [GameActivityType.MULTIPLE_CHOICE]: 'Multiple Choice',
    [GameActivityType.FILL_BLANK]: 'Fill in the Blank',
    [GameActivityType.WORD_ARRANGE]: 'Word Arrange',
    [GameActivityType.TRUE_FALSE]: 'True or False',
    [GameActivityType.MATCHING]: 'Matching Pairs',
    [GameActivityType.TRANSLATE]: 'Translate',
    // Phase 3: coaching discovery step — non-graded, warm NPC exchange
    [GameActivityType.COACHING_CHAT]: 'Discover',
  };
  return names[type] || 'Unknown Activity';
}

/**
 * Check if an activity type requires text input.
 * Useful for deciding whether to show keyboard on mobile.
 */
export function requiresTextInput(type: GameActivityType): boolean {
  return type === GameActivityType.FILL_BLANK || type === GameActivityType.TRANSLATE;
}

/**
 * Get the typical difficulty range for an activity type.
 * Returns [min, max] Sun Drop values.
 */
export function getActivityDifficultyRange(type: GameActivityType): [number, number] {
  const ranges: Record<GameActivityType, [number, number]> = {
    [GameActivityType.INFO]: [0, 0],               // No quiz, no sun drops
    [GameActivityType.MULTIPLE_CHOICE]: [1, 2],    // Easier, options given
    [GameActivityType.TRUE_FALSE]: [1, 1],          // Easiest, 50/50 chance
    [GameActivityType.MATCHING]: [2, 3],            // Medium, visual matching
    [GameActivityType.FILL_BLANK]: [2, 3],          // Medium, recall required
    [GameActivityType.WORD_ARRANGE]: [3, 4],        // Harder, construction
    [GameActivityType.TRANSLATE]: [3, 4],           // Harder, production
    // Phase 3: coaching is non-graded discovery — always 0 SunDrops
    [GameActivityType.COACHING_CHAT]: [0, 0],
  };
  return ranges[type] || [1, 2];
}

export default ActivityRouter;