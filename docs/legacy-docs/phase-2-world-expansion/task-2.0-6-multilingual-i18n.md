# Task 2.0.6: Multilingual i18n

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 2  
**Dependencies:** 2.0.5 (AI Provider Migration)  
**Estimated Time:** 8–12 hours  
**Priority:** High — French-speaking users who don't know English can't use the app

---

## Problem Statement

The app has English UI strings everywhere: button labels ("Next", "Skip", "Help"), instructions ("Tap to hear again", "Learn Something New!"), error messages, tutorial text, and settings labels. For a French child learning German, seeing random English text is confusing and breaks immersion.

Two distinct problems:

1. **UI strings** — Hardcoded English in React components
2. **AI-generated content** — The AI sometimes slips English into instructions, hints, or feedback that should be in the user's native language

---

## Objectives

1. Implement a lightweight i18n system for all UI strings
2. Create translation files for French (primary) with English as base
3. Enforce native-language-only output in all AI prompts
4. Design the system to easily add more native languages later (Spanish, Portuguese, etc.)
5. Use open-source translation tools or community contribution for additional languages

---

## Architecture

```
┌──────────────────────────────────┐
│         i18n Service             │
│                                  │
│  t('lesson.skip')  → "Passer"   │
│  t('lesson.next')  → "Suivant"  │
│  t('reward.earned', {n: 3})     │
│     → "Tu as gagné 3 ☀️!"      │
│                                  │
│  setLocale('fr') / getLocale()  │
│                                  │
│  Fallback: English if key       │
│  missing in target locale       │
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│      Translation Files           │
│                                  │
│  locales/en.json (base)          │
│  locales/fr.json (primary)       │
│  locales/de.json (future)        │
│  locales/es.json (future)        │
└──────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Create i18n Service

**File:** `src/services/i18n.ts` (NEW)

Keep it simple — no heavy framework like i18next. A lightweight key-value system:

```typescript
type TranslationDict = Record<string, string | Record<string, string>>;

class I18nService {
  private locale: string = 'fr'; // Default to French
  private translations: Map<string, TranslationDict> = new Map();

  /**
   * Get translated string.
   * Supports interpolation: t('reward.earned', { n: 3 })
   * Key format: 'section.key' e.g., 'lesson.skip', 'garden.water'
   */
  t(key: string, params?: Record<string, string | number>): string {
    const dict = this.translations.get(this.locale)
      || this.translations.get('en');
    
    // Resolve nested key (e.g., 'lesson.skip')
    let value = this.resolveKey(dict, key);
    
    // Fallback to English
    if (!value && this.locale !== 'en') {
      value = this.resolveKey(this.translations.get('en'), key);
    }
    
    // Fallback to key itself
    if (!value) return key;
    
    // Interpolate params
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value!.replace(`{${k}}`, String(v));
      });
    }
    
    return value;
  }

  setLocale(locale: string): void { /* ... */ }
  getLocale(): string { return this.locale; }
  loadTranslations(locale: string, dict: TranslationDict): void { /* ... */ }
}

export const i18n = new I18nService();
```

### Step 2 — Create useTranslation Hook

**File:** `src/hooks/useTranslation.ts` (NEW)

```typescript
import { useCallback } from 'react';
import { i18n } from '../services/i18n';

