# TASK-V2-03 — Lesson Feedback: Hearts, Streaks & Modals

**Phase:** 2 — Lesson Engine  
**Status:** ✅ Complete  
**Completed:** 2026-03-14  
**Confidence:** 9/10  
**Actual Time:** ~3h (estimated: 3h)

---

## What Was Built

A full in-lesson feedback system: hearts (lives), streak bonuses, and four modal overlays that appear during gameplay to reward correct answers, show gentle feedback on wrong answers, and offer a compassionate "breather" when lives run out. A persistent `LessonHUD` component replaces the raw progress bar in the lesson header. All components are wired into the lesson page via a clean callback-based modal dismiss flow.

---

## Key Files

| File | Description |
|------|-------------|
| `src/lib/services/rewardService.ts` | Pure functions: streak bonuses, event builders, messages |
| `src/lib/services/soundService.ts` | Fire-and-forget audio with mute preference (localStorage) |
| `src/lib/stores/lesson.ts` | Extended with hearts, streak, pendingReward, pendingPenalty, showBreather + action functions |
| `src/lib/components/lesson/LessonHUD.svelte` | Progress bar + hearts + SunDrops counter (animated) |
| `src/lib/components/modals/RewardModal.svelte` | ☀️ +N popup — auto-dismisses 1.2s (1.6s at milestones) |
| `src/lib/components/modals/PenaltyModal.svelte` | ☀️ -N popup — auto-dismisses 1.5s — gentle messaging |
| `src/lib/components/modals/BreatherModal.svelte` | Hearts ran out — manual dismiss — "Try Again 💪" |
| `src/lib/components/modals/FirstLessonCompleteModal.svelte` | 3-page explainer modal for first lesson completion |
| `src/routes/(app)/lesson/[id]/+page.svelte` | Wired: preloadSounds, handleActivityComplete, modal callbacks |

---

## Architecture: Modal Dismiss Flow

```
Activity completes
    ↓
handleActivityComplete(correct, sunDrops)
    ↓
correct + sunDrops > 0 → setPendingReward → RewardModal.onDismiss → advanceStep
correct + sunDrops = 0 → advanceStep (INFO steps, no modal)
wrong, hearts > 0      → deductSunDrop + loseHeart + setPendingPenalty → PenaltyModal.onDismiss → advanceStep
wrong, hearts = 0      → deductSunDrop + loseHeart (auto-sets showBreather) → BreatherModal.onContinue → restoreHearts + advanceStep
```

---

## Streak Milestones

| Streak | Bonus SunDrops | Sound | Message |
|--------|---------------|-------|---------|
| 3 | +3 | levelup.wav | 🔥 On a roll! |
| 5 | +5 | levelup.wav | 🔥🔥 ON FIRE! |
| 10 | +8 | levelup.wav | 🔥🔥🔥 UNSTOPPABLE! |
| Other | 0 | — | Random encouragement |

---

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Hearts are not game-over | Breather modal → continue | Krashen's Affective Filter — failure anxiety blocks learning |
| Penalty message tone | Never uses "wrong", "bad", "failed" | Children 7-10 have fragile confidence; tested in rewardService.test.ts |
| RewardModal placement | Fixed, bottom-centre overlay | Doesn't interrupt the lesson layout |
| Sounds: fire-and-forget | No await on playSound() | Audio must never block game flow |
| INFO steps skip reward modal | advanceStep() directly | 0-sundrop reward modal would feel empty/confusing |
| BreatherModal: manual dismiss only | No auto-dismiss | The agency to continue is pedagogically intentional |
| SoundService: muted preference | localStorage key `lf_sounds_muted` | Persists across sessions, survives page refresh |

---

## Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/tests/services/rewardService.test.ts` | 23 | ✅ All passing |
| `src/tests/services/soundService.test.ts` | 10 | ✅ All passing |
| `src/tests/stores/lessonHearts.test.ts` | 30 | ✅ All passing |
| **Total TASK-V2-03** | **63** | ✅ |

**Note:** soundService.test.ts shows `HTMLMediaElement.prototype.play` stderr warnings from jsdom — this is expected and non-blocking. All 10 tests pass. The warnings confirm our `playSound()` gracefully attempts playback (test that it doesn't throw passes).

---

## Notes for Future Tasks

- `FirstLessonCompleteModal` is built but not yet wired — it needs to be triggered by `CompletionScreen` when `profile.lessonsCompleted === 1` (Phase 5 task)
- `BreatherModal` could show a tip or mini-lesson in a future iteration (Phase 3 stretch goal)
- Streak data is currently session-only — persisting the "best streak" to the user profile is a Phase 5 enhancement
- The `SoundService.preloadSounds()` call in the lesson page is a performance optimisation — consider expanding to garden sounds when garden page loads
