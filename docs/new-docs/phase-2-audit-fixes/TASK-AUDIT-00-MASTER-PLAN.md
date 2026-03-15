# Phase 3 Audit Remediation — Master Task Plan

**Created:** 15 March 2026
**Audit Rating:** 6/10 — "Strong foundation, missing its soul"
**Goal:** Close the gap between the PEDAGOGY.md vision and the actual child experience
**Total Estimated Time:** 38–52 hours
**Task Count:** 7 task documents covering the 3 critical findings + 4 high-priority gaps

---

## The Three Critical Findings

1. **The app is mute where it should be listening.** STT is in the stack (Groq Whisper) but wired into zero lesson activities. Kids never speak.
2. **The "coach" is a scriptwriter, not a conversationalist.** COACHING_CHAT is a pre-generated monologue, not a live interaction.
3. **The affective filter is monitored on paper, ignored in code.** Lessons are pre-built and rigid. No mid-lesson adaptation.

---

## Task Summary

| # | Task | Hours | Priority | What It Fixes |
|---|------|-------|----------|---------------|
| 01 | Voice Input Foundation | 6–8h | 🔴 Critical | STT API route, mic component, pre-lesson chat voice, help panel voice |
| 02 | Speak It Activity | 6–8h | 🔴 Critical | Pronunciation practice — the only activity where kids produce language vocally |
| 03 | Mid-Lesson Adaptive Injection | 6–8h | 🔴 Critical | Dynamic easy-win steps after consecutive failures, skip-ahead on mastery |
| 04 | Live Coaching Conversation | 8–10h | 🟠 High | Replace scripted COACHING_CHAT with real-time AI back-and-forth |
| 05 | Post-Lesson Reflection | 3–4h | 🟠 High | REFLECT step from coaching cycle + session summary |
| 06 | Age Collection in Onboarding | 2–3h | 🟠 High | Unblock age-adaptive lesson pacing, coaching tone, interaction style |
| 07 | Lesson Rhythm Variation | 6–8h | 🟡 Medium-High | Break the rigid 5-step pattern, add surprise activities, Listen & Type |

---

## Recommended Execution Order

```
Phase A — Give Kids a Voice (do first, transforms the entire experience)
├── TASK-AUDIT-01: Voice Input Foundation     ← START HERE (other voice tasks depend on this)
└── TASK-AUDIT-02: Speak It Activity          ← immediately after

Phase B — Make the Coach Alive (makes lessons feel human)
├── TASK-AUDIT-03: Mid-Lesson Adaptive Injection  ← most impactful single change
├── TASK-AUDIT-04: Live Coaching Conversation      ← hardest but most transformative
└── TASK-AUDIT-05: Post-Lesson Reflection          ← quick win, completes coaching cycle

Phase C — Polish the Experience
├── TASK-AUDIT-06: Age Collection in Onboarding    ← quick, unblocks age-adaptation everywhere
└── TASK-AUDIT-07: Lesson Rhythm Variation         ← prevents monotony
```

### Why This Order?

1. **Voice foundation first** because TASK-02 (Speak It) and TASK-04 (Live Coaching) both depend on the mic component and STT API route
2. **Speak It immediately after** because it's the single most visible proof that the app "listens" — kids will talk to it
3. **Adaptive injection next** because it addresses the most painful pedagogy gap (stacked failures with no relief)
4. **Live coaching before reflection** because the coaching conversation can *include* reflection questions naturally
5. **Age collection** is tiny but unblocks age-specific behaviour across all tasks
6. **Rhythm variation last** because it's enhancement, not transformation

---

## Dependency Graph

```
TASK-AUDIT-01 (Voice Foundation)
  ├──→ TASK-AUDIT-02 (Speak It)
  └──→ TASK-AUDIT-04 (Live Coaching) ──→ TASK-AUDIT-05 (Reflection)

TASK-AUDIT-03 (Adaptive Injection) — independent, can be parallelised with Phase A

TASK-AUDIT-06 (Age Collection) — independent, can be done any time

TASK-AUDIT-07 (Rhythm Variation) — depends on TASK-AUDIT-02 (new activity type to vary with)
```

---

## DB Schema Changes Required

New tables:

```
pronunciation_attempts — STT results for Speak It activity
reflection_responses   — post-lesson emotional check-in data
```

Profile table additions:

```
profiles += {
  ageGroup (make required, remove default)
}
```

Lesson results additions:

```
lesson_performance += {
  consecutive_wrong_peak,    — highest streak of wrong answers (for adaptive tracking)
  reflection_rating,         — 1-3 emoji response (😊 🤔 😤)
  voice_interactions_count   — how many times STT was used
}
```

---

## Risk Areas to Watch

1. **Whisper latency** — STT round-trip to Groq must be < 2s or kids lose attention. Test on slow connections. Have a "thinking…" animation.
2. **Microphone permissions** — Children's browsers may block mic access. Need clear permission request UI and graceful fallback to text input.
3. **Privacy (CRITICAL)** — Audio is sent to Groq Whisper. It must NOT be stored. Document this in privacy policy. Consider: should we warn parents?
4. **Real-time AI latency** — Live coaching conversation needs sub-second responses. Groq Llama is the right choice for speed, but test with long conversation context.
5. **Adaptive step injection** — Modifying the lesson steps array mid-lesson needs careful index management. The `currentStepIndex` store must account for inserted/removed steps.
6. **Mobile mic UX** — Hold-to-record vs tap-to-start/tap-to-stop. Test with actual children if possible. Recommendation: tap-to-start/tap-to-stop (holding is hard for small hands).

---

## Pedagogy Alignment Checklist

After all 7 tasks, re-audit against PEDAGOGY.md:

- [ ] Children can SPEAK the target language during lessons (Krashen — acquisition through production)
- [ ] The AI LISTENS and RESPONDS to what the child says (Coaching — active listening)
- [ ] Lessons ADAPT mid-session to the child's emotional state (Krashen — affective filter)
- [ ] The coaching cycle is complete: CONNECT → EXPLORE → PRACTICE → REFLECT → PLAN
- [ ] Age-appropriate interactions differ meaningfully across 7-10, 11-14, 15-18
- [ ] No two consecutive failures go without an easy win (Krashen — never stack failures)
- [ ] Lesson rhythm varies enough to prevent pattern fatigue (Affective Filter — prevent boredom)

---

## Cline Usage Notes

Each task document is designed to be handed to Cline as-is. They contain:
- Audit finding reference (why this task exists)
- Problem statement (what's broken)
- Goals (what "done" looks like)
- Step-by-step implementation (what to build)
- Code patterns and examples
- Decision points for the user
- Testing checklist
- File creation/modification lists
- Acceptance criteria

Feed them one at a time in the recommended order. Each task should be independently testable before moving to the next.
