/**
 * LingoFriends - Encounter View Component
 *
 * React wrapper for the Three.js EncounterScene.
 * Renders the RPG-style avatar encounter at the top of the lesson screen.
 *
 * Features:
 * - Each step generates a new NPC (deterministic via seed)
 * - Final step is a "boss" encounter with special styling
 * - Mouth animation driven by audio playback state
 * - Responsive height for mobile/desktop
 *
 * @module components/lesson/EncounterView
 * @see docs/phase-1.3-activity-improvements/task-3-npc-avatar-encounters.md
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { EncounterScene } from '../../renderer/EncounterScene';
import {
  generateNPC,
  lessonIdToSeed,
  type NPCConfig,
} from '../../services/npcGenerator';
import type { AvatarOptions } from '../../renderer/types';
import { DEFAULT_AVATAR } from '../../renderer/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the EncounterView component.
 */
export interface EncounterViewProps {
  /** User's avatar options from their profile */
  userAvatar?: AvatarOptions;
  /** Current lesson step index (0-based) */
  stepIndex: number;
  /** Total steps in the lesson */
  totalSteps: number;
  /** Lesson ID for deterministic NPC generation */
  lessonId: string;
  /** Whether audio is currently playing (drives mouth animation) */
  isAudioPlaying: boolean;
  /** Height of the encounter scene in pixels (default: responsive) */
  height?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get responsive height based on viewport.
 * Shorter on mobile to leave room for activity UI.
 */
function getResponsiveHeight(): number {
  if (typeof window === 'undefined') return 180;
  return window.innerWidth < 640 ? 140 : 180;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EncounterView — renders the RPG-style avatar encounter at the top of the lesson.
 *
 * Each step generates a new NPC. The final step is a "boss" encounter.
 * Mouth animation is driven by the `isAudioPlaying` prop.
 *
 * @example
 * <EncounterView
 *   userAvatar={userAvatarOptions}
 *   stepIndex={currentStepIndex}
 *   totalSteps={lesson.steps.length}
 *   lessonId={lesson.id}
 *   isAudioPlaying={isAudioPlaying}
 *   height={180}
 * />
 */
export const EncounterView: React.FC<EncounterViewProps> = ({
  userAvatar = DEFAULT_AVATAR,
  stepIndex,
  totalSteps,
  lessonId,
  isAudioPlaying,
  height,
}) => {
  // ── Refs ──────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EncounterScene | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouthAnimationRef = useRef<number>(0);

  // ── Responsive height ──────────────────────────────────────────────
  const sceneHeight = height ?? getResponsiveHeight();

  // ── Generate NPC config for current step (memoized) ────────────────
  const npcConfig: NPCConfig = useMemo(() => {
    const seed = lessonIdToSeed(lessonId);
    return generateNPC(stepIndex, totalSteps, seed);
  }, [stepIndex, totalSteps, lessonId]);

  // ── Determine if this is a boss encounter ───────────────────────────
  const isBoss = npcConfig.role === 'boss';

  // ── Scene lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;

    // Dispose previous scene
    sceneRef.current?.dispose();

    // Create new scene for this step's NPC
    const scene = new EncounterScene({
      userAvatar,
      npc: npcConfig,
      canvas,
      width,
      height: sceneHeight,
    });

    scene.start();
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [npcConfig, userAvatar, sceneHeight]);

  // ── Mouth animation driven by audio state ───────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;

    if (!isAudioPlaying) {
      sceneRef.current.setMouthOpenness(0);
      if (mouthAnimationRef.current) {
        cancelAnimationFrame(mouthAnimationRef.current);
        mouthAnimationRef.current = 0;
      }
      return;
    }

    // Simulate mouth movement with oscillation while audio plays.
    // A more advanced approach would use Web Audio API's AnalyserNode
    // to get real amplitude data. This is a good v1.
    const startTime = Date.now();

    const animateMouth = () => {
      if (!sceneRef.current) return;

      const elapsed = (Date.now() - startTime) / 1000;
      // Oscillate between 0.1 and 0.8 at ~6Hz (natural speech rate)
      const openness = 0.1 + Math.abs(Math.sin(elapsed * Math.PI * 6)) * 0.7;
      // Add some randomness for natural feel
      const jitter = (Math.random() - 0.5) * 0.15;
      sceneRef.current.setMouthOpenness(Math.max(0, Math.min(1, openness + jitter)));

      mouthAnimationRef.current = requestAnimationFrame(animateMouth);
    };

    animateMouth();

    return () => {
      if (mouthAnimationRef.current) {
        cancelAnimationFrame(mouthAnimationRef.current);
        mouthAnimationRef.current = 0;
      }
      sceneRef.current?.setMouthOpenness(0);
    };
  }, [isAudioPlaying]);

  // ── Resize handler ─────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !sceneRef.current) return;
    sceneRef.current.resize(container.clientWidth, sceneHeight);
  }, [sceneHeight]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`w-full relative overflow-hidden rounded-b-2xl ${
        isBoss
          ? 'bg-gradient-to-b from-amber-100 via-yellow-50 to-transparent'
          : 'bg-gradient-to-b from-sky-100 via-blue-50 to-transparent'
      }`}
      style={{ height: sceneHeight }}
    >
      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Boss encounter badge */}
      {isBoss && (
        <div className="absolute top-2 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
          ⭐ Final Challenge!
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default EncounterView;