# Task 3.3: Pre-Lesson Personalisation Chat

**Status:** 🔲 Not started  
**Phase:** 3 (AI-Coached Learning)  
**Dependencies:** Task 3.2 (Chunk Family Architecture)  
**Estimated Time:** 8–10 hours  
**Priority:** High — this is what gives the learner agency

---

## Objective

Before the "Generating lesson..." modal appears, the learner has a brief 2-3 exchange AI conversation that gathers personal context to feed into chunk family generation. This is the implementation of the PEDAGOGY.md coaching principle: "The learner owns their learning journey."

The chat is **optional** — a prominent "Skip" button is always available for kids who just want to jump in. But for those who engage, the lesson becomes personally meaningful.

---

## User Flow

```
1. User clicks a lesson step node (e.g. "Introduce Yourself")

2. INSTEAD of immediately showing "Generating lesson..."
   → A chat popup slides up (reuses Help chat popup shell)
   → NPC avatar visible, warm greeting

3. AI says something like:
   "Hey! Before we start — I saw you like animals 🐱
    Do you have any pets? Tell me about them!"

   (The prompt is seeded with the user's interests from onboarding)

4. User types: "I have a cat named Luna"
   OR taps a quick-reply button: "🐱 Cat" / "🐶 Dog" / "🐰 Rabbit" / "Skip"

5. AI responds:
   "Luna! Great name 😊 Let's learn how to tell people about Luna in German!"

6. The personal context is extracted:
   { personalContext: "User has a cat named Luna" }

7. "Generating your lesson..." modal appears
   → generateChunksForTopic() receives the personal context
   → Lesson is generated with Luna-themed chunks

8. Lesson starts with the "What You'll Learn" screen showing:
   "Ich habe eine Katze" / "Sie heißt Luna" / "Ich liebe Tiere"
```

---

## Age-Appropriate Adaptations

| Age Group | Chat Style | Input Method |
|-----------|-----------|-------------|
| **7-10** | 1 exchange only. Simple question. | Quick-reply tap buttons (no typing required). "Do you have a pet?" → 🐱 🐶 🐰 🐦 "Something else" |
| **11-14** | 2 exchanges. Conversational. | Free text input with quick-reply suggestions visible. Can type or tap. |
| **15-18** | 2-3 exchanges. More open-ended. | Free text input. Quick-replies hidden unless user pauses >5s. |

The AI adapts its language to the age group. For 7-10: short sentences, emojis, simple vocabulary. For 15-18: more natural conversation.

---

## Implementation

### File 1: `src/components/lesson/PreLessonChat.tsx` (NEW)

**Reuse the Help chat popup shell** — same visual component, different context and AI behaviour.

```typescript
/**
 * Pre-Lesson Personalisation Chat
 *
 * A brief AI conversation before lesson generation that gathers
 * personal context to personalise the chunk family.
 *
 * Design:
 * - Slides up from bottom (same as Help chat)
 * - NPC avatar visible in header
 * - 1-3 exchanges max, then auto-closes
 * - "Skip" button always prominent
 * - Quick-reply buttons for younger kids
 * - Extracted context passed to lesson generator
 *
 * @module components/lesson/PreLessonChat
 */

interface PreLessonChatProps {
  /** The lesson topic (e.g. "Introduce Yourself") */
  topic: string;
  /** User's interests from onboarding */
  interests: string[];
  /** User's age group for adaptation */
  ageGroup: '7-10' | '11-14' | '15-18';
  /** User's native language for AI conversation */
  nativeLanguage: string;
  /** User's display name */
  userName: string;
  /** Called when chat completes with extracted context */
  onComplete: (personalContext: string | null) => void;
  /** Called when user skips */
  onSkip: () => void;
  /** Whether chat is visible */
  isVisible: boolean;
}
```

**Key behaviours:**

1. On mount, the AI sends the opening message immediately (pre-generated or streamed)
2. After the user responds, AI sends one follow-up (max 2 AI messages for 7-10, max 3 for 15-18)
3. After the final AI response, a "Let's go!" button appears alongside the chat
4. If user taps "Skip" at any point, `onComplete(null)` is called — no personal context
5. The component tracks exchange count and auto-closes after the maximum

**Quick-reply buttons for 7-10 age group:**

The AI's opening message includes structured quick replies based on the topic and interests:

```typescript
interface QuickReply {
  label: string;  // "🐱 Cat"
  value: string;  // "I have a cat"
}

// Generated based on topic + interests
function generateQuickReplies(topic: string, interests: string[]): QuickReply[] {
  // For "Introduce Yourself" + interests including "animals":
  return [
    { label: '🐱 Cat', value: 'I have a cat' },
    { label: '🐶 Dog', value: 'I have a dog' },
    { label: '🐰 Other pet', value: 'I have a pet' },
    { label: '🚫 No pets', value: "I don't have pets but I like animals" },
  ];
}
```

