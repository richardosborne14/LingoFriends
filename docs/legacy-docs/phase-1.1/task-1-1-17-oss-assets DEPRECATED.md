# Task 1.1.17: OSS Asset Integration (Kenney.nl)

**Status:** Not Started
**Phase:** D (Polish)
**Dependencies:** Task 1.1.14 (PixiJS Upgrade)
**Estimated Time:** 4-6 hours

---

## Objective

Integrate open-source sprite assets from Kenney.nl into the LingoFriends garden world. This provides professional-quality, kid-friendly visuals from day one without the cost and time of custom asset creation.

---

## Deliverables

### Files to Create
- `public/assets/sprites/` — Sprite asset directory
- `public/assets/sprites/atlases/` — Texture atlases for PixiJS
- `src/assets/assetManifest.ts` — Asset manifest with metadata
- `src/assets/assetLoader.ts` — Asset loading utilities
- `docs/ASSET_LICENSES.md` — License attribution documentation

### Kenney.nl Asset Packs to Use

**Primary Packs** (CC0 License - Public Domain):

| Pack | Contents | Use Case |
|------|----------|----------|
| **Jumper Pack** | Characters, animals | Avatars |
| **Nature Kit** | Trees, plants, flowers | Garden trees & decorations |
| **地面 (Ground) Kit** | Grass, dirt, paths | Garden background |
| **UI Pack** | Buttons, icons, panels | In-game UI |
| **Particles** | Stars, sparkles | Effects (Sun Drops, rewards) |
| **Puzzle Pack** | Various icons | Activity components |

**Alternative Packs**:
- `1-Bit Pack` — Simple retro style
- `Toon Characters` — Cute character sprites
- `Isometric Kit` — If using isometric view

---

## Asset Categories

### 1. Trees (3 Growth Stages)

| Stage | Description | Kenney Pack |
|-------|-------------|-------------|
| **Seed** | Small sprout, dirt mound | Nature Kit |
| **Growing** | Medium tree with leaves | Nature Kit |
| **Bloomed** | Full tree with fruit/flowers | Nature Kit |

**Selection Criteria**:
- Needs 3 distinct sizes per tree type
- Kid-friendly, colorful style
- Clear visual progression

### 2. Avatars

| Avatar Type | Description | Kenney Pack |
|-------------|-------------|-------------|
| **Fox** | Orange fox character | Jumper Pack |
| **Cat** | Gray/white cat | Jumper Pack |
| **Panda** | Black/white panda | Toon Characters |
| **Rabbit** | White/brown rabbit | Jumper Pack |

**Selection Criteria**:
- Cute, friendly appearance
- Distinct from each other
- Good for idle/walk animations

### 3. Garden Decorations

| Decoration | Kenney Pack | Notes |
|------------|-------------|-------|
| Flowers | Nature Kit | Multiple colors |
| Mushrooms | Nature Kit | Red/white spotted |
| Lanterns | UI Pack | Character decorations |
| Benches | Nature Kit | Garden furniture |
| Rocks | Nature Kit | Background elements |

### 4. UI Elements

| Element | Kenney Pack | Use Case |
|---------|-------------|----------|
| **Sun icon** | UI Pack | Sun Drops |
| **Star** | Particles | Star ratings |
| **Gift box** | UI Pack | Gift system |
| **Heart** | UI Pack | Tree health |
| **Buttons** | UI Pack | Navigation |

### 5. Effects

| Effect | Kenney Pack | Use Case |
|--------|-------------|----------|
| **Sparkle** | Particles | Sun Drop burst |
| **Star burst** | Particles | Perfect score |
| **Confetti** | Particles | Level complete |
| **Hearts** | Particles | Gift received |

---

## Asset Pipeline

### Directory Structure

```
public/
└── assets/
    └── sprites/
        ├── trees/
        │   ├── seed.png
        │   ├── growing.png
        │   └── bloomed.png
        ├── avatars/
        │   ├── fox.png
        │   ├── cat.png
        │   ├── panda.png
        │   └── rabbit.png
        ├── decorations/
        │   ├── flower_01.png
        │   ├── flower_02.png
        │   ├── mushroom.png
        │   └── ...
        ├── ui/
        │   ├── sun.png
        │   ├── star.png
        │   ├── gift.png
        │   └── ...
        ├── effects/
        │   ├── sparkle_01.png
        │   ├── sparkle_02.png
        │   └── ...
        └── atlases/
            ├── garden.json
            ├── garden.png
            ├── ui.json
            └── ui.png
```

---

## Asset Manifest

