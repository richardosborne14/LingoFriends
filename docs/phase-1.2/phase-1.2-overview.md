# Phase 1.2: Pedagogy Engine

**Status:** Planning
**Timeline:** 5-6 weeks
**Priority:** HIGH - Core learning methodology
**Dependencies:** Phase 1.1 (UI/Game mechanics)
**Prerequisite Reading:** `PEDAGOGY.md`

---

## Executive Summary

Phase 1.2 transforms LingoFriends from a content-delivery app into an **adaptive learning engine** powered by four evidence-based pedagogical frameworks:

1. **Lexical Approach** — Teaching language in chunks, not isolated words
2. **Krashen's Five Hypotheses** — Comprehensible input, i+1, affective filter
3. **Language Coaching** — Learner autonomy, strengths-based, reflective practice
4. **Spaced Repetition** — Optimized review timing at the chunk level

**The Uniqueness Guarantee:** No two learners ever do the exact same lesson. Each path is generated dynamically based on interests, level, performance, and engagement signals.

---

## The Problem with Phase 1.1

Phase 1.1 implements the game mechanics (garden, trees, SunDrops, activities) but uses a **static, one-size-fits-all content model**:

| Current (Phase 1.1) | Problem |
|-------------------|---------|
| Static skill paths | Same content for all learners |
| Vocabulary arrays | Teaches isolated words (violates Lexical Approach) |
| Fixed difficulty | No i+1 calibration, no adaptation |
| No learner model | Cannot track what's acquired vs. fragile |
| Tree-based SRS | Reviews paths, not individual chunks |

The game mechanics are sound — but the **learning engine underneath is not**.

---

## Phase 1.2 Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 1.1 (GAME LAYER)                       │
│  Garden UI │ Path View │ Lesson View │ Activities │ SunDrops │ Trees │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                      PHASE 1.2 (PEDAGOGY ENGINE)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  Learner Model  │◄───│ Pedagogy Engine │───►│  Chunk Manager  │  │
│  │                 │    │                 │    │                 │  │
│  │ • Profile       │    │ • i+1 Calibrate │    │ • Chunk Library │  │
│  │ • Acquired      │    │ • Path Generate │    │ • SM-2 Schedule │  │
│  │ • Fragile       │    │ • Adapt Lesson  │    │ • Chunk Queries │  │
│  │ • Interests     │    │ • Filter Watch  │    │                 │  │
│  │ • Confidence    │    │                 │    │                 │  │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘  │
│           │                      │                      │           │
│           └──────────────────────┼──────────────────────┘           │
│                                  │                                  │
│                      ┌───────────┴───────────┐                      │
│                      │   AI Lesson Generator │                      │
│                      │        (v2)           │                      │
│                      │                       │                      │
│                      │ • Groq Llama 3.3      │                      │
│                      │ • Pedagogy prompts    │                      │
│                      │ • Chunk-based output  │                      │
│                      └───────────────────────┘                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                         POCKETBASE (DATA LAYER)                      │
├─────────────────────────────────────────────────────────────────────┤
│  profiles │ user_trees │ gifts │ daily_progress │                   │
│  learner_profiles │ user_chunks │ chunk_library │ topics │ (NEW)   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Learner Model** | Tracks what the learner knows, what's fragile, their interests, confidence level, and engagement signals |
| **Pedagogy Engine** | Central orchestrator: generates paths, calibrates difficulty, monitors affective filter, adapts in real-time |
| **Chunk Manager** | Manages the chunk library, SM-2 spaced repetition scheduling, queries for appropriate chunks |
| **AI Lesson Generator v2** | Generates lessons using all 4 pedagogical frameworks, produces chunk-based activities |

---

## Content Unit: The Lexical Chunk

Instead of teaching isolated words, Phase 1.2 teaches **lexical chunks** — whole phrases that native speakers retrieve as units.

### Dynamic Chunk Generation

**Key Architectural Decision:** Chunks are **AI-generated dynamically**, not pre-seeded from a static library.

This approach:
- Adapts content to each learner's interests
- Generates "real world" language based on user context
- Allows unlimited personalization
- Keeps content fresh and relevant

**Target Languages:** French-speaking children learning **English** or **German**.

### Chunk Taxonomy (from PEDAGOGY.md)

| Type | Description | Example (German → French) |
|------|-------------|---------------------------|
| **Polywords** | Fixed multi-word units | *natürlich* = "bien sûr" |
| **Collocations** | Words that naturally co-occur | *eine Entscheidung treffen* = "prendre une décision" |
| **Institutionalised Utterances** | Whole phrases with pragmatic meaning | *Das macht nichts.* = "Ce n'est pas grave." |
| **Sentence Frames** | Semi-fixed patterns with variable slots | *Ich möchte ___, bitte.* = "Je voudrais ___, s'il vous plaît." |

