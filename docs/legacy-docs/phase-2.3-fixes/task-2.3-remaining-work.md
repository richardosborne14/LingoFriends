# Phase 2.3 — Remaining Work (Post-Audit)

**Date:** 2026-01-03  
**Source:** Phase 2.3 audit — three tasks were scoped but never implemented  
**Status:** 🔴 OPEN — blocks Phase 2.3 sign-off

---

## Context

Phase 2.3 was declared complete but three tasks were written up and never executed. These are
not optional polish — the phase acceptance criteria explicitly require all three:

| Task | Status | Why it matters |
|------|--------|----------------|
| 2.3.6 — AI Help UX | ❌ NOT DONE | Help panel takes over full screen; kids lose lesson context |
| 2.3.7 — STT on Translate | ❌ NOT DONE | Kids have to type in the target language with no voice option |
| 2.3.10 — Avatar redesign | ❌ NOT DONE | Avatars have creepy eyes and invisible mouths |

---

## Task A — 2.3.10: Avatar Mouths & Friendly Eyes

**Priority: 🔴 P1 — affects every screen with an avatar**

### Problem

`src/renderer/AvatarBuilder.ts` — the mouth exists in code but is far too small and uses
black material, making it invisible at normal zoom. The eyes have a pupil (0.015 radius) that
is tiny relative to the iris (0.032 radius) — the 47% ratio produces a "staring" look.
Girl hair side-strands are positioned inside the head radius and clip through.

### Fixes

**Mouth — make visible and friendly:**
- Replace the tiny black sphere with a wide pink oval shape (sphere scaled horizontally)
- Pink material (`#E8738A` rose-pink — matches chibi style)
- Scale: `(1.8, 0.7, 0.5)` — wide, slightly flattened, shallow depth
- Radius: 0.048 (vs current 0.035)
- Add a tiny dark line above it (the "upper lip") for definition

**Eyes — cuter, less intense:**
- Increase pupil radius: `0.022` (vs current 0.015) — bigger pupils = cuter in chibi style
- Slightly soften iris: radius `0.034` (vs 0.032) — slightly larger iris feels less stark
- Add a tiny white glint sphere at the top-left of the eye — the key "sparkle" detail that
  makes cartoon eyes look alive
- Sclera: unchanged at 0.048

**Girl hair side-strands — fix clipping:**
- Currently at `x = ±headRadius * 0.82 = ±0.213` (inside head radius 0.273 — clips)
- Fix: `x = ±headRadius * 1.05 = ±0.273` (at the edge of the head sphere)

### Files Changed
- `src/renderer/AvatarBuilder.ts` — `buildEye()`, mouth block in `buildAvatar()`, `addHair()`

---

## Task B — 2.3.7: STT Voice Input on Translate Activities

**Priority: 🟡 P2 — core feature for young/pre-literate learners**

### Problem

`Translate.tsx` only offers a text input. Kids are asked to type answers in a foreign language
they've just learned — this is particularly hard for younger or pre-literate users.
`HelpOverlay` already has working Web Speech API integration. We need to bring that same mic
capability into the Translate activity itself.

The target language (German, French, etc.) must be passed down from `LessonView` → `ActivityRouter`
→ `Translate` so STT uses the correct language code.

### Design

