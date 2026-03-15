# TASK-AUDIT-04: Live Coaching Conversation

**Status:** 🔲 Not started
**Priority:** 🟠 High — transforms coaching from scripted cutscene to real conversation
**Estimated Time:** 8–10 hours
**Dependencies:** TASK-AUDIT-01 (Voice Input Foundation — MicButton for voice replies)
**Audit Finding:** #2 — "The Coach Is a Scriptwriter, Not a Conversationalist"

---

## Mandatory Reads

1. `.clinerules` (always)
2. `PEDAGOGY.md` — Language Coaching Methodology section (the full coaching cycle: CONNECT → EXPLORE → PRACTICE → REFLECT → PLAN), Active Listening principle, Strengths-Based Approach
3. `03-AI-STRATEGY.md` — Model assignments: Groq Llama 3.3 for real-time lesson chat (speed > intelligence), cost estimates
4. `04-PEDAGOGY-SUMMARY.md` — coaching chat: any answer = encouraging, no wrong answers
5. `01-DESIGN-SYSTEM.md` — coaching chat step layout (NPC avatar, speech bubble, discovery question)

---

## Problem

The COACHING_CHAT step is currently a 4-phase scripted monologue:

1. **Intro** — NPC says pre-generated coaching text (TTS plays)
2. **Discover** — Pre-generated question appears (MC for young kids, text for teens)
3. **Reveal** — Fixed encouraging response (same regardless of what the child answered)
4. **Ready** — "Let's practise!"

This is not coaching. The AI generates everything at lesson-generation time. The child's answer is never processed — every response gets the same canned encouragement. The coach doesn't listen, doesn't adapt, and doesn't remember what the child said.

**The PEDAGOGY.md coaching cycle calls for:**
- CONNECT → "What interests you today? How are you feeling?" (only in pre-lesson chat, skippable)
- EXPLORE → "Let's discover new language together" (the intro monologue — exists)
- PRACTICE → "Try using it in a fun activity" (quiz steps — exists)
- REFLECT → "What did you learn? What was tricky?" (**MISSING ENTIRELY**)
- PLAN → "What shall we do next time?" (**MISSING ENTIRELY**)

---

## Goals

1. Replace the scripted COACHING_CHAT "discover" phase with a live 2-3 exchange AI conversation
2. The AI actually READS and RESPONDS to the child's answer (not a canned response)
3. Conversation uses Groq Llama for sub-second responses (speed is critical during lessons)
4. Voice input option via MicButton (from TASK-AUDIT-01)
5. Age-appropriate interaction style (7-10: guided MC → AI response, 11-14: mixed, 15-18: free text)
6. The AI's coaching response references what the child said specifically

---

## Architecture

