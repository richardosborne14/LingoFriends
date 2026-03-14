/**
 * ObjectViewerHarness — Dev-only 3D Object Inspector UI
 *
 * A three-panel tool for examining all garden 3D objects in isolation:
 * - Left: grouped object list (Trees, Flowers, Plants, Furniture, Features, Avatar)
 * - Centre: Three.js viewport with drag-to-orbit and scroll-to-zoom
 * - Right: info panel (name, category, cost, animations) + controls + screenshot
 *
 * Access via the dev harness tab "🔍 Objects" (Ctrl+Shift+D in-app).
 *
 * @module components/dev/ObjectViewerHarness
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ObjectViewerRenderer } from '../../renderer/ObjectViewerRenderer';
import {
  SHOP_CATALOGUE,
  AVATAR_COLORS,
  DEFAULT_AVATAR,
} from '../../renderer/types';
import type { AvatarOptions, ShopItem } from '../../renderer/types';

// ============================================================================
// TYPES
// ============================================================================

/** What we're currently viewing */
type ViewMode = 'object' | 'avatar';

/** Avatar gender type */
type AvatarGender = 'boy' | 'girl';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Category icons for the sidebar */
const CATEGORY_ICONS: Record<string, string> = {
  Trees: '🌲',
  Flowers: '🌸',
  Plants: '🌿',
  Furniture: '🪑',
  Features: '⛲',
  Avatar: '👤',
};

/** Animated object types */
const ANIMATED_TYPES = new Set(['fountain', 'pond']);

/** Source file map — tells devs which file controls each category */
const SOURCE_FILES: Record<string, string> = {
  Trees: 'src/renderer/objects/trees.ts',
  Flowers: 'src/renderer/objects/flowers.ts',
  Plants: 'src/renderer/objects/plants.ts',
  Furniture: 'src/renderer/objects/furniture.ts',
  Features: 'src/renderer/objects/features.ts',
  Avatar: 'src/renderer/AvatarBuilder.ts',
};

// ============================================================================
// HELPER: colour swatch
// ============================================================================

interface ColorSwatchProps {
  colors: ReadonlyArray<{ label: string; value: number }>;
  selected: number;
  onChange: (val: number) => void;
}

