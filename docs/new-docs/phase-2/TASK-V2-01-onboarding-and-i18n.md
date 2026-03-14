# TASK-V2-01: Onboarding Overhaul & i18n System

**Status:** Not Started  
**Priority:** Critical — this is the first thing every user experiences  
**Estimated Time:** 12–16 hours  
**Dependencies:** None (foundational task, do this first)  
**Covers items:** #1 (interests/language selection), #2 (i18n), #13 (default tree on signup), #14 (level selection)

---

## Problem

The current v2 onboarding is minimal — users can sign up but don't go through a guided flow that captures their native language, target language, interests, or proficiency level. The UI doesn't change language based on selection. There's no default tree created on signup (it only appears after the first lesson). There's no "what level are you?" question.

---

## Goals

1. Multi-step onboarding flow after signup: native language → target language → interests → level
2. i18n system that switches the entire UI language when native language is selected
3. Default tree planted in garden on account creation (not after first lesson)
4. Level selection with appealing card-based UI
5. All onboarding data saved to user profile for AI personalization

---

## Architecture

```
Signup → OnboardingFlow (4 steps) → Default Tree Created → First Lesson Auto-Starts
                                                              ↓
                                        Profile saved with: nativeLang, targetLang,
                                        interests[], level, onboardingComplete=true
```

### i18n Setup

For Svelte, use `svelte-i18n` (the Svelte equivalent of i18next). It's lightweight, supports runtime locale switching, and integrates cleanly with Svelte stores.

```bash
npm install svelte-i18n
```

```
src/
  lib/
    i18n/
      index.ts          # init + locale store
      en.json           # English translations
      fr.json           # French translations
```

---

## Step-by-Step Implementation

### Step 1 — i18n Foundation

**Create `src/lib/i18n/index.ts`:**

```typescript
import { register, init, getLocaleFromNavigator, locale } from 'svelte-i18n';

register('en', () => import('./en.json'));
register('fr', () => import('./fr.json'));

init({
  fallbackLocale: 'en',
  initialLocale: getLocaleFromNavigator() || 'en',
});

export { locale };
```

**Create `src/lib/i18n/en.json`:**

```json
{
  "onboarding": {
    "step1_title": "What language do you speak?",
    "step1_subtitle": "We'll use this language for everything in the app",
    "step2_title": "What do you want to learn?",
    "step2_subtitle": "Pick your adventure!",
    "step3_title": "What are you into?",
    "step3_subtitle": "Pick as many as you like — this helps make your lessons awesome!",
    "step4_title": "How much do you already know?",
    "step4_subtitle": "Don't worry, we'll figure out the perfect level together!",
    "next": "Next",
    "back": "Back",
    "skip": "Skip for now",
    "letsGo": "Let's Go!"
  },
  "levels": {
    "total_beginner": "Total Beginner",
    "total_beginner_desc": "I've never learned this language before",
    "know_some_words": "I Know Some Words",
    "know_some_words_desc": "I can say hello, count to 10, basic stuff",
    "simple_sentences": "Simple Sentences",
    "simple_sentences_desc": "I can order food and ask for directions",
    "can_have_conversations": "I Can Chat!",
    "can_have_conversations_desc": "I can have basic conversations with people"
  },
  "common": {
    "sundrops": "Sun Drops",
    "gems": "Gems",
    "garden": "Garden",
    "lessons": "Lessons",
    "settings": "Settings"
  }
}
```

**Create `src/lib/i18n/fr.json`** with French equivalents.

**Update `src/App.svelte` (or root layout):**

```svelte
<script>
  import '$lib/i18n';
</script>
```

Then replace all hardcoded strings across the app with `$_('key')` or `$t('key')` from svelte-i18n.

### Step 2 — Onboarding Flow Container

**Create `src/lib/components/onboarding/OnboardingFlow.svelte`:**

A full-screen overlay that manages the 4-step flow. State:

