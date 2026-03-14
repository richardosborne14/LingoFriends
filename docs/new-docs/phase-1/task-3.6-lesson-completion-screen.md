# Task 3.6: Lesson Completion Screen

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 1.5h
**Dependencies:** Tasks 3.3, 3.4 complete

---

## Objective

Build the celebration screen shown after the last activity. Calls the lesson completion API and displays results.

---

## Implementation

`src/lib/components/activities/LessonComplete.svelte`:

1. On mount: call `POST /api/lessons/complete` with lesson results
2. Play celebration animation sequence (from Task 3.3)
3. Display star rating (1-3) with staggered bounce
4. SunDrop total counter counts up from 0 to earned amount
5. Tree growth preview (small tree icon advancing a growth stage)
6. If 3 stars: "You earned a gift! 🎁" (Phase 5 integration)
7. "Continue to Garden" primary Button → navigate to `/garden`

---

## Tests

```typescript
describe('LessonComplete', () => {
  it('displays star rating based on score', () => {});
  it('SunDrop counter counts up to earned total', () => {});
  it('calls completion API on mount', () => {});
  it('continue button navigates to garden', () => {});
  it('shows gift notification on 3 stars', () => {});
});
```

## 🖥️ Browser Verification (FULL LESSON FLOW)

Complete an entire lesson as dummy user:
1. Start lesson → "What You'll Learn"
2. Complete all activities (mix of correct/wrong)
3. **Verify:** completion screen with stars, SunDrops, celebration
4. Click "Continue" → back to garden
5. **Verify in DB:** lessonHistory record, updated SunDrops and streak

---

## Acceptance Criteria

- [ ] Celebration plays correctly
- [ ] Stars match score
- [ ] API called on mount
- [ ] Navigation to garden works
- [ ] DB updated after completion
- [ ] Tests: 5/5 passing
- [ ] Browser verification passed (full lesson flow)

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
