# Task 1.2.8: AI Lesson Generator v2

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.5, 1.2.6, 1.2.7
**Estimated Time:** 6-8 hours

---

## Objective

Upgrade the lesson generator to use chunk-based content and all four pedagogical frameworks. Replace vocabulary arrays with LexicalChunk objects, add i+1 calibration, and integrate affective filter awareness.

---

## Deliverables

### Files to Create
- `src/services/lessonGeneratorV2.ts` — New chunk-based lesson generator
- `src/services/aiPedagogyClient.ts` — AI client with pedagogy context

### Files to Update
- `services/groqService.ts` — Add pedagogy-aware generation methods
- `services/systemPrompts.ts` — Add pedagogy-enhanced prompts

---

## Key Differences from Phase 1.1

| Aspect | Phase 1.1 | Phase 1.2 |
|--------|-----------|-----------|
| Content unit | `vocabulary: string[]` | `chunks: LexicalChunk[]` |
| Difficulty | Fixed (beginner/intermediate/advanced) | Dynamic i+1 |
| Context | None | Familiar chunks for scaffolding |
| Adaptation | None | Affective filter awareness |
| Pedagogy | Generic tutor | Full Lexical + Krashen + Coaching + SRS |

---

## Lesson Generation Interface

```typescript
// src/services/lessonGeneratorV2.ts

import type { LexicalChunk, LearnerProfile, GameActivityType } from '@/types/pedagogy';

interface LessonGenerationRequest {
  // Chunks to teach (from Pedagogy Engine)
  targetChunks: LexicalChunk[];      // New chunks at i+1
  reviewChunks: LexicalChunk[];      // Fragile chunks
  contextChunks: LexicalChunk[];     // Familiar chunks for context
  
  // Learner context
  learnerLevel: number;              // Current i level
  targetLevel: number;               // i+1 target
  interests: string[];               // From profile
  filterRiskScore: number;           // Affective filter risk
  
  // Activity constraints
  activityTypes: GameActivityType[];
  activityCount: number;             // How many activities to generate
  
  // Language
  targetLanguage: string;
  nativeLanguage: string;
}

interface GeneratedActivity {
  id: string;
  type: GameActivityType;
  chunkIds: string[];                // Chunks covered by this activity
  
  // Activity-specific data (structured for game components)
  data: {
    // For multiple choice
    question?: string;
    options?: string[];
    correctIndex?: number;
    
    // For fill blank
    template?: string;
    blank?: string;
    answer?: string;
    
    // For matching
    pairs?: Array<{ left: string; right: string }>;
    
    // For translate
    sourceText?: string;
    targetText?: string;
    
    // For word arrange
    words?: string[];
    correctOrder?: string;
  };
  
  // Metadata
  difficulty: number;
  focusChunk: string;                // Primary chunk being taught
}

interface GeneratedLesson {
  id: string;
  title: string;
  description: string;
  activities: GeneratedActivity[];
  
  // Tutor messages
  intro: string;                     // Opening message from Professor Finch
  transitions: string[];             // Between activities
  conclusion: string;                // End of lesson summary
  
  // Chunks covered
  newChunks: string[];               // IDs of newly introduced chunks
  reviewChunks: string[];            // IDs of reviewed chunks
}

export async function generateLesson(request: LessonGenerationRequest): Promise<GeneratedLesson> {
  // Build the prompt with pedagogy context
  const prompt = buildPedagogyPrompt(request);
  
  // Call AI
  const response = await aiPedagogyClient.generate(prompt);
  
  // Parse and validate
  return parseAndValidate(response, request);
}
```

---

## Pedagogy-Enhanced System Prompt

```typescript
// In services/systemPrompts.ts

export const PROFESSOR_FINCH_V2 = `
## Persona
You are Professor Finch, a warm, encouraging language coach who helps learners discover language naturally through meaningful chunks.

## Teaching Philosophy

### Lexical Approach (Michael Lewis)
- Always teach language in chunks, never as isolated words
- Focus on phrases learners can use immediately
- Highlight patterns within chunks, not grammar rules
- Use sentence frames to show flexibility: "I'd like ___" (a coffee, the salad, the check)

### Input Hypothesis (Stephen Krashen)
- Pitch content at i+1: just above current level
- Surround new chunks with familiar context (comprehensible input)
- Don't introduce too many new chunks at once (2-3 per activity)
- Focus on meaning over form

### Affective Filter
- Keep the emotional barrier LOW
- Celebrate every attempt
- Never make learners feel wrong
- If struggling, simplify; if excelling, challenge

### Language Coaching
- Help learners discover patterns themselves
- Ask reflective questions: "What do you notice about...?"
- Connect to their interests and goals
- Build confidence and autonomy

## Content Rules

1. **Chunks, not words**
   - "I would like a coffee" not "would" + "like" + "coffee"
   - Teach whole phrases with natural translations

