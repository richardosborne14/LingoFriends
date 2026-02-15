# Task 1.2.2: Chunk Generation Framework

**Status:** Complete ✓
**Phase:** 1.2 (Pedagogy Engine)
**Dependencies:** Task 1.2.1 (Learner Model Schema)
**Completed:** 2026-02-15

---

## Objective

Design and document the framework for AI-driven dynamic chunk generation, including chunk types, difficulty calibration, age-appropriateness, and quality standards.

---

## Key Architectural Decision

**Chunks are AI-generated dynamically**, not pre-seeded from a static library.

### Why Dynamic Generation?

| Aspect | Static Library | Dynamic Generation |
|--------|---------------|-------------------|
| Personalization | Limited (same for all) | Unlimited (adapts to interests) |
| Content freshness | Stale (needs manual updates) | Always fresh |
| User context | Cannot incorporate | Can use user input ("My dog is Max") |
| Real-world language | Curated, may be formal | Natural, conversational |
| Maintenance effort | High (content curation) | Low (prompt refinement only) |

### Target Languages

**Primary Context:** French-speaking children (UI language: French) learning:

| Target Language | Code | Priority |
|-----------------|------|----------|
| English | `en` | Primary |
| German | `de` | Secondary |

---

## Deliverables

### Files Created
- `docs/phase-1.2/chunk-generation-framework.md` — Complete AI generation guidelines ✓

### Files Updated
- `docs/phase-1.2/phase-1.2-overview.md` — Updated to reflect dynamic generation ✓

---

## Chunk Taxonomy

From Michael Lewis's Lexical Approach, we use four chunk types:

| Type | Description | Example (German → French) |
|------|-------------|---------------------------|
| **Polywords** | Fixed multi-word units | `natürlich` = "bien sûr" |
| **Collocations** | Words that naturally co-occur | `eine Entscheidung treffen` = "prendre une décision" |
| **Utterances** | Whole phrases with pragmatic meaning | `Das macht nichts.` = "Ce n'est pas grave." |
| **Frames** | Semi-fixed patterns with variable slots | `Ich möchte ___, bitte.` = "Je voudrais ___, s'il vous plaît." |

---

## Difficulty Calibration (1-5 Scale)

### Level 1: Beginner (A1)
- Length: 2-4 words
- Grammar: Present tense, simple structures
- Vocabulary: High-frequency, concrete
- Age Groups: All (7-10, 11-14, 15-18)

### Level 2: Elementary (A2)
- Length: 3-6 words
- Grammar: Present, simple past, modal verbs
- Vocabulary: Common daily situations
- Age Groups: All

### Level 3: Intermediate (B1)
- Length: 4-8 words
- Grammar: All tenses, some subordinate clauses
- Vocabulary: Abstract concepts, opinions
- Age Groups: 11-14, 15-18 primarily

### Level 4: Upper-Intermediate (B2)
- Length: 6-10 words
- Grammar: Subjunctive, complex structures
- Vocabulary: Idiomatic expressions
- Age Groups: 15-18 primarily

### Level 5: Advanced (C1-C2)
- Length: 8+ words or subtle idioms
- Grammar: All structures flexibly
- Vocabulary: Cultural, metaphorical
- Age Groups: 15-18 only

---

## Interest-Based Generation

### Mapping Interests to Chunks

Chunks are generated based on learner interests from onboarding (`interests-data.ts`):

| Interest ID | Example Chunks (German → French) |
|-------------|----------------------------------|
| `football` | `ein Tor schießen` = "marquer un but" |
| `gaming` | `Level schaffen` = "réussir le niveau" |
| `kpop` / `music` | `das neue Album` = "le nouvel album" |
| `cooking` | `das Rezept ausprobieren` = "tester la recette" |
| `animals` | `ein Haustier haben` = "avoir un animal de compagnie" |
| `travel` | `einen Flug buchen` = "réserver un vol" |

### Custom Interests

Users can type custom interests. The AI generates chunks relevant to those interests.

### Personalization from User Input

User-provided information is incorporated into chunk generation:
- "My dog is named Max" → Personalized frames using the dog's name
- "I play guitar" → Frames like "I've been playing ___ for ___ years"

---

## Age-Appropriateness

### Ages 7-10
- **Focus:** Daily routines, family, friends, basic needs
- **Avoid:** Abstract concepts, complex grammar, formal register
- **Max chunk length:** 6 words

### Ages 11-14
- **Focus:** Social interactions, opinions, hobbies, technology
- **New possibilities:** Expressing opinions, making plans, humor
- **Max chunk length:** 8 words

### Ages 15-18
- **Focus:** Future plans, complex opinions, relationships, culture
- **Full range:** All difficulties, all registers, subtle expressions

---

## Generation Flow

```
1. User starts lesson (selected interest or continuation)
2. Pedagogy Engine determines:
   - Current level (i)
   - Target difficulty (i+1)
   - Recent chunks (for spacing)
   - User context (interests, custom info)
3. AI generates chunks with prompt:
   - Learner profile
   - Target language
   - Difficulty criteria
   - Interest context
   - Quality checks
4. Chunks stored in chunk_library (if new) and user_chunks
5. Lesson activities generated from chunks
6. Performance tracked for SRS scheduling
```

---

## AI Prompt Template

The AI receives structured prompts for chunk generation:

```markdown
You are generating language learning chunks for a French-speaking child learning {TARGET_LANGUAGE}.

**Learner Profile:**
- Age: {AGE_GROUP}
- Target Language: {TARGET_LANGUAGE}
- Current Level: {CEFR_LEVEL}
- Interests: {INTERESTS}
- Custom Context: {USER_PROVIDED_INFO}

**Generation Task:**
Generate {COUNT} chunks for:
- Topic: {TOPIC}
- Difficulty: {DIFFICULTY} (1-5)
- Chunk Types: {TYPES_NEEDED}

**Output Format (JSON):**
[
  {
    "text": "{TARGET_LANGUAGE} chunk",
    "translation": "French translation",
    "chunkType": "utterance|frame|collocation|polyword",
    "difficulty": {DIFFICULTY},
    "notes": "Usage notes",
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

## Quality Standards

### Natural Language Test
Every chunk must pass: **Would a native speaker actually say this?**

### Communicative Utility Test
Ask: **Can the learner use this in real life?**

### Deduplication
Before storing, check for exact text match in same target language.

---

## Testing Checklist

- [x] Chunk types documented
- [x] Difficulty criteria defined
- [x] Age-appropriateness guidelines created
- [x] Interest mapping documented
- [x] AI prompt template designed
- [x] Quality standards defined
- [ ] AI generation tested (Task 1.2.3)
- [ ] Generated chunks validated by native speaker (Task 1.2.3)

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Taxonomy matches PEDAGOGY.md | ✓ |
| Difficulty scale well-defined | ✓ |
| Framework covers all generation scenarios | ✓ |
| Age-appropriateness clear | ✓ |
| Interest mapping aligned with onboarding | ✓ |

---

## References

- **docs/phase-1.2/chunk-generation-framework.md** — Full generation guidelines
- **PEDAGOGY.md** — Section 1 (Lexical Approach)
- **components/onboarding/interests-data.ts** — Available interests
- **src/types/pedagogy.ts** — Type definitions

---

## Notes for Implementation

1. **AI prompt iteration needed** — Test generation with kids for quality
2. **Native speaker review** — Periodically validate generated chunks
3. **Frame slots are high-value** — Prioritize frame generation (one frame = many expressions)
4. **Cultural context matters** — German "Du" vs "Sie" must be noted appropriately
5. **Performance optimization** — Cache recently generated chunks to avoid regeneration