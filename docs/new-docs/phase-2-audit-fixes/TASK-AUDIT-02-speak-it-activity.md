# TASK-AUDIT-02: Speak It Activity — Pronunciation Practice

**Status:** 🔲 Not started
**Priority:** 🔴 Critical — the only activity where kids PRODUCE language vocally
**Estimated Time:** 6–8 hours
**Dependencies:** TASK-AUDIT-01 (Voice Input Foundation — MicButton + STT API)
**Audit Finding:** #1 — "The App Is Mute Where It Should Be Listening"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `TASK-V2-04-activity-variety.md` — the original "Type 6: Speak It (STT)" spec (partially implemented in docs, never built)
3. `03-AI-STRATEGY.md` — STT: Whisper Large v3 via Groq; TTS: Google Cloud, ALWAYS target language voice
4. `04-PEDAGOGY-SUMMARY.md` — teach-first 5-step progression
5. `PEDAGOGY.md` — Krashen's Input Hypothesis: speech EMERGES from comprehensible input; the silent period is respected
6. `01-DESIGN-SYSTEM.md` — activity component styling, reward animations

---

## Problem

The child hears the target language (TTS works beautifully) but never speaks it. Every current activity involves tapping, selecting, or typing. There is no pronunciation practice. The original TASK-V2-04 specced a "Speak It" activity in detail but it was never built — it's not in `ActivityRouter.svelte`.

Language acquisition research (Swain's Output Hypothesis) shows that producing language — not just receiving it — is essential for acquisition. The current app is all input, zero output. A child using LingoFriends can recognise "Wie geht es dir?" and translate it, but has never tried saying it.

---

## Goals

1. New `SpeakItActivity.svelte` component — child hears a phrase, then speaks it
2. Whisper transcribes the attempt, fuzzy comparison gives a star rating
3. Pronunciation feedback is encouraging, NEVER punishing (per PEDAGOGY.md)
4. Activity integrated into the lesson assembler as an optional step
5. TTS "listen first" button so the child can hear the correct pronunciation before trying

---

## How It Works

```
┌──────────────────────────────────────────┐
│                                          │
│          Say this out loud:              │
│                                          │
│     "Wie geht es dir?"                  │  ← Large, target phrase
│     (How are you?)                       │  ← Small, translation
│                                          │
│     🔊 [Tap to hear it first]            │  ← Plays TTS
│                                          │
│     ┌──────────────────────────────┐     │
│     │          🎤                  │     │  ← Large mic button
│     │     Tap to speak             │     │
│     └──────────────────────────────┘     │
│                                          │
│                                          │
│     ──── after speaking ────             │
│                                          │
│     You said: "Vi get es dir"            │  ← Whisper transcript
│                                          │
│     ⭐⭐⭐⭐☆                           │  ← Star rating
│                                          │
│     Pretty close! The tricky part is     │
│     "Wie" — it sounds like "Vee" 🇩🇪     │  ← Helpful feedback
│                                          │
│     [Try again 🔄]    [Continue →]       │
│                                          │
└──────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — SpeakIt Activity Type

**Add to `src/lib/types/lesson.ts`:**

```typescript
// Add to ActivityType enum
SPEAK_IT = 'speak_it',

// New activity config interface
export interface SpeakItActivity {
  type: ActivityType.SPEAK_IT;
  /** The phrase the child should say (target language) */
  targetPhrase: string;
  /** Native translation shown below for context */
  nativeTranslation: string;
  /** Pre-generated TTS audio key for "listen first" */
  audioKey?: string;
}
```

### Step 2 — Pronunciation Comparison Service

**Create `src/lib/services/pronunciationService.ts`:**

```typescript
/**
 * Compare a child's spoken attempt against the expected phrase.
 *
 * Uses normalised Levenshtein distance for fuzzy matching.
 * Very forgiving — children's pronunciation is developing,
 * and Whisper transcription of children's speech is imperfect.
 *
 * Returns a star rating (1-5) and a feedback category.
 * NEVER returns 0 stars — every attempt gets at least 1 star
 * because speaking takes courage (Krashen — Affective Filter).
 */
export interface PronunciationResult {
  stars: 1 | 2 | 3 | 4 | 5;
  similarity: number;          // 0-1, where 1 = exact match
  feedback: 'perfect' | 'great' | 'good' | 'close' | 'keep_trying';
  transcript: string;          // What Whisper heard
  /** Words the child got right (for positive reinforcement) */
  correctWords: string[];
  /** Words that were different (for gentle feedback) */
  differentWords: string[];
}

export function comparePronunciation(
  expected: string,
  transcript: string,
): PronunciationResult {
  // Normalise both strings: lowercase, strip punctuation, collapse whitespace
  const normExpected = normalise(expected);
  const normTranscript = normalise(transcript);

  // Word-level comparison (more meaningful than character-level)
  const expectedWords = normExpected.split(/\s+/);
  const transcriptWords = normTranscript.split(/\s+/);

  const correctWords: string[] = [];
  const differentWords: string[] = [];

  for (const word of expectedWords) {
    if (transcriptWords.some(tw => fuzzyMatch(tw, word))) {
      correctWords.push(word);
    } else {
      differentWords.push(word);
    }
  }

  const similarity = correctWords.length / Math.max(expectedWords.length, 1);

  // Star rating — generous, because speaking is brave
  const stars: 1 | 2 | 3 | 4 | 5 =
    similarity >= 0.95 ? 5 :
    similarity >= 0.80 ? 4 :
    similarity >= 0.60 ? 3 :
    similarity >= 0.40 ? 2 : 1;

  const feedback =
    stars === 5 ? 'perfect' :
    stars === 4 ? 'great' :
    stars === 3 ? 'good' :
    stars === 2 ? 'close' : 'keep_trying';

  return { stars, similarity, feedback, transcript, correctWords, differentWords };
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F]/g, '') // keep accented characters
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Allow Levenshtein distance of 1 for short words, 2 for longer words
  const maxDist = b.length <= 3 ? 1 : 2;
  return levenshtein(a, b) <= maxDist;
}
```

### Step 3 — Feedback Message Generator

**Add to `pronunciationService.ts`:**

```typescript
/**
 * Generate encouraging feedback for a pronunciation attempt.
 *
 * CRITICAL RULES (PEDAGOGY.md — Affective Filter):
 * - ALWAYS start with what they got right
 * - NEVER say "wrong" or "incorrect"
 * - Pronunciation tips should be fun, not clinical
 * - Every attempt deserves encouragement — speaking takes courage
 */
