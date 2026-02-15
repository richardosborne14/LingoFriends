/**
 * LessonNode Component
 * 
 * Individual lesson circle on the path view that displays the lesson
 * status (completed, current, locked) with appropriate visual states.
 * 
 * States:
 * - Completed: Green background, stars below, mini tree with health %
 * - Current: Gold/amber background, pulsing ring, bouncing avatar
 * - Locked: Grey background, padlock icon
 * - Needs Refresh: Completed but health <50%, water drop badge
 * 
 * @module LessonNode
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MiniTree } from '../shared/MiniTree';
import type { SkillPathLesson, PlayerAvatar } from '../../types/game';

/**
 * Props for the LessonNode component
 */
export interface LessonNodeProps {
  /** The lesson data */
  lesson: SkillPathLesson;
  /** Health percentage for completed lessons (0-100) */
  health?: number;
  /** Whether this is the current lesson to play */
  isCurrent: boolean;
  /** Whether this lesson is locked */
  isLocked: boolean;
  /** Whether this is the final/goal lesson */
  isGoal: boolean;
  /** Position as percentages {x, y} */
  position: { x: number; y: number };
  /** Player avatar to show on current lesson */
  avatar?: PlayerAvatar;
  /** Callback when the lesson node is clicked */
  onClick: () => void;
}

/**
 * LessonNode Component
 * 
 * Renders a single lesson node on the path with:
 * - Circular node with icon
 * - Status-based styling (completed/current/locked)
 * - Stars for completed lessons
 * - Health indicator with mini tree for completed lessons
 * - Avatar bouncing animation on current lesson
 * - Water drop badge for lessons needing refresh
 * - Goal marker for final lesson
 * 
 * @param props - Component props
 * @returns Lesson node component
 */
export const LessonNode: React.FC<LessonNodeProps> = ({
  lesson,
  health = 0,
  isCurrent,
  isLocked,
  isGoal,
  position,
  avatar,
  onClick,
}) => {
  // Determine if this completed lesson needs refresh (health < 50%)
  const needsRefresh = lesson.status === 'completed' && health > 0 && health < 50;
  
  // Determine node styling based on status
  const getNodeStyles = () => {
    if (lesson.status === 'completed') {
      return {
        background: 'linear-gradient(135deg, #34D399, #10B981)', // green
        boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)',
      };
    }
    if (isCurrent) {
      return {
        background: 'linear-gradient(135deg, #FCD34D, #F59E0B)', // amber/gold
        boxShadow: '0 0 0 4px rgba(252, 211, 77, 0.5), 0 6px 20px rgba(252, 211, 77, 0.4)',
      };
    }
    // Locked
    return {
      background: '#E2E8F0', // slate-200
      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
    };
  };

  const nodeStyles = getNodeStyles();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: 0,
        type: 'spring',
        stiffness: 400,
        damping: 20,
      }}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {/* Avatar bouncing on current node */}
      {isCurrent && avatar && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          }}
          style={{ marginBottom: '-4px' }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #34D399, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 0 0 3px #fff, 0 0 0 6px #10B981, 0 3px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            {avatar.emoji}
          </div>
        </motion.div>
      )}

      {/* Node circle button */}
      <motion.button
        whileHover={!isLocked ? { scale: 1.08 } : {}}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        onClick={onClick}
        disabled={isLocked}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          cursor: isLocked ? 'default' : 'pointer',
          background: nodeStyles.background,
          boxShadow: nodeStyles.boxShadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          position: 'relative',
        }}
        aria-label={
          isLocked
            ? `${lesson.title} - Locked`
            : isCurrent
            ? `${lesson.title} - Start lesson`
            : lesson.status === 'completed'
            ? `${lesson.title} - Completed with ${lesson.stars} stars`
            : lesson.title
        }
      >
        {/* Icon or lock */}
        {isLocked ? '🔒' : lesson.icon}

        {/* Stars for completed lessons */}
        {lesson.status === 'completed' && (
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              display: 'flex',
              gap: 1,
            }}
          >
            {[1, 2, 3].map((star) => (
              <span
                key={star}
                style={{
                  fontSize: 12,
                  opacity: star <= lesson.stars ? 1 : 0.3,
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        )}

        {/* Water drop badge for lessons needing refresh */}
        {needsRefresh && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{
              repeat: Infinity,
              duration: 2,
            }}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: '#F59E0B',
              width: 22,
              height: 22,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
              border: '2px solid #fff',
            }}
          >
            💧
          </motion.div>
        )}

        {/* Pulsing ring for current lesson */}
        {isCurrent && (
          <motion.div
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
            }}
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '3px solid #F59E0B',
            }}
          />
        )}
      </motion.button>

      {/* Label below node */}
      <div style={{ textAlign: 'center', maxWidth: 100 }}>
        <p
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: isLocked ? '#94A3B8' : '#334155',
            marginBottom: 1,
          }}
        >
          {lesson.title}
        </p>

        {/* Health indicator for completed lessons */}
        {lesson.status === 'completed' && health > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <MiniTree health={health} size={20} showPot={false} />
            <span
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                color: health > 50 ? '#059669' : '#D97706',
              }}
            >
              {health}%
            </span>
          </div>
        )}

        {/* Goal marker for final lesson */}
        {isGoal && (
          <div
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: '#D97706',
              marginTop: 4,
            }}
          >
            🎯 Goal!
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LessonNode;