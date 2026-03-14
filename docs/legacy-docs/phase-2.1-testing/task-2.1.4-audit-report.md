# Task 2.1.4: Audit Report Generation

**Status:** 🔲 Not started  
**Estimated Time:** 2–3 hours  
**Dependencies:** Tasks 2.1.2 + 2.1.3 (all tests must have run)  
**Output:** `tests/e2e/results/{timestamp}/audit.md`

---

## Objective

After all tests have run, Cline reviews the structured results and produces a human-readable audit report. This report is the **deliverable** of Sprint 2.1 — it tells Richard exactly what works, what's broken, and which LLM to use in production.

---

## Input Files

Cline reads these files from the results directory:

```
tests/e2e/results/{timestamp}/
├── summary.json              # Pass/fail/warn for all 7 journey tests
├── llm-comparison.json       # Cross-LLM quality scores
├── lessons/
│   ├── deepinfra/            # Raw lesson JSON per combination
│   ├── groq/
│   └── anthropic/
└── audit.md                  # ← Cline writes this
```

---

## Audit Report Structure

Cline should generate `audit.md` with the following sections:

### 1. Executive Summary

A 3-5 sentence overview:
- How many tests passed/failed/warned
- Which LLM scored highest
- Critical issues found (if any)
- Overall verdict: "Backend ready for visual testing" or "Backend has blocking issues"

### 2. User Journey Test Results

For each test suite (01-07):

```markdown
#### Test 01: Registration & Profile Creation
**Status:** ✅ PASS (5/5 assertions)

All assertions passed. User creation, profile creation, and permission rules work correctly.

No issues found.
```

Or if there are failures:

```markdown
#### Test 03: Lesson Generation & Validation
**Status:** ❌ FAIL (18/22 assertions)

**Critical failures:**
- Assertion "All distractors in native language" FAILED
  - Expected: English distractors
  - Actual: 2 of 3 distractors were in German (target language)
  - Affected combination: German target, English native, "Food & Drinks" topic
  
- Assertion "SunDrop totals consistent" FAILED
  - Expected: totalSunDrops = 18
  - Actual: totalSunDrops = 13 (steps sum to 18)

**Warnings:**
- Activity variety score 6/10 — lesson used only 2 activity types
  
**Recommendation:** Fix distractor language enforcement in aiPedagogyClient.ts prompt. The prompt must explicitly state "ALL distractors must be in {nativeLanguage}, not {targetLanguage}".
```

### 3. PocketBase Integration Health

A dedicated section on schema/permission issues discovered:

```markdown
### PocketBase Issues Found

| Collection | Issue | Severity | Fix |
|------------|-------|----------|-----|
| profiles | `onboarding_complete: false` causes 400 | HIGH | Don't set to false, omit field |
| question_reports | Create rule too permissive | LOW | OK for now, tighten before launch |
| user_trees | Missing `bufferDays` field on some records | MEDIUM | Run migration script |

### Permission Rule Summary
| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| profiles | ✅ OK | ✅ OK (owner only) | ✅ OK | N/A |
| user_trees | ✅ OK | ✅ OK (owner only) | ✅ OK | N/A |
| learner_profiles | ✅ OK | ✅ OK | ✅ OK | N/A |
| question_reports | ✅ OK | ❌ Blocked for users (expected) | N/A | N/A |
```

### 4. Cross-LLM Comparison

```markdown
### LLM Quality Comparison

| Dimension | DeepInfra (GLM-5) | Groq (Llama 3.3) | Anthropic (Sonnet 4.5) |
|-----------|-------------------|-------------------|------------------------|
| Language Correctness | 9.5 | 7.2 | 9.8 |
| Teach-First | 10.0 | 10.0 | 10.0 |
| Activity Variety | 8.2 | 6.5 | 8.8 |
| Chunk Quality | 9.0 | 6.8 | 9.5 |
| Distractor Quality | 7.5 | 5.0 | 8.5 |
| Age Appropriateness | 9.5 | 8.0 | 9.8 |
| Interest Personalisation | 6.0 | 4.5 | 7.2 |
| Field Completeness | 9.8 | 7.0 | 10.0 |
| i+1 Difficulty | 8.5 | 7.0 | 9.0 |
| Native Lang Instructions | 9.5 | 6.5 | 10.0 |
| **AVERAGE** | **8.75** | **6.85** | **9.26** |
| **Response Time** | 2.8s | 1.2s | 3.5s |
| **Failure Rate** | 0% | 8% | 0% |

### Recommendation: [Provider Name]

[2-3 sentences explaining why this provider is recommended for production, balancing quality, speed, cost, and data sovereignty considerations.]

### Qualitative Notes

[Cline's observations from reading raw lessons:]
- GLM-5 tends to generate slightly repetitive distractors across lessons
- Groq occasionally produces Spanish content instead of German (known historical bug)
- Anthropic produces the most natural-sounding chunks but is slower and more expensive
- etc.
```

