# Task 1.2.12: Pedagogy Engine Integration Testing

**Status:** Not Started
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** All Phase 1.2 tasks
**Estimated Time:** 6-8 hours

---

## Objective

Create comprehensive integration tests for the Pedagogy Engine to ensure all components work together correctly and the learning experience is as designed.

---

## Deliverables

### Files to Create
- `src/services/__tests__/pedagogyEngine.test.ts` — Integration tests
- `src/services/__tests__/difficultyCalibration.test.ts` — i+1 tests
- `src/services/__tests__/affectiveFilter.test.ts` — Filter tests
- `src/services/__tests__/srsService.test.ts` — SRS tests
- `src/services/__tests__/lessonGeneratorV2.test.ts` — Generation tests

---

## Test Scenarios

### 1. New Learner Onboarding Flow

```typescript
describe('New Learner Onboarding', () => {
  it('should create learner profile with correct defaults', async () => {
    const profile = await learnerProfileService.initializeProfile('user-123', {
      nativeLanguage: 'en',
      targetLanguage: 'fr',
      interests: ['sports', 'music'],
    });
    
    expect(profile.currentLevel).toBe(0);
    expect(profile.targetLanguage).toBe('fr');
    expect(profile.explicitInterests).toContain('sports');
    expect(profile.chunksAcquired).toBe(0);
    expect(profile.averageConfidence).toBe(0.5); // Neutral
  });
  
  it('should generate appropriate first lesson', async () => {
    const session = await pedagogyEngine.prepareSession('user-123', {
      topic: 'greetings',
      duration: 10,
    });
    
    // New learner should get i+1 = 1 (beginner)
    expect(session.difficulty).toBeCloseTo(1, 0.5);
    
    // All chunks should be difficulty 1
    expect(session.targetChunks.every(c => c.difficulty === 1)).toBe(true);
    
    // No review chunks for new learner
    expect(session.reviewChunks).toHaveLength(0);
  });
});
```

### 2. i+1 Difficulty Calibration

```typescript
describe('i+1 Difficulty Calibration', () => {
  it('should calculate correct i+1 for level 1 learner', async () => {
    // Acquire 50 chunks (level ~1)
    await simulateAcquisition('user-456', 50);
    
    const profile = await learnerProfileService.getProfile('user-456');
    const targetLevel = getTargetLevel(profile);
    
    expect(targetLevel).toBeCloseTo(2, 0.5);
  });
  
  it('should drop back when affective filter rises', async () => {
    // Simulate struggle
    await simulateWrongAnswers('user-456', 4);
    
    const profile = await learnerProfileService.getProfile('user-456');
    const shouldDropBack = shouldDropBack(profile, getRecentPerformance('user-456'));
    
    expect(shouldDropBack).toBe(true);
  });
  
  it('should increase difficulty after success streak', async () => {
    // Simulate success
    await simulateCorrectAnswers('user-789', 10);
    
    const profile = await learnerProfileService.getProfile('user-789');
    const newLevel = adaptDifficulty(2, {
      correct: 9,
      total: 10,
      avgTimeMs: 3000,
      helpUsed: 0,
    });
    
    expect(newLevel).toBeGreaterThan(2);
  });
});
```

### 3. SRS Chunk Status Transitions

```typescript
describe('SRS Status Transitions', () => {
  it('should transition new → learning on first encounter', async () => {
    const result = { correct: true, timeToAnswer: 3000, usedHelp: false };
    const userChunk = createMockUserChunk({ status: 'new' });
    
    const updated = calculateNextReview(userChunk, result);
    
    expect(updated.status).toBe('learning');
    expect(updated.interval).toBe(1); // 1 day
  });
  
  it('should transition learning → acquired after successful review', async () => {
    const result = { correct: true, timeToAnswer: 2000, usedHelp: false };
    const userChunk = createMockUserChunk({ 
      status: 'learning', 
      interval: 3,
      easeFactor: 2.5 
    });
    
    const updated = calculateNextReview(userChunk, result);
    
    expect(updated.status).toBe('acquired');
    expect(updated.interval).toBeGreaterThan(3); // Interval increased
  });
  
  it('should transition acquired → fragile on failure', async () => {
    const result = { correct: false, timeToAnswer: 5000, usedHelp: true };
    const userChunk = createMockUserChunk({ 
      status: 'acquired', 
      interval: 30,
      easeFactor: 2.5 
    });
    
    const updated = calculateNextReview(userChunk, result);
    
    expect(updated.status).toBe('fragile');
    expect(updated.interval).toBe(1); // Review tomorrow
  });
  
  it('should recover fragile → acquired with successful review', async () => {
    const result = { correct: true, timeToAnswer: 2000, usedHelp: false };
    const userChunk = createMockUserChunk({ 
      status: 'fragile', 
      interval: 1,
      easeFactor: 2.2 
    });
    
    const updated = calculateNextReview(userChunk, result);
    
    expect(updated.status).toBe('acquired');
  });
});
```

### 4. Affective Filter Monitoring

