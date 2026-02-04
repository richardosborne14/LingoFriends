# Task 4: Voice Services

**Status:** ✅ Complete  
**Completed:** 2026-04-02  
**Confidence:** 8/10

## Objective

Implement reliable voice input/output for kids who can't type well, using:
- **TTS:** Google Cloud Text-to-Speech API (Neural2 voices)
- **STT:** Groq Whisper Large v3

## Implementation Summary

### 4.1 Google TTS Service (`services/ttsService.ts`)

Created a complete TTS service with:

- **Google Cloud TTS API integration** via REST endpoint
- **Multilingual voices:**
  - French: `fr-FR-Neural2-A` (female, clear, friendly)
  - English: `en-US-Neural2-F` (female, clear, friendly)
- **Audio configuration optimized for learners:**
  - Speaking rate: 0.95 (slightly slower)
  - Pitch: +0.5 (friendlier for kids)
  - Output format: MP3 (broad compatibility)
- **Playback via HTML5 Audio element** (more reliable than Web Audio API for MP3)
- **Retry logic with exponential backoff**
- **Functions exported:**
  - `generateSpeech(text, options)` - Generate audio
  - `playAudio(base64, onEnd)` - Play audio
  - `stopAudio()` - Stop playback
  - `isPlaying()` - Check playback state
  - `speak(text, language, onEnd)` - High-level convenience function

### 4.2 Groq Whisper STT Service (`services/sttService.ts`)

Created a complete STT service with:

- **AudioRecorder class** managing the full recording lifecycle
- **MediaRecorder API** for cross-browser audio capture
- **Audio configuration:**
  - Format: WebM/Opus (efficient, well-supported)
  - Bitrate: 128kbps
- **Groq Whisper endpoint** (`/audio/transcriptions`)
- **Model:** `whisper-large-v3`
- **Language support:** French (`fr`) and English (`en`)
- **Features:**
  - Real-time audio level monitoring (for visual feedback)
  - Automatic noise suppression and echo cancellation
  - Kid-friendly error messages
  - Minimum recording length validation
- **State machine:** `idle` → `requesting` → `recording` → `processing` → `idle/error`

### 4.3 VoiceButton Component (`components/VoiceButton.tsx`)

Created a kid-friendly voice input button:

- **Tap-to-toggle interaction:** Tap to start, tap again to stop
- **Clear visual states:**
  - 🎤 Idle (amber) - "Tap to speak"
  - 🔴 Recording (red, pulsing) - "Tap to stop"
  - ⏳ Processing (amber, spinner) - "Processing..."
  - ⚠️ Error (red) - "Tap to retry"
- **Audio level visualization:** Ring that pulses with voice
- **Size variants:** small, medium, large
- **Accessibility:** ARIA labels, proper focus states
- **Error handling:** Auto-dismissing error tooltips

### 4.4 Integration

**App.tsx changes:**
- Replaced Gemini TTS with Google Cloud TTS
- Simplified audio playback (removed Web Audio API for PCM, now uses HTML5 Audio for MP3)
- Kept geminiService only for translation (temporary)

**ChatInterface.tsx changes:**
- Replaced old webkitSpeechRecognition with VoiceButton component
- Removed inline Speech Recognition code
- Added `handleVoiceTranscription` callback
- Input area now uses rounded rectangle style to accommodate VoiceButton

## Files Changed

| File | Change |
|------|--------|
| `services/ttsService.ts` | **New** - Google Cloud TTS service |
| `services/sttService.ts` | **New** - Groq Whisper STT service |
| `components/VoiceButton.tsx` | **New** - Voice input component |
| `App.tsx` | Updated audio handling to use ttsService |
| `components/ChatInterface.tsx` | Replaced Speech Recognition with VoiceButton |
| `.env.example` | Updated documentation for API keys |

## API Keys Required

| Service | Env Variable | Purpose |
|---------|--------------|---------|
| Google Cloud TTS | `VITE_GOOGLE_TTS_KEY` | TTS (requires Text-to-Speech API enabled in GCP) |
| Groq | `VITE_GROQ_API_KEY` | STT (Whisper Large v3) |

**Note:** `VITE_GOOGLE_TTS_KEY` is separate from `VITE_GOOGLE_AI_KEY` (AI Studio). Google Cloud TTS requires a GCP API key with the Text-to-Speech API enabled - AI Studio keys don't work.

## Architecture Decisions

### Why Google Cloud TTS over Gemini TTS?
- More mature, production-ready API
- Better multilingual voice quality
- Standard REST API (no SDK required)
- MP3 output is universally compatible

### Why Groq Whisper over Browser Speech API?
- **Consistency:** Works the same across all browsers
- **Accuracy:** Whisper handles accents and children's voices better
- **Language support:** Proper French transcription
- **Reliability:** No browser-specific quirks

### Why MP3 over PCM?
- Smaller file size
- No decoding required (HTML5 Audio handles it)
- Works on all devices
- Simpler playback code

## Confidence Scoring

### Met: 8/10

**Completed:**
- [x] TTS service with multilingual support
- [x] STT service with Groq Whisper
- [x] VoiceButton with clear visual states
- [x] Integration with App.tsx and ChatInterface
- [x] Error handling with kid-friendly messages
- [x] Audio level visualization
- [x] Retry logic for API calls

**Concerns:**
- [ ] Google TTS API key needs Text-to-Speech API enabled (not just AI Studio key)
- [ ] No offline fallback for voice input

**Deferred:**
- [ ] Transcription preview before sending (could add in Phase 2)
- [ ] Push-to-hold alternative (currently tap-to-toggle only)
- [ ] Voice selection UI for users

## Testing Notes

To test the voice services:

1. **TTS Test:**
   - Click the speaker icon on any AI message
   - Verify audio plays in French/English based on target language
   - Verify stop button works during playback

2. **STT Test:**
   - Tap the microphone button in the input area
   - Verify visual feedback (red button, pulsing ring)
   - Speak clearly in the target language
   - Tap again to stop
   - Verify transcription is sent as a message

3. **Error Handling:**
   - Deny microphone permission → Should show friendly error
   - Record very short audio → Should show "too short" message
   - API failure → Should show retry option

## Next Steps

- Task 5: Friends & Leaderboard
- Consider adding transcription preview in Phase 2
- Monitor API costs for TTS/STT usage
