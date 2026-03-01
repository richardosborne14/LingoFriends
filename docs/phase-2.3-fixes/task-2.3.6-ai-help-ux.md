# Task 2.3.6: AI Help & Assistant UX Overhaul

**Status:** Not Started
**Confidence:** —
**Date:** 2026-01-03

## Objective

Merge the separate "Help" button and "AI Assistant" button into a single, highly visible and inviting AI assistant entry point. Redesign the AI help panel to be an inline side-panel or overlay that keeps the lesson content visible — not a full-screen modal that takes over the entire experience.

## Bugs Addressed

- **Bug 7:** There are two separate buttons — a "Help" button and an AI assistant chat emoji button (top right). These should be merged into one. The AI assistant button should be the primary, unmissable entry point — large, visually inviting, encouraging learners to use it when confused.
- **Bug 11:** The AI help modal currently takes over the full screen, hiding the lesson activity being discussed. The learner loses context of what they were asking about. The help panel should be inline — visible alongside the lesson content, not replacing it.

## Design Intent

The AI assistant is a core feature that differentiates LingoFriends from other apps. Kids should feel like they have a friendly tutor right there with them. The entry point must:
- Be **impossible to miss** — large chat bubble emoji, bright inviting colour
- Feel **friendly and approachable** — "Confused? Ask me anything! 💬"
- Stay **contextually attached** — when open, the learner can still see the question/activity they're asking about

## What Needs to Be Built

### Step 1: Remove the separate "Help" button

The existing standalone Help button in the lesson view should be removed. All its functionality (explaining the question, providing hints, pronouncing the phrase) should be accessible through the unified AI assistant.

### Step 2: Redesign the AI Assistant Entry Point

Replace the current small emoji button with a larger, more prominent design:

```tsx
// Suggested design — a floating "Ask for help" button
<button
  className="fixed bottom-20 right-4 flex items-center gap-2 
             bg-amber-400 hover:bg-amber-500 text-white font-bold 
             rounded-full px-4 py-3 shadow-lg text-sm
             animate-bounce-subtle" // gentle bouncing to draw attention
  onClick={() => setHelpOpen(true)}
  aria-label="Ask your AI tutor for help"
>
  <span className="text-xl">💬</span>
  <span>Need help?</span>
</button>
```

Alternatively, the button can pulse/glow when the learner has been stuck on an activity for >30 seconds, proactively inviting them.

### Step 3: Inline / Side-Panel Layout

When the AI assistant panel opens, it should NOT replace the lesson view. Instead:

**On desktop:** A slide-in panel from the right side (30-40% of screen width), keeping the lesson activity visible on the left.

**On mobile:** A bottom drawer that reveals from the bottom of the screen (50-60% of screen height), keeping the lesson activity partially visible above.

```
Desktop Layout:
┌──────────────────┬────────────────┐
│                  │  AI Assistant  │
│  Lesson Activity │  ────────────  │
│  (still visible) │  [Chat area]   │
│                  │                │
│                  │  [Input box]   │
└──────────────────┴────────────────┘

Mobile Layout:
┌────────────────────────────────────┐
│         Lesson Activity            │
│           (partial view)           │
├────────────────────────────────────┤
│           AI Assistant             │
│    ──────────────────────────────  │
│    [Chat messages]                 │
│    [Input]              [Send]     │
└────────────────────────────────────┘
```

### Step 4: Context Awareness

When the AI panel opens, it should automatically send context about the current activity:
- What phrase/chunk is being learned
- What the current question is
- What the learner's answer attempt was (if any)

The AI should respond with a helpful, kid-friendly explanation tailored to the specific question they're on.

```typescript
// Auto-context message sent to AI when panel opens
const contextMessage = buildContextMessage({
  currentActivity,
  learnerAttempt,
  targetLanguage,
  nativeLanguage,
});
```

### Component Architecture

- **Rename** `HelpOverlay.tsx` → `AITutorPanel.tsx`
- **New position:** Fixed side panel (not modal portal)
- **Preserve** the existing chat history / conversation state from `HelpOverlay`
- **Remove** `HelpButton.tsx` (or equivalent standalone help button component)
- **Update** `LessonView.tsx` to render `AITutorPanel` in a side-panel layout instead of a full modal

## Files to Modify

- `src/components/lesson/HelpOverlay.tsx` → rename/refactor to `AITutorPanel.tsx`
- `src/components/lesson/LessonView.tsx` — integrate side-panel layout, remove old help button
- `src/components/navigation/AppHeader.tsx` — remove standalone AI assistant icon if present
- `src/services/helpService.ts` — ensure context-aware message building

## Decisions to Make

| Decision | Options | Recommended |
|----------|---------|-------------|
| Panel position (desktop) | Right side-panel vs. bottom drawer | Right side-panel on desktop, bottom drawer on mobile |
| Panel trigger animation | Slide-in vs. fade vs. instant | Slide-in (smooth, feels intentional) |
| Help button location | Top-right corner vs. floating bottom-right | Floating bottom-right — more inviting, thumb-reachable on mobile |
| Auto-open on stuck | Open after 30s of no progress vs. never auto-open | Suggest but don't force — show a pulse/glow after 30s |
| Chat history persistence | Per-activity vs. per-lesson vs. per-session | Per-lesson — clears when lesson ends |

## Testing

- [ ] Only ONE AI help entry point visible (no duplicate Help + AI buttons)
- [ ] AI assistant button is large, visible, and inviting
- [ ] Opening AI panel does NOT hide the lesson activity
- [ ] Desktop: side panel appears alongside lesson content
- [ ] Mobile: bottom drawer appears with lesson still visible above
- [ ] Panel closes cleanly and returns focus to lesson
- [ ] AI receives context about the current activity when panel opens
- [ ] Chat history persists within the lesson session

**Test scenarios:**
1. Open lesson, verify only one large AI assistant button visible
2. Tap AI button while on a question — panel opens, question still visible
3. Ask "What does this mean?" — AI answers in context of the current chunk
4. Close panel — return to question exactly where left off
5. On mobile: tap AI button — bottom drawer appears, partial lesson visible above

## Confidence Scoring

### Requirements to Meet
- [ ] Merged into single AI assistant button
- [ ] Button is large and visually inviting
- [ ] Panel is inline, not full-screen
- [ ] Lesson content remains visible when panel is open
- [ ] Context passed to AI automatically

### Concerns
- [ ] Side panel layout requires LessonView to support a split layout — this may need layout refactoring
- [ ] Bottom drawer on mobile may feel cramped on small screens — test on 375px width

### Deferred
- [ ] Proactive AI suggestions (auto-open after learner is stuck) → Phase 3
- [ ] AI tutor character with animated face in the panel → Phase 3
- [ ] Conversation history synced to PocketBase → Phase 3

## Notes for Future Tasks

The AI assistant panel is a key differentiator. In Phase 3, we want the AI tutor to have a personality and animated face in this panel. Keep the panel component structure clean and extensible for that.

## Learnings

TBD after implementation.
