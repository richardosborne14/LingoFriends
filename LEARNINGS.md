# LingoFriends Learnings

Running log of solutions, gotchas, and discoveries. Check this before starting new tasks.

---

## 2025-02-04: Project Kickoff

### Existing Code Structure (from LingoLoft)

**Observation:** The Google AI Studio export has solid foundations.

**Reusable:**
- `types.ts` — Good type definitions, extend for Pocketbase
- `ChatInterface.tsx` — Core UI works, needs voice updates
- `ActivityWidget.tsx` — Quiz, fill-blank, matching all work
- Session management pattern (Main Hall + Lessons)

**Needs Rewrite:**
- `geminiService.ts` — Replace with Groq service
- Audio handling — Browser APIs → Groq Whisper
- Storage — localStorage → Pocketbase

**Apply to:** Task 1.1 (Code Audit)

---

## 2025-02-04: System Prompt Patterns

**Observation:** The existing Gemini system prompt uses JSON actions for structured outputs.

```typescript
// This pattern works well - keep it
{
  "action": "UPDATE_DRAFT",
  "data": {
    "topic": "Past Tense verbs",
    "confidenceScore": 0.6,
    "missingInfo": "Need to know speaking vs writing focus"
  }
}
```

**Gotcha:** Action keys must always be English, even when AI speaks French.

**Apply to:** Task 3.2 (System Prompt Overhaul)

---

## 2025-02-04: Voice Recognition Limitations

**Problem:** Browser's `webkitSpeechRecognition` is unreliable, especially for kids.

**Solution:** Use Groq Whisper instead. More consistent, handles accents and kid voices better.

**Apply to:** Task 4.2 (STT Integration)

---

## 2025-02-04: Lesson Interruptibility

**Problem:** Kids have limited screen time. They MUST be able to leave mid-lesson and resume.

**Solution:** Save session state on:
- `visibilitychange` event (tab hidden)
- `beforeunload` event (window closing)
- Every message send (frequent saves)

**Apply to:** Task 2.4 (Session Persistence)

---

## Template for New Entries

```markdown
## YYYY-MM-DD: Topic

**Problem:** [What went wrong or needed solving]

**Solution:** [How we fixed it]

**Apply to:** [Which tasks/areas this is relevant for]
```

---

## Quick Reference

| Issue | Solution | Entry Date |
|-------|----------|------------|
| Browser STT unreliable | Use Groq Whisper | 2025-02-04 |
| JSON actions need English keys | Document in system prompt | 2025-02-04 |
| Kids need interrupt/resume | Save on visibility change | 2025-02-04 |
