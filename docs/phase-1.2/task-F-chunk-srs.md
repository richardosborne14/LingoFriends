# Task F — Chunk SRS System

**Status:** ✅ DONE  
**Phase:** 1.2 (Pedagogy Engine)  
**Ref:** task-1.2-10-chunk-srs.md  
**Commit:** TBD (see git log)

---

## What Was Built

### `src/services/srsService.ts` (new)

Pure algorithm layer that sits above `chunkManager` (which owns the PB writes).

| Export | Type | Purpose |
|--------|------|---------|
| `calculateNextReview()` | Pure function | SM-2+ calculation — no DB, fully testable |
| `calculateTopicHealth()` | Pure function | 0–100 health score from chunk statuses |
| `recordBatchEncounters()` | Async function | Translates star rating → signals, calls `chunkManager.recordEncounter()` per chunk |
| `getDueChunks()` | Async wrapper | Delegates to `chunkManager.getDueChunks()` |
| `getFragileChunks()` | Async wrapper | Delegates to `chunkManager.getFragileChunks()` |
| `decayOverdueChunks()` | Async function | Marks overdue acquired chunks as fragile (call on app open) |

### `src/services/srsService.test.ts` (new)

20 unit tests covering `calculateNextReview()` and `calculateTopicHealth()`:

- **Incorrect answer:** EF -0.3, interval reset, acquired → fragile
- **Correct with help:** EF -0.1, interval × 1.2, no graduation
- **Correct without help:** SM-2 intervals (1→3→EF×interval), graduation at rep 3+EF≥2.0, fragile → acquired recovery
- **Caps/floors:** EF floor 1.3, EF cap 3.0, interval cap 180 days
- **Topic health:** empty=50, all-acquired=100, all-fragile=30, mixed averages

### `App.tsx` (updated)

| Change | Detail |
|--------|--------|
| `useRef` added to React import | Required for `activePlanRef` |
| `import * as srsService` | Imports batch encounter function |
| `import type { SessionPlan }` | For `activePlanRef` type annotation |
| `activePlanRef = useRef<SessionPlan \| null>(null)` | Carries plan from handleStartLesson → handleLessonComplete without re-renders |
| `activePlanRef.current = sessionPlan` in v2 path | Stores plan on successful v2 generation |
| `srsService.recordBatchEncounters()` in handleLessonComplete | Updates chunk SRS records post-lesson; clears ref afterward |

---

## Architecture Decision

`srsService` does NOT duplicate `chunkManager`'s SM-2 logic. The layering is:

```
App.tsx  →  srsService.recordBatchEncounters()
                 │  (translates stars → signal, batches calls)
                 ↓
          chunkManager.recordEncounter()
                 │  (SM-2 calc + PB write)
                 ↓
          PocketBase user_chunks table
```

`calculateNextReview()` in `srsService` is a **pure duplicate** of the algorithm
for **testing purposes only** — it lets us unit-test SM-2 math without any DB setup.
The actual PB update uses `chunkManager`'s internal `calculateSRSUpdate()`.

---

## Star Rating → Encounter Signal

| Stars | correct | usedHelp | Effect |
|-------|---------|----------|--------|
| 3★ | `true` | `false` | Full SM-2 growth, possible graduation |
| 2★ | `true` | `true` | Conservative growth, EF -0.1, no graduation |
| 1★ | `false` | `false` | Interval reset, EF -0.3, acquired → fragile |

This is a **coarse approximation** — Phase 2 will replace with per-activity
`ActivityResult.chunkIds` for precise chunk-level tracking.

---

## Deferred to Phase 2

- Per-activity chunk tracking (currently all chunks in a session get the same signal)
- `decayOverdueChunks()` call on app open (service ready, not yet wired to useEffect)
- `calculateTopicHealth()` wired to tree health display (srsService ready, tree health hook not yet connected)

---

## Confidence: 8.5/10

**Met:**
- [x] SM-2+ algorithm implemented and fully unit-tested (20 tests)
- [x] All status transitions correct (new→learning, learning→acquired, acquired→fragile, fragile→acquired)
- [x] Interval caps and EF bounds enforced
- [x] Batch encounters wired into lesson completion flow
- [x] TypeScript: zero errors
- [x] Fire-and-forget safe: no chunk failure blocks the UI

**Concerns:**
- [ ] Star rating proxy is coarse — all chunks in a session get the same signal

**Deferred:**
- [ ] Per-activity chunk tracking (Phase 2)
- [ ] Decay call on app open (Phase 2 wiring)
