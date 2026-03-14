# Phase 1: Auth & Profiles

**Status:** 🔲 Not started
**Estimated Time:** 10–14 hours
**Dependencies:** Phase 0 complete
**Output:** Users can register, log in, complete onboarding, and have a profile

---

## Task 1.1: Registration Flow (3h)

### What to Do

**Route:** `src/routes/(auth)/register/+page.svelte`

Build a two-step registration:

**Step 1 — Account Creation:**
- Display name input (what the app calls them)
- Email input (parent's email for recovery)
- Password input (min 6 chars, show/hide toggle)
- "Create Account" primary button

**Step 2 — Confirmation:**
- Show generated friend code prominently (e.g., "LF-A3K7M2")
- "Write this down! Your friends need it to find you."
- "Continue to Setup" button → redirects to `/onboarding`

**Server action** (`+page.server.ts`):
```typescript
// POST handler
1. Validate inputs with Zod
2. Hash password with Argon2
3. Generate unique friend code
4. Insert into `users` table
5. Create empty `profiles` row (onboarding_complete: false)
6. Create empty `learner_profiles` row
7. Create Lucia session
8. Set session cookie
9. Return friend code for display
```

**Validation rules:**
- Display name: 2–30 chars, no special chars except spaces and hyphens
- Email: valid email format
- Password: min 6 chars
- Username: auto-generated from display name + random suffix (e.g., "Max-7K2")

### Acceptance Criteria
- [ ] Registration creates user + profile + learner_profile in DB
- [ ] Friend code is displayed and unique
- [ ] Password is hashed (never stored plain)
- [ ] Session cookie is set
- [ ] Validation errors display inline
- [ ] Redirects to `/onboarding` on success

---

## Task 1.2: Login Flow (1.5h)

### What to Do

**Route:** `src/routes/(auth)/login/+page.svelte`

- Email input
- Password input with show/hide toggle
- "Log In" primary button
- "Don't have an account? Create one" link → `/register`

**Server action:**
```typescript
1. Find user by email
2. Verify password
3. Create Lucia session
4. Set session cookie
5. Check profile.onboarding_complete
6. If false → redirect to /onboarding
7. If true → redirect to /garden
```

**Error handling:**
- Wrong email: "No account found with that email"
- Wrong password: "Incorrect password"
- Rate limit: after 5 failed attempts in 5 minutes, show "Too many attempts. Try again in a few minutes."

### Acceptance Criteria
- [ ] Correct credentials → redirect to garden (or onboarding)
- [ ] Wrong credentials → clear error message
- [ ] Session persists across page reloads
- [ ] "Create account" link works

---

## Task 1.3: Logout (0.5h)

### What to Do

**Route:** `src/routes/api/logout/+server.ts`

```typescript
export const POST: RequestHandler = async ({ locals, cookies }) => {
  if (locals.session) {
    await lucia.invalidateSession(locals.session.id);
    const cookie = lucia.createBlankSessionCookie();
    cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
  }
  throw redirect(302, '/login');
};
```

Add logout button to the profile page and app layout sidebar.

### Acceptance Criteria
- [ ] Logout clears session
- [ ] Redirects to login
- [ ] Subsequent visits require re-login

---

## Task 1.4: Onboarding Flow (4–5h)

### What to Do

**Route:** `src/routes/(auth)/onboarding/+page.svelte`

Full-screen, step-by-step onboarding. One question per screen. Progress indicator at top (dots or bar).

**Guard:** If `profile.onboarding_complete === true`, redirect to `/garden`.

### Screen 1: Welcome
- LingoFriends logo (text-only for now, styled in display-xl with coral gradient)
- "Welcome, {displayName}!" in heading-1
- "Let's set up your garden" in body-lg, bark-400
- Primary button: "Let's go! 🌱"
- No back button on this screen

### Screen 2: Native Language
- "What language do you speak at home?" in heading-1
- Two large cards (full-width, stacked on mobile):
  - 🇫🇷 Français — with `nativeName` display
  - 🇬🇧 English
- Tap to select → card gets elevated style (coral border, shadow)
- "Next" button appears after selection

### Screen 3: Target Language
- "What do you want to learn?" in heading-1
- Available cards: depends on native language selection
  - If French native: 🇩🇪 German, 🇬🇧 English
  - If English native: 🇩🇪 German
- Greyed-out cards: 🔢 Maths, 🐱 Scratch ("Coming soon!")
- Greyed cards have `cursor: not-allowed`, bark-300 text, "Coming soon" badge

### Screen 4: Age Group
- "How old are you?" in heading-1
- Three cards:
  - "7–10" with illustration/emoji of young child
  - "11–14" with illustration/emoji of preteen
  - "15–18" with illustration/emoji of teenager
- Tap to select

### Screen 5: Interests
- "What do you love?" in heading-1
- "Pick as many as you like! This helps me personalise your lessons." in body, bark-400
- Chip grid, categorised:

```typescript
const INTEREST_CATEGORIES = {
  hobbies: [
    { id: 'dancing', label: 'Dancing', icon: '💃' },
    { id: 'reading', label: 'Reading', icon: '📚' },
    { id: 'drawing', label: 'Drawing', icon: '🎨' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'cooking', label: 'Cooking', icon: '🍳' },
    { id: 'photography', label: 'Photography', icon: '📷' },
  ],
  sports: [
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'swimming', label: 'Swimming', icon: '🏊' },
    { id: 'cycling', label: 'Cycling', icon: '🚴' },
    { id: 'skateboarding', label: 'Skateboarding', icon: '🛹' },
  ],
  music: [
    { id: 'kpop', label: 'K-pop', icon: '🎤' },
    { id: 'rap', label: 'Rap', icon: '🎧' },
    { id: 'rock', label: 'Rock', icon: '🎸' },
    { id: 'pop', label: 'Pop', icon: '🎵' },
  ],
  other: [
    { id: 'animals', label: 'Animals', icon: '🐾' },
    { id: 'science', label: 'Science', icon: '🔬' },
    { id: 'history', label: 'History', icon: '🏛️' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'fashion', label: 'Fashion', icon: '👗' },
    { id: 'movies', label: 'Movies', icon: '🎬' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
    { id: 'dinosaurs', label: 'Dinosaurs', icon: '🦕' },
  ],
};
```

- Multi-select chips (toggle on tap)
- "Skip" ghost button available
- "Next" always visible (can proceed with 0 selections)

### Screen 6: Avatar Customisation
- "Create your character!" in heading-1
- Simple grid of options:
  - Skin tone: 6 preset swatches
  - Hair color: 6 preset swatches
  - Shirt color: 8 preset swatches (include coral-400, forest-400, sky-400, storm-400)
  - Hat: none / cap / beanie / headband
- Live preview: for now, a simple SVG character that updates with selections. Will be replaced with glTF model in Phase 4.
- "Looks great!" primary button

### Screen 7: Garden Reveal
- Animated transition: zoom out to show empty garden illustration
- "Your first tree is planted! 🌱" in heading-1
- "Let's help it grow by learning something new." in body-lg, bark-400
- Primary button: "Start my first lesson"

**On completion (server action):**
```typescript
1. Update profiles table:
   - nativeLanguage, targetLanguage, ageGroup, interests
   - avatarSkinTone, avatarHairColor, avatarShirtColor, avatarHat
   - onboardingComplete: true
2. Create first user_tree:
   - Link to "Introduce Yourself" skill path
   - status: 'seed', health: 100, position: center of garden
3. Redirect to /garden
```

### Acceptance Criteria
- [ ] All 7 screens render with correct styling
- [ ] Progress indicator shows current step
- [ ] Back button works on screens 2-7
- [ ] Selections persist when navigating back
- [ ] Chips toggle correctly (multi-select)
- [ ] Avatar preview updates live
- [ ] Profile is saved to DB on completion
- [ ] First tree is created automatically
- [ ] Redirect to /garden works
- [ ] Already-onboarded users skip to /garden

---

## Task 1.5: Profile Page (1.5h)

### What to Do

**Route:** `src/routes/(app)/profile/+page.svelte`

Display and edit profile information:

- Avatar preview (SVG for now)
- Display name (editable)
- Stats: total SunDrops, streak, lessons completed
- Native language + target language (read-only, with flags)
- Interests (editable, reuses chip component from onboarding)
- Age group (read-only)
- Friend code (display with copy button)
- "Log out" danger button at bottom

**Server load:**
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, locals.user!.id),
  });
  return { profile };
};
```

### Acceptance Criteria
- [ ] Profile data loads and displays correctly
- [ ] Display name can be edited and saved
- [ ] Interests can be modified and saved
- [ ] Friend code displays with copy-to-clipboard
- [ ] Stats show real data from DB
- [ ] Logout button works