export function generateFeedback(
  result: PronunciationResult,
  targetLanguage: string,
  nativeLanguage: string,
): string {
  // i18n keys — actual translations in en.json/fr.json
  const key = `pronunciation.feedback.${result.feedback}`;

  // For 'close' and 'keep_trying', add a specific tip about the tricky words
  if (result.differentWords.length > 0 && result.stars <= 3) {
    const tricky = result.differentWords[0];
    return `${key} + pronunciation.tip`; // Template: "Pretty close! The tricky part is '{word}'"
  }

  return key;
}
```

**Feedback messages (for i18n files):**

```json
{
  "pronunciation": {
    "instruction": "Say this out loud:",
    "listen_first": "Tap to hear it first",
    "tap_to_speak": "Tap to speak",
    "you_said": "You said:",
    "try_again": "Try again",
    "feedback": {
      "perfect": "Perfect! You sound amazing! 🌟",
      "great": "Great pronunciation! Almost perfect!",
      "good": "Pretty good! You're getting the hang of it!",
      "close": "Not bad! The tricky part is \"{word}\"",
      "keep_trying": "Good effort! Let's listen again and try once more"
    },
    "encouragement": [
      "Speaking a new language takes courage — well done for trying!",
      "Your accent is coming along nicely!",
      "Every time you speak, it gets a little easier!"
    ]
  }
}
```

### Step 4 — SpeakItActivity Component

**Create `src/lib/components/activities/SpeakItActivity.svelte`:**

Props:
```typescript
interface Props {
  config: SpeakItActivity;
  targetLanguage: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onShowHelp: () => void;
}
```

Behaviour:
1. On mount: display target phrase + translation. Show "listen first" TTS button and mic button.
2. "Listen first" plays TTS of the target phrase (from audioMap or on-demand fetch).
3. Child taps mic → MicButton records → STT transcribes → `comparePronunciation()` evaluates.
4. Show result: transcript, star rating, feedback message.
5. If stars ≥ 3: "Continue" button appears. Award SunDrops based on stars (5★ = 3 SunDrops, 4★ = 2, 3★ = 1).
6. If stars < 3: "Try again" is the primary button, "Continue" is a ghost button. No penalty — this is practice.
7. **NEVER penalise pronunciation.** Wrong answers in other activities lose SunDrops. Speak It ONLY gives rewards, never takes them away. Speaking takes courage.
8. Max 3 attempts. After 3, auto-advance with at least 1 SunDrop regardless of quality.

**SunDrop awards:**
- 5 stars: 3 ☀️ + encouraging message
- 4 stars: 2 ☀️
- 3 stars: 1 ☀️
- 1-2 stars: 0 ☀️ but NO penalty, and "Good effort!" message
- After 3 attempts at any score: 1 ☀️ minimum

### Step 5 — Wire into Lesson Assembler

**Modify `src/lib/server/lessons/lessonAssembler.ts`:**

Add a `buildSpeakStep()` builder function:

```typescript
/**
 * Build a SPEAK_IT step for pronunciation practice.
 *
 * Placed AFTER the INTRODUCE step — the child has seen and heard
 * the phrase, now they try saying it. This respects Krashen's
 * silent period: we never force speech before input.
 *
 * Awards: 0-3 SunDrops (pronunciation is never penalised)
 * Max SunDrops is 3 because it's practice, not a quiz.
 */
