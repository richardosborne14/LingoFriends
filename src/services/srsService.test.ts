/**
 * srsService.test.ts — Unit tests for the SRS pure functions.
 *
 * These tests cover calculateNextReview() and calculateTopicHealth()
 * which are pure functions — no DB, no mocks needed.
 *
 * recordBatchEncounters() calls chunkManager.recordEncounter() so it
 * requires integration testing; it is covered in task-1.2-12.
 *
 * @see docs/phase-1.2/task-1.2-10-chunk-srs.md
 */

import { describe, it, expect } from 'vitest';
import { calculateNextReview, calculateTopicHealth } from './srsService';
import { ChunkStatus } from '../types/pedagogy';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Minimal chunk state for calculateNextReview tests */
const BASE = {
  status: ChunkStatus.NEW,
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
};

// ============================================================================
// calculateNextReview
// ============================================================================

describe('calculateNextReview', () => {

  // ── incorrect answer ──────────────────────────────────────────────────────
  describe('incorrect answer', () => {
    it('resets interval to 1 day', () => {
      const r = calculateNextReview(BASE, { correct: false, usedHelp: false });
      expect(r.interval).toBe(1);
    });

    it('decreases ease factor by 0.3', () => {
      const r = calculateNextReview(BASE, { correct: false, usedHelp: false });
      expect(r.easeFactor).toBeCloseTo(2.2, 5);
    });

    it('does not drop ease factor below 1.3', () => {
      const low = { ...BASE, easeFactor: 1.3 };
      const r = calculateNextReview(low, { correct: false, usedHelp: false });
      expect(r.easeFactor).toBe(1.3);
    });

    it('marks an ACQUIRED chunk as FRAGILE', () => {
      const acquired = { ...BASE, status: ChunkStatus.ACQUIRED };
      const r = calculateNextReview(acquired, { correct: false, usedHelp: false });
      expect(r.status).toBe(ChunkStatus.FRAGILE);
    });

    it('keeps a NEW chunk as NEW (does not downgrade)', () => {
      const r = calculateNextReview(BASE, { correct: false, usedHelp: false });
      expect(r.status).toBe(ChunkStatus.NEW);
    });

    it('keeps a LEARNING chunk as LEARNING', () => {
      const learning = { ...BASE, status: ChunkStatus.LEARNING };
      const r = calculateNextReview(learning, { correct: false, usedHelp: false });
      expect(r.status).toBe(ChunkStatus.LEARNING);
    });

    it('sets nextReviewDate to roughly tomorrow', () => {
      const before = Date.now();
      const r = calculateNextReview(BASE, { correct: false, usedHelp: false });
      const msIn24h = 24 * 60 * 60 * 1000;
      expect(r.nextReviewDate.getTime()).toBeGreaterThanOrEqual(before + msIn24h - 1000);
    });
  });

  // ── correct with help ────────────────────────────────────────────────────
  describe('correct with help', () => {
    it('decreases ease factor by 0.1', () => {
      const r = calculateNextReview(BASE, { correct: true, usedHelp: true });
      expect(r.easeFactor).toBeCloseTo(2.4, 5);
    });

    it('grows interval conservatively (× 1.2)', () => {
      const chunk = { ...BASE, interval: 5 };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: true });
      expect(r.interval).toBe(6); // round(5 × 1.2) = 6
    });

    it('does not drop interval below 1', () => {
      const chunk = { ...BASE, interval: 0 };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: true });
      expect(r.interval).toBeGreaterThanOrEqual(1);
    });

    it('advances NEW → LEARNING', () => {
      const r = calculateNextReview(BASE, { correct: true, usedHelp: true });
      expect(r.status).toBe(ChunkStatus.LEARNING);
    });

    it('does not graduate LEARNING → ACQUIRED on a helped answer', () => {
      const learning = { ...BASE, status: ChunkStatus.LEARNING, repetitions: 5 };
      const r = calculateNextReview(learning, { correct: true, usedHelp: true });
      expect(r.status).toBe(ChunkStatus.LEARNING);
    });
  });

  // ── correct without help ─────────────────────────────────────────────────
  describe('correct without help (full SM-2)', () => {
    it('sets interval to 1 on first success (rep 0→1)', () => {
      const r = calculateNextReview(BASE, { correct: true, usedHelp: false });
      expect(r.interval).toBe(1);
    });

    it('sets interval to 3 on second success (rep 1→2)', () => {
      const chunk = { ...BASE, repetitions: 1, interval: 1 };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: false });
      expect(r.interval).toBe(3);
    });

    it('applies EF multiplication from rep 3 onward', () => {
      const chunk = { ...BASE, repetitions: 2, interval: 3, easeFactor: 2.5 };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: false });
      // round(3 × 2.6) = 8
      expect(r.interval).toBe(8);
    });

    it('increases ease factor by 0.1', () => {
      const r = calculateNextReview(BASE, { correct: true, usedHelp: false });
      expect(r.easeFactor).toBeCloseTo(2.6, 5);
    });

    it('does not exceed MAX_EASE_FACTOR of 3.0', () => {
      const maxEF = { ...BASE, easeFactor: 3.0 };
      const r = calculateNextReview(maxEF, { correct: true, usedHelp: false });
      expect(r.easeFactor).toBe(3.0);
    });

    it('caps interval at 180 days', () => {
      const bigInterval = { ...BASE, easeFactor: 3.0, interval: 100, repetitions: 10 };
      const r = calculateNextReview(bigInterval, { correct: true, usedHelp: false });
      expect(r.interval).toBeLessThanOrEqual(180);
    });

    it('graduates LEARNING → ACQUIRED after 3 clean reps with EF ≥ 2.0', () => {
      const chunk = {
        ...BASE,
        status: ChunkStatus.LEARNING,
        repetitions: 2,
        easeFactor: 2.5,
        interval: 3,
      };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: false });
      expect(r.status).toBe(ChunkStatus.ACQUIRED);
    });

    it('keeps LEARNING status when EF is below 2.0 even with 3 reps', () => {
      const chunk = {
        ...BASE,
        status: ChunkStatus.LEARNING,
        repetitions: 2,
        easeFactor: 1.5,
        interval: 3,
      };
      const r = calculateNextReview(chunk, { correct: true, usedHelp: false });
      // EF 1.5 + 0.1 = 1.6 — still below 2.0
      expect(r.status).toBe(ChunkStatus.LEARNING);
    });

    it('restores FRAGILE → ACQUIRED on correct recall', () => {
      const fragile = {
        ...BASE,
        status: ChunkStatus.FRAGILE,
        repetitions: 5,
        easeFactor: 2.0,
        interval: 7,
      };
      const r = calculateNextReview(fragile, { correct: true, usedHelp: false });
      expect(r.status).toBe(ChunkStatus.ACQUIRED);
    });

    it('sets nextReviewDate in the future', () => {
      const r = calculateNextReview(BASE, { correct: true, usedHelp: false });
      expect(r.nextReviewDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

// ============================================================================
// calculateTopicHealth
// ============================================================================

describe('calculateTopicHealth', () => {
  it('returns 50 for empty chunk array (no data = neutral)', () => {
    expect(calculateTopicHealth([])).toBe(50);
  });

  it('returns 100 for all ACQUIRED chunks', () => {
    const chunks = [
      { status: ChunkStatus.ACQUIRED },
      { status: ChunkStatus.ACQUIRED },
      { status: ChunkStatus.ACQUIRED },
    ];
    expect(calculateTopicHealth(chunks)).toBe(100);
  });

  it('returns 30 for all FRAGILE chunks', () => {
    const chunks = [
      { status: ChunkStatus.FRAGILE },
      { status: ChunkStatus.FRAGILE },
    ];
    expect(calculateTopicHealth(chunks)).toBe(30);
  });

  it('returns 70 for all LEARNING chunks', () => {
    const chunks = [
      { status: ChunkStatus.LEARNING },
      { status: ChunkStatus.LEARNING },
    ];
    expect(calculateTopicHealth(chunks)).toBe(70);
  });

  it('returns 50 for all NEW chunks', () => {
    const chunks = [{ status: ChunkStatus.NEW }];
    expect(calculateTopicHealth(chunks)).toBe(50);
  });

  it('averages mixed statuses: ACQUIRED(100) + FRAGILE(30) = 65', () => {
    const chunks = [
      { status: ChunkStatus.ACQUIRED },
      { status: ChunkStatus.FRAGILE },
    ];
    expect(calculateTopicHealth(chunks)).toBe(65);
  });

  it('rounds to nearest integer', () => {
    // ACQUIRED(100) + LEARNING(70) + FRAGILE(30) = 200 / 3 = 66.6... → 67
    const chunks = [
      { status: ChunkStatus.ACQUIRED },
      { status: ChunkStatus.LEARNING },
      { status: ChunkStatus.FRAGILE },
    ];
    expect(calculateTopicHealth(chunks)).toBe(67);
  });

  it('handles a single chunk correctly', () => {
    expect(calculateTopicHealth([{ status: ChunkStatus.ACQUIRED }])).toBe(100);
    expect(calculateTopicHealth([{ status: ChunkStatus.FRAGILE }])).toBe(30);
  });
});
