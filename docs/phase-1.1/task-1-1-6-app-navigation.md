# Task 1.1.6: App Navigation Rewrite

**Status:** ✅ Complete
**Phase:** A (Core Mechanics)
**Dependencies:** Task 1.1.5 (Garden World Basic)
**Estimated Time:** 3-4 hours
**Completed:** 2026-02-15

---

## Objective

Rewrite the main app navigation to use the new Garden → Path → Lesson hierarchy. Replace the existing chat-first flow with the garden-first experience. This task connects all Phase A components into a cohesive app.

---

## Deliverables

### Files Modified
- `App.tsx` — Rewritten with garden-first navigation structure

### Files Created
- `src/hooks/useNavigation.tsx` — Navigation state management hook
- `src/components/navigation/AppHeader.tsx` — Top navigation bar with stats
- `src/components/navigation/TabBar.tsx` — Bottom tab navigation
- `src/components/navigation/index.ts` — Navigation exports
- `src/data/mockGameData.ts` — Mock data for testing navigation
- `src/services/lessonPlanService.ts` — Lesson plan stub (AI generation in Task 1.1.9)

### Files Deprecated (with @deprecated comments)
- `components/ChatInterface.tsx` — Replaced by LessonView
- `components/Sidebar.tsx` — Replaced by AppHeader + TabBar

---

## Navigation Hierarchy

```
App
├── AuthScreen (not logged in)
├── OnboardingContainer (logged in, !onboardingComplete)
└── GameApp (logged in, onboardingComplete)
    ├── AppHeader (SunDrops, streak, avatar, settings)
    ├── Views (with Framer Motion transitions)
    │   ├── GardenWorld (default)
    │   ├── PathView (when tree tapped)
    │   └── LessonView (when lesson started)
    └── TabBar (garden, path (disabled), friends)
```

---

## Implementation Summary

### 1. Navigation Hook (`useNavigation.tsx`)
- Manages navigation state with `ViewType`: 'garden' | 'path' | 'lesson'
- Provides actions: `goToGarden()`, `goToPath(tree)`, `goToLesson(lesson, plan)`, `goBack()`
- Supports animated transitions with direction tracking

### 2. AppHeader Component
- Displays player avatar emoji and app name
- Shows streak counter (🔥)
- Shows SunDrop balance using existing `SunDropCounter`
- Settings button opens ProfileSettings

### 3. TabBar Component
- Bottom navigation with 3 tabs: Garden, Path, Friends
- Path tab is disabled (must be accessed via garden)
- Friends tab shows placeholder modal (Task 1.1.11 will implement)
- Sticky positioning with safe-area-inset support

### 4. Mock Data (`mockGameData.ts`)
- Sample skill paths: Spanish Greetings, Numbers, Colors
- Sample user trees with positions in garden
- Mock lesson plan generator with activities
- Helper functions for data lookup

### 5. Lesson Plan Service (`lessonPlanService.ts`)
- Stub service for lesson generation
- Returns mock data for now
- Will be AI-powered in Task 1.1.9

### 6. App.tsx Rewrite
- Auth flow: LoadingScreen → AuthScreen → OnboardingContainer → GameApp
- GameApp manages navigation state and view rendering
- Animated transitions using Framer Motion AnimatePresence
- Lesson loading overlay during plan generation
- Friends placeholder modal

---

## Testing Checklist

### Navigation Flow
- [x] App loads to garden after login
- [x] Tapping tree opens path view
- [x] Tapping lesson in path starts lesson
- [x] Back button from lesson goes to path
- [x] Back button from path goes to garden
- [x] Tab bar garden button goes to garden
- [x] Tab bar friends button works (placeholder OK)

### State Management
- [x] Navigation state persists during session
- [x] Lesson completion returns to path
- [x] Path completion returns to garden
- [ ] Refresh preserves garden state (needs Task 1.1.7 for persistence)

### Animations
- [x] View transitions smooth (Framer Motion)
- [x] Direction correct for each transition
- [ ] No frame drops on mobile (needs testing)

### Build & Deprecation
- [x] TypeScript compiles successfully
- [x] Old components not rendered in new flow
- [x] Deprecation comments added to old components

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Garden is default view | ✅ |
| Path → Lesson flow works | ✅ |
| Back navigation works | ✅ |
| Tab bar functional | ✅ |
| Old components deprecated | ✅ |

---

## Confidence Score: 9/10

**Met:**
- [x] Navigation hook created with proper state management
- [x] AppHeader and TabBar components implemented
- [x] App.tsx rewritten for garden-first flow
- [x] Mock data for testing
- [x] Lesson plan service stub
- [x] Framer Motion animations
- [x] Deprecation comments on old components
- [x] Build passes successfully
- [x] All bugs fixed and verified working

**Concerns:**
- None significant - implementation matches spec

**Deferred:**
- [ ] Friends tab functionality (Task 1.1.11)
- [ ] Real data from Pocketbase (Task 1.1.7)
- [ ] AI-powered lesson generation (Task 1.1.9)
- [ ] Mobile performance testing (Task 1.1.15)

---

## Bug Fixes (Post-Implementation)

### Bug 1: Framer Motion Spring Animation Keyframes
**Issue:** `Only two keyframes currently supported with spring and inertia animations`
**Cause:** Using 3 keyframes like `scale: [0, 1.3, 1]` with spring animations
**Fix:** Changed to 2 keyframes: `animate={{ scale: 1, rotate: 0 }}`
**Files:** `SunDropBurst.tsx`, `PenaltyBurst.tsx`

### Bug 2: SVG Radial Gradient Undefined Attribute
**Issue:** `<ellipse> attribute cx: Expected length, "undefined"`
**Cause:** Radial gradient without explicit coordinate values
**Fix:** Replaced radial gradient with simple semi-transparent ellipse
**Files:** `SunDropIcon.tsx`

### Bug 3: True/False Activity Blank Question
**Issue:** True/False activities showed blank question text
**Cause:** Using `question` property instead of `statement` in mock data
**Fix:** Changed mock data to use correct `statement` property
**Files:** `mockGameData.ts`

### Bug 4: Help Button Showing When Empty
**Issue:** Help button displayed even when `helpText` was empty
**Cause:** Not checking for truthy `helpText` before rendering
**Fix:** Added conditional rendering: `{helpText ? <button>...</button> : <div />}`
**Files:** All activity components (MultipleChoice, FillBlank, WordArrange, TrueFalse, Translate, MatchingPairs)

### Bug 5: X Button Overlay Issue
**Issue:** X button header overlay remained visible during lesson-to-path transition
**Cause:** Animation state not being tracked during exit transition
**Fix:** Added `isLessonExiting` state to properly hide header during exit animation
**Files:** `App.tsx`

### Bug 6: TabBar Not Working During Transition
**Issue:** TabBar didn't respond during lesson exit animation
**Cause:** Same root cause as Bug 5 - needed transition state tracking
**Fix:** Same fix as Bug 5 - `isLessonExiting` state
**Files:** `App.tsx`
