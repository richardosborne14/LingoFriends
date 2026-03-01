# Task 3.6: "What You'll Learn" Screen Redesign

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** Task 3.2 (Chunk Family Architecture)  
**Estimated Time:** 4–6 hours  
**Priority:** Medium — visual polish that reinforces the chunk family concept

---

## Objective

Redesign the lesson step start screen (the "What You'll Learn" preview that appears before activities begin) to show the **chunk family** concept: one core frame with its variations, not a list of unrelated phrases.

---

## The Problem

Currently, the lesson start screen shows something like:

```
┌─────────────────────────────────────────┐
│         📚 Introduce Yourself           │
│                                         │
│  In this lesson, you'll learn:          │
│                                         │
│  • Hallo Freunde (Hello friends)        │
│  • Wie geht's? (How are you?)           │
│  • Schön dich kennenzulernen            │
│    (Nice to meet you)                   │
│                                         │
│          [ Start Lesson → ]             │
└─────────────────────────────────────────┘
```

Three unrelated phrases. No pattern visible. No personal connection.

---

## The Solution

With chunk families, the start screen should show the frame and its variations:

```
┌─────────────────────────────────────────┐
│      🐱 Talking About What You Have     │
│                                         │
│  Today's pattern:                       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     " Ich habe ___ "            │    │
│  │       I have ___                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  You'll learn to say:                   │
│                                         │
│  🐱 Ich habe eine Katze                │
│     I have a cat                        │
│                                         │
│  👨‍👩‍👦 Ich habe einen Bruder              │
│     I have a brother                    │
│                                         │
│  🍽️ Ich habe Hunger                    │
│     I am hungry                         │
│                                         │
│         [ Let's go! 🚀 ]               │
└─────────────────────────────────────────┘
```

The core frame is prominently displayed. The variations are visually connected to it. The learner can see the pattern before they even start.

---

## Implementation

### File 1: `src/components/lesson/LessonStepStart.tsx` (or equivalent)

**This is the component that shows the lesson preview before activities begin.** It needs access to the new `AILessonContent` fields.

**Pass the new data through the lesson plan:**

The `LessonPlan` type needs optional Phase 3 metadata:

```typescript
// In src/types/game.ts, add to LessonPlan:
export interface LessonPlan {
  // ... existing fields ...

  /** Phase 3: Core sentence frame (e.g. "Ich habe ___") */
  coreFrame?: string;

  /** Phase 3: Frame translation (e.g. "I have ___") */
  coreFrameTranslation?: string;

  /** Phase 3: Personal context used in generation */
  personalContext?: string;
}
```

**Update `lessonAssembler.ts`** to pass these through:

```typescript
export function assembleLessonPlan(
  content: AILessonContent,
  lessonId: string,
  options?: { difficulty?: number; seed?: number }
): LessonPlan {
  // ... existing assembly logic ...

  return {
    id: lessonId,
    title: content.title,
    icon: '📚',
    skillPathId: content.title,
    lessonIndex: 0,
    steps,
    totalSunDrops,
    // Phase 3 metadata
    coreFrame: content.coreFrame,
    coreFrameTranslation: content.coreFrameTranslation,
    personalContext: content.personalContext,
  };
}
```

### File 2: Component Design

The start screen has three visual sections:

**Section 1: Title**
- Shows the lesson title from AI (e.g. "Talking About What You Have 🐱")
- Should be fun and specific, not generic

**Section 2: Core Frame Card**
- A highlighted card showing the frame in target + native language
- Visually prominent — this is the "big idea" of the lesson
- The ___ slots are styled differently (underlined or highlighted)
- Only shown when `coreFrame` is available (graceful degradation)

**Section 3: Variation List**
- Each chunk variation with its translation
- Small emoji icons (auto-assigned or from a simple topic→emoji mapping)
- The ___ slots filled in are **bolded** to draw attention to what changes

**Section 4: Start Button**
- "Let's go! 🚀" or "Start Learning!" — warm, action-oriented

**Graceful degradation:** If `coreFrame` is not available (e.g. fallback lesson, legacy content), fall back to the current list format. The component should check:

```typescript
const hasChunkFamily = lesson.coreFrame && lesson.coreFrameTranslation;
```

### Visual Treatment for the Frame

The frame card should feel special — like a key concept being revealed:

```tsx
{hasChunkFamily && (
  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 text-center my-4">
    <p className="text-xs text-indigo-400 uppercase tracking-wide mb-1">
      {t('lesson.todaysPattern')}
    </p>
    <p className="text-xl font-bold text-indigo-700">
      "{lesson.coreFrame}"
    </p>
    <p className="text-sm text-indigo-500 mt-1">
      {lesson.coreFrameTranslation}
    </p>
  </div>
)}
```

### Highlighting the Varying Parts

In the variation list, bold the parts that differ from the frame:

```typescript
/**
 * Highlight the variable part of a chunk by comparing to the core frame.
 * 
 * Frame:  "Ich habe ___"
 * Chunk:  "Ich habe eine Katze"
 * Result: "Ich habe <strong>eine Katze</strong>"
 */
function highlightVariation(frame: string, chunk: string): React.ReactNode {
  // Simple approach: find the ___ position in the frame,
  // then highlight the corresponding text in the chunk
  const slotIndex = frame.indexOf('___');
  if (slotIndex < 0) return chunk;

  const prefix = frame.substring(0, slotIndex).trim();
  const suffix = frame.substring(slotIndex + 3).trim();

  // Find where the prefix ends in the chunk
  const prefixEnd = chunk.toLowerCase().indexOf(prefix.toLowerCase()) + prefix.length;
  // Find where the suffix starts in the chunk (if any)
  const suffixStart = suffix
    ? chunk.toLowerCase().lastIndexOf(suffix.toLowerCase())
    : chunk.length;

  if (prefixEnd >= 0 && suffixStart > prefixEnd) {
    const before = chunk.substring(0, prefixEnd);
    const variable = chunk.substring(prefixEnd, suffixStart).trim();
    const after = chunk.substring(suffixStart);

    return (
      <>
        {before} <strong className="text-indigo-600">{variable}</strong> {after}
      </>
    );
  }

  return chunk;
}
```

---

## i18n

Add translations for the new UI strings:

```typescript
// English
'lesson.todaysPattern': "Today's pattern",
'lesson.youllLearnToSay': "You'll learn to say:",
'lesson.letsGo': "Let's go! 🚀",

// French
'lesson.todaysPattern': "Le modèle du jour",
'lesson.youllLearnToSay': "Tu vas apprendre à dire :",
'lesson.letsGo': "C'est parti ! 🚀",
```

---

## Acceptance Criteria

- [ ] Core frame card appears when `coreFrame` is available
- [ ] Frame shows target language + native language translation
- [ ] Variation list shows all chunks with translations
- [ ] Variable parts are visually highlighted (bold or colour)
- [ ] Personal context reference visible in at least one variation
- [ ] Falls back gracefully to plain list when `coreFrame` is not available
- [ ] "Let's go!" button starts the lesson
- [ ] Looks good on mobile (375px width minimum)
- [ ] i18n strings work for English and French

---

## Test Commands

```bash
# TypeScript compiles
npx tsc --noEmit

# Manual testing:
# 1. Generate a lesson with the new chunk family prompt
# 2. Verify start screen shows core frame card
# 3. Verify variations are listed with translations
# 4. Verify variable parts are highlighted
# 5. Test on mobile viewport
# 6. Test with a fallback/legacy lesson → plain list appears
```
