# LingoFriends

A free, kid-friendly language learning app that uses AI conversation to teach languages through meaningful interaction—not pay-to-play mechanics.

## Vision

LingoFriends reimagines language learning for children (ages 7-18) by combining:

- **Conversational AI** that detects learning opportunities naturally
- **Personalized lessons** generated from the learner's real interests and experiences
- **Healthy engagement** with daily caps and spaced repetition (grow plants, not addiction)
- **Social motivation** through friends and leaderboards (no social media rabbit holes)
- **Privacy-first** architecture hosted in Europe with no big-tech data harvesting

The app treats language as a soft skill and personal development journey, not a technical drill. Every interaction has a communicative purpose tied to the learner's real life.

## Current Phase: MVP (Phase 1)

**Goal:** Kids can learn through AI conversation and compete with friends on a leaderboard.

**Current Status:** 🟢 App running with auth flow

### MVP Features (In Scope)

- [x] Pocketbase authentication (email-based, with password reset)
- [x] Auth UI (kid-friendly login/signup screen)
- [x] Pocketbase collections created (profiles, sessions, friendships, etc.)
- [x] Pocketbase service layer with CRUD operations
- [x] Profile sync to Pocketbase (with XP daily cap)
- [x] Session sync to Pocketbase (auto-save, resume)
- [x] AI conversation with lesson detection (Groq Llama 3.3)
- [x] Kid-appropriate system prompts and content filtering
- [x] Age-based prompt adjustments (7-10, 11-14, 15-18)
- [x] Basic activities (Quiz, Fill-blank, Matching)
- [x] Lesson interruptibility (save/resume for short screen time)
- [x] Daily progress cap with visual feedback
- [x] Voice-first conversation (Groq Whisper STT + Google TTS)
- [ ] Friends list (add by friend code)
- [ ] Leaderboard (XP-based, friends only)

### Deferred to v1.0

- Messaging between friends
- Gifts system (hints, skips)
- Spaced repetition "plant growth" visualization
- Multiple language pairs
- Detailed progress analytics

### Deferred to Future Phases

- French curriculum subjects (Scratch, maths, dictée)
- Parent dashboard
- Classroom/teacher features

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React + TypeScript + Vite | Already built, modern, fast |
| Styling | Tailwind CSS | Already in place, kid-friendly theming |
| Backend | Pocketbase (self-hosted EU) | Simple, privacy-friendly, real-time |
| AI Chat | Groq API (Llama 3.3 70B) | Fast, capable, no big-tech data concerns |
| Complex AI | Anthropic Haiku | Better reasoning for edge cases |
| TTS | Google Cloud TTS (Pro) | Excellent multilingual voices |
| STT | Groq Whisper Large v3 | Fast, accurate, handles kids well |

## Project Structure

```
lingofriends/
├── README.md                 # This file
├── ROADMAP.md                # Phases → Tasks → Subtasks
├── CLAUDE_RULES.md           # Dev standards + AI model assignments
├── PEDAGOGY.md               # Teaching methodology principles
├── TASK_TEMPLATE.md          # Standard format for task docs
├── LEARNINGS.md              # Running log of solutions/gotchas
├── FUTURE_CURRICULUM.md      # Stretch goals (Scratch, maths, etc)
├── .clinerules               # Cline-specific instructions
├── docs/
│   ├── phase-1/              # MVP task documentation
│   ├── phase-2/              # v1.0 task documentation
│   └── phase-3/              # Future phases
├── scripts/
│   └── setup-pocketbase.js   # DB schema creation script
└── src/
    ├── components/           # React components
    ├── services/             # AI, voice, Pocketbase clients
    └── types/                # TypeScript definitions
```

## Setup

```bash
# Clone and install
git clone [repo-url]
cd lingofriends
npm install

# Environment variables
cp .env.example .env
# Fill in:
# - VITE_POCKETBASE_URL=your-pocketbase-instance
# - VITE_GROQ_API_KEY=your-groq-key
# - VITE_GOOGLE_TTS_KEY=your-google-key

# Run development server
npm run dev
```

## Success Criteria for MVP

1. A child can create an account and log in
2. A child can have a voice conversation with the AI tutor
3. The AI detects learning opportunities and creates appropriate lessons
4. Lessons are interruptible and resumable
5. Progress (XP) is saved and displayed
6. Children can add friends and see a leaderboard
7. Daily caps prevent overuse

## Origin

This project started as "LingoLoft" in Google AI Studio, built to provide a free alternative to Duolingo's increasingly pay-to-play model. The pivot to "LingoFriends" adds the social features kids requested while maintaining healthy engagement patterns.

---

**Status:** 🟢 Active Development (Phase 1 - MVP)
**Last Updated:** 2026-04-02

### Recent Updates
- ✅ **Task 4: Voice Services** - Google Cloud TTS + Groq Whisper STT
- ✅ Email-based authentication (with password reset)
- ✅ Auto-creation of Main Hall session for new users
- ✅ **Task 3: AI Service Swap** - Groq Llama 3.3 70B now powers chat
- ✅ Kid-friendly "Lingo" persona with age-based adjustments
- ✅ Content safety filtering for all AI responses
- ✅ Session persistence to Pocketbase with auto-save
- ✅ Profile sync with XP daily cap enforcement
- ✅ Pocketbase 0.36.2 integration complete
