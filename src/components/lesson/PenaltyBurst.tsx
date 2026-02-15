/**
 * LingoFriends - Penalty Burst Animation Component
 * 
 * Full-screen overlay animation that plays when the user loses a Sun Drop
 * for a wrong answer. Features a red flash and broken Sun Drop icon.
 * 
 * @module PenaltyBurst
 */

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';

// ============================================
// TYPES
// ============================================

/**
 * Props for PenaltyBurst component.
 */
export interface PenaltyBurstProps {
  /** Callback after animation completes */
  onDone: () => void;
  /** Whether the burst is visible */
  visible?: boolean;
}

/**
 * Falling shard configuration for heart break emojis.
 */
interface Shard {
  id: number;
  x: number;
  y: number;
  rotation: number;
  duration: number;
  delay: number;
  size: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Animation duration in ms */
const ANIMATION_DURATION = 1600;

// ============================================
// COMPONENT
// ============================================

/**
 * PenaltyBurst - Animation for wrong answer penalty.
 * 
 * Displays a full-screen overlay with:
 * - Red screen flash
 * - Red burst card with broken Sun Drop icon and "−1 Sun Drop"
 * - Falling heart break emojis (💔)
 * - Auto-dismisses after 1.6 seconds
 * 
 * @example
 * const [showPenalty, setShowPenalty] = useState(false);
 * 
 * <PenaltyBurst
 *   onDone={() => setShowPenalty(false)}
 *   visible={showPenalty}
 * />
 */
export const PenaltyBurst: React.FC<PenaltyBurstProps> = ({
  onDone,
  visible = true,
}) => {
  // Auto-dismiss after animation duration
  useEffect(() => {
    if (!visible) return;
    
    const timer = setTimeout(() => {
      onDone();
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [visible, onDone]);

  // Generate falling heart break shards
  const shards = useMemo<Shard[]>(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 120,
      y: 200 + Math.random() * 100,
      rotation: Math.random() * 360,
      duration: 1.2 + Math.random() * 0.5,
      delay: i * 0.06,
      size: 12 + Math.random() * 8,
    }));
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {/* Red flash background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#F87171', // red-400
            }}
          />

          {/* Penalty card */}
          <motion.div
            initial={{ scale: 0, rotate: 8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 15 
            }}
            style={{
              background: 'linear-gradient(135deg, #FCA5A5, #EF4444)',
              padding: '14px 36px',
              borderRadius: 28,
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Broken Sun Drop with wobble animation */}
            <motion.div
              animate={{ 
                rotate: [0, -20, 20, -10, 10, 0],
                y: [0, 4, 0],
              }}
              transition={{ duration: 0.5 }}
            >
              <SunDropIcon size={36} broken />
            </motion.div>
            <span
              style={{
                fontFamily: "'Lilita One', sans-serif",
                fontSize: 28,
                color: '#fff',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              −1 Sun Drop
            </span>
          </motion.div>

          {/* Falling heart break shards */}
          {shards.map((shard) => (
            <motion.div
              key={shard.id}
              style={{
                position: 'absolute',
                fontSize: shard.size,
                top: -20,
              }}
              initial={{ 
                x: (Math.random() - 0.5) * 40, 
                y: -20, 
                opacity: 1, 
                rotate: 0 
              }}
              animate={{
                x: shard.x,
                y: shard.y,
                opacity: 0,
                rotate: shard.rotation,
              }}
              transition={{
                duration: shard.duration,
                ease: 'easeIn',
                delay: shard.delay,
              }}
            >
              💔
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PenaltyBurst;