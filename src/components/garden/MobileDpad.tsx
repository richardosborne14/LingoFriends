/**
 * MobileDpad Component
 * 
 * A 4-way directional pad for touch-based avatar movement in the garden.
 * Appears on touch devices and allows mobile users to navigate the garden.
 * 
 * Features:
 * - 4 directional buttons (up, down, left, right)
 * - Visual feedback on press
 * - Positioned above the tab bar
 * 
 * @module MobileDpad
 */

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props for the MobileDpad component
 */
export interface MobileDpadProps {
  /** Callback when a direction is pressed */
  onMove: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

/**
 * Direction button configuration
 */
interface DirectionButton {
  direction: 'up' | 'down' | 'left' | 'right';
  label: string;
}

/** Available directions */
const DIRECTIONS: DirectionButton[] = [
  { direction: 'up', label: '▲' },
  { direction: 'left', label: '◀' },
  { direction: 'right', label: '▶' },
  { direction: 'down', label: '▼' },
];

/**
 * MobileDpad Component
 * 
 * Renders a directional pad for mobile touch controls.
 * Each press moves the avatar 20 pixels in that direction.
 * 
 * @param props - Component props
 * @param props.onMove - Callback fired when direction is pressed
 * @returns JSX element containing the D-pad controls
 * 
 * @example
 * <MobileDpad onMove={(dir) => moveAvatar(dir)} />
 */
export const MobileDpad: React.FC<MobileDpadProps> = ({ onMove }) => {
  // Base styles for D-pad buttons
  const buttonBaseStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: '2px solid #CBD5E1', // slate-300
    background: '#fff',
    fontFamily: 'sans-serif',
    fontSize: 16,
    color: '#64748B', // slate-500
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 0 #CBD5E1', // slate-300
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 4,
        marginTop: 12,
      }}
      role="group"
      aria-label="Movement controls"
    >
      {/* Up button */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onPointerDown={() => onMove('up')}
        style={buttonBaseStyle}
        aria-label="Move up"
      >
        ▲
      </motion.button>

      {/* Middle row: Left, spacer, Right */}
      <div style={{ display: 'flex', gap: 4 }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onPointerDown={() => onMove('left')}
          style={buttonBaseStyle}
          aria-label="Move left"
        >
          ◀
        </motion.button>
        
        {/* Spacer in the middle */}
        <div style={{ width: 44, height: 44 }} />
        
        <motion.button
          whileTap={{ scale: 0.85 }}
          onPointerDown={() => onMove('right')}
          style={buttonBaseStyle}
          aria-label="Move right"
        >
          ▶
        </motion.button>
      </div>

      {/* Down button */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onPointerDown={() => onMove('down')}
        style={buttonBaseStyle}
        aria-label="Move down"
      >
        ▼
      </motion.button>
    </div>
  );
};

export default MobileDpad;