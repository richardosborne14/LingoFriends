# Task 2.0.9: 3D Avatar on Lesson Path

**Status:** ✅ COMPLETE  
**Dependencies:** Task 2.0.4 (Path View foundation)  
**Phase:** 2.0 - World Expansion Sprint 2

---

## Objective

Replace the emoji-based avatar on the lesson path with a proper 3D avatar using the same buildAvatar() function from the garden renderer. This provides visual consistency between the garden and path views.

---

## Implementation

### Files Created

1. **`src/components/path/PathAvatar.tsx`** - New component
   - Lightweight Three.js canvas (56px × 56px)
   - Uses same `buildAvatar()` as garden renderer
   - Idle breathing animation (subtle Y-axis oscillation)
   - Eye blink animation (every 3-6 seconds)
   - Transparent background for overlay on path

### Files Modified

1. **`src/components/path/LessonNode.tsx`**
   - Added `avatarOptions` prop for full 3D avatar configuration
   - Added `getAvatarOptions()` helper to convert profile data
   - Replaced emoji circle with `<PathAvatar>` component
   - Maintains bouncing animation for current lesson

---

## Technical Details

### PathAvatar Component

```typescript
export interface PathAvatarProps {
  options?: Partial<AvatarOptions>;
  size?: number;  // default: 56
  className?: string;
}
```

The component:
1. Creates a small Three.js scene with orthographic camera
2. Builds avatar using `buildAvatar()` from `AvatarBuilder.ts`
3. Runs animation loop for:
   - Breathing: `Math.sin(elapsed * 1.5) * 0.015` Y-offset
   - Blinking: Eye scale Y to 0.1 for 120ms every 3-6 seconds
4. Cleans up WebGL resources on unmount

### Camera Setup

Matches garden renderer isometric angle:
- Angle: 45° (PI/4)
- Elevation: 30° (PI/6)
- Distance: 4 units (closer for portrait)
- Looks at upper body (0, 0.5, 0)

### Profile Integration

The `avatarOptions` prop accepts the full `AvatarOptions` from `src/renderer/types.ts`:

```typescript
interface AvatarOptions {
  gender: 'boy' | 'girl';
  shirtColor: number;   // hex
  pantsColor: number;
  hairColor: number;
  skinTone: number;
  hat: 'none' | 'cap' | 'wizard' | 'crown' | 'flower';
  hatColor: number;
}
```

When profile data is available (from `profiles` collection), pass it directly. Falls back to `DEFAULT_AVATAR` for missing fields.

---

## Visual Result

**Before:** 
- Emoji in a 40px colored circle
- Static, no animation

**After:**
- 3D avatar with idle breathing
- Eye blink every 3-6 seconds
- Consistent with garden avatar appearance
- Green gradient border ring
- Bouncing animation on current lesson

---

## Performance Considerations

- Each PathAvatar creates its own WebGL context
- For paths with many lessons, consider:
  - Rendering only visible avatars
  - Using a shared renderer with multiple scenes
  - Disposing avatars when lessons scroll out of view

Current implementation is fine for typical path (5-10 lessons, only current shows avatar).

---

## Testing

1. Navigate to PathView
2. Current lesson should show 3D avatar bouncing
3. Avatar should breathe and blink
4. Check avatar matches garden appearance
5. Verify no WebGL errors in console

---

## Confidence Score: 9/10

**Met:**
- [x] PathAvatar component created with animations
- [x] LessonNode updated to use 3D avatar
- [x] Build succeeds with no errors
- [x] Proper TypeScript types
- [x] Consistent with garden renderer

**Minor Concerns:**
- [ ] Performance not tested with many lessons
- [ ] No lazy loading for WebGL context

**Deferred:**
- Performance optimization for long paths
- Avatar customization UI in profile (separate task)

---

## Next Steps

1. Connect `avatarOptions` from profile in PathView
2. Add transition animation when avatar moves between lessons
3. Consider hover interaction (wave animation?)