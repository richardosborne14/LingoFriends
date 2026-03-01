# Task 2.0.10: NPC Garden Visitors

**Status:** ✅ Complete  
**Phase:** 2.0 — Wave 3  
**Dependencies:** 2.0.4 (Avatar Overhaul), 2.0.8 (Garden World Overhaul)  
**Estimated Time:** 8–10 hours  
**Priority:** Medium — excellent engagement feature, makes garden feel alive  
**Last Updated:** 2026-01-03

---

## Problem Statement

The garden is a static environment. Nothing happens unless the user initiates it. To make the garden feel like a living world, we need world events — things that happen around you to create spontaneous engagement.

---

## Concept

Random NPC visitors periodically appear in the garden world. They walk in from the fog beyond the fence, enter through the gate, wander to a spot, and wait. If you walk up to them and click, they say a phrase from a lesson you've completed, and you get a quickfire translation quiz in a modal. Get it right → earn 1 gem. Get it wrong → they wave and leave.

**Rules:**
- One NPC at a time (keep it manageable)
- NPCs appear every 2-5 minutes while in the garden
- They stay for 60-90 seconds before leaving on their own
- NPCs use randomised avatar appearances (reuse NPC generator from encounters)
- The phrase they speak is pulled from the user's completed/mastered chunks
- After the encounter (right or wrong), the NPC waves goodbye and walks back into the fog

---

## Architecture

```
┌──────────────────────────────────────────────┐
│           NPC Visitor System                  │
│                                               │
│  Spawn Timer (2-5 min)                        │
│       ↓                                       │
│  Generate NPC (random avatar + personality)   │
│       ↓                                       │
│  Walk in from fog → through gate → to spot    │
│       ↓                                       │
│  Idle (wait for player click, 60-90 sec)      │
│       ↓ (clicked)           ↓ (timeout)       │
│  Quiz Modal                 Wave + walk out   │
│   ├── Correct → +1 gem                        │
│   └── Wrong → "Nice try!"                     │
│       ↓                                       │
│  Wave goodbye → walk to gate → into fog       │
│       ↓                                       │
│  Remove from scene, reset spawn timer         │
└──────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — NPC Visitor Manager

**File:** `src/services/npcVisitorManager.ts` (NEW)

```typescript
interface NPCVisitor {
  id: string;
  avatarOptions: AvatarOptions;
  name: string;                    // Random friendly name
  mesh: THREE.Group | null;
  state: 'walking_in' | 'idle' | 'interacting' | 'walking_out' | 'gone';
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  spawnTime: number;               // timestamp
  maxIdleTime: number;             // 60-90 seconds
  phrase: QuizPhrase | null;       // The chunk they'll quiz you on
}

interface QuizPhrase {
  targetText: string;     // e.g., "Guten Tag"
  nativeText: string;     // e.g., "Bonjour"
  chunkId: string;        // Reference to chunk_library
  distractors: string[];  // 3 wrong answers in native language
}

class NPCVisitorManager {
  private currentVisitor: NPCVisitor | null = null;
  private spawnTimer: number = 0;
  private nextSpawnDelay: number = 120; // 2-5 minutes

