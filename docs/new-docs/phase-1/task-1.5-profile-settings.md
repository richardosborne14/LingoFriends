# Task 1.5: Profile API & Settings Page

**Status:** 🔲 Not started
**Phase:** 1 (Auth & Profiles)
**Confidence Target:** 8/10
**Estimated Time:** 1.5h
**Dependencies:** Task 1.4 complete

---

## Objective

Create profile API endpoints and a settings page where users can edit their display name, avatar, and interests. Also display read-only stats (SunDrops, streak, lessons completed).

---

## Subtasks

### 1.5.1 — Profile API routes

```
GET  /api/profile → returns full profile + learner profile for current user
PATCH /api/profile → updates editable fields (displayName, avatar*, interests)
```

Both routes require authentication (check `locals.user`).

### 1.5.2 — Settings page (`src/routes/(app)/profile/+page.svelte`)

- Display current display name (editable Input)
- Avatar colour pickers (reuse onboarding components)
- Interests grid (reuse Chip grid from onboarding)
- "Save Changes" button → PATCH /api/profile
- Read-only stats section: ☀️ Total SunDrops, 🔥 Current Streak, 📚 Lessons Completed
- "Log Out" ghost Button at bottom → POST /api/logout

---

## Tests

```typescript
describe('Profile API', () => {
  it('GET /api/profile returns profile for authenticated user', async () => {});
  it('GET /api/profile returns 401 for unauthenticated', async () => {});
  it('PATCH /api/profile updates display name', async () => {});
  it('PATCH /api/profile updates interests array', async () => {});
  it('PATCH /api/profile rejects invalid fields', async () => {});
});
```

---

## 🖥️ Browser Verification

1. Log in as dummy user → navigate to `/profile`
2. **Verify:** current display name, avatar, interests displayed
3. Change display name → Save → reload → verify change persists
4. **Verify:** stats section shows numbers (all 0 for new user is correct)
5. Click "Log Out" → redirected to `/login`

**Pass/Fail:** ___

---

## Acceptance Criteria

- [ ] Profile page displays current data correctly
- [ ] Edit + save works for display name, avatar, interests
- [ ] Stats display correctly (zeros for new users)
- [ ] Logout button works
- [ ] API rejects unauthenticated requests
- [ ] Tests: 5/5 passing
- [ ] Browser verification passed

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
**Tests:** ___/___ passing
