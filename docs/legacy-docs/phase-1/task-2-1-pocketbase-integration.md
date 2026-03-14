# Task 2.1: Pocketbase Integration

**Status:** ✅ Complete
**Date:** 2025-02-04
**Confidence:** 8/10

---

## Objective

Replace localStorage with Pocketbase for persistence and authentication, connecting to a remote Pocketbase instance.

---

## What Was Done

### 1. Environment Setup
- ✅ Installed `pocketbase` npm package
- ✅ Created `.env` with all API keys:
  - `VITE_POCKETBASE_URL` - Remote Pocketbase instance
  - `VITE_GROQ_API_KEY` - For Llama 3.3 (chat, STT)
  - `VITE_GOOGLE_AI_KEY` - For TTS (currently Gemini)
  - `VITE_VERTEX_AI_KEY` - For Claude Haiku on Vertex AI
- ✅ Created `.env.example` template
- ✅ Updated `.gitignore` to protect secrets

### 2. Pocketbase Collections Created

| Collection | Purpose | Fields |
|------------|---------|--------|
| `profiles` | User profile data | user, display_name, native_language, target_language, level, goals, interests, traits, xp, streak, etc. |
| `sessions` | Chat sessions (Main Hall + Lessons) | user, session_type, status, title, objectives, messages, draft, parent_session, target_language |
| `friendships` | Friend relationships | user_a, user_b, status, initiated_by |
| `friend_codes` | Temporary friend codes | user, code, expires_at |
| `daily_progress` | Daily learning stats | user, date, xp_earned, lessons_completed, activities_completed, time_spent_seconds |
| `vocabulary` | Spaced repetition (Phase 2) | user, term, translation, language, context, times_seen, times_correct, growth_stage |

### 3. Services Created

#### `services/pocketbaseService.ts`
- Auth methods: `signup()`, `login()`, `logout()`, `refreshAuth()`
- Profile methods: `getProfile()`, `updateProfile()`, `addXP()`
- Session methods: `getSessions()`, `createSession()`, `updateSession()`, `getOrCreateMainSession()`
- Real-time: `subscribeToProfile()`, `subscribeToSession()`
- Utility: `healthCheck()`, `isAuthenticated()`, `getCurrentUser()`

#### `src/hooks/useAuth.tsx`
- React context provider for auth state
- Handles session restoration on app load
- Exposes `isAuthenticated`, `isLoading`, `user`, `profile`, `error`
- Methods: `login()`, `signup()`, `logout()`, `updateProfile()`

### 4. UI Components

#### `components/AuthScreen.tsx`
- Kid-friendly login/signup screen
- Toggle between login and signup modes
- Form validation with friendly error messages
- Native language selection for new users

### 5. App Integration

- ✅ Updated `index.tsx` with `AuthProvider` wrapper
- ✅ Updated `App.tsx` with auth conditional rendering
- ✅ Added loading screen while auth state initializes
- ✅ Added logout button to sidebar
- ✅ Fixed Vite config for environment variables
- ✅ Added script tag to `index.html` for entry point

---

## Files Created/Modified

### Created
- `.env` - Environment variables (not committed)
- `.env.example` - Template
- `services/pocketbaseService.ts` - Core Pocketbase service
- `src/hooks/useAuth.tsx` - Auth React hook/context
- `src/vite-env.d.ts` - Vite environment type definitions
- `components/AuthScreen.tsx` - Login/signup UI
- `scripts/setup-pocketbase.cjs` - Collection setup script
- `docs/phase-1/task-2-1-pocketbase-integration.md` - This document

### Modified
- `.gitignore` - Added `.env` protection
- `package.json` - Added pocketbase dependency
- `index.tsx` - Added AuthProvider wrapper
- `App.tsx` - Added auth conditional rendering, logout button
- `index.html` - Added script tag for entry point
- `vite.config.ts` - Fixed env variable mapping

---

## What Still Needs To Be Done

### Immediate (Task 2.3-2.4)
- [ ] **Migrate session persistence to Pocketbase** - Currently still using localStorage for sessions
- [ ] **Sync profile changes to Pocketbase** - Profile updates don't persist to server yet
- [ ] **Handle offline gracefully** - Queue changes when offline, sync when back

### Future (Phase 1)
- [ ] **Replace Gemini with Groq** - Task 3.1
- [ ] **Google TTS integration** - Task 4.1
- [ ] **Groq Whisper STT** - Task 4.2
- [ ] **Friend code system** - Task 5.1
- [ ] **Leaderboard** - Task 5.3

---

## Testing Notes

### What Works
- ✅ Login screen displays correctly
- ✅ Auth state is checked on app load
- ✅ Pocketbase connection is established
- ✅ Collections are created with correct schema and rules

### What Needs Testing
- [ ] Signup flow (create account)
- [ ] Login with existing account
- [ ] Session persistence across refreshes
- [ ] Profile updates syncing to server
- [ ] Logout functionality

---

## Technical Notes

### Pocketbase Instance
- **URL:** https://pocketbase-story.digitalbricks.io
- **Version:** 0.36.2
- **Admin:** richard@digitalbricks.io

### Collection Rules
All collections use owner-based access control:
- Users can only read/write their own records
- Rules use `@request.auth.id` for validation
- Friend codes have public read for lookup

### Self-Referencing Relations
The `sessions` collection has a self-reference for `parent_session`:
- Created in two steps (collection first, then add field)
- Uses actual collection ID, not name

---

## Confidence: 8/10

**Met:**
- [x] Pocketbase client installed and configured
- [x] All collections created with proper schema
- [x] Auth service with signup/login/logout
- [x] React auth context with state management
- [x] Kid-friendly login UI
- [x] App shows auth screen when not logged in

**Concerns:**
- [ ] Session/profile persistence not fully migrated from localStorage
- [ ] Haven't tested full signup/login flow end-to-end

**Deferred:**
- [ ] Offline queue for changes (Phase 1 polish)
- [ ] Real-time subscriptions for multi-device sync (nice-to-have)

---

## Next Steps

1. Test the signup/login flow manually
2. Migrate profile state to sync with Pocketbase
3. Migrate session state to sync with Pocketbase
4. Continue to Task 3 (AI Service Swap)
