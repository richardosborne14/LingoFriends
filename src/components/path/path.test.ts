/**
 * LingoFriends - Path View Components Tests
 * 
 * Tests for utility functions and calculations used in the path view.
 * Tests utility functions without DOM rendering for fast execution.
 * 
 * @module path.test
 */

import { describe, it, expect } from 'vitest';
import { LessonStatus } from '../../types/game';

// ============================================
// HEALTH CALCULATION FROM DAYS
// ============================================

/**
 * Calculate health for a completed lesson based on days since completion.
 * This mirrors the logic in PathView.tsx.
 */
function calculateHealthFromDays(daysAgo: number | null): number {
  if (daysAgo === null) return 0;
  const effectiveDays = Math.max(0, daysAgo);
  if (effectiveDays <= 2) return 100;
  if (effectiveDays <= 5) return 85;
  if (effectiveDays <= 10) return 60;
  if (effectiveDays <= 14) return 35;
  if (effectiveDays <= 21) return 15;
  return 5;
}

describe('Health Calculation from Days', () => {
  it('returns 0 for null (no completion)', () => {
    expect(calculateHealthFromDays(null)).toBe(0);
  });

  it('returns 100 for recently completed lessons (0-2 days)', () => {
    expect(calculateHealthFromDays(0)).toBe(100);
    expect(calculateHealthFromDays(1)).toBe(100);
    expect(calculateHealthFromDays(2)).toBe(100);
  });

  it('returns 85 for lessons 3-5 days old', () => {
    expect(calculateHealthFromDays(3)).toBe(85);
    expect(calculateHealthFromDays(5)).toBe(85);
  });

  it('returns 60 for lessons 6-10 days old', () => {
    expect(calculateHealthFromDays(6)).toBe(60);
    expect(calculateHealthFromDays(10)).toBe(60);
  });

  it('returns 35 for lessons 11-14 days old', () => {
    expect(calculateHealthFromDays(11)).toBe(35);
    expect(calculateHealthFromDays(14)).toBe(35);
  });

  it('returns 15 for lessons 15-21 days old', () => {
    expect(calculateHealthFromDays(15)).toBe(15);
    expect(calculateHealthFromDays(21)).toBe(15);
  });

  it('returns 5 for lessons older than 21 days', () => {
    expect(calculateHealthFromDays(22)).toBe(5);
    expect(calculateHealthFromDays(30)).toBe(5);
    expect(calculateHealthFromDays(100)).toBe(5);
  });

  it('handles negative values by treating as 0', () => {
    expect(calculateHealthFromDays(-5)).toBe(100);
  });
});

// ============================================
// MINI TREE STAGE CALCULATION
// ============================================

/**
 * Determine the MiniTree visual stage based on health.
 * - Stage 0: 0% (empty/seed)
 * - Stage 1: 1-30% (bare branches)
 * - Stage 2: 31-60% (some leaves)
 * - Stage 3: 61-85% (healthy)
 * - Stage 4: 86-100% (full bloom)
 */
function getMiniTreeStage(health: number): number {
  const clampedHealth = Math.max(0, Math.min(100, health));
  if (clampedHealth === 0) return 0;
  if (clampedHealth < 31) return 1;
  if (clampedHealth < 61) return 2;
  if (clampedHealth < 86) return 3;
  return 4;
}

describe('MiniTree Stage Calculation', () => {
  it('returns stage 0 for 0% health (empty plot)', () => {
    expect(getMiniTreeStage(0)).toBe(0);
  });

  it('returns stage 1 for 1-30% health (bare branches)', () => {
    expect(getMiniTreeStage(1)).toBe(1);
    expect(getMiniTreeStage(15)).toBe(1);
    expect(getMiniTreeStage(30)).toBe(1);
  });

  it('returns stage 2 for 31-60% health (some leaves, yellowing)', () => {
    expect(getMiniTreeStage(31)).toBe(2);
    expect(getMiniTreeStage(45)).toBe(2);
    expect(getMiniTreeStage(60)).toBe(2);
  });

  it('returns stage 3 for 61-85% health (healthy, full leaves)', () => {
    expect(getMiniTreeStage(61)).toBe(3);
    expect(getMiniTreeStage(75)).toBe(3);
    expect(getMiniTreeStage(85)).toBe(3);
  });

  it('returns stage 4 for 86-100% health (full bloom)', () => {
    expect(getMiniTreeStage(86)).toBe(4);
    expect(getMiniTreeStage(95)).toBe(4);
    expect(getMiniTreeStage(100)).toBe(4);
  });

  it('clamps values outside 0-100 range', () => {
    expect(getMiniTreeStage(-10)).toBe(0);
    expect(getMiniTreeStage(150)).toBe(4);
  });
});

