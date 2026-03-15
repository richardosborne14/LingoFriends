-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 0003_streak_freeze_daily_goal
--
-- Adds streak freeze mechanics and daily goal to the profiles table.
-- See: src/lib/services/streakService.ts — FREEZE_PASSES_PER_WEEK
-- See: src/lib/services/dailyCapService.ts — DAILY_CAPS.new_lessons
--
-- streakFreezesRemaining: How many streak-freeze passes remain this week.
--   Default 2 = FREEZE_PASSES_PER_WEEK constant.
--   Replenished every Monday UTC by streakService.getUpdatedFreezeState().
--
-- streakFreezeLastReset: UTC timestamp of the last weekly replenishment.
--   NULL = never replenished (new accounts). shouldResetFreezes() treats
--   NULL as "needs reset" so the first lesson always sets this.
--
-- dailyGoal: User's preferred daily new-lesson count (1-3).
--   Default 3 = the global DAILY_CAPS.new_lessons cap.
--   Stored here so the settings page can save a lower goal (e.g. "1 lesson
--   on busy days") while the cap still acts as the hard ceiling.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "streak_freezes_remaining" integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "streak_freeze_last_reset" timestamp,
  ADD COLUMN IF NOT EXISTS "daily_goal" integer DEFAULT 3;

-- Back-fill existing rows: everyone starts with 2 freezes, no reset date yet
-- (the NULL reset date triggers a replenishment on next lesson — see streakService)
UPDATE "profiles"
  SET "streak_freezes_remaining" = 2
  WHERE "streak_freezes_remaining" IS NULL;
