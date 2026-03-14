# LingoFriends V2 — AI Strategy

**Last Updated:** March 2026

---

## Model Assignments

| Task | Model | Provider | Why |
|------|-------|----------|-----|
| Lesson planning & chunk family generation | **Haiku 4.5** | Anthropic API | Needs intelligence + creativity to produce coherent chunk families with genuine personalisation |
| Pre-lesson personalisation chat | **Haiku 4.5** | Anthropic API | Must extract personal context from natural child conversation |
| Learner profile updates | **Haiku 4.5** | Anthropic API | Needs judgment to identify learning patterns and update CEFR levels |
| Coaching text generation | **Haiku 4.5** | Anthropic API | Must write warm, age-appropriate coaching in native language with target language examples |
| Real-time lesson chat (help, encouragement) | **Llama 3.3 70B** | Groq API | Speed matters here — sub-second responses during active lessons |
| Activity validation / classification | **Llama 3.3 70B** | Groq API | Simple yes/no judgments where speed > intelligence |
| Free-text answer evaluation (15-18 age group) | **Llama 3.3 70B** | Groq API | Fast fuzzy matching for open translation responses |
| TTS (text-to-speech) | **Google Cloud TTS** | Google API | Excellent multilingual quality, good child voices |
| STT (speech-to-text) | **Whisper Large v3** | Groq API | Fast, accurate, handles children's voices well |

### Critical Rule: TTS Voice Language

**The TTS voice MUST always be set to the target language**, even when the text contains mixed-language content. A German voice reading French words produces better target language pronunciation while keeping native language words comprehensible with a charming accent. NEVER switch TTS voice to native language mid-lesson.

---

## Pipeline Architecture

### Lesson Generation Pipeline

```
User taps lesson node
        │
        ▼
┌─────────────────────┐
│  Pre-Lesson Chat     │  ← Haiku 4.5 (optional, skippable)
│  "Tell me about      │     Extracts personal context
│   your day!"         │     e.g. "I played football today"
└──────────┬──────────┘
           │ personalContext: "played football"
           ▼
┌─────────────────────┐
│  Chunk Family Gen    │  ← Haiku 4.5
│  generateChunkFamily │     Produces 1 core frame + 3 variations
│  (topic, context,    │     using learner interests + personal context
│   interests, level)  │
└──────────┬──────────┘
           │ ChunkFamilyContent (JSON)
           ▼
┌─────────────────────┐
│  Lesson Assembler    │  ← Deterministic TypeScript (NO AI)
│  assembleLessonPlan  │     Builds LessonPlan from chunks
│  ()                  │     Enforces teach-first 5-step progression
│                      │     Creates ActivityConfig for each step
└──────────┬──────────┘
           │ LessonPlan
           ▼
┌─────────────────────┐
│  Lesson Validator    │  ← Deterministic TypeScript (NO AI)
│  validateLessonPlan  │     Checks all fields present
│  ()                  │     Verifies teach-before-test order
│                      │     Validates language correctness
└──────────┬──────────┘
           │ Validated LessonPlan
           ▼
┌─────────────────────┐
│  TTS Pre-generation  │  ← Google Cloud TTS
│  preGenerateAudio    │     Generates audio for all target phrases
│  ()                  │     Caches in chunk_library table
└──────────┬──────────┘
           │ LessonPlan + AudioMap
           ▼
┌─────────────────────┐
│  Lesson UI Renders   │  ← SvelteKit components
└─────────────────────┘
```

### Key Invariant

**The AI generates CONTENT, not STRUCTURE.** Haiku 4.5 produces:
- Target language phrases (lexical chunks)
- Native language translations
- Example sentences
- Usage notes and explanations
- Plausible distractors (in NATIVE language)
- Usage contexts
- Coaching monologue text

The AI NEVER produces:
- ActivityConfig objects
- JSON field names matching component props
- LessonStep or LessonPlan structures
- SunDrop values

All structure is assembled by deterministic TypeScript code.

---

## Chunk Family Prompt Design

### System Prompt (Haiku 4.5)

```
You are a specialist language content designer for children's education.
You create CHUNK FAMILIES — one core sentence frame explored through natural variations.

A chunk family is a reusable sentence pattern (the "frame") with 3 variations that
fill the frame's variable slot(s) with different, personally relevant content.

GOOD chunk family for "Introduce Yourself":
  Frame: "Ich heiße ___" (My name is ___)
  1. "Ich heiße Max" (I am Max)
  2. "Ich heiße Luna" (I am Luna) — their pet's name, playful
  3. "Ich heiße Professor Keks" (I am Professor Cookie) — silly, for fun

BAD output (NEVER produce this):
  1. "Hallo Freunde" (Hello friends)
  2. "Wie geht's?" (How are you?)
  3. "Schön dich kennenzulernen" (Nice to meet you)
  These are unrelated phrases. A learner cannot extract a reusable frame.

Rules:
1. Generate exactly ONE core frame and exactly 3 variations
2. The frame must have at least one variable slot marked with ___
3. All 3 variations use the SAME frame with DIFFERENT slot fillers
4. All translations, distractors, explanations in the NATIVE language
5. Distractors are ALWAYS in the native language
6. If personal context is provided, at least 1 variation must reference it
7. Usage contexts describe WHEN/WHERE you'd use this frame
8. Keep explanations warm and encouraging
9. Choose frames that are HIGH FREQUENCY, GENERATIVE, and COMMUNICATIVE

Respond with ONLY valid JSON. No markdown fences. No preamble.
```

### Expected Output Schema

