# LingoFriends Roadmap

## Phase 1: MVP — "Kids Can Learn and Compete"

**Goal:** Working app where kids can have AI conversations, earn XP, and see friends on a leaderboard.

**Timeline:** 3-4 weeks
**Estimated Cost:** $200-400 in API tokens

---

### Task 1: Project Foundation

**Objective:** Clean up existing code, set up new architecture, configure environment.

#### 1.1 Code Audit & Cleanup
- [ ] Review existing LingoLoft code from Google AI Studio
- [ ] Identify reusable components vs. needs rewrite
- [ ] Remove Gemini-specific code
- [ ] Document current state in LEARNINGS.md

#### 1.2 Environment Setup
- [ ] Create .env.example with all required variables
- [ ] Set up Vite environment variable handling
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint + Prettier

#### 1.3 Project Structure
- [ ] Reorganize src/ folder structure
- [ ] Create service layer architecture
- [ ] Set up barrel exports (index.ts files)

---

### Task 2: Pocketbase Integration

**Objective:** Replace localStorage with Pocketbase for persistence and auth.

#### 2.1 Schema Setup Script ✅
- [x] Create scripts/setup-pocketbase.cjs
- [x] Define all collections (profiles, sessions, friendships, friend_codes, daily_progress, vocabulary)
- [x] Set up collection rules (permissions)
- [x] Test script against remote Pocketbase instance

#### 2.2 Authentication Flow ✅
- [x] Create pocketbaseService.ts
- [x] Implement signup (username + password)
- [x] Implement login
- [x] Implement session persistence (remember me via Pocketbase auth store)
- [x] Create auth context for React (useAuth hook)
- [x] Build login/signup UI components (AuthScreen)

#### 2.3 Profile Sync ✅
- [x] Migrate UserProfile type to match Pocketbase schema
- [x] Implement profile CRUD operations (updateProfile in useAuth)
- [x] Sync profile on app load (via useAuth context)
- [x] Add XP with daily cap enforcement (addXP method)
- [ ] Handle offline gracefully (deferred - basic error handling in place)

#### 2.4 Session Persistence ✅
- [x] Create useSessions hook for session management
- [x] Migrate App.tsx from localStorage to Pocketbase sessions
- [x] Implement session save/load via hook methods
- [x] Handle lesson interruption (auto-save on blur/close via debounce + visibilitychange)
- [x] Implement session resume on app reopen (sessions load from Pocketbase)

---

### Task 3: AI Service Swap ✅

**Objective:** Replace Gemini with Groq (Llama 3.3) for main AI, keep option for Haiku on complex tasks.

#### 3.1 Groq Client Setup ✅
- [x] Create groqService.ts
- [x] Implement chat completion with streaming
- [x] Handle rate limiting gracefully
- [x] Add retry logic with exponential backoff

#### 3.2 System Prompt Overhaul ✅
- [x] Rewrite system prompt for kid-appropriate persona
- [x] Implement lexical/communicative/coaching pedagogy
- [x] Add age-appropriate content filtering
- [x] Create separate prompts for Main Hall vs. Lesson modes
- [ ] Test extensively with various age groups in mind (ongoing)

#### 3.3 Action Parsing ✅
- [x] Port JSON action extraction from Gemini service
- [x] Validate action schema before processing
- [x] Handle malformed responses gracefully
- [x] Add logging for debugging

#### 3.4 Model Router (Deferred)
- [ ] Create modelRouter.ts for multi-model support (Phase 2)
- [ ] Route simple tasks to Llama 3.3
- [ ] Route complex reasoning to Haiku
- [ ] Add configuration for model selection

---

### Task 4: Voice Services ✅

**Objective:** Implement reliable voice input/output for kids who can't type well.

#### 4.1 Google TTS Integration ✅
- [x] Create ttsService.ts
- [x] Implement Google Cloud TTS API calls
- [x] Handle multilingual voices (French, English)
- [x] Implement audio playback with HTML5 Audio
- [x] Add loading states and error handling

#### 4.2 Groq Whisper STT Integration ✅
- [x] Create sttService.ts
- [x] Implement audio recording (MediaRecorder API)
- [x] Send audio to Groq Whisper endpoint
- [x] Handle transcription response
- [x] Implement tap-to-toggle UI

#### 4.3 Voice UI Components ✅
- [x] Create VoiceButton component (record/stop)
- [x] Add visual feedback during recording
- [x] Handle microphone permissions gracefully
- [ ] Show transcription preview before sending (deferred to Phase 2)

---

# Phase 1 - Updated Roadmap Section

**Add this section to ROADMAP.md after Task 3**

---

### Task 4: Design System & Style Overhaul

**Objective:** Create comprehensive design system and transform app into kid-friendly, gamified experience.

