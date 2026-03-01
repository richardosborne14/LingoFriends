# Task 2.3.3: Lesson Audio & TTS Fixes

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Fix three related audio issues in the lesson system: (1) the 'Learn Something New!' phrase should auto-play via TTS when a new lesson step opens, (2) the spinning audio icon should only spin while audio is actively playing and reset correctly between steps, and (3) the help popup should use Google TTS instead of the browser's native `speechSynthesis` API.

## Bugs Addressed

- **Bug 3:** Opening a new lesson step (the INFO/introduce card) does not automatically play the TTS audio for 'Learn Something New!' — learners must manually press play.
- **Bug 9:** The spinning audio icon starts spinning on the *second* lesson step (not the first), and continues spinning even after moving on to a different question or step.
- **Bug 8:** The help/AI assistant popup uses the browser's native `window.speechSynthesis` API for TTS, which sounds robotic and inconsistent. It should use the same Google Cloud TTS pipeline as the rest of the lesson.

## Root Cause Analysis

### Bug 3 — No auto-play on step open

The lesson step component (`src/components/lesson/LessonView.tsx` or similar) renders the INFO card but does not call `ttsService.speak()` on mount. The audio replay button likely exists but is not triggered automatically.

Fix: Add a `useEffect` that triggers TTS when a new INFO step is first displayed.

```typescript
// In the INFO step component, on mount:
useEffect(() => {
  if (activity.type === 'info') {
    ttsService.speak('Learn something new!', targetLanguage);
  }
}, [activity.id]); // Re-run when activity changes
```

### Bug 9 — Spinning icon state persists incorrectly

The audio icon spinning state (`isPlaying`) is not being reset when:
- The user moves to a new activity/question
- The audio completes on one step but the component re-renders for the next step
- The second step's TTS auto-plays and the first step's spinner was never stopped

Fix:
- Reset `isPlaying` state when `activity.id` changes
- Tie `isPlaying` to the actual TTS playback state (listen to `onStart` / `onEnd` events from `ttsService`)
- Ensure the spinner component receives a key prop tied to `activity.id` so it remounts clean on step change

### Bug 8 — Browser native TTS in help popup

The help overlay (`src/components/lesson/HelpOverlay.tsx`) currently calls `window.speechSynthesis.speak()` or a similar native API. This sounds robotic, doesn't match the target language voice, and is inconsistent with the rest of the lesson.

Fix: Replace all `window.speechSynthesis` calls with `ttsService.speak()` from `src/services/ttsService.ts`, passing the appropriate language code.

## What Needs to Be Built

### Auto-play on INFO step open

In the INFO activity component or `LessonView.tsx`:
- Detect when activity type is `'info'` (the INTRODUCE step)
- On component mount / activity change, call TTS to speak the phrase being learned
- The phrase to speak is the target-language content of the INFO card (e.g. "Guten Tag")
- Do NOT auto-play on question activities — only INFO steps

### Spinning icon lifecycle fix

In `src/components/lesson/AudioReplayButton.tsx` (or wherever the spinning icon lives):
- Accept an `activityId` prop and reset internal `isPlaying` state when it changes
- Subscribe to TTS service events: `isPlaying = true` on TTS start, `isPlaying = false` on TTS end or error
- Use a `key={activityId}` on the component to force remount between activities

### TTS service event system

If `ttsService` doesn't already expose `onStart`/`onEnd` callbacks, add them:

```typescript
// In ttsService.ts
type TTSEventListener = () => void;

let onStartListeners: TTSEventListener[] = [];
let onEndListeners: TTSEventListener[] = [];

export function onTTSStart(fn: TTSEventListener) { onStartListeners.push(fn); }
export function onTTSEnd(fn: TTSEventListener) { onEndListeners.push(fn); }

// Call these inside the speak() function
```

### Replace native TTS in HelpOverlay

In `src/components/lesson/HelpOverlay.tsx`:
- Import `ttsService` from `src/services/ttsService.ts`
- Replace any `window.speechSynthesis.speak(...)` with `ttsService.speak(text, languageCode)`
- Determine the target language from context/props (the learner's target language)

## Files to Modify

- `src/components/lesson/LessonView.tsx` — add auto-play on INFO step open
- `src/components/lesson/AudioReplayButton.tsx` — fix spinning icon lifecycle
- `src/components/lesson/HelpOverlay.tsx` — replace native TTS with Google TTS
- `src/services/ttsService.ts` — add onStart/onEnd event hooks if missing
- `src/components/lesson/activities/InfoDisplay.tsx` — may also trigger auto-play here

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Auto-play trigger location | InfoDisplay component vs. LessonView | InfoDisplay — keeps audio logic co-located with content |
| Spinner reset approach | Key prop vs. manual reset | Key prop tied to activityId — cleaner React pattern |
| What to auto-play on INFO | "Learn something new!" phrase OR the target phrase | The target phrase itself (e.g. "Guten Tag"), not just the header |
| Help overlay voice | Same voice as lesson vs. slightly different | Same Google TTS voice — consistency matters |

## Testing

- [ ] Opening a lesson step's INFO card auto-plays the target phrase via Google TTS
- [ ] Spinning icon is NOT spinning when no audio is playing
- [ ] Spinning icon spins correctly when audio plays on the first step
- [ ] Spinner stops and resets when moving to a new question
- [ ] No "ghost spinning" — icon never spins when silent
- [ ] Help popup voices content via Google TTS (not robotic browser TTS)
- [ ] TTS works in the target language (correct language code passed)

**Test scenarios:**
1. Open first lesson step INFO card — TTS auto-plays, spinner spins, stops when done
2. Move to next question — spinner is stopped and reset
3. Open second lesson step — TTS auto-plays again, spinner resets correctly
4. Open help overlay, trigger explanation — voice is Google TTS quality
5. Rapidly skip through activities — spinner never gets stuck

## Confidence Scoring

### Requirements to Meet
- [ ] Auto-play on INFO step
- [ ] Spinner only active during playback
- [ ] Spinner resets between activities
- [ ] Help overlay uses Google TTS

### Concerns
- [ ] TTS service may have rate limits — rapid auto-play on quick activity skipping could spam the API. Add a debounce or cancel-previous mechanism.
- [ ] Google TTS has a cost per character — auto-playing every INFO step increases API spend slightly. Acceptable for MVP.

### Deferred
- [ ] TTS caching to avoid re-fetching the same phrase twice → Task 1.3.2 (already in backlog)
- [ ] User setting to disable auto-play TTS → Phase 3

## Notes for Future Tasks

The TTS service event system (onStart/onEnd) will also be useful for the avatar mouth animation (lip-sync) in Task 2.3.10. Build it once here and reuse.

## Learnings

TBD after implementation.
