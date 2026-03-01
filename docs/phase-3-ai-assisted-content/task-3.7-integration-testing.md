# Task 3.7: Integration Testing & Age Adaptation

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** All Phase 3 tasks (3.1–3.6)  
**Estimated Time:** 4–6 hours  
**Priority:** High — final gate before Phase 3 can ship

---

## Objective

End-to-end integration testing of the complete Phase 3 flow: onboarding → garden → path → pre-lesson chat → lesson generation → coaching step → quiz steps → completion. Verify that all age groups work correctly and that the pedagogy principles are actually manifested in real lessons.

---

## Test Matrix

### User Profiles

Create 6 test profiles covering the age/language matrix:

| Profile | Native Lang | Target Lang | Age Group | Interests |
|---------|-------------|-------------|-----------|-----------|
| A | French | German | 7-10 | animals, cartoons |
| B | French | German | 11-14 | football, gaming |
| C | French | German | 15-18 | music, cooking |
| D | English | German | 7-10 | dinosaurs, swimming |
| E | English | German | 11-14 | animals, science |
| F | French | English | 11-14 | drawing, reading |

### Test Scenarios

Run each scenario for at least 2 profiles:

#### Scenario 1: Full Personalised Flow

1. Click lesson step "Introduce Yourself"
2. Pre-lesson chat appears
3. Engage with the chat (type/tap a response about interests)
4. Chat extracts personal context
5. Lesson generates with personalised chunk family
6. "What You'll Learn" screen shows core frame + personal variations
7. Coaching chat step plays (TTS in target language voice)
8. Discovery question appears (tap options for 7-10, text for 15+)
9. Tap any answer → encouraging feedback
10. Quiz steps follow (teach-first sequence)
11. Complete lesson → return to garden
12. **Verify:** at least one chunk references the personal context

#### Scenario 2: Skip Flow

1. Click lesson step
2. Pre-lesson chat appears
3. Tap "Skip — just start!"
4. Lesson generates with generic chunk family (interest-influenced but not personal)
5. Coaching steps still work
6. Quiz steps still work
7. **Verify:** lesson is coherent and usable even without personal context

#### Scenario 3: Network Error During Pre-Lesson Chat

1. Click lesson step
2. Pre-lesson chat appears
3. Simulate network failure (disable AI provider temporarily)
4. Chat should auto-skip with friendly message
5. Lesson generates normally
6. **Verify:** graceful degradation, no crash

#### Scenario 4: Coaching Step Fallback

1. Generate a lesson where the AI fails to produce coaching fields
2. The coaching step should use fallback text
3. Discovery question should use a sensible default
4. **Verify:** no crash, still better than old INFO step

#### Scenario 5: TTS Pronunciation

1. Start a German lesson as French speaker
2. Listen to coaching text (French text, German voice)
3. **Verify:** German words pronounced correctly
4. **Verify:** French words understandable (slight accent OK)
5. Listen to target phrases
6. **Verify:** perfect German pronunciation
7. Open Help chat
8. **Verify:** Help chat uses native language voice (not target language)

#### Scenario 6: Repeat Lesson

1. Complete a lesson
2. Go back to the same path node
3. Click it again
4. Pre-lesson chat should appear again (fresh context)
5. **Verify:** different chunks generated (not cached from last time)
6. **Verify:** if user gives different personal context, chunks change accordingly

---

## Age Adaptation Checklist

### Ages 7-10

- [ ] Pre-lesson chat: quick-reply buttons (no typing required)
- [ ] Pre-lesson chat: 1 exchange max from AI
- [ ] Pre-lesson chat: AI uses short sentences, emojis, simple words
- [ ] Coaching step: tap-to-choose discovery (3 options)
- [ ] Coaching step: coaching text is 3-4 sentences max
- [ ] Coaching step: very warm, very encouraging
- [ ] Quiz steps: standard (no age-specific changes — already age-appropriate)

### Ages 11-14

- [ ] Pre-lesson chat: quick-reply buttons visible, but free text input also available
- [ ] Pre-lesson chat: 2 exchanges max from AI
- [ ] Pre-lesson chat: conversational but still simple
- [ ] Coaching step: tap-to-choose discovery (can also type if they prefer)
- [ ] Coaching step: coaching text up to 5 sentences
- [ ] Coaching step: encouraging but slightly more detailed explanations

### Ages 15-18

