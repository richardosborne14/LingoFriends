/**
 * App.tsx - Main Application Entry Point
 * 
 * Handles auth routing and orchestrates the main learning interface.
 * 
 * Routing Logic:
 * 1. Not authenticated → AuthScreen
 * 2. Authenticated but !onboardingComplete → OnboardingContainer
 * 3. Authenticated and onboardingComplete → MainApp
 * 
 * Components extracted:
 * - Sidebar: Navigation, profile stats, settings
 * - OnboardingContainer: New user onboarding flow
 * 
 * Hooks extracted:
 * - useAudio: TTS playback
 * - useTranslation: Message translation
 * - useMessageHandler: AI conversation logic
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import ChatInterface from './components/ChatInterface';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import LearningLauncher from './components/LearningLauncher';
import ProfileSettings from './components/ProfileSettings';
import { OnboardingContainer } from './components/onboarding';
import type { OnboardingData } from './components/onboarding';
import { Logo, Button } from './components/ui';
import { useAuth } from './src/hooks/useAuth';
import { useSessions } from './src/hooks/useSessions';
import { useAudio } from './src/hooks/useAudio';
import { useTranslation } from './src/hooks/useTranslation';
import { useMessageHandler } from './src/hooks/useMessageHandler';
import { generateLessonStarter } from './services/lessonStarterService';
import { getAIProfileFields } from './services/pocketbaseService';
import { 
  Message, 
  Sender, 
  INITIAL_PROFILE, 
  SessionStatus, 
  TargetLanguage, 
  NativeLanguage 
} from './types';

// Settings storage key
const STORAGE_KEY_AUTOTTS = 'lingoloft_autotts';
// Default: autoTTS on for better UX (kids prefer audio feedback)
const DEFAULT_AUTO_TTS = true;

// Session ID Helper
const getMainSessionId = (lang: TargetLanguage) => 
  lang === 'French' ? 'main-hall-French' : 'main-hall';

/**
 * Main App Container
 * Handles auth state and routing between auth screen, onboarding, and main app
 */
function App() {
  const { isAuthenticated, isLoading: authLoading, profile } = useAuth();

  // Show loading screen while checking auth
  if (authLoading) {
    return (
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
  }

  // Show auth screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show onboarding if not completed
  // Note: profile might be null briefly after signup, so we check both conditions
  if (!profile?.onboardingComplete) {
    return <OnboardingFlow />;
  }

  // Show main app when authenticated and onboarding complete
  return <MainApp />;
}

/**
 * Onboarding Flow Wrapper
 * 
 * Wraps OnboardingContainer with the completion handler that syncs to Pocketbase.
 * Separated from App to keep the component tree clean.
 */
function OnboardingFlow() {
  const { profile, updateProfile } = useAuth();

  /**
   * Handle onboarding completion
   * Updates profile with all onboarding data and sets onboardingComplete = true
   */
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    console.log('[App] Onboarding complete:', data);
    
    try {
      await updateProfile({
        name: data.displayName, // Save display name
        nativeLanguage: data.nativeLanguage,
        subjectType: data.subjectType,
        targetSubject: data.targetSubject,
        selectedInterests: data.selectedInterests,
        // Set targetLanguage based on targetSubject for language subjects
        targetLanguage: data.subjectType === 'language' 
          ? (data.targetSubject as TargetLanguage)
          : 'English', // Default for non-language subjects
        onboardingComplete: true,
      });
      
      console.log('[App] Profile updated successfully with:', {
        name: data.displayName,
        targetSubject: data.targetSubject,
        selectedInterests: data.selectedInterests,
      });
    } catch (error) {
      console.error('[App] Failed to save onboarding data:', error);
      throw error; // Re-throw so OnboardingContainer can show error
    }
  }, [updateProfile]);

  return (
    <OnboardingContainer
      initialNativeLanguage={profile?.nativeLanguage || 'English'}
      initialDisplayName={profile?.name}
      onComplete={handleOnboardingComplete}
    />
  );
}