### Chunk Data Model

```typescript
interface LexicalChunk {
  id: string;
  text: string;                    // "Ich möchte einen Kaffee, bitte"
  translation: string;             // "Je voudrais un café, s'il vous plaît"
  chunkType: ChunkType;            // polyword | collocation | utterance | frame
  targetLanguage: string;          // "de" (what they're learning)
  nativeLanguage: string;          // "fr" (UI language)
  
  // For sentence frames, what can be filled in
  slots?: Array<{
    position: number;
    type: string;                  // "noun", "verb", "adjective"
    examples: string[];            // ["einen Tee", "ein Bier", "die Rechnung"]
  }>;
  
  // Difficulty and tagging
  difficulty: number;              // 1-5, used for i+1 calibration
  topics: string[];                // Derived from learner interests
  frequency: number;               // Estimated frequency
  
  // For spaced repetition
  baseInterval: number;            // Initial SRS interval in days
  
  // Metadata
  notes?: string;                  // Usage notes for AI
  culturalContext?: string;        // Cultural usage notes
  ageAppropriate: string[];        // ["7-10", "11-14", "15-18"]
}
```

### Interest-Based Content

Chunks are generated based on:
1. **Selected interests** from onboarding (`interests-data.ts`)
2. **Custom interests** entered by the learner
3. **User-provided context** (e.g., "My dog is named Max")
4. **Performance data** (what they've learned/acquired)

See `docs/phase-1.2/chunk-generation-framework.md` for full generation guidelines.

---

## Learner Model

The learner model is the heart of personalization. It tracks each learner's relationship with every chunk they've encountered.

### Learner Profile

```typescript
interface LearnerProfile {
  id: string;
  userId: string;
  
  // Level tracking (per language)
  currentLevel: number;            // 0-100, CEFR-mapped
  levelHistory: LevelSnapshot[];   // For progress visualization
  
  // Interests (from onboarding + AI-detected)
  interests: string[];             // ["football", "cooking", "music"]
  aiDetectedInterests: string[];   // Detected from chat/activity choices
  
  // Confidence tracking
  averageConfidence: number;       // 0-1, rolling average
  confidenceHistory: ConfidenceSnapshot[];
  
  // Engagement signals
  averageSessionLength: number;    // minutes
  helpRequestRate: number;         // % of activities with help
  wrongAnswerRate: number;         // % wrong first try
  lastActiveDate: string;
  
  // Coaching relationship
  preferredSessionLength: number;  // User's preferred session duration
  preferredActivityTypes: string[];// Activities they enjoy most
  lastReflectionPrompt: string;    // For coaching cycle
}
```

### User Chunk Record

```typescript
interface UserChunk {
  id: string;
  userId: string;
  chunkId: string;
  
  // Acquisition status
  status: ChunkStatus;             // new | learning | acquired | fragile
  
  // Spaced repetition (SM-2)
  easeFactor: number;              // 1.3-2.5, how "easy" this chunk is
  interval: number;                // Days until next review
  nextReviewDate: string;
  repetitions: number;             // How many successful reviews
  
  // Performance history
  totalEncounters: number;
  correctFirstTry: number;
  helpUsedCount: number;
  
  // Context tracking
  firstEncounteredIn: string;      // Lesson/topic ID
  lastEncounteredIn: string;
  
  // Timestamps
  created: string;
  updated: string;
}
```

---

## i+1 Difficulty Calibration

The Pedagogy Engine calibrates content to be slightly above the learner's current level (Krashen's Input Hypothesis).

### How It Works

1. **Determine current level (i)**: Based on acquired chunks, CEFR mapping, performance data
2. **Select chunks at i+1**: Introduce 1-3 new chunks per activity, surround with familiar context
3. **Monitor and adapt**: If struggling (>2 wrong in a row), drop back to i for consolidation
4. **If breezing**: Accelerate to i+2 with richer content

### Difficulty Calibration Service

```typescript
interface DifficultyCalibration {
  // Get learner's current "i" level
  getCurrentLevel(userId: string): Promise<number>;
  
  // Select chunks at i+1 for a topic
  selectChunksForLevel(
    userId: string,
    topic: string,
    count: number,
    excludeChunkIds: string[]
  ): Promise<LexicalChunk[]>;
  
  // Adjust based on performance signal
  reportPerformance(
    userId: string,
    chunkId: string,
    correct: boolean,
    timeToAnswer: number,
    usedHelp: boolean
  ): Promise<void>;
  
  // Check if we should drop back (affective filter rising)
  shouldDropBack(userId: string, recentPerformance: ActivityResult[]): boolean;
}
```

