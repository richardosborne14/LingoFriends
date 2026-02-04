
import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import { Message, Sender, UserProfile, INITIAL_PROFILE, ChatSession, SessionType, SessionStatus, NativeLanguage, TargetLanguage } from './types';
import { generateResponse, generateSpeech, translateText } from './services/geminiService';

const STORAGE_KEY_PROFILE = 'lingoloft_profile';
const STORAGE_KEY_SESSIONS = 'lingoloft_sessions_v2'; 
const STORAGE_KEY_AUTOTTS = 'lingoloft_autotts';

// Audio Helper
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Session ID Helper
const getMainSessionId = (lang: TargetLanguage) => lang === 'French' ? 'main-hall-French' : 'main-hall';

const LANGUAGES: NativeLanguage[] = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'];

function App() {
  // State
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>('main-hall');
  const [isThinking, setIsThinking] = useState(false);
  const [autoTTS, setAutoTTS] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  
  // Audio State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Translation State
  const [translationLoadingId, setTranslationLoadingId] = useState<string | null>(null);

  // Load from storage on mount
  useEffect(() => {
    const storedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    const storedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
    const storedAutoTTS = localStorage.getItem(STORAGE_KEY_AUTOTTS);

    if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        setProfile(parsedProfile);
        // Sync active session with loaded profile language on startup
        if (parsedProfile.targetLanguage) {
            setActiveSessionId(getMainSessionId(parsedProfile.targetLanguage));
        }
    }
    
    if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
    } else {
        // Initialize Default Session
        const mainSessionId = 'main-hall';
        const mainSession: ChatSession = {
            id: mainSessionId,
            type: SessionType.MAIN,
            status: SessionStatus.ACTIVE,
            title: 'Main Hall',
            objectives: [],
            messages: [],
            createdAt: Date.now()
        };
        setSessions({ [mainSessionId]: mainSession });
    }

    if (storedAutoTTS) setAutoTTS(JSON.parse(storedAutoTTS));
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (Object.keys(sessions).length > 0) {
        // Deep copy to avoid mutating state when stripping audio
        const sessionToStore = JSON.parse(JSON.stringify(sessions));
        
        // Strip audioData before saving to localStorage to prevent quota exceeded errors
        for (const key in sessionToStore) {
            sessionToStore[key].messages.forEach((msg: Message) => {
                if (msg.audioData) {
                    delete msg.audioData; 
                }
            });
        }
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessionToStore));
    }
  }, [sessions]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTOTTS, JSON.stringify(autoTTS));
  }, [autoTTS]);

  // Handle Language Switching
  const handleSwitchLanguage = (newLang: TargetLanguage) => {
    if (profile.targetLanguage === newLang) return;

    setProfile(p => ({ ...p, targetLanguage: newLang }));
    
    const newSessionId = getMainSessionId(newLang);
    
    // Create new main session for this language if it doesn't exist
    if (!sessions[newSessionId]) {
        const newSession: ChatSession = {
            id: newSessionId,
            type: SessionType.MAIN,
            status: SessionStatus.ACTIVE,
            title: newLang === 'French' ? 'Main Hall (French)' : 'Main Hall',
            objectives: [],
            messages: [],
            createdAt: Date.now()
        };
        setSessions(prev => ({ ...prev, [newSessionId]: newSession }));
    }
    
    setActiveSessionId(newSessionId);
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
        
        updateSessionMessages(currentMainId, [initialMsg]);
        
        if (autoTTS) handlePlayAudio(initialMsg.id, initialMsg.text);
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, sessions[activeSessionId]?.messages.length, profile.targetLanguage]); 
  // Note: We depend on the length of the *active* session messages to avoid loops

  const updateSessionMessages = (sessionId: string, newMessages: Message[] | ((prev: Message[]) => Message[])) => {
      setSessions(prev => {
          const session = prev[sessionId];
          if (!session) return prev;
          
          const updatedMsgs = typeof newMessages === 'function' 
            ? newMessages(session.messages)
            : [...session.messages, ...newMessages];

          return {
              ...prev,
              [sessionId]: {
                  ...session,
                  messages: updatedMsgs
              }
          };
      });
  };

  // Audio Logic
  const getAudioContext = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const stopAudio = () => {
      if (currentSourceRef.current) {
          try {
            currentSourceRef.current.stop();
          } catch (e) {}
          currentSourceRef.current = null;
      }
      setPlayingMessageId(null);
  };

  const playPcmData = async (base64: string, messageId: string) => {
      stopAudio();
      try {
          const ctx = getAudioContext();
          const byteArray = decode(base64);
          const dataInt16 = new Int16Array(byteArray.buffer);
          const frameCount = dataInt16.length;
          const buffer = ctx.createBuffer(1, frameCount, 24000);
          const channelData = buffer.getChannelData(0);
          
          for (let i = 0; i < frameCount; i++) {
             channelData[i] = dataInt16[i] / 32768.0;
          }

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          
          // Add GainNode to boost volume
          const gainNode = ctx.createGain();
          gainNode.gain.value = 2.5; // Boost volume by 2.5x

          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          source.onended = () => {
              if (playingMessageId === messageId) {
                setPlayingMessageId(null);
              }
          };
          currentSourceRef.current = source;
          source.start();
          setPlayingMessageId(messageId);
      } catch (e) {
          console.error("Audio playback failed", e);
          setPlayingMessageId(null);
      }
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
      if (playingMessageId === messageId) {
          stopAudio();
          return;
      }
      
      // Search all sessions for the message to find audioData
      let message: Message | undefined;
      let foundSessionId: string | undefined;
      
      for (const sId in sessions) {
          const m = sessions[sId].messages.find(msg => msg.id === messageId);
          if (m) {
              message = m;
              foundSessionId = sId;
              break;
          }
      }

      if (!message || !foundSessionId) return;

      if (message.audioData) {
          await playPcmData(message.audioData, messageId);
          return;
      }

      setAudioLoadingId(messageId);
      const audioData = await generateSpeech(text);
      setAudioLoadingId(null);

      if (audioData) {
          setSessions(prev => ({
              ...prev,
              [foundSessionId!]: {
                  ...prev[foundSessionId!],
                  messages: prev[foundSessionId!].messages.map(m => 
                    m.id === messageId ? { ...m, audioData } : m
                  )
              }
          }));
          await playPcmData(audioData, messageId);
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
         setSessions(prev => ({
              ...prev,
              [foundSessionId!]: {
                  ...prev[foundSessionId!],
                  messages: prev[foundSessionId!].messages.map(m => 
                    m.id === messageId ? { ...m, translation: pairs, translationLanguage: profile.nativeLanguage } : m
                  )
              }
          }));
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

    updateSessionMessages(activeSessionId, [userMsg]);
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
                setProfile(prev => ({
                    ...prev,
                    level: action.data.level || prev.level,
                    goals: action.data.goals || prev.goals,
                    interests: action.data.interests || prev.interests,
                    onboardingComplete: true
                }));
            } 
            else if (action.action === "ADD_TRAIT") {
                setProfile(prev => {
                    // Prevent duplicate traits by label
                    if (prev.traits.some(t => t.label === action.data.label)) return prev;
                    return {
                        ...prev,
                        traits: [...prev.traits, action.data]
                    };
                });
            }
            else if (action.action === "START_ACTIVITY") {
                activityData = action.data;
            }
            else if (action.action === "UPDATE_DRAFT") {
                setSessions(prev => ({
                    ...prev,
                    [activeSessionId]: {
                        ...prev[activeSessionId],
                        draft: action.data
                    }
                }));
            }
            else if (action.action === "CREATE_LESSON") {
                setSessions(prev => ({
                    ...prev,
                    [activeSessionId]: {
                        ...prev[activeSessionId],
                        draft: null 
                    }
                }));

                const newLessonId = `lesson-${Date.now()}`;
                const newLesson: ChatSession = {
                    id: newLessonId,
                    type: SessionType.LESSON,
                    status: SessionStatus.ACTIVE,
                    title: action.data.title,
                    objectives: action.data.objectives,
                    parentId: activeSessionId,
                    createdAt: Date.now(),
                    messages: [
                        {
                            id: Date.now().toString(),
                            sender: Sender.AI,
                            text: action.data.initialMessage || `Welcome to your lesson on ${action.data.title}!`,
                            timestamp: Date.now()
                        }
                    ]
                };
                
                setSessions(prev => ({
                    ...prev,
                    [newLessonId]: newLesson
                }));

                lessonInviteData = {
                    sessionId: newLessonId,
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

      updateSessionMessages(activeSessionId, [aiMsg]);
      
      if (autoTTS && aiResponse.text) {
          handlePlayAudio(aiMsgId, aiResponse.text);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActivityComplete = (msgId: string, score: number) => {
    setSessions(prev => ({
        ...prev,
        [activeSessionId]: {
            ...prev[activeSessionId],
            messages: prev[activeSessionId].messages.map(msg => 
                msg.id === msgId ? { ...msg, activityCompleted: true } : msg
            )
        }
    }));

    setProfile(prev => ({
      ...prev,
      xp: prev.xp + score,
      completedLessons: prev.completedLessons + 1 
    }));

    setTimeout(() => {
        handleUserMessage(`[System: User completed the activity with score ${score}. Praise them and continue.]`, { isHidden: true });
    }, 500);
  };

  const handleCompleteLesson = () => {
      setSessions(prev => ({
          ...prev,
          [activeSessionId]: {
              ...prev[activeSessionId],
              status: SessionStatus.COMPLETED
          }
      }));
      setProfile(prev => ({
          ...prev,
          completedLessons: prev.completedLessons + 1,
          xp: prev.xp + 50 // Big bonus for finishing lesson
      }));
  };

  const activeSession = sessions[activeSessionId];
  
  const activeLessons = (Object.values(sessions) as ChatSession[])
    .filter(s => s.type === SessionType.LESSON && s.status === SessionStatus.ACTIVE)
    .sort((a, b) => b.createdAt - a.createdAt);

  const completedLessons = (Object.values(sessions) as ChatSession[])
    .filter(s => s.type === SessionType.LESSON && s.status === SessionStatus.COMPLETED)
    .sort((a, b) => b.createdAt - a.createdAt);

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
                            onChange={(e) => setProfile(p => ({...p, nativeLanguage: e.target.value as NativeLanguage}))}
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
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm border border-amber-200 text-amber-900"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                Select a session from the sidebar
            </div>
        )}
      </div>
    </div>
  );
}

export default App;