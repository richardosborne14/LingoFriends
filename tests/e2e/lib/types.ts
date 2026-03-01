/**
 * LingoFriends — E2E Test Harness Types
 *
 * Shared types used across all test files.
 * These are pure TypeScript interfaces — no runtime dependencies.
 *
 * @module tests/e2e/lib/types
 */

// ============================================================================
// TEST RESULT STRUCTURES
// ============================================================================

/** Result of a single assertion */
export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  /** 'error' = blocking failure; 'warning' = non-blocking observation */
  severity: 'error' | 'warning';
}

/** Result of a single test scenario */
export interface TestResult {
  testId: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  /** Duration in milliseconds */
  duration: number;
  assertions: AssertionResult[];
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

/** Result of a complete test suite (one test file) */
export interface TestSuiteResult {
  suiteName: string;
  provider: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  /** Duration in milliseconds */
  duration: number;
  tests: TestResult[];
}

// ============================================================================
// LLM QUALITY SCORING
// ============================================================================

/**
 * 10-dimension quality score for a generated lesson.
 * Each dimension scored 0-10.
 */
export interface LessonQualityScore {
  provider: ProviderKey;
  lessonTitle: string;
  /** Parameter combination this lesson was generated for */
  combination: LessonCombination;
  /** Wall-clock time for the AI call in ms */
  responseTimeMs: number;
  /** Did the AI return parseable JSON? */
  parseSuccess: boolean;
  /** Did lessonAssembler succeed? */
  assemblySuccess: boolean;
  /** Did lessonValidator pass? */
  validationResult: { valid: boolean; errors: string[]; warnings: string[] };
  scores: {
    /** 0-10: All content in correct language? */
    languageCorrectness: number;
    /** 0-10: INFO step before any quiz per chunk? */
    teachFirstEnforcement: number;
    /** 0-10: Mix of activity types? */
    activityVariety: number;
    /** 0-10: Natural phrases, not isolated words? */
    chunkQuality: number;
    /** 0-10: Plausible distractors in native language? */
    distractorQuality: number;
    /** 0-10: Content suitable for target age group? */
    ageAppropriateness: number;
    /** 0-10: References learner interests? */
    interestPersonalisation: number;
    /** 0-10: All required ActivityConfig fields present? */
    fieldCompleteness: number;
    /** 0-10: Appropriate i+1 difficulty progression? */
    i1Difficulty: number;
    /** 0-10: Instructions/tutorText in native language? */
    nativeLanguageInstructions: number;
  };
  /** 0-100 */
  totalScore: number;
  /** Raw AI-generated chunks for reference */
  rawChunks: unknown[];
  /** Full assembled lesson plan for reference */
  rawLesson: unknown;
  /** Evaluator observations */
  notes: string[];
}

/** A single lesson generation parameter combination */
export interface LessonCombination {
  targetLanguage: string;
  nativeLanguage: string;
  topic: string;
  ageGroup: '7-10' | '11-14' | '15-18';
  level: 'A1' | 'A2' | 'B1';
}

/** Cross-LLM comparison summary */
export interface LLMComparisonResult {
  timestamp: string;
  totalCombinations: number;
  providers: Record<ProviderKey, ProviderSummary>;
  recommendation: ProviderKey;
  reasoning: string;
  lessons: LessonQualityScore[];
}

/** Per-provider aggregate summary */
export interface ProviderSummary {
  averageScore: number;
  averageResponseTimeMs: number;
  failureRate: number;
  totalLessons: number;
  scoreBreakdown: Record<string, number>;
  worstCombination?: LessonCombination;
  bestCombination?: LessonCombination;
}

// ============================================================================
// TEST USER & AUTH
// ============================================================================

/** A test user created for a test run */
export interface TestUser {
  id: string;
  email: string;
  password: string;
  authToken: string;
  profileId?: string;
}

// ============================================================================
// PROVIDERS
// ============================================================================

export type ProviderKey = 'deepinfra' | 'groq' | 'anthropic';

/** Configuration for an AI provider */
export interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  /** Extra headers needed (e.g. Anthropic requires anthropic-version) */
  extraHeaders?: Record<string, string>;
  /** Whether this provider uses the OpenAI messages format */
  openAICompatible: boolean;
  /** ms delay to add between calls for rate limiting */
  rateLimitDelayMs: number;
  /**
   * If true, this provider is excluded from getAvailableProviders().
   * Used to temporarily disable providers without deleting config.
   */
  experimental?: boolean;
}

// ============================================================================
// AI CONTENT TYPES (mirror of lessonAssembler interfaces — no import needed)
// ============================================================================

/** A single AI-generated chunk of content */
export interface GeneratedChunk {
  targetPhrase: string;
  nativeTranslation: string;
  exampleSentence: string;
  usageNote: string;
  explanation: string;
  distractors: [string, string, string];
  correctUsageContext: string;
  wrongUsageContexts: [string, string, string];
  coachingText?: string;
}

/** Complete AI output from chunk generation call */
export interface AILessonContent {
  title: string;
  targetLanguageCode: string;
  nativeLanguageCode: string;
  chunks: GeneratedChunk[];
  interests?: string[];
}

// ============================================================================
// POCKETBASE DATA SHAPES
// ============================================================================

/** Profile fields as they exist in PocketBase */
export interface ProfileData {
  user: string;
  display_name: string;
  native_language: string;
  target_language: string;
  subject_type?: string;
  target_subject?: string;
  age_group?: string;
  level?: string;
  goals?: string[];
  interests?: string[];
  selected_interests?: unknown[];
  traits?: string[];
  xp?: number;
  streak?: number;
  sunDrops?: number;
  gems?: number;
  onboarding_complete?: boolean;
  daily_xp_today?: number;
  daily_cap?: number;
  last_activity?: string;
}

/** UserTree fields as they exist in PocketBase */
export interface TreeData {
  user: string;
  skillPathId?: string;
  name?: string;
  icon?: string;
  status?: string;
  health?: number;
  lastRefreshDate?: string;
  sunDropsEarned?: number;
  sunDropsTotal?: number;
  // NOTE: growth_stage / growthStage do NOT exist in PocketBase user_trees.
  // Growth stage is calculated client-side from sunDropsEarned.
  // Accepted here so test helpers can pass it without TypeScript errors,
  // but PocketBase silently ignores unknown fields on write.
  growthStage?: number;
  lessonsCompleted?: number;  // PB stores camelCase — do NOT use lessons_completed
  lessonsTotal?: number;
  gridPosition?: { gx: number; gz: number };
  bufferDays?: number;
  giftsReceived?: unknown[];
}

/** SkillPath fields as they exist in PocketBase */
export interface SkillPathData {
  targetLanguage: string;
  nativeLanguage?: string;
  name?: string;
  description?: string;
  icon?: string;
  level?: string;
  totalLessons?: number;
}

/** LearnerProfile fields as they exist in PocketBase */
export interface LearnerProfileData {
  user: string;
  native_language: string;
  target_language: string;
  current_level?: number;
  total_chunks_encountered?: number;
  chunks_acquired?: number;
}
