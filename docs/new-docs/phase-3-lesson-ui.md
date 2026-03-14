# Phase 3: Lesson UI

**Status:** 🔲 Not started
**Estimated Time:** 14–20 hours
**Dependencies:** Phase 2 complete (lesson engine generates valid plans)
**Output:** Fully interactive lesson experience with all activity types, rewards, and audio

---

## Task 3.1: Lesson Page Shell (2h)

### What to Do

**Route:** `src/routes/(app)/lesson/[id]/+page.svelte`

The lesson page manages the full lesson flow:

1. **Loading state** — skeleton loader while lesson generates
2. **"What You'll Learn" screen** — shows core frame + variations before lesson starts
3. **Activity progression** — steps through lesson plan one activity at a time
4. **Completion screen** — star rating, SunDrops earned, tree growth animation

**State management** (`src/lib/stores/lesson.ts`):
```typescript
import { writable, derived } from 'svelte/store';

export const lessonPlan = writable<LessonPlan | null>(null);
export const currentStepIndex = writable(0);
export const lessonResults = writable<LessonResults>({
  sunDropsEarned: 0,
  sunDropsMax: 0,
  correctCount: 0,
  wrongCount: 0,
  helpUsed: 0,
  startTime: Date.now(),
});

export const currentStep = derived(
  [lessonPlan, currentStepIndex],
  ([$plan, $index]) => $plan?.steps[$index] ?? null
);

export const progress = derived(
  [lessonPlan, currentStepIndex],
  ([$plan, $index]) => $plan ? $index / $plan.steps.length : 0
);
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  ← Back    [████████░░░░░] 5/16    ☀️ 12 │  ← Progress bar + SunDrop counter
├─────────────────────────────────────────┤
│                                         │
│         [NPC Avatar — 80×80px]          │  ← Only on coaching/teach steps
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     Activity Component Area       │  │  ← Swaps per step
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│        [Action Button Area]             │  ← "Check", "Continue", etc.
└─────────────────────────────────────────┘
```

### Acceptance Criteria
- [ ] Lesson loads from API and displays first step
- [ ] Progress bar updates as steps complete
- [ ] SunDrop counter animates on earn/loss
- [ ] Back button returns to garden (with confirmation modal if mid-lesson)
- [ ] Skeleton loader shows during generation

---

## Task 3.2: Activity Components (6h)

### What to Do

Create one Svelte component per activity type in `src/lib/components/activities/`:

**Shared interface:**
```typescript
// Each activity component receives:
interface ActivityProps {
  config: ActivityConfig;
  helpText: string;
  onComplete: (correct: boolean, sunDropsEarned: number) => void;
  onWrong: () => void;  // Triggers penalty animation
  audioMap?: Record<string, string>;  // Pre-generated TTS audio (base64)
}
```

### 1. InfoActivity.svelte (INTRODUCE step)

- Display target phrase prominently (display size, bark-800 on sky-50 pill)
- Native translation below (body-lg, bark-400)
- Explanation text (body, bark-500)
- Audio play button — auto-plays on mount if audio available
- "Got it!" primary button → completes with 0 SunDrops
- No penalty possible

### 2. MultipleChoiceActivity.svelte (RECOGNIZE + APPLY steps)

- Question text (heading-1)
- 4 option buttons in 2×2 grid (Ghost Button style)
- Tap to select:
  - Correct: button turns forest, ✅ appears, bounce animation, earn SunDrops
  - Wrong: button turns red, ❌ appears, shake animation, -1 SunDrop, can retry
- Help button (💡) in header — opens help text in a slide-down panel
  - Using help → subsequent correct answer earns half SunDrops
- Retry on wrong: same question, can keep trying (each wrong costs -1, floor at 0)
- After correct, 900ms delay then auto-advance

### 3. FillBlankActivity.svelte (PRACTICE step)

- Display sentence with blank highlighted: `"Ich ___________ Max"`
- Blank slot: dashed border (coral-400), coral-50 background
- Text input below, auto-focused
- "Check" button (primary) appears when input is non-empty
- Correct: input turns green, ✅, bounce
- Wrong: input turns red, shake, -1 SunDrop
- Case-insensitive comparison
- Help available (half reward)

### 4. TranslateActivity.svelte (RECALL step)

- Source phrase in sky-50 pill (heading-2)
- "Translate to {targetLanguage}:" label
- Text input, auto-focused
- "Check" button
- Comparison: case-insensitive, trim whitespace, check against `correctAnswer` + `acceptedAnswers`
- Fuzzy tolerance: allow minor typos (Levenshtein distance ≤ 2 for words > 4 chars)
- Help available

### 5. TrueFalseActivity.svelte

- Statement displayed in bark-100 card (heading-2, centered)
- Two large buttons: "True ✅" and "False ❌"
- Correct/wrong feedback same as multiple choice
- Help available

### 6. WordArrangeActivity.svelte

- Target sentence shown briefly (2 seconds flash) then hidden
- Scrambled words as draggable chips at bottom
- Drop zone at top shows placed words in order
- Tap a chip to place it next (no drag required — tap is easier for kids)
- Tap a placed word to remove it
- "Check" button when all words placed
- Correct: all words green, bounce
- Wrong: shake, show correct sentence briefly, -1 SunDrop

### 7. MatchingActivity.svelte

