# Task 3.2: Chunk Family Prompt Architecture

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** Task 3.1 (AI Model Comparison — winning model selected)  
**Estimated Time:** 6–8 hours  
**Priority:** CRITICAL — highest-impact single change in Phase 3

---

## Objective

Rewrite the AI prompt in `generateChunksForTopic()` so it produces **coherent chunk families** — a single sentence frame explored through personally relevant variations — instead of random unrelated phrases on a vague topic.

This is the change that makes "Introduce Yourself" generate:
```
Frame: "Ich bin ___" (I am ___)
  → "Ich bin Max" (I am Max) — their actual name
  → "Ich bin zwölf" (I am twelve) — their actual age
  → "Ich bin aus Frankreich" (I am from France) — their actual country
```

Instead of the current:
```
  → "Hallo Freunde" (Hello friends)
  → "Hallo, wie geht's?" (Hello, how are you?)
  → "Hallo, schön dich kennenzulernen" (Hello, nice to meet you)
```

---

## Why Chunk Families

From PEDAGOGY.md — Lewis's Lexical Approach:

> "Sentence Frames and Heads — Semi-fixed patterns with variable slots.  
> Examples: *The thing is...*, *If I were you, I'd...*, *It's not as __ as you think*  
> Teaching: Present the frame, then let learners fill slots with personal content."

And from the Red Flags section:

> 🚩 **One-size-fits-all content**  
> - Don't: Same examples for everyone  
> - Do: Use their interests, adjust for their level

A chunk family is *one frame, explored deeply*. The learner sees the pattern repeat with different slot fillers. Their brain notices "oh, 'Ich bin' stays the same — the part after it changes." That's the Observe-Hypothesise-Experiment cycle happening naturally, without a grammar lecture.

---

## Changes

### File 1: `src/services/aiPedagogyClient.ts` — Prompt Rewrite

**Replace** the system prompt and user prompt in `generateChunksForTopic()`.

#### New System Prompt

```typescript
private buildChunkFamilySystemPrompt(params: {
  targetLanguageName: string;
  nativeLanguageName: string;
  ageGroup: '7-10' | '11-14' | '15-18';
}): string {
  return `You are a specialist language content designer for children's education.
You create CHUNK FAMILIES — one core sentence frame explored through natural variations.

## What is a Chunk Family?

A chunk family is a reusable sentence pattern (the "frame") with 3 variations that
fill the frame's variable slot(s) with different, personally relevant content.

GOOD chunk family for "Introduce Yourself":
  Frame: "Ich heiße ___" (My name is ___)
  1. "Ich heiße Max" (My name is Max)
  2. "Ich heiße Luna" (My name is Luna) — their pet's name, playful
  3. "Ich heiße Professor Keks" (My name is Professor Cookie) — silly, for fun

The learner sees the PATTERN: "Ich heiße" stays constant, only the slot changes.
This is how native speakers actually learn — by internalising frames.

BAD output (what we must NEVER produce):
  1. "Hallo Freunde" (Hello friends)
  2. "Wie geht's?" (How are you?)
  3. "Schön dich kennenzulernen" (Nice to meet you)

These are three UNRELATED phrases. They share a vague theme but no structural pattern.
A learner cannot extract a reusable frame from them.

## Rules

1. Generate exactly ONE core frame and exactly 3 variations
2. The frame must have at least one variable slot marked with ___
3. All 3 variations must use the SAME frame with DIFFERENT slot fillers
4. The target language is ${params.targetLanguageName}
5. All translations, distractors, explanations, and usage notes are in ${params.nativeLanguageName}
6. Distractors are ALWAYS in ${params.nativeLanguageName} (the native language, NEVER the target language)
7. Content must be appropriate for ${params.ageGroup} year olds
8. If personal context is provided, at least 1 variation must reference it
9. Usage contexts must describe WHEN/WHERE you'd use this frame (not just rephrase it)
10. Keep explanations warm and encouraging — you're helping a child discover language

