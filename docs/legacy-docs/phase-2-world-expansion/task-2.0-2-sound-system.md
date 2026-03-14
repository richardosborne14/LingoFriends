# Task 2.0.2: Sound System

**Status:** ✅ COMPLETE (Implementation)  
**Phase:** 2.0 — Wave 1  
**Dependencies:** None  
**Estimated Time:** 4–6 hours  
**Priority:** High — audio feedback is essential for kid engagement

---

## Implementation Progress

### Completed ✅
- [x] `src/services/soundManager.ts` — Sound manager service with Web Audio API
- [x] `src/hooks/useSounds.ts` — React convenience hook
- [x] `src/components/lesson/LessonView.tsx` — Wired reward/penalty/skip sounds
- [x] `src/components/lesson/LessonComplete.tsx` — Wired celebration on mount
- [x] `src/components/garden/GardenWorld3D.tsx` — Wired tap + footsteps
- [x] `src/renderer/GardenRenderer.ts` — Added onWalkStart/onWalkEnd callbacks
- [x] `src/renderer/types.ts` — Added walk callback types
- [x] Basic sound files in `public/sounds/`

### Deferred (Non-Blocking)
- [ ] Source premium replacement MP3 sound files (current sounds are functional)
- [ ] Test on iOS Safari for AudioContext unlock requirement

---

## Problem Statement

The app has no sound effects at all. Key moments that should feel rewarding or atmospheric are silent:

