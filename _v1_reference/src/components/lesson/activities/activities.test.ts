/**
 * LingoFriends - Activity Components Tests
 * 
 * Tests for the 6 activity types and ActivityRouter.
 * Uses vitest for testing framework.
 * 
 * @module activities.test
 */

import { describe, it, expect, vi } from 'vitest';
import { GameActivityType } from '../../../types/game';
import { getActivityTypeName, requiresTextInput, getActivityDifficultyRange } from './ActivityRouter';

// ============================================
// ACTIVITY ROUTER UTILITIES
// ============================================

describe('ActivityRouter utilities', () => {
  describe('getActivityTypeName', () => {
    it('returns correct name for MULTIPLE_CHOICE', () => {
      expect(getActivityTypeName(GameActivityType.MULTIPLE_CHOICE)).toBe('Multiple Choice');
    });

    it('returns correct name for FILL_BLANK', () => {
      expect(getActivityTypeName(GameActivityType.FILL_BLANK)).toBe('Fill in the Blank');
    });

    it('returns correct name for WORD_ARRANGE', () => {
      expect(getActivityTypeName(GameActivityType.WORD_ARRANGE)).toBe('Word Arrange');
    });

    it('returns correct name for TRUE_FALSE', () => {
      expect(getActivityTypeName(GameActivityType.TRUE_FALSE)).toBe('True or False');
    });

    it('returns correct name for MATCHING', () => {
      expect(getActivityTypeName(GameActivityType.MATCHING)).toBe('Matching Pairs');
    });

    it('returns correct name for TRANSLATE', () => {
      expect(getActivityTypeName(GameActivityType.TRANSLATE)).toBe('Translate');
    });
  });

  describe('requiresTextInput', () => {
    it('returns true for FILL_BLANK', () => {
      expect(requiresTextInput(GameActivityType.FILL_BLANK)).toBe(true);
    });

    it('returns true for TRANSLATE', () => {
      expect(requiresTextInput(GameActivityType.TRANSLATE)).toBe(true);
    });

    it('returns false for MULTIPLE_CHOICE', () => {
      expect(requiresTextInput(GameActivityType.MULTIPLE_CHOICE)).toBe(false);
    });

    it('returns false for TRUE_FALSE', () => {
      expect(requiresTextInput(GameActivityType.TRUE_FALSE)).toBe(false);
    });

    it('returns false for WORD_ARRANGE', () => {
      expect(requiresTextInput(GameActivityType.WORD_ARRANGE)).toBe(false);
    });

    it('returns false for MATCHING', () => {
      expect(requiresTextInput(GameActivityType.MATCHING)).toBe(false);
    });
  });

  describe('getActivityDifficultyRange', () => {
    it('returns [1, 2] for MULTIPLE_CHOICE (easier)', () => {
      expect(getActivityDifficultyRange(GameActivityType.MULTIPLE_CHOICE)).toEqual([1, 2]);
    });

    it('returns [1, 1] for TRUE_FALSE (easiest)', () => {
      expect(getActivityDifficultyRange(GameActivityType.TRUE_FALSE)).toEqual([1, 1]);
    });

    it('returns [2, 3] for FILL_BLANK (medium)', () => {
      expect(getActivityDifficultyRange(GameActivityType.FILL_BLANK)).toEqual([2, 3]);
    });

    it('returns [2, 3] for MATCHING (medium)', () => {
      expect(getActivityDifficultyRange(GameActivityType.MATCHING)).toEqual([2, 3]);
    });

    it('returns [3, 4] for WORD_ARRANGE (harder)', () => {
      expect(getActivityDifficultyRange(GameActivityType.WORD_ARRANGE)).toEqual([3, 4]);
    });

    it('returns [3, 4] for TRANSLATE (harder)', () => {
      expect(getActivityDifficultyRange(GameActivityType.TRANSLATE)).toEqual([3, 4]);
    });
  });
});

// ============================================
// SUN DROP SERVICE INTEGRATION
// ============================================

import { calculateEarned } from '../../../services/sunDropService';

describe('Sun Drop calculation for activities', () => {
  it('gives full reward on first try without help', () => {
    const result = calculateEarned(3, false, false, 0);
    expect(result).toBe(3);
  });

  it('reduces reward by half on retry', () => {
    const result = calculateEarned(4, true, false, 0);
    expect(result).toBe(2);
  });

  it('reduces reward by half when help is used', () => {
    const result = calculateEarned(4, false, true, 0);
    expect(result).toBe(2);
  });

  it('does not reduce below 1 Sun Drop minimum', () => {
    const result = calculateEarned(1, true, true, 0);
    expect(result).toBe(1);
  });

  it('applies wrong attempt penalty', () => {
    const result = calculateEarned(3, false, false, 1); // 3 - 1 wrong = 2
    expect(result).toBe(2);
  });

  it('applies multiple wrong attempt penalties', () => {
    const result = calculateEarned(3, false, false, 2); // 3 - 2 wrong = 1
    expect(result).toBe(1);
  });

  it('combines retry reduction with wrong attempts', () => {
    const result = calculateEarned(4, true, false, 1); // Half (2) - 1 = 1
    expect(result).toBe(1);
  });

  it('combines help reduction with wrong attempts', () => {
    const result = calculateEarned(4, false, true, 1); // Half (2) - 1 = 1
    expect(result).toBe(1);
  });
});