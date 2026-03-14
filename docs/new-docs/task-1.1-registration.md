# Task 1.1: Registration Flow

**Status:** 🔲 Not started
**Phase:** 1 (Auth & Profiles)
**Confidence Target:** 8/10
**Estimated Time:** 3h
**Dependencies:** Phase 0 complete and audited
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules`
2. `01-DESIGN-SYSTEM.md` — form styling, button variants, card component
3. `02-DATABASE-SCHEMA.md` — users, profiles, learnerProfiles tables
4. `LEARNINGS.md` and `BUGS.md`

---

## Objective

Build the two-step registration flow: account creation form → friend code reveal. On success, creates user + profile + learner_profile in DB, sets session cookie, redirects to onboarding.

---

## Subtasks

### 1.1.1 — Create registration page

`src/routes/(auth)/register/+page.svelte`

**Step 1 — Account form:**
- Display name input (2-30 chars, spaces and hyphens only)
- Parent's email input (standard email validation)
- Password input (min 6 chars, show/hide toggle using Input component)
- "Create Account" primary Button
- Link to `/login` below
- Inline error messages (Zod validation)
- All inputs use the `Input` component from Phase 0

**Step 2 — Friend code reveal:**
- Large display of generated friend code (e.g., "LF-A3K7M2") in a Card
- "Write this down! Your friends need it to find you." in bark-400 text
- "I've saved my code" checkbox — Continue button disabled until checked
- "Continue to Setup" Button → redirect to `/onboarding`

### 1.1.2 — Create server action

`src/routes/(auth)/register/+page.server.ts`:

```typescript
// Server-side validation with Zod
const RegisterSchema = z.object({
  displayName: z.string().min(2).max(30).regex(/^[a-zA-ZÀ-ÿ\s-]+$/),
  email: z.string().email(),
  password: z.string().min(6),
});

// On valid submission:
// 1. Check email not already taken → 400 if duplicate
// 2. Hash password (Argon2)
// 3. Generate unique friend code
// 4. Generate username from displayName + random suffix
// 5. INSERT into users table
// 6. INSERT empty profiles row (onboardingComplete: false)
// 7. INSERT empty learnerProfiles row
// 8. Create Lucia session
// 9. Set session cookie
// 10. Return { friendCode } for display
```

---

## 🤔 Decision Point for User

> **Friend code confirmation:** Should the user:
> - **(A) Just see the code and click Continue** (faster, risk they miss it)
> - **(B) Check a box "I've saved my code" before Continue is enabled** (slower, more reliable)
> - **(C) Type the code back to confirm they read it** (slowest, most reliable)
>
> **My recommendation:** Option B — balance between speed and reliability. Kids are impatient but friend codes are important.

---

## Tests

```typescript
// src/tests/routes/register.test.ts
describe('Registration', () => {
  it('creates user, profile, and learnerProfile with valid data', async () => {});
  it('rejects duplicate email with clear error', async () => {});
  it('rejects password shorter than 6 chars', async () => {});
  it('rejects display name with special characters', async () => {});
  it('generates unique friend code for each user', async () => {});
  it('sets session cookie on success', async () => {});
  it('hashes password — never stores plaintext', async () => {});
});
```

### Test Command
```bash
npx vitest run src/tests/routes/register.test.ts
```

---

## 🖥️ Browser Verification

1. Navigate to `/register`
2. Fill in: "Test Child Two", "parent2@test.com", "Test1234!"
3. Click "Create Account"
4. **Verify:** Friend code displayed prominently in a card
5. Check "I've saved my code" → Continue button becomes active
6. Click "Continue to Setup"
7. **Verify:** Redirected to `/onboarding`
8. Check database: user + profile + learnerProfile exist

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] Registration form renders with all 3 inputs + submit button
- [ ] Zod validation with inline error messages
- [ ] Duplicate email returns clear error (not a crash)
- [ ] Password hashed with Argon2 (verify hash in DB is not plaintext)
- [ ] Friend code displayed after successful registration
- [ ] Session cookie set → user is logged in
- [ ] Redirects to `/onboarding`
- [ ] Creates all 3 DB rows (user + profile + learnerProfile)
- [ ] Tests: 7/7 passing
- [ ] Browser verification passed
- [ ] 50%+ comments in all new files

---

## Completion (fill after task is done)

**Confidence:** ___/10
**What Was Built:** ___
**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|
**Tests:** ___/___ passing
**Notes for Future Tasks:** ___
**Learnings:** ___
**Bugs:** ___
