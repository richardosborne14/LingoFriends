# TASK-FUN-01: Lesson UX Fixes — Resubmit Window & Type-Instead Dead End

**Status:** ✅ Complete (17 July 2026) — verified end-to-end via Playwright drive; confidence 9/10
**Priority:** 🔴 Critical — kids hit both bugs in their first lesson
**Estimated Time:** 4–6 hours
**Dependencies:** None — ship before everything else
**Playtest Finding:** #4 and #5 (July 2026 playtest)

---

## Mandatory Reads

1. `.clinerules` (always)
2. `src/routes/(app)/lesson/[id]/+page.svelte` — activity → modal → advance flow (header comment documents it)
3. `src/lib/stores/micPermission.ts` — the `text_only` mode contract
4. `src/lib/components/activities/SpeakItActivity.svelte` — current mic-or-skip state machine
5. `src/lib/utils/answerMatcher.ts` — existing fuzzy text comparison (reuse, don't reinvent)

---

## Problem 1: The Resubmit Window

After a correct answer, the flow is: activity fires `onComplete` → `setPendingReward` → RewardModal shows → on dismiss → `advanceStep()`. The lesson page re-mounts `ActivityRouter` keyed on step index (`+page.svelte` ~line 109), so while the modal is up — and for a beat after dismissal — the *answered* activity is visible in a freshly reset, fully interactive state. Playtest result: "it resets and stays on the screen for a second, so you're tempted to resubmit it."

Risks beyond confusion: double-firing `onComplete` would double-award SunDrops.

## Problem 2: "I'll Type Instead" Dead-Ends

`MicPermissionPrompt` offers "I'll type instead" → `chooseTextOnly()` sets `micPermission = 'text_only'`, which *suppresses mic UI*. But `SpeakItActivity` has only mic and skip paths — a text-only child sees no input and is forced to skip every speaking activity, silently losing the entire production-practice track.

---

## Goals

1. Once an activity completes, it can never fire `onComplete` again and is visibly inert (frozen, not reset) until the next step mounts.
2. In `text_only` mode, SpeakItActivity offers a typed alternative: type the phrase, compared with `answerMatcher`, scored on the same star scale, never penalised (same pedagogy rules as speech).
3. The typed path is also reachable from a mic failure (`processingError`) — "Having mic trouble? Type it instead."
4. No change to SunDrop economics: typed attempts use the same `calculateSpeakItSunDrops` tiers.

---

## Implementation Steps

### Step 1 — Freeze completed activities (the resubmit fix)

In the lesson store (`src/lib/stores/lesson.ts`), add a `stepCompleted: boolean` flag set by the completion handler and cleared by `advanceStep()`.

In `+page.svelte`, pass `disabled={$stepCompleted}` down through `ActivityRouter` to every activity. Each activity component:
- guards its submit handler: `if (disabled) return;`
- applies `pointer-events-none opacity-60` to its interactive container when disabled.

Do NOT change the modal timing — the modal pacing is good; the problem is only that the activity behind it stays live. Also verify the ActivityRouter `{#key}` uses step index so state still resets on genuine advance.

**Belt-and-braces:** in the page-level completion handler, ignore calls when a reward/penalty is already pending (idempotency guard) so a double-fire can never double-award.

### Step 2 — Typed fallback in SpeakItActivity

Add a `'typing'` phase to the state machine (`idle | recording | processing | typing | result`).

Entry points to `'typing'`:
- `$micPermission === 'text_only'` → activity starts in `typing` instead of `idle` (mic button never shown)
- A "⌨️ Type it instead" text link in the idle phase and in the `processingError` banner

Typing UI: text input (autofocus, `autocapitalize=off`), phrase still displayed with the Listen button, submit on Enter or button.

Scoring: run the typed answer through `answerMatcher` against `config.targetPhrase`; map match quality to stars (exact/near = 5, minor typos = 4, partial = 2–3, else 1 — mirror `comparePronunciation` tiers). Reuse the existing result panel; feedback copy says "You typed:" instead of "You said:". Same 3-attempt limit, same never-fail completion.

### Step 3 — Sweep other voice touchpoints

Grep for `MicButton` usage (pre-lesson chat, help panel). Anywhere it renders while `text_only`, confirm a typed input path exists; if a component already has a text field (help panel does), just hide the mic without leaving layout gaps.

---

## Testing

- [ ] Unit: completed activity ignores second submit; SunDrops awarded exactly once per step
- [ ] Unit: `text_only` mode mounts SpeakIt in typing phase; typed exact answer = 5 stars; typo = 4
- [ ] Unit: mic error path exposes typing link
- [ ] Manual: full lesson — after each correct answer, activity is visibly frozen behind the modal
- [ ] Manual: deny mic permission → choose "I'll type instead" → complete a SpeakIt by typing
- [ ] Full suite stays green (1,020+)

## Acceptance Criteria

1. It is impossible to resubmit an answered activity, and it looks inert.
2. A text-only child completes speaking activities by typing, earning stars and SunDrops.
3. No skip is ever *forced* by missing UI.

## Files

**Modify:** `src/lib/stores/lesson.ts`, `src/routes/(app)/lesson/[id]/+page.svelte`, `src/lib/components/activities/ActivityRouter.svelte`, all 8 activity components (disabled prop — most are one-guard changes), `src/lib/components/activities/SpeakItActivity.svelte` (typing phase)
**Tests:** extend `src/tests/stores/lesson.test.ts`, new cases in a `speakItActivity`-focused test file
