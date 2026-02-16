/**
 * DevTestHarness - Comprehensive Development Testing Tool
 * 
 * Provides a unified interface to test ALL garden features without
 * needing to complete lessons manually. Includes:
 * - Garden visualization with multiple trees
 * - Seed inventory and planting
 * - Gems/currency testing
 * - Tree health decay visualization
 * - Gift system
 * - Shop purchases
 * - Avatar customization
 * - Decoration placement
 * 
 * ONLY FOR DEVELOPMENT - Should be gated in production.
 * 
 * @module DevTestHarness
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LessonComplete } from '../lesson/LessonComplete';
import { GiftUnlock } from '../social/GiftUnlock';
import { SeedInventory } from '../shared/SeedInventory';
import { GardenWorld3D } from '../garden/GardenWorld3D';
import { ShopPanel } from '../garden/ShopPanel';
import { GiftType } from '../../types/game';

// ============================================
// TYPES
// ============================================

type TestView = 
  | 'menu'
  | 'garden'
  | 'lesson-complete'
  | 'seeds'
  | 'gems'
  | 'gifts'
  | 'shop';

/**
 * Simplified tree for dev testing
 */
interface DevTree {
  id: string;
  skillPathId: string;
  name: string;
  health: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  lastWatered: string;
}

/**
 * Simplified decoration for dev testing
 */
interface DevDecoration {
  id: string;
  emoji: string;
}

/**
 * Shop item for dev testing
 */
interface DevShopItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

