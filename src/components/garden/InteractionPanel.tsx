/**
 * InteractionPanel Component
 * 
 * A popup panel that appears when the avatar approaches a tree in the garden.
 * Shows tree information and action buttons based on tree state.
 * 
 * Features:
 * - Speech bubble style with arrow pointing to tree
 * - Health bar visualization
 * - Dynamic actions based on tree state (healthy/thirsty/dying/empty)
 * - Smooth slide-in/out animations
 * 
 * @module InteractionPanel
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserTree } from '../../types/game';

/**
 * Props for the InteractionPanel component
 */
export interface InteractionPanelProps {
  /** The tree to show interaction panel for (null to hide) */
  tree: UserTree | null;
  /** Position of the tree in the garden (for positioning panel) */
  treePosition: { x: number; y: number };
  /** Callback when "Open Path" is clicked */
  onOpenPath: () => void;
  /** Callback when "Decorate" is clicked */
  onDecorate?: () => void;
  /** Callback when "Gift" is clicked */
  onGift?: () => void;
  /** Callback when panel is dismissed */
  onClose?: () => void;
}

/**
 * Determine tree status based on health
 */
const getTreeStatus = (health: number, isEmpty: boolean): 'empty' | 'healthy' | 'thirsty' | 'dying' => {
  if (isEmpty) return 'empty';
  if (health >= 80) return 'healthy';
  if (health >= 40) return 'thirsty';
  return 'dying';
};

/**
 * InteractionPanel Component
 * 
 * Renders a popup panel with tree information and actions.
 * Uses speech bubble styling with smooth animations.
 * 
 * @param props - Component props
 * @returns JSX element or null if no tree selected
 * 
 * @example
 * <InteractionPanel
 *   tree={nearbyTree}
 *   treePosition={{ x: 140, y: 180 }}
 *   onOpenPath={() => openPath(nearbyTree)}
 *   onDecorate={() => showDecorations(nearbyTree)}
 * />
 */
export const InteractionPanel: React.FC<InteractionPanelProps> = ({
  tree,
  treePosition,
  onOpenPath,
  onDecorate,
  onGift,
  onClose,
}) => {
  if (!tree) return null;

  const isEmpty = tree.health === 0 && tree.status === 'seed';
  const status = getTreeStatus(tree.health, isEmpty);

  // Health bar color based on status
  const healthBarColor = 
    tree.health > 70 ? '#34D399' : // green-400
    tree.health > 40 ? '#FBBF24' : // amber-400
    '#F87171'; // red-400

  // Status badge configuration
  const statusBadge = {
    empty: { emoji: '🌱', text: 'Empty Plot', color: '#94A3B8' }, // slate-400
    healthy: { emoji: '✓', text: 'Healthy', color: '#10B981' }, // green-500
    thirsty: { emoji: '💧', text: 'Thirsty', color: '#F59E0B' }, // amber-500
    dying: { emoji: '🆘', text: 'Dying!', color: '#EF4444' }, // red-500
  };

  const badge = statusBadge[status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          // Position below non-empty trees, higher for empty plots
          top: tree.health > 0 || !isEmpty ? 75 : 50,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          // Speech bubble styling
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          padding: 14,
          minWidth: 180,
          border: `2px solid ${tree.health < 50 ? '#FCD34D' : '#86EFAC'}`, // amber-300 or green-300
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        }}
        role="dialog"
        aria-label={`Interact with ${tree.name}`}
      >
        {/* Speech bubble arrow */}
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `8px solid ${tree.health < 50 ? '#FCD34D' : '#86EFAC'}`,
          }}
        />

        {/* Tree name and icon */}
        <p
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: '#1E293B', // slate-800
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          {tree.icon} {tree.name}
        </p>

        {/* Health bar (only for non-empty plots) */}
        {status !== 'empty' && (
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: '#E2E8F0', // slate-200
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                transition: 'width 0.5s',
                width: `${tree.health}%`,
                background: healthBarColor,
              }}
            />
          </div>
        )}

        {/* Empty plot message */}
        {status === 'empty' && (
          <p
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 500,
              fontSize: 11,
              color: '#64748B', // slate-500
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Empty plot — start this path!
          </p>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Primary action button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onOpenPath}
            style={{
              background: status === 'empty' 
                ? 'linear-gradient(135deg, #10B981, #34D399)' // green-500 to green-400
                : tree.health < 50
                  ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' // amber-500 to amber-400
                  : 'linear-gradient(135deg, #10B981, #34D399)', // green-500 to green-400
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: status === 'empty' 
                ? '0 2px 0 #047857' // green-700
                : tree.health < 50
                  ? '0 2px 0 #B45309' // amber-700
                  : '0 2px 0 #047857', // green-700
              width: '100%',
            }}
          >
            {status === 'empty' 
              ? '🌱 Plant' 
              : tree.health < 50 
                ? '💧 Refresh Lesson' 
                : '📖 Open Path'}
          </motion.button>

          {/* Secondary actions (only for non-empty plots) */}
          {status !== 'empty' && (
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onDecorate}
                style={{
                  background: '#FCE7F3', // pink-100
                  border: '1.5px solid #F9A8D4', // pink-300
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 600,
                  fontSize: 11,
                  color: '#EC4899', // pink-500
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                🎀 Decorate
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onGift}
                style={{
                  background: '#F0F9FF', // sky-50
                  border: '1.5px solid #BAE6FD', // sky-200
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 600,
                  fontSize: 11,
                  color: '#0EA5E9', // sky-500
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                💌 Gift
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InteractionPanel;