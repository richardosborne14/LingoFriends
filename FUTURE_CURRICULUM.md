# Future Curriculum: Beyond Language Learning

This document scopes the stretch goal of expanding LingoFriends beyond language learning to help with French school curriculum subjects.

**Status:** Research/Planning (Not for MVP)
**Target Phase:** Phase 3+

---

## Vision

LingoFriends could become a general AI tutor for French schoolchildren, helping with:
- **Scratch/Programming** — Visual coding concepts
- **Maths** — Grade-appropriate arithmetic, algebra, geometry
- **French Grammar & Dictée** — Native language skills
- **Other subjects** — Science, history, geography

The same pedagogical principles (lexical, communicative, coaching) can apply to non-language subjects.

---

## Subject Analysis

### 1. Scratch / Programming

**Feasibility:** ⭐⭐⭐ (Medium)

**What's Possible:**
- Teaching programming concepts conversationally
- Explaining algorithms and logic
- Debugging help (describe your code, AI helps)
- Planning projects before coding

**What's Difficult:**
- Actually running Scratch code in the app
- Visual block manipulation
- Real-time feedback on code

**Potential Approach:**
```
Option A: Companion App
- LingoFriends teaches concepts
- User implements in actual Scratch
- AI reviews screenshots or descriptions

Option B: Text-Based Coding
- Teach Python/JavaScript basics
- Use code execution in app
- Simpler than visual blocks

Option C: Scratch Integration
- Embed Scratch editor (complex)
- Would need significant dev effort
```

**Recommendation:** Start with Option A. Teach concepts conversationally, let them apply in Scratch externally. Lower complexity, still valuable.

**Example Interaction:**
```
User: "I want to make a game where a cat catches fish"

AI: "Fun idea! Let's plan it out. First, what should happen 
when the game starts? 🐱

Think about:
- Where does the cat appear?
- Where do the fish appear?
- How does the cat move?"

[AI guides through game design, then user builds in Scratch]
```

---

### 2. Maths

**Feasibility:** ⭐⭐⭐⭐ (High)

**What's Possible:**
- Conversational problem-solving
- Step-by-step explanations
- Word problem help
- Concept explanations with examples
- Mental math games

**What's Needed:**
- Equation rendering (KaTeX or MathJax)
- Number input handling
- Grade-level problem generation
- Visual aids (graphs, shapes)

**Potential Approach:**
```
Phase 3A: Conversational Maths
- AI explains concepts
- Text-based problem input
- Step-by-step solutions
- Voice input for answers

Phase 3B: Visual Maths
- Rendered equations
- Interactive graphs
- Geometry visualizations
```

**Example Interaction:**
```
User: "Je comprends pas les fractions"

AI: "Pas de souci ! Imagine une pizza 🍕

Si tu coupes la pizza en 4 parts égales et tu en manges 1,
tu as mangé 1/4 (un quart) de la pizza.

Si tu en manges 2 parts sur 4, c'est 2/4.
Mais 2/4, c'est pareil que... la moitié ! 1/2.

Tu veux essayer ? Si je coupe un gâteau en 8 parts
et tu en manges 4, ça fait quelle fraction ?"
```

**French Curriculum Alignment:**
- CP-CE1 (6-8 ans): Addition, subtraction, simple shapes
- CE2-CM1 (8-10 ans): Multiplication, division, fractions intro
- CM2-6ème (10-12 ans): Fractions, decimals, percentages
- 5ème-3ème (12-15 ans): Algebra, geometry, equations

---

### 3. French Grammar & Dictée

**Feasibility:** ⭐⭐⭐⭐⭐ (Very High)

**What's Possible:**
- Grammar explanations
- Dictée exercises (AI reads, child writes)
- Spelling correction
- Conjugation practice
- Accord (agreement) exercises

**What's Needed:**
- TTS for clear French pronunciation (already have!)
- Text comparison for dictée
- Grammar rule database
- Age-appropriate vocabulary lists

**Potential Approach:**
```
This fits perfectly with existing architecture:
- AI reads a sentence (TTS)
- Child types what they hear
- AI compares and corrects
- Explains any errors gently (coaching approach)
```

**Example Dictée Flow:**
```
AI: [Plays audio] "Les enfants jouent dans le jardin."

User types: "Les enfant joue dans le jardin"

AI: "Presque parfait ! Deux petites choses :

1. 'Les enfants' - quand il y a plusieurs enfants, 
   on ajoute un 's' à la fin 👦👧

2. 'jouent' - avec 'ils/elles', le verbe prend '-ent'
   
Tu veux réessayer ?" 
```

**Why This Is Valuable:**
- Dictée is a major part of French education
- Parents struggle to help (pronunciation, rules)
- AI can be infinitely patient
- Immediate, personalized feedback

---

### 4. Other Subjects (Lower Priority)

**Science:**
- Concept explanations
- Experiment guidance (do at home, report back)
- Quiz on topics

**History/Geography:**
- Story-based learning
- Map activities
- Timeline events

**These require more content development but less technical infrastructure.**

---

## Technical Requirements

### For All Subjects

| Need | Solution | Effort |
|------|----------|--------|
| Subject detection | Expand AI system prompt | Low |
| Curriculum alignment | Subject databases | Medium |
| Age adaptation | Already have in PEDAGOGY.md | Low |
| Progress tracking | Extend Pocketbase schema | Low |

### Subject-Specific

| Subject | Key Requirement | Effort |
|---------|-----------------|--------|
| Scratch | External companion approach | Low |
| Maths | Equation rendering (KaTeX) | Medium |
| Dictée | Audio comparison/scoring | Medium |
| Science | Content database | High |

---

## Proposed Roadmap

### Phase 3: French Curriculum Foundation

**Task 12: Research & Planning** (1 week)
- Document French curriculum by grade
- Identify AI-teachable components
- Design unified subject-switching UX
- Create SUBJECT_PEDAGOGY.md

**Task 13: Dictée Module** (2 weeks)
- Audio playback for sentences
- Text input and comparison
- Gentle error correction
- Progress tracking per skill

**Task 14: Maths Module** (3 weeks)
- Equation rendering setup
- Conversational problem-solving
- Grade-level problem bank
- Visual aids for geometry

### Phase 4: Extended Subjects

**Task 15: Scratch Companion** (2 weeks)
- Concept teaching conversations
- Project planning guidance
- No actual Scratch embedding

**Task 16: Grammar Deep Dive** (2 weeks)
- Conjugation practice
- Accord exercises
- Grammar rule explanations

---

## Success Metrics

| Subject | Success Criteria |
|---------|------------------|
| Dictée | 80% of errors correctly identified and explained |
| Maths | Kids report understanding concepts better |
| Scratch | Kids can describe their project plan to AI |
| Grammar | Measurable improvement in school tests (long-term) |

---

## Open Questions

1. **Curriculum accuracy:** How do we ensure alignment with actual French school curriculum? Need teacher input.

2. **Subject switching:** How does the AI know when a child wants maths help vs. language help? Explicit mode switch or auto-detect?

3. **Parental involvement:** Should parents see subject-specific progress? Different permissions?

4. **Content licensing:** Are there existing French curriculum resources we can use?

5. **Teacher collaboration:** Could teachers assign specific topics through LingoFriends?

---

## References

- French Ministry of Education curriculum guides
- Scratch offline editor documentation
- KaTeX/MathJax documentation
- Existing EdTech approaches (Khan Academy, Duolingo ABC)

---

**Note:** This document is for planning only. Do not implement until Phase 1 (MVP) is complete and validated.
