# Task 1.1.12: Decoration System

**Status:** Not Started
**Phase:** C (Social & Rewards)
**Dependencies:** Task 1.1.11 (Gift System)
**Estimated Time:** 3-4 hours

---

## Objective

Implement the garden decoration system that allows players to customize their garden with decorative items. Decorations can be unlocked as gifts or purchased with Sun Drops, and placed freely in the garden.

---

## Deliverables

### Files to Create
- `src/services/decorationService.ts` — Decoration management
- `src/components/garden/DecorationPicker.tsx` — Decoration selection UI
- `src/components/garden/DecorationItem.tsx` — Individual decoration sprite

### Files to Modify
- `src/components/garden/GardenWorld.tsx` — Add decoration placement
- `src/hooks/useGarden.tsx` — Add decoration state

---

## Decoration Types

| Decoration | Type | Size | Unlock Method |
|------------|------|------|---------------|
| 🌸 Cherry Blossoms | Tree | 40x40 | Gift (Golden Flower) |
| 🎀 Ribbon | Tree | 30x30 | Gift (Ribbon) |
| 🌹 Rose Bush | Garden | 45x45 | 50 Sun Drops |
| 🌻 Sunflower | Garden | 35x35 | 30 Sun Drops |
| 🍄 Mushroom | Garden | 25x25 | 20 Sun Drops |
| 🏮 Lantern | Garden | 30x30 | 40 Sun Drops |
| 🪑 Bench | Garden | 50x30 | 60 Sun Drops |
| ⛲ Fountain | Garden | 60x60 | 100 Sun Drops |

---

## Decoration Service

```typescript
// src/services/decorationService.ts

import { pocketbaseService } from './pocketbaseService';
import type { GardenDecoration } from '@/types/game';

export interface DecorationType {
  id: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  price: number;  // Sun Drops, or 0 if gift-only
  category: 'tree' | 'garden';
}

export const DECORATION_TYPES: DecorationType[] = [
  { id: 'cherry_blossoms', name: 'Cherry Blossoms', emoji: '🌸', width: 40, height: 40, price: 0, category: 'tree' },
  { id: 'ribbon', name: 'Ribbon', emoji: '🎀', width: 30, height: 30, price: 0, category: 'tree' },
  { id: 'rose_bush', name: 'Rose Bush', emoji: '🌹', width: 45, height: 45, price: 50, category: 'garden' },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', width: 35, height: 35, price: 30, category: 'garden' },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', width: 25, height: 25, price: 20, category: 'garden' },
  { id: 'lantern', name: 'Lantern', emoji: '🏮', width: 30, height: 30, price: 40, category: 'garden' },
  { id: 'bench', name: 'Bench', emoji: '🪑', width: 50, height: 30, price: 60, category: 'garden' },
  { id: 'fountain', name: 'Fountain', emoji: '⛲', width: 60, height: 60, price: 100, category: 'garden' },
];

/**
 * Purchase a decoration with Sun Drops.
 */
export async function purchaseDecoration(
  userId: string,
  typeId: string,
  price: number
): Promise<GardenDecoration> {
  const type = DECORATION_TYPES.find(t => t.id === typeId);
  if (!type) throw new Error('Unknown decoration type');
  
  if (type.price > 0 && type.price !== price) {
    throw new Error('Price mismatch');
  }
  
  const decoration = await pocketbaseService.create('decorations', {
    user: userId,
    itemType: typeId,
    position: { x: 0, y: 0 },
    placed: false,
    unlockedAt: new Date().toISOString(),
  });
  
  return decoration;
}

/**
 * Place a decoration in the garden.
 */
export async function placeDecoration(
  decorationId: string,
  position: { x: number; y: number }
): Promise<void> {
  await pocketbaseService.update('decorations', decorationId, {
    position,
    placed: true,
  });
}

/**
 * Move a placed decoration.
 */
export async function moveDecoration(
  decorationId: string,
  position: { x: number; y: number }
): Promise<void> {
  await pocketbaseService.update('decorations', decorationId, {
    position,
  });
}

/**
 * Remove a decoration from the garden (keep in inventory).
 */
export async function removeDecoration(decorationId: string): Promise<void> {
  await pocketbaseService.update('decorations', decorationId, {
    placed: false,
  });
}

/**
 * Get all decorations for a user.
 */
export async function getUserDecorations(userId: string): Promise<GardenDecoration[]> {
  return pocketbaseService.getList('decorations', {
    filter: `user = "${userId}"`,
  });
}

/**
 * Get placed decorations for garden rendering.
 */
export async function getPlacedDecorations(userId: string): Promise<GardenDecoration[]> {
  return pocketbaseService.getList('decorations', {
    filter: `user = "${userId}" && placed = true`,
  });
}
```

---

## DecorationPicker Component

