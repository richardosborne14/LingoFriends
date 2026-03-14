# Task 3.4: Audio Integration

**Status:** 🔲 Not started
**Phase:** 3 (Lesson UI)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 3.2 complete

---

## Mandatory Reads

1. `03-AI-STRATEGY.md` — TTS voice rule: ALWAYS target language, even for mixed content
2. `LEARNINGS.md` — "[V1 Legacy] TTS voice must always be target language"

---

## Objective

Integrate Google Cloud TTS for automatic audio playback on teach steps, coaching chat, and replay buttons.

---

## Implementation

1. `src/lib/services/audioService.ts` — `playAudio(base64)`, `playAudioIfAvailable(text, audioMap)`
2. `src/routes/api/tts/+server.ts` — Proxy to Google Cloud TTS. Voice ALWAYS set to target language code from `getTTSCode()`. Returns base64 audio.
3. Integration: INFO steps auto-play on mount. CoachingChat auto-plays. MC correct answer plays target phrase. All teach steps show 🔊 replay button.

---

## 🤔 Decision Point for User

> **TTS voice variety:** Google has multiple voices per language. Should I randomise from 2-3 voices for variety (different NPC "voices") or use one consistent voice? Recommend randomise for NPC variety — each lesson step sounds like a different character.

---

## Tests

```typescript
describe('Audio Service', () => {
  it('plays base64 audio without error', () => {});
  it('silent fallback when no audio available', () => {});
});
describe('TTS API', () => {
  it('returns base64 audio for valid text', async () => {});
  it('rejects unauthenticated requests', async () => {});
  it('uses target language voice code', async () => {});
});
```

---

## Acceptance Criteria

- [ ] Audio auto-plays on INFO and coaching steps
- [ ] Replay button works
- [ ] No crash when audio unavailable
- [ ] TTS voice is ALWAYS target language
- [ ] Tests: 5/5 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
