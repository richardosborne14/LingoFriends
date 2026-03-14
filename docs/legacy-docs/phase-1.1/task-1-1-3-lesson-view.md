# Task 1.1.3: Lesson View Container

**Status:** ✅ Complete
**Phase:** A (Core Mechanics)
**Dependencies:** Task 1.1.2 (Activity Components)
**Estimated Time:** 4-5 hours

---

## Objective

Build the main lesson gameplay container that orchestrates the full lesson flow: tutor messages, activity sequence, progress tracking, Sun Drop rewards/penalties, and lesson completion screen. This is the core learning experience.

---

## Deliverables

### Files Created
- ✅ `src/components/lesson/LessonView.tsx` — Main lesson container
- ✅ `src/components/lesson/TutorBubble.tsx` — Professor Finch message component
- ✅ `src/components/lesson/LessonComplete.tsx` — End-of-lesson screen
- ✅ `src/components/lesson/SunDropBurst.tsx` — Reward animation overlay
- ✅ `src/components/lesson/PenaltyBurst.tsx` — Wrong answer animation overlay
- ✅ `src/components/shared/SunDropIcon.tsx` — Custom SVG Sun Drop icon
- ✅ `src/components/lesson/SunDropCounter.tsx` — Header counter component
- ✅ `src/components/lesson/index.ts` — Barrel exports
- ✅ `src/components/shared/index.ts` — Updated barrel exports

### Note: HelpPanel
The HelpPanel functionality was already implemented in Task 1.1.2 as part of `ActivityWrapper.tsx`. This includes the help button and help text panel integrated into the activity wrapper.

---

## Lesson Flow

```
┌─────────────────────────────────────────┐
│  Header: Back | Progress Bar | Sun Drops│
├─────────────────────────────────────────┤
│                                         │
│  🐦 "Let's learn match day words!"      │  ← TutorBubble
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💬 Help              ☀️ 3       │   │  ← Activity Header
│  │                                 │   │
│  │ What does "le gardien" mean?   │   │  ← Activity (from Task 1.1.2)
│  │ [Goalkeeper] [Referee]          │   │
│  │ [Striker]    [Coach]            │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  Progress: ●●○○○○  2/6                  │
└─────────────────────────────────────────┘
```

---

## Component Specifications

### 1. LessonView.tsx ✅

**Props:**
```typescript
interface LessonViewProps {
  lesson: LessonPlan;           // From AI or predefined
  onComplete: (result: LessonResult) => void;
  onExit: () => void;
}

interface LessonResult {
  lessonId: string;
  sunDropsEarned: number;
  sunDropsMax: number;
  stars: number;
  stepsCompleted: number;
  stepsTotal: number;
}
```

**State:**
```typescript
interface LessonState {
  currentStepIndex: number;
  sunDropsEarned: number;
  showReward: boolean;
  showPenalty: boolean;
  rewardAmount: number;
  isComplete: boolean;
}
```

**Behavior:**
1. On mount, show first tutor text via TutorBubble
2. Route to activity via ActivityRouter
3. On activity complete, record Sun Drops, show burst animation
4. After burst, advance to next step
5. On final step complete, show LessonComplete screen

---

### 2. TutorBubble.tsx ✅

**Props:**
```typescript
interface TutorBubbleProps {
  text: string;
  avatar?: string;  // Default: 🐦 (Professor Finch)
  animate?: boolean; // Enable fade-in animation
}
```

**Visual:**
```
┌──────────────────────────────────┐
│ 🐦  ┌──────────────────────────┐ │
│     │ Let's learn match day    │ │
│     │ words!                   │ │
│     └──────────────────────────┘ │
└──────────────────────────────────┘
```

---

### 3. SunDropBurst.tsx ✅

**Props:**
```typescript
interface SunDropBurstProps {
  amount: number;
  onDone: () => void;
  visible?: boolean;
}
```

**Behavior:**
1. Full-screen overlay (pointer-events: none)
2. Golden burst appears with +X Sun Drops
3. Particle explosion animation (10 particles)
4. Auto-dismiss after 2 seconds

---

### 4. PenaltyBurst.tsx ✅

**Props:**
```typescript
interface PenaltyBurstProps {
  onDone: () => void;
  visible?: boolean;
}
```

