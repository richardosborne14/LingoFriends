# Chunk Generation Framework

**Phase:** 1.2 (Pedagogy Engine)  
**Purpose:** Guidelines for AI-driven dynamic chunk generation  
**Related:** Task 1.2.2, Task 1.2.3, PEDAGOGY.md

---

## Overview

LingoFriends uses **dynamic AI-generated chunks** rather than a pre-seeded library. This approach:

- Adapts content to each learner's interests
- Generates "real world" language based on user context
- Allows unlimited personalization
- Keeps content fresh and relevant

This document provides the framework for the AI (Groq Llama 3.3) to generate high-quality lexical chunks in real-time.

---

## Target Languages

**Primary Context:** French-speaking children (UI language: French) learning:

| Target Language | Code | Notes |
|-----------------|------|-------|
| English | `en` | Primary target for French speakers |
| German | `de` | Second target option |

**Native Language:** French (`fr`) - the UI language and translation target.

---

## The Lexical Chunk

### What is a Chunk?

From Michael Lewis's Lexical Approach, a chunk is a "prefabricated unit of language" that native speakers retrieve as a whole, not constructed word-by-word.

**Example:**
- Not: Learn the word "decision" + learn the verb "make" = "make a decision"
- Instead: Learn the chunk "make a decision" as a single unit

### Why Chunks Matter

1. **Fluency:** Native speakers use thousands of chunks automatically
2. **Naturalness:** Chunks are what people actually say
3. **Efficiency:** One chunk teaches multiple words in context
4. **Grammar without rules:** Patterns emerge from chunks, not from rules

---

## Chunk Types

