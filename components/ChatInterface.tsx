
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Sender, ActivityType, SessionType, LessonDraft, TranslationPair, TargetLanguage, NativeLanguage } from '../types';
import ActivityWidget from './ActivityWidget';
import VoiceButton from './VoiceButton';

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16"></rect></svg>
);

const TranslateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

const Spinner = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

interface InteractiveTranslationProps {
    data: TranslationPair[];
}

const InteractiveTranslation: React.FC<InteractiveTranslationProps> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className="leading-loose"> 
        {/* removed space-y-1, added leading-loose for better line separation */}
            {data.map((pair, idx) => (
                <span 
                    key={idx} 
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`group relative inline cursor-help rounded px-1 transition-colors duration-200 box-decoration-clone ${hoveredIndex === idx ? 'bg-amber-200' : 'hover:bg-amber-100'}`}
                >
                    <span className="relative z-10">{pair.original}</span>
                    {/* Space after sentence for natural flow */}
                    <span className="mr-1"> </span> 

                    {/* Tooltip */}
                    {hoveredIndex === idx && (
                        <span className="absolute top-full left-0 mt-2 w-max max-w-[280px] bg-ink text-white text-sm p-3 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Triangle pointing up */}
                            <span className="absolute bottom-full left-4 -mb-[1px] border-8 border-transparent border-b-ink"></span>
                            {pair.translated}
                        </span>
                    )}
                </span>
            ))}
        </div>
    );
};

