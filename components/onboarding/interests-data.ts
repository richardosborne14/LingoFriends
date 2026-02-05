/**
 * LingoFriends - Interests Data
 * 
 * Contains all available interests for onboarding Step 3.
 * Organized by category with translations for EN/FR.
 * 
 * These interests help personalize lessons - the AI uses them
 * to create relevant examples and conversation topics.
 * 
 * @module onboarding/interests-data
 */

import type { NativeLanguage } from '../../types';

// ============================================
// TYPES
// ============================================

export interface Interest {
  /** Unique identifier for this interest */
  id: string;
  /** Emoji icon representing the interest */
  icon: string;
  /** Labels in each supported language */
  labels: {
    English: string;
    French: string;
  };
}

export interface InterestCategory {
  /** Category identifier */
  id: string;
  /** Labels in each supported language */
  labels: {
    English: string;
    French: string;
  };
  /** All interests in this category */
  interests: Interest[];
}

// ============================================
// INTEREST DATA
// ============================================

/**
 * All interest categories with their items.
 * Each interest has an id, icon, and bilingual labels.
 */
export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'hobbies',
    labels: {
      English: 'Hobbies',
      French: 'Loisirs',
    },
    interests: [
      { id: 'dancing', icon: '💃', labels: { English: 'Dancing', French: 'Danse' } },
      { id: 'boxing', icon: '🥊', labels: { English: 'Boxing', French: 'Boxe' } },
      { id: 'reading', icon: '📚', labels: { English: 'Reading', French: 'Lecture' } },
      { id: 'drawing', icon: '🎨', labels: { English: 'Drawing', French: 'Dessin' } },
      { id: 'gaming', icon: '🎮', labels: { English: 'Gaming', French: 'Jeux vidéo' } },
      { id: 'cooking', icon: '🍳', labels: { English: 'Cooking', French: 'Cuisine' } },
      { id: 'photography', icon: '📷', labels: { English: 'Photography', French: 'Photo' } },
      { id: 'crafts', icon: '✂️', labels: { English: 'Crafts', French: 'Bricolage' } },
      { id: 'gardening', icon: '🌱', labels: { English: 'Gardening', French: 'Jardinage' } },
      { id: 'writing', icon: '✏️', labels: { English: 'Writing', French: 'Écriture' } },
    ],
  },
  {
    id: 'sports',
    labels: {
      English: 'Sports',
      French: 'Sports',
    },
    interests: [
      { id: 'football', icon: '⚽', labels: { English: 'Football', French: 'Football' } },
      { id: 'basketball', icon: '🏀', labels: { English: 'Basketball', French: 'Basket' } },
      { id: 'swimming', icon: '🏊', labels: { English: 'Swimming', French: 'Natation' } },
      { id: 'cycling', icon: '🚴', labels: { English: 'Cycling', French: 'Vélo' } },
      { id: 'tennis', icon: '🎾', labels: { English: 'Tennis', French: 'Tennis' } },
      { id: 'skateboarding', icon: '🛹', labels: { English: 'Skateboarding', French: 'Skate' } },
      { id: 'gymnastics', icon: '🤸', labels: { English: 'Gymnastics', French: 'Gymnastique' } },
      { id: 'martial_arts', icon: '🥋', labels: { English: 'Martial Arts', French: 'Arts martiaux' } },
      { id: 'running', icon: '🏃', labels: { English: 'Running', French: 'Course' } },
      { id: 'hiking', icon: '🥾', labels: { English: 'Hiking', French: 'Randonnée' } },
    ],
  },
  {
    id: 'music',
    labels: {
      English: 'Music',
      French: 'Musique',
    },
    interests: [
      { id: 'kpop', icon: '🎤', labels: { English: 'K-pop', French: 'K-pop' } },
      { id: 'rap', icon: '🎧', labels: { English: 'Rap', French: 'Rap' } },
      { id: 'rock', icon: '🎸', labels: { English: 'Rock', French: 'Rock' } },
      { id: 'pop', icon: '🎵', labels: { English: 'Pop', French: 'Pop' } },
      { id: 'classical', icon: '🎻', labels: { English: 'Classical', French: 'Classique' } },
      { id: 'jazz', icon: '🎷', labels: { English: 'Jazz', French: 'Jazz' } },
      { id: 'electronic', icon: '🎛️', labels: { English: 'Electronic', French: 'Électro' } },
      { id: 'singing', icon: '🎶', labels: { English: 'Singing', French: 'Chant' } },
      { id: 'piano', icon: '🎹', labels: { English: 'Piano', French: 'Piano' } },
      { id: 'drums', icon: '🥁', labels: { English: 'Drums', French: 'Batterie' } },
    ],
  },
  {
    id: 'other',
    labels: {
      English: 'Other',
      French: 'Autre',
    },
    interests: [
      { id: 'animals', icon: '🐾', labels: { English: 'Animals', French: 'Animaux' } },
      { id: 'science', icon: '🔬', labels: { English: 'Science', French: 'Science' } },
      { id: 'history', icon: '🏛️', labels: { English: 'History', French: 'Histoire' } },
      { id: 'travel', icon: '✈️', labels: { English: 'Travel', French: 'Voyage' } },
      { id: 'fashion', icon: '👗', labels: { English: 'Fashion', French: 'Mode' } },
      { id: 'movies', icon: '🎬', labels: { English: 'Movies', French: 'Cinéma' } },
      { id: 'nature', icon: '🌿', labels: { English: 'Nature', French: 'Nature' } },
      { id: 'space', icon: '🚀', labels: { English: 'Space', French: 'Espace' } },
      { id: 'dinosaurs', icon: '🦖', labels: { English: 'Dinosaurs', French: 'Dinosaures' } },
      { id: 'superheroes', icon: '🦸', labels: { English: 'Superheroes', French: 'Super-héros' } },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the label for an interest in a specific language.
 * Falls back to English if language not supported.
 * 
 * @param interest - The interest object
 * @param language - The user's native language
 * @returns The localized label
 */
export function getInterestLabel(interest: Interest, language: NativeLanguage | string): string {
  // Only French has translations, everything else falls back to English
  if (language === 'French' && interest.labels.French) {
    return interest.labels.French;
  }
  return interest.labels.English;
}

/**
 * Get the label for a category in a specific language.
 * Falls back to English if language not supported.
 * 
 * @param category - The category object
 * @param language - The user's native language
 * @returns The localized label
 */
export function getCategoryLabel(category: InterestCategory, language: NativeLanguage | string): string {
  if (language === 'French' && category.labels.French) {
    return category.labels.French;
  }
  return category.labels.English;
}

/**
 * Find an interest by its ID across all categories.
 * 
 * @param id - The interest ID to find
 * @returns The interest object or undefined
 */
export function findInterestById(id: string): Interest | undefined {
  for (const category of INTEREST_CATEGORIES) {
    const interest = category.interests.find(i => i.id === id);
    if (interest) return interest;
  }
  return undefined;
}

/**
 * Get all interest IDs as a flat array.
 * Useful for validation.
 */
export function getAllInterestIds(): string[] {
  return INTEREST_CATEGORIES.flatMap(cat => cat.interests.map(i => i.id));
}

/**
 * Format selected interests for display.
 * Returns an array of "icon + label" strings.
 * 
 * @param selectedIds - Array of selected interest IDs
 * @param language - The user's native language
 * @returns Array of formatted interest strings
 */
export function formatSelectedInterests(
  selectedIds: string[],
  language: NativeLanguage | string
): string[] {
  return selectedIds
    .map(id => {
      const interest = findInterestById(id);
      if (!interest) return null;
      return `${interest.icon} ${getInterestLabel(interest, language)}`;
    })
    .filter((s): s is string => s !== null);
}

export default INTEREST_CATEGORIES;
