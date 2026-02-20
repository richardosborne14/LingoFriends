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
        />
      );

    case GameActivityType.FILL_BLANK:
      return (
        <FillBlank
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
        />
      );

    case GameActivityType.WORD_ARRANGE:
      return (
        <WordArrange
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
        />
      );

    case GameActivityType.TRUE_FALSE:
      return (
        <TrueFalse
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
        />
      );

    case GameActivityType.MATCHING:
      return (
        <MatchingPairs
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
        />
      );

    case GameActivityType.TRANSLATE:
      return (
        <Translate
          data={data}
          helpText={helpText}
          onComplete={onComplete}
          onWrong={onWrong}
        />
      );

    case GameActivityType.INFO:
      // INFO is a teaching step - always completes with 0 sunDrops (no quiz)
      return (
        <InfoDisplay
          data={data}
          onComplete={() => onComplete(true, 0)}
        />
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
  };
  return ranges[type] || [1, 2];
}

export default ActivityRouter;