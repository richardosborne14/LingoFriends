# TASK-AUDIT-03: Mid-Lesson Adaptive Injection

**Status:** 🔲 Not started
**Priority:** 🔴 Critical — the most painful pedagogy gap (stacked failures with no relief)
**Estimated Time:** 6–8 hours
**Dependencies:** None (can be parallelised with Phase A voice tasks)
**Audit Finding:** #3 — "The Affective Filter Is Monitored on Paper, Ignored in Code"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — "Adaptive Behaviour During a Lesson" table (the exact signals and responses we need to implement), Krashen's Affective Filter ("never stack multiple failures without an easy win"), Input Hypothesis (i+1 calibration)
3. `04-PEDAGOGY-SUMMARY.md` — teach-first 5-step progression, red flags
4. `LEARNINGS.md`

---

## Problem

The lesson plan is **fully pre-generated and static**. `assembleLessonPlan()` builds all steps before the lesson starts. Once generated, the step sequence never changes regardless of how the child performs.

**What happens now when a child struggles:**
1. Wrong answer → penalty modal → retry same question
2. Wrong again → penalty modal → retry same question
3. Wrong again → heart lost → penalty modal → retry
4. All 3 hearts lost → breather modal → hearts reset → **same question again**

PEDAGOGY.md explicitly says: "Never stack multiple failures without an easy win to restore confidence." The current code violates this on every struggling session.

**What happens now when a child is breezing:**
1. Correct → reward modal → next step
2. Correct → reward modal → next step
3. Correct → reward modal → next step (already knew this chunk)
4. ... 15 more steps of content they've already mastered

No acceleration. No skip. The child is bored, the affective filter rises, and they close the app.

---

## Goals

1. After 2 consecutive wrong answers on quiz steps: inject an "easy win" review step
2. After 3+ consecutive correct answers with fast response times: offer to skip ahead
3. Track mid-lesson emotional signals (consecutive failures, help usage, pause duration)
4. Never modify the pre-generated steps array — instead, maintain a dynamic overlay
5. Seamless UX: injected steps feel natural, not like the system is "going easy"

---

## Architecture

The key insight: **don't mutate the lesson plan**. Instead, create a `lessonAdapter` layer that sits between the lesson store and the UI, intercepting step transitions to inject or skip steps.

```
┌─────────────────────┐
│  Lesson Plan (fixed) │  ← Pre-generated, never modified
│  steps[0..N]         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Lesson Adapter      │  ← NEW: intercepts advanceStep()
│  - tracks signals    │     Decides: next planned step / inject review / skip ahead
│  - injects easy wins │
│  - offers skip-ahead │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ActivityRouter      │  ← Renders whatever step it receives
└─────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Emotional Signal Tracker

**Create `src/lib/services/lessonSignals.ts`:**

```typescript
/**
 * Tracks real-time learner signals during a lesson.
 *
 * These signals map directly to the PEDAGOGY.md "Adaptive Behaviour
 * During a Lesson" table. Each signal has a clear interpretation
 * and response action.
 *
 * The tracker is stateful (per-lesson) and is queried by the
 * lesson adapter to decide whether to inject/skip steps.
 */
export interface LessonSignals {
  /** Consecutive wrong answers (resets on correct) */
  consecutiveWrong: number;
  /** Consecutive correct answers (resets on wrong) */
  consecutiveCorrect: number;
  /** Total help button taps this lesson */
  helpUsedTotal: number;
  /** Average response time for quiz steps (ms) */
  avgResponseTimeMs: number;
  /** Response times for the last 3 steps (for trend detection) */
  recentResponseTimesMs: number[];
  /** Number of "easy win" steps already injected this lesson */
  easyWinsInjected: number;
  /** Number of steps skipped via skip-ahead */
  stepsSkipped: number;
  /** Whether the breather modal has been shown */
  breatherShown: boolean;
}

export function createSignalTracker(): LessonSignalTracker { ... }