function buildSpeakStep(chunk: ChunkContent): LessonStep {
  return {
    id: nanoid(),
    tutorText: 'Now try saying it yourself!',
    helpText: `Listen to the phrase again, then try to repeat it. Don't worry about being perfect — every attempt helps!`,
    activity: {
      type: ActivityType.SPEAK_IT,
      targetPhrase: chunk.targetPhrase,
      nativeTranslation: chunk.nativeTranslation,
    },
    sunDrops: 3, // Maximum possible — actual award based on star rating
  };
}
```

**Modify the per-chunk step sequence:**

Currently: COACHING → INFO → RECOGNIZE → PRACTICE → RECALL → APPLY

New: COACHING → INFO → **SPEAK_IT** → RECOGNIZE → PRACTICE → RECALL → APPLY

BUT — only add SPEAK_IT on alternating chunks to avoid making lessons too long. Use the same even/odd pattern as the practice step variation:

```typescript
// Even chunks: INFO → SPEAK_IT → RECOGNIZE → fill_blank → RECALL → APPLY
// Odd chunks:  INFO → RECOGNIZE → word_arrange → RECALL → SPEAK_IT → APPLY
```

This way every lesson has pronunciation practice but it appears at different points in the progression, adding variety.

### Step 6 — Wire into ActivityRouter

**Modify `src/lib/components/activities/ActivityRouter.svelte`:**

Add the SpeakItActivity case:

```svelte
{:else if step.activity.type === ActivityType.SPEAK_IT}
  <SpeakItActivity
    config={step.activity}
    {targetLanguage}
    {onComplete}
    onShowHelp={showHelp}
  />
