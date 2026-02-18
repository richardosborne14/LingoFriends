/**
 * App.tsx - Main Application Entry Point
 * 
 * LingoFriends Garden-First Navigation (Task 1.1.6)
 * 
 * Navigation Hierarchy:
 * 1. Not authenticated → AuthScreen
 * 2. Authenticated but !onboardingComplete → OnboardingContainer
 * 3. Authenticated and onboardingComplete → GameApp
 *    - Garden (default): Explore garden with trees
 *    - Path: View skill path when tree selected
 *    - Lesson: Active lesson when lesson node selected
 * 
 * @module App
 */

import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingContainer } from './components/onboarding';
import { ProfileSettings } from './components/ProfileSettings';
import { Logo } from './components/ui';
import { useAuth } from './src/hooks/useAuth';
import { useNavigation } from './src/hooks/useNavigation';
import { useGameStats } from './src/hooks/useGameStats';
import { AppHeader, TabBar } from './src/components/navigation';
import { GardenWorld3D, ShopPanel, shopPanelStyles, GardenDPad } from './src/components/garden';
import { DEFAULT_AVATAR, ShopItem } from './src/renderer';
import { PathView } from './src/components/path';
import { LessonView } from './src/components/lesson';
import { generateLessonPlan } from './src/services/lessonPlanService';
import {
  saveLessonCompletion,
  postLessonSRSUpdate,
  applyTreeCare as applyTreeCareService,
  savePlacedObject,
} from './src/services/gameProgressService';
import { learnerProfileService } from './src/services/learnerProfileService';
import { getCurrentUserId } from './services/pocketbaseService';
import { DevTestHarness, FlowTestHarness, TreeRendererTestHarness } from './src/components/dev';
import { TutorialProvider, TutorialStep } from './src/components/tutorial';
import {
  MOCK_USER_TREES,
  MOCK_SKILL_PATHS,
  MOCK_AVATAR,
  getSkillPathById,
} from './src/data/mockGameData';
import type { OnboardingData } from './components/onboarding';
import type { UserTree, SkillPathLesson, LessonPlan } from './src/types/game';
import type { LessonResult } from './src/components/lesson/LessonView';
import type { NativeLanguage, TargetLanguage } from './types';

// ============================================
// LOADING SCREEN
// ============================================

/**
 * Loading screen shown while checking auth state
 */
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#e0f2fe] flex items-center justify-center">
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Logo size="xl" animate />
      <p className="text-[#737373] font-medium mt-4">Loading...</p>
    </motion.div>
  </div>
);

// ============================================
// ONBOARDING FLOW
// ============================================

/**
 * Onboarding Flow Wrapper
 * 
 * Wraps OnboardingContainer with the completion handler that syncs to Pocketbase.
 */
interface OnboardingFlowProps {
  profile: ReturnType<typeof useAuth>['profile'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ profile, updateProfile }) => {
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    console.log('[App] Onboarding complete:', data);
    
    try {
      await updateProfile({
        name: data.displayName,
        nativeLanguage: data.nativeLanguage,
        subjectType: data.subjectType,
        targetSubject: data.targetSubject,
        selectedInterests: data.selectedInterests,
        targetLanguage: data.subjectType === 'language'
          ? (data.targetSubject as TargetLanguage)
          : 'English',
        onboardingComplete: true,
      });
      
      console.log('[App] Profile updated successfully');
    } catch (error) {
      console.error('[App] Failed to save onboarding data:', error);
      throw error;
    }
  }, [updateProfile]);

  return (
    <OnboardingContainer
      initialNativeLanguage={profile?.nativeLanguage || 'English'}
      initialDisplayName={profile?.name}
      onComplete={handleOnboardingComplete}
    />
  );
};

// ============================================
// GAME APP (MAIN APP)
// ============================================

/**
 * Main game application after authentication and onboarding.
 * 
 * Handles navigation between Garden → Path → Lesson views.
 * Uses mock data until Task 1.1.7 integrates real data.
 */
interface GameAppProps {
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
  onLogout: () => void;
  onUpdateProfile: ReturnType<typeof useAuth>['updateProfile'];
}

