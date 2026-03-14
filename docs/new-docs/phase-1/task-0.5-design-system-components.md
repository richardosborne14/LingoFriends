# Task 0.5: Design System Components

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 8/10
**Estimated Time:** 2.5h
**Dependencies:** Task 0.1 complete (Tailwind configured)
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules` — Rule 7 (50% comments)
2. `01-DESIGN-SYSTEM.md` — FULL document. Every component spec, every colour token, every animation, every shadow. This is your bible for this task.
3. `reference-mockup.jsx` — Open in a React playground to see the exact target look.

---

## Objective

Build the 10 core UI primitives that every page in the app will use. These must match the design system exactly — colours, shadows, radii, typography, animations.

---

## Components to Build

Create each in `src/lib/components/ui/`:

### 1. Button.svelte
- **Variants:** primary (coral-400 bg, btn-coral shadow, white text), secondary (forest-400 bg, btn-forest shadow), ghost (transparent bg, bark-200 border, btn-ghost shadow), danger (red bg)
- **3D push effect:** `shadow-btn-coral` on idle, `shadow-none translate-y-1` on `:active`
- **States:** default, hover (darken bg), active (push down), disabled (bark-200 bg, no shadow, cursor-not-allowed)
- **Props:** `variant`, `size` ('sm'|'md'|'lg'), `disabled`, `fullWidth`, `type`

### 2. Card.svelte
- **Variants:** standard (white bg, shadow-card, rounded-card), elevated (shadow-card-elevated, coral tint border)
- **Props:** `variant`, `padding` (boolean)

### 3. Input.svelte
- **Styling:** bark-50 bg, bark-200 border, rounded-input, coral focus ring (`ring-2 ring-coral-400`)
- **Error state:** red border, error message below
- **Password toggle:** show/hide eye icon
- **Props:** `type`, `label`, `error`, `placeholder`, `value`

### 4. Chip.svelte
- **Selectable tag** for interests grid in onboarding
- **Unselected:** bark-100 bg, bark-300 border
- **Selected:** coral-100 bg, coral-400 border, coral-600 text
- **Props:** `label`, `selected`, `onToggle`

### 5. ProgressBar.svelte
- **Gradient fill:** coral-400 → sundrop-400
- **Animated width** transition (300ms ease-out)
- **Props:** `progress` (0-1), `showLabel` (boolean)

### 6. Badge.svelte
- **Small label** — for SunDrop counts, streak counts
- **Variants:** default (bark-100 bg), coral, forest, sundrop
- **Props:** `variant`, `icon` (optional emoji/Lucide icon)

### 7. Modal.svelte
- **Centered overlay** with bark-800/30 backdrop
- **Enter/exit animation:** scale 0.95→1 + opacity 0→1 (200ms ease)
- **Close on backdrop click** and Escape key
- **Props:** `open`, `onClose`, `title`

### 8. BottomSheet.svelte
- **Mobile bottom sheet** with drag handle
- **Slides up from bottom** (transform translateY animation)
- **Drag to dismiss** (optional)
- **Props:** `open`, `onClose`, `snapPoints` (optional)

### 9. Toast.svelte
- **Notification** with auto-dismiss (3s default)
- **Variants:** info (sky), success (forest), warning (sundrop), error (red)
- **Slides in from top-right**
- **Props:** `message`, `variant`, `duration`

### 10. Skeleton.svelte
- **Shimmer loading placeholder**
- **Animation:** `background: linear-gradient(90deg, bark-100 25%, bark-50 50%, bark-100 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;`
- **Props:** `width`, `height`, `rounded` (boolean)

---

## 🤔 Decision Point for User

> **Animation approach:** Should I use:
> - **(A) CSS transitions/animations only** — simpler, lighter, covers all design system specs
> - **(B) Svelte built-in transitions** (`transition:slide`, `transition:fade`) — more Svelte-idiomatic, handles mount/unmount
> - **(C) svelte-motion library** — most powerful, heavier dependency
>
> **My recommendation:** Combination of A + B. CSS for hover/active states, Svelte transitions for mount/unmount (Modal, BottomSheet, Toast). No external library needed.

---

## Tests

```typescript
// src/tests/components/ui/Button.test.ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from '$lib/components/ui/Button.svelte';

describe('Button', () => {
  it('renders with text', () => {
    const { getByRole } = render(Button, { props: { children: 'Click me' } });
    expect(getByRole('button')).toBeTruthy();
  });

  it('applies primary variant classes by default', () => {
    const { getByRole } = render(Button, { props: { children: 'Primary' } });
    const btn = getByRole('button');
    expect(btn.className).toContain('bg-coral-400');
  });

  it('is disabled when disabled prop true', () => {
    const { getByRole } = render(Button, { props: { children: 'Disabled', disabled: true } });
    expect(getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('fires click event', async () => {
    let clicked = false;
    const { getByRole } = render(Button, {
      props: { children: 'Click', onclick: () => { clicked = true; } },
    });
    await fireEvent.click(getByRole('button'));
    expect(clicked).toBe(true);
  });
});

// Similar structure for each component — minimum 2 tests each
// Total: 20+ tests across all 10 components
```

### Test Command
```bash
npx vitest run src/tests/components/ui/
```

---

## 🖥️ Browser Verification

Create a dev showcase page at `src/routes/dev/components/+page.svelte` that renders ALL components in ALL states. This page stays in the codebase during development (delete before production deploy).

**Showcase layout:** Each component gets a section with its name, all variants side by side, and interactive states.

After building, open in browser and verify:

- [ ] Primary button: coral-400 bg, white text, 3D shadow, depresses on click
- [ ] Ghost button: transparent bg, bark-200 border, outline style
- [ ] Input: bark-50 bg, coral focus ring appears on focus
- [ ] Input error state: red border, error text below
- [ ] Chip: toggles between unselected (grey) and selected (coral)
- [ ] ProgressBar: gradient fill animates when value changes
- [ ] Modal: fades in with backdrop, closes on Escape
- [ ] BottomSheet: slides up from bottom
- [ ] Toast: appears top-right, auto-dismisses
- [ ] Skeleton: shimmer animation visible

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] All 10 components created in `src/lib/components/ui/`
- [ ] Each component uses Tailwind tokens from design system (no hardcoded colours)
- [ ] Hover/active/disabled states implemented
- [ ] Animations respect `prefers-reduced-motion`
- [ ] All interactive elements have `aria-label` or equivalent
- [ ] Keyboard accessible (Tab navigation, Enter/Space activation)
- [ ] Dev showcase page renders all components
- [ ] Browser verification passed
- [ ] Tests: 20+ passing (2 per component minimum)
- [ ] Every component file has 50%+ comments (docstrings, prop explanations)

---

## Barrel Export

Create `src/lib/components/ui/index.ts`:
```typescript
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Input } from './Input.svelte';
// ... all 10
```

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|

**Tests:** ___/___ passing

**Notes for Future Tasks:** ___
