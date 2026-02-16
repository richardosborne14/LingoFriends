/**
 * Unit Tests for Pocketbase Type Definitions
 * 
 * Tests for the helper functions that convert Pocketbase records to domain types.
 * Run with: npm test -- src/types/pocketbase.test.ts
 * 
 * @see docs/phase-1.1/task-1-1-7-pocketbase-schema.md
 */

import { describe, it, expect } from 'vitest';
import { LessonStatus, TreeStatus, GiftType } from './game';
import {
  userTreeRecordToUserTree,
  giftRecordToGiftItem,
  skillPathRecordToSkillPath,
  decorationRecordToGardenDecoration,
  type UserTreeRecord,
  type GiftRecord,
  type SkillPathRecord,
  type DecorationRecord,
} from './pocketbase';

// ============================================================================
// USER TREE RECORD CONVERSION TESTS
// ============================================================================

describe('userTreeRecordToUserTree', () => {
  const createMockUserTreeRecord = (overrides: Partial<UserTreeRecord> = {}): UserTreeRecord => ({
    id: 'tree-123',
    collectionId: 'pbc_user_trees',
    collectionName: 'user_trees',
    user: 'user-456',
    skillPath: 'skillpath-789',
    status: TreeStatus.GROWING,
    health: 75,
    sunDropsTotal: 42,
    lessonsCompleted: 3,
    lessonsTotal: 6,
    lastRefreshDate: '2026-02-13 10:00:00.000Z',
    position: { x: 150, y: 200 },
    decorations: ['deco-1', 'deco-2'],
    created: '2026-02-10 10:00:00.000Z',
    updated: '2026-02-15 10:00:00.000Z',
    ...overrides,
  });

  it('maps id correctly', () => {
    const record = createMockUserTreeRecord();
    const result = userTreeRecordToUserTree(record);
    expect(result.id).toBe('tree-123');
  });

  it('maps skillPath to skillPathId', () => {
    const record = createMockUserTreeRecord();
    const result = userTreeRecordToUserTree(record);
    expect(result.skillPathId).toBe('skillpath-789');
  });

  it('maps status directly', () => {
    const record = createMockUserTreeRecord({ status: TreeStatus.BLOOMED });
    const result = userTreeRecordToUserTree(record);
    expect(result.status).toBe(TreeStatus.BLOOMED);
  });

  it('maps health correctly', () => {
    const record = createMockUserTreeRecord({ health: 85 });
    const result = userTreeRecordToUserTree(record);
    expect(result.health).toBe(85);
  });

  it('maps sunDropsTotal correctly', () => {
    const record = createMockUserTreeRecord({ sunDropsTotal: 100 });
    const result = userTreeRecordToUserTree(record);
    expect(result.sunDropsTotal).toBe(100);
  });

  it('maps lessonsCompleted and lessonsTotal', () => {
    const record = createMockUserTreeRecord({ lessonsCompleted: 5, lessonsTotal: 10 });
    const result = userTreeRecordToUserTree(record);
    expect(result.lessonsCompleted).toBe(5);
    expect(result.lessonsTotal).toBe(10);
  });

  it('uses lastRefreshDate when present', () => {
    const record = createMockUserTreeRecord({ lastRefreshDate: '2026-02-14 12:00:00.000Z' });
    const result = userTreeRecordToUserTree(record);
    expect(result.lastRefreshDate).toBe('2026-02-14 12:00:00.000Z');
  });

  it('falls back to created when lastRefreshDate is missing', () => {
    const record = createMockUserTreeRecord({ 
      lastRefreshDate: undefined,
      created: '2026-02-10 08:00:00.000Z' 
    } as unknown as UserTreeRecord);
    const result = userTreeRecordToUserTree(record);
    expect(result.lastRefreshDate).toBe('2026-02-10 08:00:00.000Z');
  });

  it('maps position correctly', () => {
    const record = createMockUserTreeRecord({ position: { x: 300, y: 400 } });
    const result = userTreeRecordToUserTree(record);
    expect(result.position).toEqual({ x: 300, y: 400 });
  });

  it('maps decorations array', () => {
    const record = createMockUserTreeRecord({ decorations: ['a', 'b', 'c'] });
    const result = userTreeRecordToUserTree(record);
    expect(result.decorations).toEqual(['a', 'b', 'c']);
  });

  it('defaults decorations to empty array when undefined', () => {
    const record = createMockUserTreeRecord({ decorations: undefined } as unknown as UserTreeRecord);
    const result = userTreeRecordToUserTree(record);
    expect(result.decorations).toEqual([]);
  });

  it('leaves name and icon empty (populated by join)', () => {
    const record = createMockUserTreeRecord();
    const result = userTreeRecordToUserTree(record);
    expect(result.name).toBe('');
    expect(result.icon).toBe('');
  });

  it('leaves giftsReceived empty (populated by separate query)', () => {
    const record = createMockUserTreeRecord();
    const result = userTreeRecordToUserTree(record);
    expect(result.giftsReceived).toEqual([]);
  });

  describe('status enum values', () => {
    it('handles seed status', () => {
      const record = createMockUserTreeRecord({ status: TreeStatus.SEED });
      const result = userTreeRecordToUserTree(record);
      expect(result.status).toBe('seed');
    });

    it('handles growing status', () => {
      const record = createMockUserTreeRecord({ status: TreeStatus.GROWING });
      const result = userTreeRecordToUserTree(record);
      expect(result.status).toBe('growing');
    });

    it('handles bloomed status', () => {
      const record = createMockUserTreeRecord({ status: TreeStatus.BLOOMED });
      const result = userTreeRecordToUserTree(record);
      expect(result.status).toBe('bloomed');
    });
  });
});