```typescript
interface OnboardingState {
  currentStep: number; // 0-3
  nativeLanguage: 'en' | 'fr' | null;
  targetLanguage: 'en' | 'de' | null;
  interests: string[];
  level: 'total_beginner' | 'know_some_words' | 'simple_sentences' | 'can_have_conversations' | null;
}
```

Include a progress indicator (dots or bar) and back/next navigation. Animate transitions between steps with a horizontal slide.

### Step 3 — Step 1: Native Language

**Create `src/lib/components/onboarding/StepNativeLanguage.svelte`:**

Two large, tappable cards:
- 🇬🇧 **English** — "I speak English"
- 🇫🇷 **Français** — "Je parle français"

On selection:
1. Highlight the selected card with a satisfying bounce animation
2. Immediately switch the app locale: `locale.set(selected)`
3. All subsequent onboarding text renders in the chosen language
4. Auto-advance to step 2 after a short delay (400ms)

Additional grayed-out cards for future languages (Español, Deutsch, etc.) with "Coming soon!" badges.

### Step 4 — Step 2: Target Language

**Create `src/lib/components/onboarding/StepTargetLanguage.svelte`:**

Cards for available targets, filtered by native language:
- If native = English: show German 🇩🇪, (French 🇫🇷 coming soon)
- If native = French: show English 🇬🇧, German 🇩🇪

Each card has:
- Flag emoji or icon
- Language name (in the native language)
- Short fun tagline: "Learn to speak like a Berliner!" / "Become an English champion!"

Grayed out cards for future subjects:
- 🔢 Maths — "Coming soon!"
- 🐱 Scratch — "Coming soon!"

### Step 5 — Step 3: Interests

**Create `src/lib/components/onboarding/StepInterests.svelte`:**

A scrollable grid of tappable chips/pills organized by category:

```typescript
const INTEREST_CATEGORIES = {
  hobbies: [
    { id: 'dancing', emoji: '💃' },
    { id: 'drawing', emoji: '🎨' },
    { id: 'gaming', emoji: '🎮' },
    { id: 'cooking', emoji: '🍳' },
    { id: 'reading', emoji: '📚' },
    { id: 'photography', emoji: '📷' },
    { id: 'crafts', emoji: '✂️' },
    { id: 'movies', emoji: '🎬' },
  ],
  sports: [
    { id: 'football', emoji: '⚽' },
    { id: 'basketball', emoji: '🏀' },
    { id: 'swimming', emoji: '🏊' },
    { id: 'skateboarding', emoji: '🛹' },
    { id: 'cycling', emoji: '🚴' },
    { id: 'martial_arts', emoji: '🥋' },
    { id: 'gymnastics', emoji: '🤸' },
    { id: 'tennis', emoji: '🎾' },
  ],
  music: [
    { id: 'kpop', emoji: '🎤' },
    { id: 'rap', emoji: '🎧' },
    { id: 'rock', emoji: '🎸' },
    { id: 'pop', emoji: '🎵' },
    { id: 'classical', emoji: '🎻' },
    { id: 'electronic', emoji: '🎹' },
  ],
  other: [
    { id: 'animals', emoji: '🐾' },
    { id: 'science', emoji: '🔬' },
    { id: 'space', emoji: '🚀' },
    { id: 'dinosaurs', emoji: '🦕' },
    { id: 'nature', emoji: '🌿' },
    { id: 'travel', emoji: '✈️' },
    { id: 'fashion', emoji: '👗' },
    { id: 'superheroes', emoji: '🦸' },
    { id: 'magic', emoji: '🪄' },
  ]
};
```

Labels are translated via i18n. Chips toggle on tap with a pop animation. Multi-select, no limit. "Skip for now" option at the bottom. Category headers styled as subtle dividers.

### Step 6 — Step 4: Level Selection

**Create `src/lib/components/onboarding/StepLevel.svelte`:**

