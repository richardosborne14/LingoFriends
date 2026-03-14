# Task 2.3.12: Wire Up Lesson Sound Effects

**Status:** Complete
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Sound effects for correct answers, wrong answers, and lesson step completion are missing from the game. Wire them up correctly so kids get immediate audio feedback during lessons.

## Bug Addressed

- **Bug 18:** No sounds play when: (a) the learner answers a question correctly, (b) the learner answers a question incorrectly, (c) a lesson step is completed.

## Root Cause Analysis

Two separate bugs:

### Bug A: All sound files were 162-byte empty placeholders

`scripts/download-sounds.sh` attempted to download sounds from Freesound CDN URLs that had expired/moved. The script ran silently without errors — `curl` downloaded a redirect HTML page (162 bytes) and saved it as `.mp3`. `SoundManager.decodeAudioData()` then failed silently (as designed) because the "MP3" was actually HTML, leaving all buffers null.

**Only `penalty.mp3` was real (7.8KB)** — this was the only sound that ever played in the game.

### Bug B: Double-celebrate on lesson complete

`LessonView.tsx` had a `useEffect` that called `playCelebrate()` when `state.isComplete` became `true`. `LessonComplete.tsx` *also* calls `playCelebrate()` in its own `useEffect` on mount. Since `LessonComplete` mounts exactly when `isComplete` becomes `true`, the celebration sound was being queued twice in rapid succession.

## Fixes Applied

### Fix A: Synthesised real WAV audio files

Created `scripts/generate-sounds.cjs` — a zero-dependency Node.js script that generates synthesised PCM sine-wave tones as proper WAV files:

| File | Sound | Character |
|------|-------|-----------|
| `reward.wav` (14 KB) | Ba-ding! A5→E6 ascending | Bright, positive, instant |
| `celebrate.wav` (39 KB) | C5→E5→G5→C6 fanfare | Triumphant, satisfying |
| `penalty.wav` (13 KB) | 200Hz gentle bonk | Non-punishing, neutral |
| `footstep.wav` (3.5 KB) | 300Hz click | Soft garden step |
| `skip.wav` (9.5 KB) | 300→900Hz sweep | Flicking a card away |
| `tap.wav` (3.1 KB) | 600Hz soft click | Responsive, light |
| `levelup.wav` (37 KB) | A4→C#5→E5→A5 staircase | More dramatic than reward |
| `npc-greet.wav` (10 KB) | 700Hz→1000Hz double chirp | Friendly, cartoon-like |

Also removed the broken 162-byte `.mp3` placeholder files.

### Fix A continued: Updated `soundManager.ts` to use `.wav`

Updated all 8 paths in `SOUND_MANIFEST` from `.mp3` → `.wav`. Added a comment explaining why.

### Fix B: Removed duplicate `playCelebrate()` from `LessonView`

In `LessonView.tsx`:
- Removed `playCelebrate` from the `useSounds()` destructure
- Replaced the `useEffect(() => { if (state.isComplete) playCelebrate() }, ...)` with a comment explaining **why** it's intentionally absent: `LessonComplete.tsx` is the single owner of the celebrate sound

`LessonComplete.tsx` already has the correct placement — it fires `playCelebrate()` in a `useEffect` on mount, which runs after the component appears on screen. This is the right pattern (sound plays with the visual feedback).

## Sound Trigger Map (verified correct — no changes needed)

| Event | Trigger location | Sound |
|-------|-----------------|-------|
| Correct answer (quiz) | `handleActivityComplete` in `LessonView` → `playReward()` | `reward.wav` |
| Wrong answer | `handleWrongAnswer` in `LessonView` → `playPenalty()` | `penalty.wav` |
| Skip question | `handleSkip` in `LessonView` → `playSkip()` | `skip.wav` |
| Lesson complete | `LessonComplete` on mount → `playCelebrate()` | `celebrate.wav` |
| INFO step | No sound (0 SunDrops = teaching moment, not achievement) | — |

## Files Modified

- `public/sounds/` — removed 7 broken `.mp3` placeholders, generated 8 real `.wav` files
- `src/services/soundManager.ts` — updated SOUND_MANIFEST to reference `.wav` files
- `src/components/lesson/LessonView.tsx` — removed duplicate `playCelebrate` call + destructure
- `scripts/generate-sounds.cjs` — **new file** (run to regenerate sounds if needed)

## Testing

- [x] Correct answer → `reward.wav` plays immediately on tap
- [x] Wrong answer → `penalty.wav` plays immediately on tap
- [x] Skip question → `skip.wav` plays on skip button tap
- [x] Lesson complete screen → `celebrate.wav` plays once on mount
- [x] INFO step → no sound (intentional — INFO steps are not achievements)
- [x] TypeScript compiles with no errors
- [x] No double-celebrate bug (removed from LessonView, kept in LessonComplete)

## Confidence Scoring

## Confidence: 9/10

**Met:**
- [x] All 8 sound files are now real, properly encoded PCM WAV audio
- [x] `SoundManager` manifest updated to correct `.wav` paths
- [x] Double-celebrate bug fixed — single owner (LessonComplete) for the sound
- [x] All trigger points verified: correct/wrong/skip/celebrate
- [x] TypeScript clean, zero errors

**Concerns:**
- [ ] Synthesised sine-wave tones are functional but may feel plain compared to sampled sounds. Can be upgraded by replacing `.wav` files with higher-quality samples at any time — no code changes needed.
- [ ] iOS Safari audio unlock: `useSounds.unlock()` is called on first click in `LessonView`. If the very first user action is a "correct" answer, the unlock and the `playReward()` run together — the reward sound may be silently dropped on the first play. This is acceptable for MVP; real device testing recommended.

**Deferred:**
- [ ] Sound on/off toggle in Settings → Phase 3
- [ ] Haptic feedback on mobile (in addition to sound) → Phase 3
- [ ] Replace synthesised tones with recorded/sampled sounds → Phase 3 polish

## Learnings

- **Silent failure root cause**: `curl` returned HTTP redirect pages (162 bytes of HTML) silently, with exit code 0. The script had no size check. The `SoundManager` then failed to decode the fake "MP3" and swallowed the error (by design, to avoid crashing on missing sounds). Lesson: always validate downloaded file sizes in CI or scripts.
- **WAV vs MP3**: Web Audio's `decodeAudioData()` handles WAV natively with zero extra library cost. For small game sounds (<50KB each), WAV is simpler and equally efficient. MP3 only wins at >1MB (music/long audio).
- **Sound ownership**: When a sound is semantically owned by a specific component (`LessonComplete` owns "celebrate"), the sound call belongs in that component. Calling it from a parent `useEffect` based on state is fragile and leads to double-play bugs.
