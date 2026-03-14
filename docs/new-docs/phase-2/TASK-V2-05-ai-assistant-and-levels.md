# TASK-V2-05: AI Assistant Chat & Adaptive Level Assessment

**Status:** Not Started  
**Priority:** High — the assistant is the safety net for confusion, the level system prevents frustration  
**Estimated Time:** 10–14 hours  
**Dependencies:** TASK-V2-01 (user profile with level), TASK-V2-02 (lesson flow)  
**Covers items:** #7 (AI assistant for help/bugs), #15 (AI level assessment and bump offers)

---

## Part A: AI Assistant Chat

### Problem

When a user doesn't understand a question, encounters a confusing activity, or spots a bug (wrong translation, nonsensical distractor, etc.), they have no way to get help or report the issue. In v1, there was an AI assistant that could explain any question and accept bug reports.

### Goals

1. Help button on every activity that opens the AI assistant
2. AI can explain the current question in the user's native language
3. AI can give hints without giving away the answer
4. User can report a broken/wrong question
5. Reported questions get flagged for review and optionally regenerated

### Implementation

#### Help Button

Add a small `❓` or `💬` button in the bottom-right corner of every activity. Tapping it opens a slide-up panel (half-screen) with the AI assistant.

```
┌─────────────────────────────────────────┐
│                                         │
│    Activity continues visible above     │
│                                         │
├─────────────────────────────────────────┤  ← slide-up panel
│  🤖 Need help?                         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Explain this question           │   │  ← Quick action buttons
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Give me a hint                  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 🐛 Something's wrong           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Or type your question:                 │
│  ┌──────────────────────────────[🎤]┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### "Explain This Question"

Sends the current activity context to the AI:

```typescript
const helpPrompt = {
  role: 'system',
  content: `You are a friendly language tutor helping a ${profile.level} level learner.
    Their native language is ${profile.native_language}.
    They're learning ${profile.target_language}.
    They're stuck on this activity:
    
    Activity type: ${activity.type}
    Target chunk: "${activity.chunk.target_text}"
    Translation: "${activity.chunk.native_translation}"
    Question: "${activity.question_text}"
    
    Explain the question simply in ${profile.native_language}.
    Do NOT give away the answer.
    Use simple language appropriate for a child aged 7-18.
    Keep it to 2-3 sentences maximum.`
};
```

The AI response appears as a chat bubble in the panel.

#### "Give Me a Hint"

Similar to explain, but the prompt specifically asks for a hint:

```
Give a helpful hint that points the learner toward the answer
without directly stating it. Use their interests to make it memorable.
For example: "Think about what you'd say to your friend when you see them at school."
```

#### "Something's Wrong" (Bug Report)

Opens a simple form:
- Dropdown: "Wrong translation", "Doesn't make sense", "Audio problem", "Other"
- Optional text input for details
- Submit → saves to a `bug_reports` table in the DB
- AI attempts to regenerate the question immediately (so the lesson isn't stuck)
- Show: "Thanks for letting us know! We'll fix it. Here's a new question."

**DB schema for bug reports:**
```
bug_reports {
  id: string
  user_id: relation → users
  lesson_id: string
  activity_type: string
  activity_data: json (the full activity that was buggy)
  report_type: 'wrong_translation' | 'nonsensical' | 'audio' | 'other'
  user_description: text (optional)
  status: 'new' | 'reviewed' | 'fixed' | 'dismissed'
  created: datetime
}
```

#### Free-Text / Voice Input

If the user types or speaks a question (via Whisper STT), send it to the AI with the full activity context. This handles edge cases where the quick action buttons don't cover the user's confusion.

**Voice input:** Tap the microphone icon → record → Whisper transcribes → send as text. This is essential since kids can't type well.

---

## Part B: Adaptive Level Assessment

### Problem

The user selects their level during onboarding, but this is self-reported and often inaccurate. The AI needs to evaluate actual performance and offer level adjustments. Currently there's no mechanism for this.

### Goals

1. Track performance metrics across lessons to detect level mismatch
2. If the user is consistently too good for their level → offer to bump up
3. If the user is struggling → offer to adjust down
4. The user always has control — level changes are offers, not forced
5. Changes take effect on the next lesson, not mid-lesson

### Level Assessment Engine

**Create `src/lib/services/levelAssessment.ts`:**

Track these metrics per lesson:

```typescript
interface LessonPerformance {
  lesson_id: string;
  level: UserLevel;
  accuracy: number;           // % correct on first attempt
  avg_response_time_ms: number; // lower = easier for them
  hints_used: number;
  hearts_lost: number;
  streak_max: number;
  stt_accuracy?: number;      // pronunciation score if applicable
}
```

**Assessment logic:**

```typescript
function assessLevel(recentLessons: LessonPerformance[]): LevelAssessment {
  // Need at least 3 lessons at current level to assess
  if (recentLessons.length < 3) return { recommendation: 'stay' };
  
  const last3 = recentLessons.slice(-3);
  const avgAccuracy = average(last3.map(l => l.accuracy));
  const avgHints = average(last3.map(l => l.hints_used));
  const avgHearts = average(last3.map(l => l.hearts_lost));
  
  // Too easy: high accuracy, fast responses, no hints, no hearts lost
  if (avgAccuracy > 0.90 && avgHints < 0.5 && avgHearts < 0.3) {
    return {
      recommendation: 'bump_up',
      confidence: calculateConfidence(last3),
      message: generateBumpUpMessage(profile),
    };
  }
  
  // Too hard: low accuracy, many hints, many hearts lost
  if (avgAccuracy < 0.45 && avgHints > 2 && avgHearts > 2) {
    return {
      recommendation: 'bump_down',
      confidence: calculateConfidence(last3),
      message: generateBumpDownMessage(profile),
    };
  }
  
  return { recommendation: 'stay' };
}
```

**When to check:** After every lesson completion, run the assessment. If it recommends a change, show the offer modal.

### Bump Up Offer

Show after lesson results, before returning to garden:

```
┌─────────────────────────────────────────┐
│                                         │
│    🌟 You're doing amazingly!           │
│                                         │
│    I think you're ready for harder      │
│    challenges! Want to level up?        │
│                                         │
│    Current: 🌿 "I Know Some Words"     │
│    Next:    🌳 "Simple Sentences"       │
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Level Up! 🚀 │  │  Not Yet 🤔  │  │
│  └───────────────┘  └───────────────┘  │
│                                         │
│    You can always change back in        │
│    Settings if it's too tricky!         │
│                                         │
└─────────────────────────────────────────┘
```

### Bump Down Offer

More gentle, never make the child feel bad:

```
┌─────────────────────────────────────────┐
│                                         │
│    💪 You're working so hard!           │
│                                         │
│    These lessons have been pretty       │
│    tough. Would you like to practice    │
│    the basics a bit more first?         │
│                                         │
│    It's not going backwards — it's      │
│    building a stronger foundation! 🏗️  │
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Yes please!  │  │  I'll keep    │  │
│  │               │  │  trying! 💪   │  │
│  └───────────────┘  └───────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Manual Level Change

