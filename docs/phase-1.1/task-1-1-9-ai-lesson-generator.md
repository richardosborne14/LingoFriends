# Task 1.1.9: AI Lesson Generator

**Status:** Not Started
**Phase:** B (Growth & Decay)
**Dependencies:** Task 1.1.1 (Type Definitions)
**Estimated Time:** 4-5 hours

---

## Objective

Create the AI lesson generation service that produces structured lessons with activities. This service uses Groq (Llama 3.3) to generate age-appropriate language learning content based on skill path and lesson context.

---

## Deliverables

### Files to Create
- `src/services/lessonGenerator.ts` — Main lesson generation service
- `src/services/lessonPrompts.ts` — AI prompts for lesson generation

### Files to Modify
- `services/groqService.ts` — Add structured output support

---

## Lesson Generation Flow

```
┌─────────────────┐
│  Lesson Request │
│  - skillPathId  │
│  - lessonIndex  │
│  - language     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load Context   │
│  - Vocabulary   │
│  - Difficulty   │
│  - User level   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Prompt   │
│  - System prompt│
│  - User prompt  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Call Groq API  │
│  - Llama 3.3    │
│  - JSON output  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate JSON  │
│  - Schema check │
│  - Content check│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return Lesson  │
│  - LessonPlan   │
└─────────────────┘
```

---

## Lesson Generator Service

### Interface

```typescript
// src/services/lessonGenerator.ts

import type { LessonPlan, LessonStep, ActivityConfig, ActivityType } from '@/types/game';

interface LessonRequest {
  skillPathId: string;
  lessonId: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  vocabulary: string[];
  previousLessons: string[];
}

interface LessonGeneratorService {
  generateLesson(request: LessonRequest): Promise<LessonPlan>;
  validateLessonPlan(plan: unknown): plan is LessonPlan;
}
```

### Implementation

```typescript
// src/services/lessonGenerator.ts

import { groqService } from './groqService';
import { LESSON_SYSTEM_PROMPT, buildLessonPrompt } from './lessonPrompts';
import type { LessonPlan, ActivityConfig } from '@/types/game';

/**
 * Generates a structured lesson using AI.
 * 
 * @param request - Lesson parameters
 * @returns Complete lesson plan with steps and activities
 */
export async function generateLesson(request: LessonRequest): Promise<LessonPlan> {
  const { skillPathId, lessonId, language, difficulty, vocabulary, previousLessons } = request;
  
  // Build the prompt
  const systemPrompt = LESSON_SYSTEM_PROMPT;
  const userPrompt = buildLessonPrompt({
    language,
    difficulty,
    vocabulary,
    previousLessons,
    activityCount: 6,
  });
  
  // Call Groq API
  const response = await groqService.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4000,
  });
  
  // Parse and validate
  const content = response.choices[0].message.content;
  const plan = JSON.parse(content);
  
  if (!validateLessonPlan(plan)) {
    throw new Error('Invalid lesson plan generated');
  }
  
  // Add metadata
  plan.id = lessonId;
  plan.skillPathId = skillPathId;
  plan.totalSunDrops = plan.steps.reduce((sum, step) => sum + step.activity.sunDrops, 0);
  
  return plan;
}

/**
 * Validates that a lesson plan has all required fields.
 */
export function validateLessonPlan(plan: unknown): plan is LessonPlan {
  if (!plan || typeof plan !== 'object') return false;
  
  const p = plan as Record<string, unknown>;
  
  if (typeof p.title !== 'string') return false;
  if (typeof p.icon !== 'string') return false;
  if (!Array.isArray(p.steps) || p.steps.length === 0) return false;
  
  // Validate each step
  for (const step of p.steps) {
    if (!validateLessonStep(step)) return false;
  }
  
  return true;
}

function validateLessonStep(step: unknown): boolean {
  if (!step || typeof step !== 'object') return false;
  
  const s = step as Record<string, unknown>;
  
  if (typeof s.tutorText !== 'string') return false;
  if (typeof s.helpText !== 'string') return false;
  if (!validateActivityConfig(s.activity)) return false;
  
  return true;
}

function validateActivityConfig(activity: unknown): boolean {
  if (!activity || typeof activity !== 'object') return false;
  
  const a = activity as Record<string, unknown>;
  
  if (typeof a.type !== 'string') return false;
  if (typeof a.sunDrops !== 'number') return false;
  
  // Validate type-specific fields
  const validTypes = ['multiple_choice', 'fill_blank', 'word_arrange', 'true_false', 'matching', 'translate'];
  if (!validTypes.includes(a.type)) return false;
  
  return true;
}
```

