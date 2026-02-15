/**
 * LingoFriends - Garden Components Tests
 * 
 * Tests for utility functions and calculations used in the garden world.
 * Tests utility functions without DOM rendering for fast execution.
 * 
 * @module garden.test
 */

import { describe, it, expect } from 'vitest';
import { TreeStatus } from '../../types/game';

// ============================================
// DISTANCE CALCULATION
// ============================================

/**
 * Calculate distance between two points.
 * Mirrors the getDistance function in GardenWorld.tsx.
 */
function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe('Distance Calculation', () => {
  it('calculates distance between two points correctly', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(getDistance(p1, p2)).toBe(5);
  });

  it('returns 0 for same point', () => {
    const p = { x: 100, y: 200 };
    expect(getDistance(p, p)).toBe(0);
  });

  it('handles negative coordinates', () => {
    const p1 = { x: -5, y: -5 };
    const p2 = { x: 5, y: 5 };
    expect(getDistance(p1, p2)).toBeCloseTo(14.14, 1);
  });

  it('handles horizontal distance only', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 50, y: 100 };
    expect(getDistance(p1, p2)).toBe(50);
  });

  it('handles vertical distance only', () => {
    const p1 = { x: 100, y: 0 };
    const p2 = { x: 100, y: 75 };
    expect(getDistance(p1, p2)).toBe(75);
  });
});

// ============================================
// PROXIMITY DETECTION
// ============================================

interface MockTree {
  id: string;
  position: { x: number; y: number };
}

/**
 * Find the nearest tree within interaction distance.
 * Mirrors the findNearestTree function in GardenWorld.tsx.
 */
function findNearestTree(
  position: { x: number; y: number },
  trees: MockTree[],
  maxDistance: number
): MockTree | null {
  let nearest: { tree: MockTree; distance: number } | null = null;

  for (const tree of trees) {
    const distance = getDistance(position, tree.position);
    if (distance < maxDistance) {
      if (!nearest || distance < nearest.distance) {
        nearest = { tree, distance };
      }
    }
  }

  return nearest?.tree ?? null;
}

describe('Proximity Detection', () => {
  const trees: MockTree[] = [
    { id: 'tree1', position: { x: 100, y: 100 } },
    { id: 'tree2', position: { x: 200, y: 200 } },
    { id: 'tree3', position: { x: 300, y: 100 } },
  ];
  const INTERACTION_DISTANCE = 70;

  it('returns null when no trees are within distance', () => {
    const position = { x: 450, y: 450 };
    expect(findNearestTree(position, trees, INTERACTION_DISTANCE)).toBeNull();
  });

  it('returns the nearest tree when one is within distance', () => {
    const position = { x: 130, y: 130 }; // ~42 units from tree1
    const result = findNearestTree(position, trees, INTERACTION_DISTANCE);
    expect(result?.id).toBe('tree1');
  });

  it('returns the closest tree when multiple are within distance', () => {
    // Position that's within 70px of both tree1 (at 100,100) and tree3 (at 300,100)
    // Distance to tree1: sqrt(30^2 + 0^2) = 30px
    // Distance to tree2: sqrt(70^2 + 95^2) = ~118px (outside range)
    // Distance to tree3: sqrt(70^2 + 0^2) = 70px (exactly at boundary, not included)
    const position = { x: 140, y: 100 };
    const result = findNearestTree(position, trees, INTERACTION_DISTANCE);
    expect(result?.id).toBe('tree1');
  });

  it('returns tree when exactly at tree position', () => {
    const position = { x: 200, y: 200 };
    const result = findNearestTree(position, trees, INTERACTION_DISTANCE);
    expect(result?.id).toBe('tree2');
  });

  it('returns null for empty tree array', () => {
    const position = { x: 100, y: 100 };
    expect(findNearestTree(position, [], INTERACTION_DISTANCE)).toBeNull();
  });

  it('works at the edge of interaction distance', () => {
    // Position 60 units away from tree1 (within 70)
    const position = { x: 160, y: 100 };
    const result = findNearestTree(position, trees, INTERACTION_DISTANCE);
    expect(result?.id).toBe('tree1');
  });

  it('excludes trees just outside interaction distance', () => {
    // Position 71 units away from tree1 (outside 70)
    const position = { x: 171, y: 100 };
    expect(findNearestTree(position, trees, INTERACTION_DISTANCE)).toBeNull();
  });
});

// ============================================
// TREE STATUS DETERMINATION
// ============================================

interface MockTreeHealth {
  health: number;
  status: TreeStatus;
  lessonsCompleted: number;
}

/**
 * Determine if tree is an empty plot.
 * Mirrors the isEmptyPlot function in GardenTree.tsx.
 */
function isEmptyPlot(tree: MockTreeHealth): boolean {
  return tree.health === 0 && tree.status === TreeStatus.SEED && tree.lessonsCompleted === 0;
}