```typescript
// src/components/garden/DecorationPicker.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DECORATION_TYPES, DecorationType } from '@/services/decorationService';

interface DecorationPickerProps {
  sunDrops: number;
  ownedDecorations: string[];
  onSelect: (type: DecorationType) => void;
  onClose: () => void;
}

export function DecorationPicker({ sunDrops, ownedDecorations, onSelect, onClose }: DecorationPickerProps) {
  const [category, setCategory] = useState<'all' | 'tree' | 'garden'>('all');
  
  const filteredTypes = DECORATION_TYPES.filter(type => {
    if (category === 'all') return true;
    return type.category === category;
  });
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="decoration-picker-overlay"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="decoration-picker"
      >
        <div className="picker-header">
          <h2>🎀 Decorations</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="picker-tabs">
          <button
            className={category === 'all' ? 'active' : ''}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          <button
            className={category === 'tree' ? 'active' : ''}
            onClick={() => setCategory('tree')}
          >
            🌳 Tree
          </button>
          <button
            className={category === 'garden' ? 'active' : ''}
            onClick={() => setCategory('garden')}
          >
            🌷 Garden
          </button>
        </div>
        
        <div className="picker-sundrops">
          <span>☀️</span>
          <span>{sunDrops} Sun Drops</span>
        </div>
        
        <div className="decoration-grid">
          {filteredTypes.map(type => {
            const owned = ownedDecorations.includes(type.id);
            const canAfford = sunDrops >= type.price;
            const isGiftOnly = type.price === 0;
            
            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`decoration-card ${owned ? 'owned' : ''}`}
                onClick={() => onSelect(type)}
                disabled={!owned && !canAfford}
              >
                <span className="decoration-emoji">{type.emoji}</span>
                <span className="decoration-name">{type.name}</span>
                
                {owned ? (
                  <span className="decoration-status owned">✓ Owned</span>
                ) : isGiftOnly ? (
                  <span className="decoration-status gift">🎁 Gift</span>
                ) : (
                  <span className="decoration-status price">
                    ☀️ {type.price}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## DecorationItem Component

```typescript
// src/components/garden/DecorationItem.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GardenDecoration } from '@/types/game';
import { DECORATION_TYPES } from '@/services/decorationService';

interface DecorationItemProps {
  decoration: GardenDecoration;
  isEditing: boolean;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onRemove: (id: string) => void;
}

export function DecorationItem({ decoration, isEditing, onMove, onRemove }: DecorationItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const type = DECORATION_TYPES.find(t => t.id === decoration.itemType);
  if (!type) return null;
  
  return (
    <motion.div
      className={`decoration-item ${isEditing ? 'editable' : ''}`}
      style={{
        left: decoration.position.x,
        top: decoration.position.y,
        width: type.width,
        height: type.height,
      }}
      drag={isEditing}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        onMove(decoration.id, {
          x: decoration.position.x + info.offset.x,
          y: decoration.position.y + info.offset.y,
        });
      }}
      whileHover={isEditing ? { scale: 1.1 } : undefined}
      whileDrag={{ scale: 1.2, zIndex: 1000 }}
    >
      <span className="decoration-sprite">{type.emoji}</span>
      
      {isEditing && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="remove-btn"
          onClick={() => onRemove(decoration.id)}
        >
          ✕
        </motion.button>
      )}
    </motion.div>
  );
}
```

---

## Integration with GardenWorld

```typescript
// Add to GardenWorld.tsx

function GardenWorld({ trees, avatar, onOpenPath }: GardenWorldProps) {
  const [decorations, setDecorations] = useState<GardenDecoration[]>([]);
  const [isEditingDecorations, setIsEditingDecorations] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  
  // Load decorations
  useEffect(() => {
    loadDecorations();
  }, []);
  
  const handlePlaceDecoration = async (type: DecorationType) => {
    // Purchase if not owned
    if (type.price > 0) {
      await purchaseDecoration(userId, type.id, type.price);
    }
    
    setShowPicker(false);
    setIsEditingDecorations(true);
    // User will drag decoration to position
  };
  
  return (
    <div className="garden-world">
      {/* Background */}
      <div className="garden-background">
        {/* Decorations */}
        {decorations.map(dec => (
          <DecorationItem
            key={dec.id}
            decoration={dec}
            isEditing={isEditingDecorations}
            onMove={handleMoveDecoration}
            onRemove={handleRemoveDecoration}
          />
        ))}
        
        {/* Trees */}
        {trees.map(tree => (
          <GardenTree key={tree.id} tree={tree} onOpenPanel={...} />
        ))}
        
        {/* Avatar */}
        <GardenAvatar avatar={avatar} position={...} />
      </div>
      
      {/* Edit Mode Button */}
      <button
        className="edit-decorations-btn"
        onClick={() => setIsEditingDecorations(!isEditingDecorations)}
      >
        {isEditingDecorations ? '✓ Done' : '🎀 Decorate'}
      </button>
      
      {/* Decoration Picker */}
      <AnimatePresence>
        {showPicker && (
          <DecorationPicker
            sunDrops={sunDrops}
            ownedDecorations={decorations.map(d => d.itemType)}
            onSelect={handlePlaceDecoration}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Testing Checklist

### Decoration Purchase
- [ ] Can purchase decoration with Sun Drops
- [ ] Sun Drops deducted correctly
- [ ] Decoration appears in inventory
- [ ] Cannot purchase gift-only items

### Decoration Placement
- [ ] Can drag decoration from picker to garden
- [ ] Decoration snaps to valid position
- [ ] Cannot place on trees
- [ ] Cannot place outside garden bounds

### Decoration Editing
- [ ] Edit mode shows controls
- [ ] Can move placed decorations
- [ ] Can remove decorations (back to inventory)
- [ ] Changes persist after leaving edit mode

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Decoration shop works | [ ] |
| Placement in garden | [ ] |
| Edit/move/remove | [ ] |
| Persistence to backend | [ ] |
| Kid-friendly UI | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 11 (Decorations)
- Task 1.1.11 (Gift System) — For gift-only decorations
- Task 1.1.5 (Garden World) — Integration point

---

## Notes for Implementation

1. Add collision detection with trees
2. Consider grid snapping for cleaner placement
3. Add decoration rotation option
4. Consider limited placement areas
5. Test performance with many decorations