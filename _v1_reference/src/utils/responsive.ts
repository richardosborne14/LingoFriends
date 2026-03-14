/**
 * Responsive Utilities
 *
 * Viewport detection, breakpoint helpers, and scaling utilities.
 * Used across components to adapt layouts and font sizes for mobile.
 *
 * Design decisions:
 *  - Breakpoints match Tailwind defaults so they're consistent with className usage
 *  - `useResponsive` walks DOWN breakpoints (mobile-first) so you only specify
 *    the values you care about — unspecified sizes inherit the next smaller value
 *  - `isTouchDevice` is checked once on import; fast for repeated reads
 *
 * @module responsive
 */

import { useState, useEffect } from 'react';

// ============================================
// BREAKPOINTS
// ============================================

/** Pixel widths matching Tailwind's default breakpoints */
export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Ordered from smallest to largest — used in breakpoint walks
const BREAKPOINT_ORDER: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];

// ============================================
// VIEWPORT DETECTION
// ============================================

/**
 * Returns true if the current viewport is phone-sized (< 768px).
 * SSR-safe: returns false when window is not available.
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
}

/**
 * Returns true for tablet-sized viewports (768px – 1023px).
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  return w >= BREAKPOINTS.md && w < BREAKPOINTS.lg;
}

/**
 * Returns true for desktop viewports (≥ 1024px).
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= BREAKPOINTS.lg;
}

/**
 * Returns the active Tailwind breakpoint for the current viewport width.
 * 'sm' is returned for viewports smaller than the sm breakpoint.
 */
export function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'lg';
  const w = window.innerWidth;
  if (w >= BREAKPOINTS['2xl']) return '2xl';
  if (w >= BREAKPOINTS.xl)    return 'xl';
  if (w >= BREAKPOINTS.lg)    return 'lg';
  if (w >= BREAKPOINTS.md)    return 'md';
  return 'sm';
}

/**
 * True if the primary input mechanism supports hover — i.e., it's likely
 * a pointer (mouse/trackpad) rather than touch-only.
 * Used to conditionally show hover-only UI hints.
 */
export const isPointerDevice: boolean =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * True if the device supports touch events.
 * Covers phones, tablets, and touch laptops.
 */
export const isTouchDevice: boolean =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ============================================
// SCALING
// ============================================

/**
 * Scale factor for the Three.js garden canvas on small screens.
 * The renderer multiplies its internal resolution by this value.
 */
export function getCanvasScale(): number {
  if (typeof window === 'undefined') return 1;
  const w = window.innerWidth;
  if (w < 400) return 0.6;
  if (w < 600) return 0.75;
  if (w < 768) return 0.9;
  return 1;
}

/**
 * Scales a base font-size for mobile readability.
 * Duolingo uses 85% on phones to keep more content on screen.
 */
export function getScaledFontSize(basePx: number): number {
  return isMobile() ? Math.round(basePx * 0.85) : basePx;
}

/**
 * Minimum touch target size (44px per Apple/Google guidelines).
 * On very small screens we scale with the viewport so nothing becomes tiny.
 */
export function getTouchTargetSize(): number {
  return Math.max(44, Math.round((typeof window !== 'undefined' ? window.innerWidth : 375) * 0.11));
}

// ============================================
// HOOK
// ============================================

/**
 * Returns a responsive value that updates on window resize.
 *
 * Provide values for one or more breakpoints; unspecified breakpoints
 * inherit the value of the next smaller one (mobile-first).
 *
 * @example
 * // Column count: 1 on mobile, 2 on tablet, 3 on desktop
 * const cols = useResponsive<number>({ sm: 1, md: 2, lg: 3 });
 */
export function useResponsive<T>(values: Partial<Record<Breakpoint, T>>): T {
  /** Resolve the correct value for a given breakpoint, walking down if needed */
  const resolve = (): T => {
    const bp = getBreakpoint();
    const idx = BREAKPOINT_ORDER.indexOf(bp);
    // Walk from current breakpoint down to 'sm' looking for a defined value
    for (let i = idx; i >= 0; i--) {
      const val = values[BREAKPOINT_ORDER[i]];
      if (val !== undefined) return val;
    }
    // Fallback: first defined value in any direction
    return Object.values(values)[0] as T;
  };

  const [value, setValue] = useState<T>(resolve);

  useEffect(() => {
    const handleResize = () => setValue(resolve());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

/**
 * Returns whether the current viewport is mobile-sized.
 * Updates reactively on window resize.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isMobile);

  useEffect(() => {
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return mobile;
}
