# TASK-AUDIT-06: Age Collection in Onboarding

**Status:** 🔲 Not started
**Priority:** 🟠 High — unblocks age-adaptive behaviour across the entire app
**Estimated Time:** 2–3 hours
**Dependencies:** None (can be done any time)
**Audit Finding:** #5 — "Age Group Is Not Actually Collected"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — "Age-Specific Adaptations" section (7-10 vs 11-14 vs 15-18 differences in coaching, reflection, self-direction, motivation)
3. `TASK-V2-01-onboarding-and-i18n.md` — Step 2 is age group selection (specced but may not be wired to save)
4. `04-PEDAGOGY-SUMMARY.md` — age group affects lesson difficulty and interaction style
5. `01-DESIGN-SYSTEM.md` — card-based selection UI

---

## Problem

The ROADMAP.md itself lists "Age collection in onboarding (currently defaults to 11-14)" as Phase 4 candidate #1. The onboarding flow was designed with age group as Step 2 (TASK-V2-01), but the profile currently defaults `ageGroup` to `'11-14'` when not set.

This means every child — whether 7 or 17 — gets:
- Same coaching tone
- Same number of chunks per lesson (3)
- Same discovery question format (buttons + text)
- Same lesson length
- Same reflection depth
- Same vocabulary complexity

The pedagogy doc has detailed age-band adaptations that are completely inactive without this fix.

---

## Goals

1. Verify the onboarding flow actually collects and saves `ageGroup`
2. If not saved: wire the age selection step to save to the profile
3. Remove the `'11-14'` default fallback everywhere — make it required
4. Add a migration or data fix for existing users without `ageGroup`
5. Verify all age-branching code paths actually read `profile.ageGroup`

---

## Step-by-Step Implementation

### Step 1 — Audit Current Age Group Flow

Check these locations:

```
1. src/routes/(auth)/onboarding/+page.svelte — does Step 2 (age group) exist?
2. The onboarding API handler — does it save ageGroup to the profile?
3. src/lib/types/ — is ageGroup typed as required or optional?
4. src/routes/(app)/lesson/[id]/+page.server.ts — how is ageGroup loaded?
5. Any place that reads profile.ageGroup — does it handle undefined?
```

**If the onboarding step exists but doesn't save:** Wire it up.
**If the step doesn't exist:** Build it (simple — 3 large cards).

### Step 2 — Age Group Selection UI

If not already built, create the age group step:

```
┌────────────────────────────────────────┐
│                                        │
│     How old are you?                   │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │          │ │          │ │        │ │
│  │   7-10   │ │  11-14   │ │ 15-18  │ │
│  │          │ │          │ │        │ │
│  │  🌱      │ │  🌿      │ │  🌳    │ │
│  │ Sprout   │ │ Grower   │ │  Pro   │ │
│  │          │ │          │ │        │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
│     [Continue →]                       │
│                                        │
└────────────────────────────────────────┘
```

- Three large tappable cards with fun names (not just numbers)
- Selected card gets a green border + checkmark
- Continue enabled only after selection
- Saves to `profiles.ageGroup` on Continue

### Step 3 — Make ageGroup Required

**Modify the profile type:**

```typescript
// BEFORE:
ageGroup?: string; // defaults to '11-14'

// AFTER:
ageGroup: '7-10' | '11-14' | '15-18'; // REQUIRED — no default
```

**Search for and eliminate all fallback defaults:**

```bash
grep -rn "ageGroup.*11-14\|ageGroup.*default\|ageGroup ??" src/
```

Replace every instance of `profile.ageGroup ?? '11-14'` or `profile.ageGroup || '11-14'` with just `profile.ageGroup`. The onboarding flow now guarantees it exists.

### Step 4 — Existing User Migration

For users who completed onboarding before age collection was required:

**Option A:** Force re-onboarding for the age step only (show a one-time modal on next login).
**Option B:** Default existing users to `'11-14'` in a one-time migration, let them change in settings.

**Recommendation:** Option B (less disruptive), with a banner on the garden page: "Tell us your age for a better experience! [Set age]"

### Step 5 — Verify Age-Branching Code Paths

After making `ageGroup` required, verify these consumers:

| Consumer | What Should Differ |
|----------|-------------------|
| `chunkGenerator.ts` | 7-10: 2 chunks per lesson, 11+: 3 chunks |
| `coachingPrompts.ts` | Tone calibration per age band |
| `CoachingChatActivity.svelte` | 7-10: MC buttons only, 11+: text/voice |
| `LessonReflection.svelte` | 7-10: emoji only, 11+: trickiest part, 15+: free text |
| `PreLessonChat.svelte` | 7-10: mic primary, 11+: equal mic/text |
| `lessonAssembler.ts` | 7-10: shorter lessons, fewer quiz types |
| `levelAssessment.ts` | Thresholds may need age adjustment |

---

## 🤔 Decision Points for User

> **1. Existing users without ageGroup — how to handle?**
> - **(A) Force re-onboarding for age step** — clean data but disruptive
> - **(B) Default to 11-14, show banner to update** — non-disruptive
> **Recommendation:** Option B.

> **2. Should we collect exact age or age band?**
> - **(A) Age band (7-10, 11-14, 15-18)** — privacy-friendly, matches pedagogy doc
> - **(B) Exact birth year** — more granular, but children sharing age = privacy concern
> **Recommendation:** Option A. Age bands are sufficient for the pedagogy adaptations and avoid collecting precise age data from minors.

---

## Tests

```typescript
describe('Age Group Onboarding Step', () => {
  it('renders 3 age group cards', () => {});
  it('selecting a card enables Continue', () => {});
  it('saves ageGroup to profile on Continue', async () => {});
  it('redirects to next onboarding step', () => {});
});

describe('ageGroup is required', () => {
  it('profile type does not allow undefined ageGroup', () => {});
  it('chunkGenerator reads ageGroup without fallback', () => {});
  it('lessonAssembler adapts chunk count by age', () => {});
});
```

---

## 🖥️ Browser Verification

1. New signup → onboarding includes age group step
2. Select "7-10" → Continue → verify saved in DB
3. Start a lesson → verify 2 chunks (not 3) for 7-10 age group
4. Coaching discovery → verify MC buttons only (no text input) for 7-10
5. Existing user (no age set) → banner appears → set age → verify saved

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/lib/components/onboarding/StepAgeGroup.svelte` (if not already exists)

**Modified files:**
- `src/lib/types/profile.ts` (or equivalent) — make ageGroup required
- Every file with `ageGroup ?? '11-14'` or `ageGroup || '11-14'` — remove fallback
- `src/routes/(auth)/onboarding/+page.svelte` — ensure age step saves
- `src/lib/i18n/en.json` + `fr.json` — age group card labels

---

## Acceptance Criteria

- [ ] Onboarding collects and saves ageGroup
- [ ] ageGroup is typed as required (no optional, no default)
- [ ] All fallback defaults removed from codebase
- [ ] chunkGenerator uses ageGroup (2 chunks for 7-10)
- [ ] Coaching tone varies by ageGroup
- [ ] Existing users see update banner
- [ ] All text translated (en/fr)
- [ ] Tests: 6+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
