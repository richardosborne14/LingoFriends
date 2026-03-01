# Phase 2.0: Polish, AI Migration & World Overhaul

**Status:** ✅ Complete (11 of 11 tasks complete)
**Prerequisites:** Phase 1.1 complete, Phase 1.2 tasks 1.2.1–1.2.8 complete  
**Estimated Total Time:** 70–90 hours  
**Last Updated:** 2026-01-03

---

## Goals

Phase 2.0 addresses three categories of work:

1. **Bug Fixes** — Broken lesson scoring, skip button, redundant modals, tree interaction
2. **Quality of Life** — Sound effects, bigger avatars, multilingual UI, AI coaching, help system
3. **Major Overhauls** — Avatar redesign, garden world expansion, AI provider migration

Additionally, Phase 2.0 lays groundwork for two future phases with prototype "coming soon" features:
- **Cabin interior** (teaser exterior built, interior deferred)
- **Multiplayer world** (teaser world map UI built, realtime features deferred)

---

## Task Summary

| # | Task | Category | Est. Hours | Dependencies | Status |
|---|------|----------|------------|--------------|--------|
| 2.0.1 | Lesson Scoring Fixes | Bug fix | 3–4h | None | ✅ Complete |
| 2.0.2 | Sound System | QoL | 4–6h | None | ✅ Complete |
| 2.0.3 | Tree Click UX | Bug fix | 2–3h | None | ✅ Complete |
| 2.0.4 | Avatar Overhaul | Major | 10–14h | None | ✅ Complete |
| 2.0.5 | AI Provider Migration | Major | 8–12h | None | ✅ Complete |
| 2.0.6 | Multilingual i18n | QoL | 8–12h | 2.0.5 | ✅ Complete |
| 2.0.7 | Help System & AI Coaching | Major | 12–16h | 2.0.5, 2.0.6 | ✅ Complete |
| 2.0.8 | Garden World Overhaul | Major | 14–18h | 2.0.4 | ✅ Complete |
| 2.0.9 | 3D Avatar on Lesson Path | QoL | 3–4h | 2.0.4 | ✅ Complete |
| 2.0.10 | NPC Garden Visitors | Feature | 8–10h | 2.0.4, 2.0.8 | ✅ Complete |
| 2.0.11 | World Map Prototype & Scope | Prototype | 4–6h | 2.0.8 | ✅ Complete |

**Total estimated: 76–105 hours**

---

## Implementation Order

### Wave 1 — Foundation (no dependencies)
Can be done in parallel:
- **2.0.1** Lesson Scoring Fixes
- **2.0.2** Sound System
- **2.0.3** Tree Click UX
- **2.0.4** Avatar Overhaul ← critical path, blocks Wave 2
- **2.0.5** AI Provider Migration ← critical path, blocks Wave 2

### Wave 2 — Depends on Wave 1
- **2.0.6** Multilingual i18n (needs 2.0.5)
- **2.0.8** Garden World Overhaul (needs 2.0.4 for animals/NPCs)
- **2.0.9** 3D Avatar on Lesson Path (needs 2.0.4)

### Wave 3 — Depends on Wave 2
- **2.0.7** Help System & AI Coaching (needs 2.0.5 + 2.0.6)
- **2.0.10** NPC Garden Visitors (needs 2.0.4 + 2.0.8)
- **2.0.11** World Map Prototype (needs 2.0.8)

---

## Key Architectural Decisions

### AI Provider Strategy
Phase 2.0 introduces a provider abstraction layer (`AIProviderService`) that supports:
- **Production:** GLM-5 via DeepInfra (default)
- **Dev mode:** Anthropic Haiku 4.5 / Sonnet 4.6 (toggle in settings)
- **Fallback:** Groq Llama 3.3 (existing, kept as safety net)

All providers use the OpenAI-compatible chat completions API format.

**Data sovereignty note:** DeepInfra processes in US data centres with zero data retention. This is a pragmatic trade-off for now. The provider abstraction allows future migration to EU-hosted inference (self-hosted or EU provider) without code changes.

### Sound Architecture
A centralised `SoundManager` service loads all audio assets at app init and exposes a simple `play(soundId)` API. This prevents scattered `new Audio()` calls and enables global volume control, muting, and future sound settings.

### i18n Approach
Lightweight key-value translation system (not a heavy framework). Translation files per supported native language. AI prompts enforced to generate content only in the user's native language.

---

## Environment Variables (New)

```bash
# DeepInfra (GLM-5 — production AI)
VITE_DEEPINFRA_API_KEY=<your-key>

# Anthropic (dev mode testing)
VITE_ANTHROPIC_API_KEY=<your-key>

# Feature flags
VITE_AI_PROVIDER=deepinfra          # deepinfra | anthropic | groq
VITE_DEV_MODE=false                 # enables provider switching in UI
```

---

## Future Phase Teasers

### Cabin Interior (Phase 3.x)
- Exterior cabin built in 2.0.8 with "Coming soon!" interaction
- Scope doc: `docs/phase-future/cabin-interior-scope.md`

### Multiplayer World (Phase 4.x)
- World map UI prototype built in 2.0.11 with "Coming soon!" overlay
- Scope doc: `docs/phase-future/multiplayer-world-scope.md`
- Requires dedicated child safety review before implementation

---

## Success Metrics

**Quantitative:**
- [ ] All 11 tasks completed
- [ ] Zero broken scoring bugs in lessons
- [ ] Sound effects play on all target devices
- [ ] All UI strings translated for French native speakers
- [ ] AI lessons generate in correct target language with native-language instructions
- [ ] Garden renders 3+ animal types with smooth wandering AI

**Qualitative:**
- [ ] Avatars look charming, not janky
- [ ] Garden feels like a living world, not an isolated grid
- [ ] Help system genuinely helps kids who are stuck
- [ ] "Coming soon" teasers generate excitement, not frustration

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `src/components/lesson/LessonView.tsx` | Main lesson container (scoring bugs) |
| `src/components/lesson/activities/*.tsx` | Activity components (skip/retry bugs) |
| `src/renderer/GardenRenderer.ts` | Three.js garden (world overhaul) |
| `src/renderer/objects/characterBuilder.ts` | Avatar geometry (overhaul) |
| `services/groqService.ts` | Current AI service (migration) |
| `docs/phase-future/*.md` | Future phase scope docs |
