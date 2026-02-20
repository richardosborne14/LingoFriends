/**
 * PathView Component
 * 
 * Main container for the lesson selection path view. Displays a winding
 * trail showing all lessons in a skill path with visual progress indicators.
 * 
 * Features:
 * - SVG winding path connecting lesson nodes
 * - Lesson nodes positioned along the path
 * - Avatar bouncing on current lesson node
 * - Locked nodes for unavailable lessons
 * - Completed segments shown as solid green
 * - Incomplete segments shown as dashed grey
 * 
 * @module PathView
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PathHeader } from './PathHeader';
import { LessonNode } from './LessonNode';
import { useSkillPath } from '../../hooks/useSkillPath';
import type { UserTree, PlayerAvatar, SkillPathLesson } from '../../types/game';

/**
 * Props for the PathView component.
 *
 * Task K3: `skillPath: SkillPath` (full object) was replaced by `skillPathId: string`
 * so the component can own its own data fetching via `useSkillPath`. This removes
 * the need for App.tsx to pass live SkillPath objects and resolves the type error
 * where `skillPath={state.selectedTree.skillPathId as any}` was passed.
 *
 * `refreshKey` is incremented by the parent after lesson completion to trigger
 * a re-fetch of live lesson statuses from PocketBase, unlocking the next node.
 */
export interface PathViewProps {
  /** PocketBase ID of the skill path to display */
  skillPathId: string;
  /** The user's tree for this skill path (contains health data) */
  userTree?: UserTree;
  /** Player avatar to show on current lesson */
  avatar: PlayerAvatar;
  /** Increment to force a live re-fetch after lesson completion */
  refreshKey?: number;
  /** Callback when a lesson is started */
  onStartLesson: (lesson: SkillPathLesson) => void;
  /** Callback when back button is clicked */
  onBack: () => void;
}

/**
 * Predefined path positions for lessons (percentage-based)
 * 
 * Layout creates a winding S-curve from top to bottom:
 * - First lesson at top-left area
 * - Winding down through middle lessons
 * - Goal lesson at bottom area
 * 
 * Supports up to 6 lessons (Groq typically generates 5).
 * If more lessons exist than positions, extra lessons use the last position.
 */
const PATH_POSITIONS: { x: number; y: number }[] = [
  { x: 40, y: 10 },  // Lesson 0 (top)
  { x: 68, y: 28 },  // Lesson 1
  { x: 32, y: 46 },  // Lesson 2
  { x: 60, y: 64 },  // Lesson 3
  { x: 35, y: 82 },  // Lesson 4
  { x: 50, y: 92 },  // Lesson 5 (goal - bottom)
];

/**
 * Get position for a lesson index with bounds safety.
 * If index exceeds available positions, returns the last position.
 */
const getLessonPosition = (index: number): { x: number; y: number } => {
  return PATH_POSITIONS[Math.min(index, PATH_POSITIONS.length - 1)];
};

/**
 * Calculate health for a completed lesson based on days since completion.
 * This is a temporary helper until the proper health calculation service is integrated.
 * 
 * @param daysAgo - Days since the lesson was completed
 * @returns Health percentage (0-100)
 */
const calculateHealthFromDays = (daysAgo: number | null): number => {
  if (daysAgo === null) return 0;
  const effectiveDays = Math.max(0, daysAgo);
  if (effectiveDays <= 2) return 100;
  if (effectiveDays <= 5) return 85;
  if (effectiveDays <= 10) return 60;
  if (effectiveDays <= 14) return 35;
  if (effectiveDays <= 21) return 15;
  return 5;
};

/**
 * PathView Component
 * 
 * Renders the skill path view with:
 * - Header showing skill path name and progress
 * - SVG path connecting lesson nodes
 * - Lesson nodes with appropriate states
 * - Click handlers for starting lessons
 * 
 * @param props - Component props
 * @returns Path view component
 * 
 * @example
 * <PathView
 *   skillPath={skillPath}
 *   userTree={userTree}
 *   avatar={avatar}
 *   onStartLesson={(lesson) => console.log('Start:', lesson.title)}
 *   onBack={() => navigate('/garden')}
 * />
 */
