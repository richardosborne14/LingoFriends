/**
 * GardenTree Component
 * 
 * Displays a tree in the garden world with visual health states.
 * Uses the shared MiniTree component for tree visualization.
 * 
 * Features:
 * - Health-based visual indicators (healthy/thirsty/dying)
 * - Status badge floating above tree
 * - Decoration and gift indicators
 * - Empty plot handling for unplanted trees
 * - Proximity highlighting when avatar is near
 * 
 * @module GardenTree
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniTree } from '../shared/MiniTree';
import type { UserTree } from '../../types/game';

/**
 * Props for the GardenTree component
 */
export interface GardenTreeProps {
  /** The tree data to display */
  tree: UserTree;
  /** Whether the avatar is near this tree */
  isNear: boolean;
  /** Callback when interaction panel should be shown */
  onInteraction?: () => void;
}

/**
 * Determine if tree is an empty plot
 * Empty plots have no lessons completed and are in seed status
 */
const isEmptyPlot = (tree: UserTree): boolean => {
  return tree.health === 0 && tree.status === 'seed' && tree.lessonsCompleted === 0;
};

/**
 * GardenTree Component
 * 
 * Renders a tree in the garden with health visualization and status badges.
 * Positioned absolutely within the garden container.
 * 
 * @param props - Component props
 * @returns JSX element representing the tree
 * 
 * @example
 * <GardenTree
 *   tree={userTree}
 *   isNear={distance < 70}
 *   onInteraction={() => showPanel(userTree)}
 * />
 */
export const GardenTree: React.FC<GardenTreeProps> = ({
  tree,
  isNear,
  onInteraction,
}) => {
  const isEmpty = isEmptyPlot(tree);
  const needsWater = tree.health > 0 && tree.health < 50;
  const showHealthBadge = !isEmpty && tree.health > 0;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: tree.position.x,
        top: tree.position.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={false}
      animate={isNear ? { scale: 1.05 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Status indicator floating above tree */}
      <AnimatePresence>
        {showHealthBadge && (
          <motion.div
            animate={needsWater ? { y: [0, -4, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              position: 'absolute',
              top: -55,
              left: '50%',
              transform: 'translateX(-50%)',
              background: needsWater ? '#FEF3C7' : '#D1FAE5', // amber-100 or green-100
              border: `2px solid ${needsWater ? '#FCD34D' : '#6EE7B7'}`, // amber-300 or green-300
              borderRadius: 12,
              padding: '3px 8px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {needsWater && (
              <span style={{ fontSize: 12 }} role="img" aria-label="water drop">
                💧
              </span>
            )}
            <span
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: needsWater ? '#B45309' : '#047857', // amber-700 or green-700
              }}
            >
              {tree.health}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tree visualization or empty plot */}
      {isEmpty ? (
        // Empty plot - unplanted tree
        <div
          style={{
            width: 60,
            height: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.4,
          }}
        >
          <div style={{ fontSize: 20 }}>🌱</div>
          <div
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              fontSize: 9,
              color: '#64748B', // slate-500
              textAlign: 'center',
              marginTop: 2,
            }}
          >
            {tree.name}
          </div>
        </div>
      ) : (
        // Active tree with MiniTree visualization
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* MiniTree SVG */}
          <MiniTree health={tree.health} size={65} showPot />
          
          {/* Tree icon/name label */}
          <div
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              color: '#475569', // slate-600
              textAlign: 'center',
              marginTop: -4,
            }}
          >
            {tree.icon}
          </div>

          {/* Decorations on tree */}
          {tree.decorations.length > 0 && (
            <div style={{ position: 'absolute', top: 5, right: -10 }}>
              {tree.decorations.map((decoration, index) => (
                <span
                  key={decoration}
                  style={{
                    position: 'absolute',
                    top: index * 14,
                    fontSize: 14,
                  }}
                  role="img"
                  aria-label={`decoration: ${decoration}`}
                >
                  {decoration}
                </span>
              ))}
            </div>
          )}

          {/* Gift indicators */}
          {tree.giftsReceived.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 2,
                marginTop: 2,
              }}
            >
              {tree.giftsReceived.slice(0, 3).map((gift) => (
                <span
                  key={gift.id}
                  style={{ fontSize: 10 }}
                  role="img"
                  aria-label={`gift: ${gift.type}`}
                >
                  {gift.type === 'water_drop' ? '💧' : 
                   gift.type === 'sparkle' ? '✨' :
                   gift.type === 'seed' ? '🌱' :
                   gift.type === 'decoration' ? '🎀' :
                   gift.type === 'golden_flower' ? '🌸' : '🎁'}
                </span>
              ))}
              {tree.giftsReceived.length > 3 && (
                <span style={{ fontSize: 8, color: '#64748B' }}>
                  +{tree.giftsReceived.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Proximity highlight ring */}
      {isNear && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 100,
            height: 100,
            borderRadius: '50%',
            border: '3px solid #34D399', // green-400
            boxShadow: '0 0 12px rgba(52, 211, 153, 0.4)',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  );
};

export default GardenTree;