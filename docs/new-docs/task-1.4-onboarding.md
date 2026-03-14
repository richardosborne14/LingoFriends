# Task 1.4: Onboarding Flow (7 Steps)

**Status:** 🔲 Not started
**Phase:** 1 (Auth & Profiles)
**Confidence Target:** 8/10
**Estimated Time:** 4h
**Dependencies:** Task 1.1 complete
**Actual Time:** _fill after completion_

---

## Mandatory Reads

1. `.clinerules`
2. `01-DESIGN-SYSTEM.md` — Chip component for interests, colour pickers for avatar
3. `02-DATABASE-SCHEMA.md` — profiles table (all fields saved during onboarding)
4. `04-PEDAGOGY-SUMMARY.md` — age group affects lesson difficulty and interaction style

---

## Objective

Build the 7-step onboarding wizard. Each step saves to DB immediately (survive browser close). Completing all 7 sets `onboardingComplete = true` and redirects to `/garden`.

---

## The 7 Steps

**Route:** `src/routes/(auth)/onboarding/+page.svelte`

| Step | What | Saves To |
|------|------|----------|
| 1. Welcome | "Hi [name]! Let's set up." → Continue | Nothing (display only) |
| 2. Age Group | 3 large cards: 7-10, 11-14, 15-18 | `profiles.ageGroup` |
| 3. Native Language | Flag Chips: 🇫🇷 French, 🇬🇧 English | `profiles.nativeLanguage` |
| 4. Target Language | Flag Chips (filtered: can't = native) | `profiles.targetLanguage` |
| 5. Interests | Grid of 12 Chips, min 2 selected | `profiles.interests` (jsonb) |
| 6. Avatar | Skin tone, hair, shirt colour pickers + hat + gender | `profiles.avatar*` fields |
| 7. Ready! | "Your garden is waiting! 🌱" → Enter | `profiles.onboardingComplete = true` |

**Progress indicator:** Dots or small progress bar showing step 1-7.

**Each step POSTs to an API endpoint** that updates the profile immediately. If the user closes the browser, reopening goes to the last incomplete step.

---

## 🤔 Decision Points for User

> **1. Interest list — how many options?**
> - 10 interests: football, gaming, animals, music, cooking, science, art, reading, travel, movies
> - 12 interests: add space, nature
> - 15+ interests: add technology, fashion, sports, photography, dancing
> **Recommendation:** 12 interests in a 3×4 grid. Good personalisation data without overwhelming 7-year-olds.

> **2. Avatar complexity for onboarding:**
> - **(A) Simple colour pickers** (5 skin tones, 5 hair colours, 5 shirt colours) — fast to build
> - **(B) Full character preview** with Three.js — looks amazing but 2x longer to build
> **Recommendation:** Option A for onboarding. Full 3D preview comes in Phase 4 when Three.js garden is built.

> **3. Step persistence strategy:**
> - **(A) Save each field individually** on change (lots of API calls)
> - **(B) Save entire step on "Continue"** click (fewer calls, loses data if user closes mid-step)
> **Recommendation:** Option B — save on Continue click. Simpler and steps take <10 seconds each.

---

## Tests

```typescript
describe('Onboarding', () => {
  it('saves age group to profile on step 2', async () => {});
  it('saves language preferences on steps 3-4', async () => {});
  it('prevents selecting same native and target language', async () => {});
  it('requires minimum 2 interests', async () => {});
  it('saves avatar customisation on step 6', async () => {});
  it('sets onboardingComplete=true on step 7', async () => {});
  it('resumes from last incomplete step on page reload', async () => {});
  it('redirects to /garden after completion', async () => {});
});
```

---

## 🖥️ Browser Verification (FULL FLOW — Critical)

Log in as dummy user → walk through ALL 7 steps → verify redirect to `/garden`.

1. `/onboarding` → Step 1: Welcome message with name "Test Kid"
2. Select "I'm 11-14" → Continue
3. Select 🇫🇷 French → Continue
4. Select 🇩🇪 German (French should be greyed out) → Continue
5. Select 3 interests (football, gaming, animals) → Continue
6. Pick avatar colours → Continue
7. "Your garden is waiting!" → Click "Enter My Garden"
8. **Verify:** Redirected to `/garden`
9. **Verify in DB:** profile has ageGroup=11-14, nativeLanguage=fr, targetLanguage=de, interests=[...], onboardingComplete=true

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] All 7 steps render correctly with design system components
- [ ] Progress indicator shows current step
- [ ] Each step saves to DB on Continue
- [ ] Cannot pick same native/target language
- [ ] Minimum 2 interests enforced (Continue disabled until met)
- [ ] Resumption from last incomplete step on reload
- [ ] Final step sets `onboardingComplete = true`
- [ ] Redirect to `/garden` on completion
- [ ] Tests: 8/8 passing
- [ ] Browser verification passed (full 7-step flow)
- [ ] Touch targets ≥ 44×44px on all interactive elements
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Decisions Made:**
| Decision | Choice | Why |
|----------|--------|-----|
**Tests:** ___/___ passing
**Notes for Future Tasks:** ___