// ============================================
// LESSON NODE STATUS DETERMINATION
// ============================================

interface MockLessonStatus {
  status: LessonStatus;
  health: number;
}

/**
 * Determine display properties for a lesson node.
 */
function getLessonNodeDisplay(status: MockLessonStatus): {
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  needsRefresh: boolean;
} {
  return {
    isCompleted: status.status === LessonStatus.COMPLETED,
    isCurrent: status.status === LessonStatus.CURRENT,
    isLocked: status.status === LessonStatus.LOCKED,
    needsRefresh: status.status === LessonStatus.COMPLETED && status.health > 0 && status.health < 50,
  };
}

describe('Lesson Node Status', () => {
  it('completed lessons show as completed', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.COMPLETED, health: 85 });
    expect(display.isCompleted).toBe(true);
    expect(display.isCurrent).toBe(false);
    expect(display.isLocked).toBe(false);
    expect(display.needsRefresh).toBe(false);
  });

  it('current lesson shows as current', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.CURRENT, health: 0 });
    expect(display.isCompleted).toBe(false);
    expect(display.isCurrent).toBe(true);
    expect(display.isLocked).toBe(false);
    expect(display.needsRefresh).toBe(false);
  });

  it('locked lessons show as locked', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.LOCKED, health: 0 });
    expect(display.isCompleted).toBe(false);
    expect(display.isCurrent).toBe(false);
    expect(display.isLocked).toBe(true);
    expect(display.needsRefresh).toBe(false);
  });

  it('completed lessons with low health need refresh', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.COMPLETED, health: 30 });
    expect(display.isCompleted).toBe(true);
    expect(display.needsRefresh).toBe(true);
  });

  it('completed lessons with exactly 50% health do not need refresh', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.COMPLETED, health: 50 });
    expect(display.needsRefresh).toBe(false);
  });

  it('completed lessons with high health do not need refresh', () => {
    const display = getLessonNodeDisplay({ status: LessonStatus.COMPLETED, health: 75 });
    expect(display.needsRefresh).toBe(false);
  });
});

// ============================================
// PATH POSITION CALCULATION
// ============================================

describe('Path Position Layout', () => {
  // Predefined positions for a 4-lesson path
  const PATH_POSITIONS = [
    { x: 40, y: 12 },  // First lesson (top)
    { x: 65, y: 35 },  // Second lesson
    { x: 35, y: 58 },  // Third lesson
    { x: 55, y: 82 },  // Final lesson (bottom = goal)
  ];

  it('has 4 predefined positions', () => {
    expect(PATH_POSITIONS.length).toBe(4);
  });

  it('first lesson is at top (low y value)', () => {
    const firstPos = PATH_POSITIONS[0];
    expect(firstPos.y).toBeLessThan(20);
  });

  it('last lesson is at bottom (high y value)', () => {
    const lastPos = PATH_POSITIONS[PATH_POSITIONS.length - 1];
    expect(lastPos.y).toBeGreaterThan(80);
  });

  it('all positions are within valid percentage range', () => {
    PATH_POSITIONS.forEach(pos => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(100);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(100);
    });
  });

  it('positions create a winding path (alternating x)', () => {
    // First at x=40, second at x=65 (right), third at x=35 (left), fourth at x=55 (right)
    expect(PATH_POSITIONS[0].x).toBeLessThan(PATH_POSITIONS[1].x);
    expect(PATH_POSITIONS[1].x).toBeGreaterThan(PATH_POSITIONS[2].x);
    expect(PATH_POSITIONS[2].x).toBeLessThan(PATH_POSITIONS[3].x);
  });

  it('y positions increase (top to bottom flow)', () => {
    for (let i = 1; i < PATH_POSITIONS.length; i++) {
      expect(PATH_POSITIONS[i].y).toBeGreaterThan(PATH_POSITIONS[i - 1].y);
    }
  });
});

