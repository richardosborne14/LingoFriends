/**
 * Sidebar Component
 * Navigation panel with session list, profile stats, traits, and settings
 * Restyled with the new design system components
 * 
 * @deprecated This component is replaced by AppHeader + TabBar navigation in Phase 1.1.
 * The sidebar navigation pattern has been replaced with garden-first navigation.
 * See: src/components/navigation/AppHeader.tsx and src/components/navigation/TabBar.tsx
 * 
 * This file is kept for reference and potential rollback.
 * It will be removed in Phase 1.2 after full testing.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, Card, Button, Badge, ProgressBar, Avatar } from './ui';
import type { 
  UserProfile, 
  ChatSession, 
  TargetLanguage, 
  NativeLanguage 
} from '../types';

/** Available native languages for selection */
const LANGUAGES: NativeLanguage[] = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 
  'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'
];

interface SidebarProps {
  /** Current user profile */
  profile: UserProfile;
  /** All chat sessions */
  sessions: Record<string, ChatSession>;
  /** Currently active session ID */
  activeSessionId: string;
  /** Active lesson sessions */
  activeLessons: ChatSession[];
  /** Completed lesson sessions */
  completedLessons: ChatSession[];
  /** Whether sidebar is open (mobile) */
  isOpen: boolean;
  /** Auto-TTS enabled state */
  autoTTS: boolean;
  /** Callback to select a session */
  onSessionSelect: (sessionId: string) => void;
  /** Callback to update native language */
  onNativeLanguageChange: (lang: NativeLanguage) => void;
  /** Callback to toggle auto-TTS */
  onToggleAutoTTS: () => void;
  /** Callback to close sidebar (mobile) */
  onClose: () => void;
  /** Callback to logout */
  onLogout: () => void;
  /** Callback to change topic (return to launcher) */
  onChangeTopic?: () => void;
  /** Callback to open profile settings */
  onOpenProfileSettings?: () => void;
}

/**
 * Get the main session ID for a target language
 */
const getMainSessionId = (lang: TargetLanguage) => 
  lang === 'French' ? 'main-hall-French' : 'main-hall';

/**
 * Sidebar with navigation, profile stats, and settings
 * Responsive - slides in on mobile, always visible on desktop
 */
