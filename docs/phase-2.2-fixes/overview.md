# Phase 2.2 — Post-Audit Fixes

**Source:** Phase 2.1 E2E Test Audit (`docs/phase-2.1-testing/PHASE-2.1-AUDIT.md`)
**Total tasks:** 7
**Goal:** Close all open issues from the Phase 2.1 test run before moving to Phase 2.3 (world expansion)

---

## Task List

| Task | Priority | Component | What it fixes |
|------|----------|-----------|---------------|
| 2.2.1 | 🔴 P1 | DB | Create `lesson_history` PocketBase collection |
| 2.2.2 | 🔴 P1 | DB | Fix `question_reports` user field + admin read |
| 2.2.3 | 🔴 P1 | AI | Fix help system answer leakage in prompt |
| 2.2.4 | 🟡 P2 | Types | Fix `src/types/pocketbase.ts` schema mismatches |
| 2.2.5 | 🟡 P2 | Config | Remove DeepInfra from active provider pool |
| 2.2.6 | 🟡 P2 | Evaluator | Fix language detection false positives + interests |
| 2.2.7 | 🟢 P3 | Test | Suite 08 WARN logic + Anthropic threshold + testId dedup |

---

## Acceptance Criteria for Phase 2.2 Complete

- [ ] Suite 04 (lesson completion) upgrades from WARN → PASS
- [ ] Suite 05 (help system) upgrades from WARN → PASS
- [ ] Suite 08 (cross-LLM) upgrades from FAIL → WARN or PASS
- [ ] `src/types/pocketbase.ts` matches live PB schema exactly
- [ ] Re-run full test suite passes at ≥ 8/10 confidence
