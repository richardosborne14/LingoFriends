# Task 2.1.2: User Journey Test Scenarios

**Status:** 🔲 Not started  
**Estimated Time:** 8–12 hours  
**Dependencies:** Task 2.1.1 (test harness)  
**Output:** `tests/e2e/01-*.test.ts` through `tests/e2e/07-*.test.ts`

---

## Objective

Implement 7 test suites that simulate the complete user journey from sign-up to tree care, entirely via CLI. Each test validates both API correctness (does it work?) and pedagogical correctness (does it work right?).

---

## Test 01: Registration & Profile Creation

**File:** `tests/e2e/01-registration.test.ts`

### Scenario: New user signs up and gets a profile

**Steps:**

1. **Create auth user** via PB API
   - `POST /api/collections/users/create`
   - Body: `{ email, password, passwordConfirm, emailVisibility: true }`
   - **Assert:** 200 response, user ID returned

2. **Authenticate as new user**
   - `POST /api/collections/users/auth-with-password`
   - **Assert:** Token returned, authStore valid

3. **Create profile**
   - `POST /api/collections/profiles/create` (using user token)
   - Body: `{ user: userId, display_name: "TestKid", native_language: "English", target_language: "English", age_group: "11-14", level: "A1", ... defaults }`
   - **Assert:** 200 response, profile record created with all required fields

4. **Read profile back**
   - `GET /api/collections/profiles/records?filter=user="${userId}"`
   - **Assert:** Exactly 1 record, all fields match what was written

5. **Test permission rules**
   - Create a second user
   - Try to read first user's profile with second user's token
   - **Assert:** 403 or empty result (owner-only read)

### Expected PB Issues to Catch
- Missing required fields causing 400 on profile create
- `onboarding_complete` boolean causing validation error when set to `false`
- Permission rules blocking profile read/write for the owning user

### Assertions
- [ ] User created with valid ID
- [ ] Auth token works for subsequent requests
- [ ] Profile has all required fields: `display_name`, `native_language`, `target_language`, `age_group`, `level`, `xp`, `streak`, `sunDrops`, `gems`
- [ ] Profile defaults are correct: `xp=0`, `streak=0`, `sunDrops=0`, `gems=0`
- [ ] Cross-user profile access is blocked

---

## Test 02: Onboarding Configuration

**File:** `tests/e2e/02-onboarding.test.ts`

### Scenario: User completes onboarding and profile is updated

**Steps:**

1. **Create test user with profile** (reuse test 01 setup)

2. **Simulate onboarding step 1: Choose subject**
   - Update profile: `{ subject_type: "language", target_subject: "German" }`
   - **Assert:** Profile updated successfully

3. **Simulate onboarding step 2: Choose interests**
   - Update profile: `{ selected_interests: [{ id: "music", label: "Music", emoji: "🎵" }, { id: "sports", label: "Sports", emoji: "⚽" }] }`
   - **Assert:** Profile updated, interests stored as JSON array

4. **Simulate onboarding step 3: Set native language**
   - Update profile: `{ native_language: "French", target_language: "German" }`
   - **Assert:** Both language fields updated

5. **Mark onboarding complete**
   - Update profile: `{ onboarding_complete: true }`
   - **Assert:** Field is now `true`
   - **Known issue:** PB treats boolean `false` as blank when field is required — verify `true` works

6. **Create initial tree** (first skill path)
   - Create a skill_path record (or find existing one)
   - Create user_tree: `{ user: userId, skillPathId, status: "seed", health: 100, sunDropsEarned: 0, growthStage: 0, gridPosition: { gx: 3, gz: 3 }, lessonsCompleted: 0, lastRefreshDate: now }`
   - **Assert:** Tree created, all fields persisted

7. **Create learner profile**
   - `POST /api/collections/learner_profiles/create`
   - Body: `{ user: userId, native_language: "fr", target_language: "de", current_level: 1, total_chunks_encountered: 0, chunks_acquired: 0 }`
   - **Assert:** Record created successfully