// ============================================================================
// GIFT RECORD CONVERSION TESTS
// ============================================================================

describe('giftRecordToGiftItem', () => {
  const createMockGiftRecord = (overrides: Partial<GiftRecord> = {}): GiftRecord => ({
    id: 'gift-123',
    collectionId: 'pbc_gifts',
    collectionName: 'gifts',
    type: GiftType.WATER_DROP,
    fromUser: 'user-456',
    toUser: 'user-789',
    toItem: 'tree-abc',
    message: 'Have a great day!',
    unlockedAt: '2026-02-10 10:00:00.000Z',
    sentAt: '2026-02-11 10:00:00.000Z',
    appliedAt: '2026-02-12 10:00:00.000Z',
    created: '2026-02-11 10:00:00.000Z',
    ...overrides,
  });

  it('maps id correctly', () => {
    const record = createMockGiftRecord();
    const result = giftRecordToGiftItem(record);
    expect(result.id).toBe('gift-123');
  });

  it('maps type directly', () => {
    const record = createMockGiftRecord({ type: GiftType.GOLDEN_FLOWER });
    const result = giftRecordToGiftItem(record);
    expect(result.type).toBe('golden_flower');
  });

  it('maps fromUser to fromUserId', () => {
    const record = createMockGiftRecord({ fromUser: 'sender-999' });
    const result = giftRecordToGiftItem(record);
    expect(result.fromUserId).toBe('sender-999');
  });

  it('maps appliedAt to appliedDate', () => {
    const record = createMockGiftRecord({ appliedAt: '2026-02-15 08:00:00.000Z' });
    const result = giftRecordToGiftItem(record);
    expect(result.appliedDate).toBe('2026-02-15 08:00:00.000Z');
  });

  it('handles undefined appliedAt', () => {
    const record = createMockGiftRecord({ appliedAt: undefined } as unknown as GiftRecord);
    const result = giftRecordToGiftItem(record);
    expect(result.appliedDate).toBeUndefined();
  });

  it('leaves fromUserName empty (populated by join)', () => {
    const record = createMockGiftRecord();
    const result = giftRecordToGiftItem(record);
    expect(result.fromUserName).toBe('');
  });

  describe('gift type enum values', () => {
    it('handles water_drop type', () => {
      const record = createMockGiftRecord({ type: GiftType.WATER_DROP });
      const result = giftRecordToGiftItem(record);
      expect(result.type).toBe('water_drop');
    });

    it('handles sparkle type', () => {
      const record = createMockGiftRecord({ type: GiftType.SPARKLE });
      const result = giftRecordToGiftItem(record);
      expect(result.type).toBe('sparkle');
    });

    it('handles seed type', () => {
      const record = createMockGiftRecord({ type: GiftType.SEED });
      const result = giftRecordToGiftItem(record);
      expect(result.type).toBe('seed');
    });

    it('handles decoration type', () => {
      const record = createMockGiftRecord({ type: GiftType.DECORATION });
      const result = giftRecordToGiftItem(record);
      expect(result.type).toBe('decoration');
    });

    it('handles golden_flower type', () => {
      const record = createMockGiftRecord({ type: GiftType.GOLDEN_FLOWER });
      const result = giftRecordToGiftItem(record);
      expect(result.type).toBe('golden_flower');
    });
  });
});

// ============================================================================
// SKILL PATH RECORD CONVERSION TESTS
// ============================================================================

