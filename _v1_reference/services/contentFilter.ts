/**
 * LingoFriends - Content Safety Filter
 * 
 * Filters AI responses to ensure kid-appropriate content.
 * This is a critical safety layer for children ages 7-18.
 * 
 * @module contentFilter
 */

// ============================================
// UNSAFE CONTENT PATTERNS
// ============================================

/**
 * Regex patterns for content that should be filtered
 * These are checked against AI responses before display
 */
const UNSAFE_PATTERNS: RegExp[] = [
  // Violence
  /\b(kill|murder|death|die|dying|blood|gore)\b/i,
  /\b(weapon|gun|knife|stab|shoot)\b/i,
  
  // Scary/Horror
  /\b(scary|horror|nightmare|terrifying|haunted)\b/i,
  /\b(monster|demon|ghost|zombie)\b/i,
  
  // Romance/Dating (inappropriate for kids)
  /\b(boyfriend|girlfriend|dating|romance|kiss|sexy)\b/i,
  
  // Negative self-talk
  /\b(you('re| are) (stupid|dumb|idiot|worthless))\b/i,
  /\b(hate yourself|give up|you can't)\b/i,
  
  // Controversial topics
  /\b(politics|election|president|government|war)\b/i,
  /\b(religion|god|church|prayer|atheist)\b/i,
  
  // Personal information
  /\b(address|phone number|school name|full name|where do you live)\b/i,
  
  // Profanity (common ones)
  /\b(damn|hell|crap|stupid|idiot)\b/i,
];

/**
 * Phrases that indicate potentially problematic content
 */
const UNSAFE_PHRASES: string[] = [
  'keep this a secret',
  "don't tell your parents",
  "don't tell anyone",
  'meet me',
  'send me a photo',
];

// ============================================
// SAFE FALLBACK RESPONSES
// ============================================

/**
 * Safe fallback responses when content is filtered
 * Randomized to feel natural
 */
const SAFE_FALLBACKS = [
  "Hmm, let me think of a better way to say that! 🤔 Let's continue with our lesson - what would you like to learn next?",
  "Oops, my thoughts got a bit jumbled there! 🦉 Where were we? Tell me what you'd like to practice!",
  "My owl Archimedes distracted me for a moment! 🪶 Let's get back to learning - what shall we explore?",
  "Let me try that again in a better way! 📚 What part of our lesson should we focus on?",
];

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Check if text contains unsafe patterns
 * 
 * @param text - Text to check
 * @returns True if unsafe content detected
 */
export function containsUnsafeContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check regex patterns
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  // Check unsafe phrases
  for (const phrase of UNSAFE_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter AI response and return safe version
 * 
 * @param text - AI response text
 * @returns Filtered text (original if safe, fallback if unsafe)
 */
export function filterResponse(text: string): { text: string; wasFiltered: boolean } {
  if (containsUnsafeContent(text)) {
    // Log for monitoring (in production, this would go to a logging service)
    console.warn('[ContentFilter] Unsafe content detected and filtered');
    
    // Return random safe fallback
    const fallback = SAFE_FALLBACKS[Math.floor(Math.random() * SAFE_FALLBACKS.length)];
    return { text: fallback, wasFiltered: true };
  }
  
  return { text, wasFiltered: false };
}

/**
 * Sanitize user input before sending to AI
 * Removes potential prompt injection attempts
 * 
 * @param text - User input
 * @returns Sanitized text
 */
export function sanitizeUserInput(text: string): string {
  // Remove any attempts to inject system prompts
  let sanitized = text;
  
  // Remove common prompt injection patterns
  sanitized = sanitized.replace(/system\s*:/gi, '');
  sanitized = sanitized.replace(/ignore\s+(previous|above)\s+instructions/gi, '');
  sanitized = sanitized.replace(/pretend\s+you\s+are/gi, '');
  sanitized = sanitized.replace(/you\s+are\s+now/gi, '');
  sanitized = sanitized.replace(/act\s+as\s+if/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Check if user message might indicate distress
 * Returns true if message should trigger extra care
 * 
 * @param text - User message
 * @returns True if potentially distressing content
 */
export function mightIndicateDistress(text: string): boolean {
  const distressPatterns = [
    /\b(sad|crying|upset|scared|worried|anxious)\b/i,
    /\b(no one likes me|nobody likes me|have no friends)\b/i,
    /\b(i('m| am) (bad|terrible|awful) at)\b/i,
    /\b(i can('t|not) do (this|it|anything))\b/i,
  ];
  
  for (const pattern of distressPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

export default {
  containsUnsafeContent,
  filterResponse,
  sanitizeUserInput,
  mightIndicateDistress,
};