#### 4.1 Design System Documentation
- [ ] Create `docs/design-system.md` with complete guidelines
- [ ] Define color palette (Duolingo-inspired)
- [ ] Define typography scale and font usage
- [ ] Define spacing system (4px or 8px base unit)
- [ ] Document component patterns (buttons, cards, inputs, badges)
- [ ] Define animations and transitions
- [ ] Specify accessibility requirements (touch targets, contrast)

#### 4.2 Tailwind Configuration
- [ ] Update `tailwind.config.js` with custom design tokens
- [ ] Add custom colors to theme
- [ ] Add custom spacing values
- [ ] Add custom animations
- [ ] Add custom font families

#### 4.3 Reusable UI Components
- [ ] Create `components/ui/Button.tsx` - All button variants
- [ ] Create `components/ui/Card.tsx` - Container component
- [ ] Create `components/ui/Badge.tsx` - Labels and tags
- [ ] Create `components/ui/Input.tsx` - Form inputs
- [ ] Create `components/ui/ProgressBar.tsx` - XP and loading bars
- [ ] Create `components/ui/Avatar.tsx` - User avatars
- [ ] Create `components/ui/Modal.tsx` - Overlay dialogs

#### 4.4 Apply Styles to Existing Components
- [ ] Restyle `AuthScreen.tsx`
- [ ] Restyle `App.tsx` (sidebar, layout)
- [ ] Restyle `ChatInterface.tsx`
- [ ] Restyle `VoiceButton.tsx`
- [ ] Replace all hard-coded colors with design tokens
- [ ] Apply consistent spacing throughout

#### 4.5 Asset Preparation
- [ ] Source/create character illustrations
- [ ] Design achievement badges
- [ ] Create subject/theme icons
- [ ] Design celebration animations
- [ ] Create loading spinners with personality

---

### Task 5: Database Schema Updates

**Objective:** Update Pocketbase schema to support onboarding and personalization features.

#### 5.1 Update Profiles Collection ✅
- [ ] Add `subject_type` field (language/maths/coding)
- [ ] Add `target_subject` field (English/German/Maths/Scratch)
- [ ] Add `selected_interests` field (JSON array)
- [ ] Update setup script with new fields
- [ ] Run script against remote Pocketbase

#### 5.2 Create AI Profile Fields Collection
- [ ] Define `ai_profile_fields` collection schema
- [ ] Set up collection rules (user-owned access)
- [ ] Add to setup script
- [ ] Test collection creation

#### 5.3 Update TypeScript Types
- [ ] Add `SubjectType` type
- [ ] Add `TargetSubject` type
- [ ] Add `UserInterest` type
- [ ] Add `AIProfileField` interface
- [ ] Update `UserProfile` interface with new fields
- [ ] Verify all types compile

#### 5.4 Update Pocketbase Service
- [ ] Add `getAIProfileFields()` method
- [ ] Add `upsertAIProfileField()` method
- [ ] Add `deleteAIProfileField()` method
- [ ] Update existing profile methods to handle new fields
- [ ] Add error handling

#### 5.5 Migration & Testing
- [ ] Test schema changes on dev instance
- [ ] Verify backward compatibility
- [ ] Test with existing users
- [ ] Test with new users
- [ ] Document migration notes

---

### Task 6: Onboarding Screens

**Objective:** Create multi-step onboarding flow for new users to select language, subject, and interests.

#### 6.1 Component Architecture
- [ ] Create `components/onboarding/` directory
- [ ] Create `OnboardingContainer.tsx` (flow manager)
- [ ] Create `StepIndicator.tsx` (progress visualization)
- [ ] Set up shared types and state management

#### 6.2 Step 1: Native Language Selection
- [ ] Create `Step1Language.tsx`
- [ ] Build language grid UI
- [ ] Add available languages (French, English)
- [ ] Add coming soon languages (grayed out)
- [ ] Implement selection logic
- [ ] Update UI language on selection

#### 6.3 Step 2: Subject Selection
- [ ] Create `Step2Subject.tsx`
- [ ] Build subject cards UI
- [ ] Add available subjects (English, German)
- [ ] Add coming soon subjects (Maths, Scratch with badges)
- [ ] Implement selection logic
- [ ] Handle conditional availability (e.g., English not available if native is English)

#### 6.4 Step 3: Interests Selection
- [ ] Create `Step3Interests.tsx`
- [ ] Create `interests-data.ts` with categorized interests
- [ ] Build categorized chip/pill UI
- [ ] Implement multi-select toggle logic
- [ ] Add skip option
- [ ] Handle empty selections gracefully

#### 6.5 Flow Integration
- [ ] Implement navigation (next/back)
- [ ] Add step transitions (animations)
- [ ] Handle form state persistence across steps
- [ ] Implement data submission to Pocketbase
- [ ] Create success screen
- [ ] Integrate with AuthScreen (post-signup redirect)

