# Task 1.1.18: Avatar Customization

**Status:** Not Started
**Phase:** D (Polish)
**Dependencies:** Task 1.1.14 (Three.js Garden Renderer)
**Estimated Time:** 3–4 hours

---

## Objective

Implement the avatar customization UI that allows players to personalize their in-garden character. This builds on the `AvatarBuilder` from Task 1.1.14 and adds a React UI for selecting options.

**Reference:** `docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md` — Avatar builder specification
**Prototype:** `docs/phase-1.1/GardenV2.jsx` — Working AvatarCustomiser component

---

## Deliverables

### Files to Create
- `src/components/garden/AvatarCustomiser.tsx` — Customization panel UI
- `src/hooks/useAvatar.ts` — Avatar state and persistence

### Files to Modify
- `src/types/game.ts` — Add `AvatarOptions` type
- `src/renderer/AvatarBuilder.ts` — Ensure all options are supported

---

## Avatar Options

From the prototype, the avatar supports:

```typescript
interface AvatarOptions {
  // Gender affects base model
  gender: 'male' | 'female';
  
  // Color customization
  skinTone: string;      // Hex color
  hairColor: string;     // Hex color
  shirtColor: string;    // Hex color
  trouserColor: string;  // Hex color
  
  // Hat selection
  hat: 'none' | 'cap' | 'tophat' | 'beanie' | 'flower-crown';
}

// Default avatar
const DEFAULT_AVATAR: AvatarOptions = {
  gender: 'female',
  skinTone: '#F4C7AB',
  hairColor: '#4A3728',
  shirtColor: '#5B9BD5',
  trouserColor: '#3A5A8C',
  hat: 'none',
};
```

### Color Swatches

```typescript
const SKIN_TONES = [
  '#F4C7AB',  // Light
  '#E8B896',  // Medium-light
  '#D4956B',  // Medium
  '#B87A4B',  // Medium-dark
  '#8B5E3C',  // Dark
];

const HAIR_COLORS = [
  '#4A3728',  // Dark brown
  '#8B4513',  // Light brown
  '#D4A574',  // Blonde
  '#FF6B35',  // Auburn
  '#1C1C1C',  // Black
  '#6B4C9A',  // Purple (fun!)
  '#FF69B4',  // Pink (fun!)
];

const SHIRT_COLORS = [
  '#5B9BD5',  // Blue
  '#70AD47',  // Green
  '#FF6B6B',  // Red
  '#FFD93D',  // Yellow
  '#9B59B6',  // Purple
  '#3498DB',  // Sky blue
  '#E74C3C',  // Orange
  '#1ABC9C',  // Teal
];

const TROUSER_COLORS = [
  '#3A5A8C',  // Navy
  '#2E4053',  // Dark grey
  '#145A32',  // Forest green
  '#6C3483',  // Purple
  '#7F8C8D',  // Grey
  '#1C2833',  // Black
];
```

---

## UI Design

```
┌──────────────────────────────────────┐
│  Customise Avatar               [✕]  │
├──────────────────────────────────────┤
│                                      │
│         ┌─────────────┐             │
│         │   [Avatar]  │             │
│         │   Preview   │             │
│         └─────────────┘             │
│                                      │
├──────────────────────────────────────┤
│  Gender                              │
│  [ Male ]  [ Female ]                │
├──────────────────────────────────────┤
│  Skin Tone                           │
│  [■] [■] [■] [■] [■]                │
├──────────────────────────────────────┤
│  Hair Color                          │
│  [■][■][■][■][■][■][■]              │
├──────────────────────────────────────┤
│  Shirt Color                         │
│  [■][■][■][■][■][■][■][■]           │
├──────────────────────────────────────┤
│  Trouser Color                       │
│  [■][■][■][■][■][■]                 │
├──────────────────────────────────────┤
│  Hat                                 │
│  [ None ] [ Cap ] [ Top Hat ]        │
│  [ Beanie ] [ Flower Crown ]         │
├──────────────────────────────────────┤
│  [     Save Changes     ]            │
│  [     Reset to Default ]            │
└──────────────────────────────────────┘
```

---

## Persistence

Avatar options are saved to the user's profile:

```typescript
// In profiles collection
{
  // ... existing fields
  avatar_options: {
    gender: 'female',
    skinTone: '#F4C7AB',
    hairColor: '#4A3728',
    shirtColor: '#5B9BD5',
    trouserColor: '#3A5A8C',
    hat: 'none',
  }
}
```

### useAvatar Hook

```typescript
// src/hooks/useAvatar.ts

export function useAvatar() {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState<AvatarOptions>(DEFAULT_AVATAR);
  const [isLoading, setIsLoading] = useState(true);

  // Load avatar on mount
  useEffect(() => {
    if (user?.avatar_options) {
      setAvatar(user.avatar_options);
    }
    setIsLoading(false);
  }, [user]);

  const updateAvatar = async (updates: Partial<AvatarOptions>) => {
    const newAvatar = { ...avatar, ...updates };
    setAvatar(newAvatar);
    
    await pocketbaseService.update('profiles', user.id, {
      avatar_options: newAvatar,
    });
  };

  const resetToDefault = async () => {
    setAvatar(DEFAULT_AVATAR);
    await pocketbaseService.update('profiles', user.id, {
      avatar_options: DEFAULT_AVATAR,
    });
  };

  return {
    avatar,
    updateAvatar,
    resetToDefault,
    isLoading,
  };
}
```

---

## Live Preview

As the user changes options, the avatar preview updates in real-time:

```typescript
// In AvatarCustomiser.tsx
const handleColorChange = (field: keyof AvatarOptions, color: string) => {
  updateAvatar({ [field]: color });
  // Avatar in garden updates automatically via state
};

// The 3D preview in the panel
<AvatarPreview options={avatar} />
```

The preview component uses the same `buildCharacter()` function as the garden renderer:

```typescript
function AvatarPreview({ options }: { options: AvatarOptions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    
    const avatar = buildCharacter(options);
    scene.add(avatar);
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      alpha: true,
    });
    renderer.render(scene, camera);
    
    return () => renderer.dispose();
  }, [options]);
  
  return <canvas ref={canvasRef} width={150} height={150} />;
}
```

---

## Testing Checklist

### Customization
- [ ] Gender toggle rebuilds avatar model
- [ ] All skin tone swatches apply correctly
- [ ] All hair color swatches apply correctly
- [ ] All shirt color swatches apply correctly
- [ ] All trouser color swatches apply correctly
- [ ] All 5 hat styles render correctly
- [ ] Changes preview in real-time

### Persistence
- [ ] Avatar saves to profile on change
- [ ] Avatar loads from profile on refresh
- [ ] Reset to default works
- [ ] Avatar displays same in garden view

### Edge Cases
- [ ] Invalid color values don't crash
- [ ] Profile without avatar_options uses default
- [ ] Changes persist across sessions

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| All customization options work | [ ] |
| Live preview updates | [ ] |
| Saves to Pocketbase | [ ] |
| Loads on login | [ ] |
| Kid-friendly UI | [ ] |

---

## Reference Files

- **`docs/phase-1.1/GARDEN_THREE_IMPLEMENTATION.md`** — Avatar builder spec
- **`docs/phase-1.1/GardenV2.jsx`** — Working AvatarCustomiser component
- **`src/hooks/useAuth.tsx`** — User profile access

---

## Notes for Implementation

1. Use a small preview canvas (150×150) to avoid performance issues
2. Re-render preview only when options change (debounce if needed)
3. The "fun" hair colors (purple, pink) are popular with kids
4. Consider adding more hat options in future updates
5. Avatar does not animate in preview (just static pose)