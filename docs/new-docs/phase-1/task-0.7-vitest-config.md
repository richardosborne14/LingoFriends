# Task 0.7: Vitest Configuration & Test Harness

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 9/10
**Estimated Time:** 0.5h
**Dependencies:** Task 0.1 complete
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules` — Rule 4 (Unit Testing)

---

## Objective

Configure Vitest with SvelteKit aliases, jsdom for component tests, database connection for integration tests, and shared test utilities (dummy user factory, cleanup helpers).

---

## Subtasks

### 0.7.1 — Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'jsdom', // For component tests
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    // Resolve $lib and $types aliases
    alias: {
      '$lib': '/src/lib',
      '$types': '/src/lib/types',
    },
  },
});
```

---

### 0.7.2 — Create `src/tests/setup.ts`

```typescript
/**
 * Global test setup.
 * Runs before all test suites.
 * Sets up DB connection for integration tests and cleanup.
 */
import { afterAll } from 'vitest';

// Cleanup temp test data after all tests
afterAll(async () => {
  // Clean up any temp users created during tests
  // (but NOT the seeded dummy users — those persist)
});
```

---

### 0.7.3 — Create test utilities

`src/tests/helpers/createTestUser.ts`:

```typescript
/**
 * Factory for creating test users in the database.
 * Returns the created user and a cleanup function.
 *
 * Usage:
 *   const { user, cleanup } = await createTestUser({ email: 'test@test.com' });
 *   // ... run tests ...
 *   await cleanup(); // removes the user and cascading records
 */
import { db } from '$lib/server/db';
import { users, profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, generateFriendCode } from '$lib/server/auth/helpers';

interface CreateTestUserOptions {
  email?: string;
  displayName?: string;
  password?: string;
  withProfile?: boolean;
}

export async function createTestUser(options: CreateTestUserOptions = {}) {
  const email = options.email ?? `test-${Date.now()}@test.com`;
  const password = options.password ?? 'Test1234!';

  const [user] = await db.insert(users).values({
    email,
    passwordHash: await hashPassword(password),
    username: `test-${Date.now()}`,
    displayName: options.displayName ?? 'Test User',
    friendCode: generateFriendCode(),
  }).returning();

  if (options.withProfile) {
    await db.insert(profiles).values({
      userId: user.id,
      nativeLanguage: 'fr',
      targetLanguage: 'de',
      ageGroup: '11-14',
    });
  }

  return {
    user,
    cleanup: async () => {
      await db.delete(users).where(eq(users.id, user.id));
    },
  };
}
```

---

### 0.7.4 — Verify all existing tests run

```bash
npx vitest run
```

All tests from tasks 0.1–0.6 must pass. If any fail, fix them before marking this task complete.

---

## Tests

```typescript
// src/tests/setup/vitest-config.test.ts
import { describe, it, expect } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';

describe('Test Harness', () => {
  it('createTestUser creates and cleans up a user', async () => {
    const { user, cleanup } = await createTestUser({ email: 'harness-test@test.com' });
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('harness-test@test.com');
    await cleanup();
  });

  it('$lib alias resolves correctly', async () => {
    const { toCode } = await import('$lib/types/language');
    expect(toCode('German')).toBe('de');
  });
});
```

### Test Command
```bash
npx vitest run
```

---

## Acceptance Criteria

- [ ] `npx vitest run` runs all tests across all Phase 0 tasks
- [ ] Component tests work in jsdom environment
- [ ] Server/DB tests can access the database
- [ ] `createTestUser` helper works (create + cleanup)
- [ ] `$lib` alias resolves in test files
- [ ] Tests: ALL prior tests + 2 new = all passing

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Tests:** ___/___ passing total (across all Phase 0)
