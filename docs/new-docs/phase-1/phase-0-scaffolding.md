# Phase 0: Project Scaffolding & Setup

**Status:** 🔲 Not started
**Estimated Time:** 8–12 hours
**Dependencies:** None — this is the starting point
**Output:** A running dev environment with empty routes, DB connection, and design system

---

## Task 0.1: SvelteKit Project Init (1h)

### What to Do

```bash
npx sv create lingofriends-v2
# Select: SvelteKit minimal, TypeScript, ESLint, Prettier
cd lingofriends-v2
npm install
```

### Install Core Dependencies

```bash
# Styling
npm install -D tailwindcss @tailwindcss/vite

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install lucia @lucia-auth/adapter-drizzle

# AI
npm install @anthropic-ai/sdk

# 3D
npm install three
npm install -D @types/three

# Utilities
npm install zod nanoid
npm install -D vitest
```

### Configure Tailwind

Set up `tailwind.config.js` exactly as specified in `01-DESIGN-SYSTEM.md` with all custom color tokens, font families, border radii, and box shadows.

Add to `src/app.css`:
```css
@import 'tailwindcss';
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
```

### Configure TypeScript

`tsconfig.json` — ensure `"strict": true` and path aliases:
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$types/*": ["./src/lib/types/*"]
    }
  }
}
```

### Create `.env.example`

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lingofriends

# AI Providers (server-side only — no VITE_ prefix)
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Google TTS (server-side only)
GOOGLE_TTS_API_KEY=

# Public (client-side visible)
VITE_APP_URL=http://localhost:5173
```

### Acceptance Criteria
- [ ] `npm run dev` starts without errors
- [ ] Tailwind classes work (test with a colored div)
- [ ] TypeScript strict mode is on
- [ ] All dependencies installed

---

## Task 0.2: Project Structure (1h)

### What to Do

Create the full directory structure from `.clinerules` Rule 1. Create empty placeholder files where needed:

```
src/lib/components/ui/.gitkeep
src/lib/components/activities/.gitkeep
src/lib/components/garden/.gitkeep
src/lib/components/onboarding/.gitkeep
src/lib/three/garden/.gitkeep
src/lib/three/avatars/.gitkeep
src/lib/three/utils/.gitkeep
src/lib/stores/.gitkeep
src/lib/services/.gitkeep
src/lib/server/ai/.gitkeep
src/lib/server/db/.gitkeep
src/lib/server/auth/.gitkeep
src/lib/utils/language.ts          ← Create with full implementation (see below)
src/lib/types/index.ts             ← Create with core type exports
src/routes/(auth)/login/+page.svelte
src/routes/(auth)/register/+page.svelte
src/routes/(auth)/onboarding/+page.svelte
src/routes/(app)/garden/+page.svelte
src/routes/(app)/lesson/[id]/+page.svelte
src/routes/(app)/friends/+page.svelte
src/routes/(app)/profile/+page.svelte
server/.gitkeep
static/models/.gitkeep
static/sprites/.gitkeep
_v1_reference/.gitkeep
```

### Create `src/lib/utils/language.ts`

```typescript
/**
 * Language Utilities — SINGLE SOURCE OF TRUTH
 *
 * Every file that needs language code ↔ name conversion
 * MUST import from this file. No exceptions.
 */

export type LanguageCode = 'fr' | 'en' | 'de';
export type LanguageName = 'French' | 'English' | 'German';

interface LanguageConfig {
  code: LanguageCode;
  name: LanguageName;
  ttsCode: string;
  flag: string;
  nativeName: string;
}

const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  fr: { code: 'fr', name: 'French', ttsCode: 'fr-FR', flag: '🇫🇷', nativeName: 'Français' },
  en: { code: 'en', name: 'English', ttsCode: 'en-GB', flag: '🇬🇧', nativeName: 'English' },
  de: { code: 'de', name: 'German', ttsCode: 'de-DE', flag: '🇩🇪', nativeName: 'Deutsch' },
};

export function toLanguageCode(nameOrCode: string): LanguageCode {
  const lower = nameOrCode.toLowerCase().trim();
  // Direct code match
  if (lower in LANGUAGES) return lower as LanguageCode;
  // Name match
  const found = Object.values(LANGUAGES).find(
    (l) => l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower
  );
  if (found) return found.code;
  throw new Error(`Unknown language: "${nameOrCode}"`);
}

export function toLanguageName(code: LanguageCode): LanguageName {
  return LANGUAGES[code]?.name ?? (() => { throw new Error(`Unknown code: "${code}"`); })();
}

export function getTTSCode(code: LanguageCode): string {
  return LANGUAGES[code]?.ttsCode ?? 'en-GB';
}

export function getFlag(code: LanguageCode): string {
  return LANGUAGES[code]?.flag ?? '🏳️';
}