interface ChatInterfaceProps {
  sessionType: SessionType;
  sessionTitle: string;
  sessionObjectives: string[];
  isCompleted: boolean;
  history: Message[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  onActivityComplete: (messageId: string, score: number) => void;
  onPlayAudio: (messageId: string, text: string) => void;
  onTranslate: (messageId: string, text: string) => void;
  playingMessageId: string | null;
  audioLoadingId: string | null;
  translationLoadingId: string | null;
  onCompleteLesson?: () => void;
  onJoinLesson?: (sessionId: string) => void;
  currentDraft?: LessonDraft | null;
  targetLanguage: TargetLanguage;
  nativeLanguage: NativeLanguage;
  onMenuClick?: () => void;
  /** Callback to change topic (return to LearningLauncher) */
  onChangeTopic?: () => void;
  /** Current theme selected for this learning session */
  currentTheme?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionType,
  sessionTitle,
  sessionObjectives,
  isCompleted,
  history, 
  onSendMessage, 
  isThinking, 
  onActivityComplete,
  onPlayAudio,
  onTranslate,
  playingMessageId,
  audioLoadingId,
  translationLoadingId,
  onCompleteLesson,
  onJoinLesson,
  currentDraft,
  targetLanguage,
  nativeLanguage,
  onMenuClick,
  onChangeTopic,
  currentTheme,
}) => {
  const [input, setInput] = useState('');
  const [showTranslationIds, setShowTranslationIds] = useState<Set<string>>(new Set());
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking, showTranslationIds]);

  /**
   * Handle voice transcription from VoiceButton
   */
  const handleVoiceTranscription = (text: string) => {
    if (!isCompleted && text.trim()) {
      onSendMessage(text);
    }
  };

  const handleSend = (textOverride?: string) => {
    if (isCompleted) return;
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    onSendMessage(textToSend);
    setInput('');
  };
  
  // Better approach: If translation exists, show it. If not, load it.
  const handleTranslateClick = (id: string, text: string) => {
       const msg = history.find(m => m.id === id);
       
       // Check if translation exists AND matches current target
       if (msg?.translation && msg.translationLanguage === nativeLanguage) {
           // Toggle view
           const next = new Set(showTranslationIds);
           if (next.has(id)) next.delete(id);
           else next.add(id);
           setShowTranslationIds(next);
       } else {
           // Fetch new translation
           onTranslate(id, text);
           // Add the ID to shown set immediately so spinner appears
           const next = new Set(showTranslationIds);
           next.add(id);
           setShowTranslationIds(next);
       }
  }

  return (
    <div className="flex flex-col h-full relative bg-paper">
      
      {/* Header */}
      <div className="bg-white border-b border-[#f5f5f5] p-4 flex items-center z-10">
        {onMenuClick && (
            <button 
                onClick={onMenuClick}
                className="md:hidden mr-3 text-[#525252] p-2 hover:bg-[#f5f5f5] rounded-xl -ml-2 transition-colors"
                aria-label="Open Menu"
            >
                <MenuIcon />
            </button>
        )}
        <div className="flex-1 flex justify-between items-center overflow-hidden">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#262626] truncate">{sessionTitle}</h2>
                    {isCompleted && <span className="px-2 py-0.5 bg-[#f5f5f5] text-[#737373] text-xs rounded-full uppercase font-bold tracking-wide flex-shrink-0">Read Only</span>}
                </div>
                {sessionObjectives.length > 0 && (
                    <div className="text-xs text-[#737373] flex gap-2 mt-1.5 overflow-x-auto no-scrollbar">
                        {sessionObjectives.slice(0, 2).map((obj, i) => (
                            <span key={i} className="bg-[#f0fdf4] text-[#166534] px-2 py-0.5 rounded-lg border border-[#86efac] whitespace-nowrap">{obj}</span>
                        ))}
                        {sessionObjectives.length > 2 && <span className="whitespace-nowrap text-[#a3a3a3]">+{sessionObjectives.length - 2} more</span>}
                    </div>
                )}
                {currentDraft && (
                <div className="mt-1.5 flex items-center gap-2 animate-pulse">
                    <span className="text-xs font-bold text-[#1CB0F6] uppercase tracking-wider flex-shrink-0">Planning Lesson:</span>
                    <span className="text-xs text-[#262626] truncate">{currentDraft.topic}</span>
                    <div className="h-1.5 w-16 bg-[#e5e5e5] rounded-full ml-2 flex-shrink-0">
                        <div 
                        className={`h-full rounded-full transition-all duration-500 ${currentDraft.confidenceScore > 0.8 ? 'bg-[#58CC02]' : 'bg-[#FFC800]'}`} 
                        style={{ width: `${currentDraft.confidenceScore * 100}%` }}
                        />
                    </div>
                </div>
                )}
            </div>
            {/* Header Actions */}
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {/* Current Theme Badge (Main Hall only) */}
                {sessionType === SessionType.MAIN && currentTheme && (
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#e0f2fe] text-[#0369a1] rounded-xl text-xs font-bold border border-[#7dd3fc]">
                        🎯 {currentTheme}
                    </span>
                )}
                
                {/* Change Topic Button (Main Hall only) */}
                {sessionType === SessionType.MAIN && onChangeTopic && !isCompleted && (
                    <button 
                        onClick={onChangeTopic}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#f5f5f5] text-[#525252] hover:bg-[#e5e5e5] rounded-xl text-sm font-medium transition-colors border border-[#e5e5e5]"
                        title="Change Topic"
                    >
                        🔄 <span className="hidden sm:inline">Change Topic</span>
                    </button>
                )}
                
                {/* Complete Lesson Button (Lesson only) */}
                {sessionType === SessionType.LESSON && !isCompleted && onCompleteLesson && (
                    <button 
                        onClick={onCompleteLesson}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#58CC02] text-white hover:bg-[#46a302] rounded-xl text-sm font-bold transition-colors shadow-[0_2px_0_0_rgba(0,0,0,0.15)]"
                    >
                        <CheckIcon /> <span className="hidden sm:inline">Complete</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        <div className="h-2"></div>

        {history.filter(msg => !msg.isHidden).map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] ${msg.sender === Sender.USER ? 'items-end' : 'items-start'} flex flex-col`}>
              
              <span className="text-xs text-[#a3a3a3] mb-1 px-1 font-medium">
                {msg.sender === Sender.USER ? 'You' : '🦉 Professor Finch'}
              </span>

              {msg.text && (
                <div className={`px-4 py-3 rounded-2xl text-base leading-relaxed relative group ${
                  msg.sender === Sender.USER 
                    ? 'bg-[#1CB0F6] text-white rounded-br-md shadow-[0_2px_0_0_rgba(0,0,0,0.1)]' 
                    : 'bg-white text-[#262626] border-2 border-[#e5e5e5] rounded-bl-md'
                }`}>
                  
                  {/* Render Content: Either Plain/Markdown OR Interactive Translation */}
                  {msg.sender === Sender.AI && showTranslationIds.has(msg.id) ? (
                      msg.translation && msg.translationLanguage === nativeLanguage ? (
                          <InteractiveTranslation data={msg.translation} />
                      ) : (
                          <div className="flex items-center gap-2 text-[#737373] py-2">
                              <Spinner /> <span className="text-sm">Translating...</span>
                          </div>
                      )
                  ) : (
                    <div className="markdown-content">
                        <ReactMarkdown 
                            components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-[#58CC02]" {...props} />
                            }}
                        >
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                  )}
                  
                  {msg.sender === Sender.AI && (
                    <div className="absolute -bottom-4 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {/* Audio Button */}
                        <button 
                        onClick={() => onPlayAudio(msg.id, msg.text)}
                        className="bg-[#f0fdf4] p-1.5 rounded-full text-[#58CC02] hover:bg-[#dcfce7] shadow-sm border border-[#86efac]"
                        title="Play Audio"
                        >
                        {audioLoadingId === msg.id ? <Spinner /> : (playingMessageId === msg.id ? <StopIcon /> : <SpeakerIcon />)}
                        </button>

                        {/* Translate Button */}
                        <button 
                        onClick={() => handleTranslateClick(msg.id, msg.text)}
                        className={`p-1.5 rounded-full shadow-sm transition-colors border ${
                            showTranslationIds.has(msg.id) ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]' : 'bg-[#e0f2fe] text-[#1CB0F6] border-[#7dd3fc] hover:bg-[#bae6fd]'
                        }`}
                        title="Translate to Native Language"
                        >
                        {translationLoadingId === msg.id ? <Spinner /> : <TranslateIcon />}
                        </button>
                    </div>
                  )}
                </div>
              )}

              {/* Lesson Invite Card */}
              {msg.lessonInvite && onJoinLesson && (
                  <div className="mt-3 w-full max-w-sm bg-white border-2 border-[#86efac] rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-[#f0fdf4] px-4 py-3 border-b border-[#86efac]">
                          <h4 className="text-[#166534] font-bold flex items-center gap-2">
                              📚 New Lesson Ready!
                          </h4>
                      </div>
                      <div className="p-4">
                          <h3 className="font-bold text-lg mb-2 text-[#262626]">{msg.lessonInvite.title}</h3>
                          <div className="text-sm text-[#525252] mb-4">
                              <ul className="list-disc pl-4 space-y-1">
                                  {msg.lessonInvite.objectives.map((obj, i) => (
                                      <li key={i}>{obj}</li>
                                  ))}
                              </ul>
                          </div>
                          <button 
                              onClick={() => onJoinLesson(msg.lessonInvite!.sessionId)}
                              className="w-full py-3 bg-[#58CC02] text-white rounded-xl hover:bg-[#46a302] transition-colors font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.15)]"
                          >
                              🚀 Start Lesson
                          </button>
                      </div>
                  </div>
              )}

              {/* Activity Widget */}
              {msg.activity && msg.activity.type !== ActivityType.NONE && (
                <div className="mt-2 w-full">
                   {msg.activityCompleted ? (
                     <div className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full self-start inline-block">
                       ✓ Activity Completed
                     </div>
                   ) : (
                     <ActivityWidget 
                        data={msg.activity} 
                        onComplete={(success, score) => onActivityComplete(msg.id, score)} 
                     />
                   )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
             <div className="bg-white px-5 py-3 rounded-2xl rounded-bl-md border-2 border-[#e5e5e5] flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#58CC02] rounded-full animate-bounce"></span>
                <span className="w-2.5 h-2.5 bg-[#1CB0F6] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2.5 h-2.5 bg-[#FFC800] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
             </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 px-4">
        {isCompleted ? (
             <div className="max-w-3xl mx-auto bg-[#f5f5f5] rounded-2xl border-2 border-[#e5e5e5] p-4 text-center text-[#737373] font-medium text-sm">
                 ✅ This lesson is complete. Return to Main Hall to continue learning.
             </div>
        ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border-2 border-[#e5e5e5] flex items-center p-2 gap-2">
              {/* Voice Button - using Groq Whisper STT */}
              <VoiceButton
                targetLanguage={targetLanguage}
                onTranscription={handleVoiceTranscription}
                disabled={isThinking}
                size="small"
              />

              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type or speak your response..."
                className="flex-1 bg-transparent outline-none text-[#262626] placeholder-[#a3a3a3] ml-2 text-base"
              />

              <button 
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="p-3 bg-[#58CC02] text-white rounded-xl hover:bg-[#46a302] disabled:opacity-40 disabled:bg-[#e5e5e5] disabled:text-[#a3a3a3] transition-colors shadow-[0_2px_0_0_rgba(0,0,0,0.15)] disabled:shadow-none"
              >
                <SendIcon />
              </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;