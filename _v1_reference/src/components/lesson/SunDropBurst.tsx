/**
 * LingoFriends - Sun Drop Burst Animation Component
 * 
 * Full-screen overlay animation that plays when the user earns Sun Drops.
 * Features a golden burst with particle explosion effect.
 * 
 * @module SunDropBurst
 */

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunDropIcon } from '../shared/SunDropIcon';

// ============================================
// TYPES
// ============================================

/**
 * Props for SunDropBurst component.
 */
export interface SunDropBurstProps {
  /** Amount of Sun Drops earned */
  amount: number;
  /** Callback after animation completes */
  onDone: () => void;
  /** Whether the burst is visible */
  visible?: boolean;
}

/**
 * Individual particle configuration.
 */
interface Particle {
  id: number;
  size: number;
  color: string;
  angle: number;
  distance: number;
  rotation: number;
  duration: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Particle colors for the explosion effect */
const PARTICLE_COLORS = [
  '#FCD34D', // amber-300
  '#F59E0B', // amber-500
  '#FB923C', // orange-400
  '#4ADE80', // green-400
  '#F472B6', // pink-400
  '#38BDF8', // sky-400
];

/** Animation duration in ms */
const ANIMATION_DURATION = 2000;

// ============================================
// COMPONENT
// ============================================

/**
 * SunDropBurst - Reward animation for earning Sun Drops.
 * 
 * Displays a full-screen overlay with:
 * - Golden burst card showing "+X Sun Drops"
 * - Particle explosion with colorful elements
 * - Auto-dismisses after 2 seconds
 * 
 * @example
 * const [showBurst, setShowBurst] = useState(false);
 * 
 * <SunDropBurst
 *   amount={3}
 *   onDone={() => setShowBurst(false)}
 *   visible={showBurst}
 * />
 */
export const SunDropBurst: React.FC<SunDropBurstProps> = ({
  amount,
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

  // Generate random particles once per render
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      size: 8 + Math.random() * 10,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      angle: (Math.random() - 0.5) * 280,
      distance: (Math.random() - 0.5) * 280,
      rotation: Math.random() * 720,
      duration: 1 + Math.random(),
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
          {/* Burst card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 15 
            }}
            style={{
              background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
              padding: '14px 36px',
              borderRadius: 28,
              boxShadow: '0 0 60px rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <SunDropIcon size={36} glow />
            <span
              style={{
                fontFamily: "'Lilita One', sans-serif",
                fontSize: 30,
                color: '#fff',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              +{amount} Sun Drop{amount !== 1 ? 's' : ''}
            </span>
          </motion.div>

          {/* Particle explosion */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              style={{
                position: 'absolute',
                width: particle.size,
                height: particle.size,
                borderRadius: Math.random() > 0.5 ? '50%' : 3,
                background: particle.color,
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: particle.angle,
                y: particle.distance,
                opacity: 0,
                rotate: particle.rotation,
              }}
              transition={{
                duration: particle.duration,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SunDropBurst;