In Settings, the user can always change their level:
- Show the same 4-card level selector from onboarding
- Warning: "Changing level will adjust your next lesson. Your progress is saved!"
- Takes effect on next lesson generation

### Performance Tracking DB

```
lesson_performance {
  id: string
  user_id: relation → users
  lesson_id: string
  level_at_time: string
  accuracy: number
  avg_response_time_ms: number
  hints_used: number
  hearts_lost: number
  streak_max: number
  stt_accuracy: number (nullable)
  completed_at: datetime
}
```

---

## Testing Checklist

### AI Assistant
- [ ] Help button visible on every activity
- [ ] "Explain" gives native-language explanation without revealing answer
- [ ] "Hint" gives useful hint without revealing answer
- [ ] "Bug report" saves to DB with correct data
- [ ] Bug report triggers question regeneration
- [ ] Free-text input works
- [ ] Voice input works (STT → text → AI response)
- [ ] AI responses are age-appropriate and in native language
- [ ] Panel slides up smoothly, doesn't obscure too much of activity

### Level Assessment
- [ ] Performance metrics saved after each lesson
- [ ] Bump up offered after 3+ consistently excellent lessons
- [ ] Bump down offered after 3+ consistently struggling lessons
- [ ] User can accept or decline level change
- [ ] Accepted change takes effect on next lesson
- [ ] Manual level change works in Settings
- [ ] Level change message tone is appropriate (encouraging, never shaming)

---

## Files Created/Modified

**New files:**
- `src/lib/components/lesson/HelpPanel.svelte`
- `src/lib/components/modals/LevelBumpModal.svelte`
- `src/lib/services/levelAssessment.ts`
- `src/lib/services/helpAssistant.ts`

**Modified files:**
- All activity components → add help button
- Lesson completion handler → run level assessment, save performance
- Settings page → add level selector
- DB schema → add `bug_reports` and `lesson_performance` tables