```json
{
  "coreFrame": "Ich heiße ___",
  "coreFrameTranslation": "My name is ___",
  "title": "Saying Your Name",
  "chunks": [
    {
      "targetPhrase": "Ich heiße Max",
      "nativeTranslation": "My name is Max",
      "exampleSentence": "Hallo! Ich heiße Max. Und du?",
      "usageNote": "This is the most common way to introduce yourself in German.",
      "explanation": "Say this when someone asks your name, or when you meet someone new.",
      "distractors": ["I am hungry", "I like football", "Good morning"],
      "correctUsageContext": "Meeting someone new at school",
      "wrongUsageContexts": ["Ordering food at a restaurant", "Saying goodbye to a friend", "Asking for directions"],
      "coachingText": "Hey! So in German, when you want to tell someone your name, you say 'Ich heiße' and then your name. 'Ich' means 'I', and 'heiße' is like 'am called'. So 'Ich heiße Max' means 'My name is Max'. Easy, right? Now let's see if you can spot it!"
    }
  ]
}
```

---

## Pre-Lesson Chat Prompt Design

### System Prompt (Haiku 4.5)

```
You are a friendly language learning coach for children aged {ageGroup}.
You're about to start a lesson on "{topic}" in {targetLanguage}.

Your job: Have a brief, warm chat (2-3 exchanges max) to gather personal
context that will make the lesson more relevant.

For ages 7-10: Ask ONE simple question. Use emoji. Keep it playful.
For ages 11-14: Ask about their day or interests. Be casual and fun.
For ages 15-18: Be conversational and genuine. Ask about their life.

You speak in {nativeLanguage} only (the learner hasn't learned the target
language yet for this topic).

After 2-3 exchanges, respond with a JSON object:
{
  "personalContext": "Brief summary of what you learned about the user",
  "readyToStart": true
}

If the user wants to skip, immediately return:
{
  "personalContext": "",
  "readyToStart": true
}
```

---

## Learner Profile Update Prompt

### System Prompt (Haiku 4.5)

Called after each lesson completion with lesson results.

```
You are an educational data analyst for a children's language learning app.

Given the lesson results below, update the learner profile. Be conservative —
don't make dramatic level changes from a single lesson. Look for patterns.

Current profile: {currentProfile}
Lesson results: {lessonResults}

Respond with ONLY a JSON object containing fields to update:
{
  "overallLevel": "A1",  // Only change if strong evidence across multiple lessons
  "strengths": ["vocabulary recall", "pattern recognition"],
  "weaknesses": ["spelling accuracy"],
  "knownFacts": [{ "fact": "New fact learned", "source": "lesson-chat", "date": "today" }],
  "notes": "Brief observation about learning pattern"
}

Only include fields that should change. Omit unchanged fields.
```

---

## Provider Abstraction

### Interface

```typescript
// src/lib/server/ai/types.ts

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AICompletionResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  latencyMs: number;
  provider: string;
  model: string;
}

export interface AIProvider {
  id: string;
  name: string;
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
}
```

### Implementations

```typescript
// src/lib/server/ai/haiku.ts — Smart model
export class HaikuProvider implements AIProvider {
  id = 'haiku-4.5';
  name = 'Anthropic Haiku 4.5';
  // Uses Anthropic Messages API
  // Model: 'claude-haiku-4-5-20251001'
}

// src/lib/server/ai/groq.ts — Fast model
export class GroqProvider implements AIProvider {
  id = 'groq-llama';
  name = 'Groq Llama 3.3 70B';
  // Uses OpenAI-compatible API at api.groq.com
  // Model: 'llama-3.3-70b-versatile'
}
```

### Router

```typescript
// src/lib/server/ai/router.ts
export function getSmartModel(): AIProvider {
  return new HaikuProvider();
}

export function getFastModel(): AIProvider {
  return new GroqProvider();
}
```

---

## Cost Estimates

| Operation | Model | Est. Tokens | Cost per Call | Calls per Lesson |
|-----------|-------|-------------|---------------|-----------------|
| Chunk family generation | Haiku 4.5 | ~800 in + 400 out | ~$0.001 | 1 |
| Pre-lesson chat (2-3 turns) | Haiku 4.5 | ~600 in + 200 out | ~$0.0008 | 1 |
| Coaching text (per chunk) | Haiku 4.5 | ~500 in + 300 out | ~$0.0008 | 3 |
| Profile update | Haiku 4.5 | ~1000 in + 200 out | ~$0.001 | 1 |
| Help response | Groq Llama | ~400 in + 100 out | free tier / ~$0.0003 | 0-3 |
| TTS (per phrase) | Google TTS | N/A | ~$0.004/1K chars | 3-6 |
| **Total per lesson** | | | **~$0.03–0.05** | |

At 10 lessons/day per active user, cost is roughly $0.30–0.50/user/month. Sustainable for a free app with moderate user base.

---

## Error Handling & Fallbacks

| Failure | Fallback |
|---------|----------|
| Haiku times out | Retry once, then fall back to Groq Llama with simplified prompt |
| Haiku returns invalid JSON | Strip markdown fences, attempt JSON extraction, retry if still invalid |
| Groq times out | Show cached response or generic encouragement |
| TTS fails | Skip audio, show text only (lesson still fully functional) |
| STT fails | Fall back to text input |
| Chunk family has < 3 chunks | Pad with generic examples using topic vocabulary |
| Pre-lesson chat fails | Skip directly to lesson generation with interests-only personalisation |
| Profile update fails | Log error, proceed without update (non-blocking) |
