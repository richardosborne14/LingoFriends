# Task 0.3: Database Setup

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 0.2 complete
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules`
2. `02-DATABASE-SCHEMA.md` — ALL Drizzle table definitions (users, sessions, profiles, learnerProfiles, skillPaths, lessonDefinitions, userTrees, lessonHistory, chunkLibrary, dailyProgress, friendships, gifts)
3. `LEARNINGS.md` — "[V1 Legacy] PocketBase permission errors only surface during manual testing"

---

## Objective

Set up Postgres via Docker, create ALL database tables using Drizzle ORM, generate and apply the initial migration, create a seed script with skill paths and dummy test users.

---

## Subtasks

### 0.3.1 — Start Postgres via Docker

```bash
docker run --name lingofriends-db \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=lingofriends \
  -p 5432:5432 -d postgres:16
```

Add `DATABASE_URL=postgresql://postgres:dev@localhost:5432/lingofriends` to `.env`.

---

### 0.3.2 — Create Drizzle config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### 0.3.3 — Create schema file

`src/lib/server/db/schema.ts` — Copy ALL table definitions from `02-DATABASE-SCHEMA.md` exactly. Tables:

1. **users** — id (uuid), email, passwordHash, username, displayName, friendCode, createdAt, updatedAt
2. **sessions** — id (varchar 255), userId (FK → users), expiresAt
3. **profiles** — id (uuid), userId (FK → users, unique), nativeLanguage, targetLanguage, ageGroup, interests (jsonb), onboardingComplete, avatar fields (skinTone, hairColor, shirtColor, hat, gender), progress stats (totalSunDrops, currentStreak, longestStreak, lastActivityDate, lessonsCompleted, seedsAvailable), timestamps
4. **learnerProfiles** — id (uuid), userId (FK), overallLevel, speakingLevel, listeningLevel, readingLevel, knownFacts (jsonb), strengths (jsonb), weaknesses (jsonb), timestamps
5. **skillPaths** — id (uuid), name, icon, category, difficulty, targetLanguage, lessonCount, timestamps
6. **lessonDefinitions** — id (uuid), skillPathId (FK), title, icon, topic, order, timestamps
7. **userTrees** — id (uuid), userId (FK), skillPathId (FK), currentLessonIndex, health, growthStage, positionX, positionZ, timestamps
8. **lessonHistory** — id (uuid), userId (FK), treeId (FK), lessonIndex, sunDropsEarned, sunDropsMax, starRating, timeSpentMs, timestamps
9. **chunkLibrary** — id (uuid), userId (FK), targetPhrase, nativeTranslation, coreFrame, topic, confidence, nextReviewDate, reviewCount, audioBase64, timestamps
10. **dailyProgress** — id (uuid), userId (FK), date, lessonsCompleted, sunDropsEarned, minutesSpent, timestamps
11. **friendships** — id (uuid), userA (FK), userB (FK), status ('pending'|'accepted'|'rejected'), timestamps
12. **gifts** — id (uuid), fromUserId (FK), toUserId (FK), giftType, status ('pending'|'applied'), treeId (nullable FK), timestamps

**Include all indexes** from the DATABASE-SCHEMA doc.

---

### 0.3.4 — Create database connection export

