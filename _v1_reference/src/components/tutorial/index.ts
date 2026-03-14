/**
 * Tutorial Components
 *
 * First-run tutorial system for LingoFriends.
 *
 * Usage:
 *   1. Wrap app root with <TutorialProvider>
 *   2. Place <TutorialStep> components adjacent to the UI they describe
 *   3. Call useTutorial() anywhere to read/advance state
 *
 * @module tutorial
 */

export { TutorialProvider, useTutorial } from './TutorialManager';
export type { TutorialStep as TutorialStepType } from './TutorialManager';

export { TutorialOverlay } from './TutorialOverlay';
export type { TutorialOverlayProps } from './TutorialOverlay';

export { TutorialStep } from './TutorialStep';
export type { TutorialStepProps } from './TutorialStep';
