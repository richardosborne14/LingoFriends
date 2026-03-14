/**
 * LingoFriends - Activity Components - Barrel Export
 * 
 * This file exports all activity components and utilities for easy importing.
 * 
 * @module activities
 */

// ============================================
// ACTIVITY COMPONENTS
// ============================================

export { MultipleChoice } from './MultipleChoice';
export { FillBlank } from './FillBlank';
export { WordArrange } from './WordArrange';
export { TrueFalse } from './TrueFalse';
export { MatchingPairs } from './MatchingPairs';
export { Translate } from './Translate';

// ============================================
// ROUTER AND UTILITIES
// ============================================

export { ActivityRouter, getActivityTypeName, requiresTextInput, getActivityDifficultyRange } from './ActivityRouter';
export type { ActivityProps } from './ActivityRouter';

// ============================================
// SHARED COMPONENTS
// ============================================

export { ActivityWrapper, SunDropIcon, HelpPanel } from './ActivityWrapper';
export type { ActivityWrapperProps } from './ActivityWrapper';