---

## Affective Filter Monitoring

The engine monitors for signs that the learner's affective filter is rising (anxiety, frustration, disengagement).

### Signals to Watch

| Signal | Interpretation | Response |
|--------|---------------|----------|
| 3+ correct in a row | Comfortable | Push to i+1.5 or i+2 |
| 2+ wrong in a row | Content too hard OR filter rising | Drop to i, offer encouragement |
| Help request | Specific confusion + possible filter | Address issue, adapt remaining activities |
| Long pause (>30s) | Processing or hesitation | Proactive hint, encouragement |
| Session exit mid-lesson | Disengagement | Save state, welcoming return message |
| Repeated help on same chunk | Fragile knowledge | Schedule focused review |

### Adaptation Strategies

```typescript
interface AffectiveFilterResponse {
  // Detect rising filter
  detectRisingFilter(userId: string, sessionData: SessionData): boolean;
  
  // Get appropriate response
  getAdaptation(risingFilter: boolean, context: SessionContext): AdaptationAction;
}

type AdaptationAction = 
  | { type: 'simplify'; message: string }
  | { type: 'encourage'; message: string; easierChunk: LexicalChunk }
  | { type: 'change_topic'; topic: string; reason: string }
  | { type: 'suggest_break'; message: string }
  | { type: 'celebrate'; message: string }; // For lowering filter after success
```

---

## Dynamic Path Generation

Unlike Phase 1.1's static paths, Phase 1.2 generates paths dynamically based on the learner's interests and needs.

### Path Generation Logic

```typescript
interface PathGenerationRequest {
  userId: string;
  topic: string;                    // From interests or user choice
  difficulty: number;               // i+1 target
  chunkCount: number;               // How many chunks to teach
  includeReview: boolean;           // Include fragile chunks?
}

interface GeneratedPath {
  id: string;
  topic: string;
  title: string;
  icon: string;
  description: string;
  
  // Dynamic content
  newChunks: LexicalChunk[];        // Chunks to introduce
  reviewChunks: LexicalChunk[];     // Fragile chunks to reinforce
  contextChunks: LexicalChunk[];    // Familiar chunks for context
  
  // Lessons generated on-demand
  lessons: GeneratedLesson[];
  
  // Personalization metadata
  personalizedFor: string;          // User ID
  generatedAt: string;
  basedOnInterests: string[];
}
```

### Topic-Based Learning

Paths are organized by **topics** (not "lessons"):

| Topic | Sub-topics | Example Chunks |
|-------|------------|----------------|
| Ordering Food | Restaurant, Café, Fast Food | *Je voudrais...*, *L'addition, s'il vous plaît*, *C'est combien?* |
| Sports | Football, Tennis, Athletics | *Quel score?*, *Bien joué!*, *Il a marqué un but* |
| Travel | Airport, Hotel, Directions | *Je cherche...*, *À gauche*, *Combien de temps?* |
| Family & Friends | Descriptions, Relationships | *C'est mon frère*, *Elle s'appelle Marie*, *On habite ensemble* |

---

## Chunk-Based Spaced Repetition

Each chunk has its own SRS schedule, independent of paths or trees.

### SM-2 Algorithm (Simplified)

```
If correct:
  if repetitions == 0: interval = 1 day
  if repetitions == 1: interval = 3 days
  if repetitions >= 2: interval = interval * easeFactor
  
  easeFactor = easeFactor + 0.1 (max 2.5)

If incorrect:
  interval = 1 day
  easeFactor = easeFactor - 0.2 (min 1.3)
  repetitions = 0
```

### Tree Health Integration

Tree health in Phase 1.2 reflects the average health of chunks in that path:

```typescript
function calculateTreeHealth(userChunks: UserChunk[], pathChunkIds: string[]): number {
  const pathChunks = userChunks.filter(uc => pathChunkIds.includes(uc.chunkId));
  
  // Map SRS status to health contribution
  const healthMap = {
    'acquired': 100,
    'learning': 70,
    'fragile': 30,
    'new': 50
  };
  
  const avgHealth = pathChunks.reduce((sum, uc) => {
    return sum + healthMap[uc.status];
  }, 0) / pathChunks.length;
  
  return Math.round(avgHealth);
}
```

---

## AI Lesson Generator v2

The lesson generator in Phase 1.2 uses all four pedagogical frameworks.

### System Prompt Structure

