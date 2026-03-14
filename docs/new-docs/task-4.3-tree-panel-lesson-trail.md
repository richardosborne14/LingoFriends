# Task 4.3: Tree Panel & Lesson Trail

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 4.1 complete

---

## Objective

When a tree is tapped, a BottomSheet slides up showing tree stats and a lesson trail (vertical connected nodes with completion states).

---

## Implementation

`src/lib/components/garden/TreePanel.svelte`:
- Tree stats: name, health bar (colour-coded), growth stage, skill path
- Lesson trail: vertical dotted line with circle nodes. Green✓ (completed), coral pulse (current), grey🔒 (locked)
- Tap completed → replay. Tap current → navigate to `/lesson/[id]`. Tap locked → "Complete previous first"
- Dismiss on swipe-down or close button

---

## Tests

```typescript
describe('TreePanel', () => {
  it('renders tree stats correctly', () => {});
  it('shows lesson trail with correct states', () => {});
  it('current lesson navigates on tap', () => {});
  it('locked lesson shows message', () => {});
});
```

## 🖥️ Browser Verification

1. Navigate to `/garden` → tap a tree
2. Panel slides up with tree info and lesson trail
3. Tap current lesson → navigate to lesson page

---

## Acceptance Criteria

- [ ] Panel appears on tree tap
- [ ] Stats correct from DB
- [ ] Trail states correct (completed/current/locked)
- [ ] Navigation works
- [ ] Tests: 4/4 passing
- [ ] Browser verification passed

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