- [ ] Pre-lesson chat: free text input primary (quick-replies hidden unless 5s pause)
- [ ] Pre-lesson chat: 2-3 exchanges from AI
- [ ] Pre-lesson chat: more natural, open-ended conversation
- [ ] Coaching step: free text discovery for pattern-noticing questions
- [ ] Coaching step: coaching text can be more detailed, reference grammar patterns
- [ ] Coaching step: still warm but treats them more like a peer

---

## Pedagogy Verification Checklist

These checks verify that Phase 3 actually delivers on PEDAGOGY.md, not just technically works:

### Lexical Approach

- [ ] Generated chunks share a common frame (not random phrases)
- [ ] Frame has visible variable slot(s) (___) 
- [ ] Variations fill the slots with different, meaningful content
- [ ] No isolated vocabulary words — always full phrases
- [ ] Coaching step highlights the reusable pattern explicitly

### Krashen — Input Hypothesis

- [ ] Chunks are at appropriate difficulty for the learner's level
- [ ] Coaching text surrounds new chunks with familiar context
- [ ] Not too many new items at once (1 frame, 3 variations = manageable)

### Krashen — Affective Filter

- [ ] Coaching step has ZERO failure state
- [ ] Wrong discovery answers get encouragement, not correction
- [ ] Overall tone is warm and safe
- [ ] No time pressure during coaching step
- [ ] "Skip" options available at every decision point

### Coaching (ILCA)

- [ ] Learner has agency (pre-lesson chat, skip options)
- [ ] AI asks reflective questions ("What do you notice?")
- [ ] Content connects to learner's actual life (interests, personal context)
- [ ] Pattern discovery is learner-led, not lectured

### Spaced Repetition

- [ ] SRS write-back still works after Phase 3 lessons
- [ ] Coaching step doesn't break the chunk progress tracking
- [ ] Same frame is not repeated within 7 days (check existing chunks parameter)

---

## Regression Checklist

Phase 3 must not break anything that already works:

- [ ] Garden renders correctly
- [ ] Trees display and can be clicked
- [ ] Skill path shows lessons
- [ ] Path nodes show correct states (locked/current/complete)
- [ ] Onboarding flow works for new users
- [ ] Profile settings work
- [ ] SunDrops earned and displayed correctly during quizzes
- [ ] Stars calculated correctly at lesson end
- [ ] Lesson results saved to PocketBase
- [ ] Tutorial overlay still works for first-time users
- [ ] Help chat still works during lessons
- [ ] Avatar customisation still works
- [ ] Sidebar navigation works

---

## Known Edge Cases to Test

| Case | Expected Behaviour |
|------|-------------------|
| User types in target language during pre-lesson chat | AI gently redirects to native language |
| AI generates chunks in wrong language | Validator catches it, fallback lesson used |
| User rapidly taps skip on every coaching step | Goes straight to quizzes, still works |
| User has 0 interests (skipped during onboarding) | Pre-lesson chat asks generic question; chunks are general |
| Very long personal context | Truncated to 200 chars before passing to generation |
| User is offline | Pre-lesson chat skips, fallback lesson loads |
| First-ever lesson (no SRS history) | Works normally — no review chunks, all new |
| TTS fails to load | Coaching text still displayed as text, continue button works |

---

## Acceptance Criteria

- [ ] All 6 test scenarios pass for at least 2 user profiles each
- [ ] All age adaptation checks pass
- [ ] All pedagogy verification checks pass
- [ ] All regression checks pass
- [ ] No console errors during complete lesson flow
- [ ] Lesson completion time is reasonable (5-10 minutes for 3-chunk lesson)
- [ ] TTS audio quality is acceptable for mixed-language coaching

---

## Documentation Output

After testing, create:

**File:** `docs/phase-3/phase-3-test-results.md`

```markdown
# Phase 3 Test Results

## Date: [date]

## Test Summary
| Scenario | Profiles Tested | Pass/Fail | Notes |
|----------|----------------|-----------|-------|
| Full flow | A, B, D | ✅ | |
| Skip flow | A, E | ✅ | |
| Network error | B | ✅ | |
| Coaching fallback | C | ⚠️ | Minor issue with... |
| TTS pronunciation | A, D, F | ✅ | |
| Repeat lesson | B | ✅ | |

## Age Adaptation
[Checklist results]

## Pedagogy Verification
[Checklist results]

## Regression
[Checklist results]

## Issues Found
[List of issues and whether they're blockers]

## Phase 3 Sign-Off
[Ready / Not Ready for production]
```
