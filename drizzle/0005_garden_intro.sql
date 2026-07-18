-- TASK-FUN-03: one-time garden arrival tutorial flag
-- Applied manually (repo convention for 0003/0004 — drizzle journal is not
-- tracking these; see LEARNINGS.md 2026-07-18 drizzle drift note)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_seen_garden_intro" boolean DEFAULT false;
