# Task 3.3: Reward & Penalty Animations

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 3.2 complete

---

## Mandatory Reads

1. `01-DESIGN-SYSTEM.md` — Animation & Micro-interactions section, Lesson Completion sequence

---

## Objective

Create reward/penalty animation sequences and the animated SunDrop counter.

---

## Implementation

`src/lib/components/activities/RewardEffects.svelte`:
- **Correct:** Green flash (0.1 opacity, 400ms) → SunDrop floats up → counter increments → confetti burst (5-10 particles, coral+gold)
- **Wrong:** Red flash (0.15 opacity, 500ms) → screen shake (translateX, 400ms) → cracked SunDrop falls → counter decrements red
- **Lesson complete:** Background dims → confetti burst (30+ particles) → stars bounce in (staggered 200ms) → SunDrop total counts up → "Continue" slides up

`src/lib/components/activities/SunDropCounter.svelte`:
- Animated counter with ☀️ icon. Pulse on increment, shake on decrement. Never shows negative.

All animations respect `prefers-reduced-motion` — static states, no motion.

---

## Tests

```typescript
describe('RewardEffects', () => {
  it('renders success animation sequence', () => {});
  it('renders failure animation sequence', () => {});
  it('renders completion celebration', () => {});
  it('respects prefers-reduced-motion', () => {});
});
describe('SunDropCounter', () => {
  it('displays current count', () => {});
  it('never shows negative numbers', () => {});
});
```

---

## Acceptance Criteria

- [ ] All 3 animation sequences work
- [ ] Star rating correct (1/2/3)
- [ ] Reduced motion respected
- [ ] Counter never negative
- [ ] Tests: 6/6 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
