/**
 * Sun Drop Service
 * 
 * Manages the Sun Drop currency system — earning, spending, penalties.
 * Sun Drops replace the XP system throughout the app in Phase 1.1.
 * 
 * Key rules:
 * - Earn Sun Drops by completing activities correctly
 * - Wrong answers: -1 Sun Drop penalty (floor at 0)
 * - Daily cap: 50 Sun Drops
 * - Retry or help usage: Half value earned
 * 
 * @see docs/phase-1.1/GAME_DESIGN.md Section 3 for economy rules
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum Sun Drops a user can earn per day */
const DAILY_CAP = 50;

/** Days before each health decay threshold */
const DECAY_THRESHOLDS = {
  FULL_HEALTH: 2,      // 0-2 days = 100%
  SLIGHT_DECAY: 5,     // 3-5 days = 85%
  MODERATE_DECAY: 10,  // 6-10 days = 60%
  LOW_HEALTH: 14,      // 11-14 days = 35%
  CRITICAL: 21,        // 15-21 days = 15%
  // 22+ days = 5% (minimum)
} as const;

/** Health values for each decay tier */
const HEALTH_VALUES = {
  FULL: 100,
  SLIGHT: 85,
  MODERATE: 60,
  LOW: 35,
  CRITICAL: 15,
  MINIMUM: 5,
} as const;

/** Days of buffer each gift provides */
const GIFT_BUFFER_DAYS = 10;

// ============================================================================
// EARNING CALCULATIONS
// ============================================================================

/**
 * Calculate Sun Drops earned from an activity.
 * 
 * Rules:
 * - Base value is set by AI (1-4 based on difficulty)
 * - Retry or help usage: Half value (rounded up)
 * - Wrong attempts: -1 per wrong answer
 * - Floor at 0 for this activity
 * 
 * @param baseValue - The activity's base Sun Drop value (1-4)
 * @param isRetry - Whether this is a retry attempt
 * @param usedHelp - Whether the user used the help button
 * @param wrongAttempts - Number of wrong answers before correct
 * @returns Net Sun Drops earned (minimum 0)
 * 
 * @example
 * // First try, no help, correct: Full value
 * calculateEarned(3, false, false, 0); // Returns 3
 * 
 * @example
 * // Used help: Half value
 * calculateEarned(3, false, true, 0); // Returns 2 (ceil(3/2))
 * 
 * @example
 * // Retry with 2 wrong attempts
 * calculateEarned(3, true, false, 2); // Returns 0 (ceil(3/2) - 2 = -0.5 → 0)
 */
export function calculateEarned(
  baseValue: number,
  isRetry: boolean,
  usedHelp: boolean,
  wrongAttempts: number
): number {
  // Half value on retry or after help (rounded up)
  let earned = (isRetry || usedHelp) ? Math.ceil(baseValue / 2) : baseValue;
  
  // Subtract wrong attempt penalties (floor at 0 for this activity)
  earned = Math.max(0, earned - wrongAttempts);
  
  return earned;
}

/**
 * Calculate the penalty for a wrong answer.
 * Always returns 1 (the per-wrong-answer penalty).
 * 
 * This is used for UI feedback and total tracking.
 * The actual penalty is applied in calculateEarned().
 * 
 * @returns Penalty amount (always 1)
 */
export function calculatePenalty(): number {
  return 1;
}

// ============================================================================
// TREE HEALTH CALCULATIONS
// ============================================================================

/**
 * Calculate tree health based on days since last refresh.
 * 
 * Gifts provide buffer days before decay kicks in.
 * Health never goes below 5% (tree is never completely dead).
 * 
 * Decay schedule from GAME_DESIGN.md:
 * | Days Since Refresh | Health |
 * |--------------------|--------|
 * | 0-2 days          | 100%   |
 * | 3-5 days          | 85%    |
 * | 6-10 days         | 60%    |
 * | 11-14 days        | 35%    |
 * | 15-21 days        | 15%    |
 * | 22+ days          | 5%     |
 * 
 * @param daysSinceRefresh - Days since last lesson on this tree
 * @param giftsApplied - Number of gifts buffering decay (default 0)
 * @returns Health percentage (5-100)
 * 
 * @example
 * // Just practiced today
 * calculateTreeHealth(0, 0); // Returns 100
 * 
 * @example
 * // 7 days without practice
 * calculateTreeHealth(7, 0); // Returns 60
 * 
 * @example
 * // 7 days, but 1 gift applied (adds 10 day buffer)
 * calculateTreeHealth(7, 1); // Returns 100 (effective days = 0)
 */
