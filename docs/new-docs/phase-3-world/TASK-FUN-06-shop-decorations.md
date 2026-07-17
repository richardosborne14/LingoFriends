# TASK-FUN-06: Shop & Decorations — Closing the SunDrop Loop

**Status:** 🔲 Not started
**Priority:** 🟠 High — the economy has had no spend side since the V2 rewrite
**Estimated Time:** 10–12 hours
**Dependencies:** TASK-FUN-03 (a plot to decorate)
**Playtest Finding:** #2 — SunDrops buy nothing

---

## Mandatory Reads

1. `.clinerules` (always)
2. `TASK-FUN-00-MASTER-PLAN.md`
3. `src/lib/server/lessons/completionUtils.ts` + sunDropService tests — how SunDrops are earned/stored today (spend must be transactional against the same balance)
4. `docs/legacy-docs/phase-1.1/task-1-1-17-garden-shop-ui.md` + `task-1-1-12-decoration-system.md` — V1's shop design (category structure worth keeping)
5. PEDAGOGY.md "Red Flags to Avoid" — no dark patterns: no limited-time offers, no gacha, no premium currency. Prices are stable and honest.

---

## Problem

Kids earn SunDrops every lesson and the number just… grows. Earning without spending is a score, not an economy. The V1 shop/decoration system was dropped in the rewrite; the `gifts` table survived but has no real UI.

---

## Goals

1. **Shop** reachable from the garden (shop stall sprite near the gate + HUD button): categories **Plants** (decorative flowers/bushes), **Furniture** (benches, fountains, lanterns), **Paths** (tile swatches), **Critters** (add a rabbit/duck/cat to your plot), **House** (door colour, roof colour, flag).
2. **Placement mode:** after purchase, enter placement — ghost sprite follows cursor/finger snapped to grid, green/red validity (no collision layer, no tree anchors, inside your fence), tap to place, long-press an owned item to move/store it. Exit explicitly. Placements persist (`garden_items`).
3. **Transactional spend:** decrement + insert in one DB transaction; balance can never go negative; optimistic UI with rollback toast on failure.
4. **Catalogue seeded** (~25 items, prices 15–200 SunDrops) so a first lesson (~30 drops) affords one small item — day-one gratification — while nicer pieces take a few days. Include 2–3 streak-gated items ("7-day streak unlocks the Fountain 🎏") to reinforce the healthy-cadence loop, never purchasable with money (there is no money).
5. **Friend visibility:** placed items render in your plot for visitors (TASK-FUN-04 automatically picks this up via PlotRenderData — verify).
6. **Gift tie-in (small):** "Send as gift" on items ≤ 50 drops, wiring the existing gifts API/table to a real UI on the friend card.

---

## Implementation Steps

1. **Schema:** `shop_items` (catalogue, seeded via `db:seed`), `garden_items` (user placements: user_id, shop_item_id, tile_x, tile_y). Migration + seed.
2. **API:** `GET /api/shop` (catalogue + owned counts + balance), `POST /api/shop/buy` (transactional; returns new balance + inventory), `POST /api/garden/items` (place/move/store with server-side validity re-check — never trust client placement).
3. **Shop UI:** Svelte bottom-sheet (TreePanel pattern) — category tabs, item cards (sprite preview, price, owned badge), buy button disabled when unaffordable with a friendly hint ("🌞 12 more SunDrops — about one lesson!"). Fully i18n'd.
4. **Placement mode in PlotScene:** ghost-follow + grid snap + validity tint; EventBus contract `enter-placement(item) / place-at(x,y) / exit-placement`; inventory chip row (Svelte) for owned-but-stored items.
5. **Render placed items:** PlotScene draws `garden_items` above flora, below trees; depth-sort by y so avatar walks behind/in front correctly.
6. **First-purchase beat:** the first time a kid can afford anything (balance crosses cheapest price), the shop button does one gentle bounce with a badge — once, ever (profile flag). No nagging after that.

---

## Testing

- [ ] Unit: buy transaction — insufficient funds rejected, concurrent buys can't overdraw (row lock/`WHERE balance >=` guard), inventory increments exactly once
- [ ] Unit: placement validation (collision layer, tree anchors, out-of-fence, occupied cell)
- [ ] Unit: streak-gate logic
- [ ] Manual: earn → afford → buy → place → reload (persists) → visit from second account (visible)
- [ ] Manual: attempt to place on the pond/house/another item — red ghost, rejected server-side too (curl it)
- [ ] Suite green

## Acceptance Criteria

1. A kid can spend SunDrops within their first session and see the item in their world immediately.
2. Balance integrity holds under concurrency and client tampering.
3. No dark patterns: stable prices, no timers, no real-money anything.
4. Visitors see your decorations; the gift flow delivers a giftable item end-to-end.

## Files

**Create:** `src/routes/api/shop/+server.ts`, `src/routes/api/shop/buy/+server.ts`, `src/routes/api/garden/items/+server.ts`, `src/lib/components/garden/ShopPanel.svelte`, `src/lib/world/placement.ts`, catalogue seed data + item sprites (`CREDITS.md`)
**Modify:** `src/lib/server/db/schema.ts` + migration, `src/lib/server/db/seed.ts`, `src/lib/world/scenes/PlotScene.ts`, `src/routes/(app)/garden/+page.svelte`, `src/lib/components/social/FriendCard.svelte` (gift button), `src/lib/i18n/{en,fr}.json`
