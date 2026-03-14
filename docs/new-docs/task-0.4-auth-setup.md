# Task 0.4: Auth Setup (Lucia)

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 0.3 complete
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules`
2. `02-DATABASE-SCHEMA.md` — users and sessions table definitions
3. `00-REWRITE-MASTER-PLAN.md` — auth row: "Lucia Auth v3 + Postgres sessions"

---

## Objective

Configure Lucia v3 for session-based authentication with the Drizzle adapter. Create password hashing helpers and friend code generation. Set up the SvelteKit hooks for automatic session validation on every request.

---

## Subtasks

### 0.4.1 — Create Lucia configuration

`src/lib/server/auth/lucia.ts`:

```typescript
/**
 * Lucia v3 authentication setup.
 *
 * Uses Drizzle adapter with Postgres sessions table.
 * Session cookies are httpOnly and secure in production.
 *
 * getUserAttributes maps DB fields to the session user object,
 * so every server load function can access user.username,
 * user.email, and user.displayName without a separate DB query.
 */
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '../db';
import { users, sessions } from '../db/schema';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => ({
    username: attributes.username,
    email: attributes.email,
    displayName: attributes.displayName,
  }),
});

// Type augmentation for TypeScript
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      username: string;
      email: string;
      displayName: string;
    };
  }
}
```

---

### 0.4.2 — Create auth helper functions

`src/lib/server/auth/helpers.ts`:

```typescript
import { hash, verify } from 'argon2';
import { nanoid } from 'nanoid';

/**
 * Hash a plaintext password using Argon2id.
 * Argon2id is the recommended algorithm for password hashing —
 * resistant to both side-channel and GPU-based attacks.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Returns true if the password matches, false otherwise.
 * Never throws on wrong password — returns boolean for clean control flow.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

/**
 * Generate a unique friend code in format LF-XXXXXX.
 *
 * 6 alphanumeric chars = 2.1 billion combinations.
 * More than enough for a children's app. If collisions ever
 * become an issue, increase to 8 chars.
 *
 * Uses nanoid with a custom alphabet (uppercase + digits only)
 * for readability — kids need to write these down and share
 * with friends verbally.
 */
export function generateFriendCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  const id = nanoid(6);
  // Map nanoid output to our restricted alphabet
  const code = Array.from(id)
    .map((_, i) => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('');
  return `LF-${code}`;
}
```

---

### 0.4.3 — Create SvelteKit hooks

`src/hooks.server.ts`:

```typescript
/**
 * SvelteKit server hooks — runs on EVERY request.
 *
 * Validates the session cookie and populates locals.user
 * and locals.session. All server load functions and API
 * routes can then check locals.user for authentication.
 */
import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    // Session was refreshed — update the cookie
    const cookie = lucia.createSessionCookie(session.id);
    event.cookies.set(cookie.name, cookie.value, {
      path: '.',
      ...cookie.attributes,
    });
  }

  if (!session) {
    // Session is invalid — clear the cookie
    const cookie = lucia.createBlankSessionCookie();
    event.cookies.set(cookie.name, cookie.value, {
      path: '.',
      ...cookie.attributes,
    });
  }

  event.locals.user = user;
  event.locals.session = session;

  return resolve(event);
};
```

---

### 0.4.4 — Add TypeScript types for locals

`src/app.d.ts`:

```typescript
declare global {
  namespace App {
    interface Locals {
      user: import('lucia').User | null;
      session: import('lucia').Session | null;
    }
  }
}

export {};
```

---

## Tests

```typescript
// src/tests/server/auth/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateFriendCode } from '$lib/server/auth/helpers';

describe('hashPassword', () => {
  it('produces a hash different from the input', async () => {
    const hash = await hashPassword('Test1234!');
    expect(hash).not.toBe('Test1234!');
    expect(hash.length).toBeGreaterThan(30);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('Test1234!');
    expect(await verifyPassword(hash, 'Test1234!')).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('Test1234!');
    expect(await verifyPassword(hash, 'WrongPassword')).toBe(false);
  });

  it('returns false for empty password', async () => {
    const hash = await hashPassword('Test1234!');
    expect(await verifyPassword(hash, '')).toBe(false);
  });
});

describe('generateFriendCode', () => {
  it('matches format LF-XXXXXX', () => {
    const code = generateFriendCode();
    expect(code).toMatch(/^LF-[A-Z0-9]{6}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateFriendCode()));
    expect(codes.size).toBe(100);
  });

  it('does not contain confusing characters (I, O, 0, 1)', () => {
    // Generate many codes and check none contain I, O, 0, or 1
    for (let i = 0; i < 50; i++) {
      const code = generateFriendCode().replace('LF-', '');
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});
```

### Test Command
```bash
npx vitest run src/tests/server/auth/auth.test.ts
```

---

## Acceptance Criteria

- [ ] Lucia configured with Drizzle PostgreSQL adapter
- [ ] Password hashing works with Argon2id
- [ ] Password verification works (correct = true, wrong = false)
- [ ] Friend codes match format `LF-XXXXXX`, all unique, no confusing chars
- [ ] `hooks.server.ts` validates sessions on every request
- [ ] `locals.user` populated when session valid, null when not
- [ ] `app.d.ts` types correct
- [ ] Tests: 6/6 passing

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|

**Tests:** ___/___ passing

**Notes for Future Tasks:** ___