export function calculateTreeHealth(
  daysSinceRefresh: number,
  giftsApplied: number = 0
): number {
  // Each gift adds ~10 days of buffer before decay starts
  const buffer = giftsApplied * GIFT_BUFFER_DAYS;
  const effectiveDays = Math.max(0, daysSinceRefresh - buffer);
  
  // Apply decay schedule
  if (effectiveDays <= DECAY_THRESHOLDS.FULL_HEALTH) {
    return HEALTH_VALUES.FULL;
  }
  if (effectiveDays <= DECAY_THRESHOLDS.SLIGHT_DECAY) {
    return HEALTH_VALUES.SLIGHT;
  }
  if (effectiveDays <= DECAY_THRESHOLDS.MODERATE_DECAY) {
    return HEALTH_VALUES.MODERATE;
  }
  if (effectiveDays <= DECAY_THRESHOLDS.LOW_HEALTH) {
    return HEALTH_VALUES.LOW;
  }
  if (effectiveDays <= DECAY_THRESHOLDS.CRITICAL) {
    return HEALTH_VALUES.CRITICAL;
  }
  
  // 22+ days: minimum health (tree is nearly dead but can be revived)
  return HEALTH_VALUES.MINIMUM;
}

/**
 * Calculate the number of days until a tree's health drops to the next tier.
 * Useful for showing "X days until this tree needs water" in the UI.
 * 
 * @param currentHealth - Current health percentage (5-100)
 * @returns Days until next decay tier, or null if already at minimum
 */
export function daysUntilNextDecay(currentHealth: number): number | null {
  if (currentHealth <= HEALTH_VALUES.MINIMUM) {
    return null; // Already at minimum
  }
  if (currentHealth <= HEALTH_VALUES.CRITICAL) {
    // At critical, counting toward minimum
    return DECAY_THRESHOLDS.CRITICAL + 1;
  }
  if (currentHealth <= HEALTH_VALUES.LOW) {
    return DECAY_THRESHOLDS.LOW_HEALTH + 1;
  }
  if (currentHealth <= HEALTH_VALUES.MODERATE) {
    return DECAY_THRESHOLDS.MODERATE_DECAY + 1;
  }
  if (currentHealth <= HEALTH_VALUES.SLIGHT) {
    return DECAY_THRESHOLDS.SLIGHT_DECAY + 1;
  }
  // At full health
  return DECAY_THRESHOLDS.FULL_HEALTH + 1;
}

// ============================================================================
// STAR RATINGS
// ============================================================================

/**
 * Calculate star rating based on Sun Drops earned vs maximum.
 * 
 * Star ratings:
 * - 3 stars: 90%+ of max Sun Drops
 * - 2 stars: 60-89%
 * - 1 star: Below 60%
 * 
 * Note: A lesson is always "passed" (1 star minimum) if completed,
 * but the rating reflects how well the user did.
 * 
 * @param earned - Sun Drops earned in lesson
 * @param max - Maximum possible Sun Drops
 * @returns Star rating (1-3)
 * 
 * @example
 * calculateStars(18, 20); // Returns 3 (90%)
 * calculateStars(12, 20); // Returns 2 (60%)
 * calculateStars(10, 20); // Returns 1 (50%)
 */
export function calculateStars(earned: number, max: number): number {
  if (max <= 0) return 1; // Edge case: always pass
  
  const percentage = earned / max;
  
  if (percentage >= 0.9) return 3;  // 90%+
  if (percentage >= 0.6) return 2;  // 60-89%
  return 1;                          // <60%
}

// ============================================================================
// DAILY CAP MANAGEMENT
// ============================================================================

/**
 * Check if daily Sun Drop cap has been reached.
 * This prevents users from grinding too much in one day.
 * 
 * @param earnedToday - Sun Drops earned so far today
 * @returns Whether cap is reached
 * 
 * @example
 * isDailyCapReached(49); // Returns false
 * isDailyCapReached(50); // Returns true
 * isDailyCapReached(51); // Returns true (over cap somehow)
 */
export function isDailyCapReached(earnedToday: number): boolean {
  return earnedToday >= DAILY_CAP;
}

/**
 * Calculate how many Sun Drops can still be earned today.
 * 
 * @param earnedToday - Sun Drops earned so far today
 * @returns Remaining Sun Drops that can be earned (minimum 0)
 * 
 * @example
 * remainingDailyAllowance(30); // Returns 20
 * remainingDailyAllowance(50); // Returns 0
 */