### 5. Pedagogical Compliance Audit

Cline reviews the generated lessons against PEDAGOGY.md principles:

```markdown
### Lexical Approach Compliance
- [x] Chunks are phrases, not isolated words (average 3.2 words per chunk)
- [x] Example sentences show chunks in natural context
- [ ] Some chunks are too formulaic ("Good morning" appears in 60% of Greetings lessons)

### Krashen Compliance
- [x] i+1 difficulty appropriate for A1 learners
- [x] Affective filter: instructions are encouraging, not demanding
- [ ] Some A2 content appeared in A1 lessons (passé composé in a greetings lesson)

### Coaching Methodology
- [x] Tutor text is warm and encouraging
- [x] Help responses don't reveal answers directly
- [ ] Help responses could be more personalised (rarely reference interests)

### Spaced Repetition
- [x] Tree health decay matches GAME_DESIGN.md schedule
- [x] Gift buffers calculate correctly
- [x] Lesson completion resets health to 100
```

### 6. Recommended Fixes

Priority-ordered list of issues to fix before visual testing:

```markdown
### P0 — Must Fix Before Visual Testing
1. **[Issue]** — [description, affected files, suggested fix]

### P1 — Fix During Visual Testing
1. **[Issue]** — [description]

### P2 — Nice to Have
1. **[Issue]** — [description]
```

### 7. Appendix: Raw Data Locations

```markdown
### Where to Find Raw Data
- Full test results: `tests/e2e/results/{timestamp}/summary.json`
- LLM comparison: `tests/e2e/results/{timestamp}/llm-comparison.json`
- Raw DeepInfra lessons: `tests/e2e/results/{timestamp}/lessons/deepinfra/`
- Raw Groq lessons: `tests/e2e/results/{timestamp}/lessons/groq/`
- Raw Anthropic lessons: `tests/e2e/results/{timestamp}/lessons/anthropic/`
```

---

## Execution

This task is **not automated** — it's a Cline review task. After tests 01-08 have all run:

1. Cline reads `summary.json` and `llm-comparison.json`
2. Cline reads 3-5 raw lessons per provider from `lessons/`
3. Cline compiles the audit report
4. Cline writes `audit.md` to the results directory

### Command for Cline

```
Read the test results in tests/e2e/results/{latest-timestamp}/ and generate 
an audit report following the template in task-2.1.4-audit-report.md. Write 
the report to tests/e2e/results/{same-timestamp}/audit.md.
```

---

## Acceptance Criteria

- [ ] Audit report covers all 7 sections
- [ ] Every failed test has a specific description of what went wrong
- [ ] Every PB permission/schema issue is documented with severity
- [ ] LLM comparison table has scores for all available providers
- [ ] A clear production provider recommendation is made
- [ ] P0 issues list is actionable (specific files and suggested fixes)
- [ ] Report is readable by a non-technical stakeholder (Richard can share it)

---

## Notes for Cline

- Be specific about file paths and line numbers when identifying issues
- Don't just say "fix the prompt" — quote the problematic prompt text and suggest the change
- If a provider was unavailable (no API key), note it as "NOT TESTED" rather than giving it a score of 0
- The qualitative review is the most valuable part — automated scoring catches structural issues but misses naturalness, awkward phrasing, and cultural context
- Consider the data sovereignty angle: even if Anthropic scores highest, note that DeepInfra or a self-hosted solution may be preferable for GDPR reasons
- If ALL providers pass all tests, the report should still identify the weakest areas for future improvement