#### 6.6 Testing & Polish
- [ ] Test full flow on mobile and desktop
- [ ] Test back navigation preserves selections
- [ ] Test error handling (network failures)
- [ ] Verify translations for multi-language support
- [ ] Get user testing feedback from kids

---

### Task 7: Main Interface Updates

**Objective:** Remove language picker and add guided learning launcher with AI conversation flow.

#### 7.1 Remove Language Picker
- [ ] Remove language switcher from sidebar in `App.tsx`
- [ ] Remove related state and handlers
- [ ] Update UI to reflect subject is set in profile

#### 7.2 Create Learning Launcher Component
- [ ] Create `components/LearningLauncher.tsx`
- [ ] Build subject dropdown (disabled, shows current)
- [ ] Build theme dropdown (from user interests)
- [ ] Build "Start Learning" button
- [ ] Handle empty interests case ("General" option)
- [ ] Add "Add interests" link for empty state

#### 7.3 AI Conversation Starter Service
- [ ] Create `services/lessonStarterService.ts`
- [ ] Define system prompt for lesson starters
- [ ] Implement `generateLessonStarter()` function
- [ ] Handle different subject/theme combinations
- [ ] Add context from AI profile fields
- [ ] Test variety of generated openings

#### 7.4 Integrate with Main App
- [ ] Add Learning Launcher to App.tsx
- [ ] Implement show/hide logic
- [ ] Connect "Start" button to AI generation
- [ ] Add opening message to main session
- [ ] Transition to chat interface
- [ ] Add "Change Topic" option to return to launcher

#### 7.5 Update AI System Prompts
- [ ] Update main hall prompt with subject/theme context
- [ ] Add native language handling
- [ ] Add profile field extraction logic
- [ ] Add lesson suggestion capabilities
- [ ] Test conversations in both languages

#### 7.6 Testing & Iteration
- [ ] Test with different subject/theme combinations
- [ ] Verify AI questions are contextual
- [ ] Test profile field extraction
- [ ] Verify conversation stays on-topic
- [ ] Get feedback from kids on engagement

---

### Task 8: Profile Management & Settings

**Objective:** Enable users to edit their profile settings and return to onboarding screens as needed.

#### 8.1 Create Profile Settings Component
- [ ] Create `components/ProfileSettings.tsx`
- [ ] Build settings layout (form-based)
- [ ] Add native language dropdown
- [ ] Add learning subject dropdown (with confirmation)
- [ ] Add interests editing trigger
- [ ] Add display name editing
- [ ] Add progress stats display (read-only)

#### 8.2 Update Onboarding Components for Reuse
- [ ] Add props to `Step1Language.tsx` for edit mode
- [ ] Add props to `Step2Subject.tsx` for edit mode
- [ ] Add props to `Step3Interests.tsx` for edit mode
- [ ] Update button text based on mode
- [ ] Handle callbacks instead of navigation

#### 8.3 Interests Editing Modal
- [ ] Create modal wrapper for interests picker
- [ ] Reuse `Step3Interests` component
- [ ] Pre-fill current selections
- [ ] Handle save/cancel actions
- [ ] Update profile on save

#### 8.4 Confirmation Dialogs
- [ ] Create `components/ConfirmDialog.tsx`
- [ ] Implement subject change confirmation
- [ ] Add warning messages for language changes
- [ ] Style consistently with design system

#### 8.5 Profile Settings Integration
- [ ] Add settings button to sidebar in `App.tsx`
- [ ] Implement show/hide state for settings
- [ ] Handle save changes flow
- [ ] Implement validation
- [ ] Add success/error messages
- [ ] Test changes persist after reload

#### 8.6 Testing & Polish
- [ ] Test all field editing
- [ ] Test confirmation flows
- [ ] Test validation errors
- [ ] Test settings close/cancel
- [ ] Verify changes save to Pocketbase
- [ ] Test on mobile and desktop

---

## Phase 1 Summary - Current Status

**Completed:**
- ✅ Task 1: Project Foundation
- ✅ Task 2: Pocketbase Integration
- ✅ Task 3: AI Service Swap

**In Progress:**
- 📋 Task 4: Design System & Style Overhaul
- 📋 Task 5: Database Schema Updates
- 📋 Task 6: Onboarding Screens
- 📋 Task 7: Main Interface Updates
- 📋 Task 8: Profile Management

**Total Estimated Time:** 20-30 hours
**Total Estimated Cost:** $300-500 in API tokens

---

## Phase Completion Criteria

Phase 1 is complete when:
- [ ] All Task 4-8 subtasks are checked off
- [ ] App has cohesive Duolingo-inspired design
- [ ] New users complete onboarding smoothly
- [ ] Users can start learning sessions with clear guidance
- [ ] Users can edit their profile/preferences
- [ ] Kids enjoy using the app (user testing feedback)
- [ ] All changes are tested on mobile and desktop
- [ ] Documentation is updated
- [ ] Confidence score: 8/10 or higher on all tasks