export function useTranslation() {
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => i18n.t(key, params),
    []
  );
  return { t, locale: i18n.getLocale() };
}
```

### Step 3 — Create English Base Translation File

**File:** `src/locales/en.json` (NEW)

Audit the entire codebase for hardcoded English strings. Group by component area:

```json
{
  "common": {
    "next": "Next",
    "back": "Back",
    "skip": "Skip",
    "cancel": "Cancel",
    "close": "Close",
    "retry": "Retry",
    "continue": "Continue",
    "loading": "Loading..."
  },
  "lesson": {
    "tapToHear": "Tap to hear again",
    "learnNew": "Learn Something New!",
    "help": "Help",
    "skipCost": "Skip (-1 ☀️)",
    "skipFree": "Skip",
    "checkAnswer": "Check",
    "giveUp": "Show answer",
    "brokenQuestion": "This question seems broken.",
    "brokenSkip": "Let's skip to the next one.",
    "translateThis": "Translate this:",
    "arrangeWords": "Arrange the words:",
    "trueOrFalse": "True or false?",
    "fillBlank": "Fill in the blank:",
    "matchPairs": "Match the pairs:",
    "pickAnswer": "Pick the right answer:"
  },
  "reward": {
    "earned": "+{n} ☀️",
    "penalty": "-1 ☀️",
    "skipped": "Skipped"
  },
  "completion": {
    "lessonComplete": "Lesson Complete!",
    "sunDropsEarned": "{earned}/{max} Sun Drops",
    "backToPath": "Back to Path",
    "replay": "Replay 🔄",
    "stars1": "Good effort!",
    "stars2": "Well done!",
    "stars3": "Perfect!"
  },
  "garden": {
    "myGarden": "My Garden",
    "shop": "Shop",
    "settings": "Settings",
    "plantTree": "Plant a tree",
    "waterTree": "Water tree",
    "comingSoon": "Coming soon!"
  },
  "path": {
    "skillPath": "Skill Path",
    "lesson": "Lesson {n}",
    "locked": "Locked",
    "completed": "Completed",
    "current": "Current"
  },
  "help": {
    "whatHelp": "Hey, what do you need help with?",
    "speakNow": "Speak now...",
    "brokenReport": "Report broken question"
  },
  "onboarding": {
    "welcome": "Welcome to LingoFriends!",
    "chooseLanguage": "What language do you want to learn?",
    "nativeLanguage": "What language do you speak at home?"
  }
}
```

### Step 4 — Create French Translation File

**File:** `src/locales/fr.json` (NEW)

```json
{
  "common": {
    "next": "Suivant",
    "back": "Retour",
    "skip": "Passer",
    "cancel": "Annuler",
    "close": "Fermer",
    "retry": "Réessayer",
    "continue": "Continuer",
    "loading": "Chargement..."
  },
  "lesson": {
    "tapToHear": "Appuie pour réécouter",
    "learnNew": "Apprends quelque chose de nouveau !",
    "help": "Aide",
    "skipCost": "Passer (-1 ☀️)",
    "skipFree": "Passer",
    "checkAnswer": "Vérifier",
    "giveUp": "Voir la réponse",
    "brokenQuestion": "Cette question semble cassée.",
    "brokenSkip": "Passons à la suivante.",
    "translateThis": "Traduis ceci :",
    "arrangeWords": "Arrange les mots :",
    "trueOrFalse": "Vrai ou faux ?",
    "fillBlank": "Complète le blanc :",
    "matchPairs": "Associe les paires :",
    "pickAnswer": "Choisis la bonne réponse :"
  },
  "reward": {
    "earned": "+{n} ☀️",
    "penalty": "-1 ☀️",
    "skipped": "Passé"
  },
  "completion": {
    "lessonComplete": "Leçon terminée !",
    "sunDropsEarned": "{earned}/{max} gouttes de soleil",
    "backToPath": "Retour au chemin",
    "replay": "Rejouer 🔄",
    "stars1": "Bel effort !",
    "stars2": "Bien joué !",
    "stars3": "Parfait !"
  },
  "garden": {
    "myGarden": "Mon Jardin",
    "shop": "Boutique",
    "settings": "Paramètres",
    "plantTree": "Planter un arbre",
    "waterTree": "Arroser l'arbre",
    "comingSoon": "Bientôt disponible !"
  },
  "path": {
    "skillPath": "Chemin d'apprentissage",
    "lesson": "Leçon {n}",
    "locked": "Verrouillé",
    "completed": "Terminé",
    "current": "En cours"
  },
  "help": {
    "whatHelp": "Hé, de quoi as-tu besoin ?",
    "speakNow": "Parle maintenant...",
    "brokenReport": "Signaler une question cassée"
  },
  "onboarding": {
    "welcome": "Bienvenue sur LingoFriends !",
    "chooseLanguage": "Quelle langue veux-tu apprendre ?",
    "nativeLanguage": "Quelle langue parles-tu à la maison ?"
  }
}
```

### Step 5 — Replace Hardcoded Strings in Components

Audit and replace ALL hardcoded English strings across components:

```typescript
// BEFORE
<button>Skip</button>
<p>Tap to hear again</p>
<h2>Learn Something New!</h2>

