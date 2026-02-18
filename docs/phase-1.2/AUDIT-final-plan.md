# Phase 1.2 Audit — Final Plan

**Audit Date:** 18 Feb 2026  
**Status:** ✅ COMPLETE — All 5 gaps resolved

---

## Summary

A cross-file audit of the Phase 1.2 pedagogy engine found 5 gaps between what
was documented and what was actually wired up. All gaps have been resolved.

---

## Gaps Found & Resolved

### GAP 1 — `ageGroup` not threaded through from LearnerProfile → lessonGeneratorV2
**Files:** `src/types/pedagogy.ts`, `src/services/lessonGeneratorV2.ts`  
**Problem:** `lessonGeneratorV2.generateSingleActivity()` and `buildPedagogyContext()`
both called `getAgeGroup(undefined)` with a hardcoded TODO comment, ignoring the
`ageGroup` field that now exists on `LearnerProfile`.  
**Fix:** Added optional `ageGroup?: '7-10' | '11-14' | '15-18'` to `LearnerProfile`
(in `src/types/pedagogy.ts`) and threaded `profile.ageGroup` through both call sites.  
**Default:** Falls back to `'11-14'` — the middle range — until onboarding collects
age group explicitly (deferred to Phase 2).

---

### GAP 2 — `lessonStartTime` bug in `useLesson.ts`
**File:** `src/hooks/useLesson.ts`  
**Problem:** `lessonStartTime` was initialised to `Date.now()` at module load time
(outside any effect), so `endLesson()` computed wildly wrong durations for any
lesson started after the first render.  
**Fix:** Moved to `useState<number>(Date.now())` and reset it on every `loadLesson()`
and `resetLesson()` call, so timing is always anchored to when the lesson actually starts.

---

### GAP 3 — `LessonResult.timeSpentMs` not tracked and `learnerProfileService.recordSession()` never called
**Files:** `src/components/lesson/LessonView.tsx`, `App.tsx`  
**Problem (a):** `LessonResult` had `timeSpentMs` in its type definition but
`handleContinue` in `LessonView` never computed or passed it — TypeScript error.  
**Fix (a):** Added `lessonStartTimeRef = useRef<number>(Date.now())` to `LessonView`,
computed `timeSpentMs = Date.now() - lessonStartTimeRef.current` in `handleContinue`,
reset the ref in `handleReplay`.

**Problem (b):** `App.tsx` wrote SRS data via `postLessonSRSUpdate()` but never called
`learnerProfileService.recordSession()`, so `totalSessions`, `totalTimeMinutes`,
`averageSessionLength`, and `helpRequestRate` never updated. The pedagogy engine
was calculating `i+1` against a permanently empty engagement baseline.  
**Fix (b):** Added `learnerProfileService.recordSession(getCurrentUserId(), {...})`
as a fire-and-forget call in `handleLessonComplete`. Used `getCurrentUserId()` from
`services/pocketbaseService.ts` to avoid requiring `id` on the `UserProfile` type.
Star rating is used as a proxy for `correctFirstTry` (3★ ≈ 100%, 1★ ≈ 33%) until
per-activity tracking is added in Phase 2.

---

### GAP 4 — Task H: Dual-prompt architecture not documented
**File:** `services/systemPrompts.ts`  
**Problem:** Two independent prompt systems existed (`services/systemPrompts.ts` for
the Main Hall chat, `src/services/aiPedagogyClient.ts` for the lesson generator) with
no explanation of why they are separate or when to use each.  
**Fix:** Added a prominent architecture note at the top of `services/systemPrompts.ts`
explaining the dual-prompt strategy, which persona is used where, and explicitly
noting **do not merge until Phase 2**.

---

### GAP 5 — `handleContinue` in `LessonView` had stale closure over `sunDropsMax`
**File:** `src/components/lesson/LessonView.tsx`  
**Status:** Fixed as part of GAP 3 work — `handleContinue` was rewritten to compute
`timeSpentMs` from the ref and close correctly over `state.sunDropsEarned`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/pedagogy.ts` | Added optional `ageGroup` to `LearnerProfile` interface |
| `src/services/lessonGeneratorV2.ts` | Threaded `profile.ageGroup` through both `getAgeGroup()` call sites |
| `src/hooks/useLesson.ts` | Fixed `lessonStartTime` initialisation; reset on `loadLesson`/`resetLesson` |
| `src/components/lesson/LessonView.tsx` | Added `lessonStartTimeRef`; computed `timeSpentMs` in `handleContinue`; reset ref in `handleReplay` |
| `App.tsx` | Added `learnerProfileService.recordSession()` in `handleLessonComplete`; used `getCurrentUserId()` |
| `services/systemPrompts.ts` | Added Task H architecture note explaining dual-prompt strategy |

---

## Deferred to Phase 2

- Per-activity help tracking (currently `helpUsed: 0` approximation)
- Age group collection in onboarding (currently defaults to `'11-14'`)
- Merging Lingo + Professor Finch prompt systems when Main Hall becomes chunk-aware
- `correctFirstTry` precision — currently approximated from star rating

---

## Confidence: 8.5/10

**Met:**
- [x] All 5 gaps closed with working TypeScript
- [x] No silent failures — all non-fatal calls have `.catch()` with console warnings
- [x] Pedagogy engine now has real engagement data on every lesson completion
- [x] Dual-prompt architecture documented for future developers
- [x] `timeSpentMs` correctly computed from `useRef` (no stale closure bugs)

**Concerns:**
- [ ] Star-rating proxy for `correctFirstTry` is coarse — acceptable for Phase 1.2 but upgrade in Phase 2

**Deferred:**
- [ ] Age group onboarding screen (Phase 2)
- [ ] Per-activity help button tracking (Phase 2)