export function getAllLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES);
}
```

### Acceptance Criteria
- [ ] All directories exist
- [ ] `language.ts` compiles and exports correctly
- [ ] Route files load (empty pages, no errors)

---

## Task 0.3: Database Setup (2h)

### What to Do

1. Install and start Postgres locally (Docker recommended):
```bash
docker run --name lingofriends-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=lingofriends -p 5432:5432 -d postgres:16
```

2. Create `drizzle.config.ts`:
```typescript
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

3. Create `src/lib/server/db/schema.ts` with ALL tables from `02-DATABASE-SCHEMA.md`. Copy the Drizzle definitions exactly.

4. Create `src/lib/server/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

5. Generate and apply the initial migration:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

6. Create `src/lib/server/db/seed.ts` with the initial skill paths from `02-DATABASE-SCHEMA.md`.

7. Run the seed:
```bash
npx tsx src/lib/server/db/seed.ts
```

### Acceptance Criteria
- [ ] Postgres is running with `lingofriends` database
- [ ] All tables created (verify with `drizzle-kit studio`)
- [ ] Seed data inserted (skill paths visible in studio)
- [ ] `db` export works in server-side code

---

## Task 0.4: Auth Setup (2h)

### What to Do

1. Create `src/lib/server/auth/lucia.ts`:
```typescript
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
```

2. Create auth helper functions:
- `hashPassword(password: string): Promise<string>` — use Argon2
- `verifyPassword(hash: string, password: string): Promise<boolean>`
- `generateFriendCode(): string` — 8-char alphanumeric

3. Create SvelteKit hooks for session validation in `src/hooks.server.ts`:
```typescript
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
  if (session?.fresh) {
    const cookie = lucia.createSessionCookie(session.id);
    event.cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
  }
  if (!session) {
    const cookie = lucia.createBlankSessionCookie();
    event.cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
  }
  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};
```

4. Create `src/app.d.ts` with typed locals:
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

### Acceptance Criteria
- [ ] Lucia configured with Drizzle adapter
- [ ] Hooks validate sessions on every request
- [ ] Password hashing works
- [ ] Friend code generation produces unique 8-char codes
- [ ] TypeScript types are correct for `event.locals`

---

## Task 0.5: Design System Components (2–3h)

### What to Do

Create the core UI component library in `src/lib/components/ui/`:

**Button.svelte**
```svelte
<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';

  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let disabled: boolean = false;
  export let loading: boolean = false;
</script>

<!-- Implement with design system colors, 3D shadow, press animation -->
```

Build these components following `01-DESIGN-SYSTEM.md` exactly:

1. **Button.svelte** — primary/secondary/ghost/danger variants, 3D push effect
2. **Card.svelte** — standard and elevated variants
3. **Input.svelte** — text input with focus ring, error state
4. **Chip.svelte** — selectable chip/tag (for interests)
5. **ProgressBar.svelte** — gradient fill with animated width
6. **Badge.svelte** — small label badge (for SunDrops, streaks)
7. **Modal.svelte** — centered overlay with backdrop, enter/exit animation
8. **BottomSheet.svelte** — mobile bottom sheet with drag handle
9. **Toast.svelte** — notification toast with auto-dismiss
10. **Skeleton.svelte** — shimmer loading placeholder

Each component should:
- Accept all relevant design system props
- Use Tailwind classes with custom tokens
- Include hover/active/disabled states
- Have smooth transitions/animations
- Be fully accessible (aria attributes, keyboard nav)

### Acceptance Criteria
- [ ] All 10 components created and rendering correctly
- [ ] Primary button has coral-400 bg with 3D shadow effect
- [ ] Ghost button has outline style with bark-200 border
- [ ] Input shows coral focus ring
- [ ] Chips toggle between selected/unselected
- [ ] ProgressBar animates smoothly
- [ ] Modal/BottomSheet have enter/exit transitions
- [ ] All components pass basic accessibility check

---

## Task 0.6: Layout Shells (1h)

### What to Do

1. **Root layout** (`src/routes/+layout.svelte`):
   - Load Nunito font
   - Apply global styles (bark-50 background, body font)
   - Provide user data from locals to all pages

2. **Auth layout** (`src/routes/(auth)/+layout.svelte`):
   - Full-screen, centered content
   - Decorative garden illustration in background (subtle, blurred)
   - No navigation bar

3. **App layout** (`src/routes/(app)/+layout.svelte`):
   - Guard: redirect to `/login` if not authenticated
   - Mobile: bottom tab bar (Garden, Friends, Profile)
   - Desktop: left sidebar navigation
   - Tab icons from Lucide

4. **Auth guard** (`src/routes/(app)/+layout.server.ts`):
```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');
  return { user: locals.user };
};
```

### Acceptance Criteria
- [ ] Unauthenticated users see login page
- [ ] Authenticated users see app layout with bottom tabs (mobile) or sidebar (desktop)
- [ ] Nunito font loads correctly
- [ ] Background color is bark-50
- [ ] Bottom tabs highlight the active route
