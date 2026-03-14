# Task 3.2: Activity Components (8 Types)

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 6h
**Dependencies:** Task 3.1 complete

---

## Mandatory Reads

1. `01-DESIGN-SYSTEM.md` — Activity Component Styling section (MC options grid, fill-blank slot, matching columns, coaching chat layout)
2. `04-PEDAGOGY-SUMMARY.md` — coaching chat: any answer = encouraging, no wrong answers
3. `reference-mockup.jsx` — interactive reference for exact look

---

## Objective

Build all 8 activity type Svelte components. Each receives `ActivityConfig`, emits `onComplete(correct, sunDrops)` and `onWrong()`.

---

## Components (`src/lib/components/activities/`)

| # | Component | Key Behaviour |
|---|-----------|--------------|
| 1 | InfoActivity.svelte | Display phrase + translation + audio auto-play. "Got it!" button. 0 SunDrops. |
| 2 | MultipleChoiceActivity.svelte | 2×2 option grid. Correct=green✓, Wrong=red❌+shake, retry allowed (half reward). |
| 3 | FillBlankActivity.svelte | Sentence with ___ highlighted. Text input below. Case-insensitive matching. |
| 4 | TranslateActivity.svelte | Source phrase in sky-50 pill. Free-text input. Fuzzy matching (Levenshtein ≤1). |
| 5 | TrueFalseActivity.svelte | Statement + two large buttons ✓/✗. |
| 6 | WordArrangeActivity.svelte | Scrambled word chips. Tap-to-select + tap-destination (no drag). |
| 7 | MatchingActivity.svelte | Two shuffled columns. Tap left, tap right to match. SVG lines for matched pairs. |
| 8 | CoachingChatActivity.svelte | NPC avatar placeholder + speech bubble + discovery question. ANY answer = encouraging. 0 SunDrops. |

**Shared:** `ActivityRouter.svelte` switches on activity type. Help button on quiz activities (halves reward, shows helpText).

---

## 🤔 Decision Points for User

> **1. WordArrange:** Tap-to-select (reliable on mobile) or drag-and-drop (more intuitive, finicky on mobile)? Recommend tap-to-select.
>
> **2. Translate fuzzy matching:** How forgiving? Recommend case-insensitive + accent-insensitive + Levenshtein ≤1 for children.

---

## Tests (minimum 3 per component = 24 total)

```typescript
describe('MultipleChoiceActivity', () => {
  it('renders question and options', () => {});
  it('correct answer calls onComplete with SunDrops', () => {});
  it('wrong answer calls onWrong and allows retry', () => {});
});
// Repeat pattern for all 8 types
```

## 🖥️ Browser Verification

Create `/dev/activities` showcase page with mock data for all 8 types. Verify each:
- [ ] Renders correctly with design system styles
- [ ] Correct → green state
- [ ] Wrong → red + shake
- [ ] Touch targets ≥ 44×44px
- [ ] CoachingChat: any answer accepted, no penalty

---

## Acceptance Criteria

- [ ] All 8 activity types implemented
- [ ] Correct/wrong visual states per design system
- [ ] Help button halves reward
- [ ] Retry allowed after wrong
- [ ] SunDrop floor at 0
- [ ] CoachingChat: no wrong answers
- [ ] Tests: 24+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
