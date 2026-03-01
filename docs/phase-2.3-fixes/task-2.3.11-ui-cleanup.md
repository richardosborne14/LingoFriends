# Task 2.3.11: UI Cleanup — Remove Pigeon Emoji from Lesson Instructions

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Remove the pigeon/bird emoji avatar that appears next to the instruction text in the lesson step page. It looks out of place and doesn't serve a clear purpose in the lesson UI.

## Bug Addressed

- **Bug 14:** A pigeon or bird emoji (🐦 / 🕊️ / similar) appears next to the instructional text in the lesson step view. It was presumably added as a placeholder avatar or mascot indicator but was never removed. It looks quirky and confusing for learners — there's no explanation of why a pigeon is in the lesson.

## Root Cause

This is almost certainly a leftover from an earlier prototype where a mascot/NPC character delivered lesson instructions. The final design doesn't use a pigeon mascot — the AI assistant is the tutor, represented by the 💬 chat button (Task 2.3.6). The pigeon emoji should simply be deleted.

## What Needs to Be Built

This is a one-line fix. Find the component that renders lesson step instructions and remove the emoji.

### Locate the Emoji

Search for the pigeon emoji in the lesson components:

```bash
grep -r "🐦\|🕊️\|pigeon\|bird" src/components/lesson/ --include="*.tsx"
```

It may also be a generic avatar placeholder like `👤`, `🧑‍🏫`, or a custom emoji shortcode. Search broadly:

```bash
grep -r "emoji\|mascot\|avatar" src/components/lesson/ --include="*.tsx"
```

### Remove It

Once found, simply delete the emoji character or the surrounding `<span>` element that contains it.

```tsx
// Before (example):
<div className="instruction-header">
  <span>🐦</span>
  <p>Listen and repeat!</p>
</div>

// After:
<div className="instruction-header">
  <p>Listen and repeat!</p>
</div>
```

If the emoji is part of a `TutorBubble` component, check `src/components/lesson/TutorBubble.tsx` — it may be the mascot avatar in that component. Remove or hide the avatar image/emoji from TutorBubble if that's the case.

## Files to Investigate

- `src/components/lesson/LessonView.tsx` — main lesson layout
- `src/components/lesson/TutorBubble.tsx` — tutor speech bubble component (likely culprit)
- `src/components/lesson/activities/InfoDisplay.tsx` — INFO step display
- `src/components/lesson/activities/ActivityWrapper.tsx` — shared activity wrapper

## Testing

- [ ] No pigeon/bird emoji visible anywhere in the lesson step view
- [ ] Instruction text still displays correctly without the emoji
- [ ] No layout shift after removing the emoji (check spacing)
- [ ] `TutorBubble` component (if affected) still renders correctly without the avatar

**Test scenarios:**
1. Open a lesson step — no pigeon emoji visible in instructions ✓
2. Check INFO step, MULTIPLE_CHOICE step, FILL_BLANK step, TRANSLATE step — emoji absent from all ✓
3. No weird spacing or alignment issues where the emoji used to be ✓

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| What to replace pigeon with | Nothing vs. a small decorative icon | Nothing — clean is better. The AI assistant button (Task 2.3.6) is the tutor presence |

## Confidence Scoring

### Requirements to Meet
- [ ] Pigeon emoji removed
- [ ] No layout issues introduced

### Concerns
- None — this is a trivial one-line fix

### Deferred
- [ ] If a lesson mascot/tutor character is desired in future, design it properly → Phase 3

## Notes for Future Tasks

If a lesson mascot is reintroduced in Phase 3, it should be a designed character (not an emoji) consistent with the app's visual identity — probably the same AI tutor personality from the AI assistant panel (Task 2.3.6).

## Learnings

TBD after implementation.
