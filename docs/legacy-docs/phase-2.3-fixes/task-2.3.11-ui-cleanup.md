# Task 2.3.11: UI Cleanup

**Status:** Complete
**Confidence:** 9/10
**Date:** 2026-01-03
**Completed:** 2026-01-03

## Objective

Remove the 🐦 pigeon emoji from lesson activity help text panels. The emoji appeared next to hint text in the inline help panel that slides in when a learner taps "💬 Help" during an activity — it looked out of place and cluttered the small panel.

## Bug Addressed

- **Bug 24:** Pigeon emoji (🐦) appearing next to lesson activity hint text. Should be removed — the hint text is self-explanatory and does not need a character icon inline.

*Note: The 🐦 in `TutorBubble.tsx` is Professor Finch's character avatar and is intentionally kept.*

## Root Cause

The 🐦 span was duplicated in two places:
1. **`ActivityWrapper.tsx` `HelpPanel` component** — the shared sliding help panel
2. **Each individual activity component** (6 files) — each had its own inline copy of the help text layout with `<span className="text-lg flex-shrink-0">🐦</span>`

## Fix Applied

Removed `<span className="text-lg flex-shrink-0">🐦</span>` from:
- `src/components/lesson/activities/ActivityWrapper.tsx` (HelpPanel)
- `src/components/lesson/activities/MultipleChoice.tsx`
- `src/components/lesson/activities/FillBlank.tsx`
- `src/components/lesson/activities/Translate.tsx`
- `src/components/lesson/activities/TrueFalse.tsx`
- `src/components/lesson/activities/MatchingPairs.tsx`
- `src/components/lesson/activities/WordArrange.tsx`

Used a single Node.js inline script to batch-remove the span from all 6 activity files simultaneously.

## Files Modified

7 files total (ActivityWrapper + 6 activity components).

## Confidence: 9/10

**Met:**
- [x] Pigeon emoji removed from all help panels
- [x] TutorBubble (Professor Finch character) left untouched
- [x] TypeScript compiles clean
- [x] No layout breakage (the `flex gap-2` container still works without the icon span)

**Concerns:**
- [ ] Visual regression not formally screenshot-tested — manual check recommended

**Deferred:**
- [ ] Consider replacing the pigeon icon with a generic lightbulb 💡 icon in Phase 3 if kids find the help panel hard to notice without a visual anchor