## Frame Selection Guidance

Choose frames that are:
- HIGH FREQUENCY — things people actually say daily
- GENERATIVE — the frame works with many different slot fillers
- COMMUNICATIVE — the frame lets the learner DO something (greet, ask, express)
- APPROPRIATE — no slang, idioms, or culturally sensitive content for children

## Output Format

Respond with ONLY valid JSON. No markdown fences. No preamble. No trailing text.`;
}
```

#### New User Prompt

```typescript
private buildChunkFamilyUserPrompt(params: {
  topic: string;
  targetLanguageName: string;
  nativeLanguageName: string;
  chunkCount: number;
  interests: string[];
  personalContext?: string;
  existingChunks?: string[];
}): string {
  const interestStr = params.interests.length > 0
    ? `Learner's interests: ${params.interests.join(', ')}`
    : 'No specific interests known.';

  const personalStr = params.personalContext
    ? `\nPersonal context from the learner: "${params.personalContext}"\nUse this to make at least 1 variation personally relevant.`
    : '\nNo personal context available. Use general, fun examples.';

  const avoidStr = params.existingChunks && params.existingChunks.length > 0
    ? `\nAVOID these frames (already taught): ${params.existingChunks.join(', ')}`
    : '';

  return `Create a chunk family for a ${params.targetLanguageName} lesson about: "${params.topic}"

${interestStr}${personalStr}${avoidStr}

Generate this JSON:
{
  "coreFrame": "The sentence frame in ${params.targetLanguageName} with ___ for variable slots",
  "coreFrameTranslation": "The frame translated to ${params.nativeLanguageName}",
  "title": "A fun, specific lesson title (not generic)",
  "chunks": [
    {
      "targetPhrase": "Full phrase in ${params.targetLanguageName} (frame with slot filled)",
      "nativeTranslation": "Translation in ${params.nativeLanguageName}",
      "exampleSentence": "A natural sentence using this phrase in ${params.targetLanguageName}",
      "usageNote": "When/where to use this, in ${params.nativeLanguageName}",
      "explanation": "Child-friendly explanation in ${params.nativeLanguageName}",
      "distractors": [
        "Wrong translation 1 in ${params.nativeLanguageName}",
        "Wrong translation 2 in ${params.nativeLanguageName}",
        "Wrong translation 3 in ${params.nativeLanguageName}"
      ],
      "correctUsageContext": "The right situation for this phrase, in ${params.nativeLanguageName}",
      "wrongUsageContexts": [
        "Wrong situation 1 in ${params.nativeLanguageName}",
        "Wrong situation 2 in ${params.nativeLanguageName}",
        "Wrong situation 3 in ${params.nativeLanguageName}"
      ]
    }
  ]
}

Generate exactly ${params.chunkCount} chunks (variations of the same frame).`;
}
```

### File 2: `src/services/lessonAssembler.ts` — Updated Types

**Add** the new fields to `AILessonContent`:

```typescript
export interface AILessonContent {
  /** Lesson display title */
  title: string;

  /** Target language ISO code */
  targetLanguageCode: string;

  /** Native language ISO code */
  nativeLanguageCode: string;

  /** The chunks to teach (variations of the core frame) */
  chunks: GeneratedChunkContent[];

  /** Learner interests used for personalising tutor text */
  interests?: string[];

  // === NEW Phase 3 fields ===

  /** The core sentence frame in the target language, e.g. "Ich bin ___" */
  coreFrame?: string;

  /** The core frame translated to native language, e.g. "I am ___" */
  coreFrameTranslation?: string;

  /** Personal context gathered from pre-lesson chat (Task 3.3) */
  personalContext?: string;
}
```

The `GeneratedChunkContent` interface does NOT change. Chunks are still individual phrase/translation/distractor tuples — the assembler still builds activities from them identically. The only difference is that the chunks now *happen to be* related variations of the same frame.

### File 3: `src/services/lessonGeneratorV2.ts` — Accept Personal Context

**Modify** the `generateLesson()` method to accept and pass personal context:

```typescript
// In the LessonRequest interface (or wherever it's defined):
interface LessonRequest {
  // ... existing fields
  personalContext?: string;  // NEW: from pre-lesson chat
}

