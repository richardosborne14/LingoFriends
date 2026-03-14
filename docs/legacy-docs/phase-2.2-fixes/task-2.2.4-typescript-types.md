# Task 2.2.4: Fix `src/types/pocketbase.ts` Schema Mismatches

**Status:** Not started
**Priority:** 🟡 P2
**Confidence target:** 9/10
**Fixes:** TypeScript types drifting from live PocketBase schema

---

## Objective

Two field mismatches were discovered between `src/types/pocketbase.ts` and the live PocketBase schema during Phase 2.1 testing. These cause silent runtime bugs — TypeScript compiles fine but the wrong field names are sent/received at runtime.

---

## Specific Fixes Required

### Fix A — Remove `growth_stage` field

The `growth_stage` field does not exist in PocketBase. Growth stage is calculated client-side from `sunDropsEarned`. Any code reading `tree.growth_stage` will always get `undefined`.

**Search for usages:**
```bash
grep -r "growth_stage" src/ components/ --include="*.ts" --include="*.tsx"
```

Remove the field from the Tree type and replace any usage with the client-side calculation.

### Fix B — Rename `lessons_completed` → `lessonsCompleted`

PocketBase stored this field in camelCase (`lessonsCompleted`), not snake_case. Any code using `tree.lessons_completed` is reading `undefined` at runtime.

**Search for usages:**
```bash
grep -r "lessons_completed" src/ components/ --include="*.ts" --include="*.tsx"
```

Replace all occurrences with `lessonsCompleted`.

---

## Expected Changes in `src/types/pocketbase.ts`

```typescript
// BEFORE (incorrect)
export interface Tree {
  id: string;
  user: string;
  status: 'seed' | 'growing' | 'bloomed';
  health: number;
  sunDropsEarned: number;
  lessonsCompleted: number;   // ← was: lessons_completed
  lastRefreshDate: string;
  bufferDays: number;
  // growth_stage: string;   // ← REMOVE this line entirely
  created: string;
  updated: string;
}
```

---

## Tree Status Enum Note

The test also confirmed the correct status enum values are `seed`, `growing`, `bloomed` — NOT `sprout`, `struggling`, `recovering`, `dead`. If any component or service uses the old enum values, update those too:

```bash
grep -r "sprout\|struggling\|recovering" src/ components/ --include="*.ts" --include="*.tsx"
```

---

## Files to Update

- **`src/types/pocketbase.ts`** — primary fix location
- Any component or service that reads `growth_stage` or `lessons_completed`

---

## Acceptance Criteria

- [ ] `growth_stage` removed from Tree type (and all usages)
- [ ] `lessons_completed` renamed to `lessonsCompleted` everywhere
- [ ] Old status enum values (`sprout`, `struggling`) replaced with `seed`, `growing`, `bloomed`
- [ ] `tsc --noEmit` passes with no errors