```typescript
describe('Affective Filter Monitoring', () => {
  it('should detect rising filter from wrong answers', async () => {
    const signals = [
      { type: 'wrong', timestamp: new Date(), activityId: '1' },
      { type: 'wrong', timestamp: new Date(), activityId: '2' },
      { type: 'wrong', timestamp: new Date(), activityId: '3' },
    ];
    
    const isRising = isFilterRising(signals);
    expect(isRising).toBe(true);
  });
  
  it('should suggest break when filter is critical', async () => {
    const profile = createMockProfile({ filterRiskScore: 0.85 });
    const signals = createStruggleSignals(5);
    
    const adaptation = getAdaptation(0.85, signals);
    
    expect(adaptation.type).toBe('suggest_break');
  });
  
  it('should simplify when filter is rising', async () => {
    const profile = createMockProfile({ filterRiskScore: 0.6 });
    const signals = [
      { type: 'wrong', timestamp: new Date(), activityId: '1' },
      { type: 'wrong', timestamp: new Date(), activityId: '2' },
      { type: 'help', timestamp: new Date(), activityId: '3' },
    ];
    
    const adaptation = getAdaptation(0.6, signals);
    
    expect(adaptation.type).toBe('simplify');
    expect(adaptation.action?.dropToI).toBe(true);
  });
});
```

### 5. Lesson Generation

```typescript
describe('Lesson Generation v2', () => {
  it('should generate lessons with target chunks', async () => {
    const request = createMockLessonRequest({
      targetChunks: [mockChunk1, mockChunk2, mockChunk3],
      activityCount: 5,
    });
    
    const lesson = await generateLesson(request);
    
    expect(lesson.activities).toHaveLength(5);
    expect(lesson.newChunks).toHaveLength(3);
  });
  
  it('should include review chunks in lessons', async () => {
    const request = createMockLessonRequest({
      reviewChunks: [mockReviewChunk1, mockReviewChunk2],
    });
    
    const lesson = await generateLesson(request);
    
    expect(lesson.reviewChunks).toHaveLength(2);
  });
  
  it('should generate age-appropriate content', async () => {
    const request7to10 = createMockLessonRequest({ ageGroup: '7-10' });
    const request15to18 = createMockLessonRequest({ ageGroup: '15-18' });
    
    const lesson7to10 = await generateLesson(request7to10);
    const lesson15to18 = await generateLesson(request15to18);
    
    // Younger should have simpler language
    expect(lesson7to10.intro.split(' ').length).toBeLessThan(50);
    // Older can have more complex content
    expect(lesson15to18.intro.length).toBeGreaterThanOrEqual(lesson7to10.intro.length);
  });
});
```

### 6. Full Session Flow

```typescript
describe('Full Session Integration', () => {
  it('should complete a full learning session', async () => {
    const userId = 'test-user-full';
    
    // 1. Initialize learner
    await learnerProfileService.initializeProfile(userId, {
      nativeLanguage: 'en',
      targetLanguage: 'fr',
      interests: ['food'],
    });
    
    // 2. Prepare session
    const session = await pedagogyEngine.prepareSession(userId, {
      topic: 'ordering',
      duration: 10,
    });
    
    expect(session.targetChunks.length).toBeGreaterThan(0);
    expect(session.activities.length).toBeGreaterThan(0);
    
    // 3. Complete activities
    for (const activity of session.activities) {
      const result = {
        correct: Math.random() > 0.3,
        timeToAnswer: 2000 + Math.random() * 3000,
        usedHelp: Math.random() > 0.7,
      };
      
      await pedagogyEngine.reportActivityCompletion(userId, {
        activityId: activity.id,
        ...result,
      });
    }
    
    // 4. Check profile was updated
    const profile = await learnerProfileService.getProfile(userId);
    expect(profile.totalSessions).toBe(1);
    expect(profile.chunksEncountered).toBeGreaterThan(0);
    
    // 5. Get session summary
    const summary = await pedagogyEngine.generateSessionSummary(userId, session);
    expect(summary.chunksLearned).toBeGreaterThan(0);
  });
});
```

---

## Mock Data Utilities

```typescript
// Test utilities for creating mock data

function createMockUserChunk(overrides?: Partial<UserChunk>): UserChunk {
  return {
    id: 'chunk-123',
    userId: 'user-123',
    chunkId: 'lex-chunk-456',
    status: 'new',
    interval: 1,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    lastEncountered: null,
    totalEncounters: 0,
    correctEncounters: 0,
    ...overrides,
  };
}

function createMockProfile(overrides?: Partial<LearnerProfile>): LearnerProfile {
  return {
    id: 'profile-123',
    userId: 'user-123',
    nativeLanguage: 'en',
    targetLanguage: 'fr',
    currentLevel: 0,
    chunksAcquired: 0,
    chunksLearning: 0,
    chunksFragile: 0,
    averageConfidence: 0.5,
    filterRiskScore: 0,
    totalSessions: 0,
    totalMinutes: 0,
    explicitInterests: [],
    detectedInterests: [],
    ...overrides,
  } as LearnerProfile;
}

async function simulateAcquisition(userId: string, count: number): Promise<void> {
  // Simulate acquiring chunks
  for (let i = 0; i < count; i++) {
    await chunkManager.recordEncounter(userId, `chunk-${i}`, {
      correct: true,
      timeToAnswer: 2000,
      usedHelp: false,
    });
  }
}
```

---

## Testing Checklist

- [ ] New learner onboarding flow works
- [ ] i+1 difficulty calibration is accurate
- [ ] SRS transitions are correct
- [ ] Affective filter monitoring works
- [ ] Lesson generation produces valid output
- [ ] Full session integration works
- [ ] All tests pass

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| All integration tests pass | [ ] |
| Edge cases are covered | [ ] |
| Mock data is realistic | [ ] |
| Performance is acceptable | [ ] |
| Tests are maintainable | [ ] |

---

## Reference
- All Phase 1.2 task documents
- **PEDAGOGY.md** — Pedagogical requirements
- **.clinerules** — Testing requirements