# LingoFriends Learnings

Running log of solutions, gotchas, and discoveries. Check this before starting new tasks.

---

## 2025-02-04: Project Kickoff

### Existing Code Structure (from LingoLoft)

**Observation:** The Google AI Studio export has solid foundations.

**Reusable:**
- `types.ts` — Good type definitions, extend for Pocketbase
- `ChatInterface.tsx` — Core UI works, needs voice updates
- `ActivityWidget.tsx` — Quiz, fill-blank, matching all work
- Session management pattern (Main Hall + Lessons)

**Needs Rewrite:**
- `geminiService.ts` — Replace with Groq service
- Audio handling — Browser APIs → Groq Whisper
- Storage — localStorage → Pocketbase

**Apply to:** Task 1.1 (Code Audit)

---

## 2025-02-04: System Prompt Patterns

**Observation:** The existing Gemini system prompt uses JSON actions for structured outputs.

```typescript
// This pattern works well - keep it
{
  "action": "UPDATE_DRAFT",
  "data": {
    "topic": "Past Tense verbs",
    "confidenceScore": 0.6,
    "missingInfo": "Need to know speaking vs writing focus"
  }
}
```

**Gotcha:** Action keys must always be English, even when AI speaks French.

**Apply to:** Task 3.2 (System Prompt Overhaul)

---

## 2025-02-04: Voice Recognition Limitations

**Problem:** Browser's `webkitSpeechRecognition` is unreliable, especially for kids.

**Solution:** Use Groq Whisper instead. More consistent, handles accents and kid voices better.

**Apply to:** Task 4.2 (STT Integration)

---

## 2025-02-04: Lesson Interruptibility

**Problem:** Kids have limited screen time. They MUST be able to leave mid-lesson and resume.

**Solution:** Save session state on:
- `visibilitychange` event (tab hidden)
- `beforeunload` event (window closing)
- Every message send (frequent saves)

**Apply to:** Task 2.4 (Session Persistence)

---

## Template for New Entries

```markdown
## YYYY-MM-DD: Topic

**Problem:** [What went wrong or needed solving]

**Solution:** [How we fixed it]

**Apply to:** [Which tasks/areas this is relevant for]
```

---

## 2026-02-15: Path View Component Design

**Pattern:** For complex path-based UI with multiple positioned nodes, use SVG for the connecting paths and percentage-based positioning for nodes.

**Solution:** 
- Create predefined position arrays as percentages for responsive layout
- Use SVG quadratic curves for smooth winding paths
- Apply different stroke styles (solid/dashed) based on completion status
- Animate with Framer Motion for smooth transitions

**Code Pattern:**
```typescript
const PATH_POSITIONS = [
  { x: 40, y: 12 },  // First lesson (top)
  { x: 65, y: 35 },  // Second
  { x: 35, y: 58 },  // Third
  { x: 55, y: 82 },  // Final (bottom = goal)
];

// SVG path with quadratic curve
<path
  d={`M${currentPos.x} ${currentPos.y} Q${cpX} ${cpY} ${nextPos.x} ${nextPos.y}`}
  stroke={isCompleted ? '#86EFAC' : '#CBD5E1'}
  strokeDasharray={isCompleted ? 'none' : '4 4'}
/>
```

**Apply to:** Game maps, skill trees, quest chains

---

## 2026-02-15: Health-Based Visual Stage Calculation

**Problem:** Tree health needs to map to visual stages with clear boundaries.

**Solution:** Use tiered thresholds rather than linear interpolation for more predictable visual states.

**Code Pattern:**
```typescript
// Health stages with clear boundaries
function getMiniTreeStage(health: number): number {
  const clampedHealth = Math.max(0, Math.min(100, health));
  if (clampedHealth === 0) return 0;      // Empty/seed
  if (clampedHealth < 31) return 1;        // Bare branches
  if (clampedHealth < 61) return 2;        // Some leaves
  if (clampedHealth < 86) return 3;        // Healthy
  return 4;                                // Full bloom
}
```

