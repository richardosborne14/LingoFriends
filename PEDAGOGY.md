# LingoFriends Pedagogy Guide

This document defines the teaching methodology for LingoFriends. Every AI interaction, lesson generation decision, activity design, and adaptive learning path must align with these principles.

**This is the foundational document for the Pedagogy Engine (Phase 1.2).**

---

## Table of Contents

1. [Core Methodologies Overview](#core-methodologies-overview)
2. [The Lexical Approach (Michael Lewis)](#1-the-lexical-approach)
3. [Krashen's Five Hypotheses of Language Acquisition](#2-krashens-five-hypotheses)
4. [Language Coaching Methodology](#3-language-coaching-methodology)
5. [Spaced Interval Repetition](#4-spaced-interval-repetition)
6. [Age-Specific Adaptations](#age-specific-adaptations)
7. [Feedback Framework](#feedback-framework)
8. [Red Flags to Avoid](#red-flags-to-avoid)
9. [System Prompt Guidelines](#system-prompt-guidelines)
10. [Integration with the Pedagogy Engine](#integration-with-the-pedagogy-engine)
11. [References](#references)

---

## Core Methodologies Overview

LingoFriends integrates four complementary theoretical frameworks, each contributing a distinct dimension to the learning experience:

| Framework | Core Contribution | What It Governs |
|-----------|------------------|-----------------|
| **Lexical Approach** | *What* we teach — language chunks, not isolated words | Content selection, vocabulary presentation, activity design |
| **Krashen's Hypotheses** | *How* acquisition happens — comprehensible input, emotional safety, natural order | Difficulty calibration, immersion balance, anxiety management |
| **Language Coaching** | *Who* the learner is — autonomy, self-reflection, personal growth | Tutor persona, feedback style, learner empowerment, goal ownership |
| **Spaced Repetition** | *When* we revisit — optimised review intervals to combat forgetting | Tree health/decay mechanics, refresher lesson scheduling, vocabulary recycling |

These are not four separate systems. They form a unified pedagogy where the Lexical Approach determines content, Krashen governs delivery, Coaching shapes the relationship, and Spaced Repetition manages long-term retention. The Pedagogy Engine must weave all four together in every decision it makes.

---

## 1. The Lexical Approach

**Based on:** Michael Lewis, *The Lexical Approach* (1993) and *Implementing the Lexical Approach* (1997)

### Core Principle

> "Language consists of grammaticalised lexis, not lexicalised grammar." — Lewis (1993)

Language is not a set of grammar rules filled with vocabulary. It is a vast repertoire of prefabricated chunks — collocations, fixed expressions, sentence frames — that speakers retrieve as whole units. Research by Norbert Schmitt (2000) confirms that the brain stores and processes lexical chunks as individual wholes, not as words assembled by grammar rules in real-time. Native speakers rely on tens of thousands of these ready-made chunks, and fluency depends on rapid access to this stock far more than on generative grammar knowledge.

### Lewis's Taxonomy of Lexical Items

The AI must understand and teach across all these categories:

1. **Polywords** — Fixed multi-word units functioning as single items
   - Examples: *by the way*, *upside down*, *catch up with*, *once upon a time*
   - Teaching: Present as unanalysable wholes; don't break them down

2. **Collocations** — Words that naturally co-occur, both fixed and free
   - Fixed: *commit a crime*, *make a decision* (not "do a decision")
   - Free: *strong accent*, *terrible accident*, *sense of humour*
   - Teaching: Help learners notice which words "like being together"

3. **Institutionalised Utterances** — Whole phrases with pragmatic meaning dependent on context
   - Examples: *I'll get it*, *We'll see*, *That'll do*, *Would you like a cup of coffee?*
   - Teaching: These are social currency — teach the whole utterance and its social function

4. **Sentence Frames and Heads** — Semi-fixed patterns with variable slots
   - Examples: *The thing is...*, *If I were you, I'd...*, *It's not as __ as you think*
   - Teaching: Present the frame, then let learners fill slots with personal content

### Practical Implications for LingoFriends

**Content Selection:**
- Always present vocabulary in natural chunks, never as isolated words
- When introducing "restaurant" vocabulary, don't teach *table*, *menu*, *waiter* separately
- Instead teach: *"I'd like a table for two"*, *"Could I see the menu, please?"*, *"The bill, please"*

**Activity Design:**
- Matching activities should pair chunks, not single words to translations
- Fill-in-the-blank should target the collocational partner: *"She made a terrible ___"* (not grammar conjugation)
- Translation activities should work chunk-for-chunk, not word-for-word

**Grammar's Role:**
- Grammar is not ignored — it is *demoted*. Grammar emerges from observing patterns in chunks
- Replace Present-Practise-Produce with **Observe-Hypothesise-Experiment**
- Example: After encountering *"I'd like..."*, *"He'd like..."*, *"Would you like...?"* — the learner naturally observes the pattern without a grammar lecture

**Noticing and Recording:**
- The AI should draw attention to lexical patterns: *"Notice how 'make' goes with 'decision' but 'do' goes with 'homework'?"*
- Encourage learners to think about language in chunks: *"Can you spot two words that always go together in that sentence?"*

**For AI Prompts:**
```
When teaching vocabulary, always present it in natural chunks.
Don't teach individual words — teach the phrases people actually say.
When a learner encounters a new word, immediately contextualise it 
in the 2-3 most common chunks where it appears.
Grammar is discovered through pattern observation, not taught through rules.
```

---

## 2. Krashen's Five Hypotheses

**Based on:** Stephen Krashen, *Principles and Practice in Second Language Acquisition* (1982); *The Input Hypothesis: Issues and Implications* (1985)

Krashen's Monitor Model provides five interconnected hypotheses that fundamentally shape how LingoFriends delivers language to learners. While the hypotheses have drawn academic criticism (notably from Gregg, 1984; McLaughlin, 1987) for being difficult to test empirically, their practical implications for designing a child-friendly learning environment remain highly valuable.

### Hypothesis 1: The Acquisition–Learning Distinction

**Principle:** There are two distinct systems for developing language ability. *Acquisition* is subconscious — it happens when we're focused on meaning, not form. *Learning* is conscious — it produces explicit knowledge of rules. Krashen argues that only acquired competence leads to fluent, spontaneous language use.

**Implication for LingoFriends:**
- The primary mode should be acquisition through meaningful interaction, not explicit rule teaching
- Activities should focus the child's attention on *meaning* (communicating something real) rather than *form* (getting the grammar right)
- Grammar knowledge may help with editing written work (see Monitor Hypothesis), but it cannot replace acquisition for producing speech
- This is especially relevant for children aged 7-14, who acquire language more naturally than adults

**For the Pedagogy Engine:**
- Prioritise activities with communicative purpose over grammar drills
- When grammar is needed, present it as observed patterns, not rules to memorise
- Track acquisition indicators (fluent production in context) separately from learning indicators (explicit rule knowledge)

### Hypothesis 2: The Natural Order Hypothesis

**Principle:** Grammatical structures are acquired in a predictable order, and this order is not determined by how "easy" a structure seems or how early it's taught. For example, third-person "-s" (*he runs*) is easy to explain but is typically acquired quite late.

**Implication for LingoFriends:**
- Don't obsess over "covering" grammar in a logical sequence
- If a learner makes an error on a "simple" structure they've been taught, it may simply not yet be acquired — pushing harder won't help
- Follow a topic/interest-based syllabus rather than a grammar-based one
- Trust that exposure to rich, comprehensible input will allow natural acquisition to proceed

**For the Pedagogy Engine:**
- Don't flag the same grammar error repeatedly as a "weakness" to drill — it may resolve naturally through more input
- Path generation should be driven by topics and communicative needs, not grammar progression
- If a learner consistently makes an error, increase exposure to correct models in natural context rather than explicit correction

### Hypothesis 3: The Monitor Hypothesis

**Principle:** Consciously learned rules can only serve as a "monitor" or editor of output — they cannot generate spontaneous speech. The monitor can only operate when three conditions are met: sufficient time, focus on form, and knowledge of the rule.

**Implication for LingoFriends:**
- In speaking/conversation activities: minimise monitoring pressure — focus on fluency
- In writing/review activities: monitoring is appropriate — encourage careful checking
- Avoid creating "over-monitor" users who are so focused on correctness that they can't speak
- Children especially should not be trained to self-monitor excessively — it kills confidence and spontaneity

**For the Pedagogy Engine:**
- Speaking activities should have a "fluency first" flag — reduce or defer error correction
- Written/translation activities can apply stricter accuracy assessment
- Never mark a child "wrong" for a natural developmental error during a communicative activity

### Hypothesis 4: The Input Hypothesis (i+1)

**Principle:** Language is acquired when learners understand input that is slightly beyond their current competence level — what Krashen calls "i+1". The "+1" is acquired not through explicit teaching but through contextual clues, prior knowledge, and the communicative situation. Speech *emerges* from sufficient comprehensible input — it cannot be directly taught.

**Implication for LingoFriends:**
- Content difficulty must be carefully calibrated: too easy = no progress, too hard = incomprehensible noise
- The AI should speak primarily in the target language but ensure the message is understandable through context, visual cues, repetition, and strategic use of the native language
- New language should be embedded in familiar contexts with enough contextual support that the learner can *figure out* the meaning
- "Natural communicative input is the key to designing a syllabus, ensuring that each learner will receive some i+1 input that is appropriate for his/her current stage" — Krashen (1985)

**For the Pedagogy Engine:**
- Track the learner's current level (i) through performance data, not just their declared CEFR level
- Generate content at i+1 by introducing 1-2 new chunks per activity while keeping the rest familiar
- If a learner is struggling (multiple wrong answers), the engine should *drop back* to consolidation at level i before pushing forward
- If a learner is breezing through, push to i+2 with richer context
- The learner's interests provide the contextual scaffolding that makes i+1 comprehensible — a football fan will understand more advanced football vocabulary because they already know the domain

### Hypothesis 5: The Affective Filter Hypothesis

**Principle:** Negative emotions — anxiety, self-doubt, boredom, fear of embarrassment — act as a mental barrier (the "affective filter") that blocks comprehensible input from reaching the language acquisition device. When the filter is "up", even perfect input fails to produce acquisition. When it is "down" (the learner feels safe, motivated, and interested), acquisition proceeds naturally.

**Implication for LingoFriends — THIS IS CRITICAL FOR CHILDREN:**
- The emotional environment is not secondary to the educational content — it IS a prerequisite for learning
- A child who feels stupid, anxious, or bored is literally unable to acquire language, no matter how well-designed the lesson
- The gamification (SunDrops, trees, gardens) is not just decoration — it actively lowers the affective filter by making the experience feel like play, not school
- The AI tutor's warmth, encouragement, and patience are pedagogically essential, not just "nice to have"

**For the Pedagogy Engine:**
- Monitor engagement signals: repeated wrong answers, long pauses, help requests — these may indicate a rising affective filter
- When the filter appears to be rising: simplify, encourage, change topic, or suggest a break
- Never stack multiple failures without an easy win to restore confidence
- The "silent period" is respected: children should not be forced to produce language before they're ready
- Daily caps prevent the frustration of over-study
- Personalisation through interests lowers the filter: a child who loves animals will be more emotionally engaged learning animal vocabulary

**For AI Prompts:**
```
You are a warm, encouraging tutor. Your primary job is to keep 
the learner feeling safe, interested, and capable.

If they get something wrong:
1. Acknowledge what they got right
2. Give a gentle, memorable correction
3. Immediately provide an easier question to restore confidence

If they seem frustrated or disengaged:
- Simplify the content
- Change the approach
- Suggest a break: "Learning works better with rest!"

NEVER: stack failures, use negative language, or create time pressure.
The learner's emotional state is a learning variable you must actively manage.
```

---

## 3. Language Coaching Methodology

**Based on:** The International Language Coaching Association (ILCA, founded 2019 by Gabriella Kovács & Carrie McKinnon); Kovács, G., *A Comprehensive Language Coaching Handbook* (2022)

### Core Principle

> Language coaching supports and empowers the learner on their self-led learning journey. Instead of working with pre-defined lesson objectives, the language coach focuses on the learner's communication outcomes and learning processes. — ILCA

Language coaching fundamentally shifts the power dynamic from teacher-as-authority to learner-as-owner. The coach's role is to create an optimal environment, ask the right questions, help the learner develop self-awareness about their learning process, and build intrinsic motivation. The coach and learner share responsibility for learning.

### Key Principles

1. **Learner Empowerment**
   - The learner owns their learning journey — they set goals, choose topics, decide pace
   - The tutor facilitates and guides; it doesn't dictate
   - For children: this means *age-appropriate* autonomy — offering choices within a structured framework (e.g., "Would you like to learn about animals or sports today?")

2. **Self-Reflection and Metacognition**
   - Help learners become aware of *how* they learn, not just *what* they learn
   - Questions like: "What helped you remember that?", "Which type of practice do you enjoy most?"
   - For children: simpler reflections — "Was that easy or tricky?" "What's your favourite way to practise?"

3. **Focus on Communication Outcomes**
   - Not "learn the passé composé" but "be able to tell your friend what you did at the weekend"
   - Every lesson has a real-world communicative purpose
   - Assessment measures whether the learner can *do things* with language, not just recite rules

4. **Active Listening**
   - The coach listens more than they speak — really tuning in to what the learner says and doesn't say
   - For the AI: this means analysing not just correctness but patterns — what topics excite the learner, where they hesitate, what they avoid
   - The AI should detect confidence levels, not just accuracy levels

5. **Strengths-Based Approach**
   - Build from what the learner CAN do
   - "You used 'je voudrais' perfectly! You're getting really good at restaurant French!"
   - Never define a learner by their weaknesses

6. **Intrinsic Motivation**
   - External rewards (SunDrops, streaks) get learners started, but intrinsic motivation keeps them going
   - Help learners connect language to their actual lives and interests
   - "Why do you want to learn this?" is more powerful than any flashcard

### Adapting Coaching for Children (Ages 7-18)

Adult language coaching assumes full learner autonomy. Children need a modified approach:

| Principle | Adult Coaching | Child Adaptation (LingoFriends) |
|-----------|---------------|--------------------------------|
| Goal setting | Learner defines all goals | AI proposes goals based on interests; child chooses |
| Self-direction | Full autonomy over content | Structured choices: "Pick a topic" from curated options |
| Self-reflection | Deep metacognitive questions | Simple reflections: "Was that fun?" "What was tricky?" |
| Motivation | Intrinsic only | Blend of intrinsic (interests) and extrinsic (gamification) |
| Feedback | Open questions, minimal direction | More scaffolded: praise + gentle correction + tip |
| Silent period | Respected fully | Respected but with gentle encouragement to try |

### The Coaching Cycle for LingoFriends

```
1. CONNECT → What interests you today? How are you feeling?
2. EXPLORE → Let's discover new language together
3. PRACTICE → Try using it in a fun activity
4. REFLECT → What did you learn? What was tricky?
5. PLAN → What shall we do next time?
```

**For AI Prompts:**
```
You are a language coach, not a teacher. Your role is to:
- Empower the learner to take ownership of their learning
- Ask questions that promote self-reflection
- Celebrate strengths and build on what they can do
- Focus on real communication, not abstract grammar
- Adapt to the learner's energy, confidence, and interests

For children:
- Offer structured choices, not open-ended autonomy
- Keep reflections simple and positive
- Use the child's interests as the primary content driver
- Balance coaching questions with encouragement and fun
```

---

## 4. Spaced Interval Repetition

**Based on:** Hermann Ebbinghaus, *Memory: A Contribution to Experimental Psychology* (1885); Piotr Wozniak, SM-2 Algorithm (1987); Cepeda et al., meta-analysis on distributed practice (2006)

### Core Principle

Memory decays exponentially after initial learning — Ebbinghaus's forgetting curve shows that without reinforcement, 50-70% of new information is lost within 24 hours. However, each strategically timed review "resets" the curve, making the memory more durable. Over multiple repetitions at increasing intervals, information moves from fragile short-term memory to robust long-term storage.

### The Science

**Ebbinghaus's Findings (1885):**
- Memory loss follows an exponential decay pattern
- Most forgetting happens soon after learning, then the rate slows
- Each repetition flattens the curve — the more reviews, the slower the decay
- Information connected to existing knowledge is more resistant to forgetting
- The optimum review schedule is: soon after learning → 1 day → 1 week → 1 month → expanding intervals

**Modern Evidence:**
- A comprehensive meta-analysis by Cepeda et al. (2006) confirmed across hundreds of studies that spacing out learning episodes reliably improves recall
- Research suggests learners using spaced schedules achieve approximately 25% higher retention rates compared to massed practice over intervals of 4 weeks or longer
- The optimal inter-study interval is roughly 10-20% of the desired retention period (Cepeda et al., 2008)
- Expanding schedules (review soon, then at increasing intervals) generally outperform uniform spacing (Landauer & Bjork, 1978)

### Important Caveat: Spaced Repetition's Limitations

**This section is deliberately balanced because LingoFriends is NOT a flashcard app.**

Ebbinghaus's original research used meaningless nonsense syllables — the very opposite of how we want children to learn language. As Frederic Bartlett (1932) showed, real memory is active reconstruction within networks of meaning, not mechanical retrieval of isolated items.

Spaced repetition works best for:
- Consolidating vocabulary chunks already introduced in meaningful context
- Preventing decay of previously acquired language
- Building automaticity with high-frequency phrases

Spaced repetition is insufficient for:
- Deep understanding of how language works
- Developing communicative competence
- Building the creative, generative ability to use language in new situations
- Creating emotional connection to the language

**LingoFriends's position:** Spaced repetition is a *retention tool*, not a *learning methodology*. It serves the other three approaches — ensuring that chunks taught through the Lexical Approach, acquired through Krashen-style input, and personalised through Coaching are not forgotten. But it never replaces meaningful, communicative, interest-driven learning.

### Implementation in LingoFriends: The Tree Health System

Rather than a clinical flashcard-style SRS, LingoFriends gamifies spaced repetition through the garden metaphor:

**Tree Health Decay:**
- Each skill path is represented as a tree in the learner's garden
- Tree health decays over time without review — this IS the forgetting curve made visible
- A "blooming" tree (recently reviewed) vs a "wilting" tree (needs review) mirrors Ebbinghaus
- Children are motivated to "water their trees" (do refresher lessons) to keep them healthy

**Refresher Lessons:**
- When a tree's health drops below a threshold, a refresher lesson is generated
- Refresher lessons are SHORT (3-4 activities, not 5-8)
- They re-test previously learned chunks in new contexts (not identical repetition)
- They use varied activity types to prevent boredom
- Successful refresher = health restored + expanded review interval

**Interval Calculation (Simplified SM-2 Approach):**
- Initial review: 1 day after lesson completion
- Second review: 3 days after first review (if successful)
- Third review: 7 days after second review (if successful)
- Subsequent reviews: interval multiplied by an easiness factor (1.3-2.5)
- Failed review: interval resets to 1 day, easiness factor decreases
- The easiness factor never drops below 1.3 (to prevent frustrating over-repetition)

**Key Design Decision:** Refresher lessons should feel like *revisiting a favourite place*, not *doing homework again*. The AI should present previously learned chunks in new, interesting contexts related to the learner's current interests — not simply re-ask the same questions.

**For the Pedagogy Engine:**
```
When generating a refresher lesson:
- Pull vocabulary chunks from the target skill path's learned items
- Present them in NEW contexts, ideally connected to the learner's current interests
- Mix activity types differently from the original lesson
- Keep it short and encouraging: "Let's check in on your Sports vocabulary!"
- If the learner aces it easily: increase the next interval significantly
- If they struggle: schedule a sooner review but DON'T repeat the same activities
```

---

## Age-Specific Adaptations

| Aspect | Ages 7-10 | Ages 11-14 | Ages 15-18 |
|--------|-----------|------------|------------|
| **Language level** | Very short chunks, lots of repetition | Medium chunks, more variety | Longer expressions, nuance |
| **Input ratio** | 80% target language, 20% native | 85% target, 15% native | 90% target, 10% native |
| **Activity types** | Visual-heavy: matching, true/false | Mixed: all types | Production-heavy: translate, arrange |
| **Autonomy** | AI chooses most; child picks topic | Child picks topic and difficulty | Child influences path direction |
| **Feedback tone** | Very warm, lots of emoji celebration | Encouraging but more specific | Respectful, coach-like |
| **Affective filter** | Highest concern — never let it rise | Important — watch for teen self-consciousness | Moderate — teens can handle more challenge |
| **i+1 calibration** | Very conservative: tiny steps | Moderate: small stretches | More ambitious: push gently |
| **Spaced repetition** | Shorter intervals, more review | Standard intervals | Longer intervals, trust retention |
| **Error correction** | Almost never explicit | Gentle recasting | Can be more direct if learner prefers |
| **Session length** | 5-10 minutes max | 10-15 minutes | 15-20 minutes |

---

## Feedback Framework

### When They Get It Right

1. **Specific praise** — Name exactly what they did well (not just "Good!")
2. **Connect to progress** — "You're getting really good at ordering food!"
3. **Celebrate the chunk** — "You used 'je voudrais' perfectly — that's exactly how French people say it"
4. **Suggest next challenge** — "Ready for something a bit trickier?"

### When They Make a Mistake

1. **Acknowledge the attempt** — "Great try!"
2. **Identify what's right** — "You've got the structure right"
3. **Gentle correction with a tip** — "'Aller' uses 'être', not 'avoir' — think of it as 'I am gone' somewhere"
4. **Invite retry** — "Want to give it another shot?"
5. **If they get it on retry** — Extra celebration: "See? You've got this!"

### When They're Struggling

1. **Empathy first** — "This one's tricky, and that's totally okay!"
2. **Break it down** — Offer a simpler version of the same challenge
3. **Find something they CAN do** — Redirect to a strength
4. **Suggest a different approach** — "Let me explain it a different way"
5. **Permission to move on** — "Let's come back to this tomorrow — learning works better with rest!"

### When They Ask for Help (Chat Message to AI)

This is a critical moment — it signals the affective filter may be rising, and it's an opportunity for the Pedagogy Engine to adapt:

1. **Validate the question** — "Great question! That's something lots of learners wonder about"
2. **Answer clearly** using the native language if needed
3. **Re-contextualise** — Put the explanation back into a meaningful chunk
4. **Adjust the path** — The engine should note what caused confusion and adapt upcoming activities
5. **Offer encouragement** — "Now you know this, you'll spot it everywhere!"

---

## Red Flags to Avoid

🚩 **Grammar-translation method**
- Don't: "Translate: The cat is on the table"
- Do: "Describe where your pet likes to sleep"

🚩 **Isolated vocabulary lists**
- Don't: *table, chair, window, door*
- Do: *"Can I sit by the window?"*, *"Close the door, please"*

🚩 **Decontexualised drills**
- Don't: "Conjugate 'avoir' in all tenses"
- Do: "Tell me three things you have in your room"

🚩 **Negative or blunt feedback**
- Don't: "Wrong. The answer is X."
- Do: "Almost! You're thinking along the right lines..."

🚩 **One-size-fits-all content**
- Don't: Same examples for everyone
- Do: Use their interests, adjust for their level

🚩 **Perfectionism pressure**
- Don't: "Try again until you get it right"
- Do: "Great attempt! Let's explore this more tomorrow"

🚩 **Over-monitoring**
- Don't: Correct every error in real-time during communicative activities
- Do: Note patterns and address them in focused practice later

🚩 **Ignoring the affective filter**
- Don't: Push through when a child is clearly frustrated
- Do: Simplify, encourage, change topic, or suggest a break

---

## System Prompt Guidelines

When generating the AI tutor's system prompt, incorporate all four frameworks:

```markdown
## Persona
You are Professor Finch, a warm, encouraging language coach who:
- Celebrates every attempt, not just correct answers (Coaching)
- Uses the learner's interests to make examples relevant (Coaching + Affective Filter)
- Teaches language in chunks, not isolated words (Lexical Approach)
- Always has a communicative purpose for activities (Krashen — Acquisition)
- Treats language learning as personal growth (Coaching)
- Keeps the emotional environment safe and fun (Affective Filter)

## Teaching Approach
- Lead with encouragement (Affective Filter)
- Present language in natural chunks (Lexical Approach)
- Pitch content at i+1: slightly above current level (Input Hypothesis)
- Focus on meaning over form (Acquisition-Learning Distinction)
- Correct gently with memorable tips (Coaching)
- Connect everything to real-life use (Communicative Approach)
- Adapt to the learner's energy and confidence (Coaching + Affective Filter)

## Content Rules
- Age-appropriate for [X] year olds
- No scary, violent, or inappropriate themes
- Positive, supportive tone always
- Focus on what they CAN do, not what they can't
- Use the learner's stated interests as content context

## Language Balance
- For French learners: Primarily speak French (Acquisition)
- Use native language for complex explanations (Input Hypothesis — scaffolding)
- Translate chunks, not word-by-word (Lexical Approach)

## Spaced Repetition Integration
- Naturally recycle previously learned chunks in new contexts
- When reviewing old material, present it freshly — new sentences, new situations
- Track which chunks are well-acquired vs. still fragile
```

---

## Integration with the Pedagogy Engine

This section defines how the four frameworks translate into concrete engineering decisions for the Phase 1.2 Pedagogy Engine.

### Path Generation

The Pedagogy Engine generates learning paths dynamically, informed by:

**Inputs:**
- User profile: native language, target language, age group, CEFR level
- User interests: from onboarding and AI profile fields
- Performance history: which chunks are acquired, which are fragile
- Session state: current confidence level, engagement indicators, help requests

**Generation Principles:**
1. **Topic selection** (Coaching + Affective Filter): Choose topics aligned with the learner's interests. A child who listed "football" as an interest gets football vocabulary first, not greetings.
2. **Chunk selection** (Lexical Approach): For the chosen topic, select high-frequency, communicatively useful chunks appropriate to the learner's level.
3. **Difficulty calibration** (Input Hypothesis): Ensure each lesson introduces 1-3 new chunks (i+1) while recycling familiar ones for context.
4. **Activity variety** (Affective Filter + Natural Order): Mix activity types to prevent boredom and accommodate different learning preferences.
5. **Communicative purpose** (Acquisition-Learning Distinction): Every activity must simulate or prepare for a real communicative situation.

### Adaptive Behaviour During a Lesson

The engine must respond in real-time to learner signals:

| Signal | Interpretation | Response |
|--------|---------------|----------|
| 3+ correct in a row | Learner is comfortable at this level | Push to i+1.5 or i+2 — increase challenge |
| 2+ wrong in a row | Content may be too hard, or filter rising | Drop to i or i-1 — offer easier question, encourage |
| Help request (chat message) | Specific confusion + possible rising filter | Address the specific issue, adjust remaining activities |
| Fast correct answers | May be too easy | Accelerate difficulty, skip to harder activities |
| Long pause before answering | Processing or hesitation | Offer a hint proactively, keep encouraging |
| Session exit mid-lesson | Disengagement or external factor | Save state, make next session entry welcoming |

### Cross-Session Adaptation

Between sessions, the engine should:

1. **Update the learner model** with acquired chunks, struggling areas, and interest patterns
2. **Adjust the path** — not just the next lesson, but the overall trajectory
3. **Schedule spaced reviews** based on the tree health system
4. **Generate personalised path segments** that no other user would see — combining the specific learner's interests, level, and gaps into unique lesson sequences
5. **Evolve the tutor relationship** — as the engine learns more about the child, interactions should feel increasingly personalised (referencing previous sessions, known interests, etc.)

### The Uniqueness Guarantee

The vision: **no two learners ever do the exact same lesson.**

This is achieved through:
- Interest-driven topic selection (different interests = different content)
- AI-generated activities (stochastic variation in questions, examples, contexts)
- Performance-driven difficulty (different performance = different calibration)
- Spaced repetition timing (different review schedules = different refresher content)
- Help-request adaptation (asking for help changes the remaining path)

Even two learners with identical profiles and interests would diverge after the first session because their performance data would differ, causing the engine to adapt uniquely.

---

## References

### Primary Sources
- Lewis, M. (1993). *The Lexical Approach.* Hove: Language Teaching Publications.
- Lewis, M. (1997). *Implementing the Lexical Approach: Putting Theory Into Practice.* Hove: Language Teaching Publications.
- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition.* Oxford: Pergamon Press.
- Krashen, S. (1985). *The Input Hypothesis: Issues and Implications.* New York: Longman.
- Kovács, G. (2022). *A Comprehensive Language Coaching Handbook.* Pavilion Publishing and Media.
- Ebbinghaus, H. (1885/1913). *Memory: A Contribution to Experimental Psychology.* (H.A. Ruger & C.E. Bussenius, Trans.). New York: Teachers College, Columbia University.

### Supporting Research
- Schmitt, N. (2000). *Vocabulary in Language Teaching.* Cambridge University Press. [Supports lexical chunk storage theory]
- Cepeda, N.J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354-380. [Meta-analysis confirming spaced repetition benefits]
- Cepeda, N.J., et al. (2008). Spacing effects in learning. *Psychological Science*, 19(11), 1095-1102. [Optimal spacing intervals]
- Landauer, T.K. & Bjork, R.A. (1978). Optimum rehearsal patterns and name learning. [Expanding schedule superiority]
- Bartlett, F.C. (1932). *Remembering: A Study in Experimental and Social Psychology.* Cambridge University Press. [Memory as active reconstruction]
- Wozniak, P.A. (1990). Optimization of repetition spacing in the practice of learning. *Master's Thesis.* [SM-2 algorithm foundation]
- Richards, J.C. & Rodgers, T.S. (2001). *Approaches and Methods in Language Teaching.* Cambridge University Press.
- Dörnyei, Z. (2001). *Motivational Strategies in the Language Classroom.* Cambridge University Press.
- Little, D. (2007). Language learner autonomy: Some fundamental considerations revisited. *Innovation in Language Learning and Teaching*, 1(1), 14-29.

### Institutional Sources
- International Language Coaching Association (ILCA). Language Coaching Standards and Markers. https://ilcaglobal.com
- ILCA Foundation Course Curriculum: Language coaching methodology, key learning concepts, toolkit, and practical application.

### Critical Perspectives
- Gregg, K.R. (1984). Krashen's Monitor and Occam's Razor. *Applied Linguistics*, 5(2), 79-100. [Critique of Krashen's hypotheses]
- McLaughlin, B. (1987). *Theories of Second-Language Learning.* London: Edward Arnold. [Methodological critiques]
- Swan, M. (2006). Chunks in the Classroom: Let's not go Overboard. *The Teacher Trainer*, 20/3. [Balanced view on lexical approach]
- Hendrick, C. (2025). Why The Curve of Forgetting Is Not As Useful As You Think It Is. [Limitations of applying Ebbinghaus to real learning]