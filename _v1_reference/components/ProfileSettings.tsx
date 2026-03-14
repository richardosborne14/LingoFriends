/**
 * LingoFriends - Profile Settings Component
 * 
 * Allows users to edit their profile settings:
 * - Display name
 * - Native language (with warning)
 * - Learning subject (with confirmation)
 * - Interests (via modal with Step3Interests)
 * 
 * Also displays read-only progress stats (XP, streak, level).
 * 
 * @module ProfileSettings
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Button, Card, Badge, Input, ProgressBar } from './ui';
import { ConfirmDialog } from './ConfirmDialog';
import { Step3Interests } from './onboarding/Step3Interests';
import type { 
  UserProfile, 
  NativeLanguage, 
  TargetSubject, 
  SubjectType 
} from '../types';

// ============================================
// TYPES
// ============================================

export interface ProfileSettingsProps {
  /** Whether the settings modal is open */
  isOpen: boolean;
  /** Called when settings should close */
  onClose: () => void;
  /** Current user profile */
  profile: UserProfile;
  /** Called to save profile changes */
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

/** Available native languages */
const NATIVE_LANGUAGES: { code: NativeLanguage; label: string; flag: string }[] = [
  { code: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'French', label: 'Français', flag: '🇫🇷' },
  // Coming soon - shown but disabled
  { code: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { code: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'Portuguese', label: 'Português', flag: '🇵🇹' },
  { code: 'Italian', label: 'Italiano', flag: '🇮🇹' },
];

/** Available languages for native selection in Phase 1 */
const AVAILABLE_NATIVE_LANGS: NativeLanguage[] = ['English', 'French'];

/** Learning subjects with metadata */
const LEARNING_SUBJECTS: { 
  id: TargetSubject; 
  type: SubjectType; 
  label: string; 
  icon: string;
  available: boolean;
  /** Languages that CAN'T learn this subject (same as native) */
  excludeNative?: NativeLanguage[];
}[] = [
  { id: 'English', type: 'language', label: 'English', icon: '🇬🇧', available: true, excludeNative: ['English'] },
  { id: 'German', type: 'language', label: 'German', icon: '🇩🇪', available: true },
  { id: 'Maths', type: 'maths', label: 'Maths', icon: '🔢', available: false },
  { id: 'Scratch', type: 'coding', label: 'Scratch', icon: '🐱', available: false },
];

// ============================================
// COMPONENT
// ============================================

/**
 * ProfileSettings - Settings modal for editing user profile
 * 
 * Opens as a modal overlay with all editable profile fields.
 * Changes are saved on "Save Changes" button click.
 */
export function ProfileSettings({
  isOpen,
  onClose,
  profile,
  onSave,
}: ProfileSettingsProps) {
  // Form state - initialized from profile
  const [displayName, setDisplayName] = useState(profile.name || '');
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>(profile.nativeLanguage);
  const [targetSubject, setTargetSubject] = useState<TargetSubject>(profile.targetSubject || 'English');
  const [subjectType, setSubjectType] = useState<SubjectType>(profile.subjectType || 'language');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.selectedInterests || []);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showInterestsPicker, setShowInterestsPicker] = useState(false);
  const [showSubjectConfirm, setShowSubjectConfirm] = useState(false);
  const [pendingSubject, setPendingSubject] = useState<{ id: TargetSubject; type: SubjectType } | null>(null);

  // Track if form has changes
  const hasChanges = 
    displayName !== profile.name ||
    nativeLanguage !== profile.nativeLanguage ||
    targetSubject !== profile.targetSubject ||
    JSON.stringify(selectedInterests) !== JSON.stringify(profile.selectedInterests || []);

  /**
   * Handle display name change with validation
   */
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Max 50 characters, allow letters, numbers, spaces, and some punctuation
    if (value.length <= 50) {
      setDisplayName(value);
      setSaveError(null);
    }
  };

  /**
   * Handle native language change
   * Shows warning since this affects AI communication language
   */
  const handleNativeLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as NativeLanguage;
    setNativeLanguage(newLang);
    setSaveError(null);
    
    // If current subject is same as new native language, we need to change subject
    if (targetSubject === newLang) {
      // Find a different available subject
      const alternative = LEARNING_SUBJECTS.find(s => 
        s.available && 
        s.id !== newLang && 
        (!s.excludeNative || !s.excludeNative.includes(newLang))
      );
      if (alternative) {
        setTargetSubject(alternative.id);
        setSubjectType(alternative.type);
      }
    }
  };

  /**
   * Handle subject change - requires confirmation
   */
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubjectId = e.target.value as TargetSubject;
    const subject = LEARNING_SUBJECTS.find(s => s.id === newSubjectId);
    
    if (!subject || !subject.available) return;
    
    // If changing subject, show confirmation dialog
    if (newSubjectId !== profile.targetSubject) {
      setPendingSubject({ id: newSubjectId, type: subject.type });
      setShowSubjectConfirm(true);
    }
  };

  /**
   * Handle subject change confirmation
   */
  const handleSubjectConfirm = (confirmed: boolean) => {
    setShowSubjectConfirm(false);
    
    if (confirmed && pendingSubject) {
      setTargetSubject(pendingSubject.id);
      setSubjectType(pendingSubject.type);
      setSaveError(null);
    }
    
    setPendingSubject(null);
  };

  /**
   * Handle interests selection from modal
   */
  const handleInterestsComplete = useCallback((interests: string[]) => {
    setSelectedInterests(interests);
    setShowInterestsPicker(false);
    setSaveError(null);
  }, []);

  /**
   * Save all changes to profile
   */
  const handleSave = async () => {
    // Validate display name
    if (!displayName.trim()) {
      setSaveError('Please enter a display name');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSave({
        name: displayName.trim(),
        nativeLanguage,
        targetSubject,
        subjectType,
        selectedInterests,
        // Also update targetLanguage for language subjects
        targetLanguage: subjectType === 'language' ? targetSubject as any : profile.targetLanguage,
      });

      setSaveSuccess(true);
      
      // Clear success message after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
      
    } catch (error) {
      console.error('[ProfileSettings] Save failed:', error);
      setSaveError('Oops! Something went wrong. Let\'s try again!');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle close - warn if unsaved changes
   */
  const handleClose = () => {
    // Could add confirmation if hasChanges, but keeping it simple for kids
    onClose();
  };

  // Filter available subjects based on native language
  const availableSubjects = LEARNING_SUBJECTS.filter(subject => {
    if (!subject.available) return true; // Show coming soon items (disabled)
    if (subject.excludeNative?.includes(nativeLanguage)) return false;
    return true;
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Profile Settings"
        size="lg"
        showCloseButton={true}
        closeOnBackdrop={true}
        closeOnEscape={true}
      >
        <div className="space-y-6">
          {/* Display Name Section */}
          <div>
            <label className="block text-sm font-bold text-[#525252] mb-2">
              👤 Display Name
            </label>
            <Input
              type="text"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Your name"
              maxLength={50}
              className="w-full"
            />
            <p className="text-xs text-[#a3a3a3] mt-1">
              This is how your learning buddy will call you!
            </p>
          </div>

          {/* Native Language Section */}
          <div>
            <label className="block text-sm font-bold text-[#525252] mb-2">
              🌍 Native Language
            </label>
            <select
              value={nativeLanguage}
              onChange={handleNativeLanguageChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#e5e5e5] bg-white text-[#262626] 
                       focus:border-[#58CC02] focus:outline-none transition-colors text-base"
            >
              {NATIVE_LANGUAGES.map(lang => (
                <option 
                  key={lang.code} 
                  value={lang.code}
                  disabled={!AVAILABLE_NATIVE_LANGS.includes(lang.code)}
                >
                  {lang.flag} {lang.label}
                  {!AVAILABLE_NATIVE_LANGS.includes(lang.code) ? ' (Coming soon!)' : ''}
                </option>
              ))}
            </select>
            {nativeLanguage !== profile.nativeLanguage && (
              <motion.p 
                className="text-xs text-amber-600 mt-1 flex items-center gap-1"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ⚠️ This will change the language your learning buddy speaks to you in!
              </motion.p>
            )}
          </div>

          {/* Learning Subject Section */}
          <div>
            <label className="block text-sm font-bold text-[#525252] mb-2">
              📚 What I'm Learning
            </label>
            <select
              value={targetSubject}
              onChange={handleSubjectChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#e5e5e5] bg-white text-[#262626] 
                       focus:border-[#58CC02] focus:outline-none transition-colors text-base"
            >
              {availableSubjects.map(subject => (
                <option 
                  key={subject.id} 
                  value={subject.id}
                  disabled={!subject.available}
                >
                  {subject.icon} {subject.label}
                  {!subject.available ? ' (Coming soon!)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Interests Section */}
          <div>
            <label className="block text-sm font-bold text-[#525252] mb-2">
              ❤️ My Interests
            </label>
            
            {/* Selected interests display */}
            {selectedInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedInterests.slice(0, 5).map((interest, idx) => (
                  <Badge key={idx} variant="primary" size="sm">
                    {interest}
                  </Badge>
                ))}
                {selectedInterests.length > 5 && (
                  <Badge variant="neutral" size="sm">
                    +{selectedInterests.length - 5} more
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#a3a3a3] mb-3">
                No interests selected yet
              </p>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInterestsPicker(true)}
              leftIcon={<span>✏️</span>}
            >
              {selectedInterests.length > 0 ? 'Edit Interests' : 'Add Interests'}
            </Button>
          </div>

          {/* Divider */}
          <hr className="border-[#e5e5e5]" />

          {/* Progress Stats (Read-only) */}
          <Card variant="filled" padding="md" className="!bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]">
            <h3 className="text-sm font-bold text-[#525252] mb-3">
              📊 Your Progress
            </h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* XP */}
              <div>
                <div className="text-2xl font-bold text-[#58CC02]">
                  {profile.xp}
                </div>
                <div className="text-xs text-[#737373]">XP</div>
              </div>
              
              {/* Streak */}
              <div>
                <div className="text-2xl font-bold text-orange-500">
                  {profile.streak} 🔥
                </div>
                <div className="text-xs text-[#737373]">Day Streak</div>
              </div>
              
              {/* Level */}
              <div>
                <div className="text-2xl font-bold text-[#1cb0f6]">
                  {profile.level}
                </div>
                <div className="text-xs text-[#737373]">Level</div>
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[#737373] mb-1">
                <span>Progress to next level</span>
                <span>{profile.xp % 1000} / 1000 XP</span>
              </div>
              <ProgressBar 
                value={profile.xp % 1000} 
                max={1000} 
                variant="primary" 
                size="sm" 
              />
            </div>
          </Card>

          {/* Error Message */}
          <AnimatePresence>
            {saveError && (
              <motion.div
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {saveError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                ✨ Changes saved!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subject Change Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubjectConfirm}
        onClose={handleSubjectConfirm}
        title="Change what you're learning?"
        message={`You're currently learning ${profile.targetSubject || profile.targetLanguage}. Your lessons will stay saved if you switch!`}
        confirmText="Yes, switch!"
        cancelText="Keep current"
        icon="🔄"
      />

      {/* Interests Picker Modal - Fixed layout to avoid double scroll */}
      <Modal
        isOpen={showInterestsPicker}
        onClose={() => setShowInterestsPicker(false)}
        title="Edit Your Interests"
        size="lg"
        showCloseButton={true}
        closeOnBackdrop={true}
        closeOnEscape={true}
      >
        <div className="flex flex-col" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {/* Scrollable interests area */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <Step3Interests
              selectedInterests={selectedInterests}
              onSelect={setSelectedInterests}
              displayLanguage={nativeLanguage}
            />
          </div>
          
          {/* Fixed footer with save button - always visible */}
          <div className="flex-shrink-0 flex justify-end gap-3 pt-4 mt-4 border-t border-[#e5e5e5] bg-white">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowInterestsPicker(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleInterestsComplete(selectedInterests)}
            >
              Save Interests
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default ProfileSettings;
