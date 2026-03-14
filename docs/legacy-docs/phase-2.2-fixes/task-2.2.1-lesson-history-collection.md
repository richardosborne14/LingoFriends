# Task 2.2.1: Create `lesson_history` PocketBase Collection

**Status:** Not started
**Priority:** 🔴 P1
**Confidence target:** 9/10
**Fixes:** Suite 04 WARN → PASS

---

## Objective

Create the `lesson_history` collection in PocketBase so completed lesson records can be persisted. Currently the collection doesn't exist, causing test suite 04 to warn on every run. The app also has no way to show a learner their past lesson history.

---

## What to Build

### PocketBase Collection Schema

Collection name: `lesson_history`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user` | Relation → `users` | ✅ | One record per user per lesson |
| `lesson_title` | Text | ✅ | e.g. "German Greetings" |
| `target_language` | Text | ✅ | e.g. "German" |
| `native_language` | Text | ✅ | e.g. "English" |
| `xp_earned` | Number | ✅ | Integer, ≥ 0 |
| `sun_drops_earned` | Number | ✅ | Integer, ≥ 0 |
| `total_steps` | Number | ✅ | Total lesson steps |
| `completed_steps` | Number | ✅ | How many were completed |
| `score_percentage` | Number | ✅ | 0-100 |
| `completed_at` | Date | ✅ | Timestamp of completion |

### Collection Rules

```
listRule:  @request.auth.id = user
viewRule:  @request.auth.id = user
createRule: @request.auth.id != ""
updateRule: "" (no updates — lesson history is append-only)
deleteRule: "" (no deletes)
```

### Files to Update

- **`src/types/pocketbase.ts`** — Add `LessonHistory` interface
- **`src/services/pocketbaseService.ts`** — Add `saveLessonHistory()` function
- A migration script if needed: `scripts/migrate-lesson-history.cjs`

---

## Implementation Notes

```typescript
// In src/types/pocketbase.ts
export interface LessonHistory {
  id: string;
  user: string;
  lesson_title: string;
  target_language: string;
  native_language: string;
  xp_earned: number;
  sun_drops_earned: number;
  total_steps: number;
  completed_steps: number;
  score_percentage: number;
  completed_at: string; // ISO date string
  created: string;
  updated: string;
}
```

```typescript
// In src/services/pocketbaseService.ts
export async function saveLessonHistory(data: Omit<LessonHistory, 'id' | 'created' | 'updated'>): Promise<LessonHistory> {
  return pb.collection('lesson_history').create(data);
}
```

The calling code (wherever a lesson is marked complete) should call `saveLessonHistory()` after updating XP/SunDrops on the profile.

---

## Testing

The test in `tests/e2e/04-lesson-completion.test.ts` already has this assertion:

```
"lesson_history collection exists (Phase 2.1+)" — currently FAIL
```

Once the collection is created, this assertion will pass automatically on the next test run.

Manual test:
1. Complete a lesson in the app
2. Query `lesson_history` via PocketBase admin — record should appear
3. Query as a different user — should return empty (permission check)

---

## Acceptance Criteria

- [ ] Collection exists in PocketBase with all 10 fields
- [ ] Permissions set: owner read/create, no update/delete
- [ ] `LessonHistory` TypeScript interface added
- [ ] `saveLessonHistory()` service function added
- [ ] Suite 04 test assertion passes
