-- Migration: Add review_sessions_completed to daily_progress
--
-- WHY: The dailyCapService enforces separate caps for new lessons (3/day)
-- and review sessions (5/day). Until now, only new lessons were tracked
-- in the `lessonsCompleted` column. This column tracks reviews separately
-- so calculateCapStatus() can enforce both caps independently.
--
-- SAFE: IF NOT EXISTS means running this twice won't break anything.
-- DEFAULT 0 ensures existing rows get a sane starting value.

ALTER TABLE daily_progress
    ADD COLUMN IF NOT EXISTS review_sessions_completed integer DEFAULT 0 NOT NULL;
