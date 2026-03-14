# Task 5.2: Leaderboard

**Status:** 🔲 Not started
**Phase:** 5 (Social & Deploy)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 5.1 complete

---

## Objective

Build leaderboard showing friends ranked by SunDrops. Tab on friends page. Period toggle: this week / all time.

---

## Implementation

`src/lib/components/social/Leaderboard.svelte`:
- Friends ranked by SunDrops (descending)
- Top 3: 🥇🥈🥉 medal icons with gold/silver/bronze backgrounds
- Current user highlighted with coral border regardless of position
- Toggle: "This Week" (dailyProgress sum) / "All Time" (profiles.totalSunDrops)

**API:** `GET /api/friends/leaderboard?period=week|alltime`

---

## Tests

```typescript
describe('Leaderboard', () => {
  it('ranks friends by SunDrops descending', () => {});
  it('highlights current user', () => {});
  it('top 3 have medal icons', () => {});
  it('period toggle changes data', () => {});
});
```

---

## Acceptance Criteria

- [ ] Ranking correct
- [ ] Current user highlighted
- [ ] Medal icons on top 3
- [ ] Period toggle works
- [ ] Tests: 4/4 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