```typescript
// src/assets/assetManifest.ts

/**
 * Asset manifest for LingoFriends garden world.
 * All assets sourced from Kenney.nl (CC0 Public Domain).
 */

export interface AssetInfo {
  id: string;
  path: string;
  width: number;
  height: number;
  source: string;
  license: string;
}

export interface SpriteSheetInfo {
  id: string;
  imagePath: string;
  atlasPath: string;
  source: string;
}

/** Tree sprites - 3 growth stages */
export const TREE_ASSETS: AssetInfo[] = [
  {
    id: 'tree_seed',
    path: '/assets/sprites/trees/seed.png',
    width: 32,
    height: 32,
    source: 'Kenney.nl Nature Kit',
    license: 'CC0',
  },
  {
    id: 'tree_growing',
    path: '/assets/sprites/trees/growing.png',
    width: 64,
    height: 96,
    source: 'Kenney.nl Nature Kit',
    license: 'CC0',
  },
  {
    id: 'tree_bloomed',
    path: '/assets/sprites/trees/bloomed.png',
    width: 96,
    height: 128,
    source: 'Kenney.nl Nature Kit',
    license: 'CC0',
  },
];

/** Avatar sprites */
export const AVATAR_ASSETS: AssetInfo[] = [
  {
    id: 'avatar_fox',
    path: '/assets/sprites/avatars/fox.png',
    width: 48,
    height: 48,
    source: 'Kenney.nl Jumper Pack',
    license: 'CC0',
  },
  {
    id: 'avatar_cat',
    path: '/assets/sprites/avatars/cat.png',
    width: 48,
    height: 48,
    source: 'Kenney.nl Jumper Pack',
    license: 'CC0',
  },
  {
    id: 'avatar_panda',
    path: '/assets/sprites/avatars/panda.png',
    width: 48,
    height: 48,
    source: 'Kenney.nl Toon Characters',
    license: 'CC0',
  },
  {
    id: 'avatar_rabbit',
    path: '/assets/sprites/avatars/rabbit.png',
    width: 48,
    height: 48,
    source: 'Kenney.nl Jumper Pack',
    license: 'CC0',
  },
];

/** UI icons */
export const UI_ASSETS: AssetInfo[] = [
  {
    id: 'icon_sun',
    path: '/assets/sprites/ui/sun.png',
    width: 32,
    height: 32,
    source: 'Kenney.nl UI Pack',
    license: 'CC0',
  },
  {
    id: 'icon_star',
    path: '/assets/sprites/ui/star.png',
    width: 32,
    height: 32,
    source: 'Kenney.nl Particles',
    license: 'CC0',
  },
  {
    id: 'icon_gift',
    path: '/assets/sprites/ui/gift.png',
    width: 32,
    height: 32,
    source: 'Kenney.nl UI Pack',
    license: 'CC0',
  },
  {
    id: 'icon_heart',
    path: '/assets/sprites/ui/heart.png',
    width: 32,
    height: 32,
    source: 'Kenney.nl UI Pack',
    license: 'CC0',
  },
];

/** Texture atlases for efficient rendering */
export const ATLASES: SpriteSheetInfo[] = [
  {
    id: 'garden_atlas',
    imagePath: '/assets/sprites/atlases/garden.png',
    atlasPath: '/assets/sprites/atlases/garden.json',
    source: 'Kenney.nl Nature Kit, Jumper Pack',
  },
  {
    id: 'ui_atlas',
    imagePath: '/assets/sprites/atlases/ui.png',
    atlasPath: '/assets/sprites/atlases/ui.json',
    source: 'Kenney.nl UI Pack, Particles',
  },
];

/** All assets combined */
export const ALL_ASSETS = [
  ...TREE_ASSETS,
  ...AVATAR_ASSETS,
  ...UI_ASSETS,
];
```

---

## Asset Loader

```typescript
// src/assets/assetLoader.ts

import * as PIXI from 'pixi.js';
import { ALL_ASSETS, ATLASES, type AssetInfo, type SpriteSheetInfo } from './assetManifest';

/**
 * Asset loader for PixiJS sprites.
 * Handles loading individual sprites and texture atlases.
 */
export class AssetLoader {
  private static loaded = false;
  private static textures: Map<string, PIXI.Texture> = new Map();
  
  /**
   * Load all game assets.
   * Call this during app initialization.
   */
  static async loadAll(): Promise<void> {
    if (this.loaded) return;
    
    // Load individual textures
    const texturePromises = ALL_ASSETS.map(asset => this.loadTexture(asset));
    await Promise.all(texturePromises);
    
    // Load texture atlases
    const atlasPromises = ATLASES.map(atlas => this.loadAtlas(atlas));
    await Promise.all(atlasPromises);
    
    this.loaded = true;
    console.log(`✅ Loaded ${this.textures.size} textures`);
  }
  
  /**
   * Load a single texture.
   */
  private static async loadTexture(asset: AssetInfo): Promise<void> {
    const texture = await PIXI.Assets.load(asset.path);
    this.textures.set(asset.id, texture);
  }
  
  /**
   * Load a texture atlas (spritesheet).
   */
  private static async loadAtlas(atlas: SpriteSheetInfo): Promise<void> {
    const spritesheet = await PIXI.Assets.load(atlas.atlasPath);
    
    // Extract individual textures from spritesheet
    for (const [name, texture] of Object.entries(spritesheet.textures || {})) {
      this.textures.set(name, texture);
    }
  }
  
  /**
   * Get a loaded texture by ID.
   */
  static getTexture(id: string): PIXI.Texture | undefined {
    return this.textures.get(id);
  }
  
  /**
   * Get texture or throw if not found.
   */
  static requireTexture(id: string): PIXI.Texture {
    const texture = this.textures.get(id);
    if (!texture) {
      throw new Error(`Texture not found: ${id}. Did you forget to call loadAll()?`);
    }
    return texture;
  }
  
  /**
   * Create a sprite from a texture ID.
   */
  static createSprite(id: string): PIXI.Sprite {
    const texture = this.requireTexture(id);
    return new PIXI.Sprite(texture);
  }
  
  /**
   * Check if assets are loaded.
   */
  static isLoaded(): boolean {
    return this.loaded;
  }
  
  /**
   * Get loading progress (0-1).
   */
  static getProgress(): number {
    // Could be enhanced with PIXI loader progress
    return this.loaded ? 1 : 0;
  }
  
  /**
   * Unload all assets (for cleanup).
   */
  static unload(): void {
    this.textures.clear();
    this.loaded = false;
  }
}

/**
 * Hook for using assets in React components.
 */
export function useAsset(id: string): PIXI.Texture | null {
  const [texture, setTexture] = useState<PIXI.Texture | null>(null);
  
  useEffect(() => {
    if (AssetLoader.isLoaded()) {
      setTexture(AssetLoader.getTexture(id) || null);
    } else {
      AssetLoader.loadAll().then(() => {
        setTexture(AssetLoader.getTexture(id) || null);
      });
    }
  }, [id]);
  
  return texture;
}
```

