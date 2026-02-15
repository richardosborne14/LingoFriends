# Task 1.1.14: PixiJS Upgrade & Assets

**Status:** Not Started
**Phase:** D (Polish)
**Dependencies:** All Phase A, B, C tasks
**Estimated Time:** 6-8 hours

---

## Objective

Upgrade the garden rendering from SVG/CSS to PixiJS for better performance and visual polish. Create or integrate sprite assets for trees, decorations, avatar, and effects.

---

## Deliverables

### Dependencies to Add
- `pixi.js` — Core PIXI library
- `@pixi/react` — React integration

### Files to Create
- `src/renderer/GardenRenderer.ts` — Main PixiJS renderer
- `src/renderer/sprites/TreeSprite.ts` — Tree sprites (3 states)
- `src/renderer/sprites/AvatarSprite.ts` — Avatar with idle animation
- `src/renderer/sprites/DecorationSprite.ts` — Decoration sprites
- `src/renderer/sprites/SunDropAnimation.ts` — Sun Drop burst animation

### Files to Modify
- `src/components/garden/GardenWorld.tsx` — Replace SVG with PixiJS canvas

---

## Asset Requirements

### Tree States (per skill path theme)
| State | Visual | Animation |
|-------|--------|-----------|
| Seed | Small mound with sprout | Gentle sway |
| Growing | Medium tree with leaves | Sway + occasional growth pulse |
| Bloomed | Full tree with blossoms | Sway + sparkle particles |

### Garden Decorations
| Item | Size | Animation |
|------|------|-----------|
| Cherry Blossoms | 40x40 | Particle falling petals |
| Rose Bush | 45x45 | Sway |
| Sunflower | 35x35 | Sway + turn to sun |
| Mushroom | 25x25 | Bob |
| Lantern | 30x30 | Glow/flicker |
| Fountain | 60x60 | Water spray |

### Avatar
- Idle animation (bounce)
- Walk animation (walk cycle)
- Interact animation (wave)

### Effects
- Sun Drop burst (earn animation)
- Star burst (perfect score)
- Gift unlock sparkle
- Tree health indicator glow

---

## Garden Renderer

```typescript
// src/renderer/GardenRenderer.ts

import * as PIXI from 'pixi.js';
import { Application, Container, Sprite, Graphics } from 'pixi.js';
import type { UserTree, PlayerAvatar, GardenDecoration } from '@/types/game';

export class GardenRenderer {
  private app: Application | null = null;
  private stage: Container | null = null;
  private trees: Map<string, TreeSprite> = new Map();
  private decorations: Map<string, DecorationSprite> = new Map();
  private avatar: AvatarSprite | null = null;
  
  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.app = new Application({
      view: canvas,
      width: 800,
      height: 600,
      backgroundColor: 0x87CEEB, // Sky blue
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    this.stage = this.app.stage;
    
    // Add layers
    this.backgroundLayer = new Container();
    this.decorationLayer = new Container();
    this.treeLayer = new Container();
    this.avatarLayer = new Container();
    this.effectLayer = new Container();
    
    this.stage.addChild(this.backgroundLayer);
    this.stage.addChild(this.decorationLayer);
    this.stage.addChild(this.treeLayer);
    this.stage.addChild(this.avatarLayer);
    this.stage.addChild(this.effectLayer);
    
    // Draw background
    this.drawBackground();
  }
  
  private drawBackground(): void {
    const bg = new Graphics();
    
    // Sky gradient
    bg.beginFill(0x87CEEB);
    bg.drawRect(0, 0, 800, 400);
    bg.endFill();
    
    // Grass
    bg.beginFill(0x7CCD7C);
    bg.drawRect(0, 400, 800, 200);
    bg.endFill();
    
    // Path
    bg.beginFill(0xBDB76B);
    bg.drawRoundedRect(350, 500, 100, 100, 20);
    bg.endFill();
    
    this.backgroundLayer.addChild(bg);
  }
  
  addTree(tree: UserTree): void {
    const sprite = new TreeSprite(tree);
    this.trees.set(tree.id, sprite);
    this.treeLayer.addChild(sprite);
  }
  
  removeTree(treeId: string): void {
    const sprite = this.trees.get(treeId);
    if (sprite) {
      this.treeLayer.removeChild(sprite);
      this.trees.delete(treeId);
      sprite.destroy();
    }
  }
  
  addDecoration(decoration: GardenDecoration): void {
    const sprite = new DecorationSprite(decoration);
    this.decorations.set(decoration.id, sprite);
    this.decorationLayer.addChild(sprite);
  }
  
  addAvatar(avatar: PlayerAvatar, position: { x: number; y: number }): void {
    this.avatar = new AvatarSprite(avatar, position);
    this.avatarLayer.addChild(this.avatar);
  }
  
  playSunDropBurst(position: { x: number; y: number }, count: number): void {
    const burst = new SunDropAnimation(position, count);
    this.effectLayer.addChild(burst);
    
    burst.onComplete = () => {
      this.effectLayer.removeChild(burst);
      burst.destroy();
    };
  }
  
  destroy(): void {
    this.app?.destroy(true);
  }
}
```

