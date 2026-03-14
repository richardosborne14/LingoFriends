# Task 4.6: Tree Health & Decay

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 8/10
**Estimated Time:** 1.5h
**Dependencies:** Task 4.5 complete

---

## Mandatory Reads

1. `04-PEDAGOGY-SUMMARY.md` — SRS section: tree health decay = game manifestation of spaced repetition

---

## Objective

Implement tree health decay based on SRS review dates. Trees not reviewed on time lose health. Visual appearance changes with health level.

---

## Implementation

1. **Decay calculation:** On garden page load, for each tree: check last lesson date vs SRS schedule. If overdue: reduce health proportionally (e.g., 1 day overdue = -5 health, 7 days = -30). Health floors at 0.

2. **Visual health states:**
   - 70-100%: vibrant greens and pinks (cherry blossom)
   - 30-69%: muted colours, fewer leaves
   - 1-29%: brown/desaturated, bare branches starting
   - 0%: completely bare, grey trunk

3. **Health bar in TreePanel:** Green (>70%), yellow (30-70%), red (<30%).

4. **Recovery:** Completing a lesson restores health to 100% for that tree.

---

## Tests

```typescript
describe('Tree Health', () => {
  it('100% health when lesson completed on schedule', () => {});
  it('health decreases proportionally when overdue', () => {});
  it('health floors at 0 (never negative)', () => {});
  it('lesson completion restores health to 100%', () => {});
  it('visual state matches health percentage', () => {});
});
```

---

## Acceptance Criteria

- [ ] Decay calculation correct based on SRS dates
- [ ] Visual health matches percentage (4 states)
- [ ] Health bar in TreePanel is colour-coded
- [ ] Recovery on lesson completion
- [ ] Tests: 5/5 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
