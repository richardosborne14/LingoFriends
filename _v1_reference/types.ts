
export enum Sender {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system'
}

export enum ActivityType {
  NONE = 'none',
  QUIZ = 'quiz',
  FILL_BLANK = 'fill_blank',
  MATCHING = 'matching'
}

export interface ActivityData {
  type: ActivityType;
  question?: string;
  options?: string[]; // For Quiz
  correctAnswer?: string | number; // For Quiz and Fill Blank
  sentence?: string; // For Fill Blank (use ___ for blank)
  pairs?: Array<{term: string, definition: string}>; // For Matching
}

export type TargetLanguage = 'English' | 'French' | 'German' | 'Spanish' | 'Italian';

/**
 * Subject types for learning - supports expansion beyond just languages.
 * Language: English, German, French, etc.
 * Maths: Math tutoring (future)
 * Coding: Scratch, Python basics (future)
 */
export type SubjectType = 'language' | 'maths' | 'coding';

/**
 * Specific subjects within each subject type.
 * Expands as we add more curriculum options.
 */
export type TargetSubject = 'English' | 'German' | 'Maths' | 'Scratch';

/**
 * User-selected interests from onboarding.
 * Free-form strings from predefined categories.
 */
export type UserInterest = string;

export type NativeLanguage = 'English' | 'Spanish' | 'French' | 'German' | 'Portuguese' | 'Ukrainian' | 'Italian' | 'Chinese' | 'Japanese' | 'Hindi' | 'Romanian';

/**
 * Age groups for personalized learning experience.
 * Each group gets different communication styles and content complexity.
 */
export type AgeGroup = '7-10' | '11-14' | '15-18';

export interface TranslationPair {
  original: string;
  translated: string;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  activity?: ActivityData; 
  activityCompleted?: boolean;
  isHidden?: boolean;
  audioData?: string; // Base64 encoded PCM audio
  translation?: TranslationPair[]; // Sentence-by-sentence translation
  translationLanguage?: NativeLanguage; // Track which language this was translated to
  
  // Specific to lesson invites
  lessonInvite?: {
    sessionId: string;
    title: string;
    objectives: string[];
  };
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1'
}

export interface UserTrait {
  category: 'personality' | 'learning_style' | 'strength' | 'struggle' | 'interest';
  label: string; // Short tag e.g. "Visual Learner"
  description?: string; // Context e.g. "Prefers images over text"
}

export interface UserProfile {
  name: string;
  targetLanguage: TargetLanguage;
  level: CEFRLevel;
  nativeLanguage: NativeLanguage;
  ageGroup: AgeGroup; // For age-appropriate content and communication style
  goals: string[];
  interests: string[];
  traits: UserTrait[]; // AI-detected traits
  streak: number;
  lastLessonDate: string; // ISO Date
  completedLessons: number;
  xp: number;
  onboardingComplete: boolean;
  
  // NEW: Subject-based learning (Phase 1 Task 5)
  subjectType?: SubjectType; // 'language', 'maths', 'coding'
  targetSubject?: TargetSubject; // 'English', 'German', 'Maths', 'Scratch'
  selectedInterests?: UserInterest[]; // User-selected interests from onboarding
}

/**
 * AI Profile Field - Facts learned about the user during conversations.
 * Separate from traits (which are coach-generated personality observations).
 * These are specific facts like "favorite band: BTS" or "learning motivation: talk to Korean friends".
 */
export interface AIProfileField {
  id: string;
  user: string;
  fieldName: string; // e.g. "favorite_kpop_group", "learning_motivation"
  fieldValue: string; // e.g. "BTS", "Wants to talk to Korean friends"
  confidence: number; // 0.0 to 1.0 - how confident AI is about this fact
  sourceSession?: string; // Optional: session ID where this was learned
  learnedAt: string; // ISO Date
  created: string; // Pocketbase timestamp
  updated: string; // Pocketbase timestamp
}

export const INITIAL_PROFILE: UserProfile = {
  name: 'Learner',
  targetLanguage: 'English',
  level: CEFRLevel.A1,
  nativeLanguage: 'Spanish', // Default
  ageGroup: '11-14', // Default to middle age group
  goals: [],
  interests: [],
  traits: [],
  streak: 0,
  lastLessonDate: new Date().toISOString(),
  completedLessons: 0,
  xp: 0,
  onboardingComplete: false,
};

export enum SessionType {
  MAIN = 'MAIN',
  LESSON = 'LESSON'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export interface LessonDraft {
  topic: string;
  userContext: string; // e.g. "Business meeting", "Casual travel"
  objectives: string[];
  confidenceScore: number; // 0.0 to 1.0
  missingInfo: string; // What the AI still needs to know
}

export interface ChatSession {
  id: string;
  type: SessionType;
  status: SessionStatus;
  title: string;
  objectives: string[];
  messages: Message[];
  createdAt: number;
  parentId?: string; // If spawned from another session
  draft?: LessonDraft | null; // Current lesson being negotiated
  targetLanguage?: TargetLanguage; // Language for this session (used when creating in Pocketbase)
}

/**
 * Summary of a completed lesson for curriculum-aware AI planning.
 * Passed to the AI so it can build on prior learning, not repeat it.
 */
export interface CompletedLessonSummary {
  title: string;
  objectives: string[];
  completedAt: number;
}

// ============================================================================
// PHASE 1.1: GAME TYPES RE-EXPORT
// ============================================================================

/**
 * Re-export game types from src/types/game.ts for backward compatibility.
 * New code should import directly from '@/types/game' or '../../src/types/game'.
 * 
 * @see src/types/game.ts for full type definitions
 */
export {
  // Enums
  GameActivityType,
  LessonStatus,
  TreeStatus,
  GiftType,
  // Interfaces
  type ActivityConfig,
  type LessonStep,
  type LessonPlan,
  type SkillPath,
  type SkillPathLesson,
  type UserTree,
  type GiftItem,
  type GardenDecoration,
  type PlayerAvatar,
  type SunDropResult,
  type ActivityResult,
  // Constants
  ACTIVITY_TYPE_MAP,
} from './src/types/game';

// Re-export sunDropService types and functions
export {
  // Types
  type HealthCategory,
  type HealthIndicator,
  // Core calculations
  calculateEarned,
  calculatePenalty,
  calculateTreeHealth,
  daysUntilNextDecay,
  calculateStars,
  // Daily cap
  isDailyCapReached,
  remainingDailyAllowance,
  getDailyCap,
  // Tree growth
  calculateTreeGrowth,
  // Health UI helpers
  getHealthCategory,
  getHealthIndicator,
  daysSinceLastRefresh,
  treeNeedsAttention,
  getHealthDescription,
} from './src/services/sunDropService';