```
COACHING_CHAT step starts
         │
         ▼
┌─────────────────────────┐
│  Phase 1: INTRO          │  ← Same as current: NPC reads pre-generated coaching text
│  TTS plays coaching text │     via TTS. NPC jaw animation. No change.
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Phase 2: DISCOVER       │  ← CHANGED: Live AI conversation
│  Discovery question      │     Question is still pre-generated (for speed)
│  Child answers (voice    │     BUT the child's answer goes to Groq Llama
│  or buttons or text)     │     for a REAL response
└──────────┬──────────────┘
           │ child's answer
           ▼
┌─────────────────────────┐
│  POST /api/lessons/      │  ← NEW: Real-time coaching endpoint
│  coaching-respond        │     Groq Llama processes the child's answer
│                          │     Returns a contextual, encouraging response
└──────────┬──────────────┘
           │ AI response
           ▼
┌─────────────────────────┐
│  Phase 3: RESPOND        │  ← CHANGED: AI's real response (not canned)
│  NPC speaks AI response  │     TTS plays. NPC jaw animates.
│  via TTS                 │     Response references what child said.
└──────────┬──────────────┘
           │
           ▼ (optional: 1 follow-up exchange)
┌─────────────────────────┐
│  Phase 4: FOLLOW-UP      │  ← NEW: Optional second exchange
│  AI asks a follow-up     │     Only if the child's answer was interesting/deep
│  OR goes straight to     │     OR if the child seemed confused
│  "Ready!"                │     Otherwise: skip to Ready
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Phase 5: READY          │  ← Same as current: "Let's practise!"
└─────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1 — Coaching Response API Route

**Create `src/routes/api/lessons/coaching-respond/+server.ts`:**

```typescript
/**
 * POST /api/lessons/coaching-respond
 *
 * Real-time coaching response during a COACHING_CHAT step.
 * Uses Groq Llama 3.3 for sub-second latency (Rule: speed > intelligence
 * for real-time lesson interactions — see 03-AI-STRATEGY.md).
 *
 * The AI receives:
 * - The coaching context (what chunk is being taught)
 * - The discovery question that was asked
 * - The child's answer
 * - The child's age group (for tone calibration)
 * - The child's native language (for response language)
 *
 * The AI returns:
 * - A 1-3 sentence encouraging response that references the child's answer
 * - Optionally, a follow-up question (if the answer was interesting)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) throw error(401, 'Auth required');

  const {
    childAnswer,
    discoveryQuestion,
    targetPhrase,
    nativeTranslation,
    coachingText,
    ageGroup,
    nativeLanguage,
  } = await request.json();

  const fastModel = getFastModel(); // Groq Llama — sub-second

  const systemPrompt = buildCoachingResponsePrompt(
    ageGroup, nativeLanguage, targetPhrase, nativeTranslation
  );

  const userMessage = `
Discovery question: "${discoveryQuestion}"
Child's answer: "${childAnswer}"
Coaching context: "${coachingText}"
  `.trim();

  const result = await fastModel.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 200, // Keep responses short — this is mid-lesson
  });

  // Try to parse structured response
  try {
    const parsed = JSON.parse(extractJSON(result.text));
    return json({
      response: parsed.response,
      followUp: parsed.followUp ?? null,
    });
  } catch {
    // Fallback: treat entire response as plain text
    return json({
      response: result.text.trim(),
      followUp: null,
    });
  }
};
```

### Step 2 — Coaching Response System Prompt

**Create `src/lib/server/lessons/coachingPrompts.ts`:**

```typescript
/**
 * System prompt for real-time coaching responses.
 *
 * CRITICAL PEDAGOGY RULES:
 * 1. ALWAYS acknowledge what the child said — they must feel heard
 * 2. ALWAYS relate their answer back to the target phrase
 * 3. NEVER say "wrong" — all answers get encouragement
 * 4. Keep it SHORT — 1-3 sentences max (this is mid-lesson, not a lecture)
 * 5. Speak in the child's NATIVE language (this is coaching, not practice)
 * 6. Match tone to age group:
 *    - 7-10: Simple, excited, lots of emoji
 *    - 11-14: Friendly, casual, some emoji
 *    - 15-18: Respectful, peer-like, minimal emoji
 */
