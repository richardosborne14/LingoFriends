# Sound Assets

This directory contains audio files for the LingoFriends app.

## Current Status

| Filename | Status | Notes |
|----------|--------|-------|
| `reward.mp3` | ⚠️ Needs replacement | Correct answer chime |
| `celebrate.mp3` | ⚠️ Needs replacement | Lesson completion fanfare |
| `penalty.mp3` | ✅ OK (7.8KB) | Wrong answer bonk |
| `footstep.mp3` | ⚠️ Needs replacement | Grass footstep |
| `skip.mp3` | ⚠️ Needs replacement | Skip whoosh |
| `tap.mp3` | ⚠️ Needs replacement | UI button tap |
| `levelup.mp3` | ⚠️ Needs replacement | Level up chime |
| `npc-greet.mp3` | ⚠️ Needs replacement | NPC greeting chirp |

**Note:** Most downloaded files were redirects (162 bytes). Penalty.mp3 is the only valid file from Freesound.

## Manual Download Sources

### Option 1: Freesound.org (CC0/CC-BY)
Create a free account at https://freesound.org and download these sounds:

| Sound | Search Terms | Recommended |
|-------|--------------|------------|
| reward.mp3 | "correct chime" "success" "game win" | 320656 (ping) |
| celebrate.mp3 | "fanfare" "win" "jingle" | 472460 (ta-da) |
| penalty.mp3 | "wrong" "error" "bonk" | 331912 (boing) ✅ |
| footstep.mp3 | "footstep grass" "walk" | 221683 (grass step) |
| skip.mp3 | "whoosh" "swoosh" | 249573 (woosh) |
| tap.mp3 | "click" "tap" "pop" | 320653 (pop) |
| levelup.mp3 | "level up" "chime" | 472461 (ascending) |
| npc-greet.mp3 | "chirp" "greeting" "hello" | 320655 (ding) |

### Option 2: Mixkit.co (Free for commercial)
Visit https://mixkit.co/free-sound-effects/game/
- No account required
- Royalty-free for commercial use
- Download individual sounds

| Sound | Mixkit Recommendation |
|-------|----------------------|
| reward.mp3 | "Game success alert" |
| celebrate.mp3 | "Game level complete" |
| penalty.mp3 | "Game failure alert" |
| tap.mp3 | "Game click" |

### Option 3: Generate programmatically
The `soundManager.ts` can fall back to Web Audio API generated tones:

```typescript
// The soundManager already has fallback handling for missing files
// It will silently skip playback if audio file fails to load
// For production, add real audio files
```

## Sound Guidelines for Kids App

1. **Volume**: Keep peaks under -6dB to avoid startling children
2. **Tone**: Major key, bright timbre for positive feedback
3. **Duration**: Keep under 2 seconds for most UX sounds
4. **Penalty sounds**: Must be gentle - think "helpful nudge" not "error"
5. **Format**: MP3, 44.1kHz, 128kbps, mono is fine for UI sounds

## File Format

- **Format**: MP3 (best compatibility)
- **Sample rate**: 44.1kHz
- **Bit rate**: 128kbps is sufficient
- **Mono**: Good for UI sounds (smaller file size)

## Adding New Sounds

1. Add the file to this directory
2. Update `SoundId` type in `src/services/soundManager.ts`
3. Add configuration to `SOUND_MANIFEST`
4. Add playback function in `src/hooks/useSounds.ts`