---

## Loading Screen Component

```typescript
// src/components/shared/AssetLoadingScreen.tsx

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AssetLoader } from '@/assets/assetLoader';

export function AssetLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Loading assets...');
  
  useEffect(() => {
    async function loadAssets() {
      try {
        setStatus('Loading garden sprites...');
        setProgress(0.3);
        
        setStatus('Loading avatars...');
        setProgress(0.5);
        
        setStatus('Loading UI...');
        setProgress(0.7);
        
        await AssetLoader.loadAll();
        
        setStatus('Ready!');
        setProgress(1);
        
        setTimeout(onComplete, 500);
      } catch (error) {
        console.error('Failed to load assets:', error);
        setStatus('Failed to load. Please refresh.');
      }
    }
    
    loadAssets();
  }, [onComplete]);
  
  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loading-content">
        <div className="loading-logo">🌳</div>
        <h1>LingoFriends</h1>
        
        <div className="loading-bar">
          <motion.div
            className="loading-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
          />
        </div>
        
        <p className="loading-status">{status}</p>
      </div>
    </motion.div>
  );
}
```

---

## License Documentation

```markdown
# ASSET_LICENSES.md

# Asset Licenses

This document tracks all third-party assets used in LingoFriends.

## Kenney.nl Assets

**License**: CC0 1.0 Universal (Public Domain)
**Source**: https://kenney.nl/

The following asset packs are used:

1. **Jumper Pack** - Avatar sprites
   - URL: https://kenney.nl/assets/jumper-pack
   
2. **Nature Kit** - Trees, plants, decorations
   - URL: https://kenney.nl/assets/nature-kit
   
3. **UI Pack** - Buttons, icons, panels
   - URL: https://kenney.nl/assets/ui-pack
   
4. **Particles** - Effects (sparkles, stars)
   - URL: https://kenney.nl/assets/particles
   
5. **Toon Characters** - Additional avatars
   - URL: https://kenney.nl/assets/toon-characters

### CC0 License Summary

You can:
- Use for any purpose (commercial or non-commercial)
- Modify, distribute, and create derivatives
- Do so without attribution (though appreciated)

No restrictions apply. The assets are in the public domain.

## Attribution (Optional but Appreciated)

If you wish to credit Kenney:
```
Game assets by Kenney (https://kenney.nl/)
```

---

## Future Custom Assets

When custom assets are created, update this file with:
- Artist name
- License terms
- Usage rights
- Any restrictions
```

---

## Testing Checklist

### Asset Loading
- [ ] All textures load without errors
- [ ] Loading screen shows progress
- [ ] App handles load failures gracefully
- [ ] Assets cached for offline use

### Visual Quality
- [ ] Trees clearly show 3 growth stages
- [ ] Avatars are distinct and kid-friendly
- [ ] UI icons match design system colors
- [ ] Effects animations play correctly

### Performance
- [ ] Texture atlases reduce draw calls
- [ ] Memory usage reasonable (< 50MB)
- [ ] First load completes in < 3 seconds
- [ ] Subsequent loads use cache

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Kenney packs selected | [ ] |
| Assets downloaded | [ ] |
| Texture atlases created | [ ] |
| Loader integrated | [ ] |
| License documented | [ ] |

---

## Reference

- **Kenney.nl**: https://kenney.nl/assets
- **PixiJS Assets**: https://pixijs.com/guides/basics/assets
- **Texture Packer**: https://www.codeandweb.com/texturepacker (for atlases)

---

## Notes for Implementation

1. Start with Kenney Nature Kit and Jumper Pack
2. Use TexturePacker CLI for atlas generation
3. Keepsprite sizes power-of-2 (32, 64, 128, 256) for performance
4. Consider WebP format for smaller file sizes
5. Add sprite variants for multi-language support if needed