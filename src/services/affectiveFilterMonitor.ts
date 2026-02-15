/**
 * LingoFriends - Affective Filter Monitoring Service
 * 
 * Implements monitoring for Krashen's "Affective Filter" — the emotional barrier
 * that prevents language acquisition when learners are anxious, unmotivated, or
 * lacking confidence.
 * 
 * Key Principle (from Krashen's Affective Filter Hypothesis):
 * > Learners with high anxiety, low motivation, or low self-confidence have a
 * > "filter" that blocks input from reaching the language acquisition device.
 * 
 * When the filter is high, acquisition stops — even if input is optimal i+1.
 * This service detects rising filters and suggests appropriate adaptations.
 * 
 * Signals Monitored:
 * - Wrong answers in a row (frustration indicator)
 * - Help button usage (confusion indicator)
 * - Time per activity (processing/hesitation indicator)
 * - Session length (engagement indicator)
 * - Time since last session (motivation indicator)
 * - Confidence drops (self-efficacy indicator)
 * 
 * @module affectiveFilterMonitor
 * @see docs/phase-1.2/task-1.2-7-affective-filter.md
 * @see PEDAGOGY.md Section 2 (Affective Filter Hypothesis)
 */

import type {
  LearnerProfile,
  FilterSignal,
} from '../types/pedagogy';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types of signals that can occur during a learning session.
 * Each signal type contributes differently to the affective filter score.
 */
export type SignalType = 'wrong' | 'help' | 'slow' | 'fast' | 'quit';

/**
 * A signal recorded during a learning session for filter monitoring.
 */
export interface SessionSignal {
  /** Type of signal that occurred */
  type: SignalType;
  
  /** When the signal occurred */
  timestamp: Date;
  
  /** Activity ID that triggered the signal */
  activityId: string;
  
  /** Optional additional context data */
  data?: Record<string, unknown>;
}

/**
 * Severity level for adaptations.
 * Used to determine the urgency and type of intervention.
 */
export type AdaptationSeverity = 'none' | 'info' | 'success' | 'warning' | 'critical';

/**
 * Adaptation action with severity and optional actions.
 * 
 * This type represents the different ways the system can respond to
 * the learner's affective state. Each action type has associated
 * properties for messages and level adjustments.
 */
export type AffectiveAdaptationAction =
  | { type: 'none'; severity: 'none' }
  | { type: 'simplify'; message: string; severity: AdaptationSeverity; dropToLevel: number; action?: { dropToI?: boolean } }
  | { type: 'encourage'; message: string; severity: AdaptationSeverity }
  | { type: 'challenge'; message: string; severity: AdaptationSeverity; increaseToLevel: number; action?: { increaseDifficulty?: boolean } }
  | { type: 'suggest_break'; message: string; severity: AdaptationSeverity }
  | { type: 'change_topic'; message: string; severity: AdaptationSeverity; reason: string };

/**
 * Context about the current session for filter calculation.
 */
export interface SessionContext {
  /** Session start time */
  startedAt: Date;
  
  /** Number of activities completed */
  activityCount: number;
  
  /** Average response time so far (milliseconds) */
  averageResponseTimeMs: number;
}

/**
 * Thresholds for filter monitoring.
 * Can be customized for different age groups or learner profiles.
 */
export interface FilterThresholds {
  /** Wrong answers before filter rises (default: 3) */
  wrongAnswerThreshold: number;
  
  /** Help usage rate threshold (default: 0.3 = 30%) */
  helpRateThreshold: number;
  
  /** Time multiplier for "slow" response (default: 2 = 2x average) */
  slowResponseMultiplier: number;
  
  /** Minimum session length before quit is concerning (default: 5 min) */
  minSessionLengthMinutes: number;
  
  /** Days without activity before motivation concern (default: 3) */
  inactivityDaysThreshold: number;
  