  /**
   * Called every frame from the garden animation loop.
   */
  update(dt: number): void {
    if (!this.currentVisitor) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawnDelay) {
        this.spawnVisitor();
      }
      return;
    }
    
    // Update current visitor based on state
    switch (this.currentVisitor.state) {
      case 'walking_in':
        this.updateWalking(this.currentVisitor, dt);
        break;
      case 'idle':
        this.updateIdle(this.currentVisitor, dt);
        break;
      case 'walking_out':
        this.updateWalking(this.currentVisitor, dt);
        break;
    }
  }

  /**
   * Spawn a new visitor from outside the garden.
   */
  async spawnVisitor(): Promise<void> {
    // 1. Pick a random phrase from user's learned chunks
    const phrase = await this.pickRandomPhrase();
    if (!phrase) return; // User hasn't learned anything yet
    
    // 2. Generate random NPC appearance
    const avatarOpts = generateRandomNPC();
    
    // 3. Create the visitor
    this.currentVisitor = {
      id: crypto.randomUUID(),
      avatarOptions: avatarOpts,
      name: pickRandomName(),
      mesh: null,
      state: 'walking_in',
      position: getSpawnPoint(), // Outside the gate
      targetPosition: getRandomGardenSpot(),
      spawnTime: Date.now(),
      maxIdleTime: 60 + Math.random() * 30,
      phrase,
    };
    
    this.spawnTimer = 0;
    this.nextSpawnDelay = 120 + Math.random() * 180; // 2-5 min until next
  }

  /**
   * Called when player clicks the NPC.
   * Returns the quiz data for the modal.
   */
  interact(): QuizPhrase | null {
    if (!this.currentVisitor || this.currentVisitor.state !== 'idle') return null;
    this.currentVisitor.state = 'interacting';
    return this.currentVisitor.phrase;
  }

  /**
   * Called when quiz is complete (correct or wrong).
   */
  completeInteraction(correct: boolean): void {
    if (!this.currentVisitor) return;
    // Start walking out
    this.currentVisitor.state = 'walking_out';
    this.currentVisitor.targetPosition = getSpawnPoint(); // Back to fog
  }
}
```

### Step 2 — Pick Random Phrase from Learned Chunks

**File:** `src/services/npcVisitorManager.ts`

Query the user's mastered chunks from Pocketbase:

```typescript
async pickRandomPhrase(): Promise<QuizPhrase | null> {
  // Get chunks the user has encountered with status 'learned' or better
  const userChunks = await pb.collection('user_chunks').getList(1, 50, {
    filter: `user_id = "${userId}" && status != "new"`,
    sort: '-last_reviewed',
  });
  
  if (userChunks.items.length === 0) return null;
  
  // Pick a random one
  const chunk = userChunks.items[Math.floor(Math.random() * userChunks.items.length)];
  
  // Get the chunk details
  const chunkData = await pb.collection('chunk_library').getOne(chunk.chunk_id);
  
  // Generate 3 distractors (wrong answers)
  const distractors = await generateDistractors(chunkData, userChunks.items);
  
  return {
    targetText: chunkData.text,
    nativeText: chunkData.translation,
    chunkId: chunkData.id,
    distractors,
  };
}
```

### Step 3 — NPC Quiz Modal

**File:** `src/components/garden/NPCQuizModal.tsx` (NEW)

A compact modal that appears when clicking an NPC visitor:

```typescript
interface NPCQuizModalProps {
  visible: boolean;
  npcName: string;
  npcAvatar: AvatarOptions;
  phrase: QuizPhrase;
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
}
```

Layout:
```
┌───────────────────────────────────┐
│                                   │
│    👤 NPC name says:              │
│    "Guten Tag!"                   │
│                                   │
│    What does this mean?           │
│                                   │
│    ┌──────────┐ ┌──────────┐     │
│    │ Bonjour  │ │ Au revoir │     │
│    └──────────┘ └──────────┘     │
│    ┌──────────┐ ┌──────────┐     │
│    │  Merci   │ │ S'il vous│     │
│    │          │ │   plaît  │     │
│    └──────────┘ └──────────┘     │
│                                   │
│         ✨ +1 Gem!               │
│                                   │
└───────────────────────────────────┘
```

Behaviour:
- NPC phrase displayed prominently (in target language)
- 4 multiple-choice answers in native language
- Correct: gem awarded, NPC celebration animation, "+1 💎" display
- Wrong: "Nice try!" message, correct answer highlighted, no penalty
- Auto-close after 2 seconds, NPC begins walking out

### Step 4 — NPC Rendering in Garden

**File:** `src/renderer/GardenRenderer.ts`

The NPC visitor mesh is built using the same `buildCharacter()` from the avatar system. Add a floating name tag above the NPC and a "!" indicator to show they're interactable:

```typescript
// Name tag (using HTML overlay positioned via CSS3DRenderer or a canvas texture)
// Simpler approach: a small "!" bubble using Three.js geometry
const interactBubble = buildInteractionBubble(); // "!" in a circle
interactBubble.position.y = 1.5; // Above NPC head
npcGroup.add(interactBubble);

// Animate the bubble bobbing
interactBubble.position.y = 1.5 + Math.sin(time * 3) * 0.05;
```

### Step 5 — Integrate with Garden Loop

**File:** `src/components/garden/GardenWorld3D.tsx`

```typescript
// In the garden component:
const visitorManager = useRef(new NPCVisitorManager());

// Update in animation loop (passed to renderer)
visitorManager.current.update(dt);

// Handle NPC click (from renderer raycaster)
const handleNPCClick = (npcId: string) => {
  const phrase = visitorManager.current.interact();
  if (phrase) {
    setQuizModalData({ visible: true, phrase, npc: visitor });
  }
};

// Handle quiz answer
const handleQuizAnswer = (correct: boolean) => {
  if (correct) {
    addGems(1);
    SoundManager.play('reward');
  }
  visitorManager.current.completeInteraction(correct);
  setQuizModalData({ visible: false });
};
```

---

## Testing Checklist

- [ ] NPC spawns after 2-5 minutes in garden
- [ ] NPC walks in from fog through gate
- [ ] NPC has random appearance (varied avatars)
- [ ] NPC has "!" indicator above head
- [ ] Clicking NPC opens quiz modal
- [ ] Quiz shows a phrase the user has learned
- [ ] 4 multiple-choice answers with 1 correct
- [ ] Correct answer awards 1 gem
- [ ] Wrong answer shows correct answer, no penalty
- [ ] NPC walks out after interaction
- [ ] NPC walks out after timeout (60-90 seconds)
- [ ] Only one NPC at a time
- [ ] No NPC spawns if user has no learned chunks
- [ ] NPC doesn't block tree interactions
- [ ] Sound effects play (npcGreet on spawn, reward on correct)

---

## Files to Create

| File | Description |
|------|-------------|
| `src/services/npcVisitorManager.ts` | Visitor lifecycle management |
| `src/components/garden/NPCQuizModal.tsx` | Quiz modal component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/GardenRenderer.ts` | NPC mesh management, raycasting |
| `src/components/garden/GardenWorld3D.tsx` | Visitor manager integration, modal state |
