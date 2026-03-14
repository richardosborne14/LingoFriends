# TASK-V2-07: Avatar System Fixes & NPC Lesson Encounters

**Status:** Not Started  
**Priority:** High — avatars are personal identity, NPCs make lessons feel alive  
**Estimated Time:** 12–16 hours  
**Dependencies:** TASK-V2-01 (onboarding captures gender preference), TASK-V2-02 (lesson flow)  
**Covers items:** #10 (hats on head, gender selection, androgynous option), #16 (NPC conversation partner in lessons)

---

## Part A: Avatar System Fixes

### Problem

1. Hats don't render on the avatar's head — they're either mispositioned or not attached
2. You can't choose boy or girl during onboarding/customization
3. There's no "prefer not to say" option for gender, which should create an androgynous character

### Goals

1. Fix hat positioning so all hat types sit correctly on the avatar's head
2. Add gender selection to onboarding: Boy, Girl, Prefer Not to Say
3. "Prefer not to say" generates an androgynous character (medium proportions, neutral colors, no gendered features)
4. Gender selection affects avatar base shape, default colors, and available customization options

### Hat Positioning Fix

**Root cause (likely):** The hat mesh isn't attached to the head bone/group, or the Y-offset is wrong.

In the Three.js avatar builder, hats need to:
1. Be children of the head group (not the root group)
2. Have correct Y-offset based on head height
3. Scale proportionally to head size

```typescript
function attachHat(avatarGroup: THREE.Group, hatMesh: THREE.Mesh, headHeight: number) {
  const headGroup = avatarGroup.getObjectByName('head');
  if (!headGroup) return;
  
  // Position hat on top of head
  hatMesh.position.set(0, headHeight * 0.5, 0); // Adjust based on hat type
  hatMesh.name = 'hat';
  
  headGroup.add(hatMesh);
}
```

**Test each hat type:** cowboy, crown, cap, beanie, flower crown, wizard, etc. Each may need a slightly different Y/Z offset and scale.

### Gender Selection

**Add to onboarding (after or within avatar customization):**

```
┌─────────────────────────────────────────┐
│                                         │
│    Choose your character:               │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │         │ │         │ │         │  │
│  │   👦    │ │   👧    │ │   🧑    │  │
│  │         │ │         │ │         │  │
│  │  Boy    │ │  Girl   │ │ Either  │  │
│  │         │ │         │ │ is fine │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

Keep the language kid-friendly. "Either is fine" or "Surprise me!" for the third option. Don't make it feel like a heavy identity question.

### Avatar Body Types

```typescript
type AvatarGender = 'boy' | 'girl' | 'neutral';

