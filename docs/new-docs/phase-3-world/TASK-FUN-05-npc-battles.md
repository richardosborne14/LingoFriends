# TASK-FUN-05: NPC Encounters & Boss Battles in Lessons

**Status:** 🔲 Not started
**Priority:** 🟠 High — the lesson theatre the vision always called for
**Estimated Time:** 12–16 hours
**Dependencies:** TASK-FUN-02 (sprite pipeline). Independent of 03/04 — parallelisable.
**Playtest Finding:** #6 — "I wanted you to see your avatar facing off against a randomly generated NPC throughout the lesson, and then a boss NPC coming up at the end"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — Affective Filter + Feedback Framework. **Battles must never make wrong answers feel like punishment beyond the existing hearts system. The NPC is a playful rival, not a bully.**
3. `src/lib/components/lesson/EncounterScene.svelte` — current static NPC strip being replaced
4. `src/lib/stores/lesson.ts` — hearts, step index, SunDrops (the battle reads these; it must not add new failure states)
5. `src/lib/server/lessons/lessonAssembler.ts` — where steps are built (boss flag added here)

---

## Problem

Lessons show two tiny static figures labelled "You" and "Mia". There's no drama, no opponent, no arc. Meanwhile hearts/SunDrops already provide battle-shaped mechanics with nothing visual attached to them.

---

## Goals

1. **Encounter header scene** (Phaser canvas strip, ~180px tall, replacing EncounterScene.svelte's content): your composited avatar on the left, a generated rival NPC on the right, parallax backdrop matching the lesson topic (3–4 generic backdrops: meadow/village/forest/beach).
2. **Random rival generation:** seeded by lesson id — LPC layer roll (species/skin/hair/outfit/accessory) + generated name from a kid-safe syllable bank per target language (Mia, Bo, Kiko…). Same lesson id always yields the same rival (resume-safe).
3. **Battle choreography driven by existing events (no new mechanics):**
   - correct answer → your avatar attack bounce, spark hits rival, rival flinches; rival "spirit" bar (= remaining steps) ticks down
   - wrong answer → rival taunt hop (cheeky, not mean), you lose a heart (existing), your avatar shakes briefly
   - SpeakIt/coaching steps → rival leans in and listens (production steps are never battles — pedagogy rule)
4. **Boss finale:** lesson assembler marks the final recall/review cluster (last 2–3 steps) as `bossPhase: true`. Boss = bigger silhouette version of the rival (scale ×1.6 + palette shift + crown/cape layer), dramatic backdrop tint, drum sting. Beating it = existing CompletionScreen, now preceded by the boss defeat animation (boss bows and applauds — defeated ≠ humiliated; it claps for you).
5. **Age modulation:** 7–10 gets full theatrics; 15–18 gets subtler versions (no taunt hop, smaller banners) via existing `ageGroup`.

---

## Non-Goals (pedagogy guardrails)

- No new failure states, no time pressure, no damage numbers.
- The rival never speaks target-language content (that's the coach's job) — it emotes only.
- Losing all hearts still triggers the Breather flow unchanged; the rival sits down and waits during breathers.

---

## Implementation Steps

1. **`EncounterCanvas.svelte`** (`src/lib/world/encounter/`): slim Phaser instance (one scene, fixed 180px viewport) with the same mount/destroy pattern as WorldCanvas. Mobile: canvas strip stays pinned above the activity card.
2. **`RivalFactory.ts`:** seeded RNG (lesson id) → LPC layer selection + name. Reuses TASK-FUN-02 compositing. Unit-test determinism.
3. **`BattleDirector.ts`:** subscribes to lesson store events (`answer-correct`, `answer-wrong`, `step-type-changed`, `boss-entered`, `lesson-complete`) via the EventBus and queues animation beats. All tweens ≤ 700ms so the reward modal timing is unaffected — theatre must never slow the loop.
4. **Assembler change:** `lessonAssembler.ts` tags the final recall cluster `bossPhase: true`; lesson store exposes `inBossPhase`. (Pure data change + tests.)
5. **Boss transition beat:** on entering boss phase — brief "⚡ Final challenge!" banner (Svelte), backdrop tint, boss swap animation. On completion — defeat/applause animation → `celebration-done` → existing CompletionScreen.
6. **Sound:** extend `soundService` with hit/flinch/boss-sting/applause (existing WAV-generation pattern or CC0 pack).

---

## Testing

- [ ] Unit: RivalFactory determinism (same lesson id ⇒ identical rival), name bank safety (no real-word collisions in en/fr/de/es)
- [ ] Unit: assembler boss tagging (last cluster only; review lessons too)
- [ ] Unit: BattleDirector event → beat mapping; beats never fire during coaching/SpeakIt steps
- [ ] Manual: full lesson at ageGroup 7-10 and 15-18 — theatrics scale; wrong answers feel playful; breather pauses the rival
- [ ] Manual: resume a lesson mid-way — same rival reappears
- [ ] Suite green

## Acceptance Criteria

1. Every lesson has a visually distinct rival that reacts to every scored answer within 200ms.
2. The boss phase is an unmistakable event, and defeating it applauds the child.
3. Zero pedagogy regressions: hearts, breathers, SpeakIt no-fail rules all unchanged.
4. Lesson pacing unchanged (advance timing identical with theatre disabled vs enabled).

## Files

**Create:** `src/lib/world/encounter/EncounterCanvas.svelte`, `RivalFactory.ts`, `BattleDirector.ts`, backdrop assets + `CREDITS.md` entries
**Modify:** `src/routes/(app)/lesson/[id]/+page.svelte` (swap EncounterScene → EncounterCanvas), `src/lib/server/lessons/lessonAssembler.ts`, `src/lib/stores/lesson.ts` (boss phase + event emissions), `src/lib/services/soundService.ts`
**Delete:** `src/lib/components/lesson/EncounterScene.svelte`, `src/lib/three/avatars/NPCScene.ts` usage (if not already gone via TASK-FUN-02)