```markdown
## Persona
You are Professor Finch, a warm, encouraging language coach...

## Teaching Approach
[Full pedagogy from PEDAGOGY.md - Lexical, Krashen, Coaching, SRS]

## Content Rules
- Present language in natural chunks (Lexical Approach)
- Pitch at i+1: slightly above current level (Input Hypothesis)
- Focus on meaning over form (Acquisition-Learning Distinction)
- Celebrate every attempt (Affective Filter)
- Connect to learner's interests (Coaching)

## Session Context
- Learner level: {currentLevel}
- Target chunks: {targetChunks}
- Review chunks: {reviewChunks}
- Familiar context: {contextChunks}
- Recent struggles: {strugglingChunks}
- Interests: {interests}

## Output Format
[JSON schema for activities...]
```

### Activity Generation

Activities are generated from chunks, not vocabulary arrays:

```typescript
interface ActivityGenerationRequest {
  // Chunks to teach
  targetChunks: LexicalChunk[];     // New chunks for this lesson
  
  // Chunks to review
  reviewChunks: LexicalChunk[];     // Fragile chunks needing reinforcement
  
  // Context chunks (familiar)
  contextChunks: LexicalChunk[];    // Already acquired, for context
  
  // Learner context
  learnerLevel: number;
  interests: string[];
  recentStruggles: string[];        // Chunk IDs
  
  // Activity constraints
  activityTypes: GameActivityType[];
  activityCount: number;
}
```

---

## Implementation Tasks

| Task | Name | Est. Time | Status |
|------|------|-----------|--------|
| 1.2.1 | Learner Model Schema | 2-3h | ✅ Complete |
| 1.2.2 | Chunk Generation Framework | 4-6h | ✅ Complete |
| 1.2.3 | Chunk Generation Service | 4-6h | ✅ Complete |
| 1.2.4 | Learner Profile Service | 3-4h | ✅ Complete |
| 1.2.5 | Pedagogy Engine Core | 6-8h | ✅ Complete |
| 1.2.6 | i+1 Difficulty Calibration | 4-5h | ✅ Complete |
| 1.2.7 | Affective Filter Monitoring | 4-5h | Not Started |
| 1.2.8 | AI Lesson Generator v2 | 6-8h | Not Started |
| 1.2.9 | Dynamic Path Generation | 4-5h | Not Started |
| 1.2.10 | Chunk-Based SRS | 3-4h | Not Started |
| 1.2.11 | System Prompt Overhaul | 3-4h | Not Started |
| 1.2.12 | Integration & Testing | 4-5h | Not Started |

**Total: ~45-55 hours**

---

## Success Metrics

### Quantitative
- [ ] All 12 tasks completed
- [ ] Learner model tracks chunks correctly
- [ ] Lessons generated dynamically per user
- [ ] i+1 calibration adapts to performance
- [ ] SRS intervals update correctly
- [ ] No two learners get identical lessons

### Qualitative
- [ ] Lessons feel personalized and relevant
- [ ] Difficulty feels "just right" (not too easy/hard)
- [ ] Learners feel seen and coached (not taught at)
- [ ] Review happens at the right time
- [ ] Struggling learners get adaptive help

---

## Migration from Phase 1.1

### What Changes

| Phase 1.1 Component | Phase 1.2 Change |
|--------------------|------------------|
| `seed-skill-paths.cjs` | Replace with chunk seeding service |
| `skill_paths` collection | Add `topics` collection; paths become dynamic |
| Static lesson content | Generated on-demand from chunks |
| `vocabulary: string[]` | Replace with `chunks: ChunkReference[]` |
| Tree health (static decay) | Health from chunk SRS status |
| Task 1-1-9 AI Generator | Upgrade to v2 with pedagogy |

### What Stays the Same

| Phase 1.1 Component | Phase 1.2 Status |
|--------------------|------------------|
| Garden UI components | No changes |
| Activity components | Minimal changes (chunk-aware) |
| Path view | No changes (just dynamic source) |
| SunDrop system | No changes |
| Gift system | No changes |
| Pocketbase auth/profiles | No changes |

---

## References

- **PEDAGOGY.md** — Complete pedagogical foundation
- **docs/phase-1.1/GAME_DESIGN.md** — Game design (still valid)
- **docs/phase-1.1/phase-1.1-overview.md** — Phase 1.1 context
- **src/types/game.ts** — Current type definitions (additive changes)

---

## Notes for Implementation

1. **Phase 1.1 must be functional first** — Build the game loop, then add the learning brain
2. **Chunk content is a content project** — Requires research and curation
3. **AI prompts need iteration** — Test with kids for pedagogy compliance
4. **Performance matters** — Chunk queries must be fast for real-time generation
5. **Privacy by design** — Learner profiles contain sensitive data; protect appropriately