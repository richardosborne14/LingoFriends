# Lesson Quality Fix - Teach-First Pedagogy

## Implementation Status: ⚠️ PARTIALLY COMPLETE - LESSON GENERATION FUBAR

### ⚠️ CRITICAL ISSUE: LESSON GENERATION IS BROKEN

**The lesson generation pipeline is FUBAR (Fucked Up Beyond All Recognition).**

Despite multiple fix attempts, the system still generates Spanish content when German is selected as the target language. The issue runs deeper than the mock data fallback - it appears to be somewhere in the V2 pedagogy pipeline (pedagogyEngine, lessonGeneratorV2, or aiPedagogyClient).

**Symptoms:**
- User selects German as target language during onboarding
- Lesson content shows Spanish vocabulary (e.g., "Hola", "Adiós") instead of German
- The target language is not being correctly propagated through the pipeline

**Attempted Fixes (Did Not Resolve):**
1. Removed mockGameData fallback from lessonPlanService.ts
2. Added createDefaultProfile() with target language parameter
3. Passed targetLanguage through session plan topic

**Areas to Investigate:**
1. `src/services/aiPedagogyClient.ts` - Check if target language is passed to Groq API
2. `src/services/lessonGeneratorV2.ts` - Check fallback lesson generation
3. `src/services/pedagogyEngine.ts` - Check session plan creation
4. `src/hooks/useLesson.ts` - Check how lesson is loaded
5. `src/components/lesson/LessonView.tsx` - Check lesson rendering flow
6. Check browser console logs for `[lessonPlanService]` messages to trace the actual flow

---

### Problem Statement

The lesson generation system has critical pedagogical failures:

1. **Incorrect Quiz Logic** - True/false questions with wrong answers (e.g., "we say hallo to friends in German" marked FALSE)
2. **Testing Untaught Material** - Questions ask about words/phrases that were never introduced to the learner
3. **No Escape Hatch** - Users get stuck on impossible questions with no way to proceed
4. **Lesson Regeneration** - Returning to a lesson step regenerates new questions instead of showing the same ones
5. **Wrong Language Content** - ❌ BROKEN - German lessons show Spanish content - ROOT CAUSE UNKNOWN

### Solution Overview

This fix is implemented in 3 parts:

| Part | Status | Description |
|------|--------|-------------|
| **A: Activity Component Fixes** | ✅ Complete | Skip/give-up on all activities |
| **B: Teach-First Pedagogy** | ✅ Complete | 5-step progression implemented |
| **C: Lesson State Persistence** | ⏳ Deferred | Requires architecture changes |

---

## Part A: Activity Component Fixes

### Files to Modify

1. **`src/components/lesson/activities/FillBlank.tsx`**
   - Add attempt counter
   - After 3 wrong attempts, show "Give Up" button
   - "Give Up" reveals answer and calls `onComplete(false, 0)`

2. **`src/components/lesson/activities/Translate.tsx`**
   - Same pattern as FillBlank

3. **`src/components/lesson/activities/MultipleChoice.tsx`**
   - Already has right/wrong feedback
   - Add skip option

4. **`src/components/lesson/activities/TrueFalse.tsx`**
   - Add skip option
   - Fix for users who genuinely don't know

### Implementation Pattern

```tsx
const [attempts, setAttempts] = useState(0);
const [showGiveUp, setShowGiveUp] = useState(false);

const handleWrong = () => {
  const newAttempts = attempts + 1;
  setAttempts(newAttempts);
  if (newAttempts >= 3) {
    setShowGiveUp(true);
  }
  onWrong();
};

const handleGiveUp = () => {
  // Show the correct answer
  setShowAnswer(true);
  // Allow continuation after delay
  setTimeout(() => onComplete(false, 0), 1500);
};
```

---

## Part B: Teach-First Lesson Structure

### The Problem

Current fallback lessons immediately quiz users on material they've never seen:
```tsx
// WRONG: Quiz first
activity = {
  type: 'multiple_choice',
  question: `What does "${starter.target}" mean?`,
  // User has never seen this word!
}
```

### The Solution: 5-Step Progression

Each phrase/chunk follows this sequence:

#### Step 1: INTRODUCE (Information)
Show the phrase with translation and context. No quiz - just learning.

```
"Tschüss" means "Bye" (casual, for friends)

💡 This is a casual way to say goodbye. 
   Use it with friends and people you know well.
```

