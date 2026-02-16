/**
 * GiftTestHarness - Development Tool for Testing Reward System
 * 
 * This component provides a visual interface for testing the gem system,
 * streak achievements, and the LessonComplete component without needing real lesson data.
 * 
 * ONLY FOR DEVELOPMENT - Should be removed or gated in production.
 * 
 * Updated for Phase 1.1.11 - Now tests gems/streaks instead of automatic gift unlocks.
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
  | 'low-accuracy'
  | 'medium-accuracy'
  | 'high-accuracy'
  | 'perfect-lesson'
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'path-complete';

// ============================================
// CONSTANTS
// ============================================

/**
 * Test scenarios for LessonComplete screen.
 * Updated for gem-based rewards instead of gift unlocks.
 */
const TEST_SCENARIOS: Record<TestScenario, {
  label: string;
  description: string;
  sunDropsEarned: number;
  sunDropsMax: number;
  currentStreak: number;
  pathComplete: boolean;
}> = {
  'low-accuracy': {
    label: '😰 Low Accuracy',
    description: 'Poor lesson (10/25 SD, 40%, no streak)',
    sunDropsEarned: 10,
    sunDropsMax: 25,
    currentStreak: 0,
    pathComplete: false,
  },
  'medium-accuracy': {
    label: '😊 Medium Accuracy',
    description: 'Decent lesson (18/25 SD, 72%, 2-day streak)',
    sunDropsEarned: 18,
    sunDropsMax: 25,
    currentStreak: 2,
    pathComplete: false,
  },
  'high-accuracy': {
    label: '🌟 High Accuracy',
    description: 'Great lesson (23/25 SD, 92%, 5-day streak)',
    sunDropsEarned: 23,
    sunDropsMax: 25,
    currentStreak: 5,
    pathComplete: false,
  },
  'perfect-lesson': {
    label: '🏆 Perfect Lesson',
    description: 'Flawless (25/25 SD, 100%, 1-day streak)',
    sunDropsEarned: 25,
    sunDropsMax: 25,
    currentStreak: 1,
    pathComplete: false,
  },
  'streak-3': {
    label: '🔥 3-Day Streak!',
    description: 'Streak achievement (20/25 SD, 3-day streak)',
    sunDropsEarned: 20,
    sunDropsMax: 25,
    currentStreak: 3,
    pathComplete: false,
  },
  'streak-7': {
    label: '🔥🔥 7-Day Streak!',
    description: 'Streak achievement + decoration (22/25 SD, 7-day)',
    sunDropsEarned: 22,
    sunDropsMax: 25,
    currentStreak: 7,
    pathComplete: false,
  },
  'streak-14': {
    label: '🔥🔥🔥 14-Day Streak!',
    description: 'Big streak bonus (20/25 SD, 14-day)',
    sunDropsEarned: 20,
    sunDropsMax: 25,
    currentStreak: 14,
    pathComplete: false,
  },
  'path-complete': {
    label: '🌱 Pathway Complete',
    description: 'Finished pathway! Earn 2 seeds! (22/25 SD)',
    sunDropsEarned: 22,
    sunDropsMax: 25,
    currentStreak: 4,
    pathComplete: true,
  },
};

/**
 * Gift types for manual testing.
 * Updated: RIBBON replaced with DECORATION (shop purchase).
 */
const ALL_GIFT_TYPES: GiftType[] = [
  GiftType.WATER_DROP,
  GiftType.SPARKLE,
  GiftType.DECORATION,
  GiftType.SEED,
  GiftType.GOLDEN_FLOWER,
];

// ============================================
// COMPONENT
// ============================================

/**
 * GiftTestHarness - Visual testing interface for reward system.
 */
export const GiftTestHarness: React.FC = () => {
  const [activeView, setActiveView] = useState<'menu' | 'lesson-complete' | 'gift-unlock'>('menu');
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>('medium-accuracy');
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
            💎 Reward System Test Harness
          </h1>
          <p className="text-center text-gray-600 mb-6 text-sm">
            Test gem earning, streak achievements, and LessonComplete screen
          </p>

          {/* LessonComplete Test */}
          <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
            <h2 className="font-bold text-lg mb-3 text-gray-800">
              📚 Test LessonComplete Screen
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Select a scenario to see gems earned and streak achievements.
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
              🎁 Test Gift Types
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              View each gift type's unlock animation (for friend gifts / achievements).
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
                  {type === 'decoration' && '🎀'}
                  {type === 'seed' && '🌱'}
                  {type === 'golden_flower' && '🌸'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Note: Gifts are now earned via friends or achievements, not lessons.
            </p>
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
            currentStreak={scenario.currentStreak}
            pathComplete={scenario.pathComplete}
            onContinue={() => {
              console.log('Continue clicked');
              setActiveView('menu');
            }}
            onReplay={() => {
              console.log('Replay clicked');
            }}
            onShareSeeds={scenario.pathComplete ? () => {
              console.log('Share seeds clicked');
            } : undefined}
          />
        </div>
      </div>
    );
  }

  return null;
};

export default GiftTestHarness;