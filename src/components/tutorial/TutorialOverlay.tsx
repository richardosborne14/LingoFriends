/**
 * TutorialOverlay Component
 *
 * Renders a full-screen darkened overlay with:
 *  - An optional "spotlight" cutout highlighting a target element
 *  - A tooltip card with the step's title, description, and action buttons
 *
 * Spotlight technique: a positioned `div` over the target element uses
 * `box-shadow: 0 0 0 9999px rgba(0,0,0,0.65)` to darken everything outside
 * it. This is GPU-cheap and renders above Three.js canvases without WebGL
 * compositing issues.
 *
 * Tooltip positioning:
 *  - Below the spotlight when there's space, above it otherwise
 *  - Centred when no target is given (e.g. 'welcome' step)
 *
 * @module TutorialOverlay
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface TutorialOverlayProps {
  /** Bounding rect of the element to spotlight. null = centred overlay (no spotlight) */
  targetRect: DOMRect | null;
  /** Emoji or icon string for the step card header (e.g. "🌳") */
  icon?: string;
  /** Short headline — keep under ~30 chars for kids */
  title: string;
  /** Body text — 1–2 sentences max */
  description: string;
  /** Label for the primary action button */
  nextLabel?: string;
  /** Called when user taps "Got it!" / nextLabel */
  onNext: () => void;
  /** Called when user taps "Skip tutorial" (null = don't show skip button) */
  onSkip?: () => void;
  /** Render additional UI inside the card (e.g. a celebratory animation) */
  children?: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

/** Padding around the spotlight rect (px) */
const SPOTLIGHT_PADDING = 10;
/** Minimum px gap between spotlight bottom and viewport bottom before flipping */
const TOOLTIP_FLIP_THRESHOLD = 200;

// ============================================
// COMPONENT
// ============================================

/**
 * Full-screen tutorial overlay with optional spotlight and tooltip card.
 *
 * @example
 * <TutorialOverlay
 *   targetRect={gardenRef.current?.getBoundingClientRect() ?? null}
 *   icon="🌳"
 *   title="Welcome to your garden!"
 *   description="Each tree here is a skill you're growing."
 *   onNext={nextStep}
 *   onSkip={skipTutorial}
 * />
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  targetRect,
  icon = '💡',
  title,
  description,
  nextLabel = 'Got it! 👍',
  onNext,
  onSkip,
  children,
}) => {
  // Track viewport height so we know if tooltip should appear above or below spotlight
  const [vpHeight, setVpHeight] = useState(window.innerHeight);
  useEffect(() => {
    const update = () => setVpHeight(window.innerHeight);
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Spotlight geometry ──────────────────────────────────
  const spotlight = targetRect
    ? {
        left:   targetRect.left   - SPOTLIGHT_PADDING,
        top:    targetRect.top    - SPOTLIGHT_PADDING,
        width:  targetRect.width  + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  // ── Tooltip placement ───────────────────────────────────
  // Default: centred on screen (for steps with no spotlight)
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: 'min(92vw, 360px)',
  };

  if (spotlight) {
    const spaceBelow = vpHeight - (spotlight.top + spotlight.height);
    if (spaceBelow >= TOOLTIP_FLIP_THRESHOLD) {
      // Tooltip below spotlight
      tooltipStyle = {
        position: 'fixed',
        left: '50%',
        top:  spotlight.top + spotlight.height + 16,
        transform: 'translateX(-50%)',
        maxWidth: 'min(92vw, 360px)',
      };
    } else {
      // Tooltip above spotlight
      tooltipStyle = {
        position: 'fixed',
        left: '50%',
        bottom: vpHeight - spotlight.top + 16,
        transform: 'translateX(-50%)',
        maxWidth: 'min(92vw, 360px)',
      };
    }
  }

  return (
    <AnimatePresence>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <motion.div
        key="tutorial-backdrop"
        className="fixed inset-0 z-[900] pointer-events-none"
        style={{ background: spotlight ? 'transparent' : 'rgba(0,0,0,0.65)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* ── Spotlight cutout ─────────────────────────────── */}
      {spotlight && (
        <motion.div
          key="tutorial-spotlight"
          className="fixed z-[901] rounded-2xl pointer-events-none"
          style={{
            left:   spotlight.left,
            top:    spotlight.top,
            width:  spotlight.width,
            height: spotlight.height,
            // The massive box-shadow darkens everything OUTSIDE this element
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* ── Click-to-dismiss on backdrop ─────────────────── */}
      <div
        className="fixed inset-0 z-[902]"
        onClick={onNext}
        aria-hidden="true"
      />

      {/* ── Tooltip card ─────────────────────────────────── */}
      <motion.div
        key="tutorial-tooltip"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="z-[903] bg-white rounded-3xl shadow-2xl p-6"
        style={tooltipStyle}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        onClick={(e) => e.stopPropagation()} // don't dismiss on card click
      >
        {/* Icon */}
        {icon && (
          <div className="text-5xl text-center mb-3" aria-hidden="true">
            {icon}
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-extrabold text-gray-800 text-center mb-2 leading-tight">
          {title}
        </h2>

        {/* Description */}
        <p className="text-base text-gray-600 text-center leading-relaxed mb-4">
          {description}
        </p>

        {/* Optional slot — e.g. animated stars, reward preview */}
        {children && <div className="mb-4">{children}</div>}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Primary CTA */}
          <button
            onClick={onNext}
            className="
              w-full py-3 px-6
              bg-green-500 hover:bg-green-600 active:bg-green-700
              text-white font-bold text-lg
              rounded-2xl
              shadow-md active:shadow-sm
              transition-all duration-150
              active:scale-95
            "
          >
            {nextLabel}
          </button>

          {/* Skip — small, subtle (we don't want kids defaulting to skip) */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="
                w-full py-2 px-4
                text-gray-400 font-medium text-sm
                hover:text-gray-500
                transition-colors
              "
            >
              Skip tutorial
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TutorialOverlay;