// AFTER
const { t } = useTranslation();
<button>{t('common.skip')}</button>
<p>{t('lesson.tapToHear')}</p>
<h2>{t('lesson.learnNew')}</h2>
```

### Step 6 — Enforce Native Language in AI Prompts

**File:** All prompt templates in `src/services/prompts/` and `src/services/systemPrompts.ts`

Add explicit language enforcement to every AI system prompt:

```typescript
const languageEnforcement = `
CRITICAL LANGUAGE RULES:
- ALL instructions, feedback, hints, and UI text MUST be in ${nativeLanguage} (${nativeLanguageName}).
- NEVER use English for instructions unless the user's native language IS English.
- Target language (${targetLanguage}) should ONLY appear in the learning content itself (chunks, vocabulary, example sentences).
- When giving feedback like "Correct!" or "Try again", use ${nativeLanguageName}: e.g., "${nativeLanguage === 'fr' ? 'Correct !' : 'Correct!'}" or "${nativeLanguage === 'fr' ? 'Réessaie !' : 'Try again!'}"
- Transition messages between activities must be in ${nativeLanguageName}.
- If you are unsure, default to ${nativeLanguageName}. NEVER default to English.
`;
```

Insert this block into:
- Lesson generation prompts
- Chunk generation prompts
- Help/coaching prompts
- Error correction prompts
- Interest detection prompts

### Step 7 — Set Locale from User Profile

**File:** `src/App.tsx` or wherever the user profile is loaded

```typescript
// On profile load / auth success:
const userNativeLanguage = profile.nativeLanguage || 'fr';
i18n.setLocale(userNativeLanguage);
```

### Step 8 — Future Language Addition Process

Document how to add a new native language:

1. Copy `src/locales/en.json` to `src/locales/{locale}.json`
2. Translate all values (can use OSS tools like LibreTranslate API, or community contribution)
3. Register the locale in `i18n.ts`
4. The AI prompt enforcement automatically uses the user's native language

Consider using an OSS tool like **Weblate** or **Pontoon** for community translation management if LingoFriends grows.

---

## Testing Checklist

- [ ] All visible English strings replaced with `t()` calls
- [ ] French translations display correctly throughout the app
- [ ] Missing translation keys fall back to English gracefully
- [ ] Interpolation works (e.g., `{n}` replaced with numbers)
- [ ] Locale switches correctly based on user profile
- [ ] AI-generated lesson instructions are in native language
- [ ] AI-generated feedback/hints are in native language
- [ ] AI-generated transition messages are in native language
- [ ] No English text visible for a French-native user (except target language content)
- [ ] Special characters (accents, cedillas) display correctly
- [ ] Text doesn't overflow buttons when translated (French is often longer than English)

---

## Files to Create

| File | Description |
|------|-------------|
| `src/services/i18n.ts` | i18n service |
| `src/hooks/useTranslation.ts` | React hook |
| `src/locales/en.json` | English base translations |
| `src/locales/fr.json` | French translations |

## Files to Modify

| File | Changes |
|------|---------|
| Every component with hardcoded English | Replace with `t()` calls |
| `src/services/systemPrompts.ts` | Add language enforcement |
| `src/services/prompts/chunkPrompts.ts` | Add language enforcement |
| `src/services/aiPedagogyClient.ts` | Add language enforcement |
| `src/App.tsx` | Set locale from user profile |

---

## Notes

- **Button sizing:** French text is typically 15-30% longer than English. Test that buttons and labels don't overflow. Use `min-width` or `flex` layouts instead of fixed widths.
- **Pluralisation:** The simple interpolation system handles most cases. If complex pluralisation is needed later (e.g., "1 goutte" vs "3 gouttes"), add a `tp()` function with plural rules.
- **Don't translate target language content:** The chunks, vocabulary, and example sentences in the target language (German, Spanish, etc.) should NOT be translated — they're the learning material.
- **RTL support:** Not needed now (no Arabic/Hebrew target audience), but the architecture doesn't prevent it later.
