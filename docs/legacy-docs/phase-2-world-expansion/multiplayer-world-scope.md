# Future Phase: Multiplayer World

**Status:** 📋 Scoped — not scheduled  
**Prerequisites:** Phase 2.0 complete (especially 2.0.8 garden overhaul, 2.0.11 world map prototype)  
**Estimated Time:** 60–100 hours (major phase)  
**Last Updated:** 2026-02-28

---

## Vision

LingoFriends becomes a shared world where friends learn languages together. You have a garden on a "server" alongside your friends. You can visit their gardens, see what they're learning, talk to them over voice, and even jump into their lesson to help them — like sitting next to a classmate.

---

## ⚠️ Child Safety — MUST ADDRESS BEFORE BUILDING

This phase involves real-time communication between minors. Before ANY implementation:

1. **COPPA compliance** (if targeting US users): Verifiable parental consent required for real-time communication features for users under 13.

2. **GDPR for children** (EU/FR users): Processing of children's data requires parental consent. Real-time voice data is personal data.

3. **Audio moderation**: Unmoderated real-time audio between minors is a significant safeguarding risk. Options:
   - **Restrict to known friends only** (friend code system already exists)
   - **Require parental approval** for voice features specifically
   - **Record and review** (introduces privacy/storage concerns)
   - **AI-powered real-time moderation** (emerging technology, not yet reliable for children)
   - **Text-only initially** — defer voice chat until moderation is solved

4. **Data handling**: Voice streams should be ephemeral (not stored). If collaborative lesson viewing requires state sync, the data should be minimal and temporary.

5. **Reporting mechanism**: Users need a way to report inappropriate behaviour.