export interface LessonSignalTracker {
  /** Call after each activity completion */
  recordAttempt(correct: boolean, responseTimeMs: number): void;
  /** Call when help is used */
  recordHelpUsed(): void;
  /** Call when breather is shown */
  recordBreather(): void;
  /** Get current signals snapshot */
  getSignals(): LessonSignals;
  /** Reset for new lesson */
  reset(): void;
}
```

### Step 2 — Adaptive Decision Engine

**Create `src/lib/services/lessonAdapter.ts`:**

```typescript
/**
 * Decides what to do at each step transition.
 *
 * Three possible decisions:
 *   'continue'    — proceed to next planned step (normal)
 *   'inject'      — insert an easy-win review step before the next planned step
 *   'skip_offer'  — show a "skip ahead?" prompt (child chooses)
 *
 * Decision rules (from PEDAGOGY.md):
 * ┌──────────────────────────┬──────────────────────────────────────────┐
 * │ Signal                   │ Response                                 │
 * ├──────────────────────────┼──────────────────────────────────────────┤
 * │ 2+ wrong in a row        │ Inject easy-win review of last correct  │
 * │ 3+ correct AND fast      │ Offer skip to next chunk                │
 * │ Help used + wrong        │ Inject easier variant of current chunk  │
 * │ Breather shown           │ Next step must be an easy win           │
 * └──────────────────────────┴──────────────────────────────────────────┘
 *
 * Safety rails:
 * - Max 3 easy wins per lesson (don't turn the lesson into a victory lap)
 * - Max 1 skip-ahead per lesson (still need to learn the content)
 * - Never inject during INFO or COACHING_CHAT steps (non-quiz, no failure possible)
 * - Never skip INFO steps (the child must SEE the content before being tested)
 */

export type AdaptiveDecision =
  | { action: 'continue' }
  | { action: 'inject'; step: LessonStep }
  | { action: 'skip_offer'; skipToIndex: number; skipDescription: string };

export function decideNextStep(
  signals: LessonSignals,
  currentStep: LessonStep,
  nextPlannedStep: LessonStep | null,
  allSteps: LessonStep[],
  currentIndex: number,
  /** Chunks already correctly answered (for building easy-win content) */
  masteredChunks: { targetPhrase: string; nativeTranslation: string }[],
): AdaptiveDecision { ... }
```

**Easy-win step builder:**

```typescript
/**
 * Build an easy-win step from a previously mastered chunk.
 *
 * The easy win is ALWAYS a multiple-choice recognition question
 * using a chunk the child already got right. This guarantees
 * they'll likely get it correct, restoring confidence.
 *
 * CRITICAL: The easy win must feel natural, not condescending.
 * Tutor text: "Quick review!" not "Here's an easy one because you're struggling."
 */
function buildEasyWinStep(
  masteredChunk: { targetPhrase: string; nativeTranslation: string },
): LessonStep {
  return {
    id: nanoid(),
    tutorText: "Quick review! 💪",
    helpText: `You learned this one! "${masteredChunk.targetPhrase}" means "${masteredChunk.nativeTranslation}".`,
    activity: {
      type: ActivityType.MULTIPLE_CHOICE,
      question: `What does "${masteredChunk.targetPhrase}" mean?`,
      options: [
        masteredChunk.nativeTranslation,
        // Generate 3 plausible distractors from other chunks in the lesson
        ...generateSimpleDistractors(masteredChunk, 3),
      ],
      correctIndex: 0, // Will be shuffled by the component
      targetPhrase: masteredChunk.targetPhrase,
    },
    sunDrops: 1, // Small reward — it's a confidence booster, not a big earner
  };
}
```

### Step 3 — Skip-Ahead Prompt Component

**Create `src/lib/components/lesson/SkipAheadPrompt.svelte`:**

```
┌──────────────────────────────────────────┐
│                                          │
│          🚀 You're on fire!              │
│                                          │
│   You're nailing this section!           │
│   Want to jump ahead to the next part?   │
│                                          │
│   [Skip ahead 🚀]     [Keep practising]  │
│                                          │
└──────────────────────────────────────────┘
```

- "Skip ahead" skips to the next chunk's INTRODUCE step (never skips INFO steps)
- "Keep practising" continues normally
- Only offered once per lesson (max)
- Tone: exciting, not dismissive ("you're too good for this" → "you're ready for a challenge!")

### Step 4 — Integrate into Lesson Store

**Modify `src/lib/stores/lesson.ts`:**

The `advanceStep()` function currently just increments `currentStepIndex`. Modify it to consult the adapter:

```typescript
/**
 * Advance to the next step — now with adaptive intelligence.
 *
 * Instead of blindly incrementing, we ask the lessonAdapter
 * what should happen next based on the child's performance signals.
 *
 * The three outcomes:
 *   continue → increment index normally
 *   inject   → push an easy-win step, render it, THEN increment
 *   skip_offer → set a flag, render SkipAheadPrompt, wait for choice
 */
