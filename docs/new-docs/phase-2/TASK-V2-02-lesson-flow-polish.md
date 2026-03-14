# TASK-V2-02: Lesson Flow Polish & First Lesson Experience

**Status:** Not Started  
**Priority:** Critical — the first lesson is make-or-break for retention  
**Estimated Time:** 8–12 hours  
**Dependencies:** TASK-V2-01 (onboarding provides level + interests for lesson generation)  
**Covers items:** #3 (first lesson after signup), #17 (chunk explanation + TTS), #18 (fix prepare/continue button)

---

## Problem

1. After signup and onboarding, the user isn't automatically presented with their first lesson — they have to figure out how to start one themselves.
2. Each lesson stage in v1 started by showing the target chunk of language with a short AI explanation in the native language. This is missing in v2.
3. The "preparing your lesson" screen shows a continue button that can be pressed at any time, and the preparation message never changes — it's either broken or redundant.

---

## Goals

1. After onboarding completes → first lesson generates and starts automatically
2. Every lesson section begins with an INFO stage: the chunk is displayed, the NPC "speaks" it via TTS, and the AI gives a brief native-language explanation
3. The lesson preparation screen shows real progress (loading AI content), and the continue button only activates when content is ready
4. TTS always uses the target language voice, even for mixed-language explanations

---

## Architecture

```
Onboarding Complete
       ↓
  Generate First Lesson (show loading with real progress)
       ↓
  Lesson Ready → Auto-start
       ↓
  For each section:
    ┌─────────────────────────────────────┐
    │  INFO STAGE (Chunk Introduction)    │
    │                                     │
    │  NPC says: "Wie geht es dir?"       │
    │  ← TTS plays in target language     │
    │                                     │
    │  Explanation (native language):      │
    │  "This means 'How are you?'         │
    │  Germans use this when greeting     │
    │  someone they know."                │
    │                                     │
    │  [Replay Audio] [Continue →]        │
    └─────────────────────────────────────┘
       ↓
  Activity stages (quiz, build sentence, etc.)
       ↓
  Next section → next INFO stage → ...
```

---

## Step-by-Step Implementation

### Step 1 — Auto-Generate First Lesson After Onboarding

**In the onboarding completion handler:**

After profile save and default tree creation, immediately trigger lesson generation:

```typescript
// After onboarding completes:
const lessonRequest = {
  user_id: currentUser.id,
  target_language: profile.target_language,
  native_language: profile.native_language,
  level: profile.level,
  interests: profile.interests,
  is_first_lesson: true,
};

// Navigate to lesson view with loading state
navigateTo('/lesson', { state: { generating: true } });

// Generate lesson in background
const lesson = await generateLesson(lessonRequest);

// Lesson view picks up the generated content and starts
```

The first lesson should be special:
- Use a welcoming tone in the AI explanation
- Start with very simple, high-frequency chunks regardless of stated level (to calibrate)
- If level is "total_beginner": start with greetings ("Hello", "How are you?", "My name is...")
- If level is higher: start with a mix of greeting review + something at their stated level

### Step 2 — Fix Lesson Preparation Screen

**Find the current "preparing your lesson" component and overhaul it.**

The preparation screen should:

1. **Show real progress stages:**
   - "Thinking about what to teach you..." (AI generating lesson plan)
   - "Creating your activities..." (generating activities from chunks)
   - "Almost ready..." (TTS pre-generation if applicable)
   - "Ready! Let's go!" (everything loaded)

2. **The continue button should be DISABLED until generation completes:**
   ```svelte
   <button 
     disabled={!lessonReady} 
     class:opacity-50={!lessonReady}
     on:click={startLesson}
   >
     {#if lessonReady}
       Let's Go! 🚀
     {:else}
       <Spinner /> Preparing...
     {/if}
   </button>
   ```

3. **Show the tree/seed graphic** during loading as a visual anchor — the seed that will grow from this lesson.

4. **If generation fails**, show a friendly error with retry button: "Oops, something went wrong! Let's try again."

### Step 3 — INFO Stage Component (Chunk Introduction)

**Create `src/lib/components/lesson/ChunkIntroduction.svelte`:**

This renders at the start of each lesson section before activities begin.

