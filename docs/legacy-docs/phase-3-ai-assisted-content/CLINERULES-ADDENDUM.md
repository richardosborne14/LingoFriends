# Phase 3 Architecture Rules — Append to .clinerules

**Add this section to the end of `.clinerules` before starting Phase 3 implementation.**

---

## Phase 3: AI-Coached Learning — ARCHITECTURE RULES

These rules EXTEND the existing lesson pipeline rules. They do NOT replace them.

### Rule 6: Chunk families, not random phrases
The AI generates ONE core sentence frame with 3 variations. All chunks in a lesson
share the same grammatical frame with different slot fillers. The prompt MUST request
a `coreFrame` and `coreFrameTranslation` alongside the chunks.

GOOD: Frame "Ich habe ___" → "Ich habe eine Katze" / "Ich habe einen Bruder" / "Ich habe Hunger"
BAD: "Hallo Freunde" / "Wie geht's?" / "Schön dich kennenzulernen" (unrelated phrases)

### Rule 7: Personal context is OPTIONAL, never blocking
The pre-lesson chat provides personal context for chunk generation. If the user skips,
if the chat fails, or if the context is empty — lesson generation MUST still work.
Personal context is always `string | null` and code must handle both paths.

### Rule 8: Coaching steps are NON-GRADED
The COACHING_CHAT step type awards 0 SunDrops. Every answer to a discovery question
gets encouragement. There is NO failure state in a coaching step. Wrong answers get
"Almost! The answer is X — great guess!" not "Wrong."

### Rule 9: TTS voice = target language, ALWAYS
ALL lesson audio (coaching text, target phrases, discovery prompts) uses the target
language voice. Even when the coaching text is in the native language, the TTS voice
is set to the target language. The ONLY exception is the Help chat, which uses the
native language voice.

### Rule 10: Two AI models, two roles
- SMART model (winner of Task 3.1): Lesson content generation (chunk families, coaching text, distractors)
- FAST model (Groq Llama 3.3): Pre-lesson chat, in-lesson help, real-time exchanges
NEVER use the smart model for real-time conversation (too slow for kids).
NEVER use the fast model for lesson content generation (quality matters more).

### Rule 11: Age-appropriate interactions
| Age | Pre-lesson chat | Coaching discovery | AI exchanges |
|-----|----------------|-------------------|-------------|
| 7-10 | Quick-reply buttons only | Tap 3 options | 1-2 max |
| 11-14 | Quick replies + text input | Tap or type | 2-3 max |
| 15-18 | Text input primary | Free text | 2-3 max |

### Rule 12: Graceful degradation at every level
If any Phase 3 feature fails, the lesson MUST still work:
- Pre-lesson chat fails → skip to generation with null context
- Chunk family generation fails → fallback lesson (existing)
- Coaching fields missing → fallback coaching text
- TTS fails → coaching text displayed as text
- Discovery options missing → default to "What does X mean?" with distractor options
