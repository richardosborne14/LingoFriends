# Task 1.2: Login Flow

**Status:** 🔲 Not started
**Phase:** 1 (Auth & Profiles)
**Confidence Target:** 8/10
**Estimated Time:** 1.5h
**Dependencies:** Task 1.1 complete
**Actual Time:** _fill after completion_

---

## Mandatory Reads

1. `.clinerules`
2. `BUGS.md` — check for any registration issues

---

## Objective

Build the login page with email + password. Correct credentials → redirect to `/garden` (if onboarding complete) or `/onboarding` (if not). Handle wrong email, wrong password, and rate limiting.

---

## Subtasks

### 1.2.1 — Login page (`src/routes/(auth)/login/+page.svelte`)
- Email input + password input (show/hide toggle)
- "Log In" primary Button
- "Don't have an account? Create one" link → `/register`
- Inline error messages for validation failures

### 1.2.2 — Server action (`+page.server.ts`)
1. Find user by email → "No account found" if missing
2. Verify password → "Incorrect password" if wrong
3. Rate limit: track failed attempts per email, block after 5 in 5 minutes
4. Create Lucia session + set cookie
5. Check `profile.onboardingComplete` → redirect accordingly

---

## Tests

```typescript
describe('Login', () => {
  it('logs in with correct credentials and redirects to garden', async () => {});
  it('rejects wrong password with clear message', async () => {});
  it('rejects nonexistent email with clear message', async () => {});
  it('redirects to onboarding if incomplete', async () => {});
  it('rate limits after 5 failed attempts', async () => {});
});
```

---

## 🖥️ Browser Verification

1. Navigate to `/login`
2. Enter dummy user: testkid@lingofriends.test / Test1234!
3. Click "Log In"
4. **Verify:** redirect to `/onboarding` (dummy user onboarding not yet complete)
5. Try wrong password → verify error message appears
6. Try nonexistent email → verify error message

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] Correct credentials → session + redirect
- [ ] Wrong credentials → clear, specific error messages
- [ ] Rate limiting after 5 failures in 5 minutes
- [ ] "Create account" link works
- [ ] Tests: 5/5 passing
- [ ] Browser verification passed

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