The AI must generate chunks across four types (from Lewis's taxonomy):

### 1. Polywords (Fixed Expressions)

**Definition:** Multi-word units that function as single words. Cannot be varied.

**Examples (German for French speakers):**
- `natürlich` = "of course" (single meaning unit)
- `trotzdem` = "anyway" / "despite that"
- `im Moment` = "at the moment"
- `zum Beispiel` = "for example"

**Generation Rules:**
- Length: 2-5 words typically
- No variable parts
- Fixed meaning that can't be deduced from parts
- High frequency in native speech

**Prompt Hint:**
```
Generate polywords - fixed expressions that function as single units.
The learner cannot change any word in these phrases.
```

---

### 2. Collocations (Word Partnerships)

**Definition:** Words that naturally co-occur. One word "expects" the other.

**Examples (German for French speakers):**
- `eine Entscheidung treffen` = "to make a decision" (not `eine Entscheidung machen`)
- `eine Frage stellen` = "to ask a question"
- `Stimme geben` = "to give voice/vote"
- `Haare schneiden` = "to cut hair"

**Generation Rules:**
- Focus on verb-noun collocations first (most useful)
- Include adjective-noun pairs (`starke Meinung` = "strong opinion")
- Highlight the "right" combination - what native speakers say
- Note when French differs: `einen Kuss geben` vs French `donner un baiser`

**Prompt Hint:**
```
Generate collocations - word pairs that naturally go together.
Focus on combinations where the learner might make mistakes
by translating word-for-word from French.
```

---

### 3. Institutionalised Utterances

**Definition:** Whole phrases with specific pragmatic meaning. Often situation-specific.

**Examples (German for French speakers):**
- `Ich hätte gern...` = "I would like..." (ordering)
- `Das macht nichts.` = "It doesn't matter." / "No problem."
- `Keine Ahnung.` = "No idea." (casual)
- `Schade!` = "That's a shame!" / "Too bad!"
- `Gute Besserung!` = "Get well soon!"

**Generation Rules:**
- Pragmatic function is key: WHEN would you say this?
- Short, socially useful phrases
- Often informal/spoken register
- Include context in notes field

**Prompt Hint:**
```
Generate institutionalised utterances - complete phrases for
specific situations. Ask: When would a native speaker say this?
Include casual/spoken forms that textbooks often miss.
```

---

### 4. Sentence Frames

**Definition:** Semi-fixed patterns with variable slots that learners can fill.

**Examples (German for French speakers):**

```json
{
  "text": "Ich möchte ___, bitte.",
  "translation": "I would like ___, please.",
  "slots": [
    {
      "position": 2,
      "placeholder": "___",
      "type": "noun",
      "examples": ["einen Kaffee", "ein Bier", "das Menü", "die Rechnung"]
    }
  ]
}
```

```json
{
  "text": "Könntest du mir sagen, wie man ___?",
  "translation": "Could you tell me how to ___?",
  "slots": [
    {
      "position": 5,
      "placeholder": "___",
      "type": "verb-infinitive",
      "examples": ["zum Bahnhof kommt", "das macht", "dorthin komme"]
    }
  ]
}
```

**Generation Rules:**
- Identify the variable part and define its grammatical type
- Provide 5-10 example fillers that fit naturally
- Ensure frame is complete and natural with each example filler
- Frames are the highest-value chunk type (one frame = many expressions)

**Prompt Hint:**
```
Generate sentence frames - patterns with a blank the learner can fill.
Define what type of word/phrase goes in the blank.
Give 5-10 natural examples for the slot.
One frame can teach dozens of expressions.
```

---

## Difficulty Calibration (1-5 Scale)

### Level 1: Beginner (A1)

**Criteria:**
- Length: 2-4 words
- Grammar: Present tense, no subjunctive, simple structures
- Vocabulary: High-frequency, concrete
- Pragmatics: Survival/essentials

**Examples (German):**
- `Guten Tag` = "Bonjour" (hello)
- `Ich heiße...` = "Je m'appelle..." (my name is)
- `Wie viel kostet das?` = "Combien ça coûte ?" (how much)
- `Sprechen Sie Französisch?` = "Parlez-vous français ?"

**Age Groups:** All (7-10, 11-14, 15-18)

---

### Level 2: Elementary (A2)

**Criteria:**
- Length: 3-6 words
- Grammar: Present, simple past (Perfekt), modal verbs
- Vocabulary: Common daily situations
- Pragmatics: Social interactions

**Examples (German):**
- `Ich möchte gerne...` = "Je voudrais..." (I would like)
- `Wo ist die Toilette?` = "Où sont les toilettes ?"
- `Kannst du mir helfen?` = "Peux-tu m'aider ?"
- `Ich verstehe nicht.` = "Je ne comprends pas."

**Age Groups:** All, but context-aware

---

### Level 3: Intermediate (B1)

**Criteria:**
- Length: 4-8 words
- Grammar: All tenses, some subordinate clauses
- Vocabulary: Abstract concepts, opinions
- Pragmatics: Discussion, explanation

**Examples (German):**
- `Ich denke, dass...` = "Je pense que..."
- `Das liegt daran, dass...` = "C'est parce que..."
- `Würdest du mir sagen, ob...?` = "Me dirais-tu si...?"
- `Ich finde es schwierig zu...` = "Je trouve difficile de..."

**Age Groups:** Better for 11-14, 15-18; use simpler context for 7-10

---

### Level 4: Upper-Intermediate (B2)

**Criteria:**
- Length: 6-10 words
- Grammar: Subjunctive, complex structures, passive
- Vocabulary: Idiomatic expressions
- Pragmatics: Nuanced communication

**Examples (German):**
- `Wenn ich an deiner Stelle wäre...` = "Si j'étais à ta place..."
- `Es wäre schön, wenn...` = "Ce serait bien si..."
- `Ich komme damit nicht zurecht.` = "Je n'y arrive pas."
- `Das kommt darauf an.` = "Ça dépend."

**Age Groups:** 15-18 primarily

---

### Level 5: Advanced (C1-C2)

**Criteria:**
- Length: 8+ words or short idiomatic phrases
- Grammar: All structures flexibly
- Vocabulary: Cultural, metaphorical, subtle
- Pragmatics: Sophisticated discussion

**Examples (German):**
- `Je nachdem, wie man es betrachtet...` = "Selon comment on le voit..."
- `Nicht dass du mich falsch verstehst, aber...` = "Que tu ne te méprennes pas, mais..."
- `Das ist ja gut und schön, aber...` = "C'est bien beau, mais..."

**Age Groups:** 15-18 only

---

## Age-Appropriateness

### Ages 7-10

**Characteristics:**
- Concrete thinking
- Immediate contexts (home, school, play)
- Short attention span
- Need visual support

**Content Focus:**
- Daily routines
- Family and friends
- Likes/dislikes
- Basic needs (food, bathroom, tired)

**Avoid:**
- Abstract concepts
- Complex grammar explanations
- Long chunks (>6 words)
- Formal register

**Example Chunks:**
- `Ich habe Hunger.` = "J'ai faim."
- `Kann ich spielen?` = "Je peux jouer ?"
- `Das ist mein/e…` = "C'est mon/ma..."
- `Ich mag...` = "J'aime..."

---

### Ages 11-14

**Characteristics:**
- Social focus (peers)
- Identity formation
- Beginning abstract thinking
- Humor appreciation

**Content Focus:**
- Social interactions
- Opinions and preferences
- School and hobbies
- Technology and media

**New Possibilities:**
- Expressing opinions
- Agreeing/disagreeing
- Making plans with friends
- Talking about trends

**Example Chunks:**
- `Das ist total cool!` = "C'est trop cool !"
- `Willst du mitkommen?` = "Tu veux venir ?"
- `Ich finde...` = "Je trouve que..."
- `Keine Ahnung.` = "Aucune idée."

---

### Ages 15-18

**Characteristics:**
- Abstract reasoning
- Identity and values
- Future orientation
- Near-adult complexity

**Content Focus:**
- Future plans
- Complex opinions
- Relationships
- Current events
- Cultural comparison

**Full Range Available:**
- All difficulty levels
- All registers (formal/informal)
- Subtle expressions
- Cultural context

**Example Chunks:**
- `Ich habe vor, zu...` = "J'ai l'intention de..."
- `Was hältst du von...?` = "Qu'est-ce que tu penses de...?"
- `Ich stimme dir zu, aber...` = "Je suis d'accord, mais..."
- `Je nachdem...` = "Ça dépend..."

---

## Interest-Based Generation

### Mapping Interests to Chunks

Chunks are generated based on learner interests from onboarding. The 40 interests in `interests-data.ts` map to contextual vocabulary:

| Interest | Example Chunks (German → French) |
|----------|----------------------------------|
| Football | `ein Tor schießen` = "marquer un but" |
| Gaming | `Level schaffen` = "réussir le niveau" |
| Music/K-pop | `das neue Album` = "le nouvel album" |
| Cooking | `das Rezept ausprobieren` = "tester la recette" |
| Animals | `ein Haustier haben` = "avoir un animal de compagnie" |
| Travel | `einen Flug buchen` = "réserver un vol" |

### Custom Interests

Users can type custom interests. The AI generates chunks relevant to those interests:

**User Interest:** "Baking"  
**Generated Chunks:**
- `den Teig vorbereiten` = "préparer la pâte"
- `im Ofen backen` = "cuire au four"
- `das Rezept befolgen` = "suivre la recette"

### Personalization from User Input

The AI can incorporate user-provided information:

**User Input:** "My dog is named Max"  
**Personalized Frames:**
- `Ich habe einen Hund. Er heißt Max.` = "J'ai un chien. Il s'appelle Max."
- `Max ist mein Hund.` = "Max est mon chien."
- `Ich gehe mit Max spazieren.` = "Je promène Max."

---

## Quality Standards

### Natural Language Test

Every generated chunk must pass: **Would a native speaker actually say this?**

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `Ich wünsche zu gehen` | `Ich möchte gehen` |
| `Wie ist Ihr Name?` | `Wie heißen Sie?` |
| `Das Buch ist gut` | `Das Buch ist gut` (okay, but bland) |
| (Textbook phrases) | (Real spoken language) |

### Frequency Test

Chunks should be high-frequency. Use corpus data when possible:
- OpenSubtitles frequency data
- DWDS (German)
- COCA (English)

### Communicative Utility Test

Ask: **Can the learner use this in real life?**

| ✅ High Utility | ❌ Low Utility |
|-----------------|----------------|
| `Kann ich die Rechnung haben?` | `Der Apfel ist rot` |
| `Ich komme aus Frankreich` | `Die Katze ist auf dem Tisch` |
| `Was machst du heute?` | `Ich bin müde` (okay but limited) |

---

## AI Generation Prompt Template

When the AI generates chunks, use this prompt structure:

```markdown
You are generating language learning chunks for a French-speaking child learning {TARGET_LANGUAGE}.

**Learner Profile:**
- Age: {AGE_GROUP}
- Target Language: {TARGET_LANGUAGE}
- Current Level: {CEFR_LEVEL} (internal level {INTERNAL_LEVEL}/100)
- Interests: {INTERESTS}
- Custom Context: {USER_PROVIDED_INFO}

**Generation Task:**
Generate {COUNT} chunks for:
- Topic: {TOPIC}
- Difficulty: {DIFFICULTY} (1-5)
- Chunk Types: {TYPES_NEEDED}

**Chunk Type Requirements:**
{CHUNK_TYPE_SPECIFICS}

**Difficulty Criteria for Level {DIFFICULTY}:**
{DIFFICULTY_CRITERIA}

**Age Appropriateness ({AGE_GROUP}):**
{AGE_CRITERIA}

**Output Format (JSON):**
[
  {
    "text": "{TARGET_LANGUAGE} chunk here",
    "translation": "French translation here",
    "chunkType": "utterance|frame|collocation|polyword",
    "difficulty": {DIFFICULTY},
    "notes": "When to use, cultural notes",
    "slots": [...] // For frames only
  }
]

**Quality Checks:**
1. Would a native speaker naturally say this?
2. Is it useful in real communication?
3. Is it age-appropriate?
4. Is it at the right difficulty level?
5. Does it connect to the learner's interests?
```

---

## Storing Generated Chunks

After generation, chunks are stored in the `chunk_library` collection and tracked in `user_chunks`:

```typescript
// Generation flow
1. AI generates chunks based on learner context
2. Check if chunk already exists in library (by text + target_language)
3. If new, create chunk_library entry
4. Create user_chunks entry linking learner to chunk
5. Use chunk in current lesson
6. Track performance for SRS scheduling
```

### Deduplication

Before storing, check for duplicates:
- Exact text match in same target language
- Similar chunks can coexist (different registers, contexts)

### First-Encounter Metadata

When a chunk is first generated for a user:
```typescript
{
  user: userId,
  chunk: chunkId,
  status: 'new',
  first_encountered_in: topicId,
  first_encountered_at: now,
  // ... SRS fields initialized
}
```

---

## Example Generation Session

**Context:**
- Learner: 12-year-old French speaker
- Target Language: German
- Level: A2 (internal: 35/100)
- Interests: `['football', 'gaming', 'music']`
- Topic: "Making plans with friends"

**AI-Generated Chunks:**

```json
[
  {
    "text": "Hast du Lust auf...?",
    "translation": "Tu as envie de...?",
    "chunkType": "frame",
    "difficulty": 2,
    "slots": [
      {
        "position": 3,
        "placeholder": "...",
        "type": "activity",
        "examples": ["Fußball", "Zocken", "Musik hören", "ins Kino gehen"]
      }
    ],
    "notes": "Casual way to suggest an activity to friends. Use with infinitive or noun.",
    "ageAppropriate": ["11-14", "15-18"]
  },
  {
    "text": "Das klingt gut!",
    "translation": "Ça sonne bien !",
    "chunkType": "utterance",
    "difficulty": 1,
    "notes": "Enthusiastic agreement. Very common in casual speech.",
    "ageAppropriate": ["7-10", "11-14", "15-18"]
  },
  {
    "text": "Ich kann nicht, ich muss...",
    "translation": "Je ne peux pas, je dois...",
    "chunkType": "frame",
    "difficulty": 2,
    "slots": [
      {
        "position": 4,
        "placeholder": "...",
        "type": "verb-infinitive",
        "examples": ["lernen", "meine Hausaufgaben machen", "zum Training"]
      }
    ],
    "notes": "Polite refusal with excuse. Very useful for teens.",
    "ageAppropriate": ["11-14", "15-18"]
  },
  {
    "text": "Wollen wir uns treffen?",
    "translation": "On se voit ?",
    "chunkType": "utterance",
    "difficulty": 2,
    "notes": "Direct suggestion to meet up. Casual register.",
    "ageAppropriate": ["11-14", "15-18"]
  },
  {
    "text": "eine Partie spielen",
    "translation": "jouer un match",
    "chunkType": "collocation",
    "difficulty": 2,
    "notes": "Football/gaming collocation. Works for both contexts.",
    "ageAppropriate": ["7-10", "11-14", "15-18"]
  }
]
```

---

## Frame Slot Types

When generating sentence frames, use these slot types:

| Slot Type | Description | German Examples |
|-----------|-------------|-----------------|
| `noun` | A noun or noun phrase | `einen Kaffee`, `das Buch`, `meine Freundin` |
| `verb-infinitive` | Infinitive verb | `gehen`, `essen`, `machen` |
| `verb-phrase` | Verb with complements | `nach Hause gehen`, `das Buch lesen` |
| `adjective` | Adjective | `gut`, `schön`, `interessant` |
| `time` | Time expression | `heute`, `morgen`, `um 3 Uhr` |
| `place` | Location | `im Park`, `zu Hause`, `in der Stadt` |
| `person` | Person reference | `mein Bruder`, `meine Freundin`, `der Lehrer` |
| `activity` | Activity (for leisure topics) | `Fußball`, `Zocken`, `Musik hören` |

---

## Cultural Context Notes

Include cultural notes when relevant:

### German-Specific

| Chunk | Cultural Context |
|-------|------------------|
| `Du` vs `Sie` | Informal vs formal "you". Use `Du` for friends/peers, `Sie` for adults/strangers. |
| `Mahlzeit!` | Lunch greeting used in workplaces. Not used in schools. |
| `Prost!` | Cheers for beer. Use `Zum Wohl` for wine or in formal settings. |
| `Tschüss` | Casual goodbye. `Auf Wiedersehen` is formal. |

### English-Specific

| Chunk | Cultural Context |
|-------|------------------|
| `How are you?` | Often just a greeting, not a real question. Short answer expected. |
| `Sorry` | Used much more than "pardon" in British English. |
| `No worries` | Very common casual response, especially in UK/Australia. |

---

## Evaluation Checklist

After generation, verify:

- [ ] Chunks are natural (not textbook phrases)
- [ ] Difficulty matches the level criteria
- [ ] Age-appropriateness is tagged correctly
- [ ] At least one chunk connects to learner interests
- [ ] Frames have valid slots with 5-10 examples
- [ ] Cultural context notes are included where needed
- [ ] Translation is natural (not literal)
- [ ] Mix of chunk types (not all utterances)

---

## Future Enhancements

**Phase 2:**
- Audio generation for each chunk (TTS)
- Native speaker verification workflow
- Chunk frequency validation against corpora
- A/B testing of chunk variants

**Phase 3:**
- Multi-chunk sequences (dialogues)
- Chunk relationships (synonyms, variations)
- Regional variants (Austrian German, Swiss German)
- Register variants (formal/informal versions)

---

## References

- **PEDAGOGY.md** — Section 1: The Lexical Approach
- **src/types/pedagogy.ts** — TypeScript definitions
- **components/onboarding/interests-data.ts** — Available interests
- **docs/phase-1.2/task-1.2-1-learner-model-schema.md** — Schema definition