```svelte
<script>
  export let chunk: {
    target_text: string;      // "Wie geht es dir?"
    native_translation: string; // "How are you?"
    explanation: string;       // "Germans use this when greeting someone they know"
    audio_url?: string;        // Pre-generated TTS audio
  };
  export let npc: NPCConfig;  // The NPC for this section
  export let onContinue: () => void;
  
  let audioPlaying = false;
  
  async function playAudio() {
    if (chunk.audio_url) {
      // Play cached audio
      audioPlaying = true;
      await playTTS(chunk.audio_url);
      audioPlaying = false;
    } else {
      // Generate and play on the fly
      audioPlaying = true;
      const audio = await generateTTS(chunk.target_text, chunk.target_language);
      audioPlaying = false;
    }
  }
  
  // Auto-play audio when component mounts
  onMount(() => {
    playAudio();
  });
</script>
```

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│    [NPC Avatar]     [User Avatar]       │  ← Encounter scene (from TASK-V2-08)
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    💬 "Wie geht es dir?"               │  ← Large, prominent target text
│                                         │
│    🔊 ←── audio plays automatically     │  ← Speaker icon, tap to replay
│                                         │
│    "How are you?"                       │  ← Translation, slightly smaller
│                                         │
│    ℹ️ "Germans use this when greeting   │  ← AI explanation in native lang
│    someone they know. It literally       │
│    means 'How goes it to you?'"         │
│                                         │
│              [Continue →]               │
│                                         │
└─────────────────────────────────────────┘
```

### Step 4 — TTS Configuration

**Critical rule: TTS voice is ALWAYS set to the target language.**

Even when the explanation contains native language text, the TTS voice should be the target language. This is because:
- Target language words are pronounced correctly
- Native language words come through with a charming accent that's comprehensible
- Mixed-language TTS in the native language would butcher target language pronunciation

```typescript
async function generateChunkTTS(
  text: string,
  targetLanguage: string,
): Promise<string> {
  // ALWAYS use target language for TTS voice
  const voiceMap = {
    'de': 'de-DE-Wavenet-C',  // German female
    'en': 'en-GB-Wavenet-A',  // English female
    'fr': 'fr-FR-Wavenet-E',  // French female
  };
  
  const voice = voiceMap[targetLanguage];
  
  // Only TTS the target language chunk, NOT the explanation
  // The explanation is read by the user, not spoken
  return await googleTTS(text, voice);
}
```

**What gets TTS:**
- The target language chunk text: YES (auto-plays)
- The native language translation: NO (displayed only)
- The AI explanation: NO (displayed only)

### Step 5 — Lesson Generation Includes Chunk Explanations

**Update the AI lesson generation prompt to include explanations for each chunk:**

The AI should generate, for each section's chunk:
- `target_text`: the chunk in the target language
- `native_translation`: direct translation
- `explanation`: a 1-2 sentence explanation in the native language, kid-friendly, covering:
  - What it means
  - When you'd use it
  - Any interesting cultural context or literal translation that helps remember it
  - Optionally, a memory trick

Example for German "Wie geht es dir?" for a French-speaking child:
```json
{
  "target_text": "Wie geht es dir?",
  "native_translation": "Comment ça va ?",
  "explanation": "C'est comme 'Comment ça va ?' en français. Les Allemands l'utilisent pour saluer quelqu'un qu'ils connaissent. Littéralement, ça veut dire 'Comment ça marche pour toi ?' — rigolo, non ?"
}
```

### Step 6 — Wire Into Lesson Flow

**Modify the lesson progression logic:**

Currently the lesson goes: activity → activity → activity → ...

Change to: **INFO → activity → activity → INFO → activity → activity → ...**

Each section of the lesson (grouped by chunk) starts with the ChunkIntroduction component, then flows into the practice activities for that chunk.

```typescript
function buildLessonSteps(lesson) {
  const steps = [];
  
  for (const section of lesson.sections) {
    // Add INFO step first
    steps.push({
      type: 'info',
      chunk: section.chunk,
      npcSeed: section.npc_seed,
    });
    
    // Then activities
    for (const activity of section.activities) {
      steps.push({
        type: 'activity',
        activity,
      });
    }
  }
  
  return steps;
}
```

---

## Testing Checklist

- [ ] Complete onboarding → lesson generates automatically
- [ ] Loading screen shows real progress, continue button disabled until ready
- [ ] If generation fails → error message with retry
- [ ] Each lesson section starts with ChunkIntroduction
- [ ] Target text displayed prominently
- [ ] TTS auto-plays in target language voice on INFO stage
- [ ] TTS replay button works
- [ ] Translation shown below target text
- [ ] AI explanation shown in native language, age-appropriate
- [ ] Continue button advances to first activity
- [ ] Flow works for both French and English native speakers
- [ ] First lesson content appropriate for selected level

---

## Files Created/Modified

**New files:**
- `src/lib/components/lesson/ChunkIntroduction.svelte`
- `src/lib/components/lesson/LessonLoading.svelte` (preparation screen overhaul)

**Modified files:**
- Onboarding completion handler → trigger lesson generation
- Lesson generation service → include chunk explanations in prompt
- Lesson flow/progression logic → insert INFO steps before each section
- TTS service → ensure target language voice is always used
