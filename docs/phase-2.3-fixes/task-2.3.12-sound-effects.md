# Task 2.3.12: Wire Up Lesson Sound Effects

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Sound effects for correct answers, wrong answers, and lesson step completion are missing from the game. A sound system and audio files appear to exist in the codebase but are not being triggered during lesson play. Wire them up correctly.

## Bug Addressed

- **Bug 18:** No sounds play when: (a) the learner answers a question correctly, (b) the learner answers a question incorrectly, (c) a lesson step is completed. The lesson experience is silent and flat — sound feedback is essential for a kid-friendly game loop.

## Root Cause Analysis

The codebase has `public/sounds/` directory and what appears to be a sound system (`src/hooks/useSounds.ts`, `services/ttsService.ts`). The sounds likely exist but the trigger calls are missing or broken.

### Likely causes:

1. **Sound files exist but aren't called** — `useSounds.ts` hook exists but is not imported or used in `LessonView.tsx` / `ActivityWrapper.tsx`
2. **Sound files are missing** — The hook references sound files that don't exist in `public/sounds/` (they may have been placeholder filenames)
3. **Browser autoplay policy** — Browsers block audio that isn't initiated by a user gesture. Sound calls on automatic events (like auto-advancing after correct answer) may be silently blocked
4. **Sound hook exists but was never connected to activity completion events**

### Investigation steps:
1. Check `public/sounds/` — what files actually exist?
2. Check `src/hooks/useSounds.ts` — what sounds does it reference, and what triggers them?
3. Check `src/components/lesson/LessonView.tsx` and `ActivityWrapper.tsx` — is `useSounds` imported? Are `playCorrect()`, `playWrong()`, `playComplete()` called anywhere?

## What Needs to Be Built

### Required Sound Slots

| Event | Sound | Character |
|-------|-------|-----------|
| Correct answer | Short upbeat ding/chime | Positive, celebratory |
| Wrong answer | Short low "bzzt" or gentle thud | Non-punishing, neutral |
| Lesson step complete | Fanfare or jingle | Celebratory, satisfying |
| SunDrop earned | Sparkle/coin sound | Rewarding |
| INFO step advance | Soft whoosh or page turn | Neutral, forward momentum |

### Sound File Audit

First, audit what's in `public/sounds/`:

```bash
ls -la public/sounds/
```

If files are missing, either:
- Source royalty-free sounds (freesound.org, pixabay) — must be cleared for kids' app use
- Generate simple programmatic audio using the Web Audio API (no file dependency)
- Use the existing `scripts/download-sounds.sh` if it exists and covers the needed slots

### Wire Up to Activity Events

In `src/components/lesson/activities/ActivityWrapper.tsx` (or `LessonView.tsx`):

```typescript
import { useSounds } from '@/hooks/useSounds';

const { playCorrect, playWrong, playComplete, playSunDrop } = useSounds();

// On correct answer:
const handleCorrect = () => {
  playCorrect(); // play immediately on user action — avoids autoplay block
  // ... rest of correct answer logic
};

// On wrong answer:
const handleWrong = () => {
  playWrong();
  // ... rest of wrong answer logic
};

// On lesson step complete:
const handleLessonComplete = () => {
  playComplete();
  // ... navigate to next step
};
```

### Browser Autoplay Policy

Browsers require a user gesture before playing audio. The correct pattern is:
- **Play sounds only in direct response to a user click/tap** — correct, since the learner taps to submit an answer
- **Never auto-play sounds** on component mount or after a timeout (this gets silently blocked)
- If the sound needs to play after an async operation (e.g., after AI evaluates the answer), use an `AudioContext` that was unlocked by the user's tap gesture

```typescript
// Safe pattern: unlock AudioContext on first user interaction
// Then sounds can play even after async gaps
```

### useSounds Hook Review

Review `src/hooks/useSounds.ts` — it should:
- Use `HTMLAudioElement` or Web Audio API (not just `new Audio()` paths that may be stale)
- Pre-load audio files on hook mount so playback is instant (no buffering lag)
- Respect user preferences if a "sound off" setting exists
- Handle missing audio files gracefully (don't crash, just skip silently)

## Files to Investigate / Modify

- `public/sounds/` — verify which sound files actually exist
- `src/hooks/useSounds.ts` — review and fix if needed
- `src/components/lesson/activities/ActivityWrapper.tsx` — add sound triggers
- `src/components/lesson/LessonView.tsx` — add lesson-complete sound trigger
- `src/components/lesson/SunDropBurst.tsx` — add SunDrop sound trigger
- `scripts/download-sounds.sh` — check if it downloads the needed files

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Sound source | Existing files vs. download fresh vs. Web Audio API | Audit existing first; download/generate if missing |
| Wrong answer sound | Buzzer vs. gentle thud vs. "uh oh" | Gentle thud — non-punishing for kids |
| Volume | Fixed vs. respects system volume | Respect system volume via HTMLAudioElement (automatic) |
| Sound on/off setting | Add settings toggle | Nice to have — add to Settings in Phase 3 |

## Testing

- [ ] Correct answer → upbeat sound plays immediately
- [ ] Wrong answer → gentle wrong-answer sound plays immediately
- [ ] Lesson step complete → satisfying fanfare plays
- [ ] SunDrop burst → sparkle/coin sound plays
- [ ] INFO step advance → soft transition sound (optional but nice)
- [ ] Sounds do NOT play on silent/muted device system volume
- [ ] No console errors about blocked autoplay or missing audio files
- [ ] Sounds work in both desktop Chrome and mobile Safari

**Test scenarios:**
1. Answer question correctly — sound plays instantly on tap ✓
2. Answer question wrong — gentle wrong sound plays ✓
3. Complete a lesson step — satisfying complete sound plays ✓
4. Use the app with device muted — no sound, no errors ✓
5. Rapid tapping through questions — sounds don't overlap badly ✓

## Confidence Scoring

### Requirements to Meet
- [ ] Correct/wrong/complete sounds wired up
- [ ] Sounds triggered on user gesture (not async timeout)
- [ ] No autoplay policy violations
- [ ] All required sound files present in `public/sounds/`

### Concerns
- [ ] Mobile Safari has historically been the most restrictive about audio autoplay — test on real iOS device
- [ ] If sound files are large (>500KB each), preloading all of them may slow initial load — keep sounds under 100KB each

### Deferred
- [ ] Sound on/off toggle in settings → Phase 3
- [ ] Haptic feedback on mobile (in addition to sound) → Phase 3
- [ ] Ambient background music → Phase 3

## Notes for Future Tasks

The sound system should be centralised in `useSounds.ts` — not scattered across individual activity components. Any new activity type added in the future should call the same `playCorrect()` / `playWrong()` hooks.

## Learnings

TBD after implementation.
