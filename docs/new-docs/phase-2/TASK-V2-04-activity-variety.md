# TASK-V2-04: Activity Variety — Build Sentence, STT & More

**Status:** Not Started  
**Priority:** High — monotonous questions kill engagement fast  
**Estimated Time:** 10–14 hours  
**Dependencies:** TASK-V2-02 (lesson flow), TASK-V2-03 (reward system for scoring)  
**Covers items:** #6 (build sentence, STT, more variety)

---

## Problem

The current v2 only has basic multiple choice questions. Kids get bored quickly if every question looks the same. V1 had a wider variety of activity types, and we need to bring that back plus add new ones.

---

## Goals

1. Implement 6+ activity types that test different skills
2. Deterministic activity sequencer that picks the right mix per section
3. Speech-to-text (STT) activity for pronunciation practice
4. "Build the Sentence" drag-and-drop activity
5. All activities use the same scoring/reward system from TASK-V2-03

---

## Activity Types

### Type 1: Multiple Choice (EXISTING)
**Tests:** Recognition / comprehension

Show a prompt (text or audio), user picks from 4 options.

```
  "What does 'Wie geht es dir?' mean?"
  
  ┌─────────────┐  ┌─────────────┐
  │  How are you │  │  Where is   │
  │      ✓      │  │  the dog    │
  └─────────────┘  └─────────────┘
  ┌─────────────┐  ┌─────────────┐
  │  Good night  │  │  Thank you  │
  └─────────────┘  └─────────────┘
```

**Variants:**
- Target → Native translation (default)
- Native → Target translation
- Audio → Target text (listen and pick what you hear)
- Audio → Native translation (listen and pick what it means)

### Type 2: Build the Sentence (NEW)
**Tests:** Production / word order / grammar

Show a prompt in native language. User drags word tiles into the correct order to form the target language sentence.

```
  "How are you?"
  
  Answer: [    ] [    ] [    ] [    ]
  
  Available tiles:
  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
  │ dir │ │ es  │ │ Wie │ │geht │ │ und │
  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
          (one distractor tile: "und")
```

**Implementation:**
- Split the target chunk into words/tokens
- Add 1-2 distractor words (from the same lesson or common words)
- Drag-and-drop on mobile (touch events), click-to-place on desktop
- Tiles snap into answer slots
- Tap a placed tile to remove it back to the bank
- Check order matches expected sentence exactly
- Allow minor variations if the AI specifies them (e.g., flexible word order in German for some structures)

**Svelte implementation notes:**
- Use a Svelte action for drag handling or a lightweight library like `svelte-dnd-action`
- Animate tiles sliding into place
- Green glow on correct placement, red shake on incorrect

### Type 3: Fill in the Blank (EXISTING or NEW)
**Tests:** Recall / production

The target sentence with one key word missing. User types or selects from options.

```
  "Wie _____ es dir?"
  
  Type your answer: [      ]
  
  Or choose:
  ┌──────┐ ┌──────┐ ┌──────┐
  │ geht │ │ ist  │ │ hat  │
  └──────┘ └──────┘ └──────┘
```

**Two sub-variants:**
- **Easy mode** (lower levels): Show 3 options to tap
- **Hard mode** (higher levels): Free-text input with fuzzy matching (ignore capitalization, accept common misspellings)

### Type 4: Matching Pairs (NEW)
**Tests:** Vocabulary recall

Two columns: target language words on the left, native translations on the right. Tap one from each side to match. Correctly matched pairs disappear with a satisfying animation.

```
  Match the pairs:
  
  ┌──────────┐          ┌──────────┐
  │  Hund    │──────────│   dog    │  ← matched, fading out
  └──────────┘          └──────────┘
  ┌──────────┐          ┌──────────┐
  │  Katze   │          │  house   │
  └──────────┘          └──────────┘
  ┌──────────┐          ┌──────────┐
  │  Haus    │          │   cat    │
  └──────────┘          └──────────┘
```

- 4-5 pairs per activity
- Words come from the current lesson's chunks + previously learned vocabulary
- Shuffled independently on each side
- Wrong matches: brief red flash, pair stays
- Timer optional for bonus sundrops (complete in under 20s = bonus)

### Type 5: Listen & Type (NEW)
**Tests:** Listening comprehension / spelling

Audio plays a word or short phrase. User types what they hear in the target language.

```
  🔊 [plays audio: "Guten Morgen"]
  
  Type what you hear:
  ┌────────────────────────────┐
  │                            │
  └────────────────────────────┘
  
  [🔊 Replay]     [Check ✓]
```

- Fuzzy matching: accept minor capitalization errors, ignore punctuation
- Show the correct answer after checking, highlighted in green where correct and red where wrong
- Allow 3 replays max

### Type 6: Speak It (STT) (NEW)
**Tests:** Pronunciation / production

Show the target phrase. User taps the microphone and speaks it. STT transcribes and compares.