2. **i+1 Calibration**
   - Target level: {targetLevel}
   - Introduce {newChunkCount} new chunks per activity
   - Surround with {contextChunkCount} familiar chunks

3. **Context First**
   - Present chunks in meaningful situations
   - Use scenarios related to learner's interests: {interests}
   - Connect to real-world use

4. **Activity Variety**
   - Multiple choice for recognition
   - Fill-blank for production
   - Matching for associations
   - Translation for transfer

## Response Format

Generate a JSON object with this structure:
{
  "title": "Lesson title",
  "description": "Brief description for learner",
  "intro": "Professor Finch's opening message",
  "activities": [...],
  "transitions": [...],
  "conclusion": "Summary and encouragement"
}

## Current Session Context
- Learner level: {currentLevel} (i) → {targetLevel} (i+1)
- Target chunks: {targetChunks}
- Review chunks: {reviewChunks}
- Context chunks: {contextChunks}
- Recent struggles: {strugglingChunks}
- Affective filter risk: {filterRiskScore}
- Interests: {interests}
`;
```

---

## Activity Generation Logic

```typescript
function generateActivityForChunk(
  chunk: LexicalChunk,
  type: GameActivityType,
  context: {
    nativeLanguage: string;
    learnerLevel: number;
    previousChunks: LexicalChunk[];
  }
): GeneratedActivity {
  switch (type) {
    case 'multiple_choice':
      return generateMultipleChoice(chunk, context);
    case 'fill_blank':
      return generateFillBlank(chunk, context);
    case 'matching':
      return generateMatching(chunk, context.previousChunks);
    case 'translate':
      return generateTranslate(chunk, context);
    case 'true_false':
      return generateTrueFalse(chunk, context);
    case 'word_arrange':
      return generateWordArrange(chunk, context);
    default:
      throw new Error(`Unknown activity type: ${type}`);
  }
}

function generateMultipleChoice(chunk: LexicalChunk, context: ActivityContext): GeneratedActivity {
  // For a chunk like "Je voudrais un café", create:
  // - Question: "You're at a café. How do you order a coffee?"
  // - Options: ["Je voudrais un café", "J'aime le café", "C'est un café", "Le café, s'il vous plaît"]
  // - Correct: 0
  
  return {
    id: generateId(),
    type: 'multiple_choice',
    chunkIds: [chunk.id],
    data: {
      question: generateQuestionForChunk(chunk, 'multiple_choice'),
      options: generateDistractors(chunk, context),
      correctIndex: 0,
    },
    difficulty: chunk.difficulty,
    focusChunk: chunk.id,
  };
}
```

---

## Integration with Pedagogy Engine

```typescript
// In pedagogyEngine.ts

async prepareSession(userId: string, options: SessionOptions): Promise<SessionPlan> {
  // Get learner profile
  const profile = await learnerProfileService.getProfile(userId);
  
  // Calculate i+1
  const currentLevel = getCurrentLevel(profile);
  const targetLevel = getTargetLevel(profile);
  
  // Select chunks
  const targetChunks = await selectChunksForLevel(userId, options.topic, 5);
  const reviewChunks = await chunkManager.getFragileChunks(userId, 3);
  const contextChunks = await getContextChunks(userId, options.topic, 10);
  
  // Generate lesson
  const lesson = await generateLesson({
    targetChunks,
    reviewChunks,
    contextChunks,
    learnerLevel: currentLevel,
    targetLevel,
    interests: profile.explicitInterests.concat(profile.detectedInterests.map(d => d.topic)),
    filterRiskScore: profile.filterRiskScore,
    activityTypes: options.activityTypes || DEFAULT_ACTIVITY_TYPES,
    activityCount: options.duration * 2, // ~2 activities per minute
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
  });
  
  return {
    sessionId: generateId(),
    topic: options.topic,
    targetChunks,
    reviewChunks,
    contextChunks,
    activities: lesson.activities,
    estimatedDuration: options.duration,
    difficulty: targetLevel,
  };
}
```

---

## Testing Checklist

- [ ] Lessons generate with chunk-based content
- [ ] i+1 difficulty is respected
- [ ] Review chunks are included
- [ ] Context chunks surround new content
- [ ] Activities are varied
- [ ] Tutor persona is consistent
- [ ] Filter risk affects generation

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Chunks used instead of vocabulary | [ ] |
| i+1 calibration works | [ ] |
| All four pedagogies integrated | [ ] |
| AI prompts are well-structured | [ ] |
| Generated activities are valid | [ ] |

---

## Reference
- **PEDAGOGY.md** — Full pedagogical foundation
- **docs/phase-1.1/task-1-1-9-ai-lesson-generator.md** — Phase 1.1 generator
- **docs/phase-1.2/phase-1.2-overview.md** — Architecture