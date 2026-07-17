# LingoFriends verification recipe

How to drive the running app end-to-end for verification.

## Prereqs

- Local Postgres running with `lingofriends` DB (dev uses `DATABASE_URL` in `.env`, NOT docker-compose)
- Dev server: `npm run dev` → http://localhost:5173
- Playwright: not a project dep. `npm i playwright` in a scratch dir; browsers already cached in `~/Library/Caches/ms-playwright`

## Fresh-user flow (registration → lesson)

1. `POST /register` form: fields `displayName`, `email`, `password`, then submit button.
   **Gotcha:** after successful registration the `use:enhance` update re-runs the page load
   and bounces the authed user to `/garden` — the friend-code step-2 UI doesn't stick around
   for scripting. Just `page.goto('/onboarding')` directly afterwards; it renders for
   un-onboarded users and redirects onboarded ones to /garden.
2. Onboarding = 7 steps of option cards + proceed button (`Next/Continue/Looks great!/…`).
   Generic driver works: click first visible non-proceed button(s), then the proceed button.
3. `/lesson/new` generates via live AI — allow up to 120s for the "Let's go! 🚀" button.
4. Capture the plan by listening for the `/api/lessons/generate` response; `body.lesson.steps[].activity.type`
   tells you exactly which activities to expect and in which order.

## Driving lesson steps

- One action per iteration; after each answer a reward/penalty modal (`.fixed.inset-0`)
  auto-dismisses in 1.2–1.5s — wait it out before the next action.
- INFO steps: "Got it! ✓" button. MC: click an option (self-submits after 1s).
- `coaching_chat` steps have NO ActivityRouter branch (known gap) — they render the
  "Activity loading…" fallback; click its Continue.
- Detect lesson end by URL leaving `/lesson`, not by completion-screen text.
- Garden page fires `load` slowly in dev (Three.js cold compile) — use `waitUntil: 'commit'`.

## Working example

A complete working drive script from TASK-FUN-01 verification (register → onboard →
lesson → SpeakIt typed fallback → freeze/double-award probe) is a good template if it
still exists in a scratchpad; otherwise rebuild from the notes above — it's ~150 lines.
