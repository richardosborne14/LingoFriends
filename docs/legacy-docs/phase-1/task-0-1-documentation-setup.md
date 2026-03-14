# Task 0.1: Project Documentation Setup

**Status:** Complete
**Confidence:** 9/10
**Date:** 2025-02-04

## Objective

Create comprehensive project documentation following the vibe coding methodology to enable effective AI-assisted development with Cline.

## What I Built

Complete documentation architecture for LingoFriends:

### Files Created
- `README.md` — Project vision, current phase, tech stack
- `ROADMAP.md` — Phased task breakdown with subtasks
- `CLAUDE_RULES.md` — Coding standards, AI model assignments
- `PEDAGOGY.md` — Teaching methodology (lexical, communicative, coaching)
- `TASK_TEMPLATE.md` — Standard format for task documentation
- `LEARNINGS.md` — Running log of solutions and gotchas
- `FUTURE_CURRICULUM.md` — Stretch goals scoping (Scratch, maths, dictée)
- `.clinerules` — Cline-specific instructions
- `.env.example` — Environment variable template
- `.gitignore` — Standard ignores
- `scripts/setup-pocketbase.js` — Database schema setup script
- `docs/README.md` — Documentation organization guide

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MVP scope | Auth + Friends + Leaderboard + AI Chat | User wants kids to compete, needs persistence |
| AI models | Groq Llama 3.3 + Google TTS + Groq Whisper | Privacy-friendly, fast, good quality |
| Backend | Pocketbase | Simple, self-hosted, EU hosting possible |
| Pedagogy docs | Dedicated PEDAGOGY.md | Teaching methodology is core to product |
| Future subjects | Separate FUTURE_CURRICULUM.md | Keep MVP focused, but scope future |

## Implementation Notes

Documentation follows the vibe coding methodology:
- 5 core docs (README, ROADMAP, CLAUDE_RULES, TASK_TEMPLATE, LEARNINGS)
- 3 project-specific docs (PEDAGOGY, FUTURE_CURRICULUM, .clinerules)
- Lean templates (~30-50 lines each)
- Task-based roadmap with subtasks

## Confidence Scoring

### Met Requirements
- [x] README with vision and current phase
- [x] ROADMAP with detailed task breakdown
- [x] CLAUDE_RULES with coding standards
- [x] Pedagogy principles documented
- [x] .clinerules for Cline workflow
- [x] Pocketbase schema defined
- [x] Environment variables templated
- [x] Future stretch goals scoped

### Concerns
- [ ] Haven't tested Pocketbase script against real instance (needs credentials)

### Deferred
- [ ] Actual code migration from LingoLoft → Task 1.1

## Notes for Future Tasks

The documentation is ready for Cline to start Task 1.1 (Code Audit). Key things for Cline:

1. Read `.clinerules` first every session
2. Check `LEARNINGS.md` for relevant gotchas
3. Reference `PEDAGOGY.md` for any teaching-related decisions
4. Follow `CLAUDE_RULES.md` for coding standards
5. Create task docs in `docs/phase-1/` using `TASK_TEMPLATE.md`

## Learnings

Added initial entries to LEARNINGS.md:
- JSON action keys must be English even when AI speaks French
- Browser STT is unreliable, use Groq Whisper
- Lesson interruption requires state save on visibility change
