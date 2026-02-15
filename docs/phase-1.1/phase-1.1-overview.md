# Phase 1.1: Game-Based Learning Redesign

**Status:** Planning
**Timeline:** 4-5 weeks
**Priority:** HIGH - Major UX overhaul

---

## Executive Summary

Phase 1.1 transforms LingoFriends from a chat-first application into a **garden-first, game-based learning experience**. Children grow a magical garden of knowledge trees, where each tree represents a completed skill path. The garden is alive: trees bloom when knowledge is fresh and wilt when it's time to review.

**One-line pitch:** "Grow a magical garden by learning languages — and help your friends' gardens bloom too."

---

## Navigation Hierarchy

| Level | Name | Analogy | Description |
|-------|------|---------|-------------|
| **Home** | Garden | Main menu / world map | Explorable 2D world. Avatar walks around. Trees represent skill paths. |
| **Sub-menu** | Path | Level select | Winding trail of lesson nodes. Opens when tapping a tree. |
| **Gameplay** | Lesson | Game level | AI tutor chat + concrete activities. 5-8 exercises per lesson. |

**Key insight:** The garden IS the home page. There is no separate dashboard.

---

## Core Changes from Phase 1

| Aspect | Phase 1 (Current) | Phase 1.1 (New) |
|--------|-------------------|-----------------|
| Home screen | Chat interface | Explorable garden world |
| Currency | XP (abstract) | Sun Drops (tangible, visual) |
| Activities | 3 types (quiz, fill-blank, matching) | 6 types (MC, fill-blank, word-arrange, T/F, matching, translate) |
| Lesson flow | Conversational | Structured 5-8 step lessons |
| Spaced repetition | None | Tree decay system |
| Social features | Basic friends | Gift system, decorations |
| Navigation | Sidebar + chat | Garden → Path → Lesson |

---

## Implementation Phases

### Phase A: Core Mechanics (Week 1-2)
**Goal:** Build the foundational game loop

| Task | Name | Dependencies | Time |
|------|------|--------------|------|
| 1.1.1 | Type Definitions & Sun Drop Service | None | 2-3h |
| 1.1.2 | Activity Components | 1.1.1 | 6-8h |
| 1.1.3 | Lesson View Container | 1.1.2 | 4-5h |
| 1.1.4 | Path View (Lesson Select) | 1.1.3 | 3-4h |
| 1.1.5 | Garden World (Basic) | 1.1.4 | 6-8h |
| 1.1.6 | App Navigation Rewrite | 1.1.5 | 3-4h |

**Milestone:** Complete learning loop (Garden → Path → Lesson → Reward)

### Phase B: Growth & Decay (Week 2-3)
**Goal:** Implement progression and spaced repetition

| Task | Name | Dependencies | Time |
|------|------|--------------|------|
| 1.1.7 | Pocketbase Schema Updates | None | 2-3h |
| 1.1.8 | Garden State Management | 1.1.7 | 4-5h |
| 1.1.9 | AI Lesson Generator | 1.1.1 | 4-5h |
| 1.1.10 | Tree Health & Decay System | 1.1.8 | 3-4h |

**Milestone:** Trees grow and decay based on learning progress

### Phase C: Social & Rewards (Week 3-4)
**Goal:** Add social features and reward systems

| Task | Name | Dependencies | Time |
|------|------|--------------|------|
| 1.1.11 | Gift System | 1.1.8 | 5-6h |
| 1.1.12 | Decoration System | 1.1.11 | 3-4h |
| 1.1.13 | Seed Earning Mechanics | 1.1.11 | 2-3h |

**Milestone:** Players can gift items and customize gardens

### Phase D: Polish (Week 4-5)
**Goal:** Production-ready experience

| Task | Name | Dependencies | Time |
|------|------|--------------|------|
| 1.1.14 | PixiJS Upgrade & Assets | 1.1.5 | 6-8h |
| 1.1.17 | OSS Asset Integration (Kenney.nl) | 1.1.14 | 4-6h |
| 1.1.15 | Mobile Controls & Polish | 1.1.14 | 4-5h |
| 1.1.16 | Tutorial Flow & Testing | All | 4-5h |

**Milestone:** Kid-tested, polished experience

---

## Key Design Documents

| Document | Purpose |
|----------|---------|
| `GAME_DESIGN.md` | Complete game design specification |
| `CLINE_GAME_IMPLEMENTATION.md` | Step-by-step implementation guide |
| `prototype-v4-final.jsx` | Working React prototype (reference UX) |

---

## New Concepts

