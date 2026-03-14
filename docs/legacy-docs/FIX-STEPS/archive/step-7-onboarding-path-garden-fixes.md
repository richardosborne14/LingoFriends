# Step 7 — Onboarding, Path Generation & Garden Fixes

**Date:** 2026-02-20  
**Status:** ✅ Complete (TypeScript exits 0)  
**Commit tag:** `[Auth] Fix: onboarding refresh loop + [AI] Fix: path gen 403 + [UI] Add: ambient garden decorations`

---

## Follow-up Fix (2026-02-20)

### Additional Bug — PathView crash with 5 lessons

**Symptom:** After signup, user is taken to the first intro lesson path, but it crashes with:
```
PathView.tsx:233 Uncaught TypeError: Cannot read properties of undefined (reading 'x')
```

**Root cause:** `PATH_POSITIONS` array had only 4 positions but Groq generates 5 lessons. The SVG path rendering code tried to access `PATH_POSITIONS[4]` which was `undefined`, causing the crash.

**Fix (`src/components/path/PathView.tsx`):**
- Extended `PATH_POSITIONS` array to 6 positions (supports up to 6 lessons)
- Added `getLessonPosition(index)` helper with bounds safety
- Updated SVG path rendering and lesson node mapping to use the safe helper

**PocketBase schema fix (`scripts/fix-signup-schema.cjs`):**
- Set `skill_paths` Update rule to `@request.auth.id != ""` — authenticated users can now update path records
- This allows Groq-generated lesson titles to persist to PocketBase instead of only living in-memory


---

## Bugs Fixed

### Bug 1 — Onboarding wizard restarts on page refresh

**Symptom:** After completing onboarding the profile data was visible in the profile
modal, but a hard refresh sent the user back to Step 0 of the wizard.

**Root cause:** `App.tsx` called `updateProfile(...)` (async, hits PocketBase) and
only set the `localStorage` flag _after_ the `await` resolved.  If the React
re-render triggered by `setProfile(updatedProfile)` ran before the async call
finished — or if the call itself cleared `pb.authStore` momentarily — the flag was
never written and `localOnboardingDone` stayed `false`.

**Fix (`App.tsx`):** Move `localStorage.setItem('lf_onboarding_…', 'true')` to
_before_ the `await updateProfile(…)` call.  The flag is now set synchronously the
moment `handleOnboardingComplete` fires, so any subsequent re-render or navigation
sees it immediately.

---

### Bug 2 — Tutorial tooltip cards clip outside the viewport

**Symptom:** Some tutorial step cards were rendered partially (or fully) off-screen,
especially on smaller viewports or when the spotlight was near the top/bottom edge.

**Root cause:** `TutorialOverlay.tsx` used a hard-coded `120px` threshold to decide
whether to place the card above or below the spotlight.  `120px` is far smaller than
the actual card height (~260 px), so the "above" branch was chosen even when there
wasn't enough vertical space.

**Fix (`src/components/tutorial/TutorialOverlay.tsx`):**
- Added `APPROX_CARD_HEIGHT = 260`, `CARD_GAP = 12`, `EDGE_PADDING = 16`.
- `MIN_SPACE_ABOVE = APPROX_CARD_HEIGHT + CARD_GAP + EDGE_PADDING` (288 px).
- Both the "above" and "below" branches now verify `availableHeight >= APPROX_CARD_HEIGHT`
  before committing.  If neither branch fits, the card falls back to screen-centre.

---

### Bug 3 — First tree shows "no data found" / 0 lessons

**Symptom:** Clicking the first tree immediately after onboarding opened the PathView
but showed a "no lessons" or "still setting up" error even though Groq had generated
titles successfully.

**Root cause:** `ensurePathGenerated` (in `pathGeneratorService.ts`) generated lesson
titles via Groq but then tried to persist them with
`pb.collection('skill_paths').update(…)`.  The `skill_paths` collection's **Update
rule** was empty (PocketBase defaults to superuser-only), so the call returned
`ClientResponseError 403: Only superusers can perform this action`.  The error was
caught by the outer try/catch and the function returned `void` — silently discarding
the generated titles.  Back in `useSkillPath`, the PB re-fetch still showed 0 lessons
and the UI showed the error message.

