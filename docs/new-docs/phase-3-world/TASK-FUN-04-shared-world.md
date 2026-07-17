# TASK-FUN-04: Shared World — Neighbour Plots, Visiting & Presence

**Status:** 🔲 Not started
**Priority:** 🟠 High
**Estimated Time:** 14–20 hours
**Dependencies:** TASK-FUN-03 (a plot worth multiplying)
**Decision Reference:** Locked decision — full shared world, built in three always-playable stages

---

## Mandatory Reads

1. `.clinerules` (always)
2. `TASK-FUN-00-MASTER-PLAN.md`
3. `src/lib/server/social/friendsService.ts` + friends API routes — friendship data feeding neighbour plots
4. `docs/legacy-docs/phase-2-world-expansion/multiplayer-world-scope.md` — prior thinking on this exact feature (scope lessons learned)

---

## Problem

Your plot exists alone. The vision: "you're in an open world, you have your plot of land fenced off, your friends take up other plots when you add them, and you can go visit." Friends are currently a list page — they should be *neighbours*.

---

## Goals

Delivered in three stages. **Each stage ships and is playable before the next starts.** The endpoint is a live shared world; the stages are how we get there without an infra spiral.

**Stage A — The Neighbourhood (static):** world = grid of plots along paths. Your plot centre. Friends' plots load adjacent, rendered from their real data (trees at their real stages, avatar shown idle by their house, decorations once TASK-FUN-06 lands). Non-friend plots appear as "wild meadows" with a sign ("A new friend could live here!"). Walk out your gate, down the path, into a friend's plot.

**Stage B — Signs of life (polled):** friends' worlds update on a poll (~15s while world is open): last-seen position, "🟢 learning right now" bubble if they're mid-lesson, waving animation on arrival in your plot. Leave a "wave" 👋 sticky that they see next login (uses gifts table pattern).

**Stage C — Live presence (websocket or SSE):** friends visibly walk in real time. Position broadcast at 5 Hz, interpolated client-side. Recommended transport: a tiny `ws` server in the SvelteKit node adapter process (or SSE + POST fallback). No chat — waves and emotes only (child safety: no free-text channel).

---

## Architecture

```
plots table:  user_id PK, world_x int, world_y int, claimed_at
              — assigned on first garden load: nearest free slot to
                the user's earliest friend (cluster friends together),
                spiral-search from world origin otherwise

World layout:  infinite conceptual grid, plots at (x*PLOT_W, y*PLOT_H)
               separated by 4-tile path corridors. Client renders your
               plot + the 8 surrounding cells (viewport culling).

WorldScene:    generalisation of PlotScene — renders N plots from an
               array of PlotRenderData {owner, trees, decorations,
               avatar, isOwn}. Own plot = interactive; others = read-only
               (tap their tree → "That's Mia's Apfelbaum! 🌳 Level 3").

API:  GET /api/world?cx=&cy=   → plots + owner data for 3×3 cells
      GET /api/world/presence  → Stage B poll (friend positions/status)
      WS  /api/world/live      → Stage C
```

Privacy rule (child safety): only **accepted friends'** plots render with real data. Strangers' plots always render as anonymous meadows — no names, no avatars, regardless of world position.

---

## Implementation Steps

1. **Schema + assignment:** `plots` table, claim-on-first-load with friend-clustering; backfill existing users.
2. **WorldScene:** refactor PlotScene → parameterised plot renderer; stitch 3×3 cells with path corridors between; camera bounds expand to loaded area; cell streaming when crossing boundaries (load next row, drop far row).
3. **Neighbour data endpoint:** `/api/world` join across plots ↔ profiles ↔ user_trees ↔ friendships; strict friend filter; cache 60s per cell.
4. **Visiting affordances:** entering a friend's plot shows a Svelte banner ("Mia's Garden 🌷") + their streak; their avatar idles near their house; tap avatar → wave (persisted, notification on their next login).
5. **Stage B poller:** presence endpoint returns `{userId, lastSeenAt, inLesson, lastPos}` for friends; world updates bubbles/positions on each poll; "learning now" derived from lesson_history rows open in last 5 min (no new infra).
6. **Stage C live layer:** feature-flagged. In-memory presence map keyed by userId (single-process fine at current scale, document Redis upgrade path); 5 Hz position messages, server relays only to accepted friends currently in-world; client interpolation.

---

## Testing

- [ ] Unit: plot assignment (clustering, spiral fallback, no collisions under concurrent claims — DB unique constraint on (world_x, world_y))
- [ ] Unit: `/api/world` never leaks non-friend identity fields (privacy test is mandatory)
- [ ] Manual: two accounts, befriend, verify adjacency after re-claim, walk into friend's plot, see their real trees
- [ ] Manual Stage B: account A starts a lesson → account B sees "learning now" within one poll
- [ ] Manual Stage C: two browsers, avatars move in real time; kill WS → graceful fallback to Stage B polling
- [ ] Suite green

## Acceptance Criteria

1. Walking out of your gate leads somewhere — paths, neighbour plots, meadows.
2. A friend's plot is recognisably theirs (their avatar, trees, name banner) with zero live infra required (Stage A alone passes).
3. Non-friends are never identifiable in the world.
4. Stage C degrades to Stage B silently on connection failure.

## Files

**Create:** `src/lib/world/scenes/WorldScene.ts`, `src/routes/api/world/+server.ts`, `src/routes/api/world/presence/+server.ts`, Stage C: `src/lib/server/world/liveHub.ts`
**Modify:** `src/lib/server/db/schema.ts` (+`plots`), `drizzle/` migration, `src/routes/(app)/garden/+page.server.ts` (world payload), friends page (add "Visit" button → deep-link camera to their plot)