**Recommendation:** Consult a child safety expert and/or COPPA lawyer before building voice features. Consider launching multiplayer with text presence only (see friend's status, visit their garden) and adding voice as a separate, carefully moderated feature later.

---

## Core Features (Ordered by Complexity)

### Tier 1: Presence & World Map (Moderate)

**Server Concept:**
- Users create or join a "server" via invite code
- Each server holds up to 10-20 members
- On sign-in, you see your world — a map of all gardens on your server
- When you sign up, you automatically create a personal server

**World Map:**
- Top-down view showing garden tiles for each member
- Tile shows: avatar, name, level, current status (online/offline/in lesson)
- Your garden is always accessible; friends' gardens require visiting

**Friend Status:**
- See which friends are online
- See what lesson they're currently doing
- See their garden health at a glance

**Technical stack:**
- Pocketbase real-time subscriptions for presence updates
- `servers`, `server_members` collections (schema prepped in 2.0.11)
- Status field updated when user enters/exits lessons
- Poll every 30 seconds or use Pocketbase SSE for real-time

### Tier 2: Garden Visiting (Moderate-Hard)

**Visit a friend's garden:**
- Click their tile on the world map → "Visit" button
- Your avatar appears in THEIR garden (read-only)
- You can walk around and see their trees, decorations, animals
- You see their learning trees with health indicators
- You CANNOT modify their garden

**Technical stack:**
- Fetch friend's garden data (tree positions, decorations) from Pocketbase
- Render their garden in the Three.js scene
- Your avatar rendered as a "visitor" (maybe slightly transparent or with a visitor badge)
- "Return home" button to go back to your garden

**Real-time sync:**
- Friend's avatar position updates via WebSocket (Pocketbase real-time)
- If friend is online and in their garden, you see their avatar moving
- If friend is in a lesson, their avatar shows a "📚 In lesson" indicator

### Tier 3: WebRTC Voice Chat (Hard)

**One-on-one voice while visiting:**
- When visiting a friend's garden, a "🎤 Call" button appears
- Initiates WebRTC peer-to-peer audio connection
- Both users hear each other's voice through device speakers
- Clear "End call" button
- No video (audio only, simpler and safer)

**Technical requirements:**
- **Signalling server:** Pocketbase real-time can serve as the signalling channel (exchange SDP offers/answers via real-time messages)
- **STUN server:** Use free Google STUN servers (`stun:stun.l.google.com:19302`)
- **TURN server:** Needed for users behind restrictive NATs. Options:
  - Self-hosted Coturn (free, requires a server with public IP)
  - Twilio Network Traversal (~$0.002/min — affordable for limited use)
  - Metered.ca TURN (free tier available)
- **Codec:** Opus via WebRTC (default, excellent quality)

```typescript
// Simplified WebRTC flow:
// 1. User A clicks "Call" → create RTCPeerConnection
// 2. A creates offer → sends via Pocketbase real-time to B
// 3. B receives offer → creates answer → sends back
// 4. ICE candidates exchanged via Pocketbase
// 5. Connection established → audio flows P2P
// 6. Either user clicks "End" → close connection
```

**Safety measures (CRITICAL):**
- Voice only between mutual friends (both accepted friend request)
- Parental consent gate before enabling voice features
- Call duration limits (e.g., 10 minutes max, then must re-initiate)
- "Report" button during call
- Calls logged (metadata only: who, when, duration — NOT audio content)

### Tier 4: Collaborative Lesson Viewing (Very Hard)

**Watch a friend's lesson:**
- While visiting a friend's garden and on a voice call, if they enter a lesson, you get a prompt: "Alex started a lesson! Want to watch?"
- You see their lesson in real-time: the current question, their progress bar, their sundrop count
- You can speak to them (via the voice call) to help them understand
- You CANNOT interact with the lesson UI (no answering for them)

**Technical requirements:**
- Lesson state sync via WebSocket/Pocketbase real-time
- The student's lesson state (current step, score, activity data) is broadcast
- The spectator renders a read-only version of the lesson UI
- Voice chat continues throughout

**State sync design:**
```typescript
interface LessonBroadcast {
  lessonId: string;
  currentStepIndex: number;
  stepData: {
    type: string;
    question: string;
    options?: string[];
    // Minimal data to render the question
  };
  sunDropsEarned: number;
  sunDropsMax: number;
  isComplete: boolean;
}

// Student broadcasts every state change:
pb.collection('lesson_broadcasts').create({
  user_id: myId,
  server_id: serverId,
  lesson_state: JSON.stringify(state),
  timestamp: new Date(),
});

// Spectator subscribes:
pb.collection('lesson_broadcasts').subscribe('*', (data) => {
  if (data.record.user_id === friendId) {
    renderSpectatorView(JSON.parse(data.record.lesson_state));
  }
});
```

---

## Task Breakdown

### Phase 4.1: Presence & World Map (Live)
| # | Task | Est. |
|---|------|------|
| 4.1.1 | Server creation and invite code system | 4h |
| 4.1.2 | Server membership management | 3h |
| 4.1.3 | Live world map replacing prototype | 6h |
| 4.1.4 | Friend presence (online/offline/in lesson) | 4h |
| 4.1.5 | Friend status indicators in garden | 3h |

### Phase 4.2: Garden Visiting
| # | Task | Est. |
|---|------|------|
| 4.2.1 | Fetch and render friend's garden | 8h |
| 4.2.2 | Visitor avatar in friend's garden | 4h |
| 4.2.3 | Real-time avatar position sync | 6h |
| 4.2.4 | "Return home" flow | 2h |

### Phase 4.3: Voice Chat
| # | Task | Est. |
|---|------|------|
| 4.3.1 | WebRTC signalling via Pocketbase | 6h |
| 4.3.2 | STUN/TURN configuration | 4h |
| 4.3.3 | Audio stream management | 6h |
| 4.3.4 | Call UI (initiate, in-call, end) | 4h |
| 4.3.5 | Parental consent gate | 4h |
| 4.3.6 | Safety measures (limits, reporting, logging) | 6h |

### Phase 4.4: Collaborative Lessons
| # | Task | Est. |
|---|------|------|
| 4.4.1 | Lesson state broadcast system | 6h |
| 4.4.2 | Spectator lesson view (read-only) | 8h |
| 4.4.3 | Voice during lesson spectating | 3h |
| 4.4.4 | Notification when friend starts lesson | 3h |

### Phase 4.0: Pre-work (Child Safety)
| # | Task | Est. |
|---|------|------|
| 4.0.1 | Legal review: COPPA/GDPR for voice features | External |
| 4.0.2 | Parental consent system design | 4h |
| 4.0.3 | Moderation policy document | 4h |
| 4.0.4 | Reporting and abuse handling system | 6h |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  Client A                        │
│                                                  │
│  Garden ←→ World Map ←→ Friend's Garden         │
│              │                │                  │
│              │                ├─→ Spectator View │
│              │                │                  │
│              ▼                ▼                  │
│  ┌─────────────────────────────────────────┐    │
│  │         WebRTC Audio Stream              │    │
│  │         (P2P, encrypted)                 │    │
│  └──────────────┬──────────────────────────┘    │
└─────────────────┼───────────────────────────────┘
                  │ Signalling (SDP/ICE)
                  ▼
┌─────────────────────────────────────────────────┐
│              Pocketbase Server                   │
│                                                  │
│  Collections:                                    │
│  - servers (world definitions)                   │
│  - server_members (who's in each world)         │
│  - presence (online status, current activity)    │
│  - signalling (WebRTC offer/answer exchange)     │
│  - lesson_broadcasts (live lesson state)         │
│  - reports (abuse reports)                       │
│                                                  │
│  Real-time: SSE subscriptions for live updates   │
└─────────────────────────────────────────────────┘
                  │ Signalling (SDP/ICE)
                  ▼
┌─────────────────────────────────────────────────┐
│                  Client B                        │
│  (Same architecture as Client A)                 │
└─────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Server hosting:** Self-hosted Pocketbase can handle real-time for small servers (10-20 users). At scale, would need to evaluate performance.

2. **Cross-server interaction:** Can users be in multiple servers? Can they visit gardens on different servers? Initially: one server per user to keep it simple.

3. **Voice chat moderation:** How do we ensure safety without recording audio? AI moderation of live audio is possible but immature. Safest approach: restrict voice to mutually-approved friends with parental consent for both parties.

4. **Lesson interference:** When spectating, should the spectator be able to send hints? (e.g., highlight the correct answer). This is powerful pedagogically but could enable "cheating." Consider: allow voice hints only, no UI interaction.

5. **Bandwidth:** WebRTC audio is ~30-50 kbps per direction. Garden position sync is minimal. Lesson state sync is small JSON updates. Total: very manageable even on mobile data.

6. **NAT traversal:** P2P WebRTC fails for ~15% of connections without a TURN relay. Budget for a TURN server (or use a free tier service) from launch.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Child safety incident | Critical | Legal review, parental consent, moderation, reporting |
| WebRTC complexity | High | Start with text presence, add voice later |
| TURN server costs | Medium | Free tier for early users, budget for growth |
| Real-time sync performance | Medium | Test with 10+ concurrent users early |
| Scope creep | High | Strict phase boundaries, ship Tier 1 before starting Tier 2 |

---

## Decision: Build Order

**Recommended approach:**

1. **Phase 4.0:** Child safety review (non-negotiable prerequisite)
2. **Phase 4.1:** Presence & world map (provides value with no voice, moderate complexity)
3. **Phase 4.2:** Garden visiting (high engagement, still no voice needed)
4. **Phase 4.3:** Voice chat (only after 4.0 safety review is complete)
5. **Phase 4.4:** Collaborative lessons (only after voice is proven stable)

Each phase can ship independently and provides incremental value. Don't start Phase 4.3 until the legal/safety review from 4.0 is complete.
