/**
 * GiftTestHarness - Development Tool for Testing Gift System
 * 
 * This component provides a visual interface for testing all gift types
 * and the LessonComplete component without needing real lesson data.
 * 
 * ONLY FOR DEVELOPMENT - Should be removed or gated in production.
 * 
 * @module GiftTestHarness
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LessonComplete } from '../lesson/LessonComplete';
import { GiftUnlock } from '../social/GiftUnlock';
import { GiftType } from '../../types/game';

// ============================================
// TYPES
// ============================================

type TestScenario = 
  | 'basic-water'
  | 'sparkle-20sd'
  | 'ribbon-3lessons'
  | 'golden-3stars'
  | 'seed-pathcomplete'
  | 'perfect-all';

// ============================================
// CONSTANTS
// ============================================

const TEST_SCENARIOS: Record<TestScenario, {
  label: string;
  description: string;
  sunDropsEarned: number;
  sunDropsMax: number;
  stars: number;
  lessonsCompletedToday: number;
  pathComplete: boolean;
}> = {
  'basic-water': {
    label: '💧 Water Drop',
    description: 'Basic lesson (10/20 SD, 1 star)',
    sunDropsEarned: 10,
    sunDropsMax: 20,
    stars: 1,
    lessonsCompletedToday: 1,
    pathComplete: false,
  },
  'sparkle-20sd': {
    label: '✨ Sparkle',
    description: 'High Sun Drops (22/25 SD, 2 stars)',
    sunDropsEarned: 22,
    sunDropsMax: 25,
    stars: 2,
    lessonsCompletedToday: 2,
    pathComplete: false,
  },
  'ribbon-3lessons': {
    label: '🎀 Ribbon',
    description: '3 lessons today (15/20 SD, 2 stars)',
    sunDropsEarned: 15,
    sunDropsMax: 20,
    stars: 2,
    lessonsCompletedToday: 3,
    pathComplete: false,
  },
  'golden-3stars': {
    label: '🌸 Golden Flower',
    description: 'Perfect stars (25/25 SD, 3 stars)',
    sunDropsEarned: 25,
    sunDropsMax: 25,
    stars: 3,
    lessonsCompletedToday: 1,
    pathComplete: false,
  },
  'seed-pathcomplete': {
    label: '🌱 Seed',
    description: 'Path complete (18/22 SD, 2 stars)',
    sunDropsEarned: 18,
    sunDropsMax: 22,
    stars: 2,
    lessonsCompletedToday: 2,
    pathComplete: true,
  },
  'perfect-all': {
    label: '🏆 Perfect Lesson',
    description: 'All conditions met (25/25 SD, 3 stars, 3 lessons, path done)',
    sunDropsEarned: 25,
    sunDropsMax: 25,
    stars: 3,
    lessonsCompletedToday: 3,
    pathComplete: true,
  },
};

const ALL_GIFT_TYPES: GiftType[] = [
  GiftType.WATER_DROP,
  GiftType.SPARKLE,
  GiftType.RIBBON,
  GiftType.SEED,
  GiftType.GOLDEN_FLOWER,
];

// ============================================
// COMPONENT
// ============================================

/**
 * GiftTestHarness - Visual testing interface for gift system.
 */
export const GiftTestHarness: React.FC = () => {
  const [activeView, setActiveView] = useState<'menu' | 'lesson-complete' | 'gift-unlock'>('menu');
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>('basic-water');
  const [selectedGiftType, setSelectedGiftType] = useState<GiftType>(GiftType.WATER_DROP);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Render main menu
  if (activeView === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
        <div className="max-w-md mx-auto">
          <h1 
            className="text-2xl font-bold text-center mb-2"
            style={{ fontFamily: "'Lilita One', sans-serif", color: '#047857' }}
          >
            🎁 Gift System Test Harness
          </h1>
          <p className="text-center text-gray-600 mb-6 text-sm">
            Test gift unlocks and LessonComplete screen
          </p>

          {/* LessonComplete Test */}
          <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-800">
              📚 Test LessonComplete Screen
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Select a scenario to see the LessonComplete screen with different gift outcomes.
            </p>
            <div className="space-y-2">
              {(Object.keys(TEST_SCENARIOS) as TestScenario[]).map((scenario) => (
                <button
                  key={scenario}
                  onClick={() => {
                    setSelectedScenario(scenario);
                    setActiveView('lesson-complete');
                  }}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="font-medium">{TEST_SCENARIOS[scenario].label}</div>
                  <div className="text-sm text-gray-500">{TEST_SCENARIOS[scenario].description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* GiftUnlock Test */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h2 className="font-bold text-lg mb-3 text-gray-800">
              🎉 Test GiftUnlock Modal
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              View each gift type's unlock animation directly.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {ALL_GIFT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedGiftType(type);
                    setShowGiftModal(true);
                  }}
                  className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-2xl"
                  title={type}
                >
                  {type === 'water_drop' && '💧'}
                  {type === 'sparkle' && '✨'}
                  {type === 'ribbon' && '🎀'}
                  {type === 'seed' && '🌱'}
                  {type === 'golden_flower' && '🌸'}
                </button>
              ))}
            </div>
          </div>

          {/* GiftUnlock Modal */}
          <AnimatePresence>
            {showGiftModal && (
              <GiftUnlock
                giftType={selectedGiftType}
                onDismiss={() => setShowGiftModal(false)}
                onSend={() => {
                  console.log('Send gift:', selectedGiftType);
                  setShowGiftModal(false);
                }}
                canSend={true}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Render LessonComplete test
  if (activeView === 'lesson-complete') {
    const scenario = TEST_SCENARIOS[selectedScenario];
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7]">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setActiveView('menu')}
            className="px-4 py-2 bg-white rounded-lg shadow-md font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ← Back to Menu
          </button>
        </div>

        {/* Scenario info */}
        <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-2 text-sm">
          <div className="font-medium">{scenario.label}</div>
          <div className="text-gray-500">{scenario.description}</div>
        </div>

        {/* LessonComplete */}
        <div className="min-h-screen flex items-center justify-center">
          <LessonComplete
            sunDropsEarned={scenario.sunDropsEarned}
            sunDropsMax={scenario.sunDropsMax}
            onContinue={() => {
              console.log('Continue clicked');
              setActiveView('menu');
            }}
            onReplay={() => {
              console.log('Replay clicked');
            }}
            lessonsCompletedToday={scenario.lessonsCompletedToday}
            pathComplete={scenario.pathComplete}
            userId="test-user-123"
          />
        </div>
      </div>
    );
  }

  return null;
};

export default GiftTestHarness;