# .clinerules — LingoFriends V2

## MANDATORY: Read Before Every Task

Before starting ANY work, read these in order:
1. **This file** (always)
2. **The phase task document** for the current task (in `docs/phases/`)
3. **BUGS.md** — check for known issues that affect your task
4. **LEARNINGS.md** — check for gotchas relevant to your task
5. **Reference docs** as needed: `01-DESIGN-SYSTEM.md`, `02-DATABASE-SCHEMA.md`, `03-AI-STRATEGY.md`, `04-PEDAGOGY-SUMMARY.md`

---

## Rule 1: The Vibe Coding Workflow

Every task follows this cycle. No exceptions.

```
1. Open NEW Cline chat (never continue old conversations)
2. "Can we please plan task X.X?" → Plan Mode
3. Cline reads this file + phase doc + LEARNINGS.md
4. Review plan, answer Cline's questions, adjust
5. "Proceed" → Act Mode
6. Code with 50% comments (see Rule 7)
7. Write unit tests (see Rule 4)
8. Run ALL tests — must pass before continuing
9. Test with dummy user in Cline browser (see Rule 5)
10. Score confidence (see Rule 6)
11. Update task doc with results (see Rule 8)
12. Add any discoveries to LEARNINGS.md
13. Add any bugs found to BUGS.md
14. Close chat. Next task gets a new chat.
```

---

## Rule 2: Questions Before Assumptions

**Cline MUST ask the user before making decisions on:**

- Any architectural choice not specified in the phase doc
- Any UI/UX decision not covered by `01-DESIGN-SYSTEM.md`
- Any pedagogy decision not covered by `04-PEDAGOGY-SUMMARY.md`
- Whether to use the "smart" model (Haiku 4.5) or "fast" model (Groq Llama) for a new AI call
- Any dependency not listed in the phase doc
- Whether a feature should be implemented now or deferred
- How to handle an edge case that isn't documented

**Format for questions:**
```markdown
## 🤔 Decision Needed

Before I proceed, I need clarity on:

1. [Specific question with context]
2. [Another question]

My recommendation: [What I'd do and why]
Waiting for your input before continuing.
```

**Never** silently make a choice and move on. The wrong guess burns tokens fixing it later.

---

## Rule 3: File Organisation

```
lingofriends-v2/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── drizzle.config.ts
├── .env.example
├── .clinerules                    ← This file
├── docs/
│   ├── 00-REWRITE-MASTER-PLAN.md
│   ├── 01-DESIGN-SYSTEM.md
│   ├── 02-DATABASE-SCHEMA.md
│   ├── 03-AI-STRATEGY.md
│   ├── 04-PEDAGOGY-SUMMARY.md
│   ├── BUGS.md                    ← Running bug tracker
│   ├── LEARNINGS.md               ← Running learnings log
│   └── phases/                    ← Phase task files (updated after each task)
│       ├── phase-0-scaffolding.md
│       ├── phase-1-auth-profiles.md
│       ├── phase-2-lesson-engine.md
│       ├── phase-3-lesson-ui.md
│       ├── phase-4-garden-avatars.md
│       └── phase-5-social-deploy.md
├── src/
│   ├── routes/
│   │   ├── (auth)/login, register, onboarding
│   │   ├── (app)/garden, lesson/[id], friends, profile
│   │   └── api/
│   ├── lib/
│   │   ├── components/ui, activities, garden, social
│   │   ├── three/garden, avatars
│   │   ├── stores/
│   │   ├── services/
│   │   ├── server/ai, db, auth, lessons
│   │   ├── types/
│   │   └── utils/
│   └── tests/                     ← Test files mirror src/ structure
├── static/models, audio
└── drizzle/                       ← Migration files
```

---

## Rule 4: Unit Testing — Non-Negotiable

**Every task must include tests.** No exceptions. No "I'll add tests later."

### What to test:
- Every exported function gets at least one test
- Every API endpoint gets a happy-path and error-path test
- Every Svelte component gets a render test (does it mount without errors?)
- Every AI prompt gets a response-parsing test with mock data
- Every database operation gets a test with the seed data

### Test file location:
Mirror the source structure under `src/tests/`:
```
src/lib/server/lessons/chunkGenerator.ts
→ src/tests/server/lessons/chunkGenerator.test.ts
```

### Test commands:
```bash
# Run all tests
npx vitest run

# Run tests for a specific file
npx vitest run src/tests/server/lessons/chunkGenerator.test.ts

# Run tests in watch mode (during development)
npx vitest
```

### Minimum test count per task type:
| Task Type | Minimum Tests |
|-----------|---------------|
| Utility module | 5+ |
| API endpoint | 3+ (auth, happy, error) |
| AI pipeline step | 4+ (valid input, edge cases, malformed AI response, timeout) |
| UI component | 2+ (renders, handles interaction) |
| Database operation | 3+ (create, read, error) |

**Tests must pass before the task is considered done.** A failing test = confidence cannot be 8/10.

---

## Rule 5: Dummy User Testing with Cline Browser

After completing any task that touches UI or user-facing flows, **Cline must verify using the browser tool.**

### The Dummy User

Create this user during Phase 0 and use throughout:

```
Display Name: Test Kid
Email: testkid@lingofriends.test
Password: Test1234!
Age Group: 11-14
Native Language: French (fr)
Target Language: German (de)
Interests: ["football", "gaming", "animals"]
Friend Code: LF-TEST01
```

### Browser Verification Checklist

For every UI task, Cline must:

1. **Navigate** — Open the relevant page in the Cline browser
2. **Describe** — Tell the user what should be visible on screen
3. **Interact** — Click buttons, fill forms, complete the flow
4. **Report** — Document what worked and what didn't

**Format:**
```markdown
## 🖥️ Browser Verification

**Page:** /garden
**Steps taken:**
1. Navigated to localhost:5173/garden
2. Saw: [description of what's visible]
3. Clicked: [what I interacted with]
4. Result: [what happened]

**Pass/Fail:** ✅ Pass / ❌ Fail
**Issues found:** [List any, add to BUGS.md]
```

### When to use browser verification:
- Every auth flow task (register, login, logout)
- Every onboarding step
- Every lesson UI component
- Every garden interaction
- Every social feature
- Any task where "it compiles" isn't enough

---

## Rule 6: Confidence Scoring

Every completed task gets a confidence score. **Below 8/10 = fix before proceeding.**

### Format:
```markdown
## Confidence: X/10

**Must-haves (met):**
- [x] Core functionality works
- [x] Tests pass (N/N)
- [x] Browser verification passed
- [x] Comments at 50%+ ratio
- [x] No TypeScript errors

**Concerns:**
- [ ] [Specific thing that's not ideal]

**Deferred (with rationale):**
- [ ] [Feature] → Phase X per roadmap
```

### Score meanings:
| Score | Meaning | Action |
|-------|---------|--------|
| 9-10 | Excellent | Continue |
| 8 | Solid | Continue |
| 7 | Gaps exist | **Fix before continuing** |
| 6 | Significant issues | **Stop and fix** |
| ≤5 | Broken | **Reconsider approach** |

---

## Rule 7: Commenting — 50% Comments, 50% Code

This is not optional. Every file Cline creates must have heavy commenting.

### What to comment:
- **Every function:** Docstring with what, why, params, returns
- **Every decision:** Why this approach, not another
- **Every trade-off:** What we considered and rejected
- **Every non-obvious line:** If you'd need to think about it, comment it
- **Every TODO:** Reference when it should be done (Phase X, Task Y)
- **Every magic number:** Why 3? Why 1000? Why 0.15?

### Example:
```typescript
/**
 * Calculate SunDrop reward for a completed activity.
 *
 * Rewards decrease with wrong attempts to make mistakes feel
 * consequential but not punishing. Floor at 0 (never negative)
 * because negative rewards demotivate children (see PEDAGOGY.md
 * — Krashen's Affective Filter).
 *
 * @param baseValue - SunDrops assigned to this activity (1-4)
 * @param wrongAttempts - Number of wrong answers before correct
 * @param usedHelp - Whether the learner tapped the Help button
 * @returns SunDrops earned (0 to baseValue)
 */
export function calculateReward(
  baseValue: number,
  wrongAttempts: number,
  usedHelp: boolean
): number {
  // Help halves the reward — the learner still progresses
  // but gets less currency to encourage independent attempts
  const afterHelp = usedHelp ? Math.ceil(baseValue / 2) : baseValue;

  // Each wrong attempt costs 1 SunDrop, floored at 0
  // Math.max prevents negative values (see PEDAGOGY.md — no punishment)
  return Math.max(0, afterHelp - wrongAttempts);
}
```

---

## Rule 8: Task Doc Updates — Living Documents

Phase task documents are **living**. After completing each task, Cline MUST update the phase doc:

### Before starting a task:
Status is `🔲 Not started`

### While working:
Status changes to `🟡 In progress`

### After completing:
```markdown
**Status:** ✅ Complete
**Completed:** [date]
**Confidence:** X/10
**Actual Time:** Xh (estimated: Xh)

### What Was Built
[2-3 sentences]

### Decisions Made
| Decision | Choice | Why |
|----------|--------|-----|
| [What] | [Choice] | [Rationale] |

### Tests
- X tests written, X passing
- Browser verification: ✅ Pass

### Notes for Future Tasks
[Anything the next task needs to know]
```

---

## Rule 9: Lesson Pipeline Architecture

These rules are NON-NEGOTIABLE for any task touching lessons.

### The AI generates CONTENT, not STRUCTURE
The AI (Haiku 4.5 / Groq Llama) produces: target phrases, translations, example sentences, usage notes, distractors, coaching text.

The AI NEVER produces: ActivityConfig objects, JSON field names, LessonStep objects, SunDrop values.

### Teach before test — ALWAYS
Every chunk follows the 5-step progression: INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY.
A learner must NEVER be quizzed on content they haven't seen in an INTRODUCE step.

### Language codes — ONE utility
All language conversion uses `src/lib/types/language.ts`. No `.substring(0,2)`. No local lookup tables.

### TTS voice — ALWAYS target language
Even for mixed-language coaching text. A German voice reading French words is intentional (charming accent effect). See `03-AI-STRATEGY.md`.

---

## Rule 10: Phase Audits

After completing ALL tasks in a phase:

1. Push to GitHub
2. Open a **new Claude web Project** (fresh eyes, not the Cline instance)
3. Prompt: "You're a senior SvelteKit developer. Audit this codebase for Phase X. Be critical. Find problems. Rate 1-10."
4. Create annex tasks for any issues found
5. Fix critical/important issues
6. Re-audit until 8/10+
7. Only then proceed to next phase

---

## Rule 11: Git Commits

After every completed task:
```bash
git add .
git commit -m "[Phase X.Y] Complete: [Task name] — confidence X/10"
git push
```

After bug fixes:
```bash
git commit -m "[Fix] [Phase X.Y]: [What was fixed]"
```
