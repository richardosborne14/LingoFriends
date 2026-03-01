# Task 2.2.3: Fix Help System Answer Leakage

**Status:** Not started
**Priority:** 🔴 P1
**Confidence target:** 9/10
**Fixes:** Suite 05 — "Help does not reveal answer directly" assertion

---

## Objective

The help system is giving away correct answers when a learner asks for help during a quiz activity. The test assertion "Help does not reveal answer directly" is failing (warning severity). For a kids' learning app, leaking the answer defeats the purpose of the quiz entirely.

---

## Failing Assertion (from suite 05)

```
"Help does not reveal answer directly" — FAIL  expected: "no direct answer"  actual: "ok"
```

The response text (227 chars, returned in 2.7s) contains the correct answer verbatim.

---

## Where to Fix

The help system prompt lives in one of these locations — check which is active:

- `services/systemPrompts.ts` — legacy service layer prompts
- `src/services/` — look for a help-related prompt

Search for the help prompt:
```bash
grep -r "help" services/systemPrompts.ts src/services/ --include="*.ts" -l
```

---

## The Fix

Add an explicit hard constraint to the help system prompt. Find the help prompt and add this rule:

```
CRITICAL RULE: Do NOT reveal the correct answer.
Your job is to guide, not to tell.
Instead of saying what the answer is, you may:
- Explain the grammar rule that applies
- Give a memory tip (e.g. "Think of how this sounds like the English word...")
- Describe the context where this phrase is used
- Ask a guiding question that helps the learner think it through

If asked "what is the answer?", respond: "I can't tell you the answer, but here's a hint: [hint]"
```

---

## Test Logic for "Does not reveal answer"

The test in `05-help-system.test.ts` checks whether the response contains the correct answer string. Review that logic to make sure it's robust — it should check for the `correctAnswer` or `nativeTranslation` field verbatim, not just any overlap.

If the check is too strict (e.g. flagging synonyms), adjust the test to only fail if the answer appears word-for-word.

---

## Files to Update

- **`services/systemPrompts.ts`** or **`src/services/`** — add the no-answer-leakage constraint to the help prompt
- **`tests/e2e/05-help-system.test.ts`** — verify the detection logic is correct (not a false positive)

---

## Acceptance Criteria

- [ ] Help prompt includes explicit "do not reveal the answer" constraint
- [ ] Manual test: ask for help during a quiz — response gives a hint, not the answer
- [ ] Suite 05 "Help does not reveal answer directly" assertion passes
