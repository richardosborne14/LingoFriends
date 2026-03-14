# Task 2.1.1: Test Harness Setup

**Status:** 🔲 Not started  
**Estimated Time:** 4–6 hours  
**Dependencies:** None  
**Output:** `tests/e2e/` directory with runner, clients, and utilities

---

## Objective

Create the foundational test infrastructure that all subsequent tests build on. This includes a PocketBase admin client (bypasses auth rules), an AI provider client (calls each LLM directly), a test runner with structured output, and shared utilities.

---

## Files to Create

```
tests/e2e/
├── test-runner.ts              # Orchestrates all test files
├── lib/
│   ├── pb-client.ts            # PocketBase admin API wrapper
│   ├── ai-client.ts            # Direct AI provider calls (no browser deps)
│   ├── evaluator.ts            # Scoring and evaluation utilities
│   ├── test-utils.ts           # Assertions, logging, cleanup
│   └── types.ts                # Shared test types
├── results/                    # Output directory (gitignored)
└── README.md                   # How to run
```

---

## Step 1: Test Types (`lib/types.ts`)

```typescript
export interface TestResult {
  testId: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  duration: number;             // ms
  assertions: AssertionResult[];
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  severity: 'error' | 'warning';
}

export interface TestSuiteResult {
  suiteName: string;
  provider: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  duration: number;
  tests: TestResult[];
}

export interface LessonQualityScore {
  provider: string;
  lessonTitle: string;
  scores: {
    languageCorrectness: number;      // 0-10: All content in correct language?
    teachFirstEnforcement: number;     // 0-10: INFO step before any quiz?
    activityVariety: number;           // 0-10: Mix of activity types?
    chunkQuality: number;             // 0-10: Natural chunks, not isolated words?
    distractorQuality: number;        // 0-10: Plausible but wrong distractors?
    ageAppropriateness: number;       // 0-10: Content suitable for target age?
    interestPersonalisation: number;  // 0-10: References learner interests?
    fieldCompleteness: number;        // 0-10: All required fields present?
    i1Difficulty: number;             // 0-10: Appropriate difficulty progression?
    nativeLanguageInstructions: number; // 0-10: Instructions in native language?
  };
  totalScore: number;                 // Sum / 100
  rawLesson: unknown;                 // The full lesson JSON for review
  notes: string[];                    // Evaluator observations
}

export type ProviderKey = 'deepinfra' | 'groq' | 'anthropic';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  authToken: string;
  profileId?: string;
}
```

---

## Step 2: PocketBase Admin Client (`lib/pb-client.ts`)

This client uses **admin authentication** to bypass API rules, enabling full CRUD on all collections. It also provides user-level auth for testing permission rules.

### Required Methods

```typescript
export class PBTestClient {
  private adminToken: string;
  private baseUrl: string;

  // ── Auth ──────────────────────────────────────────────────
  /** Authenticate as admin (superuser) */
  async adminAuth(email: string, password: string): Promise<void>;

  /** Create a test user and return their credentials */
  async createTestUser(displayName: string, nativeLanguage: string): Promise<TestUser>;

  /** Authenticate as a specific test user */
  async userAuth(email: string, password: string): Promise<string>; // returns token

  /** Delete a test user and all their data */
  async deleteTestUser(userId: string): Promise<void>;

  // ── Profile ───────────────────────────────────────────────
  /** Create a profile for a user */
  async createProfile(userId: string, data: Partial<ProfileData>): Promise<Record<string, unknown>>;

  /** Get a user's profile */
  async getProfile(userId: string): Promise<Record<string, unknown> | null>;

  /** Update a user's profile */
  async updateProfile(profileId: string, data: Partial<ProfileData>): Promise<void>;

  // ── Trees ─────────────────────────────────────────────────
  /** Create a user tree */
  async createTree(userId: string, data: Partial<TreeData>): Promise<Record<string, unknown>>;

  /** Get all trees for a user */
  async getUserTrees(userId: string): Promise<Record<string, unknown>[]>;

  /** Update a tree (e.g., change lastRefreshDate for decay testing) */
  async updateTree(treeId: string, data: Partial<TreeData>): Promise<void>;

  // ── Skill Paths ───────────────────────────────────────────
  /** Get available skill paths */
  async getSkillPaths(userId: string): Promise<Record<string, unknown>[]>;

  /** Create a skill path for testing */
  async createSkillPath(data: Partial<SkillPathData>): Promise<Record<string, unknown>>;

  // ── Learner Profiles ──────────────────────────────────────
  /** Get or create a learner profile */
  async getLearnerProfile(userId: string): Promise<Record<string, unknown> | null>;

  /** Update learner profile (level, chunk stats, etc.) */
  async updateLearnerProfile(profileId: string, data: Record<string, unknown>): Promise<void>;

  // ── Chunk Exposures ───────────────────────────────────────
  /** Get chunk exposures for a user */
  async getUserChunks(userId: string): Promise<Record<string, unknown>[]>;

  // ── Question Reports ──────────────────────────────────────
  /** Create a question report */
  async createQuestionReport(data: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Get question reports */
  async getQuestionReports(filters?: string): Promise<Record<string, unknown>[]>;

  // ── Generic ───────────────────────────────────────────────
  /** Raw collection query (admin-level) */
  async query(collection: string, filters?: string): Promise<Record<string, unknown>[]>;

  /** Raw record create */
  async create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Raw record update */
  async update(collection: string, id: string, data: Record<string, unknown>): Promise<void>;

  /** Raw record delete */
  async delete(collection: string, id: string): Promise<void>;
}
```

