# Task 5.5: Capacitor Mobile Setup

**Status:** 🔲 Not started
**Phase:** 5 (Social & Deploy)
**Confidence Target:** 7/10
**Estimated Time:** 2h
**Dependencies:** Task 5.4 complete

---

## Objective

Configure Capacitor for iOS and Android builds so the app can run as a native mobile app. Or defer to post-MVP if complexity is too high.

---

## 🤔 Decision Point for User

> **Capacitor adds complexity:** It requires the static adapter (no SSR), which means maintaining two build configurations. The web app already works well on mobile browsers. Should I:
> - **(A) Set up Capacitor now** — native app shells for iOS/Android
> - **(B) Defer to post-MVP** — web-only for now, mobile browser works fine
> - **(C) Just verify mobile web works** — test responsive layout, touch targets, no horizontal scroll
>
> **Recommendation:** Option C for MVP. The web app is mobile-responsive by design. Capacitor adds complexity without much value until we need native APIs (push notifications, offline). Please confirm.

---

## If Proceeding (Option A)

### Implementation

1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init LingoFriends com.lingofriends.app`
3. Configure SvelteKit static adapter for Capacitor builds
4. Add iOS and Android projects
5. Test on simulators

### Tests

Mobile layout verification:
- No horizontal scroll on any page
- All touch targets ≥ 44×44px
- Text readable without zooming
- Keyboard doesn't obscure inputs

---

## If Deferring (Option B or C)

### Implementation

Run mobile browser tests only:
1. Open app on mobile device or emulator
2. Walk through full user journey
3. Document any layout issues in BUGS.md

---

## Acceptance Criteria

**If proceeding:**
- [ ] Capacitor initialised
- [ ] Runs on iOS/Android simulator
- [ ] No layout issues

**If deferring:**
- [ ] Mobile web tested on real device
- [ ] No layout issues documented
- [ ] Deferred note in BUGS.md with rationale

---

## Completion

**Confidence:** ___/10
**Decision:** Proceed / Defer
**Notes:** ___
