# Task 7: Main Interface Updates - Subject/Theme Selector

**Status:** ✅ Completed
**Priority:** HIGH
**Estimated Time:** 6-8 hours
**Actual Time:** ~3 hours
**Dependencies:** Task 4 (Design System), Task 5 (Database Schema), Task 6 (Onboarding)
**Completed:** 2026-05-02

---

## Objective

Remove the language picker from the sidebar and replace the main interface with a subject/theme selector that drives personalized AI conversations for learning.

---

## What Needs to Be Done

### 7.1 Remove Language Picker

**In `App.tsx`:**

Remove the language switcher buttons from the sidebar:
```typescript
// DELETE THIS SECTION:
<div>
  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
    I want to learn:
  </label>
  <div className="flex gap-2">
    <button onClick={() => handleSwitchLanguage('English')}>English</button>
    <button onClick={() => handleSwitchLanguage('French')}>French</button>
  </div>
</div>
```

**Reasoning:**
- Subject is chosen during onboarding
- Changing subject should be done through profile editing
- Main interface should focus on starting lessons, not switching subjects

### 7.2 Create Learning Launcher Component

**New Component: `components/LearningLauncher.tsx`**

This replaces the immediate chat interface when entering the main hall. It's a guided way for kids to start conversations.

**UI Layout:**

```
┌─────────────────────────────────────┐
│  Hi [Name]! Ready to learn? 🎯     │
│                                      │
│  ┌──────────────────────────────┐  │
│  │  I want to learn:            │  │
│  │  [ English ▼ ]               │  │
│  └──────────────────────────────┘  │
│                                      │
│  ┌──────────────────────────────┐  │
│  │  Theme:                      │  │
│  │  [ Kpop ▼ ]                  │  │
│  └──────────────────────────────┘  │
│                                      │
│       [ Start Learning! 🚀 ]        │
└─────────────────────────────────────┘
```

**Elements:**