export function buildCoachingResponsePrompt(
  ageGroup: string,
  nativeLanguage: string,
  targetPhrase: string,
  nativeTranslation: string,
): string {
  const toneGuide = {
    '7-10': 'Use simple words, be very excited, use 1-2 emoji. Like a fun older sibling.',
    '11-14': 'Be friendly and casual. Use the occasional emoji. Like a cool teacher.',
    '15-18': 'Be respectful and genuine. Minimal emoji. Like a peer mentor.',
  }[ageGroup] ?? 'Be friendly and encouraging.';

  const lang = nativeLanguage === 'fr' ? 'French' : 'English';

  return `You are a warm language coach helping a child learn "${targetPhrase}" (which means "${nativeTranslation}").

You just asked the child a discovery question about this phrase. They answered.

Your job:
1. Acknowledge what they said specifically (show you listened)
2. Connect their answer to the target phrase
3. Add one small, interesting detail about the phrase (pronunciation tip, cultural note, or fun fact)
4. If their answer is especially interesting, ask ONE follow-up question

Respond ONLY in ${lang}. Keep it to 1-3 sentences.

Tone: ${toneGuide}

Respond with JSON:
{
  "response": "Your encouraging response that references what they said",
  "followUp": "Optional follow-up question, or null"
}`;
}
```

### Step 3 — Upgrade CoachingChatActivity Component

**Modify `src/lib/components/activities/CoachingChatActivity.svelte`:**

Replace the fixed 4-phase system with a dynamic conversation flow:

**Phase management:**

```typescript
type CoachingPhase = 'intro' | 'discover' | 'waiting' | 'respond' | 'follow_up' | 'follow_up_waiting' | 'follow_up_respond' | 'ready';
```

**Flow:**
1. `intro` — NPC speaks coaching text (TTS). Same as current. Auto-advances after TTS finishes.
2. `discover` — Discovery question appears. Child answers via buttons (7-10) or text/voice (11+).
3. `waiting` — Spinner while API processes ("NPC is thinking..."). NPC does a "thinking" animation (head tilt).
4. `respond` — NPC speaks AI response (TTS). References what the child said.
5. `follow_up` — If AI returned a follow-up question: show it. Child answers.
6. `follow_up_waiting` — Same spinner.
7. `follow_up_respond` — NPC speaks follow-up response.
8. `ready` — "Great! Let's practise!" auto-dismiss after 1.5s.

**If AI fails (timeout/error):** Fall back to the existing canned encouragement. Never break the lesson flow.

**Max conversation length:** 2 exchanges (discover + optional follow-up). Hard cap to keep coaching brisk.

### Step 4 — TTS for AI Responses

The AI's response text needs TTS. Unlike pre-generated coaching text, this is generated in real-time, so there's no audioCache entry.

**Options:**
1. **On-demand TTS fetch** — call `/api/tts` with the response text, wait, then play
2. **Skip TTS for responses** — show text only, NPC mimes speaking

**Recommendation:** Option 1, but with a timeout. If TTS takes > 2 seconds, show the text and skip audio. The coaching text in the `intro` phase already has cached TTS; the `respond` phase trades 1-2s latency for the "NPC is speaking to you" experience.

```typescript
async function speakResponse(text: string) {
  try {
    const audio = await Promise.race([
      fetchAndPlay(text, targetLanguage),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000)),
    ]);
    onSpeakingChange?.(true);
    await audio;
    onSpeakingChange?.(false);
  } catch {
    // TTS failed or timed out — show text without audio
    onSpeakingChange?.(false);
  }
}
```

### Step 5 — NPC "Thinking" Animation

**Modify `src/lib/components/lesson/EncounterScene.svelte`:**

Add a `isThinking` prop alongside `isSpeaking`:

```typescript
interface Props {
  userAvatar: AvatarOptions;
  npcConfig: NPCConfig;
  isSpeaking?: boolean;
  isThinking?: boolean; // NEW: head tilts side to side while "thinking"
}
```

When `isThinking` is true: NPC does a gentle head tilt animation (rotate Y axis ±10° on a sine wave). This gives visual feedback that the NPC is processing, keeping the child engaged during the API call.

---

## 🤔 Decision Points for User

> **1. Should 7-10 year olds get live AI responses, or keep canned responses?**
> - **(A) Live for everyone** — all ages get genuine AI responses
> - **(B) Canned for 7-10, live for 11+** — simpler interaction for youngest kids, but they miss the magic
> **Recommendation:** Option A. The AI response is in the native language and 1-3 sentences. Even 7-year-olds can process this. The magic of being heard is worth the complexity.

> **2. TTS for AI responses — wait for audio or show text?**
> - **(A) Always wait for TTS** — consistent "NPC is talking" experience, but 1-2s delay
> - **(B) Show text immediately, play TTS in background** — faster but text appears before voice
> - **(C) Race: show text after 1.5s if TTS isn't ready** — best of both
> **Recommendation:** Option C. Start TTS fetch immediately. If audio arrives within 1.5s, play it (NPC speaks). If not, show the text as a speech bubble (NPC mimes).

> **3. Follow-up question — always, sometimes, or never?**
> - **(A) Always (if AI wants to)** — richer conversation but adds 10-15s per coaching step
> - **(B) Only if child's answer was 10+ words (showed engagement)** — adaptive
> - **(C) Let the AI decide** — include in prompt: "only ask a follow-up if the answer was interesting"
> **Recommendation:** Option C. The AI can judge engagement better than a word count. The prompt already says "If their answer is especially interesting."

---

## Tests

```typescript
describe('Coaching Response API', () => {
  it('returns 401 without auth', async () => {});
  it('returns structured response with mocked Groq', async () => {});
  it('response references the child answer', async () => {});
  it('handles Groq timeout gracefully', async () => {});
  it('returns null followUp when AI has no follow-up', async () => {});
});