// In generateLesson():
const aiContent = await aiPedagogyClient.generateChunksForTopic({
  topic,
  targetLanguageCode: targetLangCode,
  nativeLanguageCode: nativeLangCode,
  targetLanguageName: targetLangName,
  nativeLanguageName: nativeLangName,
  chunkCount: Math.min(4, Math.max(2, sessionPlan.targetChunks.length || 3)),
  ageGroup: getAgeGroup(profile.ageGroup),
  interests: profile.interests || [],
  existingChunks: sessionPlan.contextChunks?.map(c => c.text) || [],
  personalContext: request.personalContext,  // NEW
});
```

### File 4: `src/services/aiPedagogyClient.ts` — Update generateChunksForTopic

**Replace** the existing system prompt and user prompt construction in `generateChunksForTopic()` with the new methods above.

**Add** parsing for the new `coreFrame` and `coreFrameTranslation` fields:

```typescript
// In the response parsing section of generateChunksForTopic():
const parsed = JSON.parse(extractJSON(response.text));

return {
  title: parsed.title || `${params.topic} Lesson`,
  targetLanguageCode: params.targetLanguageCode,
  nativeLanguageCode: params.nativeLanguageCode,
  coreFrame: parsed.coreFrame || undefined,
  coreFrameTranslation: parsed.coreFrameTranslation || undefined,
  personalContext: params.personalContext || undefined,
  interests: params.interests || [],
  chunks: (parsed.chunks || []).map((c: any) => this.validateChunk(c)),
};
```

---

## Validation Additions

Add a check to `lessonValidator.ts` to verify chunk coherence (soft warning, not hard fail):

```typescript
/**
 * Check whether chunks appear to be from the same family.
 * This is a heuristic — it checks if chunks share common words.
 * A warning is logged if chunks appear unrelated.
 */
