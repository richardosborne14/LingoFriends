# Phase 2: Lesson Engine

**Status:** 🔲 Not started
**Estimated Time:** 16–22 hours
**Dependencies:** Phase 1 complete
**Output:** Lessons generate correctly via AI → Assembler → Validator pipeline with all activity types

---

## Task 2.1: AI Provider Layer (3h)

### What to Do

Create the AI provider abstraction in `src/lib/server/ai/`:

1. **`types.ts`** — Provider interface (from `03-AI-STRATEGY.md`):
   - `AIMessage`, `AICompletionOptions`, `AICompletionResult`, `AIProvider` interface

2. **`haiku.ts`** — Anthropic Haiku 4.5 implementation:
   - Uses `@anthropic-ai/sdk`
   - Model: `claude-haiku-4-5-20251001`
   - Handles JSON mode via system prompt instruction (Anthropic doesn't have native JSON mode)
   - Includes retry logic (1 retry on timeout)
   - Measures latency

3. **`groq.ts`** — Groq Llama 3.3 70B implementation:
   - Uses OpenAI-compatible API at `https://api.groq.com/openai/v1`
   - Model: `llama-3.3-70b-versatile`
   - Has native JSON mode (`response_format: { type: "json_object" }`)
   - Measures latency

4. **`router.ts`** — Model router:
   ```typescript
   export function getSmartModel(): AIProvider { return new HaikuProvider(); }
   export function getFastModel(): AIProvider { return new GroqProvider(); }
   ```

5. **`utils.ts`** — JSON extraction helper:
   ```typescript
   export function extractJSON(text: string): string {
     // Strip markdown fences if present
     const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
     if (fenceMatch) return fenceMatch[1].trim();
     // Try to find JSON object/array
     const jsonMatch = text.match(/\{[\s\S]*\}/);
     if (jsonMatch) return jsonMatch[0];
     return text.trim();
   }
   ```

### Acceptance Criteria
- [ ] Haiku provider sends messages and returns responses
- [ ] Groq provider sends messages and returns responses
- [ ] Both providers measure and return latency
- [ ] JSON extraction handles markdown fences
- [ ] Router returns correct provider for smart/fast
- [ ] API keys are server-side only (not in client bundle)

---

## Task 2.2: Chunk Family Generator (4h)

### What to Do

Create `src/lib/server/lessons/chunkGenerator.ts`:

This is the core AI call that produces pedagogically correct chunk families.

**Implement the prompt design from `03-AI-STRATEGY.md`:**

1. `buildSystemPrompt(params)` — The chunk family system prompt
2. `buildUserPrompt(params)` — Topic, interests, personal context, existing chunks to avoid
3. `generateChunkFamily(params): Promise<ChunkFamilyContent>` — Main function

**Parameters:**
```typescript
interface ChunkGenerationParams {
  topic: string;                    // e.g., "introduce-name"
  targetLanguage: LanguageCode;     // 'de'
  nativeLanguage: LanguageCode;     // 'fr'
  ageGroup: '7-10' | '11-14' | '15-18';
  interests: string[];              // ['football', 'gaming']
  personalContext?: string;         // "I played football today"
  existingChunks?: string[];        // Chunks to avoid duplicating
}
```

**Output type:**
```typescript
interface ChunkFamilyContent {
  coreFrame: string;              // "Ich heiße ___"
  coreFrameTranslation: string;   // "My name is ___"
  title: string;                  // "Saying Your Name"
  chunks: GeneratedChunk[];
}

interface GeneratedChunk {
  targetPhrase: string;           // "Ich heiße Max"
  nativeTranslation: string;      // "My name is Max"
  exampleSentence: string;        // "Hallo! Ich heiße Max."
  usageNote: string;              // "Most common way to introduce yourself"
  explanation: string;            // Warm coaching explanation
  distractors: string[];          // ["I am hungry", "Good morning", "I like football"]
  correctUsageContext: string;    // "Meeting someone new"
  wrongUsageContexts: string[];   // ["Ordering food", "Saying goodbye", ...]
  coachingText: string;           // NPC coaching monologue
}
```

**Validation after AI response:**
```typescript
function validateChunkFamily(raw: unknown): ChunkFamilyContent {
  // 1. Parse JSON (use extractJSON helper)
  // 2. Verify coreFrame exists and contains ___
  // 3. Verify exactly 3 chunks
  // 4. Verify each chunk has all required fields
  // 5. Verify distractors array has 3 items
  // 6. Verify wrongUsageContexts has 3 items
  // 7. If personalContext was provided, warn if no chunk references it
  // 8. Return validated object or throw with specific error
}
```

### Acceptance Criteria
- [ ] `generateChunkFamily()` produces valid JSON from Haiku
- [ ] Core frame contains at least one ___
- [ ] All 3 chunks use the same frame pattern
- [ ] Distractors are in the native language
- [ ] Personal context is reflected in at least 1 chunk (when provided)
- [ ] Invalid AI responses are caught and retried
- [ ] Error messages identify exactly what's wrong

---

## Task 2.3: Lesson Assembler (3h)

### What to Do

Create `src/lib/server/lessons/lessonAssembler.ts`:

This is DETERMINISTIC TypeScript — NO AI calls. It takes chunk content and builds a structured LessonPlan.

**Core types:**
```typescript
// src/lib/types/lesson.ts

export enum ActivityType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  MATCHING = 'matching',
  TRANSLATE = 'translate',
  TRUE_FALSE = 'true_false',
  WORD_ARRANGE = 'word_arrange',
  INFO = 'info',
  COACHING_CHAT = 'coaching_chat',
}

export interface ActivityConfig {
  type: ActivityType;
  // Fields vary by type — see per-type interfaces below
  [key: string]: unknown;
}

export interface LessonStep {
  id: string;
  tutorText: string;       // Brief encouragement text
  helpText: string;        // Help text for "Ask for help" button
  activity: ActivityConfig;
  sunDrops: number;
}

export interface LessonPlan {
  id: string;
  title: string;
  icon: string;
  coreFrame?: string;
  coreFrameTranslation?: string;
  steps: LessonStep[];
  totalSunDrops: number;
  chunkCount: number;
}
```

**Assembly logic — teach-first for each chunk:**

```typescript
export function assembleLessonPlan(
  content: ChunkFamilyContent,
  lessonId: string,
): LessonPlan {
  const steps: LessonStep[] = [];

  // Optional: Coaching chat step first (introduces the core frame)
  if (content.chunks[0]?.coachingText) {
    steps.push(buildCoachingStep(content));
  }

  // For each chunk, apply the 5-step teach-first progression
  for (const chunk of content.chunks) {
    steps.push(buildIntroduceStep(chunk));    // INFO — 0 SunDrops
    steps.push(buildRecognizeStep(chunk));     // MULTIPLE_CHOICE — 1 SunDrop
    steps.push(buildPracticeStep(chunk));      // FILL_BLANK — 2 SunDrops
    steps.push(buildRecallStep(chunk));        // TRANSLATE — 3 SunDrops
    steps.push(buildApplyStep(chunk));         // MULTIPLE_CHOICE — 2 SunDrops
  }

  // Final: Matching activity with all chunks (bonus round)
  if (content.chunks.length >= 3) {
    steps.push(buildMatchingStep(content.chunks)); // MATCHING — 3 SunDrops
  }

  return {
    id: lessonId,
    title: content.title,
    icon: '📖',
    coreFrame: content.coreFrame,
    coreFrameTranslation: content.coreFrameTranslation,
    steps,
    totalSunDrops: steps.reduce((sum, s) => sum + s.sunDrops, 0),
    chunkCount: content.chunks.length,
  };
}
```

**Per-step builders (implement all of these):**

| Builder | Activity Type | Key Fields |
|---------|---------------|------------|
| `buildCoachingStep` | COACHING_CHAT | coachingText, targetPhrase, discoveryQuestion, discoveryOptions |
| `buildIntroduceStep` | INFO | targetPhrase, nativeTranslation, explanation |
| `buildRecognizeStep` | MULTIPLE_CHOICE | question: "What does [phrase] mean?", options: [translation + distractors], correctIndex |
| `buildPracticeStep` | FILL_BLANK | sentence: core frame with ___, correctAnswer: the slot filler |
| `buildRecallStep` | TRANSLATE | sourcePhrase (native), correctAnswer (target), acceptedAnswers |
| `buildApplyStep` | MULTIPLE_CHOICE | question: "When would you say [phrase]?", options: [correct context + wrong contexts] |
| `buildMatchingStep` | MATCHING | pairs: [{left: target, right: native}] for all chunks |

**Randomisation:**
- Shuffle multiple choice option order (but track correctIndex)
- Shuffle matching pair display order
- For fill_blank, extract the variable part of the frame as the blank

### Acceptance Criteria
- [ ] assembleLessonPlan produces a valid LessonPlan from ChunkFamilyContent
- [ ] Each chunk generates exactly 5 steps (INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY)
- [ ] Optional coaching chat step at the beginning
- [ ] Matching step at the end with all chunks
- [ ] SunDrop totals are correct (0+1+2+3+2 = 8 per chunk + 3 for matching)
- [ ] Multiple choice options are shuffled
- [ ] No AI calls anywhere in this file

---

## Task 2.4: Lesson Validator (2h)

### What to Do

Create `src/lib/server/lessons/lessonValidator.ts`:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];   // Hard errors — lesson cannot render
  warnings: string[]; // Soft warnings — lesson works but quality concern
}