### File 2: `src/services/preLessonChatService.ts` (NEW)

**Manages the AI conversation for the pre-lesson chat.**

Uses **Groq Llama 3.3** for speed (not the lesson generation model). The responses are short and conversational — latency matters more than depth here.

```typescript
/**
 * Pre-Lesson Chat Service
 *
 * Manages the brief AI conversation before lesson generation.
 * Uses the FAST AI provider (Groq) for low latency.
 *
 * Responsibilities:
 * 1. Generate opening message based on topic + interests
 * 2. Process user responses and generate follow-ups
 * 3. Extract personal context from the conversation
 * 4. Respect exchange limits per age group
 */

interface PreLessonChatConfig {
  topic: string;
  interests: string[];
  ageGroup: '7-10' | '11-14' | '15-18';
  nativeLanguage: string;
  userName: string;
}

// Maximum exchanges (AI messages) per age group
const MAX_EXCHANGES: Record<string, number> = {
  '7-10': 2,
  '11-14': 3,
  '15-18': 3,
};
```

**System prompt for the pre-lesson chat:**

```typescript
function buildPreLessonSystemPrompt(config: PreLessonChatConfig): string {
  return `You are Lingo, a friendly language learning buddy for kids.
You're about to start a ${config.topic} lesson with ${config.userName}.

YOUR JOB: Have a VERY brief chat (${MAX_EXCHANGES[config.ageGroup]} messages max from you)
to learn something personal about ${config.userName} that relates to the topic.
This personal detail will be used to make their lesson more fun and relevant.

RULES:
1. Speak in ${config.nativeLanguage} — this is a pre-lesson chat, not a language exercise
2. Be warm, enthusiastic, age-appropriate for ${config.ageGroup} year olds
3. Ask ONE simple question related to their interests
4. When they respond, acknowledge warmly and signal readiness to start
5. NEVER ask more than one question per message
6. Keep messages SHORT — max 2 sentences for ages 7-10, max 3 for older
7. Use emojis sparingly (1-2 per message max)
8. If they give a one-word answer, that's fine — work with it

THEIR INTERESTS: ${config.interests.join(', ')}
TOPIC: ${config.topic}

QUESTION STRATEGY per topic:
- "Introduce Yourself": Ask about a specific interest → "I saw you like animals! Do you have any pets?"
- "At the Restaurant": Ask about food → "What's your favourite thing to eat when you go out?"
- "Hobbies": Ask which one → "You like football and gaming — which one do you do more?"
- "My Family": Ask about family → "Do you have brothers or sisters?"
- Generic: Pick their first interest and ask about it

NEVER:
- Ask about sensitive topics (health, family problems, school grades)
- Ask multiple questions in one message
- Continue chatting beyond your message limit — wrap up and say "Let's go!"
- Use the target language (this chat is in their native language only)

After you've gathered context, your FINAL message should include exactly this marker
at the end (invisible to the user, parsed by the app):

[CONTEXT: <one sentence summary of what you learned>]

Example: [CONTEXT: User has a cat named Luna and loves drawing cats]`;
}
```

**Context extraction:**

```typescript
/**
 * Extract personal context from the AI's final message.
 * Looks for the [CONTEXT: ...] marker.
 */
function extractPersonalContext(aiMessage: string): {
  displayMessage: string;
  personalContext: string | null;
} {
  const contextMatch = aiMessage.match(/\[CONTEXT:\s*(.+?)\]/);

  return {
    // Remove the marker from what the user sees
    displayMessage: aiMessage.replace(/\[CONTEXT:\s*.+?\]/, '').trim(),
    personalContext: contextMatch ? contextMatch[1].trim() : null,
  };
}
```

### File 3: `src/hooks/useLesson.ts` — Add Pre-Lesson State

**Modify** the lesson hook to manage the pre-lesson chat flow:

```typescript
// New state for pre-lesson chat
const [showPreLessonChat, setShowPreLessonChat] = useState(false);
const [personalContext, setPersonalContext] = useState<string | null>(null);

// When a lesson is started:
const handleStartLesson = useCallback((lesson: SkillPathLesson) => {
  // Show pre-lesson chat first (unless user has disabled it in settings)
  setCurrentLesson(lesson);
  setShowPreLessonChat(true);
}, []);

// When pre-lesson chat completes:
const handlePreLessonComplete = useCallback((context: string | null) => {
  setPersonalContext(context);
  setShowPreLessonChat(false);
  // Now trigger actual lesson generation with the context
  generateLesson(currentLesson, context);
}, [currentLesson]);

// When pre-lesson chat is skipped:
const handlePreLessonSkip = useCallback(() => {
  setShowPreLessonChat(false);
  generateLesson(currentLesson, null);
}, [currentLesson]);
```

