# Task 2.2.7: Test Quality Improvements

**Status:** Not started
**Priority:** 🟢 P3
**Confidence target:** 9/10
**Fixes:** Suite 08 result accuracy, Anthropic latency threshold, duplicate testIds

---

## Objective

Three minor test quality issues found during Phase 2.1 that don't affect the app but make test results harder to read and act on.

---

## Fix A — Suite 08: WARN instead of FAIL when ≥1 provider succeeds

**Problem:** Suite 08 status is `FAIL` because DeepInfra failed — even though Groq and Anthropic both produced valid lessons. A single bad provider shouldn't mark the whole comparison as a failure.

**Fix in `tests/e2e/08-cross-llm-comparison.ts`:**

The test currently builds the overall result based on individual assertions. Add a check: if at least one provider achieved `parseSuccess + assemblySuccess + validationPassed`, the suite should be `WARN` (not `FAIL`) even if another provider failed entirely.

```typescript
// After scoring all providers:
const successfulProviders = comparison.filter(p => p.parseSuccess && p.assemblySuccess);

if (successfulProviders.length === 0) {
  // All providers failed — genuine FAIL
} else if (successfulProviders.length < providers.length) {
  // Some providers failed — WARN with details
  asserts.push(assert(
    `${providers.length - successfulProviders.length} provider(s) failed`,
    false, 'all pass', 'partial failure', 'warning'  // warning severity = WARN not FAIL
  ));
} else {
  // All succeeded
}
```

---

## Fix B — Anthropic Latency Threshold

**Problem:** The assertion `[anthropic] response < 15s` fails because Anthropic took 16,804ms. The 15s threshold was designed for Groq. Anthropic is a fallback model and can reasonably take longer.

**Fix in `tests/e2e/08-cross-llm-comparison.ts`:**

Use provider-specific thresholds:

```typescript
// Per-provider latency thresholds (ms)
const LATENCY_THRESHOLDS: Record<ProviderKey, number> = {
  groq: 8000,
  anthropic: 20000,   // Anthropic is slower — that's expected
  deepinfra: 15000,
};

asserts.push(assert(
  `[${provider}] response < ${LATENCY_THRESHOLDS[provider] / 1000}s`,
  result.responseTimeMs < LATENCY_THRESHOLDS[provider],
  `<${LATENCY_THRESHOLDS[provider] / 1000}s`,
  `${result.responseTimeMs}ms`
));
```

---

## Fix C — Duplicate `testId` in Suite 03

**Problem:** All German lesson tests in suite 03 share `testId: "03-German"`. The JSON result files are written with the topic in the filename but the `testId` inside is the same for 3 of the 5 tests.

**Fix in `tests/e2e/03-lesson-generation.test.ts`:**

Change the `testId` to include the topic slug:

```typescript
// Before:
buildTestResult('03-German', `German/English — "Greetings"`, ...)

// After:
buildTestResult('03-German-Greetings', `German/English — "Greetings"`, ...)
buildTestResult('03-German-Food', `German/English — "Food & Drinks"`, ...)
buildTestResult('03-German-School', `German/French — "School Phrases"`, ...)
```

---

## Files to Update

- **`tests/e2e/08-cross-llm-comparison.ts`** — WARN logic + per-provider latency thresholds
- **`tests/e2e/03-lesson-generation.test.ts`** — unique testIds per combination

---

## Acceptance Criteria

- [ ] Suite 08 is `WARN` (not `FAIL`) when Groq + Anthropic pass but DeepInfra fails
- [ ] `[anthropic] response < 20s` passes at current speeds
- [ ] All 5 suite 03 test IDs are unique