**Fix — two files:**

#### `src/services/pathGeneratorService.ts`
- Changed return type from `Promise<void>` to `Promise<string[]>`.
- Wrapped the PB `.update()` call in its own **inner** try/catch.  A 403 now logs a
  warning but does **not** prevent the function from returning the generated titles.
- `return titles` is now unconditional — the caller always gets the Groq output
  regardless of whether PB accepted the write.

#### `src/hooks/useSkillPath.ts`
- Added `import { LessonStatus } from '../types/game'` (was missing, needed for
  synthetic lessons).
- Changed `await ensurePathGenerated(…)` to `const generatedTitles = await ensurePathGenerated(…)`.
- After the PB re-fetch, if `refreshedTemplate.lessons.length` is still 0 but
  `generatedTitles.length > 0`, a `SkillPathLesson[]` is synthesised in-memory:
  - lesson 0 → `status: LessonStatus.CURRENT`
  - lessons 1–N → `status: LessonStatus.LOCKED`
  - `sunDropsMax: 10`, `stars: 0`, `icon: '📖'`
- This in-memory list is patched onto `template.lessons` so the progress overlay
  below runs normally and the path renders immediately.

#### ⚠️ Permanent server-side fix (1 minute in PocketBase admin)
> Open **PocketBase admin → Collections → `skill_paths` → Update rule**  
> Set it to: `@request.auth.id != ""`  
> Save.  
>
> This lets authenticated users update their own path records, so lesson titles are
> persisted on first generation and the in-memory fallback is never needed again.

---

### Bug 4 — Garden looks empty (only one tree, no decorations)

**Symptom:** On first load the garden contained only the single learning tree placed
by `createInitialTree()`.  Everything else was bare tiles.

**Fix (`src/renderer/GardenRenderer.ts`):**
- Added a `makeSeededRng(seed: string): () => number` utility (FNV-1a hash → LCG).
  Same user ID → same decoration layout on every page refresh.
- Added `private setupAmbientDecoration(userId: string): void` which:
  - Builds a candidate list of interior tiles (gx 1–10, gz 1–10).
  - Skips the learning-tree centre zone (gx 4–7 × gz 4–7).
  - Skips the avatar spawn tile (6, 6).
  - Fisher–Yates shuffles the candidates using the seeded RNG.
  - Places **22 objects** from a weighted palette:
    `daisy×3, tulip×2, lavender×2, rose, poppy, mushroom, hedge`.
  - Adds each mesh directly to `scene` (not `objectLayer`) so shop actions
    never remove them.
  - Does **not** add to `occupiedCells` — avatar walks through small flowers
    naturally.
- Called at end of constructor when `options.seedUserId` is provided (already in
  `GardenRendererOptions`).
- `GardenWorld3D` passes `seedUserId: profile.userId` (no change needed — the field
  was already wired).

---

### Bug 5 (bonus) — Signup profile create 400

**Symptom:** Console logged
```
[PB] signup() profile create validation errors: { "onboarding_complete": { "code": "validation_required", ... } }
```
on every new signup.

**Root cause:** PocketBase treats boolean `false` as "blank" when a Bool field has
**Required** enabled.  The initial stub profile in `signup()` sent
`onboarding_complete: false`, which failed validation.

**Fix (`services/pocketbaseService.ts`):** Removed `onboarding_complete: false` from
the stub profile created during `signup()`.  The field is left unset (PB stores null).
`updateProfile()` called at onboarding completion always sets it to `true`, so the
final persisted profile is always correct.  The error was non-fatal before; now it
simply doesn't appear.

---

## Files Changed