### File 4: `src/components/lesson/LessonView.tsx` — Render Pre-Lesson Chat

**Add** the PreLessonChat component to the lesson view:

```tsx
{showPreLessonChat && (
  <PreLessonChat
    topic={currentLesson.title}
    interests={profile.selectedInterests || []}
    ageGroup={getAgeGroup(profile.ageGroup)}
    nativeLanguage={profile.nativeLanguage}
    userName={profile.name}
    onComplete={handlePreLessonComplete}
    onSkip={handlePreLessonSkip}
    isVisible={showPreLessonChat}
  />
)}
```

### File 5: `src/services/lessonPlanService.ts` — Pass Context Through

**Modify** `generateLessonPlan()` to accept and forward personal context:

```typescript
export interface GenerateLessonPlanOptions {
  lesson: SkillPathLesson;
  targetLanguage?: string;
  durationMinutes?: number;
  personalContext?: string;  // NEW
}

// In the function body, pass it to lessonGeneratorV2:
const result = await lessonGeneratorV2.generateLesson({
  sessionPlan,
  profile,
  personalContext: options.personalContext,  // NEW
});
```

---

## Visual Design

The pre-lesson chat should feel like meeting a friendly character, not filling out a form:

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────┐  Lingo                        │
│  │ 🦉  │  Hey Max! Before we start —   │
│  └─────┘  I saw you like animals 🐱    │
│           Do you have any pets?         │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🐱 Cat  │ 🐶 Dog  │ 🐰 Other  │   │  ← Quick replies (7-10)
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ Type your answer...         📨  │   │  ← Text input (11+)
│  └──────────────────────────────────┘   │
│                                         │
│         [ Skip — just start! ]          │  ← Always visible
│                                         │
└─────────────────────────────────────────┘
```

After user responds:

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────┐  Lingo                        │
│  │ 🦉  │  Hey Max! Before we start —   │
│  └─────┘  I saw you like animals 🐱    │
│           Do you have any pets?         │
│                                         │
│                      Max                │
│           I have a cat named Luna! 🐱   │
│                                         │
│  ┌─────┐  Lingo                        │
│  │ 🦉  │  Luna! Great name 😊          │
│  └─────┘  Let's learn how to tell      │
│           people about Luna in German!  │
│                                         │
│         [ ✨ Let's go! ✨ ]             │  ← Replaces input
│                                         │
└─────────────────────────────────────────┘
```

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| User types nothing and hits send | AI: "No worries! Let's just jump in 😊" → `onComplete(null)` |
| User types something inappropriate | AI doesn't acknowledge content, redirects: "Let's focus on the lesson! Ready to start?" |
| User types in target language | AI responds in native language, gently: "Nice try with German! Let's save that for the lesson 😊" |
| Network error during chat | Show "Oops, couldn't connect. Let's start anyway!" → `onSkip()` |
| User closes the popup | Same as skip → `onSkip()` |
| User has no interests set | AI asks a generic topic question: "What's something you really like doing?" |
| User has already done this topic | AI references progression: "Last time you learned greetings. Now let's talk about you!" |

---

## Acceptance Criteria

- [ ] Pre-lesson chat appears when clicking a lesson step node
- [ ] Chat uses Groq (fast model) for responses, not the lesson generation model
- [ ] Opening message references at least one of the user's interests
- [ ] Quick-reply buttons appear for 7-10 age group
- [ ] Free text input available for 11+ age group
- [ ] "Skip" button works and triggers lesson generation with no personal context
- [ ] Personal context is extracted and passed to `generateChunksForTopic()`
- [ ] Chat auto-closes after max exchanges (2 for 7-10, 3 for 11-14 and 15-18)
- [ ] Generated lesson reflects the personal context (e.g. Luna appears in chunks)
- [ ] Network errors fall back gracefully to skip
- [ ] Chat popup is visually consistent with Help chat popup

---

## Test Commands

```bash
# TypeScript compiles
npx tsc --noEmit

# Manual testing:
# 1. Complete onboarding with interests: [animals, football]
# 2. Click into garden → path → lesson step
# 3. Verify pre-lesson chat appears
# 4. Type "I have a dog named Rex"
# 5. Verify AI acknowledges and signals readiness
# 6. Verify lesson generates with dog/Rex-themed chunks
# 7. Repeat with "Skip" → verify generic lesson generates
# 8. Test with 7-10 age group → verify quick-reply buttons appear
```
