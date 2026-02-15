/**
 * GardenWorld Component
 * 
 * The main garden view and home screen of the LingoFriends app.
 * Features an explorable 2D world where the player's avatar walks around
 * and interacts with skill trees.
 * 
 * Features:
 * - Avatar movement via keyboard (arrow keys, WASD)
 * - Proximity detection for tree interactions
 * - Mobile D-pad for touch controls
 * - Decorative garden elements (pond, flowers, paths)
 * - Interaction panel when near trees
 * 
 * @module GardenWorld
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GardenTree } from './GardenTree';
import { GardenAvatar } from './GardenAvatar';
import { InteractionPanel } from './InteractionPanel';
import { MobileDpad } from './MobileDpad';
import type { UserTree, PlayerAvatar } from '../../types/game';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Garden dimensions */
const GARDEN_WIDTH = 650;
const GARDEN_HEIGHT = 520;

/** Avatar movement speed (pixels per frame at 60fps) */
const AVATAR_SPEED = 5;

/** Distance at which tree interaction panel appears */
const INTERACTION_DISTANCE = 70;

/** Avatar boundary padding */
const AVATAR_PADDING = 20;

/** Movement delta for D-pad (touch) controls */
const TOUCH_MOVE_DELTA = 20;

/** Decorative elements configuration */
interface Decoration {
  x: number;
  y: number;
  emoji: string;
  size: number;
}

const DECORATIONS: Decoration[] = [
  { x: 30, y: 60, emoji: '🌻', size: 18 },
  { x: 580, y: 80, emoji: '🌼', size: 16 },
  { x: 50, y: 320, emoji: '🌷', size: 15 },
  { x: 600, y: 380, emoji: '🌻', size: 17 },
  { x: 200, y: 460, emoji: '🌼', size: 14 },
  { x: 520, y: 460, emoji: '🌷', size: 16 },
  { x: 90, y: 140, emoji: '🦋', size: 14 },
  { x: 540, y: 170, emoji: '🐝', size: 12 },
  { x: 350, y: 60, emoji: '🦋', size: 13 },
  { x: 170, y: 80, emoji: '🪨', size: 16 },
  { x: 480, y: 120, emoji: '🪨', size: 14 },
  { x: 580, y: 300, emoji: '🍄', size: 14 },
  { x: 40, y: 430, emoji: '🍄', size: 13 },
];

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for the GardenWorld component
 */
