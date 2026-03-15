# TASK-AUDIT-01: Voice Input Foundation

**Status:** 🔲 Not started
**Priority:** 🔴 Critical — the entire "teacher at the microphone" vision depends on this
**Estimated Time:** 6–8 hours
**Dependencies:** None (foundational task, do this first)
**Audit Finding:** #1 — "The App Is Mute Where It Should Be Listening"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `03-AI-STRATEGY.md` — STT model: Whisper Large v3 via Groq, TTS voice rules
3. `PEDAGOGY.md` — "Voice-first interaction since children struggle with typing"
4. `LEARNINGS.md` — check for any audio-related gotchas
5. `01-DESIGN-SYSTEM.md` — button styles, animation specs

---

## Problem

Groq Whisper is listed as a core tool in `03-AI-STRATEGY.md` and "Groq Whisper STT" appears in the ROADMAP.md production status. But STT is not integrated into any user-facing feature. The pre-lesson chat is text-only. The coaching discovery step is buttons-only (for young kids) or text-only (for teens). The help panel is text-only. Children aged 7-10 struggle to type — they will skip every text-based feature, losing the personalisation that makes LingoFriends special.

This task builds the shared infrastructure: an STT API route, a reusable microphone button component, and integration into the three places kids most need to speak instead of type.

---

## Goals

1. Server-side STT API route that proxies audio to Groq Whisper and returns a transcript
2. Reusable `MicButton.svelte` component with record/stop/processing states
3. Voice input option in the pre-lesson personalisation chat
4. Voice input option in the help panel (❓)
5. Voice input option in COACHING_CHAT discovery question (for ages 11+ text input variant)
6. Graceful fallback to text when mic is denied or unavailable

---

## Architecture

```
Child taps 🎤
      │
      ▼
┌─────────────────────┐
│  MicButton.svelte    │  ← Records audio via MediaRecorder API
│  Tap to start,       │     Outputs a Blob (webm/opus or wav)
│  tap to stop         │     Max 15 seconds, visual feedback
└──────────┬──────────┘
           │ audio Blob
           ▼
┌─────────────────────┐
│  POST /api/stt       │  ← SvelteKit server route
│  Accepts audio blob  │     Sends to Groq Whisper API
│  Returns transcript  │     Language hint = target language
└──────────┬──────────┘
           │ { text: "Wie geht es dir?" }
           ▼
┌─────────────────────┐
│  Calling component   │  ← Pre-lesson chat, HelpPanel, CoachingChat
│  Uses transcript     │     Inserts as if the child typed it
│  as text input       │
└─────────────────────┘
```

**Key design decision:** The MicButton records audio and calls the STT API itself, returning a text string via an `onTranscript` callback. This keeps the integration simple — any component that currently has a text input can add voice input by placing a MicButton next to it.

---

## Step-by-Step Implementation

### Step 1 — STT API Route

**Create `src/routes/api/stt/+server.ts`:**

```typescript
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';

/**
 * POST /api/stt
 *
 * Accepts audio as multipart form data.
 * Sends to Groq Whisper Large v3 for transcription.
 * Returns { text: string, language: string }.
 *
 * The language parameter is a HINT, not a constraint.
 * Whisper will transcribe whatever it hears, but the hint
 * improves accuracy for short utterances.
 *
 * Privacy: Audio is streamed to Groq and NOT stored by us.
 * Groq's data policy applies (they don't retain audio for
 * free-tier Whisper usage).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Auth check — only logged-in users can use STT
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const formData = await request.formData();
  const audioFile = formData.get('audio') as File | null;
  const languageHint = formData.get('language') as string | null;

  if (!audioFile) {
    throw error(400, 'No audio file provided');
  }

  // Groq Whisper uses the OpenAI-compatible transcriptions endpoint
  const groqFormData = new FormData();
  groqFormData.append('file', audioFile, 'recording.webm');
  groqFormData.append('model', 'whisper-large-v3');
  if (languageHint) {
    groqFormData.append('language', languageHint);
  }
  // Return plain text, not verbose JSON — faster response
  groqFormData.append('response_format', 'json');

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: groqFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[STT] Groq Whisper error:', response.status, errorText);
      throw error(502, 'Speech recognition failed');
    }

    const result = await response.json();
    return json({
      text: result.text?.trim() ?? '',
      language: result.language ?? languageHint ?? 'unknown',
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) throw err; // re-throw SvelteKit errors
    console.error('[STT] Unexpected error:', err);
    throw error(500, 'Speech recognition unavailable');
  }
};
```

### Step 2 — MicButton Component

**Create `src/lib/components/ui/MicButton.svelte`:**

A reusable mic button with 4 states:
1. **Idle** — grey mic icon, "Tap to speak"
2. **Recording** — red pulsing ring, "Listening…", waveform visualisation
3. **Processing** — spinner, "Thinking…"
4. **Error** — brief error message, falls back to idle

