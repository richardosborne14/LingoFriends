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
import { PathHeader } from './PathHeader';
import { LessonNode } from './LessonNode';
import type { SkillPath, UserTree, PlayerAvatar, SkillPathLesson } from '../../types/game';

/**
 * Props for the PathView component
 */
export interface PathViewProps {
  /** The skill path to display */
  skillPath: SkillPath;
  /** The user's tree for this skill path (contains health data) */
  userTree?: UserTree;
  /** Player avatar to show on current lesson */
  avatar: PlayerAvatar;
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
 */
const PATH_POSITIONS: { x: number; y: number }[] = [
  { x: 40, y: 12 },  // First lesson (top)
  { x: 65, y: 35 },  // Second lesson
  { x: 35, y: 58 },  // Third lesson
  { x: 55, y: 82 },  // Final lesson (bottom = goal)
];

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
  skillPath,
  userTree,
  avatar,
  onStartLesson,
  onBack,
}) => {
  // Calculate completed count
  const completedCount = useMemo(() => {
    return skillPath.lessons.filter(
      (lesson) => lesson.status === 'completed'
    ).length;
  }, [skillPath.lessons]);

  // Calculate path segment completion status
  // A segment is completed if the lesson at its start is completed
  const getPathSegmentStyle = (lessonIndex: number) => {
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
            const currentPos = PATH_POSITIONS[index];
            const nextPos = PATH_POSITIONS[index + 1];

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
          const position = PATH_POSITIONS[index] || PATH_POSITIONS[0];
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