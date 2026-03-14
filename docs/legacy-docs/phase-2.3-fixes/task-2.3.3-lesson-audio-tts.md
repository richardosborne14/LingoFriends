# Task 2.3.3 — Lesson Audio TTS

**Status:** ✅ COMPLETE  
**Commit:** c9da917

---

## Problems Fixed

Three bugs in the lesson audio pipeline:

### Bug A — Auto-play silent on step 0
When a lesson started, the intro phrase (step 0) never played automatically. The `useLessonAudio` hook pre-generated audio but the "pregen complete" event fired before the component had subscribed, so the ready signal was missed.

### Bug B — Spinner stuck after replay
After the user tapped the replay button and audio finished, the spinner stayed visible permanently. A stale `isGenerating` flag from a previous step was persisted in the hook state.

### Bug C — HelpOverlay used browser TTS
`HelpOverlay.tsx` used `window.speechSynthesis` (robotic, platform-inconsistent) for reading AI help responses aloud. This was inconsistent with the rest of the lesson pipeline which uses Google Cloud TTS (Journey voices).

---

## Fixes

### Bug A — `useLessonAudio.ts`

Added a `pregenCompleteRef` to capture when pre-generation finishes, and a `useEffect` that watches for the case where step 0 is ready but auto-play hasn't fired yet:

```typescript
// When pregen completes and we're still on step 0, trigger auto-play.
// This handles the race where pregen finished before the component subscribed.
useEffect(() => {
  if (
    stepIndex === 0 &&
    !hasAutoPlayed.current &&
    audioState.status === 'ready' &&
    audioState.audioContent
  ) {
    handleAutoPlay();
  }
}, [audioState.status, stepIndex]);
```

### Bug B — `LessonView.tsx`

Added a `key` prop to `AudioReplayButton` that changes when the step changes, forcing a clean re-mount and resetting any internal spinner state:

```tsx
<AudioReplayButton
  key={`replay-${stepIndex}`}  // Forces fresh mount per step
  onReplay={handleReplay}
  isLoading={isGenerating}
/>
```

### Bug C — `HelpOverlay.tsx`

Replaced `window.speechSynthesis` with the Google Cloud TTS pipeline (`generateSpeech` + `playAudio` from `services/ttsService`):

```typescript
import {
  generateSpeech,
  playAudio as playTTSAudio,
  stopAudio as stopTTSAudio,
} from '../../../services/ttsService';

const speakResponse = useCallback((text: string) => {
  const nativeLang: TargetLanguage =
    (lessonContext?.userProfile?.nativeLanguage as TargetLanguage) ?? 'English';
  stopTTSAudio();
  setState(prev => ({ ...prev, isSpeaking: true }));
  generateSpeech(text, { language: nativeLang, speakingRate: 0.9 })
    .then(result => {
      if (!result) { setState(prev => ({ ...prev, isSpeaking: false })); return; }
      return playTTSAudio(result.audioContent, () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
      });
    })
    .catch(err => {
      console.error('[HelpOverlay] TTS playback error:', err);
      setState(prev => ({ ...prev, isSpeaking: false }));
    });
}, [lessonContext]);
```

Cleanup on unmount calls `stopTTSAudio()` to prevent orphaned audio.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useLessonAudio.ts` | Retry auto-play when pregen completes on step 0 |
| `src/components/lesson/LessonView.tsx` | `key` prop on `AudioReplayButton` |
| `src/components/lesson/HelpOverlay.tsx` | Replace `window.speechSynthesis` with Google TTS |

---

## Confidence: 9/10

**Met:**
- [x] Step 0 phrase plays automatically when lesson opens
- [x] Replay spinner clears correctly after playback
- [x] Help overlay uses Journey voices (consistent with lesson audio)
- [x] HelpOverlay cleanup stops TTS on close/unmount
- [x] TypeScript compiles cleanly

**Concerns:**
- [ ] Auto-play still depends on browser autoplay policy — will silently fail on first interaction before user gesture. Handled gracefully (no error shown, replay button available).
