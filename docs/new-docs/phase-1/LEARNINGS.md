# LEARNINGS.md — LingoFriends V2

Running log of solutions, discoveries, and gotchas. Cline reads this before every task to avoid repeating mistakes. Add entries as you go — this is a one-shot notepad, not a polished document.

**Format:** Newest at the top. Tag with `[Phase X.Y]` so future tasks can find relevant entries.

---

## How to Use This File

**Before every task:** Scan for entries tagged with your current phase or related topics.
**After every task:** Add anything you learned that future tasks should know.

### What to document:
- Solutions that took a while to find
- Surprising behaviour from libraries or APIs
- Decisions and their rationale (so you don't re-debate them)
- Things that almost worked but didn't (and why)
- Configuration gotchas
- Performance discoveries

### Entry format:
```markdown
### [Phase X.Y] Short title
[1-3 sentences explaining the learning. Include the solution, not just the problem.]
```

---

## Log

### [V1 Legacy] TTS voice must always be target language
Even when coaching text mixes native and target language, the TTS voice must be set to the target language. A German voice reading French words produces better target language pronunciation while keeping native words comprehensible with a charming accent. NEVER switch TTS voice to native language mid-lesson. See `03-AI-STRATEGY.md`.

### [V1 Legacy] AI must generate CONTENT, not STRUCTURE
The V1 lesson pipeline was rewritten 3 times because the AI was asked to produce complete activity JSON. It frequently got field names wrong, missed required fields, or produced linguistically invalid content. The fix: AI produces pedagogical content only (phrases, translations, distractors). Deterministic TypeScript assembles the activities. See the pipeline architecture in `03-AI-STRATEGY.md`.

### [V1 Legacy] Language code conversion — single source of truth
V1 had `"German".toLowerCase().substring(0,2)` → `"ge"` (wrong, should be `"de"`). Multiple files had their own conversion logic. V2 has ONE module: `src/lib/types/language.ts`. All conversion goes through it. No `.substring()` for language codes. Ever.

### [V1 Legacy] PocketBase permission errors only surface during manual testing
V1's most painful bugs were PocketBase schema/permission mismatches that only appeared when a real user tried the flow. This is why V2 uses Postgres + Drizzle (typed schema, explicit migrations) and why every task requires browser verification with the dummy user.

### [V1 Legacy] Reuse-first pattern undermines personalisation
Checking existing chunks before generating new ones sounds efficient, but it means learners with similar profiles get identical lessons. V2 flips the pattern: generate fresh content first (personalised to this specific learner), then deduplicate on save. The chunk library is a byproduct of generation, not the primary source.

### [V1 Legacy] JSON action keys must be English
When the AI tutor speaks French/German, all JSON field names and action keys must still be in English. Non-English keys break the deterministic assembly pipeline.

### [V1 Legacy] Groq Whisper STT works better than browser built-in
Browser Speech-to-Text is unreliable, especially for children's voices in non-English languages. Groq Whisper handles it much better. Keep using Groq for STT in V2.

### [V1 Legacy] Lesson interruption requires state save
If a child closes the app mid-lesson, progress must be saved. Use the `visibilitychange` browser event to trigger a save. Don't rely on the lesson completion flow.