---

## Tree Sprite

```typescript
// src/renderer/sprites/TreeSprite.ts

import { AnimatedSprite, Sprite, Container, Graphics } from 'pixi.js';
import type { UserTree } from '@/types/game';

export class TreeSprite extends Container {
  private tree: UserTree;
  private baseSprite: AnimatedSprite | null = null;
  private healthIndicator: Graphics;
  
  constructor(tree: UserTree) {
    super();
    this.tree = tree;
    this.position.set(tree.position.x, tree.position.y);
    
    // Create base sprite based on tree state
    this.createSprite();
    
    // Create health indicator
    this.healthIndicator = this.createHealthIndicator();
    this.addChild(this.healthIndicator);
  }
  
  private createSprite(): void {
    // Load appropriate sprite based on tree state
    const frames = this.getFramesForState(this.tree.status);
    this.baseSprite = new AnimatedSprite(frames);
    this.baseSprite.animationSpeed = 0.1;
    this.baseSprite.play();
    this.addChild(this.baseSprite);
  }
  
  private getFramesForState(state: 'seed' | 'growing' | 'bloomed'): PIXI.Texture[] {
    // Return appropriate frames from sprite sheet
    const prefix = `tree_${this.tree.skillPathId}_${state}`;
    // ... load frames
    return frames;
  }
  
  private createHealthIndicator(): Graphics {
    const indicator = new Graphics();
    const health = this.tree.health;
    
    // Draw health bar above tree
    const barWidth = 40;
    const barHeight = 6;
    const x = -barWidth / 2;
    const y = -60;
    
    // Background
    indicator.beginFill(0x333333);
    indicator.drawRoundedRect(x, y, barWidth, barHeight, 3);
    indicator.endFill();
    
    // Health fill
    const fillColor = health > 80 ? 0x10B981 : health > 40 ? 0xF59E0B : 0xEF4444;
    indicator.beginFill(fillColor);
    indicator.drawRoundedRect(x, y, barWidth * (health / 100), barHeight, 3);
    indicator.endFill();
    
    return indicator;
  }
  
  updateHealth(health: number): void {
    this.tree.health = health;
    this.removeChild(this.healthIndicator);
    this.healthIndicator = this.createHealthIndicator();
    this.addChild(this.healthIndicator);
  }
}
```

---

## Avatar Sprite

```typescript
// src/renderer/sprites/AvatarSprite.ts

import { AnimatedSprite, Container, Graphics } from 'pixi.js';
import type { PlayerAvatar } from '@/types/game';

export class AvatarSprite extends Container {
  private avatar: PlayerAvatar;
  private sprite: AnimatedSprite;
  private targetPosition: { x: number; y: number } | null = null;
  private speed = 2;
  
  constructor(avatar: PlayerAvatar, position: { x: number; y: number }) {
    super();
    this.avatar = avatar;
    this.position.set(position.x, position.y);
    
    // Load avatar sprite based on avatar type
    const frames = this.getFramesForAvatar(avatar.type);
    this.sprite = new AnimatedSprite(frames);
    this.sprite.animationSpeed = 0.15;
    this.sprite.play();
    this.addChild(this.sprite);
    
    // Make interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', this.onTap, this);
  }
  
  private getFramesForAvatar(type: string): PIXI.Texture[] {
    // Return avatar-specific frames
    // For now, use emoji rendered to texture
    return this.renderEmojiToFrames(this.avatar.emoji);
  }
  
  private renderEmojiToFrames(emoji: string): PIXI.Texture[] {
    // Create canvas with emoji
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 32);
    
    // Create texture
    const texture = PIXI.Texture.from(canvas);
    return [texture];
  }
  
  moveTo(target: { x: number; y: number }): void {
    this.targetPosition = target;
  }
  
  private onTap(): void {
    // Play wave animation
    // Then return to idle
  }
  
  update(delta: number): void {
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.x;
      const dy = this.targetPosition.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.speed) {
        this.position.set(this.targetPosition.x, this.targetPosition.y);
        this.targetPosition = null;
      } else {
        this.x += (dx / dist) * this.speed * delta;
        this.y += (dy / dist) * this.speed * delta;
      }
    }
  }
}
```

