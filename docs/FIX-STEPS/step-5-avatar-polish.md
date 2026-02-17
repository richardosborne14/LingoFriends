# Step 5: Avatar Polish

**Priority:** 🟢 MEDIUM
**Estimated effort:** 2-3 hours
**Depends on:** Step 1 (renderer working)

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

- [ ] Avatar looks proportionate and charming in the garden
- [ ] Avatar visible against dark evening background
- [ ] Walking animation has subtle bobbing
- [ ] Avatar doesn't clip through tiles or trees
- [ ] All customization options still work (colors, hair, accessories)