### Implementation Notes

- Use `fetch()` directly (no PocketBase SDK — we want raw HTTP for clarity)
- Admin auth: `POST /api/collections/_superusers/auth-with-password` (PB 0.23+) with fallback to `/api/admins/auth-with-password`
- User auth: `POST /api/collections/users/auth-with-password`
- All requests include `Authorization: ${token}` header
- Log every HTTP call with method, URL, status code, and timing
- On 400/403 errors, log the full response body (this is where permission issues surface)

### Profile Data Shape

```typescript
interface ProfileData {
  user: string;
  display_name: string;
  native_language: string;
  target_language: string;
  subject_type: string;
  target_subject: string;
  age_group: string;
  level: string;
  goals: string[];
  interests: string[];
  selected_interests: unknown[];
  traits: string[];
  xp: number;
  streak: number;
  sunDrops: number;
  gems: number;
  onboarding_complete: boolean;
  daily_xp_today: number;
  daily_cap: number;
}
```

---

## Step 3: AI Client (`lib/ai-client.ts`)

Direct HTTP calls to each AI provider for lesson content generation. No browser dependencies — pure Node.js fetch.

### Required Methods

```typescript
export class AITestClient {
  /** Generate lesson chunk content using a specific provider */
  async generateLessonContent(
    provider: ProviderKey,
    request: {
      targetLanguage: string;       // "German", "French", "English"
      nativeLanguage: string;       // "English", "French"
      topic: string;                // "Greetings", "Food", etc.
      level: string;                // "A1", "A2", "B1"
      interests: string[];          // ["football", "music"]
      chunkCount: number;           // 3-5
      ageGroup: string;             // "7-10", "11-14", "15-18"
    }
  ): Promise<AILessonContent>;

  /** Ask the help system a question about a specific activity */
  async requestHelp(
    provider: ProviderKey,
    context: {
      activityType: string;
      activityData: Record<string, unknown>;
      targetLanguage: string;
      nativeLanguage: string;
      userQuestion: string;
    }
  ): Promise<{ text: string; isBrokenQuestion: boolean }>;

  /** Request question regeneration */
  async regenerateQuestion(
    provider: ProviderKey,
    context: {
      brokenActivity: Record<string, unknown>;
      targetLanguage: string;
      nativeLanguage: string;
      reason: string;
    }
  ): Promise<{ success: boolean; newContent?: unknown }>;
}
```

### Provider Configuration

```typescript
const PROVIDERS = {
  deepinfra: {
    baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
    model: 'zai-org/GLM-5',
    apiKeyEnv: 'VITE_DEEPINFRA_API_KEY',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'VITE_GROQ_API_KEY',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5-20250929',
    apiKeyEnv: 'VITE_ANTHROPIC_API_KEY',
    // Note: Anthropic uses a different API format (Messages API, not OpenAI-compatible)
  },
};
```

### System Prompt for Chunk Generation

Use the same system prompt as `aiPedagogyClient.ts` — specifically the `PROFESSOR_FINCH_V2` prompt from `services/systemPrompts.ts`. The AI must generate JSON matching the `GeneratedChunkContent` interface from `lessonAssembler.ts`.

Critically, the prompt must specify:
- Generate ONLY the chunk content (phrases, translations, distractors)
- All distractors in the NATIVE language
- All usage contexts in the NATIVE language
- Return valid JSON matching the `AILessonContent` interface

---

## Step 4: Evaluator (`lib/evaluator.ts`)

Scoring functions that assess lesson quality against the pedagogy docs and game design specs.

### Evaluation Functions

