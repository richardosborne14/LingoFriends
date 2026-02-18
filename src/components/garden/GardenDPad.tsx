/**
 * GardenDPad Component
 *
 * Touch D-pad overlay for avatar movement in the 3D garden.
 * Only rendered on touch devices — hidden on desktop (keyboard controls work there).
 *
 * Implementation strategy: dispatches synthetic KeyboardEvent('keydown'/'keyup')
 * on `document` so GardenRenderer's existing arrow-key listener picks them up
 * without needing any renderer changes. This keeps the renderer/D-pad decoupled.
 *
 * Supported directions:
 *   ↑ ArrowUp    ↓ ArrowDown    ← ArrowLeft    → ArrowRight
 *
 * Touch behaviour:
 *   - Finger DOWN on a button → fires keydown (avatar starts moving)
 *   - Finger UP / CANCEL     → fires keyup   (avatar stops)
 *   - Multi-touch: each button tracks its own touch id so you can hold
 *     two directions at once (e.g., walk diagonally)
 *
 * Accessibility:
 *   - Role="group" with aria-label for screen readers
 *   - Each button has an accessible label
 *   - Visible only on touch screens (isTouchDevice gate)
 *
 * @module GardenDPad
 */

import React, { useCallback, useRef } from 'react';
import { isTouchDevice } from '../../utils/responsive';

// ============================================
// TYPES & CONSTANTS
// ============================================

type Direction = 'up' | 'down' | 'left' | 'right';

/** Maps D-pad direction → browser key name used by GardenRenderer */
const DIRECTION_KEY: Record<Direction, string> = {
  up:    'ArrowUp',
  down:  'ArrowDown',
  left:  'ArrowLeft',
  right: 'ArrowRight',
};

/** Emoji labels for the four buttons */
const DIRECTION_LABEL: Record<Direction, string> = {
  up:    '↑',
  down:  '↓',
  left:  '←',
  right: '→',
};

// ============================================
// HELPERS
// ============================================

/**
 * Dispatches a synthetic keyboard event on document.
 * GardenRenderer listens to document for arrow keys, so this hooks in cleanly.
 */
function dispatchKey(key: string, type: 'keydown' | 'keyup'): void {
  document.dispatchEvent(
    new KeyboardEvent(type, {
      key,
      code: key,       // e.g. 'ArrowUp'
      bubbles: true,
      cancelable: true,
    })
  );
}

// ============================================
// D-PAD BUTTON
// ============================================

interface DPadButtonProps {
  direction: Direction;
  className?: string;
  onPress: (dir: Direction) => void;
  onRelease: (dir: Direction) => void;
}

/**
 * Individual D-pad button.
 *
 * Uses onPointerDown/Up rather than onTouchStart/End so the browser
 * captures the pointer and we get Up events even if the finger slides off.
 */
const DPadButton: React.FC<DPadButtonProps> = ({ direction, className, onPress, onRelease }) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Capture pointer so we receive pointerup even if finger moves off button
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    onPress(direction);
  }, [direction, onPress]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    onRelease(direction);
  }, [direction, onRelease]);

  return (
    <button
      aria-label={`Move ${direction}`}
      className={`
        flex items-center justify-center
        w-14 h-14
        bg-white/70 backdrop-blur-sm
        rounded-xl
        text-2xl font-bold text-gray-700
        shadow-md active:shadow-sm
        active:scale-95
        select-none touch-none
        transition-transform duration-75
        ${className ?? ''}
      `}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {DIRECTION_LABEL[direction]}
    </button>
  );
};

// ============================================
// MAIN D-PAD COMPONENT
// ============================================

interface GardenDPadProps {
  /**
   * Override visibility — useful in dev/test to force-show on desktop.
   * By default the D-pad only renders when isTouchDevice is true.
   */
  forceVisible?: boolean;
  /** Extra Tailwind classes for the outer container */
  className?: string;
}

/**
 * Four-direction D-pad overlay positioned over the bottom-left of the garden.
 *
 * Only renders on touch devices. Desktop players use arrow keys directly.
 *
 * @example
 * // In GardenWorld3D or App.tsx garden view:
 * <GardenDPad />
 */
export const GardenDPad: React.FC<GardenDPadProps> = ({ forceVisible = false, className }) => {
  // Track which directions are currently held (for multi-direction support)
  const heldRef = useRef<Set<Direction>>(new Set());

  // Don't render on desktop — keyboard works fine and the D-pad would be distracting
  if (!isTouchDevice && !forceVisible) return null;

  /**
   * Start moving in the given direction.
   * Dispatches keydown and tracks the held state so we don't double-fire.
   */
  const handlePress = useCallback((dir: Direction) => {
    if (heldRef.current.has(dir)) return; // already held — don't re-fire
    heldRef.current.add(dir);
    dispatchKey(DIRECTION_KEY[dir], 'keydown');
  }, []);

  /**
   * Stop moving in the given direction.
   */
  const handleRelease = useCallback((dir: Direction) => {
    if (!heldRef.current.has(dir)) return; // wasn't held
    heldRef.current.delete(dir);
    dispatchKey(DIRECTION_KEY[dir], 'keyup');
  }, []);

  return (
    <div
      role="group"
      aria-label="Avatar movement controls"
      className={`
        absolute bottom-6 left-6
        z-20
        select-none
        ${className ?? ''}
      `}
    >
      {/*
        Layout:
          [   ] [  ↑  ] [   ]
          [ ← ] [     ] [ → ]
          [   ] [  ↓  ] [   ]
      */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Row 1 */}
        <div />
        <DPadButton direction="up"    onPress={handlePress} onRelease={handleRelease} />
        <div />

        {/* Row 2 */}
        <DPadButton direction="left"  onPress={handlePress} onRelease={handleRelease} />
        {/* Centre cell — decorative, not a button */}
        <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-xl" />
        <DPadButton direction="right" onPress={handlePress} onRelease={handleRelease} />

        {/* Row 3 */}
        <div />
        <DPadButton direction="down"  onPress={handlePress} onRelease={handleRelease} />
        <div />
      </div>
    </div>
  );
};

export default GardenDPad;
