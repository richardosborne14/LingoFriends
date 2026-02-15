# Task 1.1.2: Activity Components

**Status:** Complete
**Phase:** A (Core Mechanics)
**Dependencies:** Task 1.1.1 (Type Definitions & Sun Drop Service)
**Estimated Time:** 6-8 hours

---

## Objective

Build all 6 activity type components for lessons. Each activity must support help button, retry functionality, penalty callbacks, and half-reward on retry/help. These components replace the existing `ActivityWidget.tsx`.

---

## Deliverables

### Files to Create
- `src/components/lesson/activities/MultipleChoice.tsx`
- `src/components/lesson/activities/FillBlank.tsx`
- `src/components/lesson/activities/WordArrange.tsx`
- `src/components/lesson/activities/TrueFalse.tsx`
- `src/components/lesson/activities/MatchingPairs.tsx`
- `src/components/lesson/activities/Translate.tsx`
- `src/components/lesson/activities/ActivityRouter.tsx`

---

## Activity Types Overview

| Type | Sun Drops | Difficulty | Description |
|------|-----------|------------|-------------|
| Multiple Choice | 2-3 | Easy | Pick from 4 options |
| Fill in Blank | 2-3 | Easy-Medium | Complete sentence with missing word |
| Word Arrange | 3 | Medium | Arrange scrambled words into sentence |
| True/False | 1-2 | Easy | Binary choice on a statement |
| Matching Pairs | 3-4 | Medium | Connect 4 terms to definitions |
| Translate | 3 | Medium-Hard | Type translation of a phrase |

---

## Shared Component: Activity Wrapper

Each activity should share a common wrapper with:
- Help button (top-left)
- Sun Drop value indicator (top-right)
- Reduced reward indicator when retry/help used

```typescript
// Interface all activities must implement
interface ActivityProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;  // Called on wrong answer for penalty
}

interface ActivityState {
  attempts: number;      // Wrong attempts counter
  usedHelp: boolean;     // Whether help was used
  isRetry: boolean;      // Whether this is a retry after wrong
  isComplete: boolean;   // Whether activity is done
}
```

---

## Component Specifications

### 1. MultipleChoice.tsx

**Behavior:**
- Display question with 4 option buttons (2x2 grid on mobile)
- Tap option to select
- Correct: Show ✅, animate, call `onComplete()`
- Wrong: Shake animation, red flash, call `onWrong()`, allow retry
- Help button shows `helpText` in a blue panel
- Half value on retry or after help

**Visual Reference:** See prototype `MC` component

**Key Features:**
- Disabled state after correct
- Show correct answer on wrong (for learning)
- Reduced Sun Drop indicator when retry/help used

---

### 2. FillBlank.tsx

**Behavior:**
- Display sentence with `___` placeholder
- Text input for answer
- "Check" button to submit
- Hint text below (if provided in `data.hint`)
- Correct: Call `onComplete()`
- Wrong: Show "Not quite!", reveal correct answer, allow retry

**Visual Reference:** See prototype `FB` component

**Key Features:**
- Auto-focus input on mount
- Enter key submits
- Visual feedback on correct/wrong

---

### 3. WordArrange.tsx

**Behavior:**
- Display scrambled word chips at top
- Empty "drop zone" below
- Tap word chip to move it to answer zone
- Tap word in answer zone to move it back
- "Check" button to submit arrangement
- Shake animation on wrong
- Show correct answer on wrong

**Visual Reference:** See prototype `WA` component

**Key Features:**
- Motion animations for word chips
- Dashed border drop zone
- Clear visual distinction between available/used words

---

### 4. TrueFalse.tsx

**Behavior:**
- Display statement in a styled box
- Two large buttons: "True ✅" and "False ❌"
- Instant feedback on tap
- Simple and quick

**Visual Reference:** See prototype `TF` component

**Key Features:**
- Green/red button styling
- Immediate feedback
- No retry needed (instant feedback)

---

### 5. MatchingPairs.tsx

**Behavior:**
- Two columns: left terms, right definitions (shuffled)
- Tap left item to select
- Tap right item to pair
- Correct: Both turn green, lock in
- Wrong: Shake both, allow retry
- Complete when all 4 pairs matched

**Visual Reference:** See prototype `MA` component

**Key Features:**
- 4 pairs per activity
- Selected state styling
- Disabled state for matched pairs
- Progress indicator (X/4 matched)

---

### 6. Translate.tsx

**Behavior:**
- Display source phrase in target language (e.g., French)
- Text input for translation
- "Check" button to submit
- Accept multiple answers (array)
- Case-insensitive comparison
- Ignore punctuation for matching

**Visual Reference:** See prototype `TR` component

**Key Features:**
- Purple/blue styling for source phrase box
- Hint text if provided
- Show accepted answer on wrong

---

### 7. ActivityRouter.tsx