Four large, visually distinct cards stacked vertically. Each should feel like a character select screen:

| Level | Visual | Title | Description |
|-------|--------|-------|-------------|
| `total_beginner` | 🌱 Seed | "Starting Fresh" | "I've never learned this language" |
| `know_some_words` | 🌿 Sprout | "I Know a Few Things" | "Hello, goodbye, numbers... the basics" |
| `simple_sentences` | 🌳 Young Tree | "I Can Make Sentences" | "I can ask questions and say what I want" |
| `can_have_conversations` | 🌸 Flowering Tree | "Let's Chat!" | "I can have real conversations" |

The plant metaphor ties into the garden concept. Each card has:
- A plant illustration that matches the level (seed → sprout → tree → flowering tree)
- The title in bold
- The description in smaller text
- A colored border/background that gets richer as the level increases (pale green → emerald → forest → gold)

Selection highlights with scale animation. Reassuring text at the bottom: "Don't worry — I'll adjust as we go!"

### Step 7 — Save Profile & Create Default Tree

On completing the final step:

1. **Save onboarding data to user profile:**
   ```typescript
   await updateProfile({
     native_language: state.nativeLanguage,
     target_language: state.targetLanguage,
     interests: state.interests,
     level: state.level,
     onboarding_complete: true,
   });
   ```

2. **Create a default tree in the garden:**
   ```typescript
   await createTree({
     user_id: currentUser.id,
     species: 'cherry', // default starter tree
     name: getDefaultTreeName(state.targetLanguage), // e.g. "My German Tree"
     stage: 'seed',
     health: 100,
     position: { x: 0, z: 0 }, // center of garden
   });
   ```

3. **Show a brief celebration screen** (confetti, "Your garden is ready! 🌱") for 2 seconds

4. **Auto-navigate to the first lesson** (see TASK-V2-03)

### Step 8 — Profile Editing

Add a Settings/Profile page where users can re-enter any onboarding step:
- Change native language (triggers i18n switch)
- Change target language (warning: progress is language-specific)
- Update interests
- View/change level

This reuses the same step components in "edit mode" (pre-filled with current values, "Save" instead of "Next" on last step).

---

## Testing Checklist

- [ ] Fresh signup → onboarding flow appears automatically
- [ ] Selecting French as native language → all UI text switches to French immediately
- [ ] Back button preserves previous selections
- [ ] Can skip interests step, still proceeds
- [ ] Level selection works, visual feedback is satisfying
- [ ] On completion: profile saved with all fields
- [ ] On completion: default tree exists in garden
- [ ] On completion: user is routed to first lesson
- [ ] Profile editing re-opens steps with current values
- [ ] i18n covers all hardcoded strings in the app (audit needed)

---

## Files Created/Modified

**New files:**
- `src/lib/i18n/index.ts`
- `src/lib/i18n/en.json`
- `src/lib/i18n/fr.json`
- `src/lib/components/onboarding/OnboardingFlow.svelte`
- `src/lib/components/onboarding/StepNativeLanguage.svelte`
- `src/lib/components/onboarding/StepTargetLanguage.svelte`
- `src/lib/components/onboarding/StepInterests.svelte`
- `src/lib/components/onboarding/StepLevel.svelte`
- `src/lib/components/onboarding/ProgressIndicator.svelte`

**Modified files:**
- `src/App.svelte` or root layout — import i18n, gate onboarding
- `src/lib/stores/` — user profile store updates
- `src/lib/services/` — profile API, tree creation API
- Every component with hardcoded English strings → use `$_()` / `$t()`

---

## Risk Mitigation

- **i18n string audit**: After setup, do a global search for hardcoded English strings. This is tedious but essential — missing strings break the French experience.
- **Locale persistence**: Store selected locale in the user profile AND localStorage so it survives page refresh before profile loads.
- **Default tree race condition**: Ensure tree creation completes before navigating to garden view, or handle the case where garden renders before tree data arrives.
