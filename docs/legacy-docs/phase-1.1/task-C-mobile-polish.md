# Task C — Mobile Polish

**Status:** ✅ Complete  
**Phase:** 1.1  
**Depends on:** Task A (shop categories), Task B (Pocketbase wiring)

---

## Goal

Ensure LingoFriends renders correctly on real iOS and Android devices:
- No content hidden behind notch / Dynamic Island / home indicator
- D-pad visible above the tab bar
- Garden canvas survives orientation change without a black flash
- Floating shop button clears the tab bar safe area
- Reasonable draw call budget on mid-range Android

---

## What Was Done

### 1. `index.html` (already complete before this task)
- `viewport-fit=cover` + `user-scalable=no` + `overscroll-behavior: none`
- `#root { padding: env(safe-area-inset-top) … env(safe-area-inset-bottom) }`
- Global `button { min-height: 44px; min-width: 44px }` — all tap targets 44 × 44 px

### 2. `GardenRenderer.ts`
- Replaced `window.addEventListener('resize', …)` with **ResizeObserver** on the canvas element
- ResizeObserver fires on orientation changes and browser-chrome show/hide (e.g. iOS address bar) — `window.resize` does not
- Private field `resizeObserver: ResizeObserver | null = null` added
- `dispose()` disconnects the observer before freeing the WebGL context

### 3. `GardenWorld3D.tsx` (CSS)
- Added `min-height: 300px` to `.garden-world` to prevent the canvas collapsing below 300 px in landscape on small iPhones (SE, mini)

### 4. `GardenDPad.tsx`
- Removed `bottom-6` Tailwind class
- Added inline style:
  ```
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px))
  ```
  → 88 px baseline + safe-area offset guarantees D-pad clears the fixed tab bar on all iPhones

### 5. `AtmosphereBuilder.ts`
- `addDaytimeClouds()` now caps at **4 clouds** on mobile (`window.innerWidth < 768`)
- Each cloud = 5 sphere draw calls; saving one cloud = −5 draw calls per frame
- Inline `window.innerWidth` check keeps the Three.js renderer free of React imports

### 6. `App.tsx`
- **`<main>`** padding: replaced `pb-20` class with inline style:
  ```
  paddingBottom: max(5rem, calc(3.5rem + env(safe-area-inset-bottom, 0px)))
  ```
  → max(80px, 90px) = 90 px on iPhone 14 Pro; stays 80 px on Android/desktop
- **Shop button** `🛒`: removed `bottom-24` class, added inline style:
  ```
  bottom: calc(6rem + env(safe-area-inset-bottom, 0px))
  ```
  → button always sits above the inflated tab bar on newer iPhones

---

## Files Changed

| File | Change |
|---|---|
| `src/renderer/GardenRenderer.ts` | ResizeObserver, field decl, dispose cleanup |
| `src/components/garden/GardenWorld3D.tsx` | `min-height: 300px` on `.garden-world` |
| `src/components/garden/GardenDPad.tsx` | Safe-area-aware `bottom` inline style |
| `src/renderer/AtmosphereBuilder.ts` | 4 clouds on mobile, inline `isMobile` check |
| `App.tsx` | `<main>` pb + shop button safe area inline styles |

---

## Confidence: 8/10

**Met:**
- [x] Safe area insets applied throughout the layout chain
- [x] D-pad clears tab bar on all modern iPhones (SE → Pro Max)
- [x] Canvas resize works on orientation change (ResizeObserver)
- [x] Landscape min-height prevents garden collapse
- [x] Shop button never overlaps tab bar
- [x] Mobile draw call reduction (-5 calls/frame on phones)
- [x] No TypeScript errors introduced

**Concerns:**
- [ ] Cannot verify on real device without physical testing — layout math based on published Apple specs (safe-area-inset-bottom = 34pt on iPhone 14 Pro)
- [ ] `window.innerWidth` cloud check runs at scene construction time; won't re-evaluate on orientation change (acceptable — cloud count is cosmetic)

**Deferred:**
- [ ] Pinch-to-zoom gesture lock on canvas (not needed for MVP, kids unlikely to pinch 3D garden)
- [ ] Haptic feedback on D-pad press (Phase 2)