export const PathView: React.FC<PathViewProps> = ({
  skillPathId,
  userTree,
  avatar,
  refreshKey = 0,
  onStartLesson,
  onBack,
}) => {
  // Task K3: Load the skill path from PocketBase via useSkillPath.
  // refreshKey increments after lesson completion → live lesson nodes re-fetch.
  const { skillPath, isLoading, error } = useSkillPath(skillPathId, refreshKey);

  // Calculate completed count — derived from live skillPath data
  const completedCount = useMemo(() => {
    if (!skillPath) return 0;
    return skillPath.lessons.filter(
      (lesson) => lesson.status === 'completed'
    ).length;
  }, [skillPath]);

  // Calculate path segment completion status
  // A segment is completed if the lesson at its start is completed
  const getPathSegmentStyle = (lessonIndex: number) => {
    if (!skillPath) return { stroke: '#CBD5E1', strokeDasharray: '4 4' };
    const lesson = skillPath.lessons[lessonIndex];
    const isCompleted = lesson.status === 'completed';

    return {
      stroke: isCompleted ? '#86EFAC' : '#CBD5E1', // green-300 or slate-300
      strokeDasharray: isCompleted ? 'none' : '4 4',
    };
  };

  // Handle lesson node click - only allow current lesson to be started
  const handleLessonClick = (lesson: SkillPathLesson) => {
    if (lesson.status === 'current') {
      onStartLesson(lesson);
    } else if (lesson.status === 'completed') {
      // Future: Could show refresh option or lesson summary
      // For now, we just don't allow clicking completed lessons
    }
    // Locked lessons don't respond to clicks
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-4 pb-20 pt-2 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition">
            ←
          </button>
          <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="text-4xl animate-bounce">🌱</div>
          <p className="text-gray-500 font-medium">Loading your path...</p>
        </motion.div>
      </div>
    );
  }

  // ── Error / not-found state ───────────────────────────────────────────────
  if (error || !skillPath) {
    return (
      <div className="px-4 pb-20 pt-2 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition">
            ←
          </button>
          <span className="font-semibold text-gray-700">Path not found</span>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-4xl">🤔</div>
          <p className="text-gray-600 font-medium">
            We couldn&apos;t load this path right now.
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition"
          >
            Back to garden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-20 pt-2 max-w-lg mx-auto">
      {/* Header with back button, icon, name, and progress */}
      <PathHeader
        icon={skillPath.icon}
        name={skillPath.name}
        completedCount={completedCount}
        totalCount={skillPath.lessons.length}
        onBack={onBack}
      />

      {/* Path container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 520,
        }}
      >
        {/* SVG path connecting nodes */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {skillPath.lessons.slice(0, -1).map((_, index) => {
            // Use bounds-safe position getter
            const currentPos = getLessonPosition(index);
            const nextPos = getLessonPosition(index + 1);

            // Control point for quadratic curve
            // Adds winding effect to the path
            const midX = (currentPos.x + nextPos.x) / 2;
            const midY = (currentPos.y + nextPos.y) / 2;
            const cpX = midX + (index % 2 === 0 ? 12 : -12);
            const cpY = midY;

            const style = getPathSegmentStyle(index);

            return (
              <path
                key={index}
                d={`M${currentPos.x} ${currentPos.y} Q${cpX} ${cpY} ${nextPos.x} ${nextPos.y}`}
                fill="none"
                stroke={style.stroke}
                strokeWidth="2.5"
                strokeDasharray={style.strokeDasharray}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Lesson nodes */}
        {skillPath.lessons.map((lesson, index) => {
          // Use bounds-safe position getter
          const position = getLessonPosition(index);
          const isCurrent = lesson.status === 'current';
          const isLocked = lesson.status === 'locked';
          const isGoal = index === skillPath.lessons.length - 1;

          // Calculate health for completed lessons
          // In the future, this would come from userTree data
          const health = lesson.status === 'completed'
            ? calculateHealthFromDays(
                lesson.completedDate
                  ? Math.floor(
                      (Date.now() - new Date(lesson.completedDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null
              )
            : 0;

          return (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              health={health}
              isCurrent={isCurrent}
              isLocked={isLocked}
              isGoal={isGoal}
              position={position}
              avatar={isCurrent ? avatar : undefined}
              onClick={() => handleLessonClick(lesson)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PathView;