# Task B: Pocketbase Live Data Wiring

**Status:** ✅ COMPLETE (2026-02-18)
**Roadmap Group:** 1 — Finish the Baseline Experience
**Estimated Time:** 5-7h
**Actual Time:** ~2h (service layer approach kept scope tight)

---

## Objective

Replace mock game data with real Pocketbase reads and writes so that player progress (gems, sunDrops, streak, lesson completions) persists between sessions.

---

## Approach — Service Layer Strategy

The cleanest path turned out to be a **write-first** approach:

- The **garden display** continues to use mock trees for now (safe, no schema risk)
- All **mutations** (lesson complete, tree care, placements) write to real Pocketbase
- The **header stats** (gems, sunDrops, streak) read from real Pocketbase profile

This means a player can complete lessons and the data is real — even though the garden still shows mock trees. Full tree loading from PB comes in a future sub-task.

---

## Files Created

### `src/services/gameProgressService.ts`
The bridge between the game loop and Pocketbase. All game mutations go through here.

| Function | What It Does |
|----------|-------------|
| `getGameStats()` | Reads gems, sunDrops, streak, seeds from profile |
| `saveLessonCompletion(params)` | Updates user_tree (sunDropsEarned, lessonsCompleted, health) + profile (sunDrops, gems, streak) |
| `applyTreeCare(params)` | Checks gem balance, applies health/sunDrop boost to tree, deducts gems |
| `savePlacedObject(params)` | Saves decoration placement to garden_objects collection |
| `loadGardenObjects()` | Loads placed decorations for garden restore on next session |

**Key design decisions:**
- All functions are non-fatal where appropriate (lesson completion still works if PB is down)
- `saveLessonCompletion` auto-creates the tree record if one doesn't exist in PB yet
- Streak logic: same day = keep, yesterday = +1, gap = reset to 1
- Gem bonus formula: max(1, floor(sunDrops/10)) + star bonus (3★=+2, 2★=+1)

### `src/hooks/useGameStats.tsx`
React hook that wraps `getGameStats()` with reactive state.

- Loads on mount
- Exposes `refreshStats()` for callers to trigger after mutations
- Subscribes to Pocketbase profile changes for real-time multi-device sync
- Gracefully falls back to zeros on error

---

## Files Modified

### `App.tsx`
Replaced all `MOCK_USER_PROGRESS` references with real data from `useGameStats()`.

| Before | After |
|--------|-------|
| `const progress = MOCK_USER_PROGRESS;` | `const { stats, refreshStats } = useGameStats();` |
| `streak={progress.streak}` | `streak={stats.streak}` |
| `gems={progress.gems}` | `gems={stats.gems}` |
| `handleLessonComplete` — TODO comment | Calls `saveLessonCompletion()` then `refreshStats()` |
| `handleApplyTreeCare` — TODO comment | Calls `applyTreeCare()` then `refreshStats()` |
| `gemBalance={progress.gems}` | `gemBalance={stats.gems}` |

---

## What Now Persists Between Sessions

| Data | Before | After |
|------|--------|-------|
| Gem balance in header | Mock (always 85) | ✅ Real from PB profile |
| SunDrop total in header | Mock (always 127) | ✅ Real from PB profile |
| Daily streak | Mock (always 5) | ✅ Real from PB profile |
| Lesson completion | Discarded | ✅ Saved to user_tree + profile |
| Gem bonus after lesson | None | ✅ Calculated and saved |
| Tree care effects | Discarded | ✅ Saved to tree + profile |

---

## What's Still Mock

| Data | Why | Future Task |
|------|-----|-------------|
| Garden tree display | Safe incremental approach | Sub-task of Task B or Task G |
| Skill path content | Seeded in PB but not loaded | Task G (Dynamic Paths) |
| Garden object positions after reload | `onObjectPlaced(type, gx, gz)` not yet on GardenWorld3D | Add callback to GardenWorld3D then wire `savePlacedObject` |

---

## Known Deferral: Garden Object Saving

`savePlacedObject` in `gameProgressService.ts` is complete and ready. However, `GardenWorld3D.onPlacementEnd` currently has the signature `(placed: boolean) => void` — it doesn't pass back the grid coordinates of where the object was placed.

To fully wire this:
1. Add `onObjectPlaced?: (objectType: string, gx: number, gz: number) => void` to `GardenWorld3D` props
2. Call it from `GardenRenderer.onTileClick` after placing the object
3. Then call `savePlacedObject({ objectType, gx, gz })` in `App.tsx`

This is a small renderer change — deferred to keep Task B scope tight.

---

## Testing Checklist

- [x] `getGameStats()` returns 0 values when not authenticated (no crash)
- [x] `getGameStats()` returns 0 values when PB is unreachable (no crash)
- [x] TypeScript compiles clean (0 errors)
- [x] Header shows real gem/streak values (will show 0 for new users)
- [x] `saveLessonCompletion` correctly calculates gem bonus (at least 1 gem)
- [x] `saveLessonCompletion` calculates streak correctly (same day / yesterday / gap)
- [x] `applyTreeCare` throws if gem balance insufficient
- [x] `handleLessonComplete` in App.tsx navigates back immediately (doesn't wait for PB)
- [x] `useGameStats` subscribes to PB profile changes for live updates

---

## Confidence Score

## Confidence: 8/10

**Met:**
- [x] Real profile stats (gems, streak, sunDrops) load from PB
- [x] Lesson completion writes to PB (user_tree + profile)
- [x] Tree care writes to PB (tree health + profile gems)
- [x] TypeScript clean
- [x] Non-fatal error handling throughout

**Known gaps (acceptable):**
- [ ] Garden tree display still mock (intentional — Task G)
- [ ] Garden object positions not saved after placement (GardenWorld3D callback limitation)
- [ ] `starsEarned` not yet on `LessonResult` type (Task E adds this when v2 lesson gen is wired)

---

## Next Task

**Task C: Mobile Polish (1.1.15)**
- Touch controls for garden navigation
- D-pad overlay for avatar walking
- Responsive layout for small screens
- Performance: 60fps on mid-range mobile
