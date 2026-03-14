# Step 5: Avatar Polish ✅ COMPLETE

**Priority:** 🟢 MEDIUM
**Estimated effort:** 2-3 hours
**Depends on:** Step 1 (renderer working)
**Completed:** 2026-02-17

---

## Goal

Improve the avatar's appearance. Currently described as "silly looking". The avatar should be a charming, kid-friendly character that fits the evening garden atmosphere.

---

## Current State

`src/renderer/AvatarBuilder.ts` builds a procedural avatar from:
- Body (cylinder)
- Head (sphere)
- Eyes (small spheres)
- Arms and legs (cylinders)
- Hair (varies by style)
- Accessories (hat, glasses, etc.)

The avatar is customizable via `AvatarOptions` (skin color, hair color, hair style, shirt color, accessories).

---

## Issues to Fix

1. **Proportions** — Head/body ratio may be off for a kid-friendly character. Should be slightly "chibi" style (larger head, shorter body)
2. **Materials** — Using basic `MeshLambertMaterial` which looks flat. Consider `MeshToonMaterial` for a more stylized look
3. **Scale** — May be too large or small relative to tiles and trees
4. **Animation** — Walking animation is just position lerp, no bobbing or leg movement
5. **Idle animation** — No breathing or subtle movement when standing still

---

## Suggested Improvements

### Proportions
- Head radius: increase by ~20%
- Body height: decrease by ~15%
- Arms/legs: slightly shorter and rounder

### Materials
- Try `MeshToonMaterial` with gradient map for cel-shaded look
- Or keep Lambert but add slight emissive to make avatar "pop" in dark scene

### Walking
- Add Y-axis bobbing during walk (sine wave, small amplitude)
- Optional: alternating leg movement

### Idle
- Subtle Y-axis breathing (very small sine oscillation)
- Optional: occasional blink (eyes scale to 0 briefly)

---

## Reference

GardenV2.jsx avatar uses simple cylinder body + sphere head with clean proportions. Match that simplicity — don't over-engineer.

---

## Files to Modify

1. `src/renderer/AvatarBuilder.ts` — Proportions, materials, animations

## Testing Checklist

- [x] Avatar looks proportionate and charming in the garden (chibi style)
- [x] Avatar visible against background (MeshToonMaterial + emissive glow)
- [x] Walking animation has subtle bobbing (Y-axis sine wave at 8Hz)
- [x] Idle breathing animation (subtle Y oscillation at 1.5Hz)
- [x] Eye blink animation (random interval 3-6s, 120ms blink)
- [x] All customization options still work (colors, hair, accessories)
- [x] TypeScript compiles with no errors

## Changes Made

### AvatarBuilder.ts
- **Materials:** All `MeshLambertMaterial` → `MeshToonMaterial` with emissive for cel-shaded look
- **Head:** Radius 0.21 → 0.25 (+20% chibi style)
- **Eyes:** Radius 0.04 → 0.045, bigger pupils, named for blink animation
- **Torso:** Height 0.34 → 0.29 (-15% shorter body)
- **Arms/Legs:** Shorter, wider, rounder proportions
- **Hair:** Scaled up to match larger head, all toon material
- **Hats:** Repositioned for new head size, all toon material
- **Named parts:** Eyes, pupils, arms, hands, legs all named for animation access

### GardenRenderer.ts
- **Walking bob:** Y-axis sine bounce during movement (amplitude 0.06)
- **Idle breathing:** Subtle Y oscillation when standing still (amplitude 0.02)
- **Eye blink:** Random 120ms blinks every 3-6 seconds via named mesh lookup
