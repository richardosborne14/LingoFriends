# Task 5.1: Friends System

**Status:** 🔲 Not started
**Phase:** 5 (Social & Deploy)
**Confidence Target:** 8/10
**Estimated Time:** 3h
**Dependencies:** Phase 4 complete and audited

---

## Mandatory Reads

1. `02-DATABASE-SCHEMA.md` — friendships table

---

## Objective

Build the friend add/accept/decline flow with code-based search. No personal data leakage (children's safety).

---

## Implementation

**Route:** `src/routes/(app)/friends/+page.svelte`

**Add flow:** "Add Friend" button → modal → enter friend code → search → confirm → send request.
**Requests:** Pending requests at top with Accept/Decline buttons.
**List:** Grid of friend cards (avatar, name, streak, SunDrops). Tap → read-only garden snapshot.

**API Routes:**
- `GET /api/friends` — list accepted
- `GET /api/friends/requests` — pending incoming
- `GET /api/friends/search?code=` — search by code (returns ONLY name + avatar, no email/age)
- `POST /api/friends/request` — send
- `POST /api/friends/accept` — accept
- `POST /api/friends/decline` — decline
- `POST /api/friends/remove` — remove

**Safety guards:** Cannot add self. No duplicate requests. Search reveals ONLY display name + avatar.

---

## 🤔 Decision Point for User

> **Privacy:** When searching by friend code, what info is revealed? Recommend ONLY display name + avatar preview. No email, age, or any personal data. Children's safety first.

---

## Tests

```typescript
describe('Friends API', () => {
  it('search finds user by friend code', async () => {});
  it('search returns 404 for invalid code', async () => {});
  it('cannot add yourself', async () => {});
  it('cannot send duplicate request', async () => {});
  it('accept creates bidirectional friendship', async () => {});
  it('decline rejects request', async () => {});
  it('remove deletes friendship', async () => {});
  it('search does not reveal email or age', async () => {});
});
```

## 🖥️ Browser Verification (Two Users)

Uses both dummy accounts (Test Kid + Test Friend):
1. Log in as Test Kid → Friends → "Add Friend" → enter LF-TEST02
2. See "Test Friend" → confirm
3. Log in as Test Friend → Friends → see pending request → Accept
4. Both users now in each other's friend lists
5. Verify friend card shows avatar, name, streak, SunDrops

---

## Acceptance Criteria

- [ ] Add by code works
- [ ] Accept/decline works
- [ ] No personal data leakage
- [ ] Cannot add self or duplicate
- [ ] Tests: 8/8 passing
- [ ] Browser verification passed (two-user flow)

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
