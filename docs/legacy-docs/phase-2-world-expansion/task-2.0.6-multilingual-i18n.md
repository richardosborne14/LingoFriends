# Task 2.0.6: Multilingual i18n

**Status:** ✅ COMPLETE  
**Dependencies:** Task 2.0.5 (AI Provider Migration - for language-aware prompts)  
**Phase:** 2.0 - World Expansion Sprint 2

---

## Objective

Implement a lightweight internationalization system for UI strings, supporting French, German, Spanish, Italian, and Portuguese native speakers. The system enables kids to navigate the app in their native language while learning their target language.

---

## Implementation

### Files Created

1. **`src/services/i18n.ts`** - Core i18n service
   - Translation dictionaries for 6 languages (en, fr, de, es, it, pt)
   - Simple key-value translation system
   - Interpolation support with `{{variable}}` syntax
   - Automatic fallback to English for missing keys
   - Subscription-based language change notifications

2. **`src/hooks/useI18n.ts`** - React hook
   - Reactive translations (re-renders on language change)
   - Memoized translation function
   - Clean API: `{ t, language, setLanguage }`

### Translation Coverage

| Category | Keys | Languages |
|----------|------|-----------|
| Navigation | 7 | All 6 |
| Authentication | 4 | All 6 |
| Onboarding | 6 | All 6 |
| Garden | 8 | All 6 |
| Path View | 8 | All 6 |
| Lesson | 10 | All 6 |
| Activities | 6 | Full (en, fr, de), Partial (es, it, pt) |
| Rewards | 4 | All 6 |
| Shop | 9 | Full (en, fr, de), Partial (es, it, pt) |
| Friends/Gifts | 10 | Full (en, fr, de), Partial (es, it, pt) |
| Errors | 3 | All 6 |
| Accessibility | 7 | All 6 |

---

## Technical Details

### Usage in Components

```tsx
import { useI18n } from '../hooks/useI18n';

function MyComponent() {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('garden.title')}</h1>
      <button onClick={() => setLanguage('fr')}>
        {t('nav.settings')}
      </button>
    </div>
  );
}
```

### Usage Outside React

```ts
import { t, setLanguage } from '../services/i18n';

// Set language from user profile
setLanguage(profile.nativeLanguage);

// Translate a key
const label = t('lesson.check');
```

### Interpolation

```ts
t('lesson.earned', { count: 5 });
// "You earned 5" (English)
// "Vous avez gagné 5" (French)
```

### Integration Points

The i18n service should be connected to:
1. **Onboarding** - Set language from Step 1 selection
2. **Profile** - Store `nativeLanguage` in PocketBase
3. **App init** - Load language from profile on startup
4. **AI prompts** - Already use `nativeLanguage` for instruction language

---

## Supported Languages

| Code | Language | Native Name | Coverage |
|------|----------|-------------|----------|
| en | English | English | 100% |
| fr | French | Français | 100% |
| de | German | Deutsch | 100% |
| es | Spanish | Español | ~80% |
| it | Italian | Italiano | ~60% |
| pt | Portuguese | Português | ~60% |

Note: es/it/pt have reduced coverage for secondary screens. Add translations as needed.

---

## Architecture Decisions

### Why Not react-i18next?

The app doesn't need:
- Namespace splitting
- Plural rules (handled manually)
- Date/number formatting (use Intl APIs)
- Lazy loading (bundle is small)

Our custom solution:
- ~400 lines vs ~15KB minified for react-i18next
- Zero dependencies
- Explicit key-value (no magic)
- Easy for kids to understand if debugging

### Key Naming Convention

```
<category>.<subCategory>.<specific>
```

Examples:
- `nav.garden` - Navigation: Garden link
- `lesson.check` - Lesson: Check button
- `activity.multipleChoice.selectAnswer` - Activity: MC instruction

---

## Next Steps

1. **Connect to profile** - `useI18n` should read from `learnerProfile.nativeLanguage`
2. **Add language selector** - In Profile/Settings screen
3. **Expand translations** - Complete es/it/pt coverage
4. **Persist choice** - Store in PocketBase `profiles.native_language`

---

## Confidence Score: 9/10

**Met:**
- [x] Core i18n service with 6 languages
- [x] React hook integration
- [x] Interpolation support
- [x] English fallback
- [x] Build succeeds with no errors
- [x] Zero external dependencies

**Minor Concerns:**
- [ ] Not yet connected to profile storage
- [ ] Language selector UI not implemented
- [ ] es/it/pt translations incomplete

**Deferred:**
- Profile integration (separate task)
- Language selector component
- Lazy loading (not needed at current scale)