---

## Lesson Prompts

### System Prompt

```typescript
// src/services/lessonPrompts.ts

export const LESSON_SYSTEM_PROMPT = `
You are Professor Finch, a friendly owl tutor for kids aged 7-18 learning languages.

You create fun, age-appropriate language lessons. Each lesson has 5-8 activities.

**ACTIVITY TYPES:**
1. multiple_choice - 4 options, one correct (2-3 Sun Drops)
2. fill_blank - Complete sentence with missing word (2-3 Sun Drops)
3. word_arrange - Arrange scrambled words into sentence (3 Sun Drops)
4. true_false - Is statement correct? (1-2 Sun Drops)
5. matching - Match 4 terms to definitions (3-4 Sun Drops)
6. translate - Type translation of phrase (3 Sun Drops)

**SUN DROP RULES:**
- Easy activities: 1-2 Sun Drops
- Medium activities: 2-3 Sun Drops
- Hard activities: 3-4 Sun Drops
- Wrong answer: -1 Sun Drop penalty

**KID SAFETY:**
- No violence, scary themes, romance
- Positive, encouraging tone
- Age-appropriate vocabulary
- Clear, simple instructions

**LESSON STRUCTURE:**
- 5-8 steps
- Start with easier activities
- Mix activity types
- End with a harder one
- Total Sun Drops: 18-25

**OUTPUT FORMAT:**
Return JSON matching this structure:
{
  "title": "Lesson Title",
  "icon": "emoji",
  "steps": [
    {
      "tutorText": "Professor Finch intro",
      "helpText": "Hint for child",
      "activity": { ... }
    }
  ]
}
`;
```

### User Prompt Builder

```typescript
export function buildLessonPrompt(params: {
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  vocabulary: string[];
  previousLessons: string[];
  activityCount: number;
}): string {
  const { language, difficulty, vocabulary, previousLessons, activityCount } = params;
  
  return `
Create a ${difficulty} ${language} lesson for kids.

**Vocabulary to teach:**
${vocabulary.map(v => `- ${v}`).join('\n')}

**Previous lessons (avoid repeating):**
${previousLessons.map(l => `- ${l}`).join('\n') || 'None'}

**Requirements:**
- ${activityCount} activities
- Mix of activity types
- Age-appropriate content
- Clear, encouraging tutor text
- Helpful hints for stuck kids

Generate the lesson now as JSON.
`;
}
```

---

## Activity-Type Specific Prompts

