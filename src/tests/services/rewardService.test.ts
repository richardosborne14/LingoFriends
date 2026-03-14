/**
 * Tests for src/lib/services/rewardService.ts
 *
 * The reward service is pure functions — no browser environment needed.
 * Tests cover streak bonuses, message functions, and event object builders.
 */

import { describe, it, expect } from 'vitest';
import {
	getStreakBonus,
	buildRewardEvent,
	buildPenaltyEvent,
	getEncouragementMessage,
	getPenaltyMessage,
	STREAK_MILESTONES,
	STARTING_HEARTS,
	SUNDROP_PENALTY_PER_WRONG,
} from '$lib/services/rewardService';

// ─────────────────────────────────────────────────────────────────────────────
// getStreakBonus
// ─────────────────────────────────────────────────────────────────────────────

describe('getStreakBonus()', () => {
	it('returns no bonus for streak of 0', () => {
		const { bonus, isMilestone } = getStreakBonus(0);
		expect(bonus).toBe(0);
		expect(isMilestone).toBe(false);
	});

	it('returns no bonus for non-milestone streaks (1, 2, 4, 6-9)', () => {
		const nonMilestones = [1, 2, 4, 6, 7, 8, 9];
		for (const streak of nonMilestones) {
			const { bonus, isMilestone } = getStreakBonus(streak);
			expect(bonus, `streak ${streak} should have 0 bonus`).toBe(0);
			expect(isMilestone, `streak ${streak} should not be milestone`).toBe(false);
		}
	});

	it('returns +3 bonus at streak of 3 (first milestone)', () => {
		const { bonus, isMilestone } = getStreakBonus(3);
		expect(bonus).toBe(3);
		expect(isMilestone).toBe(true);
	});

	it('returns +5 bonus at streak of 5', () => {
		const { bonus, isMilestone } = getStreakBonus(5);
		expect(bonus).toBe(5);
		expect(isMilestone).toBe(true);
	});

	it('returns +8 bonus at streak of 10', () => {
		const { bonus, isMilestone } = getStreakBonus(10);
		expect(bonus).toBe(8);
		expect(isMilestone).toBe(true);
	});

	it('returns no bonus for streaks > 10 that are not milestones (e.g. 11)', () => {
		const { bonus, isMilestone } = getStreakBonus(11);
		expect(bonus).toBe(0);
		expect(isMilestone).toBe(false);
	});

	it('STREAK_MILESTONES includes exactly 3, 5, 10', () => {
		expect(STREAK_MILESTONES).toContain(3);
		expect(STREAK_MILESTONES).toContain(5);
		expect(STREAK_MILESTONES).toContain(10);
		expect(STREAK_MILESTONES).toHaveLength(3);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildRewardEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('buildRewardEvent()', () => {
	it('builds event with base sundrops when no streak bonus', () => {
		const event = buildRewardEvent(3, 1); // streak 1 — no bonus
		expect(event.sunDrops).toBe(3);
		expect(event.streakBonus).toBe(0);
		expect(event.isStreakMilestone).toBe(false);
	});

	it('includes streak bonus in total sunDrops at milestone 3', () => {
		const event = buildRewardEvent(3, 3); // streak 3 → +3 bonus
		expect(event.sunDrops).toBe(6); // 3 base + 3 bonus
		expect(event.streakBonus).toBe(3);
		expect(event.isStreakMilestone).toBe(true);
	});

	it('includes streak bonus in total sunDrops at milestone 5', () => {
		const event = buildRewardEvent(2, 5); // streak 5 → +5 bonus
		expect(event.sunDrops).toBe(7); // 2 base + 5 bonus
		expect(event.streakBonus).toBe(5);
	});

	it('includes streak count in the event', () => {
		const event = buildRewardEvent(1, 4);
		expect(event.streakCount).toBe(4);
	});

	it('returns a non-empty message', () => {
		const event = buildRewardEvent(2, 1);
		expect(event.message).toBeTruthy();
		expect(typeof event.message).toBe('string');
	});

	it('uses a fire/streak message at milestone streaks', () => {
		const event = buildRewardEvent(2, 3);
		// Milestone messages contain fire emoji or "ON FIRE" etc.
		expect(event.message).toMatch(/🔥|fire|roll|unstoppable/i);
	});

	it('works with 0 base sundrops (INFO steps)', () => {
		const event = buildRewardEvent(0, 1);
		expect(event.sunDrops).toBe(0);
		expect(event.streakBonus).toBe(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPenaltyEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPenaltyEvent()', () => {
	it('sets sunDropsLost to the given amount', () => {
		const event = buildPenaltyEvent(1);
		expect(event.sunDropsLost).toBe(1);
	});

	it('returns a non-empty, non-punishing message', () => {
		const event = buildPenaltyEvent(1);
		expect(event.message).toBeTruthy();
		expect(typeof event.message).toBe('string');
	});

	it('penalty message never contains words like "wrong" or "bad" or "failed"', () => {
		// Run 20 times to cover randomisation
		for (let i = 0; i < 20; i++) {
			const { message } = buildPenaltyEvent(1);
			expect(message.toLowerCase()).not.toMatch(/\bwrong\b|\bbad\b|\bfailed\b/);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// getEncouragementMessage / getPenaltyMessage
// ─────────────────────────────────────────────────────────────────────────────

describe('getEncouragementMessage()', () => {
	it('returns a non-empty string', () => {
		expect(getEncouragementMessage()).toBeTruthy();
	});

	it('varies across multiple calls (probabilistic — 20 calls, at least 2 unique)', () => {
		const messages = new Set(Array.from({ length: 20 }, () => getEncouragementMessage()));
		expect(messages.size).toBeGreaterThanOrEqual(2);
	});
});

describe('getPenaltyMessage()', () => {
	it('returns a non-empty string', () => {
		expect(getPenaltyMessage()).toBeTruthy();
	});

	it('varies across multiple calls', () => {
		const messages = new Set(Array.from({ length: 20 }, () => getPenaltyMessage()));
		expect(messages.size).toBeGreaterThanOrEqual(2);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

describe('constants', () => {
	it('STARTING_HEARTS is 3', () => {
		expect(STARTING_HEARTS).toBe(3);
	});

	it('SUNDROP_PENALTY_PER_WRONG is 1', () => {
		// Per PEDAGOGY.md — light penalty, never crushing
		expect(SUNDROP_PENALTY_PER_WRONG).toBe(1);
	});
});