---

## React Integration

```typescript
// src/components/garden/GardenWorld.tsx (with PixiJS)

import { useEffect, useRef } from 'react';
import { Stage, Container, Sprite } from '@pixi/react';
import { GardenRenderer } from '@/renderer/GardenRenderer';
import type { UserTree, PlayerAvatar } from '@/types/game';

export function GardenWorld({ trees, avatar, onTreeTap }: GardenWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GardenRenderer | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new GardenRenderer();
    renderer.init(canvasRef.current);
    rendererRef.current = renderer;
    
    // Add initial elements
    trees.forEach(tree => renderer.addTree(tree));
    renderer.addAvatar(avatar, { x: 400, y: 500 });
    
    return () => {
      renderer.destroy();
    };
  }, []);
  
  // Update trees when props change
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    
    // Sync trees
    trees.forEach(tree => {
      if (!renderer.hasTree(tree.id)) {
        renderer.addTree(tree);
      } else {
        renderer.updateTree(tree);
      }
    });
  }, [trees]);
  
  return (
    <div className="garden-world-container">
      <canvas ref={canvasRef} className="garden-canvas" />
      
      {/* Overlay UI elements */}
      <div className="garden-overlay">
        <button className="zoom-in">+</button>
        <button className="zoom-out">-</button>
      </div>
    </div>
  );
}
```

---

## Asset Loading Strategy

```typescript
// src/renderer/AssetLoader.ts

import * as PIXI from 'pixi.js';

export async function loadGardenAssets(): Promise<void> {
  // Load sprite sheets
  await PIXI.Assets.load([
    { alias: 'tree_seed', src: '/assets/trees/seed.png' },
    { alias: 'tree_growing', src: '/assets/trees/growing.png' },
    { alias: 'tree_bloomed', src: '/assets/trees/bloomed.png' },
    { alias: 'avatar_fox', src: '/assets/avatars/fox.png' },
    { alias: 'avatar_cat', src: '/assets/avatars/cat.png' },
    { alias: 'avatar_panda', src: '/assets/avatars/panda.png' },
    { alias: 'decorations', src: '/assets/decorations/spritesheet.json' },
    { alias: 'sundrop', src: '/assets/effects/sundrop.png' },
    { alias: 'star', src: '/assets/effects/star.png' },
    { alias: 'sparkle', src: '/assets/effects/sparkle.png' },
  ]);
  
  console.log('Garden assets loaded');
}

// Call on app start
loadGardenAssets();
```

---

## Testing Checklist

### Renderer
- [ ] Canvas initializes correctly
- [ ] Background renders
- [ ] Trees display correctly
- [ ] Avatar displays and animates
- [ ] Decorations display

### Interactions
- [ ] Tap on tree triggers callback
- [ ] Avatar moves when target set
- [ ] Health indicators update
- [ ] Effects play correctly

### Performance
- [ ] 60fps with 5+ trees
- [ ] No memory leaks
- [ ] Canvas resizes correctly
- [ ] Mobile performance acceptable

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| PixiJS integrated | [ ] |
| Trees render | [ ] |
| Avatar animates | [ ] |
| Effects play | [ ] |
| Performance good | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 2 (Visual Design)
- **CLINE_GAME_IMPLEMENTATION.md** — Section on rendering
- prototype-v4-final.jsx — For visual reference

---

## Notes for Implementation

1. Start with emoji/placeholder assets, upgrade to real sprites later
2. Use texture atlases for performance
3. Consider lazy loading non-critical assets
4. Add loading screen during asset load
5. Support reduced motion preferences