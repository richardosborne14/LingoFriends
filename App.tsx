
import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './src/hooks/useAuth';
import { useSessions } from './src/hooks/useSessions';
import { Message, Sender, UserProfile, INITIAL_PROFILE, ChatSession, SessionType, SessionStatus, NativeLanguage, TargetLanguage, AgeGroup } from './types';
import { generateResponse } from './services/groqService';
import { translateText } from './services/geminiService';
import { generateSpeech as generateTTS, playAudio, stopAudio as stopTTSAudio, isPlaying } from './services/ttsService';

// Settings storage key (sessions now come from Pocketbase via useSessions)
const STORAGE_KEY_AUTOTTS = 'lingoloft_autotts';

// Session ID Helper
const getMainSessionId = (lang: TargetLanguage) => lang === 'French' ? 'main-hall-French' : 'main-hall';

const LANGUAGES: NativeLanguage[] = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'];

/**
 * Main App Container
 * Handles auth state and routing between auth screen and main app
 */
function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🦉</div>
          <p className="text-amber-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show main app when authenticated
  return <MainApp />;
}

/**
 * Main App Content (only rendered when authenticated)
 * Profile sourced from Pocketbase via useAuth hook
 * Sessions sourced from Pocketbase via useSessions hook
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
  
  // Local UI state
  const [isThinking, setIsThinking] = useState(false);
  const [autoTTS, setAutoTTS] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Audio State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  // Translation State
  const [translationLoadingId, setTranslationLoadingId] = useState<string | null>(null);

  // Load autoTTS setting on mount
  useEffect(() => {
    const storedAutoTTS = localStorage.getItem(STORAGE_KEY_AUTOTTS);
    if (storedAutoTTS) setAutoTTS(JSON.parse(storedAutoTTS));
  }, []);
  
  // Save autoTTS setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTOTTS, JSON.stringify(autoTTS));
  }, [autoTTS]);

  // Initialize main session when profile loads and no active session
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

  // Handle Language Switching - syncs to Pocketbase
  const handleSwitchLanguage = async (newLang: TargetLanguage) => {
    if (profile.targetLanguage === newLang) return;

    // Update profile in Pocketbase
    try {
      await updateProfile({ targetLanguage: newLang });
      // Get or create main session for the new language
      await getOrCreateMain(newLang);
    } catch (err) {
      console.error('Failed to switch language:', err);
    }
  };

  // Initial Greeting Logic (Dynamic based on active Main Hall)
  useEffect(() => {
    const currentMainId = getMainSessionId(profile.targetLanguage);
    const session = sessions[currentMainId];

    // Check if we are in the correct main session and it is empty
    if (activeSessionId === currentMainId && session && session.messages.length === 0) {
      setTimeout(() => {
        const initialMsg: Message = {
          id: Date.now().toString(),
          sender: Sender.AI,
          text: profile.targetLanguage === 'French' 
            ? "Bonjour ! Bienvenue dans mon bureau. Je suis le Professeur Finch. Prêt à déployer vos ailes et à explorer la belle langue française ? Dites-moi, qu'est-ce qui vous amène dans cette aventure linguistique aujourd'hui ?"
            : "Welcome to my study! I am Professor Finch. I see you're ready to fly—metaphorically speaking, of course. Tell me, why have you decided to embark on this linguistic adventure today?",
          timestamp: Date.now(),
        };
        
        addMessagesToSession(currentMainId, [initialMsg]);
        
        if (autoTTS) handlePlayAudio(initialMsg.id, initialMsg.text);
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, sessions[activeSessionId]?.messages.length, profile.targetLanguage]); 
  // Note: We depend on the length of the *active* session messages to avoid loops

  // Helper to add messages to a session - uses hook's updateMessages
  const addMessagesToSession = (sessionId: string, newMsgs: Message[]) => {
      const session = sessions[sessionId];
      if (!session) return;
      const updatedMsgs = [...session.messages, ...newMsgs];
      updateMessages(sessionId, updatedMsgs);
  };

  // Audio Logic - using new ttsService
  const stopAudio = () => {
      stopTTSAudio();
      setPlayingMessageId(null);
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
      // If already playing this message, stop it
      if (playingMessageId === messageId) {
          stopAudio();
          return;
      }
      
      // Stop any currently playing audio
      stopAudio();
      
      setAudioLoadingId(messageId);
      setPlayingMessageId(messageId);
      
      // Generate and play audio using Google Cloud TTS
      const result = await generateTTS(text, { language: profile.targetLanguage });
      setAudioLoadingId(null);

      if (result) {
          await playAudio(result.audioContent, () => {
              // Clear playing state when audio finishes
              setPlayingMessageId(null);
          });
      } else {
          // TTS failed, clear state
          setPlayingMessageId(null);
      }
  };
  
  // Translation Logic
  const handleTranslate = async (messageId: string, text: string) => {
    setTranslationLoadingId(messageId);
    
    // Find session
    let foundSessionId: string | undefined;
    for (const sId in sessions) {
        if (sessions[sId].messages.some(msg => msg.id === messageId)) {
            foundSessionId = sId;
            break;
        }
    }
    
    if (!foundSessionId) {
        setTranslationLoadingId(null);
        return;
    }

    const pairs = await translateText(text, profile.nativeLanguage);
    setTranslationLoadingId(null);

    if (pairs) {
         // Translation is not persisted to DB - just displayed in UI for this session
         // This is acceptable as users can re-translate if needed after refresh
         const session = sessions[foundSessionId!];
         if (session) {
           const updatedMsgs = session.messages.map(m => 
             m.id === messageId ? { ...m, translation: pairs, translationLanguage: profile.nativeLanguage } : m
           );
           updateMessages(foundSessionId!, updatedMsgs);
         }
    }
  };

  const handleUserMessage = async (text: string, options: { isHidden?: boolean } = {}) => {
    stopAudio();
    const currentSession = sessions[activeSessionId];
    if (!currentSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text: text,
      timestamp: Date.now(),
      isHidden: options.isHidden
    };

    addMessagesToSession(activeSessionId, [userMsg]);
    setIsThinking(true);

    try {
      // Pass the WHOLE session object to get context-aware responses
      // We construct a temp session with the new user message for the API call
      const tempSession = {
          ...currentSession,
          messages: [...currentSession.messages, userMsg]
      };

      const aiResponse = await generateResponse(tempSession, profile, text);
      
      let activityData = undefined;
      let lessonInviteData = undefined;

      // Process Actions (Iterate through array)
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
            console.log("Processing action:", action);

            if (action.action === "UPDATE_PROFILE") {
                // Sync profile updates to Pocketbase
                const profileUpdates: Partial<UserProfile> = {
                  onboardingComplete: true
                };
                if (action.data.level) profileUpdates.level = action.data.level;
                if (action.data.goals) profileUpdates.goals = action.data.goals;
                if (action.data.interests) profileUpdates.interests = action.data.interests;
                
                updateProfile(profileUpdates).catch(err => {
                  console.error('Failed to update profile from AI action:', err);
                });
            } 
            else if (action.action === "ADD_TRAIT") {
                // Check if trait already exists before adding
                const existingTraits = profile.traits || [];
                if (!existingTraits.some(t => t.label === action.data.label)) {
                  updateProfile({
                    traits: [...existingTraits, action.data]
                  }).catch(err => {
                    console.error('Failed to add trait:', err);
                  });
                }
            }
            else if (action.action === "START_ACTIVITY") {
                activityData = action.data;
            }
            else if (action.action === "UPDATE_DRAFT") {
                // Update draft via hook
                updateDraft(activeSessionId, action.data);
            }
            else if (action.action === "CREATE_LESSON") {
                // Clear draft on parent session
                updateDraft(activeSessionId, null);

                // Create new lesson session via Pocketbase
                const newLesson = await createSession({
                    type: SessionType.LESSON,
                    status: SessionStatus.ACTIVE,
                    title: action.data.title,
                    objectives: action.data.objectives,
                    parentId: activeSessionId,
                    messages: [
                        {
                            id: Date.now().toString(),
                            sender: Sender.AI,
                            text: action.data.initialMessage || `Welcome to your lesson on ${action.data.title}!`,
                            timestamp: Date.now()
                        }
                    ]
                });

                lessonInviteData = {
                    sessionId: newLesson.id,
                    title: action.data.title,
                    objectives: action.data.objectives
                };
            }
        }
      }

      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: aiMsgId,
        sender: Sender.AI,
        text: aiResponse.text,
        timestamp: Date.now(),
        activity: activityData,
        lessonInvite: lessonInviteData
      };

      addMessagesToSession(activeSessionId, [aiMsg]);
      
      if (autoTTS && aiResponse.text) {
          handlePlayAudio(aiMsgId, aiResponse.text);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActivityComplete = async (msgId: string, score: number) => {
    // Mark activity as completed in messages
    const session = sessions[activeSessionId];
    if (session) {
      const updatedMsgs = session.messages.map(msg => 
        msg.id === msgId ? { ...msg, activityCompleted: true } : msg
      );
      updateMessages(activeSessionId, updatedMsgs);
    }

    // Add XP via Pocketbase with daily cap enforcement
    const result = await addXP(score);
    
    // Show feedback if daily cap was hit
    if (result.capped) {
      console.log('Daily XP cap reached! Great work today.');
    }

    setTimeout(() => {
        handleUserMessage(`[System: User completed the activity with score ${score}. Praise them and continue.]`, { isHidden: true });
    }, 500);
  };

  const handleCompleteLesson = async () => {
      // Update session status via hook
      updateStatus(activeSessionId, SessionStatus.COMPLETED);
      
      // Award bonus XP for completing lesson via Pocketbase
      const result = await addXP(50);
      
      if (result.capped) {
        console.log('Daily XP cap reached! Great work today.');
      }
  };

  // activeSession, activeLessons, completedLessons now come from useSessions hook

  return (
    <div className="h-[100dvh] w-screen bg-paper flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Overlay for Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 w-72 bg-amber-50 border-r border-amber-100 flex flex-col h-full transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-amber-100">
            <h1 className="font-serif text-2xl text-amber-900 flex items-center gap-2">
                <span className="text-3xl">🦉</span> LingoLoft
            </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Navigation */}
            <div className="space-y-1">
                <button 
                    onClick={() => { 
                        setActiveSessionId(getMainSessionId(profile.targetLanguage)); 
                        setSidebarOpen(false); 
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                        activeSessionId === getMainSessionId(profile.targetLanguage) ? 'bg-white shadow-sm border border-amber-100 text-amber-900 font-bold' : 'text-gray-600 hover:bg-amber-100'
                    }`}
                >
                    <span>🏛️</span> Main Hall
                </button>
            </div>

            {/* Active Lessons */}
            {activeLessons.length > 0 && (
                <div>
                    <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Lessons</h3>
                    <div className="space-y-1">
                        {activeLessons.map(sess => (
                             <button 
                                key={sess.id}
                                onClick={() => { setActiveSessionId(sess.id); setSidebarOpen(false); }}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                                    activeSessionId === sess.id ? 'bg-white shadow-sm border border-amber-100 text-amber-900 font-bold' : 'text-gray-600 hover:bg-amber-100'
                                }`}
                            >
                                <span>📖</span> 
                                <div className="truncate">
                                    <div className="truncate">{sess.title}</div>
                                    <div className="text-xs font-normal text-gray-400 truncate">{sess.objectives.join(', ')}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

             {/* Completed Lessons */}
             {completedLessons.length > 0 && (
                <div>
                    <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Completed</h3>
                    <div className="space-y-1 opacity-75">
                        {completedLessons.map(sess => (
                             <button 
                                key={sess.id}
                                onClick={() => { setActiveSessionId(sess.id); setSidebarOpen(false); }}
                                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm ${
                                    activeSessionId === sess.id ? 'bg-white shadow-sm border border-amber-100 text-amber-900 font-bold' : 'text-gray-500 hover:bg-amber-100'
                                }`}
                            >
                                <span>✅</span> 
                                <div className="truncate">{sess.title}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Widget */}
            <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-amber-100">
                <div className="flex justify-between items-end mb-2">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Profile</div>
                    <div className="text-xs font-bold text-emerald-600">{profile.xp} XP</div>
                </div>
                <div className="text-lg font-serif text-ink mb-1">{profile.level} Learner</div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min((profile.xp % 1000) / 10, 100)}%` }}></div>
                </div>
                {profile.goals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                        <div className="text-xs text-gray-400 mb-1">Focus:</div>
                        <div className="text-sm text-gray-700 truncate">{profile.goals[0]}</div>
                    </div>
                )}
            </div>

            {/* Traits Widget */}
            {profile.traits.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100">
                    <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Learned About You</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.traits.map((trait, idx) => (
                            <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-100 rounded text-xs font-medium" title={trait.description}>
                                {trait.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Widget */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100">
              <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Settings</h3>
              
              <div className="space-y-4">
                <div>
                   <label className="block text-xs text-gray-500 mb-1.5 font-medium">I want to learn:</label>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => handleSwitchLanguage('English')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-all ${profile.targetLanguage === 'English' ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm' : 'bg-white border-amber-100 text-gray-600 hover:bg-amber-50'}`}
                      >
                        English
                      </button>
                      <button 
                        onClick={() => handleSwitchLanguage('French')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-all ${profile.targetLanguage === 'French' ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-sm' : 'bg-white border-amber-100 text-gray-600 hover:bg-amber-50'}`}
                      >
                        French
                      </button>
                   </div>
                </div>

                <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">My native language:</label>
                    <div className="relative">
                        <select 
                            value={profile.nativeLanguage}
                            onChange={(e) => {
                              // Sync native language to Pocketbase
                              updateProfile({ nativeLanguage: e.target.value as NativeLanguage })
                                .catch(err => console.error('Failed to update native language:', err));
                            }}
                            className="w-full text-sm pl-3 pr-8 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-ink appearance-none focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors cursor-pointer"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-800 pointer-events-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </div>

                 <button 
                    onClick={() => setAutoTTS(!autoTTS)}
                    className={`w-full text-xs py-2.5 px-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${autoTTS ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-amber-100 text-gray-500 hover:bg-amber-50'}`}
                 >
                    {autoTTS ? <span>🔊 Auto-Play Audio: <b>ON</b></span> : <span>🔇 Auto-Play Audio: <b>OFF</b></span>}
                 </button>

                 {/* Logout Button */}
                 <button 
                    onClick={logout}
                    className="w-full text-xs py-2.5 px-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                 >
                    <span>👋</span> Log Out
                 </button>
              </div>
            </div>
        </div>
      </div>

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
            />
        ) : sessionsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-amber-700">
                <div className="text-4xl mb-4 animate-bounce">🦉</div>
                <p className="font-medium">Setting up your study...</p>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-amber-700">
                <div className="text-4xl mb-4">🏛️</div>
                <p className="font-medium mb-4">Welcome to the Main Hall!</p>
                <button 
                    onClick={() => getOrCreateMain(profile.targetLanguage)}
                    className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-colors"
                >
                    Start Learning
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;