describe('skillPathRecordToSkillPath', () => {
  const createMockSkillPathRecord = (overrides: Partial<SkillPathRecord> = {}): SkillPathRecord => ({
    id: 'skillpath-123',
    collectionId: 'pbc_skill_paths',
    collectionName: 'skill_paths',
    name: 'Sports Talk',
    icon: '⚽',
    description: 'Learn sports vocabulary',
    category: 'beginner',
    language: 'fr',
    lessons: [
      { id: 'lesson-1', title: 'Match Day', icon: '⚽', activities: 6, sunDropsMax: 20 },
      { id: 'lesson-2', title: 'At the Stadium', icon: '🏟️', activities: 5, sunDropsMax: 18 },
    ],
    created: '2026-02-01 10:00:00.000Z',
    updated: '2026-02-15 10:00:00.000Z',
    ...overrides,
  });

  it('maps id correctly', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.id).toBe('skillpath-123');
  });

  it('maps name directly', () => {
    const record = createMockSkillPathRecord({ name: 'Food & Restaurant' });
    const result = skillPathRecordToSkillPath(record);
    expect(result.name).toBe('Food & Restaurant');
  });

  it('maps icon directly', () => {
    const record = createMockSkillPathRecord({ icon: '🍽️' });
    const result = skillPathRecordToSkillPath(record);
    expect(result.icon).toBe('🍽️');
  });

  it('maps description directly', () => {
    const record = createMockSkillPathRecord({ description: 'Learn about food' });
    const result = skillPathRecordToSkillPath(record);
    expect(result.description).toBe('Learn about food');
  });

  it('maps category directly', () => {
    const record = createMockSkillPathRecord({ category: 'intermediate' });
    const result = skillPathRecordToSkillPath(record);
    expect(result.category).toBe('intermediate');
  });

  it('maps lessons array correctly', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons).toHaveLength(2);
    expect(result.lessons[0].id).toBe('lesson-1');
    expect(result.lessons[0].title).toBe('Match Day');
    expect(result.lessons[0].icon).toBe('⚽');
    expect(result.lessons[0].sunDropsMax).toBe(20);
  });

  it('sets lesson status to LOCKED by default', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons[0].status).toBe(LessonStatus.LOCKED);
  });

  it('sets lesson stars to 0 by default', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons[0].stars).toBe(0);
  });

  it('sets lesson sunDropsEarned to 0 by default', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons[0].sunDropsEarned).toBe(0);
  });

  it('uses sunDropsMax from lesson if provided', () => {
    const record = createMockSkillPathRecord({
      lessons: [{ id: 'l1', title: 'Test', icon: '📚', activities: 5, sunDropsMax: 25 }],
    });
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons[0].sunDropsMax).toBe(25);
  });

  it('calculates sunDropsMax from activities if not provided', () => {
    const record = createMockSkillPathRecord({
      lessons: [{ id: 'l1', title: 'Test', icon: '📚', activities: 6 }],
    });
    const result = skillPathRecordToSkillPath(record);
    // activities * 4 = 6 * 4 = 24
    expect(result.lessons[0].sunDropsMax).toBe(24);
  });

  it('sets completedDate to undefined by default', () => {
    const record = createMockSkillPathRecord();
    const result = skillPathRecordToSkillPath(record);
    expect(result.lessons[0].completedDate).toBeUndefined();
  });
});

// ============================================================================
// DECORATION RECORD CONVERSION TESTS
// ============================================================================

describe('decorationRecordToGardenDecoration', () => {
  const createMockDecorationRecord = (overrides: Partial<DecorationRecord> = {}): DecorationRecord => ({
    id: 'deco-123',
    collectionId: 'pbc_decorations',
    collectionName: 'decorations',
    user: 'user-456',
    itemType: 'bench',
    position: { x: 300, y: 400 },
    placed: true,
    unlockedAt: '2026-02-10 10:00:00.000Z',
    created: '2026-02-10 10:00:00.000Z',
    ...overrides,
  });

  it('maps id correctly', () => {
    const record = createMockDecorationRecord();
    const result = decorationRecordToGardenDecoration(record);
    expect(result.id).toBe('deco-123');
  });

  it('maps itemType directly', () => {
    const record = createMockDecorationRecord({ itemType: 'lantern' });
    const result = decorationRecordToGardenDecoration(record);
    expect(result.itemType).toBe('lantern');
  });

  it('maps position correctly when present', () => {
    const record = createMockDecorationRecord({ position: { x: 100, y: 200 } });
    const result = decorationRecordToGardenDecoration(record);
    expect(result.position).toEqual({ x: 100, y: 200 });
  });

  it('defaults position to {x:0, y:0} when undefined', () => {
    const record = createMockDecorationRecord({ position: undefined } as unknown as DecorationRecord);
    const result = decorationRecordToGardenDecoration(record);
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  describe('decoration types', () => {
    const decorationTypes = ['hedge', 'bench', 'lantern', 'pond', 'fountain', 'butterfly', 'birdhouse', 'flower_bed', 'garden_gnome', 'stepping_stone'] as const;
    
    decorationTypes.forEach((type) => {
      it(`handles ${type} type`, () => {
        const record = createMockDecorationRecord({ itemType: type });
        const result = decorationRecordToGardenDecoration(record);
        expect(result.itemType).toBe(type);
      });
    });
  });
});