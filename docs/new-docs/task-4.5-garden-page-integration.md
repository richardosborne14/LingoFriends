# Task 4.5: Garden Page Integration

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Tasks 4.1, 4.2, 4.3 all complete

---

## Objective

Wire the garden scene, avatar, tree panel, and stats header into the garden page route. This is where everything comes together.

---

## Implementation

`src/routes/(app)/garden/+page.svelte`:

**Server load:** Fetch profile + userTrees from DB.
**Client:** Mount GardenScene on `onMount`, set trees and avatar from server data. Wire pointer events for tree tapping. Stats header: ☀️ SunDrops | 🔥 Streak | 💎 Gems. Tree tap → TreePanel bottom sheet. Lesson tap → navigate.

**`+page.server.ts`:**
```typescript
export const load = async ({ locals }) => {
  const profile = await getProfile(locals.user!.id);
  const trees = await getUserTrees(locals.user!.id);
  return { profile, trees };
};
```

---

## 🖥️ Browser Verification (CRITICAL — Full Garden Flow)

1. Log in as dummy user → land on `/garden`
2. **See:** 3D garden with tree(s), avatar with customisation
3. Move avatar by tapping empty ground
4. Tap a tree → panel opens with stats + lesson trail
5. Tap current lesson → navigate to lesson
6. Complete lesson → return to garden
7. **Verify:** tree has grown, SunDrops updated in header

---

## Tests

```typescript
describe('Garden Page', () => {
  it('loads trees from server', () => {});
  it('renders garden canvas', () => {});
  it('tree tap opens panel', () => {});
  it('stats header shows correct values', () => {});
});
```

---

## Acceptance Criteria

- [ ] Garden renders with user's trees from DB
- [ ] Avatar customised from profile
- [ ] Tree tap → panel → lesson flow works
- [ ] Stats header accurate
- [ ] Tests: 4/4 passing
- [ ] Browser verification passed (full garden→lesson→garden flow)

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