**Apply to:** Tree/garden health visualization, progress indicators

---

## 2026-02-15: Lesson Node States with Conditional Rendering

**Pattern:** Complex component states (completed/current/locked) benefit from separate styling objects and conditional rendering.

**Solution:**
```typescript
const getNodeStyles = () => {
  if (lesson.status === 'completed') {
    return {
      background: 'linear-gradient(135deg, #34D399, #10B981)',
      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)',
    };
  }
  if (isCurrent) {
    return {
      background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
      boxShadow: '0 0 0 4px rgba(252, 211, 77, 0.5), 0 6px 20px rgba(252, 211, 77, 0.4)',
    };
  }
  return { background: '#E2E8F0', boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)' };
};
```

**Apply to:** Any multi-state interactive components

---

## 2026-02-15: Garden World Avatar Movement System

**Problem:** Implementing smooth avatar movement with keyboard controls and boundary detection.

**Solution:** Use a game loop pattern with `requestAnimationFrame` and a Set to track pressed keys for smooth multi-key movement.

**Code Pattern:**
```typescript
// Track keys pressed (allows diagonal movement)
const keysPressed = useRef<Set<string>>(new Set());

// Game loop runs every frame
useEffect(() => {
  const gameLoop = () => {
    const keys = keysPressed.current;
    setAvatarPosition((prev) => {
      let newX = prev.x;
      let newY = prev.y;
      
      // Multiple keys can be pressed simultaneously
      if (keys.has('ArrowUp') || keys.has('w')) newY -= SPEED;
      if (keys.has('ArrowDown') || keys.has('s')) newY += SPEED;
      if (keys.has('ArrowLeft') || keys.has('a')) newX -= SPEED;
      if (keys.has('ArrowRight') || keys.has('d')) newX += SPEED;
      
      // Clamp to boundaries
      newX = Math.max(PADDING, Math.min(WIDTH - PADDING, newX));
      newY = Math.max(PADDING, Math.min(HEIGHT - PADDING, newY));
      
      return { x: newX, y: newY };
    });
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };
  
  animationFrameRef.current = requestAnimationFrame(gameLoop);
  return () => cancelAnimationFrame(animationFrameRef.current!);
}, []);
```

**Apply to:** Game character movement, canvas games, interactive worlds

---

## 2026-02-15: Proximity Detection for Game Objects

**Problem:** Efficiently detect when player is near interactive objects (trees) without constant re-renders.

**Solution:** Use distance calculation with a threshold and find the nearest object. React's useEffect automatically debounces via the dependency array.

**Code Pattern:**
```typescript
const findNearestTree = (position, trees, maxDistance) => {
  let nearest = null;
  for (const tree of trees) {
    const dx = position.x - tree.position.x;
    const dy = position.y - tree.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < maxDistance && (!nearest || distance < nearest.distance)) {
      nearest = { tree, distance };
    }
  }
  return nearest?.tree ?? null;
};

// React useEffect handles proximity detection
useEffect(() => {
  setNearTree(findNearestTree(avatarPosition, trees, INTERACTION_DISTANCE));
}, [avatarPosition, trees]);
```

**Apply to:** NPC interactions, collectible items, trigger zones

---

## 2026-02-15: Touch Controls for Mobile Games

**Problem:** Desktop keyboard controls don't work on mobile; need touch-friendly alternative.

**Solution:** Create a D-pad component that moves avatar in discrete steps on touch.

**Code Pattern:**
```typescript
// D-pad moves in 20px increments (smoother than continuous)
const TOUCH_MOVE_DELTA = 20;

// Touch handler updates position and facing direction
const handleTouchMove = useCallback((direction) => {
  setAvatarPosition((prev) => {
    const delta = { x: 0, y: 0 };
    switch (direction) {
      case 'up': delta.y = -TOUCH_MOVE_DELTA; break;
      case 'down': delta.y = TOUCH_MOVE_DELTA; break;
      case 'left': delta.x = -TOUCH_MOVE_DELTA; break;
      case 'right': delta.x = TOUCH_MOVE_DELTA; break;
    }
    return {
      x: clamp(prev.x + delta.x, PADDING, WIDTH - PADDING),
      y: clamp(prev.y + delta.y, PADDING, HEIGHT - PADDING),
    };
  });
  setFacing(direction);
}, []);
```