```
  IDLE                RECORDING            PROCESSING
┌──────────┐       ┌──────────┐          ┌──────────┐
│    🎤    │  tap  │  🔴 🎤   │   tap    │    ⏳    │
│  Tap to  │ ───→  │ Listening │  ───→    │ Thinking │
│  speak   │       │  (pulse)  │  (stop)  │          │
└──────────┘       └──────────┘          └──────────┘
                                              │
                                    onTranscript("text")
```

**Props:**
```typescript
interface Props {
  /** ISO language code hint for Whisper (e.g. 'de', 'fr') */
  languageHint?: string;
  /** Called with the transcribed text when STT completes */
  onTranscript: (text: string) => void;
  /** Called if mic access is denied or STT fails */
  onError?: (error: string) => void;
  /** Maximum recording duration in seconds (default: 15) */
  maxDuration?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the button is disabled */
  disabled?: boolean;
}
```

**Implementation notes:**
- Use `navigator.mediaDevices.getUserMedia({ audio: true })` for mic access
- Use `MediaRecorder` API with `mimeType: 'audio/webm;codecs=opus'` (fallback to `audio/webm` then `audio/wav`)
- Auto-stop recording after `maxDuration` seconds
- During recording, show a pulsing red ring animation (CSS keyframes)
- On stop: create a Blob, POST to `/api/stt`, call `onTranscript` with result
- If `getUserMedia` fails (mic denied): call `onError`, show a brief toast, remain in idle state
- Touch target: minimum 48×48px (larger than standard 44px because mic is a primary action)

**Accessibility:**
- `aria-label` updates per state: "Tap to speak", "Recording, tap to stop", "Processing speech"
- `aria-live="polite"` region announces the transcript when available
- Respect `prefers-reduced-motion` — no pulse animation, just a red border

### Step 3 — Mic Permission Request UI

**Create `src/lib/components/ui/MicPermissionPrompt.svelte`:**

A friendly modal shown the FIRST time the mic is needed. Explains what will happen in kid-friendly language.

```
┌──────────────────────────────────────────┐
│                                          │
│            🎤                            │
│                                          │
│   Can I hear you speak?                  │
│                                          │
│   Tap "Allow" when your browser asks.    │
│   I'll listen to your voice to help      │
│   you practise — I won't record or       │
│   save anything!                         │
│                                          │
│   [Let's try! 🎤]    [I'll type instead] │
│                                          │
└──────────────────────────────────────────┘
```

- Show once per session (track in a Svelte store or sessionStorage)
- "I'll type instead" dismisses and falls back to text input permanently for this session
- "Let's try!" triggers the actual `getUserMedia` call

### Step 4 — Integrate into Pre-Lesson Chat

**Modify `src/lib/components/activities/PreLessonChat.svelte` (or equivalent):**

Add a MicButton next to the text input field:

```
┌───────────────────────────────────────────┐
│  🤖 "Tell me about your day! What did    │
│      you do that was fun?"               │
│                                          │
│  ┌────────────────────────────┐  ┌────┐  │
│  │ Type your answer...        │  │ 🎤 │  │
│  └────────────────────────────┘  └────┘  │
│                                          │
│  [Skip — just start! →]                  │
└───────────────────────────────────────────┘
```

When `onTranscript` fires:
1. Insert the transcript into the text input (so the child sees what they said)
2. Auto-send after a 500ms delay (so they can see/edit if needed)
3. If the transcript is empty or very short (< 3 chars), show "I didn't catch that — try again?"

**Critical for young kids:** The mic button should be MORE prominent than the text input for ages 7-10. Consider making it the primary action (large, centred) with text input as a smaller "or type here" alternative. Use the `ageGroup` from the profile to decide layout.

### Step 5 — Integrate into Help Panel

**Modify `src/lib/components/lesson/HelpPanel.svelte`:**

Add a MicButton alongside the existing text input for asking questions:

```
┌───────────────────────────────────────────┐
│  💡 How can I help?                       │
│                                          │
│  [Explain this]  [Give me a hint]        │
│  [Something's wrong 🐛]                  │
│                                          │
│  Or ask me anything:                     │
│  ┌────────────────────────────┐  ┌────┐  │
│  │ Ask a question...          │  │ 🎤 │  │
│  └────────────────────────────┘  └────┘  │
└───────────────────────────────────────────┘
```

When `onTranscript` fires: send the transcript to the help AI endpoint (Groq Llama for speed) just as if it were typed text.

### Step 6 — Integrate into Coaching Chat Discovery

**Modify `CoachingChatActivity.svelte` (or the component handling COACHING_CHAT steps):**

