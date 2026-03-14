# Task 5.3: Gift System

**Status:** 🔲 Not started
**Phase:** 5 (Social & Deploy)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 5.1 complete

---

## Mandatory Reads

1. `02-DATABASE-SCHEMA.md` — gifts table

---

## Objective

After 3-star lesson completion, earn a random gift. Gifts can be sent to friends or applied to own trees for health boosts.

---

## Implementation

**Gift types:** watering_can (restores 20 health), fertiliser (restores 40 health), decoration (cosmetic, no health).

**Earn flow:** Lesson complete with 3 stars → random gift earned → "Send to friend" or "Keep".
**Send flow:** Select friend → POST /api/gifts/send → gift appears in friend's list.
**Apply flow:** Select tree → POST /api/gifts/apply → tree health increased.

**API:**
- `GET /api/gifts` — list user's gifts
- `POST /api/gifts/send` — send to friend
- `POST /api/gifts/apply` — apply to tree

---

## Tests

```typescript
describe('Gift System', () => {
  it('earns gift on 3-star lesson completion', async () => {});
  it('sends gift to friend', async () => {});
  it('applying watering can increases health by 20', async () => {});
  it('applying fertiliser increases health by 40', async () => {});
  it('cannot send gift you dont own', async () => {});
  it('gift disappears after sending', async () => {});
});
```

---

## Acceptance Criteria

- [ ] Gifts earned on 3-star lessons
- [ ] Send/receive works
- [ ] Apply affects tree health correctly
- [ ] Cannot use gifts you don't have
- [ ] Tests: 6/6 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
