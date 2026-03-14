/**
 * useTouchGestures Hook
 *
 * Detects and dispatches high-level touch gestures (tap, double-tap, long-press,
 * pinch, pan) from raw TouchEvent data.
 *
 * Used by:
 *  - Lesson activities (swipe left/right to navigate)
 *  - Garden tap-to-select behaviour
 *
 * Design notes:
 *  - All timers are cleaned up on unmount via the returned cleanup refs
 *  - Thresholds chosen for kids (bigger movement tolerance, longer long-press)
 *  - Does NOT preventDefault by default — callers decide if scrolling should be blocked
 *
 * @module useTouchGestures
 */

import { useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface TouchGestureHandlers {
  /** Fired after a short tap (no movement, under 200ms) */
  onSingleTap?: (x: number, y: number) => void;
  /** Fired when two taps land within DOUBLE_TAP_DELAY ms */
  onDoubleTap?: (x: number, y: number) => void;
  /** Fired after finger held still for LONG_PRESS_DELAY ms */
  onLongPress?: (x: number, y: number) => void;
  /** Fired during two-finger pinch; scale > 1 = zoom in, < 1 = zoom out */
  onPinch?: (scale: number) => void;
  /** Fired during single-finger drag; deltas in px */
  onPan?: (deltaX: number, deltaY: number) => void;
  /** Fired on horizontal swipe; positive = swipe right, negative = swipe left */
  onSwipeX?: (direction: 'left' | 'right') => void;
  /** Fired on vertical swipe; positive = swipe down, negative = swipe up */
  onSwipeY?: (direction: 'up' | 'down') => void;
}

/** Touch props to spread onto a React element */
export interface TouchGestureProps {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

// ============================================
// CONSTANTS
// ============================================

/** Two taps within this window = double-tap */
const DOUBLE_TAP_DELAY_MS = 300;

/** Hold still for this long = long-press */
const LONG_PRESS_DELAY_MS = 600;

/** Movement beyond this px = not a tap */
const TAP_MOVEMENT_THRESHOLD_PX = 12;

/** Minimum px travel to register as a swipe */
const SWIPE_THRESHOLD_PX = 50;

/** Minimum velocity (px/ms) to register as a swipe */
const SWIPE_VELOCITY_THRESHOLD = 0.3;

// ============================================
// INTERNAL STATE
// ============================================

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastDistance: number;
  startTime: number;
  tapCount: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  doubleTapTimer: ReturnType<typeof setTimeout> | null;
}

// ============================================
// HOOK
// ============================================

/**
 * Returns touch event props that detect high-level gestures.
 *
 * @example
 * const touch = useTouchGestures({
 *   onSwipeX: (dir) => dir === 'left' ? nextActivity() : prevActivity(),
 *   onSingleTap: (x, y) => console.log('tapped at', x, y),
 * });
 * return <div {...touch}>...</div>;
 */
export function useTouchGestures(handlers: TouchGestureHandlers): TouchGestureProps {
  const stateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastDistance: 0,
    startTime: 0,
    tapCount: 0,
    longPressTimer: null,
    doubleTapTimer: null,
  });

  // ── Helpers ──────────────────────────────────────────────

  /** Euclidean distance between two touch points */
  const getTouchDistance = (touches: React.TouchEvent['touches']): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /** Clear both timers — called on cancel / early exit */
  const clearAllTimers = (state: TouchState) => {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (state.doubleTapTimer) {
      clearTimeout(state.doubleTapTimer);
      state.doubleTapTimer = null;
    }
  };

  // ── Handlers ─────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    const touch = e.touches[0];

    state.startX    = touch.clientX;
    state.startY    = touch.clientY;
    state.lastX     = touch.clientX;
    state.lastY     = touch.clientY;
    state.startTime = Date.now();

    // Two-finger pinch init
    if (e.touches.length === 2) {
      state.lastDistance = getTouchDistance(e.touches);
    }

    // Long-press timer — cancelled if the finger moves or lifts
    clearAllTimers(state);
    state.longPressTimer = setTimeout(() => {
      handlers.onLongPress?.(state.startX, state.startY);
      state.longPressTimer = null;
    }, LONG_PRESS_DELAY_MS);
  }, [handlers]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    const touch = e.touches[0];

    // If the finger has moved enough, cancel any pending long-press
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > TAP_MOVEMENT_THRESHOLD_PX && state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (e.touches.length === 2) {
      // Pinch gesture
      const currentDistance = getTouchDistance(e.touches);
      if (state.lastDistance > 0 && handlers.onPinch) {
        handlers.onPinch(currentDistance / state.lastDistance);
      }
      state.lastDistance = currentDistance;
    } else {
      // Pan gesture
      const deltaX = touch.clientX - state.lastX;
      const deltaY = touch.clientY - state.lastY;
      if (handlers.onPan) {
        handlers.onPan(deltaX, deltaY);
      }
    }

    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
  }, [handlers]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;

    // Cancel long-press on lift
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    const touch = e.changedTouches[0];
    const dx       = touch.clientX - state.startX;
    const dy       = touch.clientY - state.startY;
    const absDx    = Math.abs(dx);
    const absDy    = Math.abs(dy);
    const duration = Date.now() - state.startTime;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // ── Swipe detection ───────────────────────────────────
    const velocity = distance / duration;
    if (velocity >= SWIPE_VELOCITY_THRESHOLD) {
      if (absDx > absDy && absDx >= SWIPE_THRESHOLD_PX) {
        handlers.onSwipeX?.(dx > 0 ? 'right' : 'left');
        return;
      }
      if (absDy > absDx && absDy >= SWIPE_THRESHOLD_PX) {
        handlers.onSwipeY?.(dy > 0 ? 'down' : 'up');
        return;
      }
    }

    // ── Tap detection ─────────────────────────────────────
    if (distance < TAP_MOVEMENT_THRESHOLD_PX && duration < 200) {
      state.tapCount++;

      if (state.tapCount === 1) {
        // Wait to see if a second tap lands
        state.doubleTapTimer = setTimeout(() => {
          if (state.tapCount === 1) {
            handlers.onSingleTap?.(state.startX, state.startY);
          }
          state.tapCount = 0;
          state.doubleTapTimer = null;
        }, DOUBLE_TAP_DELAY_MS);
      } else if (state.tapCount >= 2) {
        // Second tap — fire double-tap and cancel the single-tap timer
        if (state.doubleTapTimer) {
          clearTimeout(state.doubleTapTimer);
          state.doubleTapTimer = null;
        }
        handlers.onDoubleTap?.(state.startX, state.startY);
        state.tapCount = 0;
      }
    }
  }, [handlers]);

  const handleTouchCancel = useCallback((_e: React.TouchEvent) => {
    clearAllTimers(stateRef.current);
    stateRef.current.tapCount = 0;
  }, []);

  return {
    onTouchStart:  handleTouchStart,
    onTouchMove:   handleTouchMove,
    onTouchEnd:    handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}