**Apply to:** Mobile game controls, touch interfaces

---

## 2026-02-15: Pocketbase Schema Migration Pattern

**Problem:** Need to add new collections and modify existing collections in Pocketbase without data loss.

**Solution:** Use additive migrations with field existence checks. The v0.36.2 schema format uses `fields` array with unique IDs.

**Key Patterns:**
1. Generate unique field IDs with counter: `field_${Date.now()}_${counter++}`
2. Check if collection exists before creating
3. Check if fields already exist before adding
4. Resolve relation IDs after all collections are created (two-pass approach)
5. Migrate data in a separate step (e.g., `xp_earned` → `sunDropsEarned`)

**Code Pattern:**
```javascript
async function addFieldsToCollection(pb, collectionName, newFields) {
  const collection = await pb.collections.getOne(collectionName);
  const existingFieldNames = collection.fields.map(f => f.name);
  const fieldsToAdd = newFields.filter(f => !existingFieldNames.includes(f.name));
  
  if (fieldsToAdd.length === 0) return; // Skip if already exists
  
  const updatedFields = [...collection.fields, ...fieldsToAdd];
  await pb.collections.update(collection.id, { fields: updatedFields });
}
```

**Collections Created:**
- `skill_paths` — Predefined learning content (public read, admin write)
- `user_trees` — Player's garden trees (owner read/write)
- `gifts` — Social gifting between friends
- `decorations` — Garden customization items

**Fields Added:**
- `profiles`: avatar, avatarEmoji, sunDrops, friendCode, giftsReceived
- `daily_progress`: sunDropsEarned, streak, lastActivityDate

**Apply to:** Any Pocketbase schema migrations, game data models

---

## 2026-02-15: Skill Path Seeding Strategy

**Problem:** Need initial content for game-based learning without manual data entry.

**Solution:** Create seed script with idempotent upsert logic (check existence before creating).

**Content Strategy:**
- 3-5 lessons per skill path for MVP
- Kid-friendly themes: sports, food, animals, travel
- Progressive difficulty within each path
- 5-8 activities per lesson (actual content generated by AI)
- Estimated sunDropsMax based on activity count × average drop value

**Languages Seeded:**
- 🇫🇷 French: 5 paths (15 lessons)
- 🇪🇸 Spanish: 3 paths (9 lessons)
- 🇩🇪 German: 2 paths (6 lessons)
- 🇬🇧 English: 2 paths (6 lessons)

**Apply to:** Content seeding, curriculum initialization

---

## 2026-02-17: Three.js Avatar Polish — Chibi Proportions & Toon Materials

**Problem:** Procedural Three.js avatar looked "silly" — flat Lambert materials, adult proportions, no idle animation.

**Solution:** 
1. **MeshToonMaterial** with subtle emissive glow replaces MeshLambertMaterial for cel-shaded cartoon look
2. **Chibi proportions** — head +20%, body -15%, shorter/rounder limbs
3. **Named mesh parts** — eyes, pupils, arms, legs all get `.name` for animation access via `getObjectByName()`
4. **Walking bob** — Y-axis sine wave during movement (8Hz, amplitude 0.06)
5. **Idle breathing** — subtle Y oscillation when standing (1.5Hz, amplitude 0.02)
6. **Eye blink** — random 120ms blinks every 3-6s by scaling eye meshes to near-zero

**Key Technique — Named Mesh Lookup:**
```typescript
// In AvatarBuilder: name parts during construction
leftEyeWhite.name = 'eye_left';
rightPupil.name = 'pupil_right';

// In GardenRenderer animation loop: find by name
const eyePart = this.state.avatar.getObjectByName('eye_left');
if (eyePart) eyePart.scale.y = 0.1; // blink!
```