export function advanceStep(): void {
  const signals = signalTracker.getSignals();
  const plan = get(lessonPlan);
  const index = get(currentStepIndex);

  if (!plan) return;

  const current = plan.steps[index];
  const next = plan.steps[index + 1] ?? null;
  const mastered = get(masteredChunks); // NEW derived store

  const decision = decideNextStep(signals, current, next, plan.steps, index, mastered);

  switch (decision.action) {
    case 'continue':
      currentStepIndex.update(i => i + 1);
      break;
    case 'inject':
      injectedStep.set(decision.step); // NEW store
      // Don't increment — render injected step first
      // After injected step completes, clear it and increment
      break;
    case 'skip_offer':
      skipOffer.set(decision); // NEW store
      // Render SkipAheadPrompt
      // If accepted: jump to skipToIndex
      // If declined: increment normally
      break;
  }
}
```

**New stores needed:**

```typescript
/** A dynamically injected step (easy win) — null when not active */
export const injectedStep = writable<LessonStep | null>(null);

/** A skip-ahead offer — null when not active */
export const skipOffer = writable<AdaptiveDecision | null>(null);

/** Chunks the child has answered correctly (for easy-win generation) */
export const masteredChunks = derived(
  [lessonResults],
  ([$results]) => $results.chunkResults
    .filter(cr => cr.correctOnFirstAttempt)
    .map(cr => ({ targetPhrase: cr.targetPhrase, nativeTranslation: cr.nativeTranslation }))
);

