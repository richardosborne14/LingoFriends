# .clinerules — LingoFriends V2

## MANDATORY: Read Before Every Task

Before starting ANY work, read the relevant documents:
1. This file (always)
2. The phase task document for the current task
3. `01-DESIGN-SYSTEM.md` for any UI work
4. `03-AI-STRATEGY.md` for any AI work
5. `02-DATABASE-SCHEMA.md` for any data work
6. `04-PEDAGOGY-SUMMARY.md` for any lesson-related work

---

## Rule 1: File Organisation

```
lingofriends-v2/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── drizzle.config.ts
├── .env.example
├── .clinerules                    ← This file
├── docs/                          ← Project documentation (READ-ONLY reference)
│   ├── 00-REWRITE-MASTER-PLAN.md
│   ├── 01-DESIGN-SYSTEM.md
│   ├── 02-DATABASE-SCHEMA.md
│   ├── 03-AI-STRATEGY.md
│   ├── 04-PEDAGOGY-SUMMARY.md
│   └── phases/                    ← Phase task files
├── src/
│   ├── routes/                    ← SvelteKit file-based routing
│   │   ├── (auth)/                ← Auth layout group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── onboarding/
│   │   ├── (app)/                 ← Authenticated layout group
│   │   │   ├── garden/
│   │   │   ├── lesson/[id]/
│   │   │   ├── friends/
│   │   │   └── profile/
│   │   ├── api/                   ← SvelteKit API routes (proxy to Hono)
│   │   └── +layout.svelte
│   ├── lib/
│   │   ├── components/            ← Reusable Svelte components
│   │   │   ├── ui/                ← Design system primitives (Button, Card, Input, etc.)
│   │   │   ├── activities/        ← Lesson activity components
│   │   │   ├── garden/            ← Garden-specific UI
│   │   │   └── onboarding/        ← Onboarding step components
│   │   ├── three/                 ← Three.js modules (framework-agnostic)
│   │   │   ├── garden/            ← Garden scene, camera, terrain
│   │   │   ├── avatars/           ← Avatar loading, customisation, animation
│   │   │   └── utils/             ← Three.js helpers
│   │   ├── stores/                ← Svelte stores (state management)
│   │   ├── services/              ← Client-side services (API calls)
│   │   ├── server/                ← Server-only code (runs in SvelteKit server)
│   │   │   ├── ai/                ← AI provider implementations
│   │   │   ├── db/                ← Drizzle schema, queries, migrations
│   │   │   └── auth/              ← Lucia auth configuration
│   │   ├── utils/                 ← Shared utilities
│   │   │   └── language.ts        ← SINGLE SOURCE OF TRUTH for language codes
│   │   └── types/                 ← TypeScript type definitions
│   ├── app.css                    ← Global styles + Tailwind directives
│   └── app.html                   ← HTML shell
├── server/                        ← Hono API server (separate process)
│   ├── index.ts                   ← Server entry point
│   ├── routes/                    ← API route handlers
│   ├── middleware/                 ← Auth, CORS, rate limiting
│   └── services/                  ← Server-side business logic
├── static/                        ← Static assets
│   ├── fonts/
│   ├── models/                    ← glTF avatar models (Quaternius CC0)
│   └── sprites/                   ← 2D sprite assets (Kenney CC0)
└── _v1_reference/                 ← Old React codebase (READ-ONLY, never import)
```

## Rule 2: The AI Generates CONTENT, Not STRUCTURE

The AI (Haiku 4.5 or Groq) generates ONLY:
- Target language phrases (lexical chunks)
- Native language translations, distractors, explanations
- Coaching text, usage contexts

The AI NEVER generates:
- Component props, ActivityConfig objects, JSON field names
- LessonStep or LessonPlan structures
- SunDrop values

Activity assembly is ALWAYS deterministic TypeScript in `lessonAssembler.ts`.

## Rule 3: Teach Before Test — ALWAYS

Every chunk follows: INTRODUCE → RECOGNIZE → PRACTICE → RECALL → APPLY.
A learner NEVER sees a quiz on content they haven't seen in an INTRODUCE step.

## Rule 4: Language Codes — ONE Utility

All language name ↔ code conversion uses `src/lib/utils/language.ts`.
- `toLanguageCode("German")` → `"de"` ✅
- `"German".substring(0, 2)` ❌ NEVER
- Local lookup tables in individual files ❌ NEVER

## Rule 5: Validation Before Rendering

Every LessonPlan passes `validateLessonPlan()` before reaching the UI.
If validation fails, throw an error. NEVER render a broken lesson.

## Rule 6: Distractors Match Question Language

If the question asks "What does [German phrase] mean?", distractors are in the NATIVE language.
Distractors are NEVER in the target language.

## Rule 7: TTS Voice = Target Language

TTS voice is ALWAYS set to the target language, even for mixed-language content.
German voice for German lessons. English voice for English lessons. No switching.

## Rule 8: Design System Compliance

All UI components must follow `01-DESIGN-SYSTEM.md` and match `reference-mockup.jsx`:
- Open the mockup in a React playground to see the exact target look and feel
- Use the defined color tokens (coral, forest, sundrop, bark, etc.)
- Use Nunito font throughout
- Buttons have 3D depth (box-shadow creates "pushable" feel)
- All interactive elements ≥ 44×44px
- Mobile-first responsive design
- Animations match the timing and easing in the mockup

## Rule 9: Server-Side Secrets

API keys NEVER appear in client-side code. All AI calls go through:
- SvelteKit server routes (`src/routes/api/...`) or
- The Hono API server (`server/routes/...`)

Environment variables with `VITE_` prefix are client-side visible.
AI keys use non-prefixed env vars (e.g., `ANTHROPIC_API_KEY`).

## Rule 10: Error Boundaries

Every AI call has a try/catch with a graceful fallback.
Every Three.js scene has an error boundary that shows a static fallback image.
No unhandled promise rejections. No blank error screens.

## Rule 11: TypeScript Strict Mode

`tsconfig.json` uses `"strict": true`. No `any` types except in clearly marked legacy adapters. All function parameters and return types explicitly typed.

## Rule 12: Test Each Phase

Each phase has acceptance criteria in its task document. ALL criteria must be verified before moving to the next phase. Use `npx vitest` for unit tests, manual testing for UI.

## Rule 13: Git Hygiene

One commit per subtask. Commit messages: `phase-X.Y: Brief description`.
Example: `phase-0.3: Add Drizzle schema and initial migration`

## Rule 14: No V1 Imports

The `_v1_reference/` directory exists for reading patterns and logic. NEVER import from it. NEVER copy-paste without understanding and rewriting for the new architecture.