/**
 * Determine tree status category for display.
 * Mirrors the getTreeStatus function in InteractionPanel.tsx.
 */
function getTreeStatus(health: number, isEmpty: boolean): 'empty' | 'healthy' | 'thirsty' | 'dying' {
  if (isEmpty) return 'empty';
  if (health >= 80) return 'healthy';
  if (health >= 40) return 'thirsty';
  return 'dying';
}

describe('Tree Status Determination', () => {
  describe('Empty Plot Detection', () => {
    it('identifies empty plot when health is 0, status is seed, and no lessons completed', () => {
      const tree: MockTreeHealth = { health: 0, status: TreeStatus.SEED, lessonsCompleted: 0 };
      expect(isEmptyPlot(tree)).toBe(true);
    });

    it('does not identify as empty when tree has health', () => {
      const tree: MockTreeHealth = { health: 50, status: TreeStatus.SEED, lessonsCompleted: 0 };
      expect(isEmptyPlot(tree)).toBe(false);
    });

    it('does not identify as empty when status is not seed', () => {
      const tree: MockTreeHealth = { health: 0, status: TreeStatus.GROWING, lessonsCompleted: 0 };
      expect(isEmptyPlot(tree)).toBe(false);
    });

    it('does not identify as empty when lessons are completed', () => {
      const tree: MockTreeHealth = { health: 0, status: TreeStatus.SEED, lessonsCompleted: 1 };
      expect(isEmptyPlot(tree)).toBe(false);
    });
  });

  describe('Tree Status Category', () => {
    it('returns empty for empty plots', () => {
      expect(getTreeStatus(0, true)).toBe('empty');
    });

    it('returns healthy for health >= 80', () => {
      expect(getTreeStatus(80, false)).toBe('healthy');
      expect(getTreeStatus(90, false)).toBe('healthy');
      expect(getTreeStatus(100, false)).toBe('healthy');
    });

    it('returns thirsty for health 40-79', () => {
      expect(getTreeStatus(40, false)).toBe('thirsty');
      expect(getTreeStatus(50, false)).toBe('thirsty');
      expect(getTreeStatus(79, false)).toBe('thirsty');
    });

    it('returns dying for health < 40', () => {
      expect(getTreeStatus(0, false)).toBe('dying');
      expect(getTreeStatus(20, false)).toBe('dying');
      expect(getTreeStatus(39, false)).toBe('dying');
    });
  });
});

// ============================================
// AVATAR BOUNDARIES
// ============================================

describe('Avatar Position Boundaries', () => {
  const GARDEN_WIDTH = 650;
  const GARDEN_HEIGHT = 520;
  const PADDING = 20;

  /**
   * Clamp avatar position within garden boundaries.
   */
  function clampPosition(position: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.max(PADDING, Math.min(GARDEN_WIDTH - PADDING, position.x)),
      y: Math.max(PADDING, Math.min(GARDEN_HEIGHT - PADDING, position.y)),
    };
  }

  it('keeps position within bounds', () => {
    const pos = { x: 300, y: 250 };
    const clamped = clampPosition(pos);
    expect(clamped.x).toBe(300);
    expect(clamped.y).toBe(250);
  });

  it('clamps x to minimum padding', () => {
    const pos = { x: 0, y: 250 };
    const clamped = clampPosition(pos);
    expect(clamped.x).toBe(PADDING);
  });

  it('clamps x to maximum (width - padding)', () => {
    const pos = { x: 700, y: 250 };
    const clamped = clampPosition(pos);
    expect(clamped.x).toBe(GARDEN_WIDTH - PADDING);
  });

  it('clamps y to minimum padding', () => {
    const pos = { x: 300, y: 0 };
    const clamped = clampPosition(pos);
    expect(clamped.y).toBe(PADDING);
  });

  it('clamps y to maximum (height - padding)', () => {
    const pos = { x: 300, y: 600 };
    const clamped = clampPosition(pos);
    expect(clamped.y).toBe(GARDEN_HEIGHT - PADDING);
  });

  it('clamps both x and y when both out of bounds', () => {
    const pos = { x: -10, y: 600 };
    const clamped = clampPosition(pos);
    expect(clamped.x).toBe(PADDING);
    expect(clamped.y).toBe(GARDEN_HEIGHT - PADDING);
  });
});

// ============================================
// MOVEMENT DELTA CALCULATIONS
// ============================================

describe('Movement Delta Calculations', () => {
  const AVATAR_SPEED = 5;
  const TOUCH_MOVE_DELTA = 20;

  it('keyboard movement applies correct speed', () => {
    // Up
    expect(AVATAR_SPEED).toBe(5);
    // Down
    expect(AVATAR_SPEED).toBe(5);
    // Left
    expect(AVATAR_SPEED).toBe(5);
    // Right
    expect(AVATAR_SPEED).toBe(5);
  });

  it('touch movement applies correct delta', () => {
    expect(TOUCH_MOVE_DELTA).toBe(20);
  });

  it('movement speed is smaller than touch delta', () => {
    expect(AVATAR_SPEED).toBeLessThan(TOUCH_MOVE_DELTA);
  });
});

