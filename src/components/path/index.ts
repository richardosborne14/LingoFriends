/**
 * LingoFriends - Path Components Barrel Export
 * 
 * This module exports all components related to the lesson path view,
 * which displays the skill path as a winding trail of lessons.
 * 
 * @module path
 */

// Main PathView component
export { PathView } from './PathView';
export type { PathViewProps } from './PathView';

// Individual lesson node component
export { LessonNode } from './LessonNode';
export type { LessonNodeProps } from './LessonNode';

// Path header component
export { PathHeader } from './PathHeader';
export type { PathHeaderProps } from './PathHeader';