```typescript
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection singleton.
 * Uses postgres.js driver (fastest Node.js Postgres driver).
 * Connection string from env — never hardcoded.
 */
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

---

### 0.3.5 — Generate and apply migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Verify with `npx drizzle-kit studio` — all tables should be visible.

---

### 0.3.6 — Create seed script

`src/lib/server/db/seed.ts`:

**Seed data includes:**

1. **Two skill paths** from `02-DATABASE-SCHEMA.md`:
   - "Introduce Yourself" (👋, greetings, beginner, de) with 4 lessons
   - "At the Café" (☕, food, beginner, de) with 4 lessons

2. **Two dummy test users** (from `.clinerules` Rule 5):
   - Test Kid: testkid@lingofriends.test, password Test1234!, fr→de, 11-14, interests football/gaming/animals, friend code LF-TEST01
   - Test Friend: testfriend@lingofriends.test, password Test1234!, fr→de, 11-14, interests music/cooking/art, friend code LF-TEST02
   - Both users get complete profiles, empty learner profiles, and one tree each (Introduce Yourself skill path)

3. **Password hashing** — use argon2 to hash passwords (import from the auth helpers if already created, otherwise inline)

Run with: `npx tsx src/lib/server/db/seed.ts`

---

## 🤔 Decision Point for User

> **Primary key type:** The schema uses UUID for all IDs. Options:
> - **(A) UUID v4** — Standard, 36-char strings, good for distributed systems. URLs look like `/lesson/550e8400-e29b-41d4-a716-446655440000`
> - **(B) nanoid (21 chars)** — Shorter, URL-friendly. URLs look like `/lesson/V1StGXR8_Z5jdHi6B-myT`
> - **(C) UUID for DB, nanoid for URL slugs** — Best of both worlds but two ID columns per table
>
> **My recommendation:** Option A (UUID) for simplicity. URLs are internal (not shared or bookmarked by kids), so length doesn't matter. Keep it simple.
>
> **Waiting for your input.**

---

## Tests

```typescript
// src/tests/server/db/schema.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '$lib/server/db';
import { users, profiles, skillPaths, lessonDefinitions, userTrees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema', () => {
  it('skill paths are seeded', async () => {
    const paths = await db.select().from(skillPaths);
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths.map(p => p.name)).toContain('Introduce Yourself');
    expect(paths.map(p => p.name)).toContain('At the Café');
  });

  it('lesson definitions exist for each skill path', async () => {
    const lessons = await db.select().from(lessonDefinitions);
    expect(lessons.length).toBeGreaterThanOrEqual(8); // 4 per path × 2 paths
  });

  it('dummy test user "Test Kid" exists', async () => {
    const result = await db.select().from(users).where(eq(users.email, 'testkid@lingofriends.test'));
    expect(result.length).toBe(1);
    expect(result[0].displayName).toBe('Test Kid');
    expect(result[0].friendCode).toBe('LF-TEST01');
  });

  it('dummy test user "Test Friend" exists', async () => {
    const result = await db.select().from(users).where(eq(users.email, 'testfriend@lingofriends.test'));
    expect(result.length).toBe(1);
    expect(result[0].friendCode).toBe('LF-TEST02');
  });

  it('dummy users have profiles', async () => {
    const testKid = await db.select().from(users).where(eq(users.email, 'testkid@lingofriends.test'));
    const profile = await db.select().from(profiles).where(eq(profiles.userId, testKid[0].id));
    expect(profile.length).toBe(1);
    expect(profile[0].nativeLanguage).toBe('fr');
    expect(profile[0].targetLanguage).toBe('de');
    expect(profile[0].ageGroup).toBe('11-14');
  });

  it('dummy users have trees', async () => {
    const testKid = await db.select().from(users).where(eq(users.email, 'testkid@lingofriends.test'));
    const trees = await db.select().from(userTrees).where(eq(userTrees.userId, testKid[0].id));
    expect(trees.length).toBeGreaterThanOrEqual(1);
  });

  it('cascading delete removes profile when user deleted', async () => {
    // Create temp user + profile
    const [tempUser] = await db.insert(users).values({
      email: 'temp@test.com',
      passwordHash: 'temp',
      username: 'temp-user',
      displayName: 'Temp',
      friendCode: 'LF-TEMP99',
    }).returning();

    await db.insert(profiles).values({
      userId: tempUser.id,
      nativeLanguage: 'en',
      targetLanguage: 'de',
      ageGroup: '11-14',
    });

    // Delete user → profile should cascade
    await db.delete(users).where(eq(users.id, tempUser.id));
    const profile = await db.select().from(profiles).where(eq(profiles.userId, tempUser.id));
    expect(profile.length).toBe(0);
  });
});
```

### Test Command
```bash
npx vitest run src/tests/server/db/schema.test.ts
```

---

## Acceptance Criteria

- [ ] Postgres running via Docker
- [ ] All 12 tables created (verify with `npx drizzle-kit studio`)
- [ ] All indexes created
- [ ] Seed data inserted: 2 skill paths, 8 lesson definitions, 2 dummy users with profiles and trees
- [ ] `db` export works in server-side code
- [ ] Cascading deletes work (user deletion removes profile)
- [ ] Tests: 7/7 passing
- [ ] Passwords are hashed in seed (not plaintext)

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|

**Tests:** ___/___ passing

**Notes for Future Tasks:** ___