```

---

## 🤔 Decision Points for User

> **1. Where in the 5-step sequence should Speak It appear?**
> - **(A) After INFO (step 1.5)** — child just learned the phrase, immediately tries saying it
> - **(B) After RECALL (step 4.5)** — child has practised the phrase, now produces it orally
> - **(C) Alternating** — even chunks: after INFO, odd chunks: after RECALL (variety)
> **Recommendation:** Option C. Variety prevents pattern fatigue (audit finding #4).

> **2. Should Speak It be in every lesson?**
> - **(A) Every lesson, every chunk** — maximise speaking practice but lessons get longer
> - **(B) Every lesson, alternating chunks** — good balance
> - **(C) Every other lesson** — less speaking but keeps lesson length stable
> **Recommendation:** Option B. One Speak It per lesson for a 3-chunk lesson keeps length manageable.

> **3. Star display — 5 stars or 3 stars?**
> - **(A) 5 stars** — more granularity, feels like a real rating
> - **(B) 3 stars** — consistent with lesson completion stars, simpler
> **Recommendation:** Option A. Pronunciation deserves finer granularity. Lesson stars stay at 3.

> **4. Should the AI generate pronunciation tips per chunk?**
> - **(A) Yes — add a `pronunciationTip` field to ChunkContent** — AI generates targeted tips like "The 'ch' in 'Ich' sounds like the 'sh' in 'ship'"
> - **(B) No — use generic tips based on differentWords** — simpler, no AI cost
> **Recommendation:** Option A for Phase 4+. Option B for now — keep the STT feedback loop working first.

---

## Tests

```typescript
describe('pronunciationService', () => {
  it('returns 5 stars for exact match', () => {});
  it('returns 4 stars for close match (1 word different)', () => {});
  it('returns 1 star for very different transcript', () => {});
  it('never returns 0 stars', () => {});
  it('identifies correct and different words', () => {});
  it('handles accented characters in normalisation', () => {});
  it('fuzzy matches short words with Levenshtein ≤ 1', () => {});
  it('generates encouraging feedback for each rating tier', () => {});
});

describe('SpeakItActivity', () => {
  it('renders target phrase and translation', () => {});
  it('plays TTS on listen-first button tap', () => {});
  it('shows mic button for recording', () => {});
  it('displays star rating after pronunciation attempt', () => {});
  it('never deducts SunDrops (no penalty)', () => {});
  it('awards SunDrops based on star rating', () => {});
  it('allows retry up to 3 times', () => {});
  it('auto-advances after 3 attempts with minimum 1 SunDrop', () => {});
});

describe('Lesson Assembler + Speak It', () => {
  it('includes SPEAK_IT step in assembled lesson', () => {});
  it('SPEAK_IT step has correct config fields', () => {});
  it('alternates Speak It placement across chunks', () => {});
});
```

---

## 🖥️ Browser Verification

1. Start a lesson → find a Speak It step in the progression
2. See target phrase + translation displayed prominently
3. Tap 🔊 "Hear it first" → TTS plays the phrase
4. Tap 🎤 → mic records → speak the phrase → tap to stop
5. See transcript + star rating + feedback message
6. Stars ≥ 3 → SunDrops awarded, Continue button visible
7. Stars < 3 → "Try again" primary, no penalty shown
8. After 3 attempts → auto-advances with 1 SunDrop
9. Deny mic → no crash, text fallback or skip option
10. LessonHUD counter reflects Speak It SunDrops (never goes down)

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/lib/components/activities/SpeakItActivity.svelte`
- `src/lib/services/pronunciationService.ts`

**Modified files:**
- `src/lib/types/lesson.ts` — add `SPEAK_IT` to `ActivityType`, add `SpeakItActivity` interface
- `src/lib/server/lessons/lessonAssembler.ts` — add `buildSpeakStep()`, insert into sequence
- `src/lib/components/activities/ActivityRouter.svelte` — add SPEAK_IT routing
- `src/lib/server/lessons/lessonValidator.ts` — validate SPEAK_IT step fields
- `src/lib/i18n/en.json` + `fr.json` — pronunciation feedback strings

---

## Acceptance Criteria

- [ ] SpeakItActivity renders correctly with target phrase and translation
- [ ] "Listen first" plays TTS of the phrase
- [ ] MicButton records, STT transcribes, star rating appears
- [ ] SunDrops awarded correctly (5★=3, 4★=2, 3★=1, <3★=0)
- [ ] NEVER deducts SunDrops for poor pronunciation
- [ ] Retry allowed up to 3 times
- [ ] Auto-advance after 3 attempts with minimum 1 SunDrop
- [ ] Feedback is encouraging and specific (names tricky words)
- [ ] Integrated into lesson assembler at correct position
- [ ] Validates in lesson validator
- [ ] All text translated (en/fr)
- [ ] Tests: 19+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
