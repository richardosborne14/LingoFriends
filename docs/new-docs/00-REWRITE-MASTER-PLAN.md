# LingoFriends V2 — Complete Rewrite Master Plan

**Date:** March 2026
**Status:** 🔲 Not started
**Scope:** Full frontend + backend rewrite from scratch
**Estimated Total:** 80–120 hours across 6 phases

---

## Why We're Rewriting

The V1 codebase was built by three different AI assistants (Google Gemini, GLM-5, Claude Sonnet 4.6) across several months. Each left a different architectural fingerprint. The result:

- Conflicting patterns confuse AI coding assistants, causing token-burning fix cycles
- PocketBase permission/schema issues surface only during manual testing
- The lesson generation pipeline has been rewritten 3 times and still produces inconsistent output
- React component sprawl with no clear separation of concerns
- Three.js garden code tightly coupled to React lifecycle hooks

**What we're keeping:** All project documentation (PEDAGOGY.md, GAME_DESIGN.md, Phase 3 coaching docs, Sprint 2.1 testing specs). These represent months of thinking and are correct. The old source code stays in a `_v1_reference/` branch for Cline to consult specific logic (reward formulas, activity assembly patterns, pedagogy engine calculations) but is never imported.

**What we're replacing:** Everything. Frontend framework, backend, database, project structure.

---

## New Tech Stack

| Layer | Old | New | Why |
|-------|-----|-----|-----|
| Frontend | React + Vite + Tailwind | **SvelteKit + Tailwind** | Simpler reactivity, less boilerplate, file-based routing, SSR built-in. AI assistants produce cleaner Svelte code. |
| Backend | PocketBase (self-hosted) | **Hono + Postgres + Drizzle ORM** | Typed schemas, proper migrations, explicit API routes, no mystery permission errors |
| Auth | PocketBase auth | **Lucia Auth v3 + Postgres sessions** | Full control, EU-hosted, no dependency on PB auth quirks |
| 3D Rendering | Three.js (React hooks) | **Three.js (Svelte lifecycle)** | Same library, cleaner integration via `onMount`/`onDestroy` |
| AI (Smart) | Groq Llama 3.3 | **Anthropic Haiku 4.5** | Better reasoning for lesson planning, chunk families, personalisation, profile updates |
| AI (Fast) | Groq Llama 3.3 | **Groq Llama 3.3** | Still the fastest for classification, validation, real-time chat during lessons |
| TTS | Google Cloud TTS | **Google Cloud TTS** | Unchanged — works well |
| STT | Groq Whisper | **Groq Whisper** | Unchanged — works well |
| Deployment | Manual | **Hetzner VPS + Docker + nginx + Certbot** | Cline manages via SSH |
| Mobile | Planned Capacitor | **Capacitor (SvelteKit)** | Same approach, different framework wrapper |

---

## Architecture Overview

```
┌───────────────────────────────────────────────┐
│           SvelteKit Frontend (SSR)            │
│                                               │
│  routes/                                      │
│  ├── (auth)/login, register, onboarding       │
│  ├── (app)/garden, lesson/[id], friends       │
│  └── api/ → server-side API routes            │
│                                               │
│  lib/                                         │
│  ├── components/ (Svelte UI components)       │
│  ├── three/ (Garden, Avatars, NPC scenes)     │
│  ├── stores/ (Svelte stores for state)        │
│  └── services/ (AI, TTS, STT clients)         │
│                                               │
├───────────────────────────────────────────────┤
│         Hono API Server (separate process)     │
│                                               │
│  routes/                                      │
│  ├── auth.ts (register, login, sessions)      │
│  ├── profiles.ts (learner profiles, prefs)    │
│  ├── lessons.ts (generation, completion)      │
│  ├── garden.ts (trees, gifts, decorations)    │
│  ├── social.ts (friends, leaderboards)        │
│  └── ai.ts (proxy to AI providers)            │
│                                               │
│  db/ (Drizzle ORM)                            │
│  ├── schema.ts (all tables)                   │
│  ├── migrations/ (versioned SQL)              │
│  └── seed.ts (dev data)                       │
│                                               │
├───────────────────────────────────────────────┤
│              Postgres (EU-hosted)              │
├───────────────────────────────────────────────┤
│            External Services                   │
│  Haiku 4.5 · Groq Llama · Google TTS · Groq  │
│             Whisper                            │
└───────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Name | Scope | Est. Hours |
|-------|------|-------|------------|
| 0 | Scaffolding | Project setup, tooling, design system, DB schema | 8–12h |
| 1 | Auth & Profiles | Registration, login, onboarding, learner profiles | 10–14h |
| 2 | Lesson Engine | AI pipeline, chunk families, activity assembly, validation | 16–22h |
| 3 | Lesson UI | Activity components, coaching steps, rewards, audio | 14–20h |
| 4 | Garden & Avatars | Three.js garden, glTF avatars, NPC encounters, tree mechanics | 14–20h |
| 5 | Social & Deploy | Friends, leaderboards, gifts, Hetzner deployment, Capacitor | 12–18h |

**Critical path:** Phase 0 → 1 → 2 → 3 → 4 → 5 (sequential, each depends on the last)

---

## Rules for Cline

Before starting ANY phase, Cline MUST read:
1. `.clinerules` (always first)
2. The relevant phase task document
3. `DESIGN-SYSTEM.md` for any UI work
4. `reference-mockup.jsx` — open in a React playground to see the target look and feel
5. `AI-STRATEGY.md` for any AI work
6. `DATABASE-SCHEMA.md` for any data work
7. `PEDAGOGY-SUMMARY.md` for any lesson-related work

---

## Success Criteria (V2 MVP)

1. A child can create an account, complete onboarding, and see their garden
2. Clicking a tree starts a lesson with personalised chunk families
3. Lessons follow the teach-first 5-step progression with 6+ activity types
4. Audio plays automatically on teaching steps (target language voice)
5. Wrong answers trigger penalty animations; right answers grow the tree
6. NPC avatars appear during lessons with idle animations
7. The garden is explorable with pinch-zoom and camera controls
8. Friends can be added by code and appear on a leaderboard
9. Trees decay over time without refresher lessons (spaced repetition)
10. Runs on mobile via Capacitor with no layout breakage