**Behavior:**
1. Full-screen overlay
2. Red screen flash (0.15 opacity, 0.6s)
3. Red burst with broken Sun Drop icon and "−1 Sun Drop"
4. Falling heart break emojis (💔)
5. Auto-dismiss after 1.6 seconds

---

### 5. LessonComplete.tsx ✅

**Props:**
```typescript
interface LessonCompleteProps {
  sunDropsEarned: number;
  sunDropsMax: number;
  onContinue: () => void;
  onReplay: () => void;
  giftUnlocked?: GiftType | null;
}
```

**Features:**
- Trophy animation (🏆)
- Sun Drops earned / total
- Star rating (1-3, calculated from percentage)
- Gift unlocked card with "Send to friend" button
- "Back to Path" and "Replay" buttons

---

### 6. SunDropIcon.tsx ✅

**Props:**
```typescript
interface SunDropIconProps {
  size?: number;   // Default: 20
  glow?: boolean;  // Glow effect for rewards
  broken?: boolean; // For penalty display
}
```

**Variants:**
- **Normal:** Golden gradient with shine highlight
- **Glowing:** Add outer glow filter
- **Broken:** Red-tinted with crack line

---

### 7. SunDropCounter.tsx ✅

**Props:**
```typescript
interface SunDropCounterProps {
  count: number;
  showGlow?: boolean;
  className?: string;
}
```

**Behavior:**
- Display in header
- Animate count changes with Framer Motion
- Optional glow for recent changes

---

## Animation Timings

| Animation | Duration | Implementation |
|-----------|----------|----------------|
| Tutor bubble appear | 300ms | Framer Motion spring |
| Activity appear | 400ms | Framer Motion fade |
| Sun Drop burst | 2000ms | Spring + particles |
| Penalty burst | 1600ms | EaseOut + heart shards |
| Counter update | 300ms | AnimatePresence |

---

## Testing Checklist

- [x] Lesson loads with first tutor text
- [x] Activity appears with animation
- [x] Completing activity shows reward burst
- [x] Wrong answer shows penalty burst
- [x] Sun Drops accumulate correctly
- [x] Progress bar updates
- [x] Final step shows LessonComplete
- [x] Star rating calculated correctly (80%+ = 3 stars, 50%+ = 2 stars, <50% = 1 star)
- [x] Gift unlocked shown (placeholder for Task 1.1.11)
- [x] Replay resets lesson state
- [x] Back button returns to path
- [x] TypeScript compiles with no errors
- [x] All unit tests pass (104 tests)

### Unit Tests

Created `src/components/lesson/lesson.test.ts` with 23 tests covering:
- Star rating calculation (5 tests)
- Lesson progress calculation (2 tests)
- Sun Drop total calculation (3 tests)
- Activity difficulty integration (3 tests)
- Gift type availability (2 tests)
- Activity type display names (1 test)
- Lesson result integration (3 tests)
- Sun Drop earning scenarios (4 tests)

Total test coverage across all test files: **104 tests passing**
- `sunDropService.test.ts`: 55 tests
- `activities.test.ts`: 26 tests
- `lesson.test.ts`: 23 tests

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| LessonView container works | ✅ |
| All supporting components implemented | ✅ |
| Animations match prototype | ✅ |
| Sun Drop tracking accurate | ✅ |
| Activity integration works | ✅ |
| TypeScript compiles | ✅ |

---

## Implementation Notes

### Activity Component Contract
The LessonView expects activity components (from Task 1.1.2) to use the `ActivityProps` interface:
```typescript
interface ActivityProps {
  data: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;
}
```

### Gift System Placeholder
The LessonComplete component shows a default `water_drop` gift. This will be wired to the actual Gift System in Task 1.1.11.

### No Context Yet
The LessonView receives `lesson` as a prop. Future integration will use `useLesson` hook from Task 1.1.8.

---

## Reference

- **GAME_DESIGN.md** — Section 9 (Lesson View), Section 4 (Reward Architecture)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 7 (Implementation Order)
- **prototype-v4-final.jsx** — Components: `LessonView`, `SunDropBurst`, `PenaltyBurst`, `ActHdr`

---

## Notes for Future Tasks

- `LessonView` will receive `LessonPlan` from `useLesson` hook (Task 1.1.8)
- Gift unlock integration with Gift System (Task 1.1.11)
- Sound effects for rewards/penalties (Phase D)
- `LessonComplete` connects to backend for saving progress