  /** Confidence drop threshold (default: 0.2) */
  confidenceDropThreshold: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default thresholds for filter monitoring.
 * Tuned for children ages 7-18.
 */
const DEFAULT_THRESHOLDS: FilterThresholds = {
  wrongAnswerThreshold: 3,
  helpRateThreshold: 0.3,
  slowResponseMultiplier: 2.0,
  minSessionLengthMinutes: 5,
  inactivityDaysThreshold: 3,
  confidenceDropThreshold: 0.2,
};

/**
 * Kid-friendly encouragement messages for various situations.
 * These messages are warm, supportive, and age-appropriate.
 */
export const ENCOURAGEMENT_MESSAGES = {
  /** Messages for wrong answers - normalize mistakes as part of learning */
  wrongAnswer: [
    "That's okay! Learning is about making mistakes.",
    "Good try! You're getting closer.",
    "Don't worry, we'll see this again.",
    "That was a common mistake. Let's remember it together!",
    "Nice effort! Every mistake helps you learn.",
    "Not quite, but you're on the right track!",
  ],
  
  /** Messages for help button usage - reinforce that asking for help is smart */
  helpUsed: [
    "Asking for help is smart!",
    "Great question! That's how we learn.",
    "I'm here to help you understand.",
    "Good thinking to ask!",
    "Helping you is what I'm here for!",
  ],
  
  /** Messages for struggling patterns - provide emotional support */
  struggling: [
    "You're working hard, and it shows!",
    "This one is tricky. Let's break it down together.",
    "You've got this! Take your time.",
    "Learning new things takes practice. You're doing great!",
    "It's okay to find this challenging. That means you're learning!",
    "Let's take a breath. You can do this!",
  ],
  
  /** Messages for success - acknowledge achievement */
  success: [
    "Excellent work!",
    "You're making great progress!",
    "That's the way to do it!",
    "Perfect! You're really getting this!",
    "Awesome! Keep it up!",
    "You're a natural!",
  ],
  
  /** Messages for streaks - celebrate momentum */
  streak: [
    "You're on a roll!",
    "Hot streak! Keep it up!",
    "You're unstoppable today!",
    "Wow, look at you go!",
    "That's impressive! Keep the streak alive!",
  ],
  
  /** Messages for suggesting a break - kind and reassuring */
  suggestBreak: [
    "You've been working hard! Let's take a short break and come back fresh.",
    "Great effort today! A quick break might help you recharge.",
    "Your brain needs rest to learn better. Let's pause and come back soon!",
    "You've done a lot! Taking breaks helps you remember better.",
  ],
  
  /** Messages for simplification - supportive without being condescending */
  simplify: [
    "Let's try something a bit easier to build confidence.",
    "How about we practice some simpler ones first?",
    "Let's warm up with something familiar, then come back to this.",
    "Sometimes taking a step back helps us move forward!",
  ],
  
  /** Messages for challenge - inviting and exciting */
  challenge: [
    "You're on fire! Ready for something more challenging?",
    "wow, you're doing great! Want to try a harder one?",
    "You've mastered this! Let's level up!",
    "This might be too easy for you now. Ready for the next level?",
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the number of days since a given date.
 * 
 * @param dateStr - ISO date string
 * @returns Number of days (can be fractional)
 */
function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity; // No date = infinite days ago
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Count signals of a specific type in the recent signals.
 * 
 * @param signals - Array of session signals
 * @param type - Signal type to count
 * @param lookback - Number of recent signals to check
 * @returns Count of matching signals
 */
function countRecentSignals(
  signals: SessionSignal[],
  type: SignalType,
  lookback: number = 10
): number {
  const recent = signals.slice(-lookback);
  return recent.filter(s => s.type === type).length;
}

/**
 * Get the current streak of a signal type (consecutive from end).
 * 
 * @param signals - Array of session signals
 * @param type - Signal type to check
 * @returns Number of consecutive signals of that type from the end
 */
function getSignalStreak(signals: SessionSignal[], type: SignalType): number {
  let streak = 0;
  for (let i = signals.length - 1; i >= 0; i--) {
    if (signals[i].type === type) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ============================================================================
// FILTER SCORE CALCULATION
// ============================================================================

/**
 * Calculate the current affective filter score (0-1).
 * 
 * Higher scores = higher filter = more blocked learning.
 * 
 * The score is calculated from multiple factors:
 * - Session signals (wrong answers, help usage, slow responses)
 * - Profile signals (confidence level, wrong answer rate, help rate)
 * - Engagement signals (time since last session)
 * 
 * @param profile - Learner profile with historical data
 * @param sessionSignals - Signals from the current session
 * @param thresholds - Custom thresholds (optional)
 * @returns Filter score between 0 (low filter) and 1 (high filter)
 * 
 * @example
 * const score = calculateFilterScore(profile, signals);
 * if (score > 0.7) {
 *   // High filter - consider intervention
 * }
 */
export function calculateFilterScore(
  profile: LearnerProfile,
  sessionSignals: SessionSignal[],
  thresholds: Partial<FilterThresholds> = {}
): number {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  let score = 0;
  
  // === Session Signals (60% weight) ===
  
  // Wrong answers in a row - strongest frustration signal (max 0.25)
  const wrongStreak = getSignalStreak(sessionSignals, 'wrong');
  if (wrongStreak >= t.wrongAnswerThreshold) {
    score += 0.25;
  } else if (wrongStreak >= 2) {
    score += wrongStreak * 0.08; // 2 wrong = 0.16, 1 wrong = 0.08
  }
  
  // Help usage rate - confusion indicator (max 0.15)
  const helpCount = countRecentSignals(sessionSignals, 'help');
  const totalSignals = sessionSignals.length;
  if (totalSignals > 0) {
    const helpRate = helpCount / totalSignals;
    score += Math.min(0.15, helpRate * 0.5);
  }
  
  // Slow responses - hesitation/processing difficulty (max 0.10)
  const slowCount = countRecentSignals(sessionSignals, 'slow');
  score += Math.min(0.10, slowCount * 0.03);
  
  // Fast correct answers might indicate boredom (lower filter)
  const fastCorrectCount = countRecentSignals(sessionSignals, 'fast');
  score -= Math.min(0.10, fastCorrectCount * 0.02); // Reduce filter
  
  // === Profile Signals (30% weight) ===
  
  // Low confidence - self-doubt indicator (max 0.15)
  if (profile.averageConfidence < 0.5) {
    score += (0.5 - profile.averageConfidence) * 0.30;
  }
  
  // High wrong answer rate - ongoing struggle (max 0.10)
  score += profile.wrongAnswerRate * 0.10;
  
  // High help request rate - ongoing confusion (max 0.05)
  score += profile.helpRequestRate * 0.05;
  
  // === Engagement Signals (10% weight) ===
  
  // Time since last session - motivation indicator (max 0.10)
  const daysInactive = daysSince(profile.updated);
  if (daysInactive > t.inactivityDaysThreshold) {
    // Increase filter gradually for each day beyond threshold
    const excessDays = daysInactive - t.inactivityDaysThreshold;
    score += Math.min(0.10, excessDays * 0.02);
  }
  
  // Ensure score is bounded between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Determine if the affective filter is rising during this session.
 * 
 * A "rising" filter means the learner is getting progressively more
 * frustrated or disengaged during the current session. This triggers
 * more immediate interventions than a high but stable filter.
 * 
 * Patterns that indicate rising filter:
 * - 3+ wrong answers in a row
 * - 2+ help uses AND 2+ wrong answers
 * - 2+ slow responses AND 2+ wrong answers
 * - Quit mid-session after struggles
 * 
 * @param sessionSignals - Signals from the current session
 * @param thresholds - Custom thresholds (optional)
 * @returns True if the filter appears to be rising
 * 
 * @example
 * if (isFilterRising(signals)) {
 *   // Immediate intervention needed
 *   const adaptation = getAdaptation(filterScore, signals);
 * }
 */
export function isFilterRising(
  sessionSignals: SessionSignal[],
  thresholds: Partial<FilterThresholds> = {}
): boolean {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  
  // Look at recent signals (last 10)
  const recent = sessionSignals.slice(-10);
  
  // Count signal types
  const wrongCount = recent.filter(s => s.type === 'wrong').length;
  const helpCount = recent.filter(s => s.type === 'help').length;
  const slowCount = recent.filter(s => s.type === 'slow').length;
  const quitCount = recent.filter(s => s.type === 'quit').length;
  
  // Check for patterns indicating rising filter
  
  // Pattern 1: Multiple wrong answers in a row
  const wrongStreak = getSignalStreak(recent, 'wrong');
  if (wrongStreak >= t.wrongAnswerThreshold) {
    return true;
  }
  
  // Pattern 2: Help + wrong answers (confusion + frustration)
  if (helpCount >= 2 && wrongCount >= 2) {
    return true;
  }
  
  // Pattern 3: Slow + wrong answers (struggling)
  if (slowCount >= 2 && wrongCount >= 2) {
    return true;
  }
  
  // Pattern 4: Quit after struggles
  if (quitCount > 0 && wrongCount >= 2) {
    return true;
  }
  
  return false;
}

// ============================================================================
// ADAPTATION CALCULATION
// ============================================================================

/**
 * Get the appropriate adaptation for the current filter state.
 * 
 * Adaptations are determined by:
 * 1. Filter score (0-1)
 * 2. Whether the filter is rising
 * 3. Recent session signals
 * 
 * The adaptation suggests interventions that:
 * - Lower anxiety (encouragement, simplification)
 * - Maintain motivation (challenge for low filter)
 * - Prevent burnout (break suggestions)
 * 
 * @param filterScore - Current filter score (0-1)
 * @param sessionSignals - Signals from the current session
 * @param currentLevel - Current difficulty level (for simplify/challenge)
 * @param thresholds - Custom thresholds (optional)
 * @returns Adaptation action with severity and message
 * 
 * @example
 * const filterScore = calculateFilterScore(profile, signals);
 * const adaptation = getAdaptation(filterScore, signals, currentLevel);
 * 
 * if (adaptation.type !== 'none') {
 *   applyAdaptation(adaptation);
 * }
 */
export function getAdaptation(
  filterScore: number,
  sessionSignals: SessionSignal[],
  currentLevel: number = 2.5,
  thresholds: Partial<FilterThresholds> = {}
): AffectiveAdaptationAction {
  const isRising = isFilterRising(sessionSignals, thresholds);
  const recent = sessionSignals.slice(-10);
  
  // Count signals for context
  const wrongCount = recent.filter(s => s.type === 'wrong').length;
  const helpCount = recent.filter(s => s.type === 'help').length;
  const fastCount = recent.filter(s => s.type === 'fast').length;
  
  // === Critical filter (very high) ===
  // Learner is very frustrated - suggest a break
  if (filterScore > 0.8) {
    const message = ENCOURAGEMENT_MESSAGES.suggestBreak[
      Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.suggestBreak.length)
    ];
    return {
      type: 'suggest_break',
      message,
      severity: 'critical',
    };
  }
  
  // === Rising filter (increasing) ===
  // Immediate intervention needed - simplify
  if (isRising && filterScore > 0.5) {
    const message = wrongCount >= 3
      ? ENCOURAGEMENT_MESSAGES.struggling[
          Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.struggling.length)
        ]
      : ENCOURAGEMENT_MESSAGES.simplify[
          Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.simplify.length)
        ];
    
    return {
      type: 'simplify',
      message,
      severity: 'warning',
      dropToLevel: Math.max(1, currentLevel - 0.5),
      action: { dropToI: true },
    };
  }
  
  // === Moderate filter (stable but elevated) ===
  // Provide encouragement
  if (filterScore > 0.5) {
    const messages = helpCount > wrongCount
      ? ENCOURAGEMENT_MESSAGES.helpUsed
      : ENCOURAGEMENT_MESSAGES.struggling;
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    return {
      type: 'encourage',
      message,
      severity: 'info',
    };
  }
  
  // === Low filter (good state) with fast correct answers ===
  // Learner might be bored - offer challenge
  if (filterScore < 0.3 && fastCount >= 3) {
    const message = ENCOURAGEMENT_MESSAGES.challenge[
      Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.challenge.length)
    ];
    
    return {
      type: 'challenge',
      message,
      severity: 'success',
      increaseToLevel: Math.min(5, currentLevel + 0.5),
      action: { increaseDifficulty: true },
    };
  }
  
  // === Success streak ===
  // Check for consecutive correct answers (no wrong signals recently)
  const wrongStreak = getSignalStreak(recent, 'wrong');
  if (filterScore < 0.3 && wrongStreak === 0 && recent.length >= 3 && wrongCount === 0) {
    // All recent signals are positive or neutral
    const message = ENCOURAGEMENT_MESSAGES.streak[
      Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.streak.length)
    ];
    
    return {
      type: 'encourage',
      message,
      severity: 'success',
    };
  }
  
  // === Normal state ===
  // No adaptation needed
  return {
    type: 'none',
    severity: 'none',
  };
}

// ============================================================================
// SIGNAL MANAGEMENT
// ============================================================================

/**
 * Record a signal in the session.
 * 
 * This is a pure function that returns a new array with the signal added.
 * It's designed to work with React state updates and immutable patterns.
 * 
 * @param sessionSignals - Current session signals
 * @param type - Type of signal to record
 * @param activityId - Activity ID that triggered the signal
 * @param data - Optional additional context
 * @returns New array with the signal added
 * 
 * @example
 * // Record a wrong answer
 * setSignals(prev => recordSignal(prev, 'wrong', 'activity-123'));
 * 
 * // Record a slow response with timing data
 * setSignals(prev => recordSignal(prev, 'slow', 'activity-456', { responseTime: 45000 }));
 */
export function recordSignal(
  sessionSignals: SessionSignal[],
  type: SignalType,
  activityId: string,
  data?: Record<string, unknown>
): SessionSignal[] {
  const newSignal: SessionSignal = {
    type,
    timestamp: new Date(),
    activityId,
    data,
  };
  
  return [...sessionSignals, newSignal];
}

/**
 * Detect signal type from activity result.
 * 
 * Analyzes an activity result and returns the appropriate signal type(s).
 * This is a helper for the pedagogy engine to automatically generate signals.
 * 
 * @param correct - Whether the answer was correct
 * @param usedHelp - Whether help was used
 * @param responseTimeMs - Response time in milliseconds
 * @param averageResponseTimeMs - Average response time for comparison
 * @param thresholds - Custom thresholds (optional)
 * @returns Array of signal types detected
 * 
 * @example
 * const signals = detectSignals(false, true, 45000, 20000);
 * // Returns: ['wrong', 'help', 'slow']
 */
export function detectSignals(
  correct: boolean,
  usedHelp: boolean,
  responseTimeMs: number,
  averageResponseTimeMs: number,
  thresholds: Partial<FilterThresholds> = {}
): SignalType[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const signals: SignalType[] = [];
  
  // Wrong answer signal
  if (!correct) {
    signals.push('wrong');
  }
  
  // Help used signal
  if (usedHelp) {
    signals.push('help');
  }
  
  // Slow response signal (2x average)
  if (responseTimeMs > averageResponseTimeMs * t.slowResponseMultiplier) {
    signals.push('slow');
  }
  
  // Fast correct answer signal (correct in less than half average time)
  if (correct && responseTimeMs < averageResponseTimeMs * 0.5) {
    signals.push('fast');
  }
  
  return signals;
}

// ============================================================================
// PROFILE RISK UPDATE
// ============================================================================

/**
 * Calculate updated filter risk score for the learner profile.
 * 
 * This is used to update the profile's filterRiskScore field.
 * It combines the session score with the existing profile score using
 * a weighted average (20% session, 80% historical).
 * 
 * @param currentRiskScore - Current filter risk score from profile
 * @param sessionFilterScore - Filter score from current session
 * @returns Updated filter risk score
 * 
 * @example
 * const newRisk = calculateUpdatedFilterRisk(profile.filterRiskScore, sessionScore);
 * await learnerProfileService.updateProfile(userId, { filterRiskScore: newRisk });
 */
export function calculateUpdatedFilterRisk(
  currentRiskScore: number,
  sessionFilterScore: number
): number {
  // Weight new session more heavily (20%)
  // This allows the score to respond to recent sessions
  // while maintaining historical context
  const newScore = currentRiskScore * 0.8 + sessionFilterScore * 0.2;
  
  // Ensure bounded
  return Math.max(0, Math.min(1, newScore));
}

/**
 * Decay filter risk over time.
 * 
 * Filter risk should decrease naturally if the learner hasn't struggled
 * recently. Call this when a session starts to reduce risk from old issues.
 * 
 * @param currentRiskScore - Current filter risk score
 * @param daysSinceLastSession - Days since last session
 * @returns Decayed filter risk score
 * 
 * @example
 * const profile = await learnerProfileService.getProfile(userId);
 * const daysSince = daysSince(profile.updated);
 * const decayedRisk = decayFilterRisk(profile.filterRiskScore, daysSince);
 */
export function decayFilterRisk(
  currentRiskScore: number,
  daysSinceLastSession: number
): number {
  // Decay by 10% per day, minimum 0
  // After 10 days of no activity, risk is essentially 0
  const decayFactor = Math.pow(0.9, Math.min(daysSinceLastSession, 10));
  return currentRiskScore * decayFactor;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get a random encouragement message for a specific situation.
 * 
 * @param category - Category of message needed
 * @returns Random message from that category
 */
export function getRandomMessage(
  category: keyof typeof ENCOURAGEMENT_MESSAGES
): string {
  const messages = ENCOURAGEMENT_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Check if an adaptation requires immediate action.
 * 
 * @param adaptation - Adaptation action to check
 * @returns True if immediate action is needed
 */
export function requiresImmediateAction(
  adaptation: AffectiveAdaptationAction
): boolean {
  return adaptation.severity === 'critical' || adaptation.severity === 'warning';
}

/**
 * Check if an adaptation involves difficulty adjustment.
 * 
 * @param adaptation - Adaptation action to check
 * @returns True if difficulty should be adjusted
 */
export function involvesDifficultyChange(
  adaptation: AffectiveAdaptationAction
): boolean {
  return adaptation.type === 'simplify' || adaptation.type === 'challenge';
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  calculateFilterScore,
  isFilterRising,
  getAdaptation,
  recordSignal,
  detectSignals,
  calculateUpdatedFilterRisk,
  decayFilterRisk,
  getRandomMessage,
  requiresImmediateAction,
  involvesDifficultyChange,
  ENCOURAGEMENT_MESSAGES,
  DEFAULT_THRESHOLDS,
};