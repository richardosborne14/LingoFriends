# LingoFriends V2 — Pedagogy Summary

**Distilled from:** PEDAGOGY.md (V1 reference)
**Purpose:** Quick reference for Cline when working on lesson-related code

---

## Four Pillars

### 1. Lexical Approach (Michael Lewis)

Language is chunks, not words + grammar. Teach ready-to-use phrases.

- **Polywords:** "by the way", "upside down" → teach as single units
- **Collocations:** "make a decision" (not "do a decision") → teach natural word pairings
- **Institutionalised utterances:** "I'll get it", "We'll see" → teach whole social phrases
- **Sentence frames:** "Ich bin ___", "If I were you, I'd ___" → teach pattern + let learner fill slots

**In practice:** Every lesson teaches ONE sentence frame with 3 personal variations. Never teach isolated vocabulary words.

### 2. Krashen's Hypotheses

- **Input Hypothesis (i+1):** Content should be slightly above the learner's current level. One new element at a time.
- **Affective Filter:** Anxiety blocks learning. Keep the emotional environment safe, warm, and encouraging. Wrong answers get "Not quite!" never "Wrong!"
- **Natural Order:** Grammar is acquired in a predictable order. Don't force grammar concepts ahead of schedule.
- **Monitor Hypothesis:** Conscious grammar knowledge only helps as a "monitor" for self-correction, not as the primary learning mechanism.

### 3. Language Coaching (ILCA)

- Treat the learner as the expert on their own life
- Language learning = personal development, not information transfer
- The AI is a coach, not a teacher — it guides discovery, doesn't lecture
- Ask "what do you notice?" not "the rule is..."
- Every lesson connects to the learner's real life, interests, and goals

### 4. Spaced Repetition

- New chunks reviewed after 1 day, 3 days, 7 days, 14 days, 30 days (SM-2 schedule)
- Tree health decay is the game manifestation of SRS — if you don't review, your tree wilts
- Refresher lessons are generated from due-for-review chunks
- Gift buffers extend the grace period but don't replace the need to review

---

## Teach-First 5-Step Progression

Every chunk in a lesson follows this sequence. Steps are NEVER skipped or reordered.

| Step | Type | What Happens | SunDrops |
|------|------|-------------|----------|
| 1. INTRODUCE | INFO | Show chunk + translation + audio. No question. | 0 |
| 2. RECOGNIZE | MULTIPLE_CHOICE | "What does [chunk] mean?" — recognition, not recall | 1 |
| 3. PRACTICE | FILL_BLANK | Complete the sentence frame with the right word | 2 |
| 4. RECALL | TRANSLATE | Translate from native → target language | 3 |
| 5. APPLY | MULTIPLE_CHOICE | "When would you say [chunk]?" — contextual usage | 2 |

Total per chunk: 8 SunDrops maximum. A lesson with 3 chunks = 24 max SunDrops.

---

## Red Flags (Things the AI Must NEVER Do)

- Teach isolated words without context
- Test vocabulary before introducing it
- Use grammar metalanguage with 7-10 year olds ("conjugation", "dative case")
- Produce chunks in the wrong language
- Generate distractors in the target language (always native language)
- Produce 3 unrelated phrases instead of a chunk family
- Say "Wrong!" — always "Not quite!", "Almost!", "Close!"
- Overwhelm with too many new concepts per lesson (max 3 chunks)
- Ignore the learner's interests or personal context
- Make the learner feel stupid, anxious, or bored

---

## Activity Types (6 total)

| Type | Key | Description |
|------|-----|-------------|
| Multiple Choice | `MULTIPLE_CHOICE` | 4 options, 1 correct. Used for RECOGNIZE and APPLY steps. |
| Fill in the Blank | `FILL_BLANK` | Sentence with ___ blank. Used for PRACTICE step. |
| Translate | `TRANSLATE` | Free-text translation. Fuzzy matching. Used for RECALL step. |
| True/False | `TRUE_FALSE` | Statement about a chunk — is it true? Bonus variety. |
| Word Arrange | `WORD_ARRANGE` | Scrambled words to arrange into correct sentence. |
| Matching | `MATCHING` | 4 pairs (target ↔ native). Connect them. |

**Phase 3 addition:**
| Coaching Chat | `COACHING_CHAT` | NPC introduces chunk warmly. Discovery question. Not graded. |

---

## Language Codes — Single Source of Truth

```typescript
const LANGUAGE_MAP: Record<string, { code: string; name: string; ttsCode: string }> = {
  french:  { code: 'fr', name: 'French',  ttsCode: 'fr-FR' },
  english: { code: 'en', name: 'English', ttsCode: 'en-GB' },
  german:  { code: 'de', name: 'German',  ttsCode: 'de-DE' },
};
```

**NEVER** use `.substring(0, 2)` for language code conversion. ALWAYS import from the language utility module.
