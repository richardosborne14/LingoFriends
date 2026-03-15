# Task V2-08: Streaks, Daily Cap, Review Lessons & Settings

**Phase:** 2 — Lesson Engine & Progression  
**Status:** ✅ Complete  
**Completed:** 2026-03-15  
**Confidence:** 8/10  
**Actual Time:** ~3h (estimated: 3h)

---

## What Was Built

Four interconnected systems that turn individual lessons into a sustainable daily learning habit:

1. **Streak Freeze System** — 2 auto-activating freeze passes per week protect streaks from single missed days. Resets every Monday UTC. Full service logic in `streakService.ts` with 28 unit tests.

2. **Daily Cap Service** — Hard limit of 3 new lessons/day plus 5 review sessions. `getDailyCapMessage()` produces encouraging (not punishing) messages. 18 tests.

3. **Review Lesson Builder** — Assembles SRS overdue chunks into a review `LessonPlan`. Prioritises oldest overdue chunks first, caps at 10 items, builds PRACTICE/RECALL activities only (no INTRODUCE — user already knows them). 24 tests.

4. **Stats Utilities + Profile Page Data** — `buildWeeklyChart()`, `getEarnedAchievements()`, `getLevelDisplayLabel()`, `getLessonProgressToNext()` — pure functions for profile dashboard. 20 tests.

---

## Files Created

### Services (business logic)
| File | Purpose |
|------|---------|
| `src/lib/services/streakService.ts` | Milestone detection, freeze management, week calendar |
| `src/lib/services/dailyCapService.ts` | Hard caps, motivational messages, cap checking |
| `src/lib/services/reviewLessonBuilder.ts` | SRS review lesson assembly |
| `src/lib/utils/statsUtils.ts` | Pure stat helpers for profile page |

### API Routes
| File | Purpose |
|------|---------|
| `src/routes/api/lessons/review/+server.ts` | GET review lesson for a tree |

### UI Components
| File | Purpose |
|------|---------|
| `src/lib/components/modals/DailyCapModal.svelte` | Shown when daily cap is hit |
| `src/lib/components/modals/StreakMilestoneModal.svelte` | Streak milestone celebration |
| `src/lib/components/effects/Confetti.svelte` | CSS-only confetti burst |

### Routes
| File | Purpose |
|------|---------|
| `src/routes/(app)/settings/+page.server.ts` | Load + form actions (level, goal, avatar) |
| `src/routes/(app)/settings/+page.svelte` | Settings UI |

### Database
| File | Purpose |
|------|---------|
| `drizzle/0003_streak_freeze_daily_goal.sql` | Migration: 3 new columns on profiles |

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Freeze passes per week | 2 | Enough to protect "I forgot" without undermining habit |
| Daily cap for new lessons | 3 | Cognitive load research: 3 new chunks at 5 activities = ~15-20 min |
| Daily cap for reviews | 5 | Reviews are lower effort — allow more without burnout |
| Review lesson activities | PRACTICE + RECALL only | Learner already knows the content — no INTRODUCE needed |
| Streak milestone modals | Brief with single button | Quick joy = good; interruption = bad |
| Timezone for calendar | UTC throughout | Prevents off-by-one in UTC+x timezones |

---

## Tests

| File | Tests | Status |
|------|-------|--------|
| `streakService.test.ts` | 28 | ✅ All passing |
| `dailyCapService.test.ts` | 18 | ✅ All passing |
| `reviewLessonBuilder.test.ts` | 24 | ✅ All passing |
| `statsUtils.test.ts` | 20 | ✅ All passing |
| **Total** | **90** | **✅** |

**Bug found and fixed:** `buildWeekCalendar()` and `buildWeeklyChart()` used `setHours()` (local timezone) but `toISOString()` (UTC output), causing off-by-one date string errors in UTC+1 (Europe/Paris). Fixed by using `setUTCHours()` / `setUTCDate()` throughout.

---

## Notes for Future Tasks

- The settings page is functional but the avatar customisation section shows colour pickers only — a visual avatar preview component would improve UX significantly (Phase 3).
- `DailyCapModal` is built but not yet wired into the lesson completion flow — the `[lessonId]/complete/+server.ts` handler needs to read the profile's `dailyGoal` and return a `hitDailyCap: true` flag.
- `StreakMilestoneModal` needs to be wired into the completion screen — completion handler should check `checkStreakMilestone(newStreak)` and return the milestone in the response.
- Review lesson route (`/api/lessons/review`) is complete but the garden page's "Water tree" button needs to call it.
- Confetti component is standalone and can be dropped into any completion flow: `<Confetti active={showConfetti} on:done={() => (showConfetti = false)} />`.

---

## Confidence: 8/10

**Met:**
- [x] 90 unit tests passing
- [x] Service logic fully tested (streaks, caps, review, stats)
- [x] Schema migration written and documented
- [x] API route clean with proper error handling
- [x] UI components complete (3 modals + confetti)
- [x] Settings page with server-side validation
- [x] Timezone bug found and fixed with tests

**Concerns (not blocking):**
- [ ] Wiring DailyCapModal + StreakMilestoneModal into the lesson completion flow is deferred — needs to be the first thing done in the next UI task
- [ ] Review session count tracking (how many reviews today) not yet persisted to DB

**Deferred:**
- [ ] Avatar preview component → Phase 3 (visual polish)
- [ ] Garden "Water tree" button calling review API → next task
