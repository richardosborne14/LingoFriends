# Task 1.2.9: Dynamic Path Generation

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.5, 1.2.8
**Estimated Time:** 4-5 hours

---

## Objective

Replace Phase 1.1's static skill paths with dynamically generated learning paths based on learner interests, level, and goals. Each learner gets a unique path tailored to their needs.

---

## Deliverables

### Files to Create
- `src/services/pathGenerator.ts` — Dynamic path generation service
- `src/hooks/useDynamicPath.tsx` — React hook for path access

### Files to Update
- `src/components/path/PathView.tsx` — Use dynamic paths instead of static
- `src/types/game.ts` — Add path generation types

---

## Key Concepts

### Static Paths (Phase 1.1)
```
All learners → Same lessons → Same vocabulary → Same order
```

### Dynamic Paths (Phase 1.2)
```
Each learner → Personalized chunks → Adaptive order → Based on interests + level
```

---

## Path Generation Interface

```typescript
// src/services/pathGenerator.ts

interface PathGenerationOptions {
  userId: string;
  topic: string;                    // Topic learner wants to study
  duration: number;                 // Target session length (minutes)
  includeReview: boolean;           // Include fragile chunks?
}

interface GeneratedPath {
  id: string;                       // Unique path ID
  topic: string;
  title: string;                    // Generated title
  icon: string;
  description: string;
  
  // Dynamic content
  newChunks: LexicalChunk[];        // Chunks to introduce
  reviewChunks: LexicalChunk[];     // Fragile chunks to reinforce
  contextChunks: LexicalChunk[];    // Familiar chunks for scaffolding
  
  // Lessons generated on-demand
  lessons: GeneratedLesson[];
  
  // Personalization metadata
  personalizedFor: string;          // User ID
  generatedAt: string;
  basedOnInterests: string[];
  difficultyLevel: number;          // i+1 target
}

/**
 * Generate a learning path for a specific topic.
 */
export async function generatePath(options: PathGenerationOptions): Promise<GeneratedPath> {
  const profile = await learnerProfileService.getProfile(options.userId);
  
  // Get chunks for this topic at learner's level
  const newChunks = await selectChunksForLevel(
    options.userId, 
    options.topic, 
    5 // 5 new chunks per path
  );
  
  // Get fragile chunks for review
  const reviewChunks = options.includeReview 
    ? await chunkManager.getFragileChunks(options.userId, 3)
    : [];
  
  // Get familiar context chunks
  const contextChunks = await getContextChunks(
    options.userId,
    options.topic,
    10
  );
  
  // Generate title and description based on content
  const title = generateTitle(newChunks, options.topic);
  const description = generateDescription(newChunks, profile);
  
  return {
    id: generatePathId(options.userId, options.topic),
    topic: options.topic,
    title,
    icon: getTopicIcon(options.topic),
    description,
    newChunks,
    reviewChunks,
    contextChunks,
    lessons: [], // Lessons generated on-demand during session
    personalizedFor: options.userId,
    generatedAt: new Date().toISOString(),
    basedOnInterests: profile.explicitInterests,
    difficultyLevel: getTargetLevel(profile),
  };
}

/**
 * Get available topics for the learner.
 * Returns topics sorted by relevance to interests.
 */
export async function getAvailableTopics(userId: string): Promise<Topic[]> {
  const profile = await learnerProfileService.getProfile(userId);
  const allTopics = await chunkManager.getTopics(profile.targetLanguage);
  
  // Sort by relevance to interests
  const interests = [
    ...profile.explicitInterests,
    ...profile.detectedInterests.map(d => d.topic),
  ];
  
  return allTopics.sort((a, b) => {
    const aScore = calculateTopicRelevance(a, interests, profile.currentLevel);
    const bScore = calculateTopicRelevance(b, interests, profile.currentLevel);
    return bScore - aScore;
  });
}

/**
 * Generate a "daily practice" path.
 * Combines review + new content based on what's due.
 */
export async function generateDailyPractice(userId: string): Promise<GeneratedPath> {
  const profile = await learnerProfileService.getProfile(userId);
  
  // Get chunks due for review
  const dueChunks = await chunkManager.getDueChunks(userId, 10);
  
  // Get new chunks in areas of struggle
  const struggleTopics = getStruggleTopics(profile);
  const newChunks = struggleTopics.length > 0
    ? await selectChunksForLevel(userId, struggleTopics[0], 3)
    : [];
  
  // Get context chunks
  const contextChunks = await getContextChunks(userId, 'review', 10);
  
  return {
    id: generatePathId(userId, 'daily-practice'),
    topic: 'daily-practice',
    title: 'Daily Practice',
    icon: '📅',
    description: `Review ${dueChunks.length} items and learn ${newChunks.length} new phrases.`,
    newChunks,
    reviewChunks: dueChunks,
    contextChunks,
    lessons: [],
    personalizedFor: userId,
    generatedAt: new Date().toISOString(),
    basedOnInterests: profile.explicitInterests,
    difficultyLevel: getTargetLevel(profile),
  };
}
```

---

## Organizing Paths for the Garden

In Phase 1.1, each tree represents a skill path. In Phase 1.2, trees represent **topics** the learner is studying:

```typescript
// Garden state in Phase 1.2
interface UserTree {
  id: string;
  topic: string;              // Path topic
  status: 'planted' | 'growing' | 'mature';
  health: number;             // Based on average chunk SRS status
  chunksAcquired: number;     // How many chunks acquired in this topic
  chunksTotal: number;        // Total chunks encountered
  lastPracticed: string;
}

// Tree health becomes chunk-based
function calculateTreeHealth(userChunks: UserChunk[], topicChunks: string[]): number {
  const topicUserChunks = userChunks.filter(uc => topicChunks.includes(uc.chunkId));
  
  if (topicUserChunks.length === 0) return 50; // Default for new tree
  
  const healthMap = {
    'acquired': 100,
    'learning': 70,
    'fragile': 30,
    'new': 50,
  };
  
  const avgHealth = topicUserChunks.reduce((sum, uc) => {
    return sum + healthMap[uc.status];
  }, 0) / topicUserChunks.length;
  
  return Math.round(avgHealth);
}
```

---

## Migration from Phase 1.1

### What Changes
- `PathView` now calls `generatePath()` instead of fetching static path
- Tree health is calculated from `user_chunks` SRS status
- Lessons are generated on-demand, not pre-stored

### What Stays the Same
- Garden UI (trees, plants, decorations)
- SunDrop rewards
- Activity components (they receive chunks, not vocabulary)

---

## Testing Checklist

- [ ] Paths generate correctly for a topic
- [ ] Topics are sorted by interest relevance
- [ ] Daily practice combines review + new
- [ ] Tree health reflects chunk status
- [ ] Path is personalized to learner

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Paths are unique per learner | [ ] |
| Interests influence path | [ ] |
| Review is included correctly | [ ] |
| Tree health is accurate | [ ] |
| Migration is smooth | [ ] |

---

## Reference
- **docs/phase-1.2/phase-1.2-overview.md** — Dynamic path overview
- **docs/phase-1.1/task-1-1-4-path-view.md** — Phase 1.1 PathView
- **docs/phase-1.2/task-1.2-10-chunk-srs.md** — SRS for tree health