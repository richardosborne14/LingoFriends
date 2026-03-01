# Task 2.2.5: Remove DeepInfra from Active Provider Pool

**Status:** Not started
**Priority:** 🟡 P2
**Confidence target:** 10/10
**Fixes:** Suite 08 FAIL caused by DeepInfra parse failure

---

## Objective

DeepInfra returned a complete parse failure in suite 08 — score 0/100, `parseSuccess: false`, 14.2s latency. It should not be in the active provider rotation until the endpoint and API key are verified working. This is a 5-minute config change.

---

## The Problem

In `tests/e2e/lib/ai-client.ts`, `getAvailableProviders()` returns DeepInfra as an active provider. Every suite 08 run will fail as long as this is the case.

---

## The Fix

In `tests/e2e/lib/ai-client.ts`, find where DeepInfra is registered and mark it as experimental or skip it:

```typescript
// Option A: Mark as experimental (preferred — easy to re-enable)
const PROVIDERS: ProviderConfig[] = [
  { key: 'groq', ... },
  { key: 'anthropic', ... },
  { key: 'deepinfra', experimental: true, ... },  // skipped by getAvailableProviders()
];

getAvailableProviders(): ProviderKey[] {
  return this.providers
    .filter(p => !p.experimental)
    .map(p => p.key);
}

// Option B: Comment out entirely (simpler)
// { key: 'deepinfra', ... },
```

---

## Before Re-enabling DeepInfra

Before marking DeepInfra as non-experimental again, verify:
1. The API key in `.env` is valid (`VITE_DEEPINFRA_API_KEY` or similar)
2. The endpoint URL is correct (check DeepInfra dashboard for the Llama 3.3 70B endpoint)
3. The request format matches what DeepInfra expects (may differ from OpenAI-compatible format)
4. Run suite 08 in isolation and confirm `parseSuccess: true`

---

## Files to Update

- **`tests/e2e/lib/ai-client.ts`** — mark DeepInfra as experimental

---

## Acceptance Criteria

- [ ] `getAvailableProviders()` returns only `groq` and `anthropic`
- [ ] Suite 08 no longer fails due to DeepInfra
- [ ] DeepInfra config preserved for future re-enabling