| File | Change |
|------|--------|
| `App.tsx` | localStorage flag set before `await updateProfile` |
| `src/components/tutorial/TutorialOverlay.tsx` | Card-clipping constants + fallback to centred layout |
| `src/services/pathGeneratorService.ts` | Returns `string[]`; PB write error isolated to inner catch |
| `src/hooks/useSkillPath.ts` | Captures returned titles; synthesises in-memory lessons on 403 |
| `src/renderer/GardenRenderer.ts` | `makeSeededRng` + `setupAmbientDecoration` (22 flowers/plants) |
| `services/pocketbaseService.ts` | Removed `onboarding_complete: false` from signup stub |

## Known Remaining Issues

| Issue | Notes |
|-------|-------|
| `<ellipse cx="undefined">` SVG warning | Pre-existing; probably in `AvatarBuilder` or a loading-state component. Not blocking. |
| In-memory lessons lost on refresh | PB 403 persists until Update rule is set in admin panel (see above). |

---

## Follow-up Fixes (2026-02-20 14:00)

### Bug 6 — Shop placement doesn't work (click does nothing)

**Symptom:** User selects a shop item, clicks on a valid tile, but nothing is placed.

**Root cause:** Stale closure in the `onTileClick` callback. The callback was created inside `useEffect(() => {}, [])` with empty deps, capturing `placementModeItem` from the first render (always `null`). When the user selected a shop item, `placementModeItem` changed in state but the callback still had the stale `null` value.

**Fix (`src/components/garden/GardenWorld3D.tsx`):**
- Added `placementModeItemRef = useRef<ShopItem | null>(null)`
- Added `useEffect` to keep the ref in sync with `placementModeItem` prop
- Updated `onTileClick` callback to read from `placementModeItemRef.current` instead of the stale closure

### Bug 7 — Tutorial shows over Path instead of Garden

**Symptom:** After completing the first lesson, tutorial steps ("This is your garden!") appeared over the Path view instead of the Garden.

**Root cause:** After completing a lesson, `handleLessonComplete` called `actions.goBack()`. For the first lesson, the navigation stack was Garden → Path → Lesson, so `goBack()` returned to Path, not Garden. Tutorial steps like "garden_intro" were designed for the Garden view.

**Fix (`App.tsx`):**
- For `isFirstRun` sessions, navigate directly to Garden using `actions.goToGarden()` instead of `actions.goBack()`
- This ensures the tutorial modals appear over the correct view after the first lesson

### Bug 8 — Same questions in every lesson for new users

**Symptom:** New users saw the same generic questions ("Are you ready to learn?", "Is learning fun?") repeated across lessons.

**Root cause:** The V2 lesson generator's `generateFallbackLesson()` created activities from chunks. For brand new users with no chunks yet, it produced empty or generic placeholder content that repeated.

**Fix (`src/services/lessonGeneratorV2.ts`):**
- Enhanced `generateFallbackLesson()` to handle two cases:
  1. **Has chunks:** Create activities from those chunks (existing behavior)
  2. **No chunks (new user):** Generate topic-specific starter activities
- Added `createStarterActivities()` - Creates varied activities for new users
- Added `getTopicStarters()` - Returns topic-appropriate starter phrases (Greetings, Numbers, Food, etc.)
- Added `getDistractor()` - Generates plausible multiple choice distractors
- Starter activities include: multiple choice, true/false, fill-in-the-blank, translation

---

## Files Changed (Updated)

| File | Change |
|------|--------|
| `App.tsx` | localStorage flag set before `await updateProfile`; navigate to Garden (not goBack) on first-run lesson complete |
| `src/components/garden/GardenWorld3D.tsx` | Added ref-based placementModeItem tracking to fix stale closure |
| `src/services/lessonGeneratorV2.ts` | Added starter activity generation for new users with no chunks |
| `src/components/tutorial/TutorialOverlay.tsx` | Card-clipping constants + fallback to centred layout |
| `src/services/pathGeneratorService.ts` | Returns `string[]`; PB write error isolated to inner catch |
| `src/hooks/useSkillPath.ts` | Captures returned titles; synthesises in-memory lessons on 403 |
| `src/renderer/GardenRenderer.ts` | `makeSeededRng` + `setupAmbientDecoration` (22 flowers/plants) |
| `services/pocketbaseService.ts` | Removed `onboarding_complete: false` from signup stub |
