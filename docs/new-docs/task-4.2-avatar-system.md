# Task 4.2: Avatar System

**Status:** 🔲 Not started
**Phase:** 4 (Garden & Avatars)
**Confidence Target:** 8/10
**Estimated Time:** 2h
**Dependencies:** Task 4.1 complete

---

## Objective

Build the player avatar from profile data (skin tone, hair colour, shirt colour, hat). Avatar walks to tapped garden positions with smooth animation.

---

## Implementation

`src/lib/three/avatars/AvatarBuilder.ts`:
- Build character from geometry (cylinder body, sphere head, colour customisation)
- Apply `MeshToonMaterial` with profile colours
- Walking: lerp position to target over 500ms
- Idle: subtle breathing bob animation
- Stay within garden bounds

---

## 🤔 Decision Point for User

> **Avatar style:** (A) Geometry avatar like V1 (fast, consistent), (B) glTF Quaternius model (better looking, needs loader). Recommend A for garden, B for NPC encounters (Task 4.4) — avoids blocking garden on model loading.

---

## Tests

```typescript
describe('AvatarBuilder', () => {
  it('creates avatar mesh from profile options', () => {});
  it('applies correct skin tone', () => {});
  it('applies hat when specified', () => {});
  it('walking lerp reaches target position', () => {});
});
```

---

## Acceptance Criteria

- [ ] Avatar renders with profile customisation
- [ ] Walking animation smooth
- [ ] Stays within garden bounds
- [ ] Tests: 4/4 passing

---

## Completion

**Confidence:** ___/10
**Tests:** ___/___ passing