export default function Sidebar({
  profile,
  activeSessionId,
  activeLessons,
  completedLessons,
  isOpen,
  autoTTS,
  onSessionSelect,
  onNativeLanguageChange,
  onToggleAutoTTS,
  onClose,
  onLogout,
  onChangeTopic,
  onOpenProfileSettings,
}: SidebarProps) {
  const mainSessionId = getMainSessionId(profile.targetLanguage);

  /**
   * Handle session selection and close mobile sidebar
   */
  const handleSessionClick = (sessionId: string) => {
    onSessionSelect(sessionId);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/30 z-20 md:hidden backdrop-blur-sm" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <div className={`
        fixed md:relative z-30 w-72 bg-white border-r border-[#f5f5f5]
        flex flex-col h-full transition-transform duration-300 shadow-lg md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Header */}
        <div className="p-4 border-b border-[#f5f5f5] flex items-center gap-3">
          <Logo size="sm" animate={false} />
          <h1 className="text-xl font-bold text-[#262626]">LingoFriends</h1>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          
          {/* Main Navigation */}
          <nav className="space-y-1">
            <NavButton
              icon="🏛️"
              label="Main Hall"
              isActive={activeSessionId === mainSessionId}
              onClick={() => handleSessionClick(mainSessionId)}
            />
          </nav>

          {/* Active Lessons */}
          {activeLessons.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">
                Active Lessons
              </h3>
              <nav className="space-y-1">
                {activeLessons.map(sess => (
                  <NavButton
                    key={sess.id}
                    icon="📖"
                    label={sess.title}
                    subtitle={sess.objectives.join(', ')}
                    isActive={activeSessionId === sess.id}
                    onClick={() => handleSessionClick(sess.id)}
                  />
                ))}
              </nav>
            </div>
          )}

          {/* Completed Lessons */}
          {completedLessons.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">
                Completed
              </h3>
              <nav className="space-y-1 opacity-60">
                {completedLessons.map(sess => (
                  <NavButton
                    key={sess.id}
                    icon="✅"
                    label={sess.title}
                    isActive={activeSessionId === sess.id}
                    onClick={() => handleSessionClick(sess.id)}
                    small
                  />
                ))}
              </nav>
            </div>
          )}

          {/* Profile Stats Card */}
          <Card variant="filled" padding="sm" className="!bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={profile.name || 'User'} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#262626] truncate">
                  {profile.name || 'Learner'}
                </div>
                <Badge variant="primary" size="sm">
                  {profile.level}
                </Badge>
              </div>
            </div>
            
            {/* XP Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#525252]">Progress</span>
                <span className="font-bold text-[#58CC02]">{profile.xp} XP</span>
              </div>
              <ProgressBar 
                value={profile.xp % 1000} 
                max={1000} 
                variant="primary" 
                size="sm" 
              />
            </div>

            {/* Current Goal */}
            {profile.goals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#86efac]/30">
                <div className="text-xs text-[#525252] mb-1">🎯 Focus</div>
                <div className="text-sm text-[#262626] font-medium truncate">
                  {profile.goals[0]}
                </div>
              </div>
            )}
          </Card>

          {/* Traits Widget */}
          {profile.traits.length > 0 && (
            <Card variant="outlined" padding="sm">
              <h3 className="text-xs text-[#a3a3a3] uppercase font-bold tracking-wider mb-2">
                ✨ Learned About You
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.traits.map((trait, idx) => (
                  <Badge 
                    key={idx} 
                    variant="neutral"
                    size="sm"
                  >
                    {trait.label}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Change Topic Button */}
          {onChangeTopic && (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => {
                onChangeTopic();
                onClose();
              }}
              leftIcon={<span>🔄</span>}
            >
              Change Topic
            </Button>
          )}

          {/* Settings Card */}
          <Card variant="default" padding="sm">
            <h3 className="text-xs text-[#a3a3a3] uppercase font-bold tracking-wider mb-3">
              ⚙️ Settings
            </h3>
            
            <div className="space-y-3">
              {/* Current Subject Display (Read-only) */}
              <div>
                <label className="block text-xs text-[#525252] mb-1.5 font-medium">
                  I'm learning:
                </label>
                <div className="px-3 py-2 rounded-xl border-2 border-[#e5e5e5] bg-[#f5f5f5] text-[#525252] text-sm font-medium">
                  {profile.targetSubject || profile.targetLanguage} 🔒
                </div>
              </div>

              {/* Native Language Selector */}
              <div>
                <label className="block text-xs text-[#525252] mb-1.5 font-medium">
                  My native language:
                </label>
                <select 
                  value={profile.nativeLanguage}
                  onChange={(e) => onNativeLanguageChange(e.target.value as NativeLanguage)}
                  className="w-full text-sm px-3 py-2 rounded-xl border-2 border-[#e5e5e5] bg-white text-[#262626] focus:border-[#58CC02] focus:outline-none transition-colors"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {/* Auto-TTS Toggle */}
              <button 
                onClick={onToggleAutoTTS}
                className={`w-full text-xs py-2.5 px-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium ${
                  autoTTS 
                    ? 'bg-[#dcfce7] border-[#86efac] text-[#166534]' 
                    : 'bg-white border-[#e5e5e5] text-[#737373] hover:bg-[#f5f5f5]'
                }`}
              >
                {autoTTS ? '🔊' : '🔇'} Auto-Play Audio: <b>{autoTTS ? 'ON' : 'OFF'}</b>
              </button>

              {/* Profile Settings Button */}
              {onOpenProfileSettings && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    onOpenProfileSettings();
                    onClose();
                  }}
                  leftIcon={<span>👤</span>}
                >
                  Profile Settings
                </Button>
              )}

              {/* Logout Button */}
              <Button 
                variant="danger"
                size="sm"
                fullWidth
                onClick={onLogout}
                leftIcon={<span>👋</span>}
              >
                Log Out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface NavButtonProps {
  icon: string;
  label: string;
  subtitle?: string;
  isActive: boolean;
  onClick: () => void;
  small?: boolean;
}

/**
 * Navigation button for sidebar menu
 */
function NavButton({ icon, label, subtitle, isActive, onClick, small }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full text-left px-3 rounded-xl flex items-center gap-3 transition-all
        ${small ? 'py-2 text-sm' : 'py-3'}
        ${isActive 
          ? 'bg-[#58CC02]/10 text-[#58CC02] font-bold border-l-4 border-[#58CC02]' 
          : 'text-[#525252] hover:bg-[#f5f5f5]'
        }
      `}
    >
      <span className={small ? 'text-base' : 'text-lg'}>{icon}</span> 
      <div className="truncate flex-1">
        <div className="truncate">{label}</div>
        {subtitle && (
          <div className="text-xs font-normal text-[#a3a3a3] truncate">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

interface LanguageButtonProps {
  lang: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Language toggle button
 */
function LanguageButton({ lang, isActive, onClick }: LanguageButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex-1 py-2 px-3 rounded-xl text-sm border-2 transition-all font-medium
        ${isActive 
          ? 'bg-[#58CC02] border-[#58CC02] text-white shadow-[0_2px_0_0_rgba(0,0,0,0.15)]' 
          : 'bg-white border-[#e5e5e5] text-[#525252] hover:bg-[#f5f5f5]'
        }
      `}
    >
      {lang === 'French' ? '🇫🇷' : '🇬🇧'} {lang}
    </button>
  );
}
