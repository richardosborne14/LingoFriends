# Task 0.1: SvelteKit Project Init

**Status:** 🔲 Not started
**Phase:** 0 (Scaffolding)
**Confidence Target:** 8/10
**Estimated Time:** 1h
**Dependencies:** None — first task
**Actual Time:** _fill after completion_
**Completed:** _fill after completion_

---

## Mandatory Reads Before Starting

1. `.clinerules` — always first
2. `00-REWRITE-MASTER-PLAN.md` — tech stack table (SvelteKit + Tailwind + Drizzle + Lucia)
3. `01-DESIGN-SYSTEM.md` — Tailwind config section (all colour tokens, fonts, shadows, radii)

---

## Objective

Create a new SvelteKit project with all dependencies installed, Tailwind configured with the full LingoFriends design system, and TypeScript strict mode enabled. This is the foundation every other task builds on.

---

## Subtasks

### 0.1.1 — Create the SvelteKit project

```bash
npx sv create lingofriends-v2
# Select: SvelteKit minimal, TypeScript, ESLint, Prettier
cd lingofriends-v2
npm install
```

Verify `npm run dev` starts without errors before continuing.

---

### 0.1.2 — Install all dependencies

Run these in order. If any fail, stop and debug before continuing.

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
npm install zod nanoid argon2
npm install -D vitest @testing-library/svelte jsdom

# HTTP client (for Groq API — OpenAI-compatible)
npm install openai
```

---

### 0.1.3 — Configure Tailwind with design system tokens

Create `tailwind.config.js` with the EXACT tokens from `01-DESIGN-SYSTEM.md`. This is critical — every UI component in the app depends on these tokens being correct.

**Colour scales to include:** `coral` (50-700), `forest` (50-700), `sundrop` (50-700), `sky` (50, 300-500), `bloom` (300-500), `storm` (400-500), `bark` (50-800 including 150).

**Font families:** `display` and `body` (both Nunito-based), `mono` (JetBrains Mono).

**Border radii:** `btn` (16px), `card` (20px), `input` (14px), `pill` (100px), `chip` (100px).

**Box shadows:** `btn-coral` (0 4px 0 #D94E28), `btn-forest` (0 4px 0 #1F7F4C), `btn-ghost` (0 3px 0 #E4DED5), `card` (0 2px 8px rgba(0,0,0,0.04)), `card-elevated` (0 4px 16px rgba(242,102,61,0.12)), `toast` (0 8px 24px rgba(0,0,0,0.15)).

Add to `src/app.css`:
```css
@import 'tailwindcss';
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
```

Update `vite.config.ts` to include the Tailwind plugin:
```typescript
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
});
```

---

### 0.1.4 — Configure TypeScript strict mode

In `tsconfig.json`:
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

Run `npx tsc --noEmit` to verify zero errors.

---

### 0.1.5 — Create `.env.example`

```env
# Database (server-side only)
DATABASE_URL=postgresql://user:password@localhost:5432/lingofriends

# AI Providers (server-side only — NO VITE_ prefix)
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Google TTS (server-side only)
GOOGLE_TTS_API_KEY=

# Public (client-side visible)
VITE_APP_URL=http://localhost:5173
```

**Important:** AI and TTS keys must NOT have the `VITE_` prefix. Only `VITE_APP_URL` is client-visible. This prevents API keys from leaking into the browser bundle.

Copy to `.env` with real values for local development.

---

## 🤔 Decision Point for User

> **Font hosting strategy:** The design system uses Nunito from Google Fonts. For a children's app with EU privacy requirements, should I:
> - **(A) Google Fonts CDN** — simpler setup, but sends requests to Google on every page load (GDPR concern)
> - **(B) Self-host the font files** — better privacy, no external requests, slightly more setup
>
> **My recommendation:** Self-host. Download Nunito woff2 files, place in `static/fonts/`, and reference with `@font-face` in `app.css`. Zero external requests.
>
> **Waiting for your input before proceeding.**

---

## Tests

```typescript
// src/tests/setup/project-init.test.ts
import { describe, it, expect } from 'vitest';

describe('Project Init', () => {
  it('TypeScript strict mode is enabled', async () => {
    // Read tsconfig.json and verify strict: true
    const tsconfig = await import('../../tsconfig.json');
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  it('required dependencies are installed', async () => {
    // Read package.json and verify key dependencies exist
    const pkg = await import('../../package.json');
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps['tailwindcss']).toBeDefined();
    expect(deps['drizzle-orm']).toBeDefined();
    expect(deps['lucia']).toBeDefined();
    expect(deps['@anthropic-ai/sdk']).toBeDefined();
    expect(deps['three']).toBeDefined();
    expect(deps['vitest']).toBeDefined();
  });

  it('Tailwind design tokens are configured', async () => {
    // Import tailwind config and verify key tokens
    const config = await import('../../tailwind.config.js');
    const colors = config.default?.theme?.extend?.colors;
    expect(colors?.coral?.[400]).toBe('#FF8A6A');
    expect(colors?.forest?.[400]).toBe('#48B87E');
    expect(colors?.sundrop?.[400]).toBe('#FFD84A');
    expect(colors?.bark?.[50]).toBe('#FDFCFA');
  });
});
```

### Test Command
```bash
npx vitest run src/tests/setup/project-init.test.ts
```

---

## 🖥️ Browser Verification

After all subtasks are complete:

1. Run `npm run dev`
2. Open `http://localhost:5173`
3. Create a temporary test page at `src/routes/+page.svelte`:

```svelte
<div class="min-h-screen bg-bark-50 flex items-center justify-center">
  <div class="bg-white rounded-card shadow-card p-8 max-w-md">
    <h1 class="font-display text-3xl font-bold text-bark-800 mb-4">
      LingoFriends V2
    </h1>
    <p class="font-body text-bark-500 mb-6">
      Tailwind is working if you can read this in Nunito font on a cream background.
    </p>
    <button class="bg-coral-400 text-white font-bold py-3 px-6 rounded-btn shadow-btn-coral hover:bg-coral-500 active:shadow-none active:translate-y-1 transition-all">
      Primary Button
    </button>
  </div>
</div>
```

4. **Verify:**
   - [ ] Background is cream (bark-50: #FDFCFA)
   - [ ] Card has rounded corners and subtle shadow
   - [ ] Text is in Nunito font
   - [ ] Button is coral with 3D shadow effect
   - [ ] Button depresses on click (active state)

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] `npm run dev` starts without errors
- [ ] `npx tsc --noEmit` compiles with zero errors
- [ ] `npx vitest run` — 3/3 tests passing
- [ ] Tailwind renders correctly with design system tokens
- [ ] Nunito font loads in browser
- [ ] All dependencies present in `package.json`
- [ ] `.env.example` created with all required variables
- [ ] Browser verification passed

---

## Completion (fill after task is done)

**Confidence:** ___/10

**What Was Built:**
_2-3 sentences_

**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|
| | | |

**Tests:** ___/___ passing

**Notes for Future Tasks:**
_Anything the next task should know_

**Learnings Added to LEARNINGS.md:**
_List any new entries_

**Bugs Added to BUGS.md:**
_List any new entries_
