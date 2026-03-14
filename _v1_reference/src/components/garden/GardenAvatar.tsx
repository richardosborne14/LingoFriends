/**
 * GardenAvatar Component
 * 
 * The player's avatar that walks around the garden world.
 * Uses emoji representation (Phase 1.1) with sprites coming in Phase D (Task 1.1.14).
 * 
 * Features:
 * - Smooth position interpolation via framer-motion
 * - Direction-based sprite flipping (left/right)
 * - Shadow underneath for depth
 * - Walking animation (future enhancement)
 * 
 * @module GardenAvatar
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { PlayerAvatar } from '../../types/game';

/**
 * Props for the GardenAvatar component
 */
export interface GardenAvatarProps {
  /** Player avatar configuration */
  avatar: PlayerAvatar;
  /** Current position in the garden (pixels) */
  position: { x: number; y: number };
  /** Direction the avatar is facing */
  facing: 'up' | 'down' | 'left' | 'right';
}

/**
 * GardenAvatar Component
 * 
 * Renders the player's avatar in the garden world.
 * The avatar is positioned absolutely within the garden container.
 * 
 * @param props - Component props
 * @param props.avatar - Avatar configuration with emoji and name
 * @param props.position - Current x,y position in pixels
 * @param props.facing - Direction avatar is facing
 * @returns JSX element representing the avatar
 * 
 * @example
 * <GardenAvatar
 *   avatar={{ id: '1', emoji: '🦊', name: 'Foxy' }}
 *   position={{ x: 320, y: 440 }}
 *   facing="down"
 * />
 */
export const GardenAvatar: React.FC<GardenAvatarProps> = ({
  avatar,
  position,
  facing,
}) => {
  // Avatar size constants
  const AVATAR_SIZE = 40;
  const EMOJI_SIZE = 22;

  return (
    <motion.div
      animate={{
        x: position.x - AVATAR_SIZE / 2,
        y: position.y - AVATAR_SIZE / 2,
      }}
      transition={{
        type: 'tween',
        duration: 0.08, // Fast for responsive movement
      }}
      style={{
        position: 'absolute',
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        zIndex: 30, // Above trees and decorations
      }}
      role="img"
      aria-label={`${avatar.name} - your avatar`}
    >
      {/* Avatar body with gradient background */}
      <div
        style={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: '50%',
          // Gradient background matching prototype styling
          background: 'linear-gradient(135deg, #34D399, #10B981)', // green-400 to green-500
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: EMOJI_SIZE,
          // Flip sprite when facing left
          transform: facing === 'left' ? 'scaleX(-1)' : 'none',
          // White border with green outline
          boxShadow: '0 0 0 3px #fff, 0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        {avatar.emoji}
      </div>

      {/* Shadow underneath for depth effect */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: 6,
          width: 28,
          height: 8,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)',
        }}
      />
    </motion.div>
  );
};

export default GardenAvatar;