/**
 * Main App Content (only rendered when authenticated AND onboarding complete)
 * Profile sourced from Pocketbase via useAuth hook
 * Sessions sourced from Pocketbase via useSessions hook
 * 
 * New Flow (Task 7):
 * 1. Show LearningLauncher first (pick theme)
 * 2. User clicks Start → AI generates opener
 * 3. Show ChatInterface with conversation
 * 4. "Change Topic" returns to launcher
 */
function MainApp() {
  const { profile: authProfile, logout, updateProfile, addXP } = useAuth();
  
  // Sessions from Pocketbase
  const {
    sessions,
    activeSessionId,
    activeSession,
    activeLessons,
    completedLessons,
    isLoading: sessionsLoading,
    setActiveSessionId,
    createSession,
    updateMessages,
    updateStatus,
    updateDraft,
    getOrCreateMain,
  } = useSessions();
  
  // Use auth profile as source of truth, with fallback to INITIAL_PROFILE
  const profile = authProfile || INITIAL_PROFILE;
  
  // Local UI state - autoTTS defaults to true (better for kids)
  const [autoTTS, setAutoTTS] = useState(DEFAULT_AUTO_TTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // NEW: Learning Launcher state
  // Shows launcher when entering, hides after starting a session
  const [showLauncher, setShowLauncher] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [launcherLoading, setLauncherLoading] = useState(false);

  // Audio hook
  // Audio hook now uses Groq AI for automatic language detection
  // No need to pass targetLanguage - it detects from the text
  const { 
    playingMessageId, 
    audioLoadingId, 
    handlePlayAudio, 
    stopAudio 
  } = useAudio();

  // Translation hook
  const { 
    translationLoadingId, 
    handleTranslate 
  } = useTranslation({
    nativeLanguage: profile.nativeLanguage,
    sessions,
    updateMessages,
  });

  // Message handler hook - now includes currentTheme for context-aware AI (Task 7)
  const { 
    isThinking, 
    handleUserMessage, 
    handleActivityComplete, 
    handleCompleteLesson 
  } = useMessageHandler({
    activeSessionId,
    sessions,
    profile,
    autoTTS,
    updateMessages,
    updateDraft,
    updateStatus,
    createSession,
    updateProfile,
    addXP,
    handlePlayAudio,
    stopAudio,
    currentTheme: selectedTheme, // Pass theme for AI context
  });

  // Load autoTTS setting on mount
  useEffect(() => {
    const storedAutoTTS = localStorage.getItem(STORAGE_KEY_AUTOTTS);
    if (storedAutoTTS) setAutoTTS(JSON.parse(storedAutoTTS));
  }, []);
  
  // Save autoTTS setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTOTTS, JSON.stringify(autoTTS));
  }, [autoTTS]);

  // Initialize main session when profile loads (but don't show chat yet)
  useEffect(() => {
    const initMainSession = async () => {
      if (authProfile?.targetLanguage && !activeSession && !sessionsLoading) {
        try {
          await getOrCreateMain(authProfile.targetLanguage);
        } catch (err) {
          console.error('Failed to initialize main session:', err);
        }
      }
    };
    initMainSession();
  }, [authProfile?.targetLanguage, activeSession, sessionsLoading, getOrCreateMain]);

  /**
   * Handle starting a learning session from the launcher.
   * 
   * 1. Generates AI opening message based on theme
   * 2. Adds message to main session
   * 3. Hides launcher, shows chat
   */
  const handleStartLearning = async (theme: string) => {
    setLauncherLoading(true);
    setSelectedTheme(theme);
    
    try {
      // Ensure we have a main session
      const mainSession = await getOrCreateMain(profile.targetLanguage);
      const mainSessionId = mainSession.id;
      
      // Fetch AI profile fields for personalization
      let aiProfileFields;
      try {
        aiProfileFields = await getAIProfileFields();
      } catch {
        aiProfileFields = [];
      }
      
      // Generate AI opening message
      const openingMessage = await generateLessonStarter({
        subject: profile.targetSubject || profile.targetLanguage,
        theme,
        nativeLanguage: profile.nativeLanguage,
        userName: profile.name,
        ageGroup: profile.ageGroup,
        level: profile.level,
        aiProfileFields,
      });
      
      // Create message object
      const aiMessage: Message = {
        id: Date.now().toString(),
        sender: Sender.AI,
        text: openingMessage,
        timestamp: Date.now(),
      };
      
      // Get current messages and add new one
      const currentSession = sessions[mainSessionId];
      const currentMessages = currentSession?.messages || [];
      await updateMessages(mainSessionId, [...currentMessages, aiMessage]);
      
      // Play audio if auto-TTS enabled
      if (autoTTS) {
        handlePlayAudio(aiMessage.id, aiMessage.text);
      }
      
      // Hide launcher and show chat
      setShowLauncher(false);
      
      console.log('[App] Started learning session with theme:', theme);
      
    } catch (error) {
      console.error('[App] Failed to start learning session:', error);
      // Still hide launcher even on error - chat can show fallback
      setShowLauncher(false);
    } finally {
      setLauncherLoading(false);
    }
  };
  
  /**
   * Handle returning to the launcher (change topic)
   */
  const handleChangeTopic = useCallback(() => {
    setShowLauncher(true);
    setSelectedTheme(null);
  }, []);

  /**
   * Handle native language change - syncs to Pocketbase
   */
  const handleNativeLanguageChange = async (newLang: NativeLanguage) => {
    try {
      await updateProfile({ nativeLanguage: newLang });
    } catch (err) {
      console.error('Failed to update native language:', err);
    }
  };

  // Show the Learning Launcher before starting chat
  if (showLauncher && !sessionsLoading) {
    return (
      <LearningLauncher
        profile={profile}
        onStart={handleStartLearning}
        isLoading={launcherLoading}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-paper flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar
        profile={profile}
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeLessons={activeLessons}
        completedLessons={completedLessons}
        isOpen={sidebarOpen}
        autoTTS={autoTTS}
        onSessionSelect={setActiveSessionId}
        onNativeLanguageChange={handleNativeLanguageChange}
        onToggleAutoTTS={() => setAutoTTS(!autoTTS)}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        onChangeTopic={handleChangeTopic}
        onOpenProfileSettings={() => setShowProfileSettings(true)}
      />

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        profile={profile}
        onSave={updateProfile}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeSession ? (
          <ChatInterface 
            key={activeSession.id}
            sessionType={activeSession.type}
            sessionTitle={activeSession.title}
            sessionObjectives={activeSession.objectives}
            isCompleted={activeSession.status === SessionStatus.COMPLETED}
            history={activeSession.messages}
            onSendMessage={handleUserMessage}
            isThinking={isThinking}
            onActivityComplete={handleActivityComplete}
            onPlayAudio={handlePlayAudio}
            onTranslate={handleTranslate}
            playingMessageId={playingMessageId}
            audioLoadingId={audioLoadingId}
            translationLoadingId={translationLoadingId}
            onCompleteLesson={handleCompleteLesson}
            onJoinLesson={(id) => setActiveSessionId(id)}
            currentDraft={activeSession.draft}
            targetLanguage={profile.targetLanguage}
            nativeLanguage={profile.nativeLanguage}
            onMenuClick={() => setSidebarOpen(true)}
            onChangeTopic={handleChangeTopic}
            currentTheme={selectedTheme}
          />
        ) : sessionsLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Logo size="lg" animate />
              <p className="text-[#737373] font-medium mt-4">Setting up your study...</p>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Logo size="xl" animate />
              <h2 className="text-2xl font-bold text-[#262626] mt-4 mb-2">Welcome to the Main Hall!</h2>
              <p className="text-[#737373] mb-6">Let's start your language learning adventure</p>
              <Button 
                variant="primary"
                size="lg"
                onClick={() => getOrCreateMain(profile.targetLanguage)}
              >
                🚀 Start Learning
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
