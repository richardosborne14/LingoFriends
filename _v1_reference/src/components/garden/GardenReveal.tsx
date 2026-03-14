/**
 * GardenReveal Component
 *
 * Full-screen celebration shown after a new user completes their very first lesson.
 * Replaces the standard LessonComplete screen on the first run so the child's
 * introduction to the garden is a delightful "reveal" moment rather than the
 * same lesson-end screen they'll see every day.
 *
 * Animation sequence:
 *  0.0s  – Card fades in with spring
 *  0.3s  – Stars pop in one by one
 *  0.9s  – Rewards row (Sun Drops + Gems) slides up
 *  1.1s  – "Your tree is growing" section fades in
 *  1.5s  – 🌱 → 🌿 (first growth)
 *  3.0s  – 🌿 → 🌳 (full tree)
 *  3.6s  – "Enter your garden!" button pulses in
 *  Always – Decoration rain (flowers / gems / stars fall from top, loop)
 *
 * @module components/garden/GardenReveal
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tree growth stages — shown in sequence as the user watches */
const TREE_STAGES = ['🌱', '🌿', '🌳'] as const;

/** Items that rain from the top of the screen in the background */
const RAIN_ITEMS = [
  '🌸', '🌺', '🌼', '🌻', '🌹',
  '💎', '⭐', '🌿', '🍀', '💫',
  '🌸', '🌼', '⭐', '💎', '🌺',
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface GardenRevealProps {
  /** Stars earned in the first lesson (1–3) */
  stars: number;
  /** Sun Drops earned */
  sunDropsEarned: number;
  /** Gems earned */
  gemsEarned: number;
  /**
   * The subject / language being learned, shown in the tree-growth label.
   * E.g. "French", "German", "Maths"
   */
  targetSubject: string;
  /** Called when user taps the "Enter your garden!" button */
  onEnterGarden: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * GardenReveal — first-lesson celebration with tree-grow animation.
 *
 * Kid-design goals:
 * - Big, legible text — no micro-copy
 * - Emojis carry most of the visual weight (no image assets needed)
 * - Large tap target for the CTA (full-width, py-4)
 * - No timer-forced advancement — child taps when ready
 *
 * @example
 * <GardenReveal
 *   stars={2}
 *   sunDropsEarned={14}
 *   gemsEarned={3}
 *   targetSubject="French"
 *   onEnterGarden={() => setShowReveal(false)}
 * />
 */
export const GardenReveal: React.FC<GardenRevealProps> = ({
  stars,
  sunDropsEarned,
  gemsEarned,
  targetSubject,
  onEnterGarden,
}) => {
  // Current tree growth stage index (0=🌱, 1=🌿, 2=🌳)
  const [treeStage, setTreeStage] = useState(0);
  // Whether the "Enter your garden!" button is visible
  const [showButton, setShowButton] = useState(false);

  // Tree grows from 🌱 → 🌿 → 🌳 over ~3 seconds
  useEffect(() => {
    const t1 = setTimeout(() => setTreeStage(1), 1500);
    const t2 = setTimeout(() => setTreeStage(2), 3000);
    // Button appears slightly after full tree — gives the child a beat
    // to enjoy the 🌳 emoji before the CTA appears
    const t3 = setTimeout(() => setShowButton(true), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Stable decoration positions — computed once so rain doesn't re-randomise on re-render.
  // Using useMemo with an empty dep array gives us stable "random" positions.
  const rainItems = useMemo(
    () =>
      RAIN_ITEMS.map((emoji, i) => ({
        emoji,
        // Spread items evenly across the full width with slight offset variation
        left: `${3 + (i * 6.3) % 93}%`,
        // Stagger start times so not all items start falling simultaneously
        delay: (i * 0.23) % 2.8,
        // Vary fall speed slightly so items don't look robotic
        duration: 2.0 + (i * 0.14) % 1.8,
      })),
    []
  );

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}
    >
      {/* ── Decoration rain ─────────────────────────────────────────── */}
      {rainItems.map((item, i) => (
        <motion.div
          key={i}
          className="fixed text-2xl pointer-events-none select-none"
          style={{ left: item.left, top: -48 }}
          initial={{ y: 0, opacity: 0.9 }}
          animate={{ y: '110vh', opacity: [0.9, 0.9, 0] }}
          transition={{
            delay: item.delay,
            duration: item.duration,
            ease: 'linear',
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        >
          {item.emoji}
        </motion.div>
      ))}

      {/* ── Celebration card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="relative z-10 mx-4 max-w-sm w-full text-center rounded-3xl p-8 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.97)' }}
      >
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-extrabold mb-1"
          style={{ color: '#064e3b', fontFamily: "'Lilita One', 'Nunito', sans-serif" }}
        >
          Lesson Complete! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 mb-4"
        >
          Your very first {targetSubject} lesson!
        </motion.p>

        {/* Stars */}
        <div className="flex justify-center gap-1 mb-4 text-3xl">
          {([1, 2, 3] as const).map((s) => (
            <motion.span
              key={s}
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.3 + s * 0.15,
                type: 'spring',
                stiffness: 450,
                damping: 15,
              }}
              style={{ opacity: s <= stars ? 1 : 0.22 }}
            >
              ⭐
            </motion.span>
          ))}
        </div>

        {/* Rewards row */}
        <motion.div
          className="flex justify-center gap-8 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className="text-center">
            <div className="text-3xl mb-0.5">☀️</div>
            <div className="font-extrabold text-lg" style={{ color: '#b45309' }}>
              +{sunDropsEarned}
            </div>
            <div className="text-xs text-gray-400">Sun Drops</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-0.5">💎</div>
            <div className="font-extrabold text-lg" style={{ color: '#7c3aed' }}>
              +{gemsEarned}
            </div>
            <div className="text-xs text-gray-400">Gems</div>
          </div>
        </motion.div>

        {/* ── Tree growth section ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mb-6"
        >
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: '#065f46' }}
          >
            Your {targetSubject} tree is growing!
          </p>

          {/* Tree emoji animates between stages — AnimatePresence gives it
              a pop-in / pop-out spring for each stage transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={treeStage}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              className="text-8xl leading-none select-none"
            >
              {TREE_STAGES[treeStage]}
            </motion.div>
          </AnimatePresence>

          {/* Encouragement text appears once the tree is fully grown */}
          {treeStage === 2 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs mt-3 font-medium"
              style={{ color: '#059669' }}
            >
              Keep learning to help it grow! 🌱
            </motion.p>
          )}
        </motion.div>

        {/* ── CTA button ───────────────────────────────────────────── */}
        {/* AnimatePresence delays the button until the tree is fully grown,
            giving the child a moment to appreciate the 🌳 first */}
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0, y: 14, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnterGarden}
              className="w-full py-4 rounded-2xl font-extrabold text-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                // Pushes down shadow so it feels like a physical button
                boxShadow: '0 4px 0 #047857',
              }}
            >
              Enter your garden! 🌳
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default GardenReveal;