### Sun Drops (Currency)
- Replace abstract XP with tangible "Sun Drops"
- Earned by completing activities correctly
- Wrong answers: -1 Sun Drop penalty (floor at 0)
- Daily cap: 50 Sun Drops
- Visual: Custom SVG droplet with golden gradient

### Tree Health (Spaced Repetition)
- Each tree has health: 0-100%
- Health decays over time without review
- Friends' gifts add buffer days
- Visual states: Full bloom (100%) → Bare stump (5%)

### Gift System
- Earn gifts by completing lessons
- Send to friends: Water drops, sparkles, seeds, decorations
- Gifts help friends' trees stay healthy

### Avatar System
- 8 animal buddies: fox, cat, panda, owl, bunny, bear, penguin, frog
- Avatar walks around garden with arrow keys/WASD
- Mobile: virtual D-pad

---

## Technical Stack Additions

| Technology | Purpose |
|------------|---------|
| PixiJS | 2D WebGL rendering for garden |
| @pixi/react | React integration for PixiJS |
| Framer Motion | UI animations (existing) |

**Asset Sources:** Kenney.nl, OpenGameArt.org (CC0/public domain)

---

## Success Metrics

**Quantitative:**
- [ ] All 16 tasks completed
- [ ] TypeScript compiles with no errors
- [ ] Complete learning loop works (Garden → Path → Lesson → Reward)
- [ ] Tree health decay calculation accurate
- [ ] All 6 activity types functional

**Qualitative:**
- [ ] Kids understand the garden metaphor
- [ ] Kids want to "keep trees alive"
- [ ] Wrong answers feel consequential but not punishing
- [ ] Gift system encourages social interaction
- [ ] Navigation is intuitive

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| PixiJS learning curve | Medium | Start with CSS/HTML, upgrade later |
| Scope creep | High | Strict phase boundaries, defer to Phase 2 |
| Performance on mobile | Medium | Test early on older devices |
| AI lesson quality | High | Iterate on prompts, test with kids |
| Kids don't understand decay | Medium | Clear visual indicators, tutorial |

---

## File Structure (New)

```
src/
├── components/
│   ├── garden/           # Garden world
│   │   ├── GardenWorld.tsx
│   │   ├── GardenTree.tsx
│   │   ├── GardenAvatar.tsx
│   │   ├── InteractionPanel.tsx
│   │   └── MobileDpad.tsx
│   ├── path/             # Lesson select
│   │   ├── PathView.tsx
│   │   ├── LessonNode.tsx
│   │   └── PathHeader.tsx
│   ├── lesson/           # Lesson gameplay
│   │   ├── LessonView.tsx
│   │   ├── TutorBubble.tsx
│   │   ├── HelpPanel.tsx
│   │   ├── LessonComplete.tsx
│   │   ├── SunDropBurst.tsx
│   │   ├── PenaltyBurst.tsx
│   │   └── activities/
│   │       ├── MultipleChoice.tsx
│   │       ├── FillBlank.tsx
│   │       ├── WordArrange.tsx
│   │       ├── TrueFalse.tsx
│   │       ├── MatchingPairs.tsx
│   │       ├── Translate.tsx
│   │       └── ActivityRouter.tsx
│   ├── social/           # Gifts & friends
│   │   ├── GiftUnlock.tsx
│   │   ├── SendGift.tsx
│   │   └── FriendGifts.tsx
│   └── shared/           # Shared game UI
│       ├── SunDropIcon.tsx
│       ├── SunDropCounter.tsx
│       ├── MiniTree.tsx
│       ├── HealthBar.tsx
│       └── AvatarPicker.tsx
├── hooks/
│   ├── useGarden.tsx     # Garden state
│   ├── useSunDrops.tsx   # Currency logic
│   └── useLesson.tsx     # Lesson state machine
└── services/
    ├── sunDropService.ts # Currency calculations
    └── lessonGenerator.ts # AI lesson generation
```

---

## Notes for Implementation

1. **Reference the prototype:** `prototype-v4-final.jsx` shows exact UX behavior
2. **Phase A comes first:** Core mechanics must work before polish
3. **Test with kids early:** Get feedback on garden metaphor before investing heavily
4. **CSS before PixiJS:** Garden can start as HTML/CSS, upgrade to PixiJS in Phase D
5. **Deprecate old components:** ChatInterface, ActivityWidget will be replaced

---

## Related Documentation

- `GAME_DESIGN.md` - Full game design specification
- `CLINE_GAME_IMPLEMENTATION.md` - Implementation guide for Cline
- `../phase-1/` - Previous phase documentation