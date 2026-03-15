# TASK-AUDIT-05: Post-Lesson Reflection

**Status:** 🔲 Not started
**Priority:** 🟠 High — completes the coaching cycle (REFLECT + PLAN are entirely missing)
**Estimated Time:** 3–4 hours
**Dependencies:** None (can be parallelised, but richer with TASK-AUDIT-04 live coaching)
**Audit Finding:** #2 — Coaching cycle incomplete (REFLECT and PLAN phases missing)

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — Language Coaching Methodology: "Self-Reflection and Metacognition" section, coaching cycle (CONNECT → EXPLORE → PRACTICE → REFLECT → PLAN), child adaptations table
3. `01-DESIGN-SYSTEM.md` — lesson completion sequence, celebration animations

---

## Problem

The coaching cycle in PEDAGOGY.md defines five phases: CONNECT → EXPLORE → PRACTICE → REFLECT → PLAN. Currently, only CONNECT (pre-lesson chat), EXPLORE (coaching intro), and PRACTICE (quiz activities) exist. REFLECT and PLAN are nowhere in the code.

After a lesson completes, the child sees: confetti → star rating → SunDrops count → "Continue" → garden. There is no moment where the child is asked "What did you learn?" or "What was tricky?" This means:
- No metacognitive development (children never learn to think about their learning)
- No emotional data collection (we don't know if the lesson felt easy, hard, or frustrating)
- No planning signal (the child has no say in what happens next)

---

## Goals

1. Post-lesson reflection screen after the completion celebration (before garden return)
2. Simple emoji-based emotional check-in: "How did that feel?" (😊 🤔 😤)
3. Optional "What was the trickiest part?" prompt (age-adaptive: buttons for young, text/voice for teens)
4. A simple "Next time I want to learn about..." interest nudge (PLAN phase)
5. All reflection data saved to lesson performance record for pedagogy engine use

---

## Step-by-Step Implementation

### Step 1 — Reflection Screen Component

**Create `src/lib/components/lesson/LessonReflection.svelte`:**

Shows after the CompletionScreen celebration, before navigating to garden.

```
┌──────────────────────────────────────────┐
│                                          │
│     How did that feel?                   │
│                                          │
│     😊              🤔              😤   │
│   That was         It was          That  │
│   fun!            tricky         was hard │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│     What was the trickiest part?         │
│     (ages 11+: free text/voice)          │
│     (ages 7-10: skip this, or buttons)   │
│                                          │
│     🔤 New words    📝 Remembering       │
│     🗣️ Saying it    🤷 Nothing, easy!    │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│     Next time, I'd like to learn about:  │
│     (optional, can skip)                 │
│                                          │
│     🎮 Gaming  ⚽ Sports  🐾 Animals     │
│     🎵 Music   🍕 Food    ✨ Surprise me! │
│                                          │
│     [Go to My Garden 🌳]                 │
│                                          │
└──────────────────────────────────────────┘
```

**Design rules:**
- The emoji check-in is MANDATORY (can't skip it — 1 tap, takes 1 second)
- "Trickiest part" is optional (skip button visible, or auto-skip for ages 7-10)
- "Next time" topic selection is optional (skip button, or "Surprise me!" as default)
- Total time on this screen: 5-15 seconds. Keep it fast.
- Tone: warm, not clinical. "How did that feel?" not "Rate your experience."

### Step 2 — Reflection Data Types

**Add to `src/lib/types/lesson.ts`:**

```typescript
export interface LessonReflection {
  /** Emotional response: 'happy' | 'thinking' | 'frustrated' */
  feeling: 'happy' | 'thinking' | 'frustrated';
  /** What was trickiest (optional) */
  trickiestPart?: 'new_words' | 'remembering' | 'pronunciation' | 'nothing' | string;
  /** Requested next topic (optional) */
  nextTopicRequest?: string;
  /** Timestamp */
  reflectedAt: string;
}
```

### Step 3 — Save Reflection to Lesson Completion

**Modify `src/routes/api/lessons/[id]/complete/+server.ts` (or equivalent):**

Add reflection data to the lesson completion payload:

```typescript
// Existing completion data:
const { treeId, lessonIndex, results } = await request.json();

// NEW: reflection data (optional — may arrive in a separate PATCH later)
const { reflection } = await request.json();

if (reflection) {
  await saveReflection(userId, lessonId, reflection);
  // Feed into pedagogy engine for next lesson planning:
  // - 'frustrated' → lower difficulty next time, offer review lesson
  // - 'happy' → maintain or increase difficulty
  // - 'thinking' → good challenge level, stay the course
  // - nextTopicRequest → use as interest signal for chunk generation
}
```

### Step 4 — Wire into Lesson Page

**Modify `src/routes/(app)/lesson/[id]/+page.svelte`:**

Add a new phase: `'reflection'` between `'complete'` and navigating to garden.

```typescript
export type LessonPhase = 'loading' | 'preview' | 'activity' | 'complete' | 'reflection' | 'error';
```

After CompletionScreen's "Continue" button is tapped:
```typescript
function handleCompletionContinue() {
  lessonPhase.set('reflection');
}

function handleReflectionComplete(reflection: LessonReflection) {
  // Save reflection (fire-and-forget — don't block navigation)
  saveReflectionToServer(reflection);
  // Navigate to garden
  goto('/garden');
}
```

### Step 5 — Age-Adaptive Interaction

**For ages 7-10:**
- Emoji check-in: 3 large emoji buttons (mandatory)
- Skip "trickiest part" automatically (too abstract for this age)
- Show "Next time" topic buttons with icons (optional)
- Total: 1-2 taps, done in 5 seconds

**For ages 11-14:**
- Emoji check-in: 3 emoji buttons (mandatory)
- "Trickiest part": 4 quick-tap option buttons (optional)
- "Next time" topic buttons (optional)
- Total: 2-3 taps, done in 10 seconds

**For ages 15-18:**
- Emoji check-in: 3 emoji buttons (mandatory)
- "Trickiest part": free text or voice input (optional)
- "Next time": free text input "What do you want to talk about?" (optional)
- Total: 10-15 seconds max

### Step 6 — Pedagogy Engine Integration

The reflection data feeds back into the learner profile for future lesson generation:

```typescript
/**
 * Process reflection data for pedagogy engine.
 *
 * Feeling signals:
 * - 'frustrated' → flag in learner profile, next lesson starts with easier
 *   content and extra encouragement. Maps to Krashen's rising affective filter.
 * - 'happy' → positive signal, maintain or increase i+1 calibration
 * - 'thinking' → perfect challenge level (the zone of proximal development)
 *
 * Trickiest part signals:
 * - 'pronunciation' → add more Speak It activities next time
 * - 'new_words' → slow down chunk introduction (2 chunks instead of 3)
 * - 'remembering' → schedule immediate SRS review for this lesson's chunks
 */
```

---

## 🤔 Decision Points for User

> **1. Is the emoji check-in mandatory or skippable?**
> - **(A) Mandatory** — 1 tap, takes 1 second, gives us essential emotional data
> - **(B) Skippable** — respects child autonomy but we lose the data
> **Recommendation:** Option A. It's one emoji tap. Even a frustrated kid can tap the angry face.

> **2. Should "frustrated" trigger an immediate intervention?**
> - **(A) Yes — if they tap 😤, show a warm message** ("It's okay! Tough lessons mean you're learning something new. Your tree will thank you! 🌱")
> - **(B) No — just save the data silently, adjust next lesson**
> **Recommendation:** Option A. Immediate warmth matters for affective filter management.

> **3. Where to show reflection — in CompletionScreen or as a separate screen?**
> - **(A) Integrated into CompletionScreen** (emoji row below the star rating)
> - **(B) Separate screen after CompletionScreen**
> **Recommendation:** Option B. The celebration and the reflection are different emotional beats. Don't mix confetti with "how do you feel?"

---

## Tests

```typescript
describe('LessonReflection', () => {
  it('renders emoji check-in with 3 options', () => {});
  it('emoji selection highlights the chosen one', () => {});
  it('trickiest part shows buttons for 7-10 age group', () => {});
  it('trickiest part shows text input for 15-18 age group', () => {});
  it('next topic shows interest buttons', () => {});
  it('Go to Garden navigates away', () => {});
  it('calls onComplete with reflection data', () => {});
  it('frustrated emoji shows warm intervention message', () => {});
});

describe('Reflection API', () => {
  it('saves reflection data to lesson performance', async () => {});
  it('handles missing optional fields', async () => {});
});
```

---

## 🖥️ Browser Verification

1. Complete a lesson → celebration plays
2. Tap "Continue" on celebration → reflection screen appears
3. Tap 😊 emoji → highlight, other emoji dim
4. Tap "🗣️ Saying it" for trickiest → highlights
5. Tap "⚽ Sports" for next topic → highlights
6. Tap "Go to My Garden" → navigates to garden
7. Test 😤 frustrated → warm message appears before continue
8. Verify data saved (check API response or DB)

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/lib/components/lesson/LessonReflection.svelte`

**Modified files:**
- `src/lib/types/lesson.ts` — add `LessonReflection` type, add `'reflection'` to `LessonPhase`
- `src/lib/stores/lesson.ts` — add reflection phase support
- `src/routes/(app)/lesson/[id]/+page.svelte` — wire reflection between completion and navigation
- `src/routes/api/lessons/[id]/complete/+server.ts` — accept and save reflection data
- `src/lib/i18n/en.json` + `fr.json` — reflection screen strings

---

## Acceptance Criteria

- [ ] Reflection screen appears after lesson completion celebration
- [ ] Emoji check-in works (1 tap, mandatory)
- [ ] Trickiest part adapts to age group (buttons for 7-10, text for 15-18)
- [ ] Next topic request captured (optional)
- [ ] 😤 frustrated triggers warm intervention message
- [ ] Reflection data saved to server
- [ ] "Go to Garden" navigates correctly
- [ ] Total screen time under 15 seconds for any age group
- [ ] All text translated (en/fr)
- [ ] Tests: 10+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
