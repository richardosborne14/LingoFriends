# Task 2.6: Lesson Completion & SRS

**Status:** 🔲 Not started
**Phase:** 2 (Lesson Engine)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 2.5 complete

---

## Mandatory Reads

1. `02-DATABASE-SCHEMA.md` — lessonHistory, chunkLibrary, dailyProgress, profiles tables
2. `04-PEDAGOGY-SUMMARY.md` — SRS intervals, SunDrop calculation, star rating

---

## Objective

Create the lesson completion endpoint and supporting services. When a lesson finishes, update SunDrops, streak, chunk SRS review dates, tree growth, and daily progress.

---

## Implementation

### 2.6.1 — SunDrop Service (`src/lib/server/lessons/sunDropService.ts`)

```typescript
/** Reward floors at 0 — see PEDAGOGY.md Affective Filter (no punishment) */
export function calculateReward(baseValue: number, wrongAttempts: number, usedHelp: boolean): number
/** 1 star: <50%, 2 stars: 50-89%, 3 stars: 90%+ */
export function calculateStarRating(earned: number, max: number): 1 | 2 | 3
```

### 2.6.2 — SRS Service (`src/lib/server/lessons/srsService.ts`)

SM-2 inspired intervals: 1d → 3d → 7d → 14d → 30d. Good performance increases confidence and extends interval. Poor performance resets to 1d.

### 2.6.3 — Completion API (`POST /api/lessons/complete`)

Body: `{ lessonId, treeId, results: { sunDropsEarned, sunDropsMax, correctCount, wrongCount, helpUsed, timeSpentMs, chunkResults[] } }`

Updates: lessonHistory (new row), chunkLibrary (upsert with SRS), profiles (SunDrops, streak, lessonsCompleted), dailyProgress, userTrees (currentLessonIndex, health, growthStage).

**Streak logic:** If `lastActivityDate` is yesterday → increment. If today → no change. If >1 day ago → reset to 1. Update `longestStreak` if current exceeds it.

---

## Tests

```typescript
describe('SunDrop Service', () => {
  it('full reward with no wrong attempts', () => { expect(calculateReward(3, 0, false)).toBe(3); });
  it('half reward when help used', () => { expect(calculateReward(4, 0, true)).toBe(2); });
  it('penalty per wrong attempt', () => { expect(calculateReward(3, 2, false)).toBe(1); });
  it('floors at 0, never negative', () => { expect(calculateReward(2, 5, false)).toBe(0); });
  it('3 stars for 90%+', () => { expect(calculateStarRating(27, 27)).toBe(3); });
  it('2 stars for 50-89%', () => { expect(calculateStarRating(15, 27)).toBe(2); });
  it('1 star for <50%', () => { expect(calculateStarRating(5, 27)).toBe(1); });
});

describe('SRS Service', () => {
  it('first review in 1 day', () => {});
  it('good performance extends interval', () => {});
  it('poor performance resets to 1 day', () => {});
});

describe('Lesson Completion API', () => {
  it('updates all tables correctly', async () => {});
  it('streak increments for consecutive days', async () => {});
  it('streak resets after missed day', async () => {});
});
```

---

## Acceptance Criteria

- [ ] SunDrop calculation correct with floor-at-zero
- [ ] Star rating thresholds correct
- [ ] SRS intervals follow SM-2 pattern
- [ ] Completion API updates all 5 tables
- [ ] Streak logic handles consecutive days, same day, and gaps
- [ ] Tests: 10+ passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