describe('CoachingChatActivity - live mode', () => {
  it('advances through intro → discover → waiting → respond → ready', () => {});
  it('sends child answer to coaching-respond API', async () => {});
  it('displays AI response in speech bubble', () => {});
  it('falls back to canned response on API failure', () => {});
  it('shows follow-up question when AI provides one', () => {});
  it('caps at 2 exchanges max', () => {});
  it('NPC jaw animates during response TTS', () => {});
  it('voice input works via MicButton for 11+ age groups', () => {});
  it('no SunDrops awarded or deducted', () => {});
});

describe('buildCoachingResponsePrompt', () => {
  it('adapts tone for 7-10 age group', () => {});
  it('adapts tone for 15-18 age group', () => {});
  it('specifies native language for response', () => {});
  it('includes target phrase context', () => {});
});
```

---

## 🖥️ Browser Verification

1. Start a lesson → reach a COACHING_CHAT step
2. NPC intro plays via TTS (jaw animation) — same as before
3. Discovery question appears
4. Answer the question (tap button for 7-10, type/speak for 11+)
5. "NPC is thinking..." animation plays (head tilt)
6. AI response appears in speech bubble, TTS plays (jaw animation)
7. Response specifically references what you said (not generic)
8. If follow-up: second question appears, answer, second response
9. "Let's practise!" auto-advances to quiz steps
10. Test failure: disconnect network → verify fallback to canned response

**Pass/Fail:** ___

---

## Files Created/Modified

**New files:**
- `src/routes/api/lessons/coaching-respond/+server.ts` — real-time coaching API
- `src/lib/server/lessons/coachingPrompts.ts` — system prompt builder

**Modified files:**
- `src/lib/components/activities/CoachingChatActivity.svelte` — full rewrite of phase system
- `src/lib/components/lesson/EncounterScene.svelte` — add `isThinking` animation
- `src/lib/components/activities/ActivityRouter.svelte` — pass `isThinking` prop
- `src/lib/i18n/en.json` + `fr.json` — "thinking" state text, fallback messages

---

## Acceptance Criteria

- [ ] Coaching step sends child's answer to live AI endpoint
- [ ] AI response references what the child said specifically
- [ ] Response is in the child's native language
- [ ] Tone matches age group (7-10 excited, 15-18 peer-like)
- [ ] NPC "thinking" animation plays during API call
- [ ] TTS plays for AI response (or text fallback within 1.5s)
- [ ] Optional follow-up question works when AI provides one
- [ ] Max 2 exchanges (hard cap)
- [ ] API failure falls back to canned response (no broken lesson)
- [ ] No SunDrops awarded or deducted
- [ ] Voice input works for 11+ via MicButton
- [ ] All text translated (en/fr)
- [ ] Tests: 14+ passing
- [ ] Browser verification passed
- [ ] 50%+ comments

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