```typescript
// Additional helpers for specific activity types

export const ACTIVITY_PROMPTS = {
  multiple_choice: `
{
  "type": "multiple_choice",
  "question": "What does 'bonjour' mean?",
  "options": ["Hello", "Goodbye", "Thanks", "Sorry"],
  "correctIndex": 0,
  "hint": "It's what you say when you meet someone!",
  "sunDrops": 2
}`,
  
  fill_blank: `
{
  "type": "fill_blank",
  "sentence": "Je ___ français.",
  "correctAnswer": "parle",
  "hint": "It means 'I speak'",
  "sunDrops": 2
}`,
  
  word_arrange: `
{
  "type": "word_arrange",
  "targetSentence": "J'aime le football",
  "scrambledWords": ["football", "J'aime", "le"],
  "hint": "Start with 'I like'",
  "sunDrops": 3
}`,
  
  true_false: `
{
  "type": "true_false",
  "statement": "'Chat' means dog in French.",
  "isTrue": false,
  "hint": "Chat is a furry pet that says meow!",
  "sunDrops": 1
}`,
  
  matching: `
{
  "type": "matching",
  "pairs": [
    { "left": "le chien", "right": "the dog" },
    { "left": "le chat", "right": "the cat" },
    { "left": "l'oiseau", "right": "the bird" },
    { "left": "le poisson", "right": "the fish" }
  ],
  "sunDrops": 4
}`,
  
  translate: `
{
  "type": "translate",
  "sourcePhrase": "J'ai faim",
  "acceptedAnswers": ["I'm hungry", "I am hungry"],
  "hint": "It's how you say you want food!",
  "sunDrops": 3
}`,
};
```

---

## Caching Strategy

```typescript
// Cache generated lessons to avoid regenerating

const lessonCache = new Map<string, { plan: LessonPlan; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function generateLessonWithCache(request: LessonRequest): Promise<LessonPlan> {
  const cacheKey = `${request.skillPathId}-${request.lessonId}`;
  const cached = lessonCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.plan;
  }
  
  const plan = await generateLesson(request);
  lessonCache.set(cacheKey, { plan, timestamp: Date.now() });
  
  return plan;
}
```

---

## Error Handling

```typescript
// Fallback lessons when AI fails

const FALLBACK_LESSONS: Record<string, LessonPlan> = {
  'sports-1': {
    id: 'sports-1-fallback',
    title: 'Match Day',
    icon: '⚽',
    skillPathId: 'sports',
    steps: [
      {
        tutorText: "Let's learn some sports words!",
        helpText: 'Sports are fun activities we play!',
        activity: {
          type: 'multiple_choice',
          question: "What does 'le but' mean?",
          options: ['The goal', 'The ball', 'The player', 'The field'],
          correctIndex: 0,
          sunDrops: 2,
        },
      },
      // ... more steps
    ],
    totalSunDrops: 20,
  },
};

export async function generateLessonSafe(request: LessonRequest): Promise<LessonPlan> {
  try {
    return await generateLessonWithCache(request);
  } catch (error) {
    console.error('Lesson generation failed:', error);
    
    // Return fallback if available
    const fallbackKey = `${request.skillPathId}-${request.lessonId}`;
    if (FALLBACK_LESSONS[fallbackKey]) {
      return FALLBACK_LESSONS[fallbackKey];
    }
    
    throw new Error('Failed to generate lesson and no fallback available');
  }
}
```

---

## Testing Checklist

### Generation
- [ ] Generates valid lesson for beginner difficulty
- [ ] Generates valid lesson for intermediate difficulty
- [ ] Generates valid lesson for advanced difficulty
- [ ] All activity types can be generated
- [ ] Sun Drop values are within range
- [ ] Total Sun Drops is 18-25

### Validation
- [ ] Validates required fields
- [ ] Rejects invalid activity types
- [ ] Rejects missing tutor text
- [ ] Rejects missing activities

### Caching
- [ ] Caches generated lessons
- [ ] Returns cached lesson within TTL
- [ ] Regenerates after TTL expires

### Error Handling
- [ ] Falls back to predefined lesson on failure
- [ ] Logs errors appropriately
- [ ] Returns meaningful error message

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| AI generates valid JSON | [ ] |
| All 6 activity types supported | [ ] |
| Sun Drop values correct | [ ] |
| Fallback lessons available | [ ] |
| Caching works | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 9 (Lesson View / Activities)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 8 (AI Service)
- `services/groqService.ts` — Existing Groq integration
- `docs/SYSTEM_PROMPTS.md` — Existing prompt patterns

---

## Notes for Implementation

1. Test with kids for age-appropriateness
2. Add content filtering for AI output
3. Consider pre-generating common lessons
4. Monitor Groq API costs
5. Add retry logic for rate limits