```typescript
/** Check all content is in the correct language */
function scoreLanguageCorrectness(lesson: LessonPlan, targetLang: string, nativeLang: string): number;

/** Check teach-first progression: INFO step before any quiz per chunk */
function scoreTeachFirst(lesson: LessonPlan): number;

/** Check activity type variety (should use 3+ types for 5+ quiz steps) */
function scoreActivityVariety(lesson: LessonPlan): number;

/** Check chunks are natural phrases, not single words */
function scoreChunkQuality(chunks: GeneratedChunkContent[]): number;

/** Check distractors are plausible, in correct language, semantically related */
function scoreDistractorQuality(chunks: GeneratedChunkContent[], nativeLang: string): number;

/** Check content is age-appropriate (no complex/adult themes) */
function scoreAgeAppropriateness(lesson: LessonPlan, ageGroup: string): number;

/** Check if learner interests are referenced in content */
function scoreInterestPersonalisation(lesson: LessonPlan, interests: string[]): number;

/** Check all required ActivityConfig fields are present and valid */
function scoreFieldCompleteness(lesson: LessonPlan): number;

/** Check difficulty progression within lesson */
function scoreDifficultyProgression(lesson: LessonPlan): number;

/** Check instructions/tutorText are in native language */
function scoreNativeLanguageInstructions(lesson: LessonPlan, nativeLang: string): number;
```

### Language Detection Heuristic

For `scoreLanguageCorrectness`, use a simple character/word heuristic:
- German indicators: ü, ö, ä, ß, common words (der, die, das, ist, und)
- French indicators: ç, é, è, ê, ë, common words (le, la, les, est, et, des)
- English indicators: the, is, and, of, to, a
- Spanish indicators: ñ, ¿, ¡, common words (el, la, los, es, y)

This doesn't need to be perfect — it just needs to catch obvious failures like German content appearing in a French lesson.

---

## Step 5: Test Utilities (`lib/test-utils.ts`)

```typescript
/** Create a unique test email */
function testEmail(): string;  // e.g., "test-1709312400000@lingofriends-test.local"

/** Assert with structured logging */
function assert(description: string, condition: boolean, expected?: unknown, actual?: unknown): AssertionResult;

/** Assert a PB API call succeeds (2xx status) */
function assertPBSuccess(description: string, response: Response): AssertionResult;

/** Assert a record has required fields */
function assertFields(description: string, record: Record<string, unknown>, requiredFields: string[]): AssertionResult[];

/** Log a test step for the audit trail */
function logStep(step: string, details?: unknown): void;

/** Write results to JSON file */
function writeResults(suiteName: string, results: TestSuiteResult): void;

/** Cleanup: delete all records matching a filter */
async function cleanup(pb: PBTestClient, collection: string, filter: string): Promise<void>;

/** Sleep helper for timing tests */
function sleep(ms: number): Promise<void>;
```

---

## Step 6: Test Runner (`test-runner.ts`)

```typescript
/**
 * Main entry point. Orchestrates all test suites.
 *
 * Usage:
 *   npx tsx tests/e2e/test-runner.ts
 *   npx tsx tests/e2e/test-runner.ts --only 03-lesson-generation
 *   npx tsx tests/e2e/test-runner.ts --provider groq
 *   npx tsx tests/e2e/test-runner.ts --only 08-cross-llm-comparison
 */

// 1. Parse CLI args (--only, --provider, --verbose)
// 2. Load .env
// 3. Initialise PBTestClient + AITestClient
// 4. Admin auth to PB
// 5. Run test suites in order (or just the --only one)
// 6. Collect all TestSuiteResults
// 7. Write summary.json to results/{timestamp}/
// 8. Print summary to stdout
// 9. Exit with code 0 (all pass) or 1 (any fail)
```

---

## Acceptance Criteria

- [ ] `npx tsx tests/e2e/test-runner.ts --help` prints usage
- [ ] PBTestClient can admin-auth and create/read/delete records
- [ ] AITestClient can call at least one provider and get JSON chunk content back
- [ ] Test runner creates `tests/e2e/results/{timestamp}/summary.json`
- [ ] Evaluator scores a known-good lesson as 8+/10 on all metrics
- [ ] Evaluator scores a deliberately-bad lesson (wrong language) as <5/10

---

## Notes for Cline

- Use `dotenv` to load `.env` from project root
- Use `fetch` from Node.js 18+ (no need for node-fetch)
- All test files use `.ts` extension, run with `tsx`
- Don't import any browser-dependent code from `src/` — the test harness is pure Node.js
- You CAN import type definitions from `src/types/` since they're just interfaces
- You CAN import pure utility functions like `toLanguageCode` from `src/utils/languageUtils.ts`
- You CAN import the `PROFESSOR_FINCH_V2` prompt from `services/systemPrompts.ts` if it has no browser deps
- For the Anthropic provider, the API format differs (Messages API, not OpenAI-compatible) — handle the format conversion in ai-client.ts
