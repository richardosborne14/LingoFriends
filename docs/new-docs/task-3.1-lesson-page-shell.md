# Task 3.1: Lesson Page Shell

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Phase 2 complete and audited

---

## Mandatory Reads

1. `.clinerules`
2. `01-DESIGN-SYSTEM.md` — lesson layout spec, progress bar, SunDrop counter

---

## Objective

Build the lesson page container that manages the full lesson flow: loading → "What You'll Learn" → activity progression → completion.

---

## Implementation

**Route:** `src/routes/(app)/lesson/[id]/+page.svelte`

**State:** `src/lib/stores/lesson.ts` — Svelte stores for lessonPlan, currentStepIndex, lessonResults. Derived: currentStep, progress (0-1).

**Layout:** Fixed header with ← Back + progress bar + ☀️ counter. Activity area swaps per step. Action button area at bottom.

**Server load:** Fetch lesson plan from generation API. Show skeleton loader during fetch.

**Back button:** Confirmation modal "Are you sure? You'll lose your progress" (save-and-resume deferred).

---

## 🤔 Decision Point for User

> **Back button behavior:** (A) Lose progress with confirmation, (B) Save progress and allow resume later, (C) No back button during lessons. Recommend A for MVP — B needs session persistence (deferred). Confirm?

---

## Tests

```typescript
describe('Lesson Page', () => {
  it('renders loading skeleton initially', () => {});
  it('shows first activity after lesson loads', () => {});
  it('progress bar updates on step completion', () => {});
  it('back button shows confirmation modal', () => {});
});
```

## 🖥️ Browser Verification

1. Navigate to `/lesson/[test-id]` → skeleton loader visible
2. Lesson loads → "What You'll Learn" screen appears
3. Click "Start" → first activity renders
4. Click ← Back → confirmation modal appears

---

## Acceptance Criteria

- [ ] Lesson loads from API
- [ ] Progress bar updates
- [ ] SunDrop counter animates
- [ ] Back with confirmation
- [ ] Tests: 4/4 passing
- [ ] Browser verification passed

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
