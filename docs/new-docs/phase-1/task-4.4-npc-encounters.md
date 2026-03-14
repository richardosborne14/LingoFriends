# Task 4.4: NPC Encounters in Lessons

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 7/10
**Estimated Time:** 3h
**Dependencies:** Task 4.2 complete

---

## Mandatory Reads

1. V1 reference: `task-3-npc-avatar-encounters.md` — NPC generator, encounter scene architecture
2. `01-DESIGN-SYSTEM.md` — coaching chat step layout

---

## Objective

During coaching chat steps, an NPC avatar appears in a small Three.js viewport (120×120px). Each step gets a random NPC. Final step = "boss" NPC (larger, distinct).

---

## Implementation

`src/lib/three/avatars/NPCScene.ts`:
- Small self-contained Three.js scene for lesson UI
- Random NPC from geometry avatar system with randomised colours
- Idle: breathing bob, occasional blink/head tilt
- Speaking: simple sine wave jaw animation synced to audio duration
- Boss: slightly larger, crown (cone on head), gold tint

`src/lib/services/npcGenerator.ts`:
- `generateNPC(stepIndex, totalSteps, lessonSeed)` — deterministic random from seed
- Last step = boss variant

---

## 🤔 Decision Point for User

> **NPC style:** (A) Geometry NPCs like avatar (consistent, no loading), (B) Quaternius glTF models (better looking, needs model hosting), (C) Simple 2D illustrated avatars (fastest). Recommend A for MVP — upgrade to B as Polish task.

---

## Tests

```typescript
describe('NPCScene', () => {
  it('initialises with random NPC', () => {});
  it('speaking animation activates/deactivates', () => {});
  it('boss NPC is visually distinct (larger)', () => {});
  it('disposes cleanly', () => {});
});
```

---

## Acceptance Criteria

- [ ] NPC renders in small canvas
- [ ] Idle animation plays
- [ ] Mouth moves during TTS
- [ ] Different NPC per step (seeded random)
- [ ] Boss on final step
- [ ] Tests: 4/4 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
