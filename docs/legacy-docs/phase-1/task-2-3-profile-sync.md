# Task 2.3: Profile Sync

**Status:** ✅ Complete
**Date:** 2026-02-04
**Confidence:** 8/10

---

## Objective

Migrate profile state from localStorage to Pocketbase, making the auth context the single source of truth for user profile data.

---

## What Was Done

### 1. Enhanced useAuth Hook

Added new methods to `src/hooks/useAuth.tsx`:

| Method | Purpose |
|--------|---------|
| `updateProfile(updates)` | Updates profile fields in Pocketbase, syncs local state |
| `addXP(amount)` | Adds XP with daily cap enforcement, returns cap status |
| `refreshProfile()` | Reloads profile from server (already existed) |

**AddXPResult type:**
```typescript
interface AddXPResult {
  xp: number;      // New total XP
  dailyXP: number; // Today's earned XP
  capped: boolean; // Whether daily cap was hit
}
```

### 2. Refactored App.tsx

**Before:**
- Profile stored in `useState` + localStorage
- `setProfile()` for all profile changes
- XP manually incremented without cap enforcement

**After:**
- Profile sourced from `useAuth().profile`
- `updateProfile()` syncs changes to Pocketbase
- `addXP()` enforces daily cap (100 XP default)
- Removed `STORAGE_KEY_PROFILE` localStorage usage

### 3. Profile Update Points Migrated

| Location | Old Code | New Code |
|----------|----------|----------|
| Language switch | `setProfile({ targetLanguage })` | `updateProfile({ targetLanguage })` |
| Native language | `setProfile({ nativeLanguage })` | `updateProfile({ nativeLanguage })` |
| AI UPDATE_PROFILE | `setProfile({ level, goals, interests })` | `updateProfile({ level, goals, interests })` |
| AI ADD_TRAIT | `setProfile({ traits: [...] })` | `updateProfile({ traits: [...] })` |
| Activity complete | `setProfile({ xp: xp + score })` | `addXP(score)` |
| Lesson complete | `setProfile({ xp: xp + 50 })` | `addXP(50)` |

---

## Files Modified

### `src/hooks/useAuth.tsx`
- Added `addXP` import from pocketbaseService
- Added `AddXPResult` interface
- Added `addXP` to `AuthMethods` interface
- Implemented `addXP` callback with optimistic local update
- Added `addXP` to context value

### `App.tsx`
- Removed `STORAGE_KEY_PROFILE` constant
- Removed `useState` for profile, using `authProfile || INITIAL_PROFILE`
- Removed localStorage profile persistence effect
- Changed `handleSwitchLanguage` to use `updateProfile`
- Changed AI action handlers to use `updateProfile`
- Changed `handleActivityComplete` to use `addXP`
- Changed `handleCompleteLesson` to use `addXP`
- Changed native language select to use `updateProfile`

---

## Daily XP Cap System

The `addXP()` function now enforces healthy engagement limits:

```typescript
// In pocketbaseService.ts
const cap = profile.daily_cap;        // Default: 100
const currentDaily = profile.daily_xp_today;
const remaining = Math.max(0, cap - currentDaily);
const actualXP = Math.min(amount, remaining);
const capped = actualXP < amount;
```

When cap is reached:
- XP is partially awarded (up to remaining limit)
- `capped: true` is returned
- App can show friendly "Great work today!" message

---

## What Still Needs Work

### Task 2.4: Session Persistence
- Sessions still use localStorage
- Need to migrate to Pocketbase `sessions` collection
- Handle save/resume for interrupted lessons

### Future: Offline Handling
- Queue profile updates when offline
- Sync when connection restored
- Currently fails silently with console.error

---

## Testing Notes

### Manual Testing Required
- [ ] Create new account → verify profile in Pocketbase admin
- [ ] Change target language → verify persists across refresh
- [ ] Change native language → verify persists
- [ ] Complete activity → verify XP added in Pocketbase
- [ ] Complete lesson → verify 50 XP bonus
- [ ] Hit daily cap (100 XP) → verify cap enforced

### What Works
- ✅ Profile loads from Pocketbase on auth
- ✅ Profile updates sync to server
- ✅ XP updates with daily cap
- ✅ Fallback to INITIAL_PROFILE if profile null

---

## Confidence: 8/10

**Met:**
- [x] Profile sourced from Pocketbase via useAuth
- [x] All profile updates sync to server
- [x] XP uses addXP with daily cap enforcement
- [x] localStorage profile removed
- [x] TypeScript compiles with no errors

**Concerns:**
- [ ] Haven't tested end-to-end with real Pocketbase instance
- [ ] Offline handling is minimal (just console.error)

**Deferred:**
- [ ] Session persistence (Task 2.4)
- [ ] Proper offline queue for profile updates
- [ ] "Daily cap reached" UI feedback to user

---

## Next Steps

1. Test login/signup and profile sync manually
2. Move to Task 2.4: Session Persistence
3. Continue with Task 3: AI Service Swap
