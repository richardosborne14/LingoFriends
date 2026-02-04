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

#### 2.1 Schema Setup Script
- [ ] Create scripts/setup-pocketbase.js
- [ ] Define all collections (users, profiles, sessions, friendships, etc.)
- [ ] Set up collection rules (permissions)
- [ ] Test script against local Pocketbase instance

#### 2.2 Authentication Flow
- [ ] Create pocketbaseService.ts
- [ ] Implement signup (username + parent email)
- [ ] Implement login
- [ ] Implement session persistence (remember me)
- [ ] Create auth context for React
- [ ] Build login/signup UI components

#### 2.3 Profile Sync
- [ ] Migrate UserProfile type to match Pocketbase schema
- [ ] Implement profile CRUD operations
- [ ] Sync profile on app load
- [ ] Handle offline gracefully (queue changes)

#### 2.4 Session Persistence
- [ ] Migrate ChatSession type to Pocketbase
- [ ] Implement session save/load
- [ ] Handle lesson interruption (save state on blur/close)
- [ ] Implement session resume on app reopen

---

### Task 3: AI Service Swap

**Objective:** Replace Gemini with Groq (Llama 3.3) for main AI, keep option for Haiku on complex tasks.

#### 3.1 Groq Client Setup
- [ ] Create groqService.ts
- [ ] Implement chat completion with streaming
- [ ] Handle rate limiting gracefully
- [ ] Add retry logic with exponential backoff

#### 3.2 System Prompt Overhaul
- [ ] Rewrite system prompt for kid-appropriate persona
- [ ] Implement lexical/communicative/coaching pedagogy
- [ ] Add age-appropriate content filtering
- [ ] Create separate prompts for Main Hall vs. Lesson modes
- [ ] Test extensively with various age groups in mind

#### 3.3 Action Parsing
- [ ] Port JSON action extraction from Gemini service
- [ ] Validate action schema before processing
- [ ] Handle malformed responses gracefully
- [ ] Add logging for debugging

#### 3.4 Model Router (Optional)
- [ ] Create modelRouter.ts for multi-model support
- [ ] Route simple tasks to Llama 3.3
- [ ] Route complex reasoning to Haiku
- [ ] Add configuration for model selection

---

### Task 4: Voice Services

**Objective:** Implement reliable voice input/output for kids who can't type well.

#### 4.1 Google TTS Integration
- [ ] Create ttsService.ts
- [ ] Implement Google Cloud TTS Pro API calls
- [ ] Handle multilingual voices (French, English, etc.)
- [ ] Implement audio playback with Web Audio API
- [ ] Add loading states and error handling

#### 4.2 Groq Whisper STT Integration
- [ ] Create sttService.ts
- [ ] Implement audio recording (MediaRecorder API)
- [ ] Send audio to Groq Whisper endpoint
- [ ] Handle transcription response
- [ ] Implement push-to-talk UI

#### 4.3 Voice UI Components
- [ ] Create VoiceButton component (record/stop)
- [ ] Add visual feedback during recording
- [ ] Show transcription preview before sending
- [ ] Handle microphone permissions gracefully

---

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
**Current Task:** Task 1 (Foundation) — Documentation