```
  Say this out loud:
  
  "Wie geht es dir?"
  
  🔊 [Tap to hear it first]
  
  🎤 [Hold to speak]
  
  ────────────────────────
  You said: "Vi get es dir"
  
  Pretty close! ⭐⭐⭐☆☆
  The tricky part is "Wie" — 
  it sounds like "Vee" 🇩🇪
```

**Implementation:**
- Use Groq Whisper for STT (already in the stack)
- "Hear it first" plays TTS of the phrase
- Hold microphone button to record (max 10 seconds)
- Send audio to Whisper for transcription
- Compare transcription to expected text:
  - Exact match: 5 stars, full sundrops
  - Close match (>80% similarity): 3-4 stars, partial sundrops
  - Poor match (<50%): 1-2 stars, no penalty (pronunciation is hard!), encourage retry
- **Never penalize pronunciation attempts** — this is practice, not a test
- Show helpful feedback: which sounds were off, how to pronounce them
- Optional: AI-generated pronunciation tip specific to the mistake

**Privacy note:** Audio is processed via Groq Whisper API and not stored. Include a brief explanation for parents: "Audio is used only for pronunciation checking and is not saved."

### Type 7: True or False (SIMPLE)
**Tests:** Quick comprehension check

Show a target language sentence with a translation. User decides if the translation is correct.

```
  "Guten Morgen" = "Good night"
  
  ┌─────────────┐  ┌─────────────┐
  │   True ✓    │  │   False ✗   │
  └─────────────┘  └─────────────┘
```

Quick, snappy, good for mixing in between harder activities.

---

## Activity Sequencer

**Create `src/lib/services/activitySequencer.ts`:**

The sequencer picks which activity types to use for each lesson section. It should:

1. **Never repeat the same type twice in a row** within a section
2. **Start easy, get harder** within a section (MC → True/False → Fill Blank → Build Sentence → Speak)
3. **Match activity to skill level:**
   - Beginners: mostly MC, True/False, Matching
   - Intermediate: add Fill Blank, Build Sentence
   - Advanced: add Listen & Type, Speak It
4. **Vary across sections** — if section 1 focused on recognition, section 2 should include more production

```typescript
interface ActivitySequence {
  sectionIndex: number;
  activities: ActivityType[];
}

function sequenceActivities(
  sectionCount: number,
  level: UserLevel,
  hasSTT: boolean, // device supports microphone
): ActivitySequence[] {
  const ACTIVITIES_PER_SECTION = 4;
  
  const pools = {
    recognition: ['multiple_choice', 'true_false', 'matching', 'listen_type'],
    production: ['fill_blank', 'build_sentence', 'speak'],
  };
  
  // Beginners: 75% recognition, 25% production
  // Intermediate: 50/50
  // Advanced: 25% recognition, 75% production
  
  // ... selection logic with no-repeat constraint
}
```

**Each activity type needs a deterministic content generator:**

The AI provides the chunk content (target text, translation, related vocabulary). The activity assembler creates the specific activity format deterministically:
- MC: pick correct answer + generate 3 distractors from related vocabulary
- Build Sentence: tokenize target text, add distractor tokens
- Fill Blank: remove a key word, generate alternatives
- Matching: collect chunk pairs from the section
- etc.

This separation (AI = content, code = structure) is critical for reliability.

---

## Testing Checklist

- [ ] Multiple Choice works (all 4 variants)
- [ ] Build the Sentence: drag-and-drop works on mobile
- [ ] Build the Sentence: distractor tiles present
- [ ] Fill in the Blank: both easy (options) and hard (typing) modes
- [ ] Matching Pairs: pairs disappear on correct match
- [ ] Listen & Type: audio plays, text input compares correctly
- [ ] Speak It: microphone records, STT processes, comparison works
- [ ] Speak It: never penalizes poor pronunciation
- [ ] True/False: correct scoring
- [ ] Activity sequencer: no same type twice in a row
- [ ] Activity sequencer: difficulty progression within section
- [ ] All activities integrate with sundrop reward/penalty system
- [ ] All activities have appropriate animations
- [ ] All activity text is translated (en/fr)

---

## Files Created/Modified

**New files:**
- `src/lib/components/activities/BuildSentence.svelte`
- `src/lib/components/activities/MatchingPairs.svelte`
- `src/lib/components/activities/ListenType.svelte`
- `src/lib/components/activities/SpeakIt.svelte`
- `src/lib/components/activities/TrueFalse.svelte`
- `src/lib/components/activities/FillBlank.svelte`
- `src/lib/services/activitySequencer.ts`
- `src/lib/services/activityAssembler.ts` — transforms AI content into activity structures

**Modified files:**
- Lesson generation prompt → structured to provide content for all activity types
- Lesson renderer → switch on activity type to render correct component
- Multiple Choice component → add audio variants