### Assertions
- [ ] All onboarding fields persist correctly
- [ ] `selected_interests` stored as valid JSON
- [ ] `onboarding_complete: true` doesn't cause validation error
- [ ] Tree record created with correct defaults
- [ ] Learner profile created with correct language codes
- [ ] Profile and tree are linked via user ID

---

## Test 03: Lesson Generation & Validation

**File:** `tests/e2e/03-lesson-generation.test.ts`

This is the **most critical test** — it validates that the AI generates valid lesson content and the assembler/validator produce a correct LessonPlan.

### Scenario A: Generate a lesson for a new German learner

**Steps:**

1. **Set up test user** with completed onboarding (German target, English native, interests: music + sports)

2. **Call AI to generate chunk content**
   - Use the same system prompt as `aiPedagogyClient.ts` (PROFESSOR_FINCH_V2)
   - Request: 3 chunks for topic "Greetings", level A1, age 11-14, interests ["music", "sports"]
   - **Assert:** Response is valid JSON matching `AILessonContent` interface

3. **Validate chunk content**
   For each generated chunk, assert:
   - [ ] `targetPhrase` is in German (not English, not French, not Spanish)
   - [ ] `nativeTranslation` is in English
   - [ ] `exampleSentence` is in German and contains the `targetPhrase`
   - [ ] `usageNote` is in English
   - [ ] `explanation` is in English
   - [ ] `distractors` is an array of exactly 3 strings, all in English
   - [ ] `distractors` do NOT contain the correct `nativeTranslation`
   - [ ] `correctUsageContext` is in English
   - [ ] `wrongUsageContexts` is an array of exactly 3 strings, all in English
   - [ ] None of the wrong contexts match the correct context

4. **Run through lessonAssembler** (import the pure TS function)
   - Call `assembleLessonPlan(aiContent)` with the AI output
   - **Assert:** Returns a valid `LessonPlan` object

5. **Run through lessonValidator**
   - Call `validateLessonPlan(plan)`
   - **Assert:** `valid: true`, zero errors
   - **Log:** Any warnings for review

6. **Validate teach-first progression**
   For each chunk, verify the assembled lesson follows:
   - Step 1: `activity.type === 'INFO'` (introduce)
   - Step 2+: Quiz activities (multiple_choice, fill_blank, etc.)
   - No quiz asks about content not yet introduced in an INFO step

7. **Validate activity field completeness**
   For each activity, check all required fields per type:
   - `multiple_choice`: question, options (4), correctIndex (0-3), sunDrops
   - `fill_blank`: sentence, blank, correctAnswer, hint, sunDrops
   - `true_false`: statement, isTrue (boolean), explanation, sunDrops
   - `translate`: sourceText, correctAnswer, targetLanguage, sunDrops
   - `matching`: pairs (array of {left, right}), sunDrops
   - `word_arrange`: words (array), correctOrder (array), sunDrops

8. **Validate SunDrop totals**
   - Sum all `activity.sunDrops` across steps
   - Compare to `plan.totalSunDrops`
   - **Assert:** They match

### Scenario B: Generate a lesson for a French learner (English native)

Repeat Scenario A with `targetLanguage: "French"`, `nativeLanguage: "English"`.
This catches the historical bug where French lessons showed Spanish content.

### Scenario C: Generate a lesson for a German learner (French native)

Repeat with `targetLanguage: "German"`, `nativeLanguage: "French"`.
This catches the case where native language instructions should be in French, not English.

### Scenario D: Generate a lesson with different topics

Run generation for 5 different topics across the same user:
- "Greetings & Introductions"
- "Food & Drinks"
- "Family & Friends"
- "School & Classroom"
- "Sports & Hobbies"

**Assert:** Each lesson covers different vocabulary. No copy-paste between topics.

### Evaluation Scoring

Use the evaluator to produce a `LessonQualityScore` for each generated lesson. Store raw lessons in `results/{timestamp}/lessons/` for manual review.

### Assertions Summary
- [ ] AI returns valid JSON (not malformed, not empty)
- [ ] All target phrases are in the correct target language
- [ ] All native translations are in the correct native language
- [ ] All distractors are in the native language (not the target language!)
- [ ] 3 distractors per chunk, none matching the correct answer
- [ ] Lesson assembler produces valid LessonPlan
- [ ] Lesson validator returns `valid: true` with zero errors
- [ ] Teach-first progression is enforced (INFO before quiz)
- [ ] All activity fields are present and non-empty
- [ ] SunDrop totals are consistent
- [ ] No wrong-language content (the historical critical bug)