const AVATAR_PRESETS: Record<AvatarGender, AvatarBaseConfig> = {
  boy: {
    bodyWidth: 0.38,
    bodyHeight: 0.5,
    headSize: 0.28,
    defaultHairStyle: 'short',
    defaultHairColors: [0x4A3728, 0x8B4513, 0x1C1C1C, 0xD4A574],
    defaultClothingColors: [0x4169E1, 0x2E8B57, 0xFF6347, 0x8B008B],
    eyeStyle: 'round',
  },
  girl: {
    bodyWidth: 0.35,
    bodyHeight: 0.48,
    headSize: 0.28,
    defaultHairStyle: 'long',
    defaultHairColors: [0x4A3728, 0x8B4513, 0xD4A574, 0xFF69B4, 0x6B4C9A],
    defaultClothingColors: [0xFF69B4, 0x9370DB, 0x20B2AA, 0xFFD700],
    eyeStyle: 'round',
  },
  neutral: {
    bodyWidth: 0.36,
    bodyHeight: 0.49,
    headSize: 0.28,
    defaultHairStyle: 'medium', // not short, not long
    defaultHairColors: [0x4A3728, 0x8B4513, 0xD4A574, 0x20B2AA, 0x9370DB],
    defaultClothingColors: [0x20B2AA, 0xFFD700, 0x9370DB, 0x4169E1, 0xFF69B4],
    eyeStyle: 'round',
  },
};
```

All customization options (hair color, skin tone, clothing, hats) remain available to all genders. The presets only affect defaults and proportions.

### Avatar Customization Panel

If not already built, create or enhance the customization panel:

```
┌─────────────────────────────────────────┐
│          [Avatar Preview - 3D]          │
│                                         │
│  Skin:  🟤 🟧 🟡 ⬜                   │
│  Hair:  [Short] [Medium] [Long] [Bald] │
│  Color: 🟤 ⬛ 🟡 🟣 🩷 💚             │
│  Top:   👕 colors...                    │
│  Hat:   [None] [Cap] [Crown] [Flower]  │
│                                         │
│           [Save & Continue]             │
└─────────────────────────────────────────┘
```

The 3D preview rotates slowly so the child can see their avatar from all angles.

---

## Part B: NPC Lesson Encounters

### Problem

In v1, each lesson had the user's avatar facing a randomly generated NPC character, creating an RPG-style conversation partner. This is missing in v2.

### Goals

1. Each lesson generates a random NPC with varied appearance
2. The NPC appears in the lesson as if talking to the user
3. Encounter scene renders above the activity UI
4. NPC "speaks" the target chunk via TTS with mouth animation
5. Each lesson section can have a different NPC (like meeting different people)
6. Final section has a "boss" NPC (visually distinct, slightly larger)

### NPC Generator

**Create `src/lib/services/npcGenerator.ts`:**

Generates random NPCs using the same avatar building system but with random parameters.

```typescript
interface NPCConfig {
  avatar: AvatarOptions;
  name: string;         // Random name from target language culture
  role: 'villager' | 'merchant' | 'scholar' | 'adventurer' | 'boss';
  scale: number;        // 1.0 normal, 1.3 boss
  hasGlow: boolean;
  glowColor?: number;
  entrance: 'fade' | 'slide_left' | 'slide_right' | 'drop' | 'boss_dramatic';
}

function generateNPC(seed: number, isBoss: boolean = false): NPCConfig {
  const rng = seededRandom(seed);
  
  const gender = rng.pick(['boy', 'girl', 'neutral']);
  const skinTone = rng.pick(SKIN_TONES);
  const hairColor = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(HAIR_STYLES[gender]);
  const clothingColor = rng.pick(CLOTHING_COLORS);
  const hatStyle = rng.chance(0.4) ? rng.pick(HAT_STYLES) : 'none';
  
  return {
    avatar: { gender, skinTone, hairColor, hairStyle, clothingColor, hatStyle },
    name: rng.pick(NAMES[targetLanguage]),
    role: isBoss ? 'boss' : rng.pick(['villager', 'merchant', 'scholar', 'adventurer']),
    scale: isBoss ? 1.3 : 1.0,
    hasGlow: isBoss,
    glowColor: isBoss ? 0xFFD700 : undefined,
    entrance: isBoss ? 'boss_dramatic' : rng.pick(['fade', 'slide_left', 'slide_right']),
  };
}
```

**Seeded randomness** ensures the same lesson always generates the same NPC (reproducible for replays).

### NPC Name Banks

Store culturally appropriate names for each target language:

```typescript
const NPC_NAMES = {
  de: ['Lukas', 'Emma', 'Felix', 'Mia', 'Max', 'Sophie', 'Leon', 'Lina', 'Tim', 'Hannah'],
  en: ['Oliver', 'Lily', 'Jack', 'Ruby', 'Charlie', 'Isla', 'Thomas', 'Grace'],
  fr: ['Hugo', 'Léa', 'Louis', 'Chloé', 'Gabriel', 'Emma', 'Arthur', 'Jade'],
};
```

### Encounter Scene

**Create `src/lib/components/lesson/EncounterScene.svelte`:**

A Three.js scene rendered as a banner at the top of the lesson screen. Shows the user's avatar and the NPC facing each other at a diagonal angle.

```
┌──────────────────────────────────────────┐
│                                          │
│   👤 User Avatar  ←──→  👤 NPC          │
│   (from profile)       (random, named)   │
│                                          │
│   Background: soft gradient              │
│   Both: idle animations (blink, breathe) │
│   NPC: mouth moves during TTS           │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│   💬 "Wie geht es dir?"  — Felix        │
│                                          │
│   Activity UI below...                   │
│                                          │
└──────────────────────────────────────────┘
```

**Scene setup:**
- Camera: FOV 35, close-up portrait angle
- User avatar: left side, facing right (toward NPC)
- NPC: right side, facing left (toward user)
- Background: soft radial gradient (not a full garden, just abstract)
- Lighting: warm, flattering

### Idle Animations

Both avatars should feel alive:

```typescript
// Blinking: random interval 2-5 seconds, eyes close for 150ms
// Breathing: subtle body bob at ~1.5 cycles/sec, 0.01 amplitude
// Head sway: gentle, 0.4 cycles/sec, 0.03 amplitude