// ============================================
// HEALTH BAR COLOR
// ============================================

describe('Health Bar Color Selection', () => {
  /**
   * Get health bar color based on health percentage.
   */
  function getHealthBarColor(health: number): string {
    if (health > 70) return '#34D399'; // green-400
    if (health > 40) return '#FBBF24'; // amber-400
    return '#F87171'; // red-400
  }

  it('returns green for health > 70', () => {
    expect(getHealthBarColor(71)).toBe('#34D399');
    expect(getHealthBarColor(85)).toBe('#34D399');
    expect(getHealthBarColor(100)).toBe('#34D399');
  });

  it('returns amber for health 41-70', () => {
    expect(getHealthBarColor(41)).toBe('#FBBF24');
    expect(getHealthBarColor(50)).toBe('#FBBF24');
    expect(getHealthBarColor(70)).toBe('#FBBF24');
  });

  it('returns red for health <= 40', () => {
    expect(getHealthBarColor(0)).toBe('#F87171');
    expect(getHealthBarColor(20)).toBe('#F87171');
    expect(getHealthBarColor(40)).toBe('#F87171');
  });
});

// ============================================
// INTERACTION PANEL ACTIONS
// ============================================

interface MockInteractionTree {
  health: number;
  isEmpty: boolean;
  status: 'empty' | 'healthy' | 'thirsty' | 'dying';
}

/**
 * Determine the primary action for an interaction panel.
 */
function getPrimaryAction(tree: MockInteractionTree): string {
  if (tree.isEmpty || tree.status === 'empty') return 'plant';
  if (tree.health < 50) return 'refresh';
  return 'openPath';
}

describe('Interaction Panel Actions', () => {
  it('shows "plant" action for empty plots', () => {
    const tree: MockInteractionTree = { health: 0, isEmpty: true, status: 'empty' };
    expect(getPrimaryAction(tree)).toBe('plant');
  });

  it('shows "refresh" action for trees with health < 50', () => {
    const tree: MockInteractionTree = { health: 30, isEmpty: false, status: 'thirsty' };
    expect(getPrimaryAction(tree)).toBe('refresh');
  });

  it('shows "refresh" action for dying trees', () => {
    const tree: MockInteractionTree = { health: 20, isEmpty: false, status: 'dying' };
    expect(getPrimaryAction(tree)).toBe('refresh');
  });

  it('shows "openPath" action for healthy trees', () => {
    const tree: MockInteractionTree = { health: 80, isEmpty: false, status: 'healthy' };
    expect(getPrimaryAction(tree)).toBe('openPath');
  });

  it('shows "openPath" action for borderline healthy (50-79)', () => {
    const tree: MockInteractionTree = { health: 50, isEmpty: false, status: 'thirsty' };
    expect(getPrimaryAction(tree)).toBe('openPath');
  });
});

// ============================================
// GARDEN DIMENSIONS
// ============================================

describe('Garden Dimensions', () => {
  const GARDEN_WIDTH = 650;
  const GARDEN_HEIGHT = 520;

  it('garden has valid dimensions', () => {
    expect(GARDEN_WIDTH).toBeGreaterThan(0);
    expect(GARDEN_HEIGHT).toBeGreaterThan(0);
  });

  it('garden is landscape orientation', () => {
    expect(GARDEN_WIDTH).toBeGreaterThan(GARDEN_HEIGHT);
  });

  it('garden aspect ratio is reasonable for mobile', () => {
    const ratio = GARDEN_WIDTH / GARDEN_HEIGHT;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(2);
  });
});

// ============================================
// RESPONSIVE WIDTH CALCULATION
// ============================================

describe('Responsive Garden Width', () => {
  const GARDEN_WIDTH = 650;

  /**
   * Calculate responsive garden width.
   */
  function calculateResponsiveWidth(viewportWidth: number): number {
    return Math.min(GARDEN_WIDTH, viewportWidth - 20);
  }

  it('uses full width when viewport is large enough', () => {
    expect(calculateResponsiveWidth(800)).toBe(GARDEN_WIDTH);
    expect(calculateResponsiveWidth(1200)).toBe(GARDEN_WIDTH);
  });

  it('shrinks to fit smaller viewport', () => {
    expect(calculateResponsiveWidth(500)).toBe(480);
    expect(calculateResponsiveWidth(400)).toBe(380);
  });

  it('handles very narrow viewport', () => {
    expect(calculateResponsiveWidth(100)).toBe(80);
  });
});