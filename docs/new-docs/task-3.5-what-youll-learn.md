# Task 3.5: "What You'll Learn" Screen

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 1.5h
**Dependencies:** Task 3.1 complete

---

## Objective

Build the pre-lesson screen showing the core frame and variations before lesson activities begin.

---

## Implementation

`src/lib/components/activities/WhatYoullLearn.svelte`:

- Core frame displayed at display size (heading-1), centered
- Variable slot highlighted with sky-50 pill
- Variation cards below showing each chunk with the variable part highlighted
- Native translation in bark-400 below each
- "Let's Go!" primary Button starts the lesson

---

## Tests

```typescript
describe('WhatYoullLearn', () => {
  it('displays core frame prominently', () => {});
  it('displays all chunk variations', () => {});
  it('highlights variable parts in sky-50', () => {});
  it('start button triggers lesson', () => {});
});
```

---

## Acceptance Criteria

- [ ] Core frame at display size
- [ ] Variables highlighted
- [ ] All chunks shown
- [ ] Button starts lesson
- [ ] Tests: 4/4 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