#### Step 2: RECOGNIZE (Guided Recognition)
Multiple choice with the answer visible as reference.

```
You learned: Tschüss = Bye (casual)

Which German word means "Bye" for friends?
- Tschüss ✓
- Auf Wiedersehen
- Guten Tag
```

#### Step 3: PRACTICE (Supported Recall)
Fill in blank with hint shown.

```
Complete: "_____!" (casual goodbye)
Hint: Sounds like "choo-s"
Answer: Tschüss
```

#### Step 4: RECALL (Independent Recall)
Translate without hints.

```
Translate to German: "Bye" (to a friend)
Accept: Tschüss
```

#### Step 5: APPLY (Context Application)
Use in a situation.

```
Your friend Maria is leaving. What do you say?
- Tschüss, Maria! ✓
- Auf Wiedersehen, Maria!
```

### Files to Modify

1. **`src/services/lessonGeneratorV2.ts`**
   - Rewrite `createStarterActivities()` to implement 5-step progression
   - Add `createIntroductionStep()` method
   - Add `createRecognitionStep()` method
   - Add `createPracticeStep()` method
   - Add `createRecallStep()` method
   - Add `createApplicationStep()` method

### Implementation Structure

```tsx
private createStarterActivities(topic: string, profile: LearnerProfile): LessonStep[] {
  const phrases = this.getTopicStarters(topic, profile.targetLanguage, profile.nativeLanguage);
  const steps: LessonStep[] = [];
  
  // Each phrase gets the 5-step progression
  for (const phrase of phrases.slice(0, 3)) { // Max 3 phrases per lesson
    // Step 1: Introduce
    steps.push(this.createIntroductionStep(phrase, profile));
    
    // Step 2: Recognize
    steps.push(this.createRecognitionStep(phrase, profile));
    
    // Step 3: Practice
    steps.push(this.createPracticeStep(phrase, profile));
    
    // Step 4: Recall
    steps.push(this.createRecallStep(phrase, profile));
    
    // Step 5: Apply
    steps.push(this.createApplicationStep(phrase, profile));
  }
  
  return steps;
}
```

---

## Part C: Lesson State Persistence

### The Problem

```tsx
// In LessonView.tsx, the lesson is regenerated each time
const lesson = await lessonGeneratorV2.generateLesson(request);
```

### The Solution

Store the lesson in parent state and pass it down.

### Files to Modify

1. **`src/hooks/useLesson.ts`**
   - Add `currentLesson` to state
   - Add `setCurrentLesson()` method
   - Only generate if no lesson exists

2. **`src/components/lesson/LessonView.tsx`**
   - Accept `lesson` as prop (optional)
   - Use passed lesson if available, otherwise generate

3. **`App.tsx`** (or lesson container)
   - Store lesson in state during session
   - Clear on lesson complete

---

## Acceptance Criteria

### Part A ✅ COMPLETE
- [x] FillBlank shows "Give Up" after 3 wrong attempts
- [x] Translate shows "Give Up" after 3 wrong attempts
- [x] All activities have a way to skip/continue
- [x] User never gets stuck on a question

### Part B ✅ COMPLETE
- [x] Fallback lessons start with INTRODUCE step (no quiz)
- [x] Each phrase follows 5-step progression
- [x] No quiz tests untaught material
- [x] True/False questions have correct logic

### Part C ⏳ DEFERRED
- [ ] Navigating back to a lesson step shows same questions
- [ ] Lesson only regenerates on explicit "new lesson" action
- [ ] Lesson clears on completion

**Note:** Part C deferred as it requires architectural changes to the lesson state management. The current implementation regenerates lessons on each load, which is acceptable for MVP.

---

## Testing Checklist

1. Create new account → Start first lesson
2. First step should be INTRODUCE (showing word + meaning)
3. Complete all steps for a phrase
4. Navigate back - should see same questions
5. Get a question wrong 3 times - should see Give Up option
6. Complete lesson - should clear for next lesson

---

## Implementation Order

1. **Part A** - Add skip/give-up to activity components
2. **Part B** - Rewrite fallback lesson generator with teach-first
3. **Part C** - Add lesson state persistence

This order ensures:
- Immediate UX improvement (users can escape stuck states)
- Core pedagogical fix (proper teaching progression)
- Consistency improvement (same questions on return)