**Gotcha:** When adjusting one body part (e.g., head size), ALL dependent parts need repositioning — eyes, mouth, hair, hats. Easy to miss one.

**Apply to:** Any procedural Three.js character, animated game objects

---

## 2026-02-20: Hosted PocketBase Schema Constraints

**Problem:** When working with a hosted PocketBase instance, the admin API might not persist schema changes. The API returns 200 OK but the schema doesn't update. Additionally, some hosted instances have constraints like max text length that weren't visible in the schema API response.

**Solution:**
1. **Language codes instead of names** — Convert language names to ISO 639-1 codes (2 letters) to fit within max-length constraints:
```typescript
function toLanguageCode(language: string): string {
  const codes: Record<string, string> = {
    'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
    'italian': 'it', 'portuguese': 'pt', 'japanese': 'ja', 'chinese': 'zh',
  };
  const normalized = language.toLowerCase().trim();
  return normalized.length === 2 ? normalized : codes[normalized] || normalized.substring(0, 2);
}
```

2. **Fallback profiles** — Service gracefully falls back to in-memory profiles when PocketBase fails:
```typescript
async getOrCreateProfile(userId: string, defaults?: Partial<LearnerProfile>): Promise<LearnerProfile> {
  try {
    return await this.initializeProfile(userId, { ... });
  } catch (error) {
    // PocketBase failed - return in-memory profile so V2 pipeline can continue
    console.warn('[LearnerProfileService] PB failed, using in-memory fallback');
    return createDefaultProfile(userId, ...);
  }
}
```

3. **Virtual column sorts** — PocketBase returns 400 when sorting by virtual columns (`created`, `updated`) without explicit indexes. Remove the sort or ensure index exists:
```typescript
// BAD: Sort on virtual column without index
filter: `user = "${userId}"`,
sort: '-updated',  // 400 error!

// GOOD: No sort on virtual column
filter: `user = "${userId}"`,
// Natural order is acceptable for many use cases
```

**Gotcha:** The PocketBase SDK `collections.update()` returns success even when schema doesn't persist on hosted instances. Always verify with a test record creation after schema changes.

**Apply to:** Hosted PocketBase instances, learner profile service, chunk manager

---

---

## 2026-02-20: PocketBase required:true + value 0 = 400 Error

**Problem:** `learner_profiles` collection was created with all counter fields (`current_level`, `total_sessions`, `chunks_acquired`, etc.) marked `required: true`. Every `initializeProfile()` call failed with HTTP 400 because PocketBase treats **numeric `0` as "blank"** for required validation — same behaviour as an empty string for text fields.

**Solution:** Patch all numeric stat fields to `required: false` via the admin API. These fields represent counters that legitimately start at zero — "required" was semantically wrong for them. The only truly required field is `user` (the relation).