- Two columns: left (target language), right (native language)
- Both columns shuffled independently
- Tap left item, then tap right item to match
- Correct match: both items turn green, line drawn between them (SVG)
- Wrong match: both items shake red, then reset
- Complete when all pairs matched
- SunDrops based on first-attempt matches

### 8. CoachingChatActivity.svelte

- NPC avatar (80×80) on left
- Speech bubble with coaching text (body-lg)
- Target language words highlighted inline (sky-50 pill + bold)
- Audio auto-plays coaching text via TTS
- After audio, discovery question appears:
  - Ages 7-10: Multiple choice buttons (3 options)
  - Ages 11-14: Buttons OR text input
  - Ages 15-18: Text input only
- ANY answer gets encouraging response (no wrong answers)
- No SunDrops (coaching is free)
- "Continue" button after discovery

### Acceptance Criteria (per component)
- [ ] Renders correctly with test data
- [ ] Correct answer triggers success animation + SunDrops
- [ ] Wrong answer triggers penalty animation + -1 SunDrop + retry
- [ ] Help button works (shows help text, flags half reward)
- [ ] SunDrop floor at 0 (never negative)
- [ ] Touch targets ≥ 44×44px
- [ ] Keyboard accessible
- [ ] Uses design system colors and typography

---

## Task 3.3: Penalty & Reward Animations (2h)

### What to Do

Create `src/lib/components/activities/RewardEffects.svelte`:

**Correct answer sequence:**
1. Green flash overlay (0.1 opacity, 400ms)
2. SunDrop icon floats up from answer position → counter in header
3. Counter number animates incrementing
4. Brief confetti burst (5-10 particles, coral + gold)

**Wrong answer sequence:**
1. Red flash overlay (0.15 opacity, 500ms)
2. Screen shakes (translateX oscillation, 400ms)
3. Broken SunDrop icon (cracked ☀️) falls from counter
4. Counter number animates decrementing, briefly turns red
5. If tree is visible: tree shakes, brown leaf falls

**Lesson completion celebration:**
1. Background dims (bark-800 at 0.3 opacity)
2. Confetti burst from bottom (30+ particles, multi-color)
3. Star rating bounces in (1-3 stars, staggered 200ms)
4. SunDrop total counter counts up from 0 to earned amount
5. "Continue" button slides up from bottom

Create `src/lib/components/activities/SunDropCounter.svelte`:
- Animated counter with ☀️ icon
- Pulse on increment, shake on decrement
- Shows current earned / total available

### Acceptance Criteria
- [ ] Correct answer plays full success sequence
- [ ] Wrong answer plays full failure sequence
- [ ] Lesson completion plays celebration
- [ ] Star rating appears correctly (1/2/3 based on score)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Counter never shows negative numbers

---

## Task 3.4: Audio Integration (2h)

### What to Do

Create `src/lib/services/audioService.ts`:

```typescript
export function playAudio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audio.onended = () => resolve();
    audio.onerror = (e) => reject(e);
    audio.play().catch(reject);
  });
}

export function playAudioIfAvailable(
  text: string,
  audioMap: Record<string, string>
): Promise<void> {
  const audio = audioMap[text];
  if (audio) return playAudio(audio);
  return Promise.resolve(); // Silent fallback
}
```

**TTS API route** (`src/routes/api/tts/+server.ts`):
```typescript
// Proxy to Google Cloud TTS
// Voice ALWAYS set to target language (Rule 7)
// Returns base64 audio
```

**Integration points:**
- INFO steps: auto-play target phrase audio on mount
- COACHING_CHAT steps: auto-play coaching text
- MULTIPLE_CHOICE correct answer: play target phrase as reinforcement
- All teach steps: show replay button (🔊)

### Acceptance Criteria
- [ ] Audio plays automatically on INFO steps
- [ ] Audio plays on coaching steps
- [ ] Replay button works
- [ ] No audio → no error (graceful silent fallback)
- [ ] TTS voice is ALWAYS target language

---

## Task 3.5: "What You'll Learn" Screen (1.5h)

### What to Do

Create `src/lib/components/activities/WhatYoullLearn.svelte`:

Displayed before the lesson starts, showing the core frame and variations.

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│       What You'll Learn                 │  ← heading-1
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  "Ich heiße ___"                  │  │  ← Core frame, display size
│  │   My name is ___                  │  │  ← Translation, bark-400
│  └───────────────────────────────────┘  │
│                                         │
│  You'll learn to say:                   │
│                                         │
│  • "Ich heiße Max"  →  My name is Max  │  ← List of variations
│  • "Ich heiße Luna" →  My name is Luna │
│  • "Ich heiße Professor Keks"          │
│    →  My name is Professor Cookie       │
│                                         │
│  Variable parts highlighted in coral    │
│                                         │
│      [ Start Lesson 🚀 ]               │  ← Primary button
└─────────────────────────────────────────┘
```

**Variable highlighting:** Compare each variation to the core frame. The part that differs from the frame gets wrapped in a `<span>` with coral-400 color and coral-50 background.

### Acceptance Criteria
- [ ] Core frame card renders prominently
- [ ] All variations listed with translations
- [ ] Variable parts highlighted in coral
- [ ] "Start Lesson" button begins the activity sequence
- [ ] Falls back to simple list if no coreFrame in lesson data
