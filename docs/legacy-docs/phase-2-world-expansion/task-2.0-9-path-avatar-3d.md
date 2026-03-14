# Task 2.0.9: 3D Avatar on Lesson Path

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 2  
**Dependencies:** 2.0.4 (Avatar Overhaul)  
**Estimated Time:** 3–4 hours  
**Priority:** Medium — visual consistency improvement

---

## Problem Statement

The PathView (lesson select screen) currently shows an emoji avatar (e.g., 🦊) next to the current lesson node. This was supposed to be replaced with the user's actual 3D avatar, consistent with the garden and encounter views.

---

## Objectives

1. Render the user's 3D avatar in a small Three.js canvas on the PathView
2. Position the avatar next to the current (active) lesson node
3. Avatar should have idle animation (breathing, blink)
4. Avatar moves smoothly when the current node changes (e.g., after lesson completion)
5. Keep the canvas lightweight — single avatar, no scene complexity

---

## Implementation

### Step 1 — Create PathAvatar Component

**File:** `src/components/path/PathAvatar.tsx` (NEW)

A small, self-contained Three.js canvas that renders just the user's avatar:

```typescript
interface PathAvatarProps {
  avatarOptions: AvatarOptions;
  size?: number;         // Canvas size in px (default: 64)
  className?: string;
}

const PathAvatar: React.FC<PathAvatarProps> = ({ avatarOptions, size = 64 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Minimal Three.js scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent
    
    const camera = new THREE.OrthographicCamera(-0.6, 0.6, 0.8, -0.4, 0.1, 10);
    camera.position.set(0, 0.5, 2);
    camera.lookAt(0, 0.3, 0);
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true  // Transparent background
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 2);
    scene.add(dirLight);
    
    // Build avatar
    const avatar = buildCharacter(avatarOptions);
    scene.add(avatar);
    
    // Idle animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      
      // Breathing
      avatar.scale.y = 1 + Math.sin(t * 2) * 0.01;
      
      // Blink (every 3-5 seconds)
      // ... (reuse blink logic from avatar system)
      
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [avatarOptions, size]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      className={className}
      style={{ pointerEvents: 'none' }} // Don't capture clicks
    />
  );
};
```

### Step 2 — Integrate into PathView

**File:** `src/components/path/PathView.tsx`

Replace the emoji avatar with the `PathAvatar` component, positioned next to the active lesson node:

```typescript
// For each lesson node:
{node.status === 'current' && (
  <div className="absolute -left-12 top-1/2 -translate-y-1/2">
    <PathAvatar 
      avatarOptions={userProfile.avatarOptions} 
      size={56}
    />
  </div>
)}
```

### Step 3 — Smooth Position Transition

When the active node changes (e.g., after completing a lesson), animate the avatar sliding to the new node position using CSS transition or Framer Motion:

```typescript
<motion.div
  layout
  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
  className="absolute -left-12"
  style={{ top: currentNodeY }}
>
  <PathAvatar avatarOptions={userProfile.avatarOptions} size={56} />
</motion.div>
```

---

## Testing Checklist

- [ ] 3D avatar renders on PathView next to current node
- [ ] Avatar matches user's customisation (hair, hat, colours)
- [ ] Canvas has transparent background (blends with path UI)
- [ ] Idle breathing animation plays
- [ ] Eye blink works
- [ ] Avatar moves smoothly when active node changes
- [ ] No performance impact (single lightweight canvas)
- [ ] Emoji avatar fully removed from path
- [ ] Works on mobile (small canvas, low poly)

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/path/PathAvatar.tsx` | Small 3D avatar canvas component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/path/PathView.tsx` | Replace emoji with PathAvatar |
| `src/components/path/LessonNode.tsx` | May need layout adjustments |