function checkChunkCoherence(chunks: GeneratedChunkContent[]): string[] {
  const warnings: string[] = [];

  if (chunks.length < 2) return warnings;

  // Tokenise each chunk's target phrase
  const tokenSets = chunks.map(c =>
    new Set(c.targetPhrase.toLowerCase().split(/\s+/))
  );

  // Check pairwise overlap
  for (let i = 1; i < tokenSets.length; i++) {
    const overlap = [...tokenSets[0]].filter(t => tokenSets[i].has(t));
    if (overlap.length === 0) {
      warnings.push(
        `Chunk coherence warning: "${chunks[0].targetPhrase}" and ` +
        `"${chunks[i].targetPhrase}" share no words — may not be from the same family`
      );
    }
  }

  return warnings;
}
```

---

## Expected Output Examples

### Example 1: "Introduce Yourself" + interests: [animals] + context: "I have a cat named Luna"

```json
{
  "coreFrame": "Ich habe ___",
  "coreFrameTranslation": "I have ___",
  "title": "Talking About What You Have 🐱",
  "chunks": [
    {
      "targetPhrase": "Ich habe eine Katze",
      "nativeTranslation": "I have a cat",
      "exampleSentence": "Ich habe eine Katze. Sie heißt Luna!",
      "usageNote": "Use this to tell someone about your pet or something you own",
      "explanation": "This is how you tell someone about things you have. 'Ich habe' means 'I have' and you can put anything after it!",
      "distractors": ["I have a dog", "I want a cat", "I am a cat"],
      "correctUsageContext": "Telling a new friend about your pet at school",
      "wrongUsageContexts": ["Ordering food at a restaurant", "Asking for directions", "Saying goodbye"]
    },
    {
      "targetPhrase": "Ich habe einen Bruder",
      "nativeTranslation": "I have a brother",
      "exampleSentence": "Ich habe einen Bruder. Er ist zehn Jahre alt.",
      "usageNote": "Use this to tell someone about your family",
      "explanation": "'Ich habe' again — see how it stays the same? Just change what comes after it to talk about different things you have!",
      "distractors": ["I have a sister", "I am a brother", "I want a brother"],
      "correctUsageContext": "Introducing your family to someone new",
      "wrongUsageContexts": ["Asking someone their name", "Buying something at a shop", "Talking about the weather"]
    },
    {
      "targetPhrase": "Ich habe Hunger",
      "nativeTranslation": "I am hungry (literally: I have hunger)",
      "exampleSentence": "Ich habe Hunger. Können wir essen?",
      "usageNote": "In German, you 'have' hunger instead of 'being' hungry — it's a fun difference!",
      "explanation": "Here's a surprise — Germans say 'I have hunger' instead of 'I am hungry'. Same 'Ich habe' pattern, different meaning!",
      "distractors": ["I am thirsty", "I am tired", "I want to eat"],
      "correctUsageContext": "Telling your host family you'd like something to eat",
      "wrongUsageContexts": ["Greeting someone in the morning", "Asking what time it is", "Saying thank you"]
    }
  ]
}
```

### Example 2: "At the Restaurant" + interests: [cooking] + context: "I want to try pizza"

```json
{
  "coreFrame": "Ich möchte ___, bitte",
  "coreFrameTranslation": "I would like ___, please",
  "title": "Ordering at a Restaurant 🍕",
  "chunks": [
    {
      "targetPhrase": "Ich möchte eine Pizza, bitte",
      "nativeTranslation": "I would like a pizza, please",
      ...
    },
    {
      "targetPhrase": "Ich möchte ein Wasser, bitte",
      "nativeTranslation": "I would like a water, please",
      ...
    },
    {
      "targetPhrase": "Ich möchte die Rechnung, bitte",
      "nativeTranslation": "I would like the bill, please",
      ...
    }
  ]
}
```

Notice: same frame ("Ich möchte ___, bitte"), three practical variations, one references the personal context.

---

## Acceptance Criteria

- [ ] `generateChunksForTopic()` uses the new chunk family prompt
- [ ] Generated chunks share a common frame (not random phrases)
- [ ] Personal context (when provided) appears in at least 1 chunk variation
- [ ] Interests influence the theme/frame selection
- [ ] `coreFrame` and `coreFrameTranslation` are populated in `AILessonContent`
- [ ] Chunks are in the correct target language
- [ ] Distractors are in the correct native language
- [ ] `lessonValidator` logs coherence warnings for suspicious output
- [ ] Existing fallback lesson path still works if AI fails

---

## Test Commands

```bash
# TypeScript compiles
npx tsc --noEmit

# Generate a test lesson and inspect output
npx tsx -e "
  const { aiPedagogyClient } = require('./src/services/aiPedagogyClient');
  const client = new AIPedagogyClient();
  client.generateChunksForTopic({
    topic: 'Introduce Yourself',
    targetLanguageCode: 'de',
    nativeLanguageCode: 'en',
    targetLanguageName: 'German',
    nativeLanguageName: 'English',
    chunkCount: 3,
    ageGroup: '11-14',
    interests: ['animals', 'football'],
    personalContext: 'I have a cat named Luna and I play football on Saturdays',
  }).then(chunks => console.log(JSON.stringify(chunks, null, 2)));
"

# Verify chunk coherence (manual check):
# - Do all chunks share common words?
# - Does at least one reference Luna or football?
# - Are distractors in English (not German)?
```

---

## What This Does NOT Change

- The `lessonAssembler.ts` assembly logic — chunks are still assembled into 5-step teach-first sequences identically
- The activity components — MultipleChoice, FillBlank, etc. receive the same `ActivityConfig` as before
- The quiz step structure — still deterministic, still validated
- The SRS system — chunk progress tracking is unchanged
- The skill path — lessons are still triggered from path nodes

The ONLY change is *what content the AI generates*. The delivery pipeline is untouched.