Currently, the discovery question uses:
- Ages 7-10: Multiple choice buttons (3 options) — keep this as-is, young kids tap
- Ages 11-14: Buttons OR text input — ADD mic button next to text input
- Ages 15-18: Text input only — ADD mic button next to text input

For the text-input variants, add the same MicButton pattern as the pre-lesson chat.

**Language hint:** For coaching discovery, set `languageHint` to the NATIVE language (the child answers in their native language about what they think the phrase means). This is different from the Speak It activity (TASK-AUDIT-02) where the hint is the TARGET language.

---

## 🤔 Decision Points for User

> **1. Recording trigger — tap-to-toggle vs hold-to-record?**
> - **(A) Tap to start, tap to stop** — easier for small hands, no coordination needed
> - **(B) Hold to record, release to stop** — more intuitive for older kids, but hard for 7-year-olds
> - **(C) Tap to start, auto-stop on silence (VAD)** — magical but complex, needs voice activity detection
> **Recommendation:** Option A for MVP. Upgrade to C (with silence detection) as a Polish task.

> **2. Mic permission prompt — custom modal first or rely on browser prompt?**
> - **(A) Show our friendly modal, THEN trigger browser prompt** — better UX, explains what's happening
> - **(B) Just trigger browser prompt directly** — simpler, but browser modals scare kids
> **Recommendation:** Option A. The custom modal builds trust before the scary browser popup.

> **3. Audio format — webm or wav?**
> - **(A) webm/opus** — smaller files, faster upload, but not supported on all Safari versions
> - **(B) wav** — universally supported but 10x larger files
> - **(C) Try webm first, fallback to wav** — best of both
> **Recommendation:** Option C. Check `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')`.

> **4. Pre-lesson chat layout for young kids — mic primary or text primary?**
> - **(A) Equal size** — mic button next to text input, same size
> - **(B) Mic primary for 7-10, equal for 11+** — age-adaptive layout
> **Recommendation:** Option B. Profile's `ageGroup` drives this.

---

## Tests

```typescript
describe('STT API Route', () => {
  it('returns 401 for unauthenticated request', async () => {});
  it('returns 400 when no audio file provided', async () => {});
  it('returns transcript for valid audio (mocked Groq)', async () => {});
  it('returns 502 when Groq Whisper fails', async () => {});
  it('passes language hint to Whisper when provided', async () => {});
});

describe('MicButton', () => {
  it('renders in idle state with mic icon', () => {});
  it('transitions to recording state on tap', () => {});
  it('auto-stops after maxDuration seconds', () => {});
  it('calls onTranscript with STT result', async () => {});
  it('calls onError when mic is denied', async () => {});
  it('shows processing state during STT call', () => {});
  it('respects disabled prop', () => {});
  it('touch target is at least 48x48px', () => {});
});

describe('PreLessonChat + voice', () => {
  it('shows mic button next to text input', () => {});
  it('inserts transcript into input field', () => {});
  it('sends transcript as chat message', async () => {});
});
```

---

## 🖥️ Browser Verification

1. Navigate to a lesson → pre-lesson chat appears
2. Tap mic button → browser asks for microphone permission
3. Speak a sentence → recording indicator shows
4. Tap to stop → "Thinking…" spinner
5. Transcript appears in chat input → auto-sends after brief delay
6. AI responds to the spoken context
7. Open help panel during a lesson → mic button visible
8. Deny mic permission → fallback to text input, no crash
9. Test on mobile (or mobile emulator) — touch targets large enough

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/routes/api/stt/+server.ts` — Groq Whisper proxy
- `src/lib/components/ui/MicButton.svelte` — reusable mic component
- `src/lib/components/ui/MicPermissionPrompt.svelte` — first-time permission modal
- `src/lib/services/sttService.ts` — client-side STT helper (blob → API → text)
- `src/lib/stores/micPermission.ts` — tracks permission state per session

**Modified files:**
- `src/lib/components/activities/PreLessonChat.svelte` (or equivalent) — add MicButton
- `src/lib/components/lesson/HelpPanel.svelte` — add MicButton
- `src/lib/components/activities/CoachingChatActivity.svelte` — add MicButton to text variants
- `src/lib/i18n/en.json` + `fr.json` — strings for mic states, permission prompt

---

## Acceptance Criteria

- [ ] STT API returns accurate transcripts for clear speech (test with Groq)
- [ ] MicButton shows all 4 states with correct transitions
- [ ] Pre-lesson chat has working voice input
- [ ] Help panel has working voice input
- [ ] Coaching discovery has voice input for 11+ age groups
- [ ] Mic denied → graceful fallback to text, no errors
- [ ] Audio not stored (confirm in network tab — no persistence)
- [ ] All text translated (en/fr)
- [ ] Touch targets ≥ 48×48px
- [ ] Tests: 13+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
