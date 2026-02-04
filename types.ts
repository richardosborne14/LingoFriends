
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

export type TargetLanguage = 'English' | 'French';

export type NativeLanguage = 'English' | 'Spanish' | 'French' | 'German' | 'Portuguese' | 'Ukrainian' | 'Italian' | 'Chinese' | 'Japanese' | 'Hindi' | 'Romanian';

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
  goals: string[];
  interests: string[];
  traits: UserTrait[]; // AI-detected traits
  streak: number;
  lastLessonDate: string; // ISO Date
  completedLessons: number;
  xp: number;
  onboardingComplete: boolean;
}

export const INITIAL_PROFILE: UserProfile = {
  name: 'Learner',
  targetLanguage: 'English',
  level: CEFRLevel.A1,
  nativeLanguage: 'Spanish', // Default
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
}