const GameApp: React.FC<GameAppProps> = ({ profile, onLogout, onUpdateProfile }) => {
  // Navigation state
  const { state, actions } = useNavigation();
  
  // UI state
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showFriendsPlaceholder, setShowFriendsPlaceholder] = useState(false);
  
  // Shop state
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  
  // Track when lesson is exiting (for header/tab bar visibility during transition)
  const [isLessonExiting, setIsLessonExiting] = useState(false);
  
  // Lesson state (for generating lesson plan when starting)
  const [lessonLoading, setLessonLoading] = useState(false);

  // Real game stats from Pocketbase (gems, sunDrops, streak).
  // refreshStats() is called after any mutation so the header updates immediately.
  const { stats, refreshStats } = useGameStats();

  // Trees still use mock data for display — the actual game data is written to PB
  // on every lesson/care action. Full PB tree loading comes in a future sub-task.
  const trees = MOCK_USER_TREES;
  const avatar = MOCK_AVATAR;

  /**
   * Handle opening a skill path from the garden
   */
  const handleOpenPath = useCallback((tree: UserTree) => {
    console.log('[GameApp] Opening path for tree:', tree.name);
    actions.goToPath(tree);
  }, [actions]);

  /**
   * Handle starting a lesson from the path view
   */
  const handleStartLesson = useCallback(async (lesson: SkillPathLesson) => {
    console.log('[GameApp] Starting lesson:', lesson.title);
    setLessonLoading(true);
    
    try {
      const lessonPlan = await generateLessonPlan({
        lesson,
        targetLanguage: profile.targetLanguage,
      });
      
      actions.goToLesson(lesson, lessonPlan);
    } catch (error) {
      console.error('[GameApp] Failed to generate lesson:', error);
      // TODO: Show error toast to user
    } finally {
      setLessonLoading(false);
    }
  }, [actions, profile.targetLanguage]);

  /**
   * Handle lesson completion — saves progress to Pocketbase.
   *
   * Writes sunDropsEarned + lessonsCompleted to the user_tree record,
   * awards gem bonus, and updates streak on the profile.
   * Non-fatal: if PB is unreachable the reward screen still shows.
   */
  const handleLessonComplete = useCallback(async (result: LessonResult) => {
    console.log('[GameApp] Lesson complete:', result);

    // Save to Pocketbase in the background — both calls are fire-and-forget.
    // The user sees the garden immediately; progress and SRS sync behind the scenes.
    if (state.selectedTree) {
      saveLessonCompletion({
        skillPathId: state.selectedTree.skillPathId,
        sunDropsEarned: result.sunDropsEarned ?? 0,
        // LessonResult uses `stars` (1-3 rating) — maps directly to starsEarned
        starsEarned: result.stars ?? 0,
      }).then(() => {
        refreshStats();
      }).catch(err => {
        console.error('[GameApp] Progress save failed:', err);
      });
    }

    // Task F: SRS write-back — update learner model confidence + chunk stats.
    // Coarse signal: star rating → correct/incorrect, triggers i+1 recalibration.
    postLessonSRSUpdate(result.stars ?? 1).catch(err => {
      // Non-fatal: pedagogy engine degrades gracefully without this update
      console.warn('[GameApp] SRS update failed (non-fatal):', err);
    });

    // Phase 1.2 GAP 3 FIX: Record session in the learner profile so the
    // pedagogy engine has engagement data (totalSessions, timeMinutes, etc.).
    //
    // Approximations:
    // - correctFirstTry uses star rating as a proxy (3★ ≈ 100%, 1★ ≈ 33%)
    // - helpUsed is 0 until LessonResult tracks help per activity (Phase 2)
    //
    // Fire-and-forget — never block navigation or show errors to the child.
    // getCurrentUserId() reads from pb.authStore.record so it is always
    // in sync with the active session without needing it on UserProfile.
    const currentUserId = getCurrentUserId() ?? '';
    learnerProfileService.recordSession(currentUserId, {
      durationMinutes: Math.max(1, Math.round((result.timeSpentMs ?? 0) / 60000)),
      chunksEncountered: result.stepsCompleted ?? 0,
      correctFirstTry: Math.round((result.stepsCompleted ?? 0) * ((result.stars ?? 1) / 3)),
      helpUsed: 0,
    }).catch(err => {
      console.warn('[GameApp] Learner profile session record failed (non-fatal):', err);
    });

    // Navigate back immediately (don't wait for PB)
    actions.goBack();
  }, [actions, state.selectedTree, refreshStats]);

  /**
   * Handle lesson exit (user closed without completing)
   */
  const handleLessonExit = useCallback(() => {
    console.log('[GameApp] Lesson exited');
    actions.goBack();
  }, [actions]);

  /**
   * Handle back navigation from path view
   */
  const handlePathBack = useCallback(() => {
    actions.goToGarden();
  }, [actions]);

  /**
   * Handle friends tab click (placeholder)
   */
  const handleFriendsClick = useCallback(() => {
    console.log('[GameApp] Friends clicked - placeholder');
    setShowFriendsPlaceholder(true);
    // TODO (Task 1.1.11): Implement friends view
  }, []);

  /**
   * Handle shop item selection
   */
  const handleShopItemSelect = useCallback((item: ShopItem) => {
    console.log('[GameApp] Shop item selected:', item.name);
    setSelectedShopItem(item);
    // TODO: Enter placement mode in GardenWorld3D
  }, []);

  /**
   * Handle shop item placement cancel
   */
  const handleShopCancel = useCallback(() => {
    console.log('[GameApp] Shop placement cancelled');
    setSelectedShopItem(null);
  }, []);

  /**
   * Handle tree care application (consumable items from shop).
   *
   * Calls applyTreeCare in gameProgressService which:
   * 1. Verifies gem balance
   * 2. Applies health/sunDrop boost to the tree in PB
   * 3. Deducts gems from profile
   * Then refreshes header stats.
   */
  const handleApplyTreeCare = useCallback(async (item: ShopItem, treeId: string) => {
    console.log('[GameApp] Applying tree care:', item.name, 'to tree:', treeId);

    // Find the tree's skillPathId (tree care service uses skillPathId, not treeId)
    const targetTree = trees.find(t => t.id === treeId);
    if (!targetTree) return;

    try {
      await applyTreeCareService({
        skillPathId: targetTree.skillPathId,
        healthRestore: item.healthRestore ?? 0,
        sunDropBoost: item.sunDropBoost ?? 0,
        gemCost: item.cost,   // ShopItem uses `cost`, not `price`
      });
      // Refresh header so new gem balance shows immediately
      await refreshStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      console.error('[GameApp] Tree care failed:', msg);
      // TODO (Task D — Tutorial): Show kid-friendly error toast
    }

    setSelectedShopItem(null);
  }, [trees, refreshStats]);

  // Get skill path for selected tree
  const selectedSkillPath = state.selectedTree
    ? getSkillPathById(state.selectedTree.skillPathId)
    : null;

  // Inject shop panel styles
  useEffect(() => {
    const styleId = 'shop-panel-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = shopPanelStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Track lesson exit for smooth transition (hide header/tab until animation completes)
  useEffect(() => {
    // Reset exiting state when we've finished transitioning away from lesson
    if (state.currentView !== 'lesson' && isLessonExiting) {
      // Small delay to let the exit animation complete
      const timer = setTimeout(() => setIsLessonExiting(false), 250);
      return () => clearTimeout(timer);
    }
  }, [state.currentView, isLessonExiting]);

  // Set exiting flag when leaving lesson
  const handleLessonExitWithTransition = useCallback(() => {
    setIsLessonExiting(true);
    handleLessonExit();
  }, [handleLessonExit]);

  // Calculate transition direction for animations
  const getTransitionDirection = (): 'left' | 'right' => {
    switch (state.currentView) {
      case 'path':
        return 'left';
      case 'lesson':
        return 'left';
      default:
        return 'right';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] flex flex-col">
      {/* Header - hidden during lesson and lesson exit transition */}
      {state.currentView !== 'lesson' && !isLessonExiting && (
          <AppHeader
          avatarEmoji={avatar.emoji}
          streak={stats.streak}
          sunDrops={stats.sunDrops}
          gems={stats.gems}
          onSettingsClick={() => setShowProfileSettings(true)}
        />
      )}

      {/* Main content area */}
      <main className={`flex-1 ${state.currentView !== 'lesson' ? 'pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          {/* Garden View */}
          {state.currentView === 'garden' && (
            <motion.div
              key="garden"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              id="garden-view"
              className="h-full relative"
            >
              {/* 3D garden with learning trees — clicking a tree opens its skill path */}
              <GardenWorld3D
                className="h-[calc(100vh-180px)]"
                avatarOptions={DEFAULT_AVATAR}
                userTrees={trees.map((t) => ({
                  id: t.id,
                  gridX: t.gridPosition.gx,
                  gridZ: t.gridPosition.gz,
                  sunDropsEarned: t.sunDropsEarned,
                  health: t.health,
                  skillPathId: t.skillPathId,
                  status: t.status,
                }))}
                onTreeClick={(treeData) => {
                  // Find the full UserTree from mock data by skillPathId
                  const tree = trees.find((t) => t.skillPathId === treeData.skillPathId);
                  if (tree) {
                    handleOpenPath(tree);
                  }
                }}
                onAvatarMove={(gx, gz) => {
                  console.log('[GameApp] Avatar moved to', gx, gz);
                }}
                // Shop placement mode — pass the selected item so the renderer shows a ghost preview
                placementModeItem={selectedShopItem}
                onPlacementEnd={(placed) => {
                  // Capture item before clearing (needed to know what was placed)
                  const placedItem = selectedShopItem;
                  setSelectedShopItem(null);
                  if (placed && placedItem) {
                    console.log('[GameApp] Object placed — closing shop');
                    // TODO: pass gx/gz from GardenWorld3D once onObjectPlaced(type,gx,gz)
                    // callback is added to GardenWorld3D props. For now, track by type only.
                    // savePlacedObject({ objectType: placedItem.id, gx, gz });
                    setIsShopOpen(false);
                  }
                }}
              />

              {/* D-pad overlay for touch avatar movement (hidden on desktop) */}
              <GardenDPad />
            </motion.div>
          )}

          {/* Path View */}
          {state.currentView === 'path' && state.selectedTree && selectedSkillPath && (
            <motion.div
              key="path"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PathView
                skillPath={selectedSkillPath}
                userTree={state.selectedTree}
                avatar={avatar}
                onStartLesson={handleStartLesson}
                onBack={handlePathBack}
              />
            </motion.div>
          )}

          {/* Lesson View */}
          {state.currentView === 'lesson' && state.activeLessonPlan && (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <LessonView
                lesson={state.activeLessonPlan}
                onComplete={handleLessonComplete}
                onExit={handleLessonExitWithTransition}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading overlay for lesson generation */}
        {lessonLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-xl text-center"
            >
              <div className="text-4xl mb-4">📚</div>
              <p className="font-medium text-gray-700">Preparing your lesson...</p>
            </motion.div>
          </div>
        )}
      </main>

      {/* Tab Bar - hidden during lesson and lesson exit transition */}
      {state.currentView !== 'lesson' && !isLessonExiting && (
        <TabBar
          currentView={state.currentView}
          onGarden={actions.goToGarden}
          onFriends={handleFriendsClick}
        />
      )}

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        profile={profile}
        onSave={onUpdateProfile}
      />

      {/* Friends Placeholder Modal */}
      {showFriendsPlaceholder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center"
          >
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Friends Coming Soon!</h2>
            <p className="text-gray-600 mb-6">
              You'll be able to visit your friends' gardens and send them gifts!
            </p>
            <button
              onClick={() => setShowFriendsPlaceholder(false)}
              className="px-6 py-2 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {/* Floating Shop Button - Only show in garden view */}
      {state.currentView === 'garden' && !isShopOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => setIsShopOpen(true)}
          className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center text-3xl z-30"
          title="Open Shop"
        >
          🛒
        </motion.button>
      )}

      {/* ── Tutorial Steps ────────────────────────────────────
        TutorialStep components are self-hiding — they only render when
        their `step` matches the TutorialManager's currentStep.
        Placed at the bottom so they render above everything else via z-index.
      */}
      <TutorialStep
        step="welcome"
        icon="👋"
        title="Welcome to LingoFriends!"
        description="Let's take a quick tour of your learning garden. It only takes a minute!"
        nextLabel="Let's go! 🚀"
        hideSkip={false}
      />
      <TutorialStep
        step="garden_intro"
        targetSelector="#garden-view"
        icon="🌳"
        title="This is your garden!"
        description="Each tree represents a language you're learning. Walk up to a tree and tap it to start a lesson."
        nextLabel="Cool! 😎"
      />
      <TutorialStep
        step="header_stats"
        targetSelector="header"
        icon="☀️"
        title="Your progress lives up here"
        description="Sun Drops ☀️ are earned by completing lessons. Gems 💎 are spent in the shop. Keep your streak 🔥 going every day!"
        nextLabel="Got it!"
      />
      <TutorialStep
        step="tap_tree"
        targetSelector="#garden-view"
        icon="👆"
        title="Tap a tree to start learning!"
        description="Walk your avatar to any glowing tree and tap it. Your first lesson is waiting!"
        nextLabel="I'll try it!"
        hideSkip={false}
      />
      <TutorialStep
        step="shop_intro"
        targetSelector="[title='Open Shop']"
        icon="🛒"
        title="The Shop"
        description="Spend your Gems on decorations for your garden, or buy Tree Care items to keep your trees healthy!"
        nextLabel="Nice!"
      />
      <TutorialStep
        step="complete"
        icon="🎉"
        title="You're all set!"
        description="Your adventure starts now. Complete lessons every day to grow your trees and earn rewards!"
        nextLabel="Let's learn! 🌱"
        hideSkip={true}
      />

      {/* Shop Panel - Only show in garden view */}
      {state.currentView === 'garden' && (
        <ShopPanel
          isOpen={isShopOpen}
          onClose={() => setIsShopOpen(false)}
          gemBalance={stats.gems}
          selectedItem={selectedShopItem}
          onSelectItem={handleShopItemSelect}
          onCancel={handleShopCancel}
          userTrees={trees.map((t) => ({
            id: t.id,
            name: t.name,
            icon: '🌳',
            health: t.health,
            skillPathId: t.skillPathId,
          }))}
          onApplyTreeCare={handleApplyTreeCare}
        />
      )}
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

/**
 * Main App Container
 * 
 * Handles auth routing and orchestrates the main views.
 * 
 * DEV MODE: Press Ctrl+Shift+D (or Cmd+Shift+D on Mac) to toggle test harness.
 */
function App() {
  const { isAuthenticated, isLoading: authLoading, profile, logout, updateProfile } = useAuth();
  
  // Dev mode for testing components directly
  const [showDevHarness, setShowDevHarness] = useState(false);
  const [devHarnessTab, setDevHarnessTab] = useState<'dev' | 'flow' | 'trees'>('trees');
  
  // Keyboard shortcut to toggle dev harness (Ctrl/Cmd + Shift + D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        setShowDevHarness(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show dev test harness if toggled
  if (showDevHarness) {
    return (
      <>
        {/* Tab switcher */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setDevHarnessTab('trees')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                devHarnessTab === 'trees' ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              🌲 Tree Renderer
            </button>
            <button
              onClick={() => setDevHarnessTab('flow')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                devHarnessTab === 'flow' ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              🌳 Flow Test
            </button>
            <button
              onClick={() => setDevHarnessTab('dev')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                devHarnessTab === 'dev' ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              🧪 Component Tests
            </button>
          </div>
          <button
            onClick={() => setShowDevHarness(false)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition"
          >
            ✕ Exit Dev Mode
          </button>
        </div>
        
        {/* Harness content */}
        <div className="pt-12">
          {devHarnessTab === 'trees' && <TreeRendererTestHarness />}
          {devHarnessTab === 'flow' && <FlowTestHarness />}
          {devHarnessTab === 'dev' && <DevTestHarness />}
        </div>
      </>
    );
  }

  // Show loading screen while checking auth
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Show auth screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show onboarding if not completed
  if (!profile?.onboardingComplete) {
    return (
      <OnboardingFlow
        profile={profile}
        updateProfile={updateProfile}
      />
    );
  }

  // Show main game app — wrap with TutorialProvider so tutorial steps
  // have access to context; wrapping here (not inside GameApp) keeps the
  // provider lifetime tied to the authenticated session.
  return (
    <TutorialProvider>
      <GameApp
        profile={profile}
        onLogout={logout}
        onUpdateProfile={updateProfile}
      />
      {/* Dev mode indicator (only in development) */}
      {import.meta.env.DEV && (
        <button
          onClick={() => setShowDevHarness(true)}
          className="fixed bottom-4 right-4 px-2 py-1 bg-gray-200 text-gray-500 rounded text-xs hover:bg-gray-300 transition z-40"
          title="Open Dev Test Harness (Ctrl+Shift+D)"
        >
          🧪 Dev
        </button>
      )}
    </TutorialProvider>
  );
}

export default App;