function updateIdleAnimations(avatar: THREE.Group, deltaTime: number) {
  // Breathing
  const breathOffset = Math.sin(time * BREATH_SPEED * Math.PI * 2) * BREATH_AMPLITUDE;
  avatar.position.y = baseY + breathOffset;
  
  // Head sway
  const head = avatar.getObjectByName('head');
  if (head) {
    head.position.x = Math.sin(time * SWAY_SPEED * Math.PI * 2) * SWAY_AMPLITUDE;
    head.rotation.z = Math.sin(time * SWAY_SPEED * Math.PI * 2) * SWAY_TILT;
  }
  
  // Blinking
  if (shouldBlink(time)) {
    setEyeScale(avatar, 0.1); // Close eyes
    setTimeout(() => setEyeScale(avatar, 1.0), BLINK_DURATION);
  }
}
```

### NPC Mouth Animation

When TTS audio plays, the NPC's mouth should open and close:

```typescript
// Simple amplitude-driven mouth animation
// Connect to TTS audio analyser
function updateMouthAnimation(npc: THREE.Group, audioAnalyser: AnalyserNode) {
  const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
  audioAnalyser.getByteFrequencyData(dataArray);
  
  // Average amplitude
  const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const mouthOpen = avg / 255; // 0 to 1
  
  const mouth = npc.getObjectByName('mouth');
  if (mouth) {
    // Lerp for smoothness
    mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, 1 + mouthOpen * 1.5, 0.15);
  }
}
```

### Boss NPC (Final Section)

The last section of every lesson gets a "boss" NPC:
- 30% larger
- Gold tint or glow effect
- Crown hat
- Dramatic entrance animation (drops from above with screen shake)
- Slightly harder activities in this section
- Extra sundrop bonus for completing the boss section

### NPC Dialogue Attribution

In the chunk introduction (from TASK-V2-02), attribute the speech to the NPC:

```
💬 Felix says:
"Wie geht es dir?"

This means "How are you?" — Germans say this 
when greeting someone they know!
```

---

## Testing Checklist

### Avatar Fixes
- [ ] All hat types render correctly on avatar's head
- [ ] Hats move with head during animations
- [ ] Boy/Girl/Neutral selection works in onboarding
- [ ] Neutral creates androgynous character
- [ ] Avatar customization panel shows live 3D preview
- [ ] All skin tones, hair styles, clothing options work across all genders
- [ ] Avatar saves to profile correctly

### NPC Encounters
- [ ] Each lesson section generates a visually different NPC
- [ ] Same lesson produces same NPCs (seeded random)
- [ ] Encounter scene renders at top of lesson
- [ ] Both avatars have idle animations (blink, breathe, sway)
- [ ] NPC mouth moves during TTS playback
- [ ] NPC name appears in chunk introduction
- [ ] Final section has visually distinct boss NPC
- [ ] Boss entrance animation plays
- [ ] Scene performs well on mobile (target: 30fps minimum)
- [ ] Scene canvas doesn't interfere with activity UI touch events

---

## Files Created/Modified

**New files:**
- `src/lib/services/npcGenerator.ts`
- `src/lib/components/lesson/EncounterScene.svelte`
- `src/lib/components/onboarding/StepGender.svelte` (or integrate into avatar customization)

**Modified files:**
- Avatar builder → fix hat attachment, add gender-based presets
- Avatar customization component → add gender selection, live preview
- Onboarding flow → add gender step (can be same step as avatar customization)
- Lesson renderer → mount encounter scene above activities
- Chunk introduction → show NPC name attribution
- User profile schema → add gender field