```javascript
// Patch via admin API — run once per environment
const updated = col.fields.map(f =>
  f.type === 'number' && f.name !== 'user' ? { ...f, required: false } : f
);
await fetch(`${PB_URL}/api/collections/${col.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: adminToken },
  body: JSON.stringify({ fields: updated }),
});
```

**Rule for future schema design:** Only mark a PocketBase field `required: true` if:
- It's a relation (`user`, `chunk`) — referential integrity
- It's a short text with no valid "empty" state (`status` select field)
- NEVER for numeric counters or stats that start at 0

**Apply to:** Any new PocketBase collection with numeric/counter fields (`setup-learner-profiles.mjs` now creates them as `required: false`)

---

## 2026-02-20: Lesson Pipeline — Fallback Served Wrong Language

**Problem:** The hardcoded fallback in `lessonGeneratorV2.ts` matched languages by full display name string (`topic.toLowerCase().includes('greetings')`, `langCode === 'German'`). But by the time the fallback ran, `langCode` was an ISO code (`'de'`), not `'German'`. So `langCode === 'German'` was always false → always fell back to French regardless of target language.

**Root cause:** Three separate places in the codebase each had their own language string format:
- Profile stored: `'German'` (full name)
- `toLanguageCode()` returned: `'de'` (ISO code)
- Fallback matched: `'German'` (full name)

**Solution:** Unify on ISO codes everywhere. The fallback now uses `getHardcodedStarterChunks(langCode)` where `langCode` is always an ISO code, and the switch statement uses `'de'`/`'fr'`/`'es'`. The `languageUtils.ts` module is the single source of truth.

**Rule:** Every function that receives or passes a language identifier must use ISO 639-1 codes (`'de'`, `'fr'`, `'en'`). Full names (`'German'`, `'French'`) are only for display. Convert at the boundary, store/compare codes.

**Apply to:** Any future language-aware feature — always convert to ISO code at the point of receipt.

---

## 2026-02-20: Translate.tsx Requires correctAnswer (not just acceptedAnswers)

**Problem:** `Translate.tsx` line 72 guards:
```typescript
if (!data.sourcePhrase || !data.correctAnswer) {
  return <div>Error: Missing activity data</div>;
}
```

But `lessonAssembler.buildRecallStep()` was building translate activities with only `acceptedAnswers` (an array of variants) and NOT `correctAnswer` (the canonical string). Every translate step hit the error boundary with "Missing activity data".

**The .clinerules contract was incomplete:** Rule 6 listed `translate` as requiring only `sourcePhrase` and `acceptedAnswers`. The component also requires `correctAnswer`.

**Solution:**
```typescript
// In buildRecallStep() in lessonAssembler.ts:
activity: {
  type: GameActivityType.TRANSLATE,
  sourcePhrase: chunk.nativeTranslation,
  correctAnswer: chunk.targetPhrase,      // ← REQUIRED by Translate.tsx
  acceptedAnswers: getTranslateAcceptedAnswers(chunk),  // variants
  hint: `It starts with "${chunk.targetPhrase.substring(0, 3)}..."`,
  sunDrops: 3,
},
```

**Rule:** `correctAnswer` is the canonical answer string. `acceptedAnswers` is the full set including case/punctuation variants. The component uses `correctAnswer` for:
1. Guard check (null check)
2. Displaying "the answer is X" after multiple failed attempts
3. The primary comparison in `checkAnswer()`

Both fields are required on translate activities. The validator now enforces this.

**Apply to:** Any new code that builds translate activities. Check the component guard before assuming which fields are optional.

---

## Quick Reference

| Issue | Solution | Entry Date |
|-------|----------|------------|
| Browser STT unreliable | Use Groq Whisper | 2025-02-04 |
| JSON actions need English keys | Document in system prompt | 2025-02-04 |
| Kids need interrupt/resume | Save on visibility change | 2025-02-04 |
| Path-based UI positioning | SVG + percentage positions | 2026-02-15 |
| Health to visual stages | Tiered thresholds | 2026-02-15 |
| Multi-state components | Style objects + conditionals | 2026-02-15 |
| Pocketbase schema migration | Additive with existence checks | 2026-02-15 |
| Content seed for games | Idempotent upsert with themes | 2026-02-15 |
| 3D avatar looks flat | MeshToonMaterial + emissive | 2026-02-17 |
| Avatar proportions for kids | Chibi: head +20%, body -15% | 2026-02-17 |
| Animate named mesh parts | getObjectByName() in tick loop | 2026-02-17 |
| Hosted PocketBase schema constraints | Language codes, fallback profiles | 2026-02-20 |
| PocketBase virtual column sort | Remove sort or add explicit index | 2026-02-20 |
| PocketBase required:true + 0 = 400 | Make counter fields required:false | 2026-02-20 |
| Language fallback wrong language | Match on ISO codes not display names | 2026-02-20 |
| Translate shows "Missing activity data" | Add correctAnswer to buildRecallStep() | 2026-02-20 |