/** The signal tracker instance for the current lesson */
export const signalTracker = writable<LessonSignalTracker | null>(null);
```

### Step 5 — Wire into Lesson Page

**Modify `src/routes/(app)/lesson/[id]/+page.svelte`:**

In `handleActivityComplete`:

```typescript
function handleActivityComplete(correct: boolean, earnedSunDrops: number) {
  // Record the signal
  const tracker = get(signalTracker);
  const responseTime = Date.now() - stepStartTime;
  tracker?.recordAttempt(correct, responseTime);

  // ... existing reward/penalty logic ...

  // The advanceStep() function now consults the adapter internally
}
```

In the template, handle injected steps and skip offers:

```svelte
{#if $injectedStep}
  <!-- Render the easy-win step -->
  <ActivityRouter
    step={$injectedStep}
    targetLanguage={data.profile.targetLanguage}
    onComplete={handleInjectedComplete}
  />
{:else if $skipOffer}
  <!-- Render skip-ahead prompt -->
  <SkipAheadPrompt
    onSkip={() => handleSkip($skipOffer.skipToIndex)}
    onContinue={handleSkipDecline}
  />
{:else}
  <!-- Normal activity rendering -->
  <ActivityRouter ... />
{/if}
```

### Step 6 — Post-Breather Easy Win

**Modify the breather modal dismiss handler:**

When the child taps "Try Again" in the breather modal, the VERY NEXT step should be an easy win, not the same question they failed on. The adapter handles this via the `breatherShown` signal.

```typescript
function handleBreatherContinue() {
  restoreHearts();
  // Signal tracker records the breather
  get(signalTracker)?.recordBreather();
  // Next advanceStep() call will check breatherShown and inject an easy win
  advanceStep();
}
```

---

## 🤔 Decision Points for User

> **1. How many consecutive wrong answers trigger an easy win?**
> - **(A) 2 in a row** — aggressive, intervenes quickly
> - **(B) 3 in a row** — gives the child more chance to self-correct
> **Recommendation:** 2 in a row. The affective filter rises fast in children. Don't wait.

> **2. What constitutes "fast" for skip-ahead detection?**
> - **(A) Average response time < 3 seconds for last 3 questions** — very fast
> - **(B) Average response time < 5 seconds for last 3 questions** — moderately fast
> - **(C) Correct on first attempt for 4+ consecutive quiz steps** — ignore time, just accuracy
> **Recommendation:** Option C (accuracy-based) for MVP. Time-based is tricky with mobile latency.

> **3. Can the child retry the failed question after an easy win, or do they skip it?**
> - **(A) Return to the failed question** — they still need to learn it
> - **(B) Skip past it and catch it in SRS review** — reduces frustration
> **Recommendation:** Option A but with a hint pre-loaded. After the easy win restores confidence, the failed question reappears with the help text visible by default.

> **4. Should injected easy wins contribute to lesson completion %?**
> - **(A) Yes — they count toward the total** (lesson has variable length)
> - **(B) No — they're bonus, don't affect total** (progress bar stays accurate)
> **Recommendation:** Option B. The progress bar shows progress through the planned lesson. Injected steps are invisible to the progress calculation.

---

## Tests

```typescript
describe('LessonSignalTracker', () => {
  it('tracks consecutive wrong answers', () => {});
  it('resets consecutive wrong on correct answer', () => {});
  it('tracks consecutive correct answers', () => {});
  it('records help usage count', () => {});
  it('calculates average response time', () => {});
  it('records breather shown flag', () => {});
});

describe('lessonAdapter - decideNextStep', () => {
  it('returns continue when signals are normal', () => {});
  it('returns inject after 2 consecutive wrong', () => {});
  it('returns skip_offer after 4 consecutive correct', () => {});
  it('returns inject after breather modal', () => {});
  it('caps easy wins at 3 per lesson', () => {});
  it('caps skip offers at 1 per lesson', () => {});
  it('never injects during INFO steps', () => {});
  it('never skips past INFO steps', () => {});
  it('easy-win step uses a previously mastered chunk', () => {});
});

describe('SkipAheadPrompt', () => {
  it('renders encouraging skip message', () => {});
  it('calls onSkip when skip button tapped', () => {});
  it('calls onContinue when keep practising tapped', () => {});
});

describe('Integration - adaptive lesson flow', () => {
  it('injects easy win after 2 wrongs, then returns to failed question', () => {});
  it('skip-ahead jumps to next chunk INTRODUCE step', () => {});
  it('progress bar ignores injected steps', () => {});
});
```

---

## 🖥️ Browser Verification

1. Start a lesson → intentionally get 2 quiz answers wrong in a row
2. Verify: an easy review question appears (previously mastered chunk)
3. Get the easy win correct → encouraging modal
4. Verify: the failed question reappears (with help visible)
5. Start a fresh lesson → get everything right quickly
6. After 4+ correct in a row → "Skip ahead?" prompt appears
7. Accept → jumps to next chunk's INTRODUCE step
8. Decline → continues normally
9. Verify: progress bar doesn't jump on injected steps
10. Trigger breather modal → dismiss → verify next step is easy win

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/lib/services/lessonSignals.ts` — emotional signal tracker
- `src/lib/services/lessonAdapter.ts` — adaptive decision engine
- `src/lib/components/lesson/SkipAheadPrompt.svelte` — skip-ahead UI

**Modified files:**
- `src/lib/stores/lesson.ts` — new stores (injectedStep, skipOffer, masteredChunks, signalTracker), modified advanceStep()
- `src/routes/(app)/lesson/[id]/+page.svelte` — handle injected steps and skip offers, wire signal tracker
- `src/lib/i18n/en.json` + `fr.json` — easy win tutor text, skip-ahead prompt text

---

## Acceptance Criteria

- [ ] 2 consecutive wrong answers triggers easy-win injection
- [ ] Easy-win uses a previously mastered chunk (MC recognition)
- [ ] Easy-win tutor text is "Quick review!" not "You're struggling"
- [ ] After easy win, failed question reappears with help visible
- [ ] 4+ consecutive correct answers triggers skip-ahead offer
- [ ] Skip-ahead jumps to next chunk's INTRODUCE step (never skips INFO)
- [ ] Max 3 easy wins and 1 skip per lesson
- [ ] Post-breather step is always an easy win
- [ ] Progress bar ignores injected/skipped steps
- [ ] All text translated (en/fr)
- [ ] Tests: 15+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
