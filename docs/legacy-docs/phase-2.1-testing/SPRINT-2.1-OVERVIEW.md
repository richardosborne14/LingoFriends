# Sprint 2.1: End-to-End Backend Testing via CLI

**Status:** 🔲 Not started  
**Prerequisites:** Phase 2.0 complete, all unit tests passing  
**Goal:** Validate the entire user journey programmatically before visual testing  
**Estimated Time:** 16–24 hours

---

## Why This Sprint Exists

Phase 2.0 is code-complete with passing unit tests. However, the real failure points live at the **integration layer** — PocketBase permission errors, missing fields, schema mismatches, and AI generation quality issues. These bugs only surface when running the full user journey manually (sign up → onboarding → lessons → rewards → tree care), which is slow and makes debugging painful.

This sprint creates a **CLI-driven test harness** that Cline can execute end-to-end, simulating the complete user journey via direct API calls. Every test produces structured results that Cline then evaluates against the pedagogy docs, game design specs, and expected DB state.

The key insight: if we can prove the backend works perfectly via CLI, then visual bugs become trivial to fix because we know the data layer is solid.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Sprint 2.1 Test Harness                       │
│                                                                  │
│  test-runner.ts                                                  │
│  ├── 01-registration.test.ts     (sign up + profile creation)    │
│  ├── 02-onboarding.test.ts       (set interests, language, etc.) │
│  ├── 03-lesson-generation.test.ts (generate + validate lessons)  │
│  ├── 04-lesson-completion.test.ts (answer questions, earn drops) │
│  ├── 05-help-system.test.ts      (ask for help, report broken Q) │
│  ├── 06-rewards.test.ts          (sundrops, gems, streaks)       │
│  ├── 07-tree-health.test.ts      (decay, care items, buffers)    │
│  ├── 08-cross-llm-comparison.ts  (run lesson gen across 3 LLMs)  │
│  └── lib/                                                        │
│       ├── pb-client.ts           (PocketBase API wrapper)        │
│       ├── ai-client.ts           (AI provider direct calls)      │
│       ├── evaluator.ts           (Cline-readable result scoring) │
│       └── test-utils.ts          (helpers, assertions, logging)  │
│                                                                  │
│  Output: /results/{timestamp}/                                   │
│  ├── summary.json                (pass/fail/warn per scenario)   │
│  ├── llm-comparison.json         (side-by-side quality scores)   │
│  ├── lessons/                    (raw generated lessons per LLM)  │
│  └── audit.md                    (Cline-generated human report)  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Execution Model

Each test file is a **self-contained scenario** that:

1. **Sets up** its own test data (creates users, profiles, trees as needed)
2. **Executes** the scenario via direct PocketBase API calls + AI service calls
3. **Asserts** expected outcomes (DB state, response structure, pedagogical quality)
4. **Logs** structured results to JSON
5. **Cleans up** test data (deletes created records)

Tests run **sequentially** (some depend on prior state like "user has completed a lesson").

For the cross-LLM comparison (test 08), the lesson generation tests run three times — once per provider — and results are stored side-by-side for Cline to compare.

---

## Test Execution Command

```bash
# Run all tests
npx tsx tests/e2e/test-runner.ts

# Run a specific test
npx tsx tests/e2e/test-runner.ts --only 03-lesson-generation

# Run with a specific AI provider
npx tsx tests/e2e/test-runner.ts --provider deepinfra
npx tsx tests/e2e/test-runner.ts --provider groq
npx tsx tests/e2e/test-runner.ts --provider anthropic

# Run the cross-LLM comparison
npx tsx tests/e2e/test-runner.ts --only 08-cross-llm-comparison
```

---

## Environment Requirements

```bash
# .env must contain:
VITE_POCKETBASE_URL=https://pocketbase-story.digitalbricks.io
PB_ADMIN_EMAIL=richard@digitalbricks.io
PB_ADMIN_PASSWORD=<admin-password>

# AI providers (at least one required, all three for comparison)
VITE_DEEPINFRA_API_KEY=<key>
VITE_GROQ_API_KEY=<key>
VITE_ANTHROPIC_API_KEY=<key>

# Optional
VITE_GOOGLE_TTS_KEY=<key>  # For TTS tests
```

---

## Task List

| # | Doc | Description | Depends On |
|---|-----|-------------|------------|
| 1 | `task-2.1.1-test-harness-setup.md` | Create test runner, PB client, AI client, utilities | None |
| 2 | `task-2.1.2-user-journey-tests.md` | Tests 01–07: Full user journey scenarios | 2.1.1 |
| 3 | `task-2.1.3-cross-llm-comparison.md` | Test 08: Generate lessons across 3 LLMs, compare | 2.1.1, 2.1.2 |
| 4 | `task-2.1.4-audit-report.md` | Cline reviews all results, produces audit.md | 2.1.2, 2.1.3 |

---

## Success Criteria

1. All 7 journey tests pass with zero errors on at least one AI provider
2. Cross-LLM comparison produces structured quality scores for each provider
3. Any PocketBase permission/schema issues are identified and documented
4. Audit report clearly shows which provider produces the best pedagogical quality
5. Zero manual sign-up/onboarding needed to validate backend correctness

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `services/pocketbaseService.ts` | All PB API methods (auth, profile, trees, etc.) |
| `src/services/lessonPlanService.ts` | Lesson generation pipeline entry point |
| `src/services/lessonGeneratorV2.ts` | V2 lesson generator with pedagogy |
| `src/services/lessonAssembler.ts` | Deterministic activity assembly |
| `src/services/lessonValidator.ts` | Activity field validation |
| `src/services/gameProgressService.ts` | Rewards, streaks, tree updates |
| `src/services/treeHealthService.ts` | Health decay calculations |
| `src/services/sunDropService.ts` | SunDrop economy calculations |
| `src/services/ai/aiProviderService.ts` | AI provider abstraction |
| `src/services/helpService.ts` | Help system AI context |
| `src/services/questionRegenerationService.ts` | Broken question regeneration |
| `PEDAGOGY.md` | Pedagogical evaluation reference |
| `docs/phase-1.1/GAME_DESIGN.md` | Game mechanics reference |
