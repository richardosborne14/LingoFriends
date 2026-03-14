# Task 0.6: Layout Shells

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 8/10
**Estimated Time:** 1h
**Dependencies:** Tasks 0.4 (auth) and 0.5 (UI components)
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules`
2. `01-DESIGN-SYSTEM.md` — layout sections, tab bar spec, navigation structure
3. `05-CLINERULES.md` (new-docs) — file organisation and route groups

---

## Objective

Create the three layout shells (root, auth, app) with auth guarding, so authenticated users see the app layout with navigation and unauthenticated users see the auth layout.

---

## Subtasks

### 0.6.1 — Root layout (`src/routes/+layout.svelte`)

```svelte
<script>
  /**
   * Root layout — applies to ALL pages.
   * Loads Nunito font, sets bark-50 background,
   * and passes user data from server to client.
   */
  import '../app.css';
</script>

<div class="min-h-screen bg-bark-50 font-body text-bark-700">
  <slot />
</div>
```

Root server layout (`src/routes/+layout.server.ts`):
```typescript
/**
 * Root server layout — provides user data to all pages.
 * Runs on every request (after hooks.server.ts sets locals).
 */
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
  };
};
```

---

### 0.6.2 — Auth layout (`src/routes/(auth)/+layout.svelte`)

Full-screen, centered content. No navigation bar. Subtle decorative background.

```svelte
<script>
  /**
   * Auth layout — for login, register, onboarding.
   * Full-screen centered with no navigation chrome.
   * Subtle gradient background (coral-50 to bark-50).
   */
</script>

<div class="min-h-screen bg-gradient-to-b from-coral-50 to-bark-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <slot />
  </div>
</div>
```

---

### 0.6.3 — App layout with auth guard

`src/routes/(app)/+layout.server.ts`:
```typescript
/**
 * App layout auth guard.
 * Redirects unauthenticated users to /login.
 * Redirects users with incomplete onboarding to /onboarding.
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  // Check onboarding status
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, locals.user.id));

  if (!profile?.onboardingComplete) {
    throw redirect(302, '/onboarding');
  }

  return { user: locals.user, profile };
};
```

`src/routes/(app)/+layout.svelte`:
```svelte
<script>
  /**
   * App layout — for authenticated users.
   * Mobile: bottom tab bar (Garden, Friends, Profile).
   * Desktop: left sidebar (deferred to polish — use bottom bar for MVP).
   * Header: floating stats bar with SunDrops and streak.
   */
  import { page } from '$app/stores';
  // Import Lucide icons for tabs
</script>

<!-- Floating stats header -->
<header class="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-sm border-b border-bark-150 px-4 py-2 flex justify-between items-center">
  <span class="font-display font-bold text-bark-700">LingoFriends</span>
  <div class="flex gap-3 items-center text-sm font-semibold">
    <span>☀️ {data.profile.totalSunDrops}</span>
    <span>🔥 {data.profile.currentStreak}</span>
  </div>
</header>

<!-- Page content with top/bottom padding for fixed bars -->
<main class="pt-14 pb-20">
  <slot />
</main>

<!-- Bottom tab bar -->
<nav class="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-bark-150 flex justify-around py-2 pb-safe">
  <a href="/garden" class="tab" class:active={$page.url.pathname === '/garden'}>
    🌳 Garden
  </a>
  <a href="/friends" class="tab" class:active={$page.url.pathname === '/friends'}>
    👥 Friends
  </a>
  <a href="/profile" class="tab" class:active={$page.url.pathname === '/profile'}>
    ⚙️ Profile
  </a>
</nav>
```

---

## 🖥️ Browser Verification

1. Visit `/login` while logged out → auth layout (centered, gradient background, no nav)
2. Visit `/garden` while logged out → redirect to `/login`
3. Log in as dummy user (manually set session or use seed data) → app layout with bottom tabs
4. Verify: stats header shows ☀️ and 🔥, bottom tabs highlight current page

**Pass/Fail:** ___

---

## Tests

```typescript
// src/tests/routes/layout.test.ts
import { describe, it, expect } from 'vitest';

describe('Auth Guard', () => {
  it('redirects unauthenticated users from /garden to /login', async () => {
    // Simulate request without session → verify 302 redirect to /login
  });

  it('redirects incomplete onboarding to /onboarding', async () => {
    // Simulate request with session but onboardingComplete=false
    // → verify 302 redirect to /onboarding
  });

  it('allows authenticated user with complete onboarding', async () => {
    // Simulate request with valid session + onboardingComplete=true
    // → verify 200 response
  });
});
```

### Test Command
```bash
npx vitest run src/tests/routes/layout.test.ts
```

---

## Acceptance Criteria

- [ ] Auth layout: centered, gradient background, no navigation
- [ ] App layout: stats header, bottom tab bar, highlights active tab
- [ ] Auth guard: unauthenticated → /login
- [ ] Auth guard: incomplete onboarding → /onboarding
- [ ] Auth guard: complete user → page renders
- [ ] Safe area insets for mobile (bottom tabs use `pb-safe`)
- [ ] Tests: 3/3 passing
- [ ] Browser verification passed

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:** ___

**Tests:** ___/___ passing

**Notes for Future Tasks:** ___