```typescript
/**
 * Routes to the correct activity component based on type.
 */
import { ActivityType } from '@/types/game';
import { ActivityConfig } from '@/types/game';
import MultipleChoice from './MultipleChoice';
import FillBlank from './FillBlank';
import WordArrange from './WordArrange';
import TrueFalse from './TrueFalse';
import MatchingPairs from './MatchingPairs';
import Translate from './Translate';

interface ActivityRouterProps {
  step: LessonStep;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}

export function ActivityRouter({ step, onComplete, onWrong }: ActivityRouterProps) {
  const props = {
    data: step.activity,
    helpText: step.helpText,
    onComplete,
    onWrong,
  };

  switch (step.activity.type) {
    case ActivityType.MULTIPLE_CHOICE:
      return <MultipleChoice {...props} />;
    case ActivityType.FILL_BLANK:
      return <FillBlank {...props} />;
    case ActivityType.WORD_ARRANGE:
      return <WordArrange {...props} />;
    case ActivityType.TRUE_FALSE:
      return <TrueFalse {...props} />;
    case ActivityType.MATCHING:
      return <MatchingPairs {...props} />;
    case ActivityType.TRANSLATE:
      return <Translate {...props} />;
    default:
      return <div>Unknown activity type</div>;
  }
}
```

---

## Shared UI Elements

### Sun Drop Value Indicator
```typescript
// Top-right corner of activity
// Shows Sun Drops available, with "(retry)" indicator if reduced
<div className="sun-drop-indicator">
  <SunDropIcon size={14} />
  <span>{reduced ? Math.ceil(sunDrops / 2) : sunDrops}</span>
  {reduced && <span className="text-xs">(retry)</span>}
</div>
```

### Help Button
```typescript
// Top-left corner of activity
<motion.button
  onClick={() => setShowHelp(true)}
  className="help-button"
>
  💬 Help
</motion.button>
```

### Help Panel
```typescript
// Blue panel that slides in when help is tapped
// Uses Framer Motion for animation
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 12 }}
  className="bg-sky-50 border-2 border-sky-200 rounded-lg p-3 mb-2"
>
  <span className="text-lg">🐦</span>
  <p>{helpText}</p>
  <button onClick={() => setShowHelp(false)}>✕</button>
</motion.div>
```

---

## Styling Guidelines

Follow the design system from `docs/design-system.md`:

- **Correct state:** Green background, green border, checkmark icon
- **Wrong state:** Red background, red border, shake animation
- **Buttons:** Use `Button` component from `components/ui/`
- **Motion:** Use Framer Motion for all animations
- **Typography:** Fredoka font family

---

## Testing Checklist

### Per Activity Type
- [x] Displays correctly with all required data
- [x] Correct answer triggers `onComplete()` with correct Sun Drops
- [x] Wrong answer triggers `onWrong()` and allows retry
- [x] Help button shows help text
- [x] After help, correct answer gives half Sun Drops
- [x] After wrong, correct answer gives half Sun Drops
- [x] Multiple wrong answers accumulate penalty
- [x] Cannot go below 0 Sun Drops for activity

### Integration
- [x] ActivityRouter correctly routes all 6 types
- [x] Animations play smoothly (Framer Motion)
- [x] Touch targets are 44x44px minimum
- [x] Works on mobile viewport (375px)

### Unit Tests
- [x] ActivityRouter utilities tested (`getActivityTypeName`, `requiresTextInput`, `getActivityDifficultyRange`)
- [x] Sun Drop calculation tested (full reward, retry reduction, help reduction, penalties)
- [x] All 81 tests passing (55 sunDropService + 26 activities)

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| All 6 activity types implemented | ✅ |
| ActivityRouter works | ✅ |
| Help button functional on all | ✅ |
| Retry/half-value logic correct | ✅ |
| Penalty callback fires on wrong | ✅ |
| Animations match prototype | ✅ |

---

## Implementation Summary

**Completed:** 2026-02-15

### Files Created
- `src/components/lesson/activities/MultipleChoice.tsx`
- `src/components/lesson/activities/FillBlank.tsx`
- `src/components/lesson/activities/WordArrange.tsx`
- `src/components/lesson/activities/TrueFalse.tsx`
- `src/components/lesson/activities/MatchingPairs.tsx`
- `src/components/lesson/activities/Translate.tsx`
- `src/components/lesson/activities/ActivityRouter.tsx`
- `src/components/lesson/activities/ActivityWrapper.tsx` (shared components)
- `src/components/lesson/activities/index.ts` (barrel exports)
- `src/components/lesson/activities/activities.test.ts` (unit tests)

### Test Results
- **Total tests:** 81 passing
- **sunDropService.test.ts:** 55 tests
- **activities.test.ts:** 26 tests

### Key Implementation Details
1. All activities use `calculateEarned()` from `sunDropService` for Sun Drop rewards
2. Half reward on retry or after using Help button
3. Wrong attempt penalties applied via wrongAttempts parameter
4. Framer Motion animations for shake (wrong answer) and scale (tap feedback)
5. Kid-friendly Duolingo-style UI with large touch targets
6. Type-safe with `ActivityConfig` interface from `src/types/game.ts`

---

## Reference

- **GAME_DESIGN.md** — Section 9 (Lesson View / Activity Types)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 7 (Implementation Order)
- **prototype-v4-final.jsx** — Components: `MC`, `FB`, `WA`, `TF`, `MA`, `TR`, `ActSwitch`

---

## Notes for Future Tasks

- Voice activities (`LISTEN_TYPE`, `SPEAK`) will be added in Phase 2
- Each activity should be tested with kids for clarity
- Consider adding sound effects for correct/wrong (Phase D)
- Activities will be wrapped by `LessonView` (Task 1.1.3)