/**
 * LingoFriends - Lesson Components Barrel Export
 * 
 * This module exports all lesson-related components for the
 * learning flow, including the main LessonView container,
 * activity components, and supporting UI elements.
 * 
 * @module lesson
 */

// Main container
export { LessonView } from './LessonView';
export type { LessonViewProps, LessonResult } from './LessonView';

// Supporting components
export { TutorBubble } from './TutorBubble';
export type { TutorBubbleProps } from './TutorBubble';

export { SunDropBurst } from './SunDropBurst';
export type { SunDropBurstProps } from './SunDropBurst';

export { PenaltyBurst } from './PenaltyBurst';
export type { PenaltyBurstProps } from './PenaltyBurst';

export { SunDropCounter } from './SunDropCounter';
export type { SunDropCounterProps } from './SunDropCounter';

export { LessonComplete } from './LessonComplete';
export type { LessonCompleteProps } from './LessonComplete';

// Re-export activity components
export {
  ActivityRouter,
  getActivityTypeName,
  requiresTextInput,
  getActivityDifficultyRange,
} from './activities/ActivityRouter';
export type { ActivityProps } from './activities/ActivityRouter';

export { ActivityWrapper } from './activities/ActivityWrapper';
export type { ActivityWrapperProps } from './activities/ActivityWrapper';

export { MultipleChoice } from './activities/MultipleChoice';
export { FillBlank } from './activities/FillBlank';
export { WordArrange } from './activities/WordArrange';
export { TrueFalse } from './activities/TrueFalse';
export { MatchingPairs } from './activities/MatchingPairs';
export { Translate } from './activities/Translate';