1. **Sundrop reward modal** — Needs a satisfying "ba-ding" chime (like Duolingo's correct-answer sound)
2. **Lesson completion screen** — Needs a celebratory fanfare when you see your gems and sundrops
3. **Avatar movement in garden** — Needs footstep sounds during walking
4. **Penalty/wrong answer** — Needs a gentle "bonk" or "buzz" (not punishing, just feedback)

---

## Objectives

1. Create a centralised `SoundManager` service that preloads all audio assets
2. Expose a simple `SoundManager.play('reward')` API usable from any component
3. Add sounds for: reward, celebration, footsteps, penalty, button tap, skip
4. Support global mute toggle (persisted to localStorage)
5. Keep the system lightweight — no heavy audio libraries

---

## Architecture

```
┌─────────────────────────────────────┐
│          SoundManager               │
│                                     │
│  preload() — loads all assets       │
│  play(id) — plays a sound           │
│  playLoop(id) — loops (footsteps)   │
│  stop(id) — stops a looping sound   │
│  setMuted(bool) — global mute       │
│  setVolume(0-1) — global volume     │
│                                     │
│  Internal: Map<string, AudioBuffer> │
│  Uses: Web Audio API (AudioContext)  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        Sound Asset Manifest         │
│                                     │
│  reward    — "ba-ding" chime        │
│  celebrate — fanfare / fireworks    │
│  penalty   — soft "bonk"           │
│  footstep  — grass footstep        │
│  skip      — whoosh                │
│  tap       — soft click            │
│  levelup   — ascending chime       │
│  npcGreet  — friendly chirp        │
└─────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Source Audio Assets

Obtain royalty-free sound effects. Recommended sources:
- **freesound.org** (CC0 or CC-BY)
- **kenney.nl/assets** (CC0 — already used for sprites)
- **pixabay.com/sound-effects** (Pixabay License — free commercial use)
- **mixkit.co/free-sound-effects** (free commercial use)

Required sounds (keep files small — <50KB each, MP3 or OGG):

| Sound ID | Description | Duration | Source suggestion |
|----------|-------------|----------|-------------------|
| `reward` | Bright "ba-ding" chime, ascending two notes | ~0.5s | Search "correct answer chime" or "coin collect" |
| `celebrate` | Short celebratory fanfare with sparkle | ~1.5s | Search "level complete fanfare" or "victory jingle" |
| `penalty` | Soft low "bonk" or buzzer — not harsh | ~0.3s | Search "wrong answer buzz" or "soft error" |
| `footstep` | Single grass/dirt footstep | ~0.2s | Search "grass footstep" — will be looped |
| `skip` | Quick whoosh/swipe | ~0.3s | Search "swipe whoosh" |
| `tap` | Soft UI click/pop | ~0.1s | Search "button click pop" |
| `levelup` | Ascending sparkle chime | ~1.0s | Search "level up chime RPG" |
| `npcGreet` | Friendly chirp or "hey!" | ~0.3s | Search "notification chirp friendly" |

Place audio files in: `public/sounds/`

### Step 2 — Create SoundManager Service

**File:** `src/services/soundManager.ts` (NEW)

```typescript
// src/services/soundManager.ts

type SoundId = 'reward' | 'celebrate' | 'penalty' | 'footstep' |
               'skip' | 'tap' | 'levelup' | 'npcGreet';

interface SoundConfig {
  src: string;
  volume?: number;   // 0-1, default 1
  loop?: boolean;     // for footsteps
}

const SOUND_MANIFEST: Record<SoundId, SoundConfig> = {
  reward:    { src: '/sounds/reward.mp3', volume: 0.8 },
  celebrate: { src: '/sounds/celebrate.mp3', volume: 0.7 },
  penalty:   { src: '/sounds/penalty.mp3', volume: 0.5 },
  footstep:  { src: '/sounds/footstep.mp3', volume: 0.3, loop: true },
  skip:      { src: '/sounds/skip.mp3', volume: 0.5 },
  tap:       { src: '/sounds/tap.mp3', volume: 0.4 },
  levelup:   { src: '/sounds/levelup.mp3', volume: 0.8 },
  npcGreet:  { src: '/sounds/npc-greet.mp3', volume: 0.6 },
};

class SoundManagerClass {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNode: GainNode | null = null;
  private muted: boolean = false;
  private loaded: boolean = false;

  async preload(): Promise<void> { /* ... */ }
  play(id: SoundId): void { /* ... */ }
  playLoop(id: SoundId): void { /* ... */ }
  stop(id: SoundId): void { /* ... */ }
  setMuted(muted: boolean): void { /* ... */ }
  setVolume(volume: number): void { /* ... */ }
  isMuted(): boolean { return this.muted; }
}

export const SoundManager = new SoundManagerClass();
```

Key implementation notes:
- Use Web Audio API (`AudioContext`) for precise timing and low latency
- `AudioContext` must be created after a user gesture (browser policy) — init on first tap
- Store muted state in `localStorage` so preference persists
- `preload()` fetches all files in parallel via `fetch()` + `decodeAudioData()`
- `playLoop()` creates a source with `loop = true` and stores it for `stop()` later

### Step 3 — Create useSounds Hook

**File:** `src/hooks/useSounds.ts` (NEW)

A convenience hook for React components:

```typescript
import { useCallback, useEffect } from 'react';
import { SoundManager } from '../services/soundManager';

export function useSounds() {
  // Ensure preload on first use
  useEffect(() => {
    SoundManager.preload();
  }, []);

  return {
    playReward: useCallback(() => SoundManager.play('reward'), []),
    playCelebrate: useCallback(() => SoundManager.play('celebrate'), []),
    playPenalty: useCallback(() => SoundManager.play('penalty'), []),
    playSkip: useCallback(() => SoundManager.play('skip'), []),
    playTap: useCallback(() => SoundManager.play('tap'), []),
    startFootsteps: useCallback(() => SoundManager.playLoop('footstep'), []),
    stopFootsteps: useCallback(() => SoundManager.stop('footstep'), []),
    toggleMute: useCallback(() => {
      SoundManager.setMuted(!SoundManager.isMuted());
    }, []),
  };
}
```

### Step 4 — Wire Sounds to Lesson Components

**File:** `src/components/lesson/LessonView.tsx`

```typescript
// In handleActivityComplete:
if (sunDropsEarned > 0) {
  SoundManager.play('reward');  // ba-ding!
}

// In handleWrongAnswer:
SoundManager.play('penalty');  // soft bonk

// In handleSkip:
SoundManager.play('skip');  // whoosh
```

**File:** `src/components/lesson/LessonComplete.tsx`

```typescript
// On mount:
useEffect(() => {
  SoundManager.play('celebrate');  // fanfare!
}, []);
```

**File:** `src/components/lesson/SunDropBurst.tsx`

Remove any need for sound here — the `LessonView` handles it at the callback level.

### Step 5 — Wire Footsteps to Garden Avatar

**File:** `src/renderer/GardenRenderer.ts` or `src/components/garden/GardenWorld3D.tsx`

In the animation loop, when the avatar starts walking:
```typescript
// When avatar begins moving to target
SoundManager.playLoop('footstep');

// When avatar reaches target or stops
SoundManager.stop('footstep');
```

The footstep loop should be timed to match the walk animation bob cycle. If the single footstep sound is ~0.2s, the loop will naturally create a rhythm. Alternatively, use `setInterval` to play individual footstep sounds every ~350ms during movement for more natural variation.

### Step 6 — Mute Toggle in Settings

Add a simple sound toggle to the app settings / header:

```typescript
// Small speaker icon in the top bar or settings
<button onClick={() => SoundManager.setMuted(!SoundManager.isMuted())}>
  {SoundManager.isMuted() ? '🔇' : '🔊'}
</button>
```

---

## Testing Checklist

- [ ] Reward "ba-ding" plays on correct answer
- [ ] Celebration fanfare plays on lesson completion screen
- [ ] Penalty "bonk" plays on wrong answer
- [ ] Footstep sounds play during avatar garden movement
- [ ] Footstep sounds stop when avatar stops
- [ ] Skip whoosh plays when skipping a question
- [ ] Mute toggle silences all sounds
- [ ] Mute preference persists across page reloads
- [ ] Sounds work on iOS Safari (AudioContext unlock requirement)
- [ ] Sounds work on Android Chrome
- [ ] No audio errors in console when sounds fail to load
- [ ] Total sound asset size < 400KB

---

## Files to Create

| File | Description |
|------|-------------|
| `src/services/soundManager.ts` | Core sound management service |
| `src/hooks/useSounds.ts` | React convenience hook |
| `public/sounds/*.mp3` | Audio asset files (8 files) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lesson/LessonView.tsx` | Play reward/penalty/skip sounds |
| `src/components/lesson/LessonComplete.tsx` | Play celebration on mount |
| `src/renderer/GardenRenderer.ts` | Play/stop footstep loop during movement |
| `src/components/garden/GardenWorld3D.tsx` | Alternative location for footstep wiring |

---

## Notes for Implementation

- **iOS Safari requires a user gesture** to create/resume `AudioContext`. The first tap anywhere in the app should call `audioContext.resume()`. Consider wiring this to the app's first interaction.
- **Footstep variation:** For more natural footsteps, load 2-3 slightly different footstep samples and randomly pick one each step. This prevents the "robot march" effect.
- **Volume balancing:** TTS audio from lessons will play through HTML5 Audio. Sound effects play through Web Audio API. Make sure they don't compete — lower SFX volume slightly when TTS is playing.
- **Future:** This system can later support ambient garden sounds (birds, wind, water) for atmosphere.