---

## Test 04: Lesson Completion & Question Answering

**File:** `tests/e2e/04-lesson-completion.test.ts`

### Scenario: Complete a lesson by answering all questions

**Steps:**

1. **Generate a lesson** (reuse test 03 setup)

2. **Simulate answering each activity correctly**
   For each step in the lesson:
   - If `type === 'INFO'`: Skip (no answer needed)
   - If `type === 'multiple_choice'`: Submit `correctIndex`
   - If `type === 'fill_blank'`: Submit `correctAnswer`
   - If `type === 'true_false'`: Submit `isTrue` value
   - If `type === 'translate'`: Submit `correctAnswer`
   - If `type === 'matching'`: Submit correct pairs
   - If `type === 'word_arrange'`: Submit `correctOrder`
   
   For each correct answer:
   - **Assert:** Activity awards expected SunDrops (full value for first try)

3. **Simulate lesson completion**
   - Call gameProgressService logic (or replicate it):
     - Calculate total sunDrops earned
     - Calculate gems earned: `floor(accuracy% / 20)` = 5 gems at 100%
     - Update profile: add sunDrops, add gems, update streak
     - Update tree: add sunDrops, increment lessonsCompleted, set lastRefreshDate, set health to 100
   - Via PB API: Update the user_tree record
   - Via PB API: Update the profile record

4. **Verify DB state after completion**
   - **Assert:** profile.sunDrops increased by lesson total
   - **Assert:** profile.gems increased by calculated amount
   - **Assert:** profile.streak incremented (or reset if gap)
   - **Assert:** user_tree.sunDropsEarned increased
   - **Assert:** user_tree.lessonsCompleted incremented by 1
   - **Assert:** user_tree.health === 100
   - **Assert:** user_tree.lastRefreshDate is recent (within last minute)

### Scenario B: Answer some questions wrong

1. Generate a lesson
2. Answer first 3 correctly, deliberately answer next 2 wrong, then correct them
3. **Assert:** SunDrops are halved for retry answers (`Math.ceil(base / 2)`)
4. **Assert:** Total sunDrops earned < maximum possible
5. **Assert:** Gems earned reflect lower accuracy

### Scenario C: Skip a question

1. Generate a lesson
2. Skip one question (simulate pressing skip)
3. **Assert:** Skipped question awards 0 sunDrops
4. **Assert:** Overall accuracy decreases

### Assertions
- [ ] Correct first-try answers award full SunDrop value
- [ ] Retry answers award half value (rounded up)
- [ ] Wrong answers deduct 1 SunDrop (floor at 0 per activity)
- [ ] Total lesson SunDrops match sum of activity awards
- [ ] Gems calculation: `floor(accuracy% / 20)`
- [ ] Profile record updated correctly in PB
- [ ] Tree record updated correctly in PB
- [ ] Streak logic: increments if last activity was yesterday, resets if >1 day gap

---

## Test 05: Help System & Question Reporting

**File:** `tests/e2e/05-help-system.test.ts`

### Scenario A: Ask for help on a question

**Steps:**

1. **Generate a lesson** with a specific activity
2. **Build help context** matching what `helpService.ts` sends:
   ```typescript
   {
     currentStep: { activity: { type, data }, tutorText, helpText },
     targetLanguage: "German",
     nativeLanguage: "English",
     userQuestion: "I don't understand this question"
   }
   ```
3. **Call AI help endpoint** with the context
4. **Assert:**
   - Response is in English (native language)
   - Response references the specific activity content
   - Response is encouraging and helpful (not blunt or dismissive)
   - Response does NOT reveal the answer directly (it should hint)
   - `isBrokenQuestion` is `false` (the question is valid)

### Scenario B: Report a deliberately broken question