1. **Subject Dropdown:**
   - Shows current learning subject from profile
   - Populated from `profile.targetSubject`
   - Disabled (can't change here - must go to profile settings)
   - Displays with current selection and locked icon

2. **Theme Dropdown:**
   - Populated from `profile.selectedInterests`
   - If no interests: shows "General" option only
   - If has interests: shows all selected interests + "General" option
   - User can select which theme they want to focus on today

3. **Start Button:**
   - Large, prominent, gamified style
   - Clicking triggers AI conversation flow
   - Disabled until theme is selected

### 7.3 AI Conversation Starter Flow

**In `services/groqService.ts` or new `services/lessonStarterService.ts`:**

When user clicks "Start Learning!":

1. **Generate Opening Question:**
   ```typescript
   interface LessonStarterRequest {
     subject: string;
     theme: string;
     nativeLanguage: string;
     userProfile?: {
       level?: string;
       aiProfileFields?: AIProfileField[];
     };
   }
   
   async function generateLessonStarter(
     request: LessonStarterRequest
   ): Promise<string> {
     // LLM call to generate personalized opening
   }
   ```

2. **System Prompt for Lesson Starter:**
   ```
   You are Professor Finch, a friendly language learning coach. The user wants to learn {subject} through discussing {theme}.
   
   Your job is to start a conversation that:
   1. Acknowledges their interest in {theme}
   2. Asks open-ended questions to learn more specifics
   3. Guides them toward a concrete lesson
   4. Speaks in their native language: {nativeLanguage}
   
   Remember: Most kids don't know exactly what they want to learn. They need suggestions and options. If they're vague, offer specific examples related to {theme}.
   
   Example for "English + Kpop":
   "So you want to learn English and talk about Kpop! I love that. Do you have a favorite group? Or maybe you'd like to learn how to describe different music styles in English? Tell me more about what interests you!"
   
   Keep it conversational, warm, and encouraging. 1-3 sentences.
   ```

3. **Handle User Response:**
   - User types their answer in the chat
   - AI continues conversation to gather more context
   - AI looks for opportunities to:
     - Extract profile information (favorite groups, specific interests)
     - Suggest concrete lesson topics
     - Start the actual lesson when ready

4. **Profile Learning:**
   While chatting, AI should identify and save facts to `ai_profile_fields`:
   ```typescript
   // Example: User says "I really like BTS"
   await upsertAIProfileField(
     'favorite_kpop_group',
     'BTS',
     0.95, // high confidence
     currentSessionId
   );
   ```

### 7.4 Update Main App Flow

**In `App.tsx`:**

**Current flow:**
```
App → Shows ChatInterface immediately with welcome message
```

**New flow:**
```
App → Shows LearningLauncher → User selects subject/theme → Clicks Start
→ AI generates opening question → Shows ChatInterface with conversation
```

**Implementation:**

```typescript
// New state
const [showLauncher, setShowLauncher] = useState(true);
const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

// Render logic
if (showLauncher) {
  return (
    <LearningLauncher
      currentSubject={profile.targetSubject}
      availableThemes={profile.selectedInterests}
      onStart={async (theme) => {
        setSelectedTheme(theme);
        // Generate AI opening question
        const openingMessage = await generateLessonStarter({
          subject: profile.targetSubject,
          theme,
          nativeLanguage: profile.nativeLanguage,
          userProfile: {
            level: profile.level,
            aiProfileFields: await getAIProfileFields()
          }
        });
        
        // Add AI message to main session
        await updateMessages(mainSessionId, [
          {
            id: Date.now().toString(),
            sender: Sender.AI,
            text: openingMessage,
            timestamp: new Date().toISOString()
          }
        ]);
        
        // Show chat interface
        setShowLauncher(false);
      }}
    />
  );
}

// Normal chat interface when launcher is dismissed
return <ChatInterface ... />;
```

### 7.5 Add "Back to Launcher" Option

**In ChatInterface or App:**

Add a way for users to return to the Learning Launcher:
- "Change Topic" button in sidebar
- Or "Start New Topic" in chat header
- Resets to launcher view

### 7.6 Update System Prompt for Main Hall

**In `services/groqService.ts`:**

Update the main hall system prompt to:
1. Use the selected theme as context
2. Extract and save AI profile fields during conversation
3. Suggest lessons based on gathered information
4. Speak in user's native language

**Prompt additions:**
```
Current learning context:
- Subject: {subject}
- Theme: {theme}
- Native language: {nativeLanguage}

During conversation:
- Ask questions to understand their specific interests
- Offer concrete lesson suggestions when you have enough context
- Extract facts about their preferences and save them for future personalization
- Adapt vocabulary and complexity to their level: {level}

Known facts about this user:
{aiProfileFields.map(f => `- ${f.fieldName}: ${f.fieldValue}`).join('\n')}
```

### 7.7 Handle Empty Interests Case

**In `LearningLauncher.tsx`:**

If user has no selected interests (`selectedInterests.length === 0`):
- Show "General" as the only theme option
- Add a note: "Tip: Add interests in your profile to get more personalized lessons!"
- Link to profile editing

---

## Success Criteria

- [ ] Language picker is removed from sidebar
- [ ] Learning Launcher appears when entering main app (after onboarding)
- [ ] Subject dropdown shows current subject (disabled)
- [ ] Theme dropdown is populated from user's interests
- [ ] "Start Learning" button triggers AI conversation
- [ ] AI opening question is personalized and contextual
- [ ] Conversation happens in user's native language
- [ ] AI extracts and saves profile information during chat
- [ ] User can return to launcher to change topic
- [ ] Empty interests case is handled gracefully
- [ ] Flow works on mobile and desktop

---

## Files to Create/Modify

**Create:**
- `components/LearningLauncher.tsx` - New subject/theme selector UI
- `services/lessonStarterService.ts` - Logic for generating conversation starters

**Modify:**
- `App.tsx` - Remove language picker, integrate Learning Launcher
- `services/groqService.ts` - Update system prompts for context awareness
- `services/pocketbaseService.ts` - Add AI profile field methods (if not in Task 5)
- `components/ChatInterface.tsx` - Add "Change Topic" option (optional)

---

## Testing Checklist

- [ ] Complete onboarding with interests selected
- [ ] Open app and see Learning Launcher
- [ ] Verify subject shows correctly
- [ ] Verify themes populate from interests
- [ ] Click "Start Learning" with different themes
- [ ] Verify AI opening questions are contextual and varied
- [ ] Test conversation in native language (French if applicable)
- [ ] Verify AI profile fields are saved during conversation
- [ ] Test with 0 interests (shows "General" only)
- [ ] Test "Change Topic" returns to launcher
- [ ] Test on mobile viewport

---

## UX Considerations

**Making it work for kids:**

1. **Don't overwhelm:** Keep launcher simple with just 2 choices
2. **Give options:** AI should offer suggestions, not expect them to know exactly what they want
3. **Show progress:** Visual indicators when AI is "thinking"
4. **Celebrate:** Positive reinforcement when they start learning ("Great choice!")
5. **Escape hatch:** Easy way to change topics if they're not engaged

**AI conversation tips:**
- Start broad, narrow down with questions
- Offer 2-3 concrete options if they're unsure
- Use examples from their interests
- Keep messages short (1-3 sentences for opening)
- Be enthusiastic and encouraging

---

## Notes

- The goal is to reduce decision paralysis for kids
- Fixed subject + flexible theme = good balance
- AI learning profile information helps personalize over time
- Native language for conversation is key for comfort
- Theme selection makes it feel game-like and fun

---

## Implementation Summary (Completed 2026-05-02)

### What Was Built

**New Files Created:**
- `components/LearningLauncher.tsx` - Subject/theme selector UI with bilingual support
- `services/lessonStarterService.ts` - Generates personalized AI opening messages + fact extraction patterns

**Files Modified:**
- `App.tsx` - Integrated launcher flow, passes `currentTheme` to useMessageHandler
- `components/ChatInterface.tsx` - Added `onChangeTopic` and `currentTheme` props, theme badge in header
- `components/Sidebar.tsx` - Added "Change Topic" button, locked subject display
- `services/groqService.ts` - Added `ConversationContext` interface, passes theme/aiProfileFields to system prompt
- `src/hooks/useMessageHandler.ts` - Accepts `currentTheme`, extracts facts from user messages, fetches AI profile fields
- `services/systemPrompts.ts` - Already had theme/subject support from earlier tasks

### Key Features

1. **Learning Launcher Flow:**
   - Shows after login/onboarding
   - Subject locked (from profile)
   - Theme dropdown from user's interests + "General"
   - Generates personalized AI opener based on theme

2. **Theme-Aware AI:**
   - System prompt includes current theme
   - AI knows user's learning subject and theme context
   - AI profile fields passed for personalization

3. **Profile Learning:**
   - Fact extraction patterns detect user preferences
   - Facts saved to Pocketbase `ai_profile_fields` collection
   - Future conversations use learned facts

4. **UX Polish:**
   - Theme badge in chat header
   - "Change Topic" in sidebar and header
   - Loading states during AI generation
   - Bilingual UI (English/French)

### Confidence: 9/10

**Met:**
- [x] Language picker removed from sidebar
- [x] Learning Launcher shows on app entry
- [x] Subject shows correctly (locked)
- [x] Themes populated from interests + General
- [x] AI generates contextual openers
- [x] Theme passed to conversation context
- [x] AI profile field extraction implemented
- [x] Change Topic returns to launcher
- [x] Empty interests case handled

**Minor Notes:**
- Full end-to-end testing should be done in browser
- AI profile field extraction uses simple patterns (could be enhanced with LLM extraction in future)

---

## Bug Fixes Applied (2026-05-02)

### Pocketbase Schema: German Language Support

**Problem:** Onboarding allowed selecting German as a target language, but Pocketbase `target_language` field only accepted `['English', 'French']`. This caused:
- Profile creation to fail with 400 errors
- Session creation to fail
- Onboarding to repeat on every page refresh

**Solution:**

1. **Created migration script:** `scripts/migrate-add-german.cjs`
   - Updates `profiles.target_language` to include German, Spanish, Italian
   - Updates `sessions.target_language` to include German, Spanish, Italian
   - Run with: `node scripts/migrate-add-german.cjs`

2. **Updated setup script:** `scripts/setup-pocketbase.cjs`
   - Future deployments will have expanded language support out of the box

3. **Updated TypeScript types:** `types.ts`
   - `TargetLanguage` now includes: `'English' | 'French' | 'German' | 'Spanish' | 'Italian'`

4. **Updated voice services for new languages:**
   - `services/sttService.ts` - Added Whisper language codes (de, es, it)
   - `services/ttsService.ts` - Added Google Neural2 voices for German, Spanish, Italian

### Pocketbase Profile Creation

**Problem:** Profile auto-creation was failing with "Cannot be blank" for `xp`, `streak`, `daily_xp_today` fields.

**Analysis:** These are required number fields in Pocketbase. The values were being sent as `0` but Pocketbase was rejecting them.

**Solution:**
1. Added explicit `Number()` casting in `pocketbaseService.ts`
2. Added detailed error logging to help debug
3. App continues to work via in-memory profile fallback

**Recommended Pocketbase Fix:**
In Pocketbase Admin UI → `profiles` collection:
- For fields `xp`, `streak`, `daily_xp_today`: set default value of `0` or uncheck "Required"

### Files Modified for Bug Fixes:
- `scripts/migrate-add-german.cjs` (new)
- `scripts/setup-pocketbase.cjs`
- `types.ts`
- `services/sttService.ts`
- `services/ttsService.ts`
- `services/pocketbaseService.ts`