export interface GardenWorldProps {
  /** User's trees in the garden */
  trees: UserTree[];
  /** Player avatar configuration */
  avatar: PlayerAvatar;
  /** Callback when a path is opened from a tree */
  onOpenPath: (tree: UserTree) => void;
  /** Callback when decorate is clicked */
  onDecorate?: (tree: UserTree) => void;
  /** Callback when gift is clicked */
  onGift?: (tree: UserTree) => void;
  /** Optional initial avatar position */
  initialPosition?: { x: number; y: number };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two points
 */
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find the nearest tree within interaction distance
 */
const findNearestTree = (
  position: { x: number; y: number },
  trees: UserTree[],
  maxDistance: number
): UserTree | null => {
  let nearest: { tree: UserTree; distance: number } | null = null;

  for (const tree of trees) {
    const distance = getDistance(position, tree.position);
    if (distance < maxDistance) {
      if (!nearest || distance < nearest.distance) {
        nearest = { tree, distance };
      }
    }
  }

  return nearest?.tree ?? null;
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GardenWorld Component
 * 
 * Renders the explorable garden world with:
 * - Decorative background (grass, pond, paths)
 * - Trees positioned in the garden
 * - Avatar with movement controls
 * - Interaction panel for nearby trees
 * - Mobile D-pad for touch devices
 * 
 * @param props - Component props
 * @returns Garden world component
 * 
 * @example
 * <GardenWorld
 *   trees={userTrees}
 *   avatar={playerAvatar}
 *   onOpenPath={(tree) => navigate('/path', { tree })}
 * />
 */
export const GardenWorld: React.FC<GardenWorldProps> = ({
  trees,
  avatar,
  onOpenPath,
  onDecorate,
  onGift,
  initialPosition = { x: 320, y: 440 },
}) => {
  // Avatar position state
  const [avatarPosition, setAvatarPosition] = useState(initialPosition);
  const [facing, setFacing] = useState<'up' | 'down' | 'left' | 'right'>('down');
  
  // Tree interaction state
  const [nearTree, setNearTree] = useState<UserTree | null>(null);
  
  // Ref for keys currently pressed (for smooth movement)
  const keysPressed = useRef<Set<string>>(new Set());
  
  // Ref for animation frame
  const animationFrameRef = useRef<number>();

  // ==========================================================================
  // KEYBOARD CONTROLS
  // ==========================================================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
      if (validKeys.includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ==========================================================================
  // GAME LOOP (MOVEMENT)
  // ==========================================================================
  
  useEffect(() => {
    const gameLoop = () => {
      const keys = keysPressed.current;

      setAvatarPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        // Calculate movement
        if (keys.has('ArrowUp') || keys.has('w')) {
          newY -= AVATAR_SPEED;
          setFacing('up');
        }
        if (keys.has('ArrowDown') || keys.has('s')) {
          newY += AVATAR_SPEED;
          setFacing('down');
        }
        if (keys.has('ArrowLeft') || keys.has('a')) {
          newX -= AVATAR_SPEED;
          setFacing('left');
        }
        if (keys.has('ArrowRight') || keys.has('d')) {
          newX += AVATAR_SPEED;
          setFacing('right');
        }

        // Apply boundaries
        newX = Math.max(AVATAR_PADDING, Math.min(GARDEN_WIDTH - AVATAR_PADDING, newX));
        newY = Math.max(AVATAR_PADDING, Math.min(GARDEN_HEIGHT - AVATAR_PADDING, newY));

        return { x: newX, y: newY };
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // PROXIMITY DETECTION
  // ==========================================================================
  
  useEffect(() => {
    const nearest = findNearestTree(avatarPosition, trees, INTERACTION_DISTANCE);
    setNearTree(nearest);
  }, [avatarPosition, trees]);

  // ==========================================================================
  // TOUCH CONTROLS HANDLER
  // ==========================================================================
  
  const handleTouchMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setAvatarPosition((prev) => {
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY -= TOUCH_MOVE_DELTA;
          break;
        case 'down':
          newY += TOUCH_MOVE_DELTA;
          break;
        case 'left':
          newX -= TOUCH_MOVE_DELTA;
          break;
        case 'right':
          newX += TOUCH_MOVE_DELTA;
          break;
      }

      // Apply boundaries
      newX = Math.max(AVATAR_PADDING, Math.min(GARDEN_WIDTH - AVATAR_PADDING, newX));
      newY = Math.max(AVATAR_PADDING, Math.min(GARDEN_HEIGHT - AVATAR_PADDING, newY));

      return { x: newX, y: newY };
    });
    setFacing(direction);
  }, []);

  // ==========================================================================
  // ACTION HANDLERS
  // ==========================================================================
  
  const handleOpenPath = useCallback(() => {
    if (nearTree) {
      onOpenPath(nearTree);
    }
  }, [nearTree, onOpenPath]);

  const handleDecorate = useCallback(() => {
    if (nearTree && onDecorate) {
      onDecorate(nearTree);
    }
  }, [nearTree, onDecorate]);

  const handleGift = useCallback(() => {
    if (nearTree && onGift) {
      onGift(nearTree);
    }
  }, [nearTree, onGift]);

  // Calculate responsive garden width (safe for SSR)
  const [gardenWidth, setGardenWidth] = React.useState(GARDEN_WIDTH);
  
  useEffect(() => {
    const updateWidth = () => {
      setGardenWidth(Math.min(GARDEN_WIDTH, window.innerWidth - 20));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div
      style={{
        padding: '10px 0 90px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Title and instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: 'center',
          marginBottom: 12,
          padding: '0 16px',
        }}
      >
        <h2
          style={{
            fontFamily: "'Lilita One', sans-serif",
            fontSize: 24,
            color: '#047857', // green-700
            marginBottom: 2,
          }}
        >
          🌳 Your Garden
        </h2>
        <p
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: '#94A3B8', // slate-400
          }}
        >
          Walk around with arrow keys or WASD · Approach a tree to interact
        </p>
      </motion.div>

      {/* Garden viewport */}
      <div
        tabIndex={0}
        style={{
          width: gardenWidth,
          height: GARDEN_HEIGHT,
          position: 'relative',
          borderRadius: 22,
          overflow: 'hidden',
          border: '3px solid #86EFAC', // green-300
          boxShadow: '0 4px 24px rgba(134, 239, 172, 0.4)',
          outline: 'none',
          cursor: 'default',
        }}
      >
        {/* Background layers */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at 30% 70%, #C8E6C0 0%, transparent 50%),
              radial-gradient(ellipse at 70% 30%, #D4EDBC 0%, transparent 40%),
              radial-gradient(ellipse at 50% 50%, #B8D4A8 0%, transparent 60%),
              linear-gradient(180deg, #A8D5A0 0%, #8FBF87 30%, #7BAF72 60%, #6D9F65 100%)
            `,
          }}
        />

        {/* Dirt path */}
        <svg
          style={{ position: 'absolute', inset: 0 }}
          viewBox={`0 0 ${GARDEN_WIDTH} ${GARDEN_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <path
            d={`M320 ${GARDEN_HEIGHT} Q320 400 260 320 Q200 240 260 180 Q320 120 380 140 Q440 160 500 250 Q560 340 450 400`}
            fill="none"
            stroke="#C4A97D"
            strokeWidth={28}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d={`M320 ${GARDEN_HEIGHT} Q320 400 260 320 Q200 240 260 180 Q320 120 380 140 Q440 160 500 250 Q560 340 450 400`}
            fill="none"
            stroke="#D4B98D"
            strokeWidth={20}
            strokeLinecap="round"
            opacity={0.4}
            strokeDasharray="2 8"
          />
        </svg>

        {/* Decorative elements */}
        {DECORATIONS.map((decoration, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: decoration.x,
              top: decoration.y,
              fontSize: decoration.size,
              pointerEvents: 'none',
              opacity: 0.7,
            }}
            role="img"
            aria-hidden="true"
          >
            {decoration.emoji}
          </div>
        ))}

        {/* Pond */}
        <div
          style={{
            position: 'absolute',
            left: 500,
            top: 330,
            width: 100,
            height: 60,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, #87CEEB 0%, #5DADE2 40%, #3498DB 100%)',
            opacity: 0.6,
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 520,
            top: 345,
            fontSize: 14,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
          role="img"
          aria-hidden="true"
        >
          🐟
        </div>

        {/* Fence segments at top */}
        {Array.from({ length: Math.floor(GARDEN_WIDTH / 40) }).map((_, i) => (
          <div
            key={`fence-${i}`}
            style={{
              position: 'absolute',
              left: i * 40,
              top: 0,
              fontSize: 10,
              pointerEvents: 'none',
              opacity: 0.4,
            }}
          >
            ▮
          </div>
        ))}

        {/* TREES */}
        {trees.map((tree) => (
          <GardenTree
            key={tree.id}
            tree={tree}
            isNear={nearTree?.id === tree.id}
          />
        ))}

        {/* AVATAR */}
        <GardenAvatar
          avatar={avatar}
          position={avatarPosition}
          facing={facing}
        />

        {/* Interaction Panel (when near a tree) */}
        {nearTree && (
          <div
            style={{
              position: 'absolute',
              left: nearTree.position.x,
              top: nearTree.position.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <InteractionPanel
              tree={nearTree}
              treePosition={nearTree.position}
              onOpenPath={handleOpenPath}
              onDecorate={handleDecorate}
              onGift={handleGift}
            />
          </div>
        )}

        {/* Vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.08) 100%)',
          }}
        />
      </div>

      {/* Mobile D-pad */}
      <MobileDpad onMove={handleTouchMove} />
    </div>
  );
};

export default GardenWorld;