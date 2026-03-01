# Task 3.5: TTS Target Language Lock

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** None (can run in parallel with other Phase 3 tasks)  
**Estimated Time:** 2–3 hours  
**Priority:** Medium — improves pronunciation quality immediately

---

## Objective

Lock the Google TTS voice to the **target language** for ALL lesson audio, even when the content is in the learner's native language. This is a deliberate choice based on real-world testing:

> When the AI speaks mostly in English but with German words dotted around, setting the TTS voice to German pronounces EVERYTHING better than the inverse. The German words are pronounced correctly (native quality), and the English words get a charming German accent that's both understandable and immersive.

Setting TTS to the native language causes the target language words to be mangled — exactly the wrong thing for a language learning app.

---

## The Rule

```
ALWAYS: TTS voice = target language

Learning German → TTS voice = German (de-DE)
  → German words: perfect pronunciation ✅
  → English/French words in coaching: slight accent, still clear ✅

Learning English → TTS voice = English (en-GB or en-US)
  → English words: perfect pronunciation ✅
  → French words in context: slight accent, still clear ✅

NEVER: TTS voice = native language
  → Target language words get butchered ❌
```

---

## Implementation

### File 1: `src/hooks/useLessonAudio.ts`

**Find** the TTS call configuration where the language is set. Currently, the coaching text (native language content) might be using the native language voice, while the target phrase uses the target language voice.

**Change:** ALL TTS calls within a lesson use the target language voice.

```typescript
// BEFORE (possible current implementation):
// Coaching text uses native language
phrases.push({
  text: coachingText,
  language: 'English',  // ← WRONG: native language voice
  chunkId: `coaching-${index}`,
});

// Target phrase uses target language
phrases.push({
  text: targetPhrase,
  language: targetLanguage,  // ← Correct
  chunkId: step.chunkId,
});

// AFTER (Phase 3):
// ALL audio uses target language voice
phrases.push({
  text: coachingText,
  language: targetLanguage,  // ← ALWAYS target language
  chunkId: `coaching-${index}`,
});

phrases.push({
  text: targetPhrase,
  language: targetLanguage,  // ← Same as before
  chunkId: step.chunkId,
});
```

**Specifically in `extractAllAudioPhrases()`:**

Find this block and fix it:

```typescript
// CURRENT (from the codebase):
if (coachingText && !seen.has(coachingText)) {
  seen.add(coachingText);
  // Coaching text uses native language voice
  phrases.push({
    text: coachingText,
    language: 'English', // Will be overridden by actual native language
    chunkId: `coaching-${lesson.steps.indexOf(step)}`,
  });
}

// REPLACE WITH:
if (coachingText && !seen.has(coachingText)) {
  seen.add(coachingText);
  // ALL lesson TTS uses target language voice (Phase 3.5)
  // This produces better pronunciation for target language words
  // embedded in native language coaching text
  phrases.push({
    text: coachingText,
    language,  // ← `language` parameter is already the target language
    chunkId: `coaching-${lesson.steps.indexOf(step)}`,
  });
}
```

### File 2: `src/services/ttsService.ts` (or wherever Google TTS is configured)

**Verify** that the TTS service maps language codes to the correct Google TTS voices:

```typescript
const TTS_VOICE_MAP: Record<string, string> = {
  // Target language voices (used for ALL lesson audio)
  'German': 'de-DE',
  'English': 'en-GB',   // British English (or en-US based on preference)
  'French': 'fr-FR',
  'Spanish': 'es-ES',

  // Language codes (in case codes are passed instead of names)
  'de': 'de-DE',
  'en': 'en-GB',
  'fr': 'fr-FR',
  'es': 'es-ES',
};
```

**Add a prominent comment:**

```typescript
/**
 * PHASE 3 RULE: ALL lesson TTS uses the TARGET language voice.
 *
 * Even coaching text (which is in the native language with target
 * language examples) uses the target language voice. This produces:
 * - Perfect pronunciation of target language words
 * - A charming accent on native language words (still understandable)
 * - An immersive "you're being taught BY a German speaker" feeling
 *
 * DO NOT set the voice to the native language for any lesson audio.
 * The only exception is the Help chat system, which is a general
 * conversation tool and can use the native language voice.
 */
```

### File 3: Help Chat Exception

The **Help chat** (non-lesson context) can continue to use the native language voice, since it's a support conversation, not a teaching moment. Verify this is already the case — if the Help chat uses a different TTS path, no changes needed.

```typescript
// Help chat: native language voice is fine
// Lesson audio (including coaching): ALWAYS target language voice
```

---

## Google TTS Voice Quality Notes

For the best experience, use Google Cloud TTS WaveNet voices (if available in the current setup):

| Language | Recommended Voice | Fallback |
|----------|------------------|----------|
| German | de-DE-Wavenet-C (female) or de-DE-Wavenet-D (male) | de-DE-Standard-A |
| English | en-GB-Wavenet-A (female) or en-GB-Wavenet-B (male) | en-GB-Standard-A |
| French | fr-FR-Wavenet-C (female) or fr-FR-Wavenet-D (male) | fr-FR-Standard-A |

WaveNet voices handle mixed-language content more naturally than Standard voices.

---

## Acceptance Criteria

- [ ] All lesson TTS (coaching text, target phrases, discovery prompts) uses target language voice
- [ ] German lessons: coaching text in English/French is spoken with German accent
- [ ] English lessons: coaching text in French is spoken with English accent
- [ ] Target language words in coaching text are pronounced correctly
- [ ] Help chat TTS still uses native language voice (no regression)
- [ ] No TTS errors when native language text is spoken with target language voice

---

## Test Commands

```bash
# Manual testing:
# 1. Start a German lesson as a French-speaking user
# 2. Listen to coaching text — should sound like a German speaker
# 3. Listen to target phrases — should be perfect German pronunciation
# 4. Verify French words in coaching text are understandable (slight accent OK)
# 5. Open Help chat — should sound like a French speaker (native language)

# Code verification:
grep -rn "language.*English\|language.*native\|language.*French" src/hooks/useLessonAudio.ts
# Should show NO instances of native language being used for lesson TTS
```