export function remainingDailyAllowance(earnedToday: number): number {
  return Math.max(0, DAILY_CAP - earnedToday);
}

/**
 * Get the daily cap constant.
 * Useful for displaying in UI: "You've earned 30/50 Sun Drops today!"
 * 
 * @returns Daily Sun Drop cap
 */
export function getDailyCap(): number {
  return DAILY_CAP;
}

// ============================================================================
// TREE GROWTH CALCULATIONS
// ============================================================================

/**
 * Calculate the tree growth contribution from Sun Drops.
 * Used to animate tree growth in the UI when completing lessons.
 * 
 * @param sunDropsEarned - Sun Drops earned this session
 * @param sunDropsMax - Maximum Sun Drops for this lesson
 * @returns Growth fraction (0-1)
 * 
 * @example
 * // For animating tree after lesson completion
 * const growth = calculateTreeGrowth(15, 20); // 0.75
 * // Use this to animate tree size: scale = baseScale + (growth * maxGrowth)
 */
export function calculateTreeGrowth(
  sunDropsEarned: number,
  sunDropsMax: number
): number {
  if (sunDropsMax <= 0) return 0;
  return Math.min(1, sunDropsEarned / sunDropsMax);
}

// ============================================================================
// HEALTH INDICATORS (UI HELPERS)
// ============================================================================

/**
 * Health categories for visual styling.
 * Used to color health bars and tree states.
 */
export type HealthCategory = 'healthy' | 'thirsty' | 'dying';

/**
 * Determine health category for visual display.
 * 
 * @param health - Health percentage (0-100)
 * @returns Health category for styling
 * 
 * @example
 * getHealthCategory(100); // 'healthy'
 * getHealthCategory(50);  // 'thirsty'
 * getHealthCategory(10);  // 'dying'
 */
export function getHealthCategory(health: number): HealthCategory {
  if (health >= 80) return 'healthy';
  if (health >= 40) return 'thirsty';
  return 'dying';
}

/**
 * Health indicator display configuration.
 * Used for showing health status in the UI.
 */
export interface HealthIndicator {
  /** Display text */
  text: string;
  /** Emoji indicator */
  emoji: string;
  /** Color for styling */
  color: 'green' | 'amber' | 'red';
}

/**
 * Get health indicator text for UI display.
 * 
 * @param health - Health percentage (0-100)
 * @returns Display configuration for the health indicator
 * 
 * @example
 * const indicator = getHealthIndicator(75);
 * // { text: 'Thirsty', emoji: '💧', color: 'amber' }
 */
export function getHealthIndicator(health: number): HealthIndicator {
  const category = getHealthCategory(health);
  
  switch (category) {
    case 'healthy':
      return { text: 'Healthy', emoji: '✓', color: 'green' };
    case 'thirsty':
      return { text: 'Thirsty', emoji: '💧', color: 'amber' };
    case 'dying':
      return { text: 'Dying!', emoji: '🆘', color: 'red' };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate days since a given date.
 * Used for tree health decay calculations.
 * 
 * @param lastRefreshDate - ISO date string of last refresh
 * @returns Number of days since the date (0 for today/future)
 * 
 * @example
 * const daysSince = daysSinceLastRefresh('2024-01-15T10:00:00Z');
 */
export function daysSinceLastRefresh(lastRefreshDate: string): number {
  const lastRefresh = new Date(lastRefreshDate);
  const now = new Date();
  
  // Calculate difference in days
  const diffMs = now.getTime() - lastRefresh.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Return 0 for future dates or same day
  return Math.max(0, diffDays);
}

/**
 * Check if a tree needs attention (health < 100%).
 * Used for UI notifications and visual indicators.
 * 
 * @param health - Current health percentage
 * @returns Whether tree needs attention
 */
export function treeNeedsAttention(health: number): boolean {
  return health < HEALTH_VALUES.FULL;
}

/**
 * Get a human-readable description of tree health status.
 * Used for accessibility and tooltips.
 * 
 * @param health - Health percentage (0-100)
 * @returns Human-readable status description
 */
export function getHealthDescription(health: number): string {
  const indicator = getHealthIndicator(health);
  
  if (health >= 100) {
    return 'This tree is in perfect health!';
  }
  
  if (health >= 80) {
    return 'This tree is doing well.';
  }
  
  if (health >= 40) {
    return 'This tree needs some attention. Practice a lesson to refresh it!';
  }
  
  return 'This tree is in critical condition! Practice now to save it!';
}