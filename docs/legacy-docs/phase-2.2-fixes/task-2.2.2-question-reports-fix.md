# Task 2.2.2: Fix `question_reports` User Field

**Status:** Not started
**Priority:** 🔴 P1
**Confidence target:** 9/10
**Fixes:** Suite 05 — 2 of 3 failing assertions

---

## Objective

The `question_reports` collection accepts new records (HTTP 200) but admin queries filtering by user return empty. The `user` field name in PocketBase does not match what the test expects. This needs investigation and a one-line fix.

---

## Failing Assertions (from suite 05)

```
"Report user matches"   — FAIL  expected: "ewmtv0loe2gjlel"  actual: undefined
"Report readable by admin" — FAIL  expected: >0  actual: 0
```

Report creation itself works (HTTP 200, ID assigned). The problem is purely in the schema field naming or index.

---

## Investigation Steps

1. Open PocketBase admin UI → Collections → `question_reports`
2. Check the field list — look for a field that stores the reporting user's ID
3. The field is likely named `reporter`, `userId`, or `reportedBy` — **not** `user`
4. Also check the **list rule** — it may be restricting admin reads

---

## Fix Options

**Option A — Field is named differently (most likely)**

If the field is e.g. `reporter`:
- Update `tests/e2e/05-help-system.test.ts` to filter by `reporter` instead of `user`
- Update `src/types/pocketbase.ts` QuestionReport interface to use the correct field name
- Update any app code that reads/writes this field

**Option B — Field doesn't exist**

If there's no user reference field at all:
- Add a `reporter` relation field (→ users) to the collection via PocketBase admin
- Update types and service code accordingly

**Option C — List rule blocks admin**

If the field name is correct but list rule blocks access:
- Check the list rule in PocketBase admin
- Temporarily set to `""` (empty = admin only) to verify, then set to `@request.auth.id = reporter`

---

## Files to Update

- **`tests/e2e/05-help-system.test.ts`** — Fix filter field name in admin query
- **`src/types/pocketbase.ts`** — Fix `QuestionReport` interface field name
- **`src/services/pocketbaseService.ts`** — Fix any `question_reports` create/query calls

---

## Expected Schema After Fix

```typescript
export interface QuestionReport {
  id: string;
  reporter: string;        // relation → users (was incorrectly typed as 'user')
  question_text: string;
  issue_type: string;      // e.g. "wrong_answer", "unclear", "inappropriate"
  notes?: string;
  created: string;
  updated: string;
}
```

---

## Acceptance Criteria

- [ ] PocketBase admin UI confirms the correct field name
- [ ] `question_reports` list rule confirmed or fixed
- [ ] Types updated to match actual schema
- [ ] Suite 05 assertions "Report user matches" and "Report readable by admin" pass
