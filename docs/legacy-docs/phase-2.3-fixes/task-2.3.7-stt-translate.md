# Task 2.3.7: Encourage STT Voice Input on Translate Activities

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

On "now you say it" (TRANSLATE / RECALL) activities, make the microphone the **primary and most visible** input method, visually encouraging learners to try speaking the answer rather than typing. Ensure the STT (speech-to-text) service is configured to listen in the **target language**.

## Bug Addressed

- **Bug 12:** On TRANSLATE questions ("say it in German", "type the phrase"), the text input box is the only prominent UI. Speaking practice is a core feature of the app, but there's no visible encouragement to use voice. The microphone button exists but is not prominent enough.

## Design Intent

For young learners, speaking practice is arguably more valuable than typing. The TRANSLATE/RECALL activity type is the ideal moment to encourage this. The UI should:
- Show the microphone as the **first, most prominent** input option
- Include friendly copy: "Try saying it! 🎤" or "Can you say it out loud?"
- Fall back gracefully to the text input for learners who can't or don't want to use their mic
- STT must be configured with the **target language** so it transcribes correctly (German input ≠ English STT)

## What Needs to Be Built

### Translate Activity UI Redesign

In `src/components/lesson/activities/Translate.tsx`:

**Current layout:**
```
Question text
[_________________text input box_________________]
[Submit]
```

**New layout:**
```
Question text

"Can you say it out loud? 🎤"
[  🎤 Tap to Speak  ]   ← large, primary CTA

— or type it below —
[_________________text input box_________________]
[Submit]
```

The voice button should be:
- Large (at least 64px tall, full-width or large pill shape)
- A warm inviting colour (amber/green, not grey)
- Animated pulse when idle to draw attention
- Show a recording animation (waveform / spinning mic) when recording

### STT Language Configuration

The STT service (`src/services/sttService.ts`) must receive the target language code when recording begins:

```typescript
// In Translate.tsx — pass target language to STT
const handleVoiceInput = async () => {
  setIsRecording(true);
  try {
    // CRITICAL: use target language, not native language
    const transcript = await sttService.transcribe({
      language: targetLanguageCode, // e.g. "de" for German
      maxDurationSeconds: 10,
    });
    setUserInput(transcript);
    // Auto-submit after a short delay if transcript is non-empty
    if (transcript.trim()) {
      setTimeout(() => handleSubmit(transcript), 800);
    }
  } catch (error) {
    // Friendly fallback — don't punish kids for mic issues
    showFriendlyError("Couldn't hear that clearly. Try typing it instead!");
  } finally {
    setIsRecording(false);
  }
};
```

### Language Code Passing

The `targetLanguageCode` must be passed down from the lesson context. Use `src/utils/languageUtils.ts` to convert language names to codes — never do `"German".substring(0, 2)`.

```typescript
import { toLanguageCode } from '@/utils/languageUtils';

const targetLanguageCode = toLanguageCode(learnerProfile.targetLanguage);
// "German" → "de", "French" → "fr", "Spanish" → "es", etc.
```

### STT Result Evaluation

After the learner speaks, the transcript is placed in the answer field. The existing answer evaluation logic (fuzzy match, accepted answers) should then evaluate it normally — voice and text answers go through the same evaluation pipeline.

Consider a slight tolerance boost for voice answers: STT occasionally mishears minor words. If the learner's intent is clearly correct (e.g., they said "guten tag" but STT heard "guten tak"), accepted answers should include common STT mishear variants or use fuzzy matching.

### Graceful Fallback

Not all users can or will use the microphone:
- If the browser doesn't support `getUserMedia` — hide the mic button, show text only (no error)
- If the user denies mic permission — show a friendly message "You can type it instead!" 
- If STT returns empty or fails — don't auto-submit, let user type

## Files to Modify

- `src/components/lesson/activities/Translate.tsx` — UI redesign, add prominent mic button
- `src/services/sttService.ts` — ensure language code is accepted as parameter
- `src/utils/languageUtils.ts` — verify `toLanguageCode()` exists and covers all supported languages
- `src/hooks/useLesson.ts` — verify target language is available in lesson context

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Default input method | Voice first vs. text first | Voice first — show mic prominently, text as secondary |
| Auto-submit after STT | Auto-submit with 800ms delay vs. require manual Submit | Auto-submit after short delay — feels magical |
| STT language | Always target language vs. configurable | Always target language on TRANSLATE activities |
| Fuzzy matching for voice | Strict match vs. fuzzy | Fuzzy — STT has noise, kids shouldn't lose SunDrops for STT errors |
| Mic permission denied | Hide mic button vs. explain | Show friendly message: "You can type it instead 😊" |

## Testing

- [ ] TRANSLATE activity shows large, prominent microphone button
- [ ] Microphone button is visually distinct and inviting (colour, size)
- [ ] Text input is still available as secondary option
- [ ] STT records in the target language (German lesson → German STT)
- [ ] Transcript auto-populates the answer field
- [ ] Correct STT answer is evaluated as correct
- [ ] Mic permission denied → friendly message, text input still works
- [ ] STT failure → fallback to text input, no error shown to user

**Test scenarios:**
1. German TRANSLATE question — click mic button — say "Guten Tag" in German — transcript fills in — auto-submits — marked correct ✓
2. Say the wrong phrase — STT transcribes it — submitted — marked wrong ✓ (penalty applied)
3. Don't use mic — type the answer in text box — submit — works normally ✓
4. Deny mic permission — mic button hidden or shows "type instead" message ✓
5. French lesson — mic records in French (not English) ✓

## Confidence Scoring

### Requirements to Meet
- [ ] Prominent mic button on TRANSLATE activities
- [ ] STT uses target language code
- [ ] Text input still available as fallback
- [ ] Graceful degradation if mic unavailable
- [ ] STT transcript evaluated through same answer pipeline

### Concerns
- [ ] STT accuracy varies by accent/age — kids with non-native accents may struggle. Fuzzy matching mitigates this.
- [ ] Groq Whisper (the STT service) supports language hints — verify the API call includes `language` param

### Deferred
- [ ] STT confidence score — if Whisper returns low confidence, show "I didn't quite hear that, try again!" → Phase 3
- [ ] Voice-only mode (no text input) as an optional challenge mode → Phase 3
- [ ] STT on FILL_BLANK activities → Phase 3

## Notes for Future Tasks

The prominent mic button pattern established here should also be applied to FILL_BLANK activities in Phase 3. Design the Translate voice input component to be reusable.

## Learnings

TBD after implementation.