After Phase 1, we'll move to:
- **Phase 2:** Friend system, leaderboard, spaced repetition

----

### Task 5: Friends & Leaderboard

**Objective:** Basic social features without becoming a social media app.

#### 5.1 Friend Code System
- [ ] Generate unique 6-character friend codes
- [ ] Create friend code display component
- [ ] Implement code lookup endpoint
- [ ] Add code expiration (7 days)

#### 5.2 Friend Management
- [ ] Implement friend request flow
- [ ] Create friends list component
- [ ] Handle accept/decline
- [ ] Show friend online status (optional)

#### 5.3 Leaderboard
- [ ] Create leaderboard query (friends only)
- [ ] Build leaderboard UI component
- [ ] Show rank, XP, streak for each friend
- [ ] Highlight current user
- [ ] Add refresh functionality

---

### Task 6: Healthy Engagement

**Objective:** Prevent addiction patterns, encourage healthy learning habits.

#### 6.1 Daily XP Cap
- [ ] Add daily_xp_today to profile
- [ ] Reset daily XP at midnight (user timezone)
- [ ] Show progress toward daily cap
- [ ] Gentle messaging when cap reached ("Great work today! See you tomorrow!")

#### 6.2 Session Limits
- [ ] Track session duration
- [ ] Gentle reminders after 30 mins
- [ ] Encourage breaks
- [ ] Save state for easy resume

#### 6.3 Progress Visualization
- [ ] Simple XP progress bar
- [ ] Streak counter with celebration
- [ ] "Come back tomorrow" messaging (not FOMO-inducing)

---

### Task 7: Polish & Testing

**Objective:** Make it work reliably for kids.

#### 7.1 Error Handling
- [ ] Graceful API failure handling
- [ ] Offline mode messaging
- [ ] Retry mechanisms with user feedback

#### 7.2 Mobile Responsiveness
- [ ] Test on various screen sizes
- [ ] Optimize touch targets for kids
- [ ] Handle keyboard appearance on mobile

#### 7.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader basics
- [ ] High contrast mode (optional)

#### 7.4 Testing
- [ ] Unit tests for services
- [ ] Integration tests for auth flow
- [ ] Manual testing with actual kids

---

## Phase 2: v1.0 — "Social Learning"

**Goal:** Add messaging, gifts, and spaced repetition visualization.

### Task 8: Friend Messaging
- [ ] Simple message system (not a chat app)
- [ ] Predefined encouragement messages
- [ ] Optional custom short messages
- [ ] Notification of new messages

### Task 9: Gift System
- [ ] Define gift types (hint, skip, XP boost)
- [ ] Gift sending UI
- [ ] Gift receiving notification
- [ ] Gift usage in lessons

### Task 10: Spaced Repetition
- [ ] Vocabulary tracking per user
- [ ] Review scheduling algorithm
- [ ] "Plant growth" visualization (seed → tree)
- [ ] Daily review prompts

### Task 11: Multiple Languages
- [ ] Add more target languages
- [ ] Language selection UI
- [ ] Per-language progress tracking

---

## Phase 3: Curriculum Expansion

**Goal:** Teach more than just language.

### Task 12: French Curriculum Research
- [ ] Document French school curriculum requirements
- [ ] Identify AI-teachable subjects
- [ ] Scope Scratch integration possibilities
- [ ] Scope maths tutoring approach
- [ ] Document in FUTURE_CURRICULUM.md

### Task 13: Dictée Module
- [ ] Audio playback of French text
- [ ] User transcription input
- [ ] AI correction and feedback
- [ ] Progress tracking

### Task 14: Maths Module
- [ ] Equation rendering (MathJax/KaTeX)
- [ ] Step-by-step problem solving
- [ ] Grade-appropriate problem generation
- [ ] Visual explanations

---

## Phase 4: Production Features

**Goal:** Ready for wider release.

### Task 15: Parent Dashboard
- [ ] Progress reports
- [ ] Time limit settings
- [ ] Content filtering options
- [ ] Friend approval system

### Task 16: Analytics
- [ ] Learning progress metrics
- [ ] Engagement patterns
- [ ] Anonymized aggregate stats

### Task 17: Scalability
- [ ] Rate limiting
- [ ] Caching strategy
- [ ] CDN for assets
- [ ] Load testing

---

## Deferred / Maybe Never

- Real-time multiplayer activities
- Voice chat with friends
- User-generated content
- Monetization (keep it free!)

---

**Current Phase:** Phase 1 (MVP)
**Current Task:** Task 5 (Friends & Leaderboard) — Next up
**Last Completed:** Task 4 (Voice Services - Google TTS + Groq Whisper)