1. **Craft a broken activity** (e.g., multiple_choice where `correctIndex` exceeds options length)
2. **Call help system** with: "This question seems wrong, the answers don't make sense"
3. **Assert:**
   - AI detects this is a content error, not a comprehension issue
   - Response includes an apology
   - `isBrokenQuestion` is `true`

### Scenario C: Flag a question via report button

1. **Create a question report** in PB:
   ```
   POST /api/collections/question_reports/create
   {
     user_id: userId,
     lesson_id: "test-lesson",
     step_index: 2,
     activity_type: "multiple_choice",
     original_activity: { ... the broken activity JSON ... },
     regenerated_activity: null,
     issue_type: "wrong_language",
     report_source: "button",
     status: "pending",
     ai_provider: "deepinfra"
   }
   ```
2. **Assert:** Record created successfully with all fields
3. **Call regeneration** via AI:
   - Request a new version of the same chunk with corrected content
4. **Assert:**
   - New content passes validation
   - New content is in the correct language
   - Update question_report with `regenerated_activity` and `status: "resolved"`

### Scenario D: Permission test on question_reports

1. Create a report as user A
2. Try to read reports as user A
3. **Assert:** Should be blocked (reports are admin-only read)
4. Read reports as admin
5. **Assert:** Report visible with all fields

### Assertions
- [ ] Help responses are in the native language
- [ ] Help responses reference the specific activity context
- [ ] Broken question detection works (AI recognises content errors)
- [ ] Question reports persist to PB with all required fields
- [ ] Regenerated content passes lessonValidator
- [ ] Permission rules: users can create reports, only admins can read them

---

## Test 06: Reward System Verification

**File:** `tests/e2e/06-rewards.test.ts`

### Scenario A: SunDrop economy

1. **Calculate expected SunDrops for a perfect lesson**
   - Use `sunDropService.calculateEarned()` logic for each activity type
   - Full value first try: 2-4 per activity (varies by type)
   - Lesson completion bonus: +5
   - **Assert:** Total matches `plan.totalSunDrops`

2. **Calculate for a 70% accuracy lesson**
   - 70% of activities correct first try, 30% on retry
   - **Assert:** Total is less than perfect but > 0

3. **Verify daily cap**
   - Set profile.daily_xp_today to 48
   - Complete a lesson worth 10 sunDrops
   - **Assert:** Only 2 sunDrops awarded (cap is 50)

### Scenario B: Gem economy

1. **100% accuracy lesson:**
   - `floor(100 / 20)` = 5 gems
   - **Assert:** 5 gems awarded

2. **60% accuracy lesson:**
   - `floor(60 / 20)` = 3 gems
   - **Assert:** 3 gems awarded

3. **Streak multipliers:**
   - Set streak to 3 → gems × 1.5
   - Set streak to 7 → gems × 2
   - Set streak to 14 → gems × 3
   - **Assert:** Each multiplier applies correctly (rounded down)

### Scenario C: Streak logic

1. **First lesson ever:**
   - No previous `last_activity`
   - **Assert:** Streak = 1

2. **Lesson next day:**
   - Set `last_activity` to yesterday
   - Complete lesson
   - **Assert:** Streak = 2

3. **Lesson after 2-day gap:**
   - Set `last_activity` to 3 days ago
   - Complete lesson
   - **Assert:** Streak resets to 1

4. **Lesson same day:**
   - Set `last_activity` to earlier today
   - Complete lesson
   - **Assert:** Streak stays the same (no double-increment)

### Scenario D: Tree growth stages

1. **Create tree with sunDropsEarned: 0**
   - **Assert:** growthStage = 0 (seed)

2. **Add sunDrops to reach each threshold**
   Per GAME_DESIGN.md growth table:
   - 10 drops → stage 1
   - 25 drops → stage 2
   - 45 drops → stage 3
   - 70 drops → stage 4
   - 100 drops → stage 5
   - ...up to 900+ → stage 14
   - **Assert:** growthStage matches expected value at each threshold

### Assertions
- [ ] SunDrop calculation matches sunDropService logic
- [ ] Daily cap (50) enforced
- [ ] Gem calculation: `floor(accuracy / 20)` with streak multipliers
- [ ] Streak increments correctly (yesterday → +1, gap → reset to 1, same day → no change)
- [ ] Growth stages match GAME_DESIGN.md thresholds
- [ ] Lesson completion bonus (+5 sunDrops) applied