interface DevState {
  seeds: number;
  gems: number;
  sunDrops: number;
  streak: number;
  trees: DevTree[];
  decorations: DevDecoration[];
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_TREES: DevTree[] = [
  {
    id: 'tree-1',
    skillPathId: 'spanish-basics',
    name: 'Spanish Oak',
    health: 100,
    lessonsCompleted: 5,
    lessonsTotal: 10,
    lastWatered: new Date().toISOString(),
  },
  {
    id: 'tree-2',
    skillPathId: 'french-greetings',
    name: 'French Maple',
    health: 75,
    lessonsCompleted: 3,
    lessonsTotal: 8,
    lastWatered: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'tree-3',
    skillPathId: 'german-numbers',
    name: 'German Pine',
    health: 40,
    lessonsCompleted: 1,
    lessonsTotal: 6,
    lastWatered: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_SHOP_ITEMS: DevShopItem[] = [
  { id: 'fountain', name: 'Fountain', price: 20, emoji: '⛲' },
  { id: 'bench', name: 'Garden Bench', price: 15, emoji: '🪑' },
  { id: 'lamppost', name: 'Lamppost', price: 25, emoji: '🏮' },
  { id: 'sunflower', name: 'Sunflower', price: 5, emoji: '🌻' },
  { id: 'rose', name: 'Rose Bush', price: 8, emoji: '🌹' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export const DevTestHarness: React.FC = () => {
  // Dev state
  const [view, setView] = useState<TestView>('menu');
  const [devState, setDevState] = useState<DevState>({
    seeds: 3,
    gems: 50,
    sunDrops: 450,
    streak: 5,
    trees: MOCK_TREES,
    decorations: [],
  });

  // Lesson complete scenario
  const [lessonScenario, setLessonScenario] = useState<{
    sunDropsEarned: number;
    sunDropsMax: number;
    pathComplete: boolean;
  } | null>(null);

  // Gift testing
  const [selectedGift, setSelectedGift] = useState<GiftType>(GiftType.WATER_DROP);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // ==========================================
  // STATE HANDLERS
  // ==========================================

  const addSeeds = useCallback((amount: number) => {
    setDevState(prev => ({ ...prev, seeds: Math.min(prev.seeds + amount, 10) }));
  }, []);

  const removeSeeds = useCallback((amount: number) => {
    setDevState(prev => ({ ...prev, seeds: Math.max(prev.seeds - amount, 0) }));
  }, []);

  const addGems = useCallback((amount: number) => {
    setDevState(prev => ({ ...prev, gems: prev.gems + amount }));
  }, []);

  const addSunDrops = useCallback((amount: number) => {
    setDevState(prev => ({ ...prev, sunDrops: prev.sunDrops + amount }));
  }, []);

  const setStreak = useCallback((days: number) => {
    setDevState(prev => ({ ...prev, streak: days }));
  }, []);

  const addTree = useCallback(() => {
    const newTree: DevTree = {
      id: `tree-${Date.now()}`,
      skillPathId: 'spanish-basics',
      name: `Tree ${devState.trees.length + 1}`,
      health: 100,
      lessonsCompleted: 0,
      lessonsTotal: 10,
      lastWatered: new Date().toISOString(),
    };
    setDevState(prev => ({ ...prev, trees: [...prev.trees, newTree] }));
  }, [devState.trees.length]);

  const removeTree = useCallback((treeId: string) => {
    setDevState(prev => ({
      ...prev,
      trees: prev.trees.filter(t => t.id !== treeId),
    }));
  }, []);

  const waterTree = useCallback((treeId: string) => {
    setDevState(prev => ({
      ...prev,
      trees: prev.trees.map(t =>
        t.id === treeId
          ? { ...t, health: 100, lastWatered: new Date().toISOString() }
          : t
      ),
    }));
  }, []);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderMenu = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 
        className="text-3xl font-bold text-center mb-2"
        style={{ fontFamily: "'Lilita One', sans-serif", color: '#047857' }}
      >
        🧪 Dev Test Harness
      </h1>
      <p className="text-center text-gray-600 mb-6">
        Test all Phase 1.1 features without completing lessons
      </p>

      {/* Current State Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-md mb-6">
        <h2 className="font-bold text-lg mb-3">📊 Current State</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl">🌱</div>
            <div className="font-bold text-xl">{devState.seeds}</div>
            <div className="text-sm text-gray-500">Seeds</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl">💎</div>
            <div className="font-bold text-xl">{devState.gems}</div>
            <div className="text-sm text-gray-500">Gems</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-2xl">☀️</div>
            <div className="font-bold text-xl">{devState.sunDrops}</div>
            <div className="text-sm text-gray-500">Sun Drops</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl">🔥</div>
            <div className="font-bold text-xl">{devState.streak} days</div>
            <div className="text-sm text-gray-500">Streak</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Trees in Garden:</span>
            <span className="font-bold">{devState.trees.length}</span>
          </div>
        </div>
      </div>

      {/* Test Modules */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg">🎮 Test Modules</h2>
        
        <button
          onClick={() => setView('garden')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">🌳</span>
          <div className="text-left">
            <div className="font-bold">Garden View</div>
            <div className="text-sm text-gray-500">Test full garden with trees, decorations</div>
          </div>
        </button>

        <button
          onClick={() => setView('lesson-complete')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">📚</span>
          <div className="text-left">
            <div className="font-bold">Lesson Complete</div>
            <div className="text-sm text-gray-500">Test completion screen, rewards, seeds</div>
          </div>
        </button>

        <button
          onClick={() => setView('seeds')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">🌱</span>
          <div className="text-left">
            <div className="font-bold">Seed System</div>
            <div className="text-sm text-gray-500">Plant seeds, earn seeds from paths</div>
          </div>
        </button>

        <button
          onClick={() => setView('gems')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">💎</span>
          <div className="text-left">
            <div className="font-bold">Gem System</div>
            <div className="text-sm text-gray-500">Test gem earning and spending</div>
          </div>
        </button>

        <button
          onClick={() => setView('gifts')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">🎁</span>
          <div className="text-left">
            <div className="font-bold">Gift System</div>
            <div className="text-sm text-gray-500">Test gift unlock animations</div>
          </div>
        </button>

        <button
          onClick={() => setView('shop')}
          className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-4"
        >
          <span className="text-3xl">🛒</span>
          <div className="text-left">
            <div className="font-bold">Shop Panel</div>
            <div className="text-sm text-gray-500">Purchase decorations with gems</div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-yellow-50 rounded-xl p-4">
        <h2 className="font-bold text-lg mb-3">⚡ Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addSeeds(1)}
            className="px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm"
          >
            +1 🌱
          </button>
          <button
            onClick={() => addGems(10)}
            className="px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm"
          >
            +10 💎
          </button>
          <button
            onClick={() => addSunDrops(50)}
            className="px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm"
          >
            +50 ☀️
          </button>
          <button
            onClick={() => setStreak(devState.streak + 1)}
            className="px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm"
          >
            +1 Day 🔥
          </button>
          <button
            onClick={addTree}
            className="px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm"
          >
            Add Tree 🌳
          </button>
        </div>
      </div>
    </div>
  );

  const renderGarden = () => (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button
          onClick={() => setView('menu')}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          ← Back
        </button>
        <div className="flex items-center gap-4">
          <span>🌱 {devState.seeds}</span>
          <span>💎 {devState.gems}</span>
          <span>☀️ {devState.sunDrops}</span>
        </div>
      </div>

      {/* Garden */}
      <div className="flex-1 bg-gradient-to-b from-sky-200 to-green-300">
        <div className="text-center p-8">
          <p className="text-gray-600">
            🌳 {devState.trees.length} trees in garden
          </p>
          <div className="mt-4 space-y-2">
            {devState.trees.map(tree => (
              <div key={tree.id} className="bg-white/80 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold">{tree.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    Health: {tree.health}% | Lessons: {tree.lessonsCompleted}/{tree.lessonsTotal}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => waterTree(tree.id)}
                    className="px-3 py-1 bg-blue-100 rounded hover:bg-blue-200 transition text-sm"
                  >
                    💧 Water
                  </button>
                  <button
                    onClick={() => removeTree(tree.id)}
                    className="px-3 py-1 bg-red-100 rounded hover:bg-red-200 transition text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="bg-white p-4 flex justify-center gap-4">
        <button
          onClick={() => {
            if (devState.seeds > 0) {
              removeSeeds(1);
              addTree();
            }
          }}
          disabled={devState.seeds === 0}
          className={`px-6 py-3 rounded-full font-medium transition ${
            devState.seeds > 0
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          🌱 Plant Seed ({devState.seeds} available)
        </button>
      </div>
    </div>
  );

  const renderLessonComplete = () => {
    const scenarios = [
      { label: 'Low (40%)', sunDropsEarned: 10, sunDropsMax: 25, pathComplete: false },
      { label: 'Medium (72%)', sunDropsEarned: 18, sunDropsMax: 25, pathComplete: false },
      { label: 'High (92%)', sunDropsEarned: 23, sunDropsMax: 25, pathComplete: false },
      { label: 'Perfect (100%)', sunDropsEarned: 25, sunDropsMax: 25, pathComplete: false },
      { label: 'Path Complete! 🎉', sunDropsEarned: 24, sunDropsMax: 25, pathComplete: true },
    ];

    if (lessonScenario) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7]">
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setLessonScenario(null)}
              className="px-4 py-2 bg-white rounded-lg shadow-md font-medium hover:bg-gray-50 transition"
            >
              ← Back
            </button>
          </div>
          <div className="min-h-screen flex items-center justify-center">
            <LessonComplete
              sunDropsEarned={lessonScenario.sunDropsEarned}
              sunDropsMax={lessonScenario.sunDropsMax}
              currentStreak={devState.streak}
              pathComplete={lessonScenario.pathComplete}
              onContinue={() => {
                addSunDrops(lessonScenario.sunDropsEarned);
                if (lessonScenario.pathComplete) {
                  addSeeds(2);
                }
                setLessonScenario(null);
              }}
              onReplay={() => setLessonScenario(null)}
              onShareSeeds={lessonScenario.pathComplete ? () => {
                console.log('Share seeds!');
              } : undefined}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setView('menu')}
            className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold text-center mb-6">📚 Lesson Complete Testing</h1>

          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h2 className="font-bold mb-3">Select Scenario:</h2>
            <div className="space-y-2">
              {scenarios.map((scenario, i) => (
                <button
                  key={i}
                  onClick={() => setLessonScenario({
                    sunDropsEarned: scenario.sunDropsEarned,
                    sunDropsMax: scenario.sunDropsMax,
                    pathComplete: scenario.pathComplete,
                  })}
                  className="w-full p-3 text-left rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="font-medium">{scenario.label}</div>
                  <div className="text-sm text-gray-500">
                    {scenario.sunDropsEarned}/{scenario.sunDropsMax} Sun Drops
                    {scenario.pathComplete && ' • +2 Seeds!'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 rounded-xl p-4">
            <h3 className="font-bold mb-2">Current Streak: {devState.streak} days</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setStreak(Math.max(0, devState.streak - 1))}
                className="px-3 py-1 bg-white rounded shadow-sm"
              >
                -1
              </button>
              <button
                onClick={() => setStreak(devState.streak + 1)}
                className="px-3 py-1 bg-white rounded shadow-sm"
              >
                +1
              </button>
              <button
                onClick={() => setStreak(7)}
                className="px-3 py-1 bg-white rounded shadow-sm"
              >
                Set 7
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSeeds = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setView('menu')}
          className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-center mb-6">🌱 Seed System Testing</h1>

        <div className="bg-white rounded-2xl p-6 shadow-md mb-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">🌱</div>
            <div className="text-4xl font-bold text-green-600">{devState.seeds}</div>
            <div className="text-gray-500">seeds available</div>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => removeSeeds(1)}
              disabled={devState.seeds === 0}
              className="px-6 py-3 bg-red-100 text-red-600 rounded-full font-medium disabled:opacity-50"
            >
              -1
            </button>
            <button
              onClick={() => addSeeds(1)}
              disabled={devState.seeds >= 10}
              className="px-6 py-3 bg-green-100 text-green-600 rounded-full font-medium disabled:opacity-50"
            >
              +1
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            Max: 10 seeds
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h2 className="font-bold mb-3">How Seeds Work:</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>🌱 Complete a path → +2 seeds</li>
            <li>⭐ Perfect path (all 3★) → +1 bonus seed</li>
            <li>🔥 7-day streak → +1 seed</li>
            <li>🌳 Plant a seed → Create new tree</li>
          </ul>
        </div>

        <div className="mt-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Trees in garden: {devState.trees.length}/8
            </p>
            <button
              onClick={() => {
                if (devState.seeds > 0 && devState.trees.length < 8) {
                  removeSeeds(1);
                  addTree();
                }
              }}
              disabled={devState.seeds === 0 || devState.trees.length >= 8}
              className={`px-6 py-3 rounded-full font-medium transition ${
                devState.seeds > 0 && devState.trees.length < 8
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              🌱 Plant a Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGems = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setView('menu')}
          className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-center mb-6">💎 Gem System Testing</h1>

        <div className="bg-white rounded-2xl p-6 shadow-md mb-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-2">💎</div>
            <div className="text-4xl font-bold text-blue-600">{devState.gems}</div>
            <div className="text-gray-500">gems</div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => addGems(10)}
              className="px-6 py-3 bg-blue-100 text-blue-600 rounded-full font-medium"
            >
              +10
            </button>
            <button
              onClick={() => addGems(50)}
              className="px-6 py-3 bg-blue-100 text-blue-600 rounded-full font-medium"
            >
              +50
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h2 className="font-bold mb-3">How Gems Work:</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>💎 Earn from lessons (premium currency)</li>
            <li>💎 Buy decorations in shop</li>
            <li>💎 Special items and cosmetics</li>
            <li>💎 Gift to friends</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderGifts = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setView('menu')}
          className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-center mb-6">🎁 Gift System Testing</h1>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h2 className="font-bold mb-3">Select Gift Type:</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: GiftType.WATER_DROP, emoji: '💧', name: 'Water Drop' },
              { type: GiftType.SPARKLE, emoji: '✨', name: 'Sparkle' },
              { type: GiftType.DECORATION, emoji: '🎀', name: 'Decoration' },
              { type: GiftType.SEED, emoji: '🌱', name: 'Seed' },
              { type: GiftType.GOLDEN_FLOWER, emoji: '🌸', name: 'Golden Flower' },
            ].map(gift => (
              <button
                key={gift.type}
                onClick={() => {
                  setSelectedGift(gift.type);
                  setShowGiftModal(true);
                }}
                className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-center"
              >
                <div className="text-3xl mb-1">{gift.emoji}</div>
                <div className="text-sm font-medium">{gift.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showGiftModal && (
          <GiftUnlock
            giftType={selectedGift}
            onDismiss={() => setShowGiftModal(false)}
            onSend={() => {
              console.log('Send gift:', selectedGift);
              setShowGiftModal(false);
            }}
            canSend={true}
          />
        )}
      </AnimatePresence>
    </div>
  );

  const renderShop = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7]">
      <div className="p-4">
        <button
          onClick={() => setView('menu')}
          className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <div className="text-center mb-4">
          <span className="text-2xl font-bold">💎 {devState.gems} gems</span>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl min-h-[70vh] p-4">
        <h2 className="font-bold text-lg mb-4">🛒 Shop</h2>
        <div className="grid grid-cols-2 gap-3">
          {MOCK_SHOP_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (devState.gems >= item.price) {
                  setDevState(prev => ({
                    ...prev,
                    gems: prev.gems - item.price,
                    decorations: [...prev.decorations, {
                      id: `${item.id}-${Date.now()}`,
                      emoji: item.emoji,
                    }],
                  }));
                }
              }}
              disabled={devState.gems < item.price}
              className={`p-4 rounded-xl text-center transition ${
                devState.gems >= item.price
                  ? 'bg-gray-50 hover:bg-gray-100'
                  : 'bg-gray-100 opacity-50'
              }`}
            >
              <div className="text-4xl mb-2">{item.emoji}</div>
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-blue-600 text-sm">💎 {item.price}</div>
            </button>
          ))}
        </div>

        {devState.decorations.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-bold mb-2">Purchased Decorations:</h3>
            <div className="flex flex-wrap gap-2">
              {devState.decorations.map(d => (
                <span key={d.id} className="text-2xl">{d.emoji}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7]">
      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderMenu()}
          </motion.div>
        )}

        {view === 'garden' && (
          <motion.div
            key="garden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderGarden()}
          </motion.div>
        )}

        {view === 'lesson-complete' && (
          <motion.div
            key="lesson-complete"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderLessonComplete()}
          </motion.div>
        )}

        {view === 'seeds' && (
          <motion.div
            key="seeds"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSeeds()}
          </motion.div>
        )}

        {view === 'gems' && (
          <motion.div
            key="gems"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderGems()}
          </motion.div>
        )}

        {view === 'gifts' && (
          <motion.div
            key="gifts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderGifts()}
          </motion.div>
        )}

        {view === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderShop()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevTestHarness;