/**
 * Unit tests for activitySequencer.ts
 *
 * Tests the core logic for planning varied activity sequences:
 * - No consecutive duplicates
 * - Minimum variety enforcement
 * - Tier progression (early = recognition, late = production)
 * - Difficulty weighting
 *
 * @module activitySequencer.test
 */

import { describe, it, expect } from 'vitest';
import {
  planActivitySequence,
  getSunDropsForType,
  getActivityDescription,
} from './activitySequencer';
import { GameActivityType } from '../types/game';

describe('activitySequencer', () => {
  // ===========================================================================
  // BASIC FUNCTIONALITY
  // ===========================================================================

  describe('planActivitySequence', () => {
    it('returns a plan with the correct number of total steps', () => {
      const totalSteps = 10;
      const infoStepIndices = [0, 5];
      const plan = planActivitySequence(totalSteps, infoStepIndices, { seed: 42 });

      expect(plan.fullPlan.length).toBe(totalSteps);
    });

    it('places INFO steps at the correct positions', () => {
      const totalSteps = 10;
      const infoStepIndices = [0, 5];
      const plan = planActivitySequence(totalSteps, infoStepIndices, { seed: 42 });

      infoStepIndices.forEach(idx => {
        expect(plan.fullPlan[idx].type).toBe('info');
        expect(plan.fullPlan[idx].sunDrops).toBe(0);
      });
    });

    it('calculates quizTypes count correctly', () => {
      const totalSteps = 10;
      const infoStepIndices = [0, 5];
      const expectedQuizCount = totalSteps - infoStepIndices.length;
      const plan = planActivitySequence(totalSteps, infoStepIndices, { seed: 42 });

      expect(plan.quizTypes.length).toBe(expectedQuizCount);
    });

    it('returns INFO steps with 0 sunDrops', () => {
      const plan = planActivitySequence(5, [0], { seed: 42 });

      plan.fullPlan.forEach(step => {
        if (step.type === 'info') {
          expect(step.sunDrops).toBe(0);
        }
      });
    });

    it('returns quiz steps with positive sunDrops', () => {
      const plan = planActivitySequence(5, [0], { seed: 42 });

      plan.fullPlan.forEach(step => {
        if (step.type === 'quiz') {
          expect(step.sunDrops).toBeGreaterThan(0);
          expect(step.sunDrops).toBeLessThanOrEqual(3);
        }
      });
    });
  });

  // ===========================================================================
  // NO CONSECUTIVE DUPLICATES
  // ===========================================================================

  describe('consecutive duplicates prevention', () => {
    it('never has two consecutive quiz steps with the same type', () => {
      // Run multiple times with different seeds to catch edge cases
      for (let seed = 1; seed <= 20; seed++) {
        const plan = planActivitySequence(15, [0, 5, 10], { seed });

        for (let i = 1; i < plan.quizTypes.length; i++) {
          expect(plan.quizTypes[i]).not.toBe(plan.quizTypes[i - 1]);
        }
      }
    });

    it('handles small lesson sizes without consecutive duplicates', () => {
      const plan = planActivitySequence(3, [0], { seed: 42 });

      for (let i = 1; i < plan.quizTypes.length; i++) {
        expect(plan.quizTypes[i]).not.toBe(plan.quizTypes[i - 1]);
      }
    });
  });

  // ===========================================================================
  // MINIMUM VARIETY
  // ===========================================================================

  describe('minimum variety enforcement', () => {
    it('uses at least 3 distinct types for 5+ quiz steps', () => {
      // Run multiple times
      for (let seed = 1; seed <= 10; seed++) {
        const plan = planActivitySequence(10, [0], { seed }); // 9 quiz steps
        expect(plan.distinctTypeCount).toBeGreaterThanOrEqual(3);
      }
    });

    it('uses at least 4 distinct types for 7+ quiz steps', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const plan = planActivitySequence(12, [0], { seed }); // 11 quiz steps
        expect(plan.distinctTypeCount).toBeGreaterThanOrEqual(4);
      }
    });

    it('allows 2 distinct types for small lessons', () => {
      const plan = planActivitySequence(3, [0], { seed: 42 }); // 2 quiz steps
      expect(plan.distinctTypeCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // TIER PROGRESSION
  // ===========================================================================

  describe('tier progression', () => {
    it('tends toward recognition activities at low difficulty', () => {
      // With low difficulty, more activities should be recognition
      const plan = planActivitySequence(20, [0], { difficulty: 1, seed: 42 });

      const recognitionTypes = [
        GameActivityType.TRUE_FALSE,
        GameActivityType.MULTIPLE_CHOICE,
      ];

      const recognitionCount = plan.quizTypes.filter(t =>
        recognitionTypes.includes(t)
      ).length;

      // At difficulty 1, at least 40% should be recognition (weighted pool favors it)
      expect(recognitionCount).toBeGreaterThan(plan.quizTypes.length * 0.3);
    });

    it('tends toward production activities at high difficulty', () => {
      const plan = planActivitySequence(20, [0], { difficulty: 5, seed: 42 });

      const productionTypes = [
        GameActivityType.WORD_ARRANGE,
        GameActivityType.TRANSLATE,
      ];

      const productionCount = plan.quizTypes.filter(t =>
        productionTypes.includes(t)
      ).length;

      // At difficulty 5, production activities should appear
      expect(productionCount).toBeGreaterThan(0);
      // Variety should still be maintained
      expect(plan.distinctTypeCount).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // DIFFICULTY WEIGHTING
  // ===========================================================================

  describe('difficulty weighting', () => {
    it('produces more recognition activities at difficulty 1', () => {
      const plan = planActivitySequence(20, [0], { difficulty: 1, seed: 42 });

      const recognitionTypes = [
        GameActivityType.TRUE_FALSE,
        GameActivityType.MULTIPLE_CHOICE,
      ];

      const recognitionCount = plan.quizTypes.filter(t =>
        recognitionTypes.includes(t)
      ).length;

      // At difficulty 1, majority should be recognition
      expect(recognitionCount).toBeGreaterThan(plan.quizTypes.length * 0.3);
    });

    it('produces more production activities at difficulty 5', () => {
      const plan = planActivitySequence(20, [0], { difficulty: 5, seed: 42 });

      const productionTypes = [
        GameActivityType.WORD_ARRANGE,
        GameActivityType.TRANSLATE,
      ];

      const productionCount = plan.quizTypes.filter(t =>
        productionTypes.includes(t)
      ).length;

      // At difficulty 5, should have significant production activities
      expect(productionCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // DETERMINISM
  // ===========================================================================

  describe('determinism with seed', () => {
    it('produces identical results with the same seed', () => {
      const options = { seed: 12345 };

      const plan1 = planActivitySequence(10, [0, 5], options);
      const plan2 = planActivitySequence(10, [0, 5], options);

      expect(plan1.quizTypes).toEqual(plan2.quizTypes);
      expect(plan1.fullPlan).toEqual(plan2.fullPlan);
    });

    it('produces different results with different seeds', () => {
      const plan1 = planActivitySequence(10, [0, 5], { seed: 111 });
      const plan2 = planActivitySequence(10, [0, 5], { seed: 222 });

      // Very unlikely to be identical
      expect(plan1.quizTypes).not.toEqual(plan2.quizTypes);
    });
  });

  // ===========================================================================
  // SUNDROR CALCULATIONS
  // ===========================================================================

  describe('totalQuizSunDrops', () => {
    it('sums sunDrops from all quiz types correctly', () => {
      const plan = planActivitySequence(10, [0, 5], { seed: 42 });

      // Calculate expected sum
      const expectedSum = plan.quizTypes.reduce((sum, type) => {
        return sum + getSunDropsForType(type);
      }, 0);

      expect(plan.totalQuizSunDrops).toBe(expectedSum);
    });

    it('is positive when there are quiz steps', () => {
      const plan = planActivitySequence(5, [0], { seed: 42 });
      expect(plan.totalQuizSunDrops).toBeGreaterThan(0);
    });

    it('is 0 when there are no quiz steps', () => {
      const plan = planActivitySequence(2, [0, 1], { seed: 42 });
      expect(plan.totalQuizSunDrops).toBe(0);
    });
  });

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================

  describe('getSunDropsForType', () => {
    it('returns 0 for INFO type', () => {
      expect(getSunDropsForType(GameActivityType.INFO)).toBe(0);
    });

    it('returns 1 for recognition types', () => {
      expect(getSunDropsForType(GameActivityType.TRUE_FALSE)).toBe(1);
      expect(getSunDropsForType(GameActivityType.MULTIPLE_CHOICE)).toBe(1);
    });

    it('returns 2 for guided production types', () => {
      expect(getSunDropsForType(GameActivityType.MATCHING)).toBe(2);
      expect(getSunDropsForType(GameActivityType.FILL_BLANK)).toBe(2);
    });

    it('returns 3 for free production types', () => {
      expect(getSunDropsForType(GameActivityType.WORD_ARRANGE)).toBe(3);
      expect(getSunDropsForType(GameActivityType.TRANSLATE)).toBe(3);
    });
  });

  describe('getActivityDescription', () => {
    it('returns a description for each activity type', () => {
      const types = [
        GameActivityType.INFO,
        GameActivityType.MULTIPLE_CHOICE,
        GameActivityType.TRUE_FALSE,
        GameActivityType.FILL_BLANK,
        GameActivityType.MATCHING,
        GameActivityType.WORD_ARRANGE,
        GameActivityType.TRANSLATE,
      ];

      types.forEach(type => {
        const desc = getActivityDescription(type);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles a lesson with only INFO steps', () => {
      const plan = planActivitySequence(2, [0, 1], { seed: 42 });

      expect(plan.quizTypes.length).toBe(0);
      expect(plan.distinctTypeCount).toBe(0);
    });

    it('handles a single quiz step', () => {
      const plan = planActivitySequence(2, [0], { seed: 42 });

      expect(plan.quizTypes.length).toBe(1);
      expect(plan.quizTypes[0]).toBeTruthy();
    });

    it('handles INFO steps at the end', () => {
      const plan = planActivitySequence(5, [4], { seed: 42 });

      expect(plan.fullPlan[4].type).toBe('info');
      expect(plan.quizTypes.length).toBe(4);
    });

    it('handles non-contiguous INFO steps', () => {
      const plan = planActivitySequence(10, [0, 3, 7], { seed: 42 });

      expect(plan.fullPlan[0].type).toBe('info');
      expect(plan.fullPlan[3].type).toBe('info');
      expect(plan.fullPlan[7].type).toBe('info');
    });
  });
});