---

## Test 07: Tree Health & Decay

**File:** `tests/e2e/07-tree-health.test.ts`

### Scenario A: Health decay over time

Simulate time passage by directly editing `lastRefreshDate` in PB.

1. **0-2 days since refresh**
   - Set lastRefreshDate to 1 day ago
   - Calculate health
   - **Assert:** health = 100

2. **3-5 days since refresh**
   - Set lastRefreshDate to 4 days ago
   - **Assert:** health = 85

3. **6-10 days since refresh**
   - Set lastRefreshDate to 8 days ago
   - **Assert:** health = 60

4. **11-14 days since refresh**
   - Set lastRefreshDate to 12 days ago
   - **Assert:** health = 35

5. **15-21 days since refresh**
   - Set lastRefreshDate to 18 days ago
   - **Assert:** health = 15

6. **22+ days since refresh**
   - Set lastRefreshDate to 30 days ago
   - **Assert:** health = 5 (minimum, tree never dies completely)

### Scenario B: Gift buffer days

1. **Apply water_drop gift (1 day buffer)**
   - Tree last refreshed 4 days ago → health would be 85
   - Apply 1 water_drop → effective days = 4 - 1 = 3 → still 85 (threshold is 2)
   - Apply 2 more water_drops → effective days = 4 - 3 = 1 → health = 100
   - **Assert:** Buffer calculation is correct

2. **Apply sparkle gift (3 days buffer)**
   - Tree last refreshed 8 days ago → health would be 60
   - Apply 1 sparkle → effective days = 8 - 3 = 5 → health = 85
   - **Assert:** Sparkle provides 3 days of buffer

3. **Apply golden_flower (10 days buffer)**
   - Tree last refreshed 12 days ago → health would be 35
   - Apply 1 golden_flower → effective days = 12 - 10 = 2 → health = 100
   - **Assert:** Golden flower provides 10 days of buffer

### Scenario C: Tree care items (gems)

1. **Check gem balance before purchase**
   - Set profile.gems to 20
   - **Assert:** Can afford Watering Can (15 gems)

2. **Purchase Watering Can**
   - Deduct 15 gems from profile
   - Apply +5 buffer days to tree
   - **Assert:** profile.gems = 5
   - **Assert:** tree.bufferDays increased by 5

3. **Insufficient gems**
   - Try to purchase Sun Lamp (20 gems) with only 5 gems
   - **Assert:** Purchase blocked (gems insufficient)

### Scenario D: Lesson resets health

1. **Set tree health to 35 (11-14 days old)**
2. **Complete a lesson on that tree**
3. **Assert:** tree.health = 100 (lesson "waters" the tree)
4. **Assert:** tree.lastRefreshDate updated to now
5. **Assert:** tree.bufferDays reset to 0

### Scenario E: Trees needing attention

1. **Create 3 trees:**
   - Tree A: health 100 (fresh)
   - Tree B: health 45 (below 50 = needs refresh)
   - Tree C: health 30 (below 40 = dying)
2. **Query trees needing refresh** (health < 50)
   - **Assert:** Returns trees B and C
3. **Query dying trees** (health < 40)
   - **Assert:** Returns only tree C

### Assertions
- [ ] Health decay matches GAME_DESIGN.md schedule exactly
- [ ] Minimum health is 5% (trees never die completely)
- [ ] Gift buffers delay decay start correctly
- [ ] Each gift type provides correct buffer days (water=1, sparkle=3, golden_flower=10)
- [ ] Tree care items deduct correct gem amount
- [ ] Completing a lesson resets health to 100
- [ ] Trees needing refresh correctly identified (health < 50)
- [ ] Dying trees correctly identified (health < 40)

---

## Cleanup Strategy

Each test file should:
1. Track all created record IDs during the test
2. In a `finally` block, delete all created records in reverse order:
   - Delete user_trees
   - Delete learner_profiles
   - Delete profiles
   - Delete users (auth records)
3. Log any cleanup failures (non-blocking)

Use the admin token for cleanup to bypass permission rules.
