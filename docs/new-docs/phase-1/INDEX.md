# LingoFriends V2 — Task Documentation Index

**Methodology:** Vibe Coding (doc-first, task-based, confidence-scored)
**Rewrite Scope:** Full frontend + backend from scratch
**Estimated Total:** 80–120 hours across 6 phases
**AI Assistant:** Cline (Plan Mode → Act Mode per task)

---

## How This Documentation Works

### The Core Loop

Every task follows the same cycle:

```
New Cline chat → Plan → Questions → Act → Test → Browser verify → Score → Update docs → Close
```

1. **Open a NEW Cline chat** for each task (prevents context pollution)
2. **Cline reads** `.clinerules` + the phase doc + `LEARNINGS.md` + `BUGS.md`
3. **Plan Mode:** Cline proposes approach, asks questions at decision points
4. **You answer** questions and approve the plan
5. **Act Mode:** Cline codes with 50% comments, writes unit tests
6. **Tests must pass** before continuing (`npx vitest run`)
7. **Browser verification** with the dummy user for any UI work
8. **Confidence score** — must be 8/10+ to proceed
9. **Update the phase doc** with results, decisions, and learnings
10. **Add discoveries** to `LEARNINGS.md` and bugs to `BUGS.md`
11. **Git commit** and close the chat

### Between Phases: Audit

After completing all tasks in a phase, push to GitHub and run a **phase audit** using a fresh Claude instance. Fix issues until the phase scores 8/10+.

---

## Document Map

### Cross-Cutting Documents (Used Every Task)

| File | Purpose | When to Read |
|------|---------|-------------|
| `.clinerules` | Development rules, workflow, commenting standards | Every task (mandatory) |
| `BUGS.md` | Running bug tracker | Before and after every task |
| `LEARNINGS.md` | Solutions, gotchas, decisions log | Before and after every task |

### Reference Documents (Read When Relevant)

| File | Purpose | Read When |
|------|---------|-----------|
| `00-REWRITE-MASTER-PLAN.md` | Architecture, tech stack, success criteria | Starting a phase |
| `01-DESIGN-SYSTEM.md` | Colours, typography, components, animations | Any UI work |
| `02-DATABASE-SCHEMA.md` | Drizzle table definitions, indexes, seed data | Any data work |
| `03-AI-STRATEGY.md` | Model assignments, prompts, pipeline design | Any AI work |
| `04-PEDAGOGY-SUMMARY.md` | Teach-first 5-step, chunk families, SRS | Any lesson work |
| `reference-mockup.jsx` | Interactive UI target (open in React playground) | Any UI work |

### Phase Task Documents (One Per Phase)

| Phase | File | Scope | Tasks | Est. Time |
|-------|------|-------|-------|-----------|
| 0 | `phases/phase-0-scaffolding.md` | Project setup, DB, auth skeleton, design system | 0.1–0.7 | 8–12h |
| 1 | `phases/phase-1-auth-profiles.md` | Registration, login, onboarding, profiles | 1.1–1.5 | 10–14h |
| 2 | `phases/phase-2-lesson-engine.md` | AI pipeline, chunk families, assembler, validator | 2.1–2.6 | 16–22h |
| 3 | `phases/phase-3-lesson-ui.md` | Activity components, animations, audio, coaching | 3.1–3.6 | 14–20h |
| 4 | `phases/phase-4-garden-avatars.md` | Three.js garden, avatars, NPC encounters, trees | 4.1–4.6 | 14–20h |
| 5 | `phases/phase-5-social-deploy.md` | Friends, leaderboard, gifts, deployment, mobile | 5.1–5.5 | 12–18h |

---

## Key Methodology Principles

### 1. Questions Before Assumptions
Cline asks the user at every decision point. Format: "🤔 Decision Needed" with context, options, and a recommendation. Never silently guess.

### 2. Unit Testing Throughout
Every task includes tests. Minimum counts: 5+ for utilities, 3+ for API endpoints, 4+ for AI pipeline steps, 2+ for UI components. Tests must pass before confidence scoring.

### 3. Browser Verification with Dummy User
Two test accounts exist in the seed data. After every UI task, Cline opens the app in the browser, walks through the flow, and documents what works and what doesn't.

### 4. 50% Comments
Every function has a docstring. Every non-obvious line has a "why" comment. Every trade-off is documented. Every TODO references when it should be done. This is how future Cline sessions (and the phase auditor) understand the code.

### 5. Living Documents
Phase docs are updated after each task completion with: what was built, decisions made, test results, confidence score. `LEARNINGS.md` and `BUGS.md` grow continuously.

### 6. Confidence Scoring (8/10 Minimum)
Every task is scored. Below 8 = fix before proceeding. Must-have criteria include: tests pass, browser verification passed, comments at 50%+, no TypeScript errors.

### 7. Phase Audits
Between phases: push to GitHub, open fresh Claude instance, run critical audit. Fix until 8/10+. The auditor has no context from the build process — fresh eyes catch accumulated issues.

---

## The Dummy Users

### Test Kid (Primary)
```
Display Name: Test Kid
Email: testkid@lingofriends.test
Password: Test1234!
Age Group: 11-14
Native Language: fr
Target Language: de
Interests: ["football", "gaming", "animals"]
Friend Code: LF-TEST01
```

### Test Friend (For Social Features)
```
Display Name: Test Friend
Email: testfriend@lingofriends.test
Password: Test1234!
Age Group: 11-14
Native Language: fr
Target Language: de
Interests: ["music", "cooking", "art"]
Friend Code: LF-TEST02
```

Both are created during Phase 0 seeding and used throughout development.

---

## Critical Path

```
Phase 0 (Scaffolding) → Phase 1 (Auth) → Phase 2 (Lesson Engine) → Phase 3 (Lesson UI) → Phase 4 (Garden) → Phase 5 (Social & Deploy)
```

Each phase depends on the previous. No skipping. No parallelising phases (tasks within a phase can sometimes be parallel — the docs note this where applicable).

---

## Success Criteria (V2 MVP)

The product is done when all of these are true:

1. A child can register, complete onboarding, and see their garden
2. Tapping a tree starts a lesson with personalised chunk families
3. Lessons follow the teach-first 5-step progression with 8 activity types
4. Audio plays automatically on teaching steps (target language voice)
5. Wrong answers trigger penalty animations; right answers grow the tree
6. NPC avatars appear during coaching chat steps
7. The garden is explorable with camera controls
8. Friends can be added by code and appear on a leaderboard
9. Trees decay over time without refresher lessons
10. Deployed to Hetzner with HTTPS
11. The 13-step full journey test passes completely