// ============================================
// PATH SEGMENT STYLES
// ============================================

/**
 * Get path segment style based on completion status.
 */
function getPathSegmentStyle(isCompleted: boolean): {
  stroke: string;
  strokeDasharray: string;
} {
  return {
    stroke: isCompleted ? '#86EFAC' : '#CBD5E1', // green-300 or slate-300
    strokeDasharray: isCompleted ? 'none' : '4 4',
  };
}

describe('Path Segment Styles', () => {
  it('completed segments use solid green', () => {
    const style = getPathSegmentStyle(true);
    expect(style.stroke).toBe('#86EFAC');
    expect(style.strokeDasharray).toBe('none');
  });

  it('incomplete segments use dashed grey', () => {
    const style = getPathSegmentStyle(false);
    expect(style.stroke).toBe('#CBD5E1');
    expect(style.strokeDasharray).toBe('4 4');
  });
});

// ============================================
// PROGRESS CALCULATION
// ============================================

describe('Path Progress Calculation', () => {
  interface MockLesson {
    status: LessonStatus;
  }

  function calculateProgress(lessons: MockLesson[]): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const completed = lessons.filter(l => l.status === LessonStatus.COMPLETED).length;
    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }

  it('calculates progress for no completion', () => {
    const lessons: MockLesson[] = [
      { status: LessonStatus.LOCKED },
      { status: LessonStatus.LOCKED },
      { status: LessonStatus.CURRENT },
      { status: LessonStatus.LOCKED },
    ];
    const progress = calculateProgress(lessons);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(0);
  });

  it('calculates progress for partial completion', () => {
    const lessons: MockLesson[] = [
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.CURRENT },
      { status: LessonStatus.LOCKED },
    ];
    const progress = calculateProgress(lessons);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(50);
  });

  it('calculates progress for full completion', () => {
    const lessons: MockLesson[] = [
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
    ];
    const progress = calculateProgress(lessons);
    expect(progress.completed).toBe(4);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(100);
  });

  it('handles empty lesson array', () => {
    const lessons: MockLesson[] = [];
    const progress = calculateProgress(lessons);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0);
  });
});

// ============================================
// GOAL LESSON IDENTIFICATION
// ============================================

describe('Goal Lesson Identification', () => {
  function isGoalLesson(lessonIndex: number, totalLessons: number): boolean {
    return lessonIndex === totalLessons - 1;
  }

  it('last lesson is goal', () => {
    expect(isGoalLesson(3, 4)).toBe(true);
    expect(isGoalLesson(2, 3)).toBe(true);
    expect(isGoalLesson(0, 1)).toBe(true);
  });

  it('non-last lessons are not goal', () => {
    expect(isGoalLesson(0, 4)).toBe(false);
    expect(isGoalLesson(1, 4)).toBe(false);
    expect(isGoalLesson(2, 4)).toBe(false);
  });
});

// ============================================
// STAR DISPLAY
// ============================================

describe('Star Display for Completed Lessons', () => {
  function getStarDisplay(stars: number): { filled: number; empty: number } {
    const clampedStars = Math.max(0, Math.min(3, stars));
    return {
      filled: clampedStars,
      empty: 3 - clampedStars,
    };
  }

  it('displays correct stars for 0 stars', () => {
    const display = getStarDisplay(0);
    expect(display.filled).toBe(0);
    expect(display.empty).toBe(3);
  });

  it('displays correct stars for 1 star', () => {
    const display = getStarDisplay(1);
    expect(display.filled).toBe(1);
    expect(display.empty).toBe(2);
  });

  it('displays correct stars for 2 stars', () => {
    const display = getStarDisplay(2);
    expect(display.filled).toBe(2);
    expect(display.empty).toBe(1);
  });

  it('displays correct stars for 3 stars', () => {
    const display = getStarDisplay(3);
    expect(display.filled).toBe(3);
    expect(display.empty).toBe(0);
  });

  it('clamps values above 3', () => {
    const display = getStarDisplay(5);
    expect(display.filled).toBe(3);
    expect(display.empty).toBe(0);
  });

  it('clamps negative values', () => {
    const display = getStarDisplay(-1);
    expect(display.filled).toBe(0);
    expect(display.empty).toBe(3);
  });
});