```
┌─────────────────────────────────────┐
│  Translate this phrase:             │
│  ┌─────────────────────────────┐   │
│  │  "Good morning"             │   │
│  └─────────────────────────────┘   │
│                                     │
│  🎤  Tap to speak your answer      │  ← PRIMARY (big, prominent button)
│  ── or type below ──               │  ← secondary option
│  ┌──────────────────────── [✓] ┐   │
│  │  Type here...               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Mic button states:**
- Default: large green mic button with "Tap to speak" label
- Listening: pulsing red button with "Listening..." label + waveform hint
- Got result: mic turns grey, text input populates with transcript
- Error: show "Try again" message, don't disable text input

**Language routing:**
- `LessonView` already has `targetLanguage` prop
- Add `targetLanguage?: TargetLanguage` to `ActivityRouterProps`
- Thread it through to `Translate`
- Use `toLanguageCode(targetLanguage)` for `recognition.lang`

### Files Changed
- `src/components/lesson/activities/Translate.tsx` — add mic state + STT logic
- `src/components/lesson/activities/ActivityRouter.tsx` — add + thread `targetLanguage`
- `src/components/lesson/LessonView.tsx` — pass `targetLanguage` to `<ActivityRouter>`

---

## Task C — 2.3.6: AI Help Panel → Inline Side Panel

**Priority: 🟡 P2 — UX regression (full screen takeover loses lesson context)**

### Problem

`HelpOverlay` uses `fixed inset-0 bg-black/50` — a full-screen modal that blacks out the
lesson. Kids have no reference to what they were doing. The lesson content should remain
visible while help is open.

The header help button (`💬`) is small and easy to miss. Kids who are stuck are the kids who
most need to find the button.

The per-activity "💬 Help" buttons show a static local `helpText` snippet. These are fine
as a quick hint but should also provide a clear path to open the full AI assistant.

### Design

**Side panel (replaces full-screen modal):**
```
┌────────────────────────┬───────────────────┐
│                        │  💬 AI Assistant  │
│   LESSON CONTENT       │  ─────────────── │
│   (still visible)      │  "Need help?"    │
│                        │  [suggestions]   │
│                        │  [conversation]  │
│                        │  [input bar]     │
└────────────────────────┴───────────────────┘
```

- Width: 340px on desktop, full-width bottom sheet on mobile (< 640px)
- Slides in from the right with spring animation
- Lesson content shifts left (or overlaps with semi-transparent edge) — don't need perfect
  layout shift; a 70% overlay is acceptable
- No backdrop — the lesson stays fully visible

**Header button — more prominent:**
- Larger hit target: `p-3` instead of `p-2`
- Friendly label: `💬 Help` (text + icon, not icon-only)
- Gentle pulse animation when user hasn't used help yet in the lesson
- Stop pulsing after first open

**Activity Help button — unified path:**
- Keep the per-activity "💬 Help" button for the local static hint (fast, no AI cost)
- Add a secondary "Ask AI 🤖" link below the hint text that calls `onOpenHelp`
- `onOpenHelp` threads from `LessonView` → `ActivityRouter` → individual activities

### Files Changed
- `src/components/lesson/HelpOverlay.tsx` — change to side-panel layout
- `src/components/lesson/LessonView.tsx` — pass `onOpenHelp` to `ActivityRouter`, update button style
- `src/components/lesson/activities/ActivityRouter.tsx` — thread `onOpenHelp`
- `src/components/lesson/activities/Translate.tsx` — add "Ask AI" link below hint
- (Optionally other activities: `FillBlank`, `MultipleChoice` — same pattern)

---

## Acceptance Criteria (Phase 2.3 complete when ALL ✅)

### 2.3.10 Avatar
- [ ] Avatars have visible pink mouth at rest (not a black dot)
- [ ] Avatars have big-pupil eyes with white glint sparkle
- [ ] Girl hair does not clip through head sides

### 2.3.7 STT Translate  
- [ ] Translate activity shows a large mic button as the primary interaction
- [ ] Tapping mic starts STT in the target language (German for German lessons)
- [ ] Transcript populates the text field when recognised
- [ ] Text input still available as fallback
- [ ] Works on Chrome/Safari on both desktop and mobile

### 2.3.6 Help UX
- [ ] Help panel is a side panel — lesson content remains visible while it's open
- [ ] Header help button has a text label "Help" and is easier to spot
- [ ] Header button has a pulse animation until first use

---

## Implementation Order

1. **2.3.10** (Avatar) — pure renderer change, zero risk of breaking lesson flow
2. **2.3.7** (STT) — prop threading + new UI in Translate, no existing code deleted
3. **2.3.6** (Help UX) — layout refactor of HelpOverlay, most contained change last

---

## Confidence Target: 8/10 per task before marking complete