export function validateLessonPlan(plan: LessonPlan): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Plan-level checks
  if (!plan.id) errors.push('Missing lesson ID');
  if (!plan.title) errors.push('Missing lesson title');
  if (plan.steps.length === 0) errors.push('No steps in lesson');
  if (plan.steps.length < 5) warnings.push(`Only ${plan.steps.length} steps — expected 15+`);

  // 2. Teach-before-test enforcement
  const introducedPhrases = new Set<string>();
  for (const step of plan.steps) {
    if (step.activity.type === ActivityType.INFO) {
      introducedPhrases.add(normalise(step.activity.targetPhrase));
    }
    if (isQuizActivity(step.activity)) {
      const testedPhrase = extractTestedPhrase(step.activity);
      if (testedPhrase && !introducedPhrases.has(normalise(testedPhrase))) {
        errors.push(`Quiz tests "${testedPhrase}" but it was never introduced`);
      }
    }
  }

  // 3. Per-step field validation
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepErrors = validateActivityConfig(step.activity, i);
    errors.push(...stepErrors);
  }

  // 4. SunDrop total check
  const calculatedTotal = plan.steps.reduce((sum, s) => sum + s.sunDrops, 0);
  if (calculatedTotal !== plan.totalSunDrops) {
    errors.push(`SunDrop total mismatch: header says ${plan.totalSunDrops}, steps sum to ${calculatedTotal}`);
  }

  // 5. Chunk coherence check (warning only)
  // Check if chunks share common words (heuristic for chunk family)

  return { valid: errors.length === 0, errors, warnings };
}
```

**Per-activity-type validation (implement for all 8 types):**

| Type | Required Fields | Validation |
|------|----------------|------------|
| INFO | targetPhrase, nativeTranslation | Both non-empty strings |
| MULTIPLE_CHOICE | question, options, correctIndex | options.length >= 2, correctIndex in range |
| FILL_BLANK | sentence, correctAnswer | sentence contains ___ |
| TRANSLATE | sourcePhrase, correctAnswer | Both non-empty |
| TRUE_FALSE | question, isTrue | isTrue is boolean |
| WORD_ARRANGE | targetSentence, scrambledWords | scrambledWords contains all words |
| MATCHING | pairs | pairs.length >= 2, each has left+right |
| COACHING_CHAT | coachingText, discoveryQuestion | Both non-empty |

### Acceptance Criteria
- [ ] Valid lessons pass with no errors
- [ ] Missing fields produce specific error messages
- [ ] Teach-before-test violation is caught
- [ ] SunDrop mismatch is caught
- [ ] Validator NEVER calls AI
- [ ] Function is pure (no side effects)

---

## Task 2.5: Lesson Generation API (2h)

### What to Do

Create the server-side endpoint that orchestrates the full pipeline:

**Route:** `src/routes/api/lessons/generate/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { treeId, lessonIndex, personalContext } = body;

  // 1. Load user profile + learner profile
  const profile = await getProfile(locals.user.id);
  const learnerProfile = await getLearnerProfile(locals.user.id);

  // 2. Load skill path and lesson definition
  const tree = await getTree(treeId);
  const skillPath = await getSkillPath(tree.skillPathId);
  const lessonDef = skillPath.lessonDefinitions[lessonIndex];

  // 3. Get existing chunks to avoid duplicates
  const existingChunks = await getUserChunks(locals.user.id, lessonDef.topic);

  // 4. Generate chunk family (Haiku 4.5)
  const chunkContent = await generateChunkFamily({
    topic: lessonDef.topic,
    targetLanguage: toLanguageCode(profile.targetLanguage),
    nativeLanguage: toLanguageCode(profile.nativeLanguage),
    ageGroup: profile.ageGroup,
    interests: profile.interests,
    personalContext,
    existingChunks: existingChunks.map(c => c.targetPhrase),
  });

  // 5. Assemble lesson plan (deterministic)
  const lessonPlan = assembleLessonPlan(chunkContent, nanoid());

  // 6. Validate
  const validation = validateLessonPlan(lessonPlan);
  if (!validation.valid) {
    console.error('Lesson validation failed:', validation.errors);
    // Retry once with fresh generation
    // If still fails, return error
    return json({ error: 'Lesson generation failed', details: validation.errors }, { status: 500 });
  }

  // 7. Pre-generate TTS audio for all target phrases
  const audioMap = await preGenerateAudio(
    chunkContent.chunks.map(c => ({
      text: c.targetPhrase,
      language: profile.targetLanguage,
    }))
  );

  // 8. Save chunks to chunk_library (dedup on save)
  await saveChunksToLibrary(locals.user.id, chunkContent);

  // 9. Return lesson plan + audio map
  return json({
    lesson: lessonPlan,
    audio: Object.fromEntries(audioMap),
    warnings: validation.warnings,
  });
};
```

### Acceptance Criteria
- [ ] POST `/api/lessons/generate` returns a valid lesson plan
- [ ] Unauthorized requests get 401
- [ ] Validation failures trigger one retry, then return 500 with details
- [ ] Chunks are saved to chunk_library
- [ ] Audio is pre-generated for all target phrases
- [ ] Response includes any validation warnings

---

## Task 2.6: Pre-Lesson Chat (2h)

### What to Do

Create `src/lib/server/lessons/preLessonChat.ts`:

A short conversational exchange to gather personal context before lesson generation.

**API route:** `src/routes/api/lessons/chat/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const { message, topic, history } = await request.json();

  const smartModel = getSmartModel();
  const profile = await getProfile(locals.user!.id);

  const response = await smartModel.complete({
    messages: [
      { role: 'system', content: buildPreLessonChatPrompt(topic, profile) },
      ...history,
      { role: 'user', content: message },
    ],
    temperature: 0.8,
    maxTokens: 300,
  });

  // Check if AI returned the readyToStart JSON
  try {
    const parsed = JSON.parse(extractJSON(response.text));
    if (parsed.readyToStart) {
      return json({
        type: 'ready',
        personalContext: parsed.personalContext || '',
      });
    }
  } catch {
    // Not JSON — it's a conversational response
  }

  return json({
    type: 'message',
    text: response.text,
  });
};
```

**Client-side component** (`src/lib/components/activities/PreLessonChat.svelte`):
- Chat bubble UI with AI messages and user input
- 2-3 exchange maximum
- "Skip — just start!" ghost button always visible
- On `readyToStart`, pass personalContext to lesson generation

### Acceptance Criteria
- [ ] Chat exchanges work (user types, AI responds)
- [ ] After 2-3 exchanges, AI returns personalContext
- [ ] Skip button immediately starts lesson with empty personalContext
- [ ] Chat uses native language only
- [ ] Age-appropriate tone (simple for 7-10, casual for 11-14, genuine for 15-18)

---

## Task 2.7: Lesson Completion API (2h)

### What to Do

**Route:** `src/routes/api/lessons/complete/+server.ts`

Called when a lesson finishes. Handles all reward calculations and profile updates.

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
  const { treeId, lessonIndex, results } = await request.json();
  // results: { sunDropsEarned, sunDropsMax, accuracy, timeSpentSeconds,
  //            activitiesCompleted, activitiesTotal, helpUsed, lessonData }

  const userId = locals.user!.id;

  // 1. Calculate stars
  const ratio = results.sunDropsEarned / results.sunDropsMax;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;

  // 2. Check daily cap (50 SunDrops/day)
  const today = await getDailyProgress(userId);
  const cappedSunDrops = Math.min(
    results.sunDropsEarned,
    Math.max(0, 50 - (today?.sunDropsEarned || 0))
  );

  // 3. Calculate gems: floor(accuracy * 100 / 20) with streak multiplier
  const profile = await getProfile(userId);
  const streakMultiplier = profile.currentStreak >= 14 ? 3 :
    profile.currentStreak >= 7 ? 2 : profile.currentStreak >= 3 ? 1.5 : 1;
  const gems = Math.floor((results.accuracy * 100 / 20) * streakMultiplier);

  // 4. Update tree
  await updateTree(treeId, {
    sunDropsEarned: sql`sun_drops_earned + ${cappedSunDrops}`,
    lessonsCompleted: sql`lessons_completed + 1`,
    lastRefreshDate: new Date(),
    health: 100, // Completing a lesson restores health
  });
  // Recalculate growth stage
  await recalculateGrowthStage(treeId);

  // 5. Update profile stats
  await updateProfile(userId, {
    totalSunDrops: sql`total_sun_drops + ${cappedSunDrops}`,
    lessonsCompleted: sql`lessons_completed + 1`,
  });

  // 6. Update streak
  await updateStreak(userId);

  // 7. Update daily progress
  await upsertDailyProgress(userId, {
    sunDropsEarned: cappedSunDrops,
    lessonsCompleted: 1,
    activitiesCompleted: results.activitiesCompleted,
    timeSpentSeconds: results.timeSpentSeconds,
    gemsEarned: gems,
  });

  // 8. Save lesson history
  await insertLessonHistory({
    userId, treeId, skillPathId: tree.skillPathId,
    lessonIndex, topic: lessonDef.topic,
    sunDropsEarned: cappedSunDrops, sunDropsMax: results.sunDropsMax,
    accuracy: results.accuracy, starsEarned: stars,
    timeSpentSeconds: results.timeSpentSeconds,
    activitiesCompleted: results.activitiesCompleted,
    activitiesTotal: results.activitiesTotal,
    helpUsed: results.helpUsed,
    lessonData: results.lessonData,
    personalContext: results.personalContext,
  });

  // 9. Update learner profile via AI (fire-and-forget)
  updateLearnerProfileAsync(userId, results).catch(console.error);

  // 10. Update chunk SRS metadata
  await updateChunkSRS(userId, results.lessonData);

  return json({
    sunDropsEarned: cappedSunDrops,
    sunDropsCapped: cappedSunDrops < results.sunDropsEarned,
    gems,
    stars,
    streakMultiplier,
    newStreak: profile.currentStreak,
    growthStage: await getTreeGrowthStage(treeId),
  });
};
```

### Acceptance Criteria
- [ ] SunDrops added to tree and profile
- [ ] Daily cap (50) enforced
- [ ] Stars calculated correctly (1/2/3)
- [ ] Gems calculated with streak multiplier
- [ ] Streak logic: consecutive days increment, gaps reset
- [ ] Tree health restored to 100 on lesson completion
- [ ] Growth stage recalculated
- [ ] Lesson history saved
- [ ] Chunk SRS metadata updated
- [ ] Learner profile update fires asynchronously