/** Small row of colour swatches for avatar customisation */
const ColorSwatch: React.FC<ColorSwatchProps> = ({ colors, selected, onChange }) => (
  <div className="flex flex-wrap gap-1 mt-1">
    {colors.map(({ label, value }) => {
      const hex = `#${value.toString(16).padStart(6, '0')}`;
      return (
        <button
          key={value}
          title={label}
          onClick={() => onChange(value)}
          style={{ backgroundColor: hex }}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            selected === value ? 'border-white scale-110' : 'border-transparent'
          }`}
        />
      );
    })}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Dev-only 3D object viewer harness.
 * Renders inside the dev harness tab switcher — no auth required.
 */
export const ObjectViewerHarness: React.FC = () => {
  // ── Three.js refs ──────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ObjectViewerRenderer | null>(null);

  // ── Selection state ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('object');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Trees');

  // ── Viewport controls ──────────────────────────────────────────────────────
  const [autoRotate, setAutoRotate] = useState(false);

  // ── Screenshot feedback ────────────────────────────────────────────────────
  const [screenshotFlash, setScreenshotFlash] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);

  // ── Avatar customisation state ─────────────────────────────────────────────
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions>({ ...DEFAULT_AVATAR });

  // ── Renderer initialisation ────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new ObjectViewerRenderer(canvasRef.current);
    rendererRef.current = viewer;
    viewer.start();

    // Load the first tree by default
    const firstTree = SHOP_CATALOGUE.find(i => i.category === 'Trees');
    if (firstTree) {
      viewer.loadObject(firstTree.id);
      setSelectedItem(firstTree);
    }

    return () => {
      viewer.dispose();
      rendererRef.current = null;
    };
    // Intentionally only runs once on mount — the canvas ref is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load object when selection changes ────────────────────────────────────
  useEffect(() => {
    const viewer = rendererRef.current;
    if (!viewer) return;

    if (viewMode === 'avatar') {
      viewer.loadAvatar(avatarOptions);
    } else if (selectedItem) {
      viewer.loadObject(selectedItem.id);
    }
  }, [viewMode, selectedItem, avatarOptions]);

  // ── Auto-rotate toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectObject = useCallback((item: ShopItem) => {
    setViewMode('object');
    setSelectedItem(item);
  }, []);

  const handleSelectAvatar = useCallback(() => {
    setViewMode('avatar');
    setSelectedItem(null);
    setSelectedCategory('Avatar');
  }, []);

  const handleResetCamera = useCallback(() => {
    rendererRef.current?.resetCamera();
  }, []);

  const handleScreenshot = useCallback(() => {
    const viewer = rendererRef.current;
    if (!viewer) return;

    const dataUrl = viewer.captureScreenshot();

    // 1. Trigger download
    const name = viewMode === 'avatar'
      ? `avatar-${Date.now()}.png`
      : `${selectedItem?.id ?? 'object'}-${Date.now()}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = name;
    link.click();

    // 2. Store preview
    setLastScreenshot(dataUrl);

    // 3. Flash effect
    setScreenshotFlash(true);
    setTimeout(() => setScreenshotFlash(false), 300);
  }, [viewMode, selectedItem]);

  const handleAvatarChange = useCallback(<K extends keyof AvatarOptions>(
    key: K,
    value: AvatarOptions[K]
  ) => {
    setAvatarOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Sidebar: build category groups ────────────────────────────────────────
  // Filter out TreeCare consumables — they're not 3D objects
  const shopItems = SHOP_CATALOGUE.filter(i => i.category !== 'TreeCare');

  // Categories to show in the sidebar (matches ObjectCategory values in types.ts)
  const categories = ['Trees', 'Flowers', 'Plants', 'Furniture', 'Features', 'Avatar'];

  // ── Derived info for info panel ────────────────────────────────────────────
  const currentCategory = viewMode === 'avatar'
    ? 'Avatar'
    : selectedItem?.category ?? '';
  const isAnimated = viewMode === 'object' && selectedItem
    ? ANIMATED_TYPES.has(selectedItem.id)
    : false;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className="flex h-full bg-gray-950 text-gray-100 overflow-hidden"
      style={{ height: 'calc(100vh - 48px)' }} // Account for dev harness header
    >
      {/* ── LEFT PANEL: Object list ───────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto">
        <div className="p-3 border-b border-gray-800">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Objects</h2>
        </div>

        {categories.map(cat => {
          const icon = CATEGORY_ICONS[cat] ?? '📦';
          const isOpen = selectedCategory === cat;

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => {
                  setSelectedCategory(cat);
                  if (cat === 'Avatar') handleSelectAvatar();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isOpen
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>{icon}</span>
                <span>{cat}</span>
              </button>

              {/* Items (only if open and not avatar) */}
              {isOpen && cat !== 'Avatar' && (
                <div className="pl-2 pb-1">
                  {shopItems
                    .filter(i => i.category === cat)
                    .map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectObject(item)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                          selectedItem?.id === item.id && viewMode === 'object'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      {/* ── CENTRE: 3D Viewport ──────────────────────────────────────────── */}
      <div className="flex-1 relative bg-[#1a1a2e] min-w-0">
        {/* Screenshot flash overlay */}
        {screenshotFlash && (
          <div className="absolute inset-0 bg-white/30 z-10 pointer-events-none transition-opacity" />
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        />

        {/* Viewport hints */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
          <span className="bg-black/60 text-gray-300 text-xs px-2 py-1 rounded-full">
            🖱 Drag to orbit
          </span>
          <span className="bg-black/60 text-gray-300 text-xs px-2 py-1 rounded-full">
            🖱 Scroll to zoom
          </span>
        </div>

        {/* Auto-rotate badge */}
        {autoRotate && (
          <div className="absolute top-3 left-3 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
            ⟳ Auto-rotating
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Info + Controls ─────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col">

        {/* Object info */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">
              {viewMode === 'avatar' ? '👤' : selectedItem?.icon ?? '📦'}
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">
                {viewMode === 'avatar' ? 'Player Avatar' : selectedItem?.name ?? 'Select an object'}
              </h3>
              <span className="text-xs text-gray-400">{currentCategory}</span>
            </div>
          </div>

          {viewMode === 'object' && selectedItem && (
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Type ID</dt>
                <dd className="text-gray-200 font-mono">{selectedItem.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Cost</dt>
                <dd className="text-gray-200">{selectedItem.cost} 💎</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Animated</dt>
                <dd className={isAnimated ? 'text-green-400' : 'text-gray-500'}>
                  {isAnimated ? '✓ Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Source</dt>
                <dd className="text-blue-400 text-right" style={{ fontSize: '10px' }}>
                  {SOURCE_FILES[currentCategory] ?? '—'}
                </dd>
              </div>
            </dl>
          )}

          {viewMode === 'avatar' && (
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Source</dt>
                <dd className="text-blue-400 text-right" style={{ fontSize: '10px' }}>
                  {SOURCE_FILES['Avatar']}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Viewport controls */}
        <div className="p-4 border-b border-gray-800 space-y-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Controls</h4>

          <button
            onClick={handleResetCamera}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            🎯 Reset View
          </button>

          <button
            onClick={() => setAutoRotate(v => !v)}
            className={`w-full px-3 py-2 rounded text-sm transition-colors ${
              autoRotate
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {autoRotate ? '⏹ Stop Rotation' : '⟳ Auto-Rotate'}
          </button>

          <button
            onClick={handleScreenshot}
            className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-sm transition-colors font-medium"
          >
            📸 Screenshot
          </button>

          {lastScreenshot && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Last screenshot:</p>
              <img
                src={lastScreenshot}
                alt="Screenshot preview"
                className="w-full rounded border border-gray-700 cursor-pointer hover:opacity-80"
                onClick={handleScreenshot}
                title="Click to re-download"
              />
            </div>
          )}
        </div>

        {/* Avatar customisation (only when avatar is selected) */}
        {viewMode === 'avatar' && (
          <div className="p-4 space-y-3 overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customise</h4>

            {/* Gender */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Gender</label>
              <div className="flex gap-2">
                {(['boy', 'girl'] as AvatarGender[]).map(g => (
                  <button
                    key={g}
                    onClick={() => handleAvatarChange('gender', g)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      avatarOptions.gender === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {g === 'boy' ? '👦 Boy' : '👧 Girl'}
                  </button>
                ))}
              </div>
            </div>

            {/* Shirt */}
            <div>
              <label className="text-xs text-gray-400">Shirt</label>
              <ColorSwatch
                colors={AVATAR_COLORS.shirt}
                selected={avatarOptions.shirtColor}
                onChange={v => handleAvatarChange('shirtColor', v)}
              />
            </div>

            {/* Pants */}
            <div>
              <label className="text-xs text-gray-400">Pants</label>
              <ColorSwatch
                colors={AVATAR_COLORS.pants}
                selected={avatarOptions.pantsColor}
                onChange={v => handleAvatarChange('pantsColor', v)}
              />
            </div>

            {/* Hair */}
            <div>
              <label className="text-xs text-gray-400">Hair</label>
              <ColorSwatch
                colors={AVATAR_COLORS.hair}
                selected={avatarOptions.hairColor}
                onChange={v => handleAvatarChange('hairColor', v)}
              />
            </div>

            {/* Skin */}
            <div>
              <label className="text-xs text-gray-400">Skin</label>
              <ColorSwatch
                colors={AVATAR_COLORS.skin}
                selected={avatarOptions.skinTone}
                onChange={v => handleAvatarChange('skinTone', v)}
              />
            </div>

            {/* Hat */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Hat</label>
              <div className="grid grid-cols-3 gap-1">
                {(['none', 'cap', 'wizard', 'crown', 'flower'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => handleAvatarChange('hat', h)}
                    className={`py-1 rounded text-xs transition-colors ${
                      avatarOptions.hat === h
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Hat colour (only if hat isn't 'none') */}
            {avatarOptions.hat !== 'none' && (
              <div>
                <label className="text-xs text-gray-400">Hat Colour</label>
                <ColorSwatch
                  colors={AVATAR_COLORS.hat}
                  selected={avatarOptions.hatColor}
                  onChange={v => handleAvatarChange('hatColor', v)}
                />
              </div>
            )}
          </div>
        )}

        {/* Cline context hint */}
        <div className="mt-auto p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            💡 Take a screenshot and paste it into Cline to ask for improvements to this object.
          </p>
        </div>
      </aside>
    </div>
  );
};
