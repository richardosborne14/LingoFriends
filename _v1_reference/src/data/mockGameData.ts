/**
 * Mock Game Data
 * 
 * Placeholder data for testing the garden-first navigation flow.
 * This will be replaced by real data from Pocketbase in Task 1.1.7.
 * 
 * @module mockGameData
 * @deprecated This is temporary test data. Use Pocketbase in production.
 */

import type { 
  SkillPath, 
  SkillPathLesson, 
  PlayerAvatar,
  LessonStatus,
  LessonPlan,
  LessonStep,
  GameActivityType,
} from '../types/game';

// ============================================
// MOCK PLAYER AVATAR
// ============================================

/**
 * Mock player avatar for testing
 */
export const MOCK_AVATAR: PlayerAvatar = {
  id: 'avatar-1',
  emoji: '🧒',
  name: 'Buddy',
};

// ============================================
// MOCK SKILL PATHS
// ============================================

/**
 * Mock skill paths with lessons
 * These represent the learning content available in the app
 */
export const MOCK_SKILL_PATHS: SkillPath[] = [
  {
    id: 'spanish-greetings',
    name: 'Spanish Greetings',
    icon: '🇪🇸',
    description: 'Learn how to say hello and goodbye in Spanish',
    category: 'Basics',
    lessons: [
      {
        id: 'spanish-greetings-1',
        title: 'Hello & Goodbye',
        icon: '👋',
        status: 'completed' as LessonStatus,
        stars: 3,
        sunDropsEarned: 12,
        sunDropsMax: 12,
        completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: 'spanish-greetings-2',
        title: 'Good Morning & Night',
        icon: '🌅',
        status: 'completed' as LessonStatus,
        stars: 2,
        sunDropsEarned: 8,
        sunDropsMax: 12,
        completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        id: 'spanish-greetings-3',
        title: 'How Are You?',
        icon: '🤔',
        status: 'current' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 15,
      },
      {
        id: 'spanish-greetings-4',
        title: 'Nice to Meet You',
        icon: '🤝',
        status: 'locked' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 15,
      },
    ],
  },
  {
    id: 'spanish-numbers',
    name: 'Numbers 1-10',
    icon: '🔢',
    description: 'Count from one to ten in Spanish',
    category: 'Basics',
    lessons: [
      {
        id: 'numbers-1',
        title: 'Uno, Dos, Tres',
        icon: '1️⃣',
        status: 'current' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 10,
      },
      {
        id: 'numbers-2',
        title: 'Cuatro, Cinco, Seis',
        icon: '2️⃣',
        status: 'locked' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 10,
      },
      {
        id: 'numbers-3',
        title: 'Siete, Ocho, Nueve, Diez',
        icon: '3️⃣',
        status: 'locked' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 15,
      },
    ],
  },
  {
    id: 'spanish-colors',
    name: 'Colors',
    icon: '🎨',
    description: 'Learn the colors in Spanish',
    category: 'Basics',
    lessons: [
      {
        id: 'colors-1',
        title: 'Red, Blue, Green',
        icon: '🔴',
        status: 'locked' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 10,
      },
      {
        id: 'colors-2',
        title: 'Yellow, Orange, Purple',
        icon: '🟡',
        status: 'locked' as LessonStatus,
        stars: 0,
        sunDropsEarned: 0,
        sunDropsMax: 10,
      },
    ],
  },
];

// ============================================
// MOCK LESSON PLANS
// ============================================

/**
 * Generate a mock lesson plan for testing
 * This will be replaced by AI-generated lessons in Task 1.1.9
 */
export function generateMockLessonPlan(lesson: SkillPathLesson): LessonPlan {
  // Generate step data based on lesson ID
  const steps = generateMockSteps(lesson);
  
  return {
    id: `lesson-plan-${lesson.id}`,
    title: lesson.title,
    icon: lesson.icon,
    skillPathId: 'spanish-greetings', // Default for mock
    lessonIndex: 0,
    steps,
    totalSunDrops: steps.reduce((sum, step) => sum + step.activity.sunDrops, 0),
  };
}

/**
 * Generate mock lesson steps for a given lesson
 */
function generateMockSteps(lesson: SkillPathLesson): LessonStep[] {
  // Create some basic steps based on the lesson
  // This is temporary - AI will generate real content in Task 1.1.9
  
  if (lesson.id.includes('greetings')) {
    return [
      {
        tutorText: '¡Hola! Let\'s learn how to say "hello" in Spanish!',
        helpText: 'In Spanish, we say "Hola" to greet someone. It sounds like "Oh-la"!',
        activity: {
          type: 'multiple_choice' as GameActivityType,
          question: 'How do you say "Hello" in Spanish?',
          options: ['Hola', 'Adiós', 'Gracias', 'Por favor'],
          correctIndex: 0,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Great job! Now let\'s learn to say "Goodbye".',
        helpText: '"Adiós" means goodbye. You can wave and say "Adiós" when leaving!',
        activity: {
          type: 'multiple_choice' as GameActivityType,
          question: 'What does "Adiós" mean?',
          options: ['Hello', 'Goodbye', 'Thank you', 'Please'],
          correctIndex: 1,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Let\'s practice what you\'ve learned!',
        helpText: 'Think about what "Hola" means in English.',
        activity: {
          type: 'true_false' as GameActivityType,
          statement: '"Hola" means "Hello" in English.',
          isTrue: true,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Time for a fill-in-the-blank challenge!',
        helpText: 'We use "Adiós" when we\'re leaving.',
        activity: {
          type: 'fill_blank' as GameActivityType,
          sentence: 'When you leave, you say ___ .',
          correctAnswer: 'adiós',
          hint: 'It means "goodbye" in Spanish',
          sunDrops: 3,
        },
      },
      {
        tutorText: 'Last one! Translate this word.',
        helpText: 'Remember, "Hola" = Hello',
        activity: {
          type: 'translate' as GameActivityType,
          sourcePhrase: 'Hello',
          acceptedAnswers: ['hola', 'Hola'],
          sunDrops: 3,
        },
      },
    ];
  }
  
  if (lesson.id.includes('numbers')) {
    return [
      {
        tutorText: 'Let\'s count in Spanish! Uno, dos, tres means one, two, three!',
        helpText: '"Uno" sounds like "OO-noh". Let\'s practice!',
        activity: {
          type: 'multiple_choice' as GameActivityType,
          question: 'What is "uno" in English?',
          options: ['One', 'Two', 'Three', 'Four'],
          correctIndex: 0,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Now let\'s learn "dos" (two)!',
        helpText: '"Dos" sounds like "dohs". Easy to remember!',
        activity: {
          type: 'multiple_choice' as GameActivityType,
          question: 'What is "dos" in English?',
          options: ['One', 'Two', 'Three', 'Five'],
          correctIndex: 1,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Let\'s try "tres" (three)!',
        helpText: '"Tres" sounds like "trehs".',
        activity: {
          type: 'multiple_choice' as GameActivityType,
          question: 'What is "tres" in English?',
          options: ['Two', 'Four', 'Three', 'One'],
          correctIndex: 2,
          sunDrops: 2,
        },
      },
      {
        tutorText: 'Put the words in the right order!',
        helpText: 'Count from one to three in Spanish.',
        activity: {
          type: 'word_arrange' as GameActivityType,
          targetSentence: 'uno dos tres',
          scrambledWords: ['tres', 'uno', 'dos'],
          sunDrops: 4,
        },
      },
    ];
  }
  
  // Default steps for other lessons
  return [
    {
      tutorText: `Welcome to "${lesson.title}"! Let's start learning!`,
      helpText: 'This is a practice question.',
      activity: {
        type: 'multiple_choice' as GameActivityType,
        question: 'Ready to learn?',
        options: ['Yes!', 'No', 'Maybe', 'Later'],
        correctIndex: 0,
        sunDrops: 2,
      },
    },
    {
      tutorText: 'Great enthusiasm! Let\'s continue.',
      helpText: 'Keep up the good work!',
      activity: {
        type: 'true_false' as GameActivityType,
        statement: 'Learning is fun!',
        isTrue: true,
        sunDrops: 2,
      },
    },
  ];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a skill path by ID
 */
export function getSkillPathById(id: string): SkillPath | undefined {
  return MOCK_SKILL_PATHS.find(path => path.id === id);
}

/**
 * Get the current lesson for a skill path
 */
export function getCurrentLesson(skillPath: SkillPath): SkillPathLesson | undefined {
  return skillPath.lessons.find(lesson => lesson.status === 'current');
}

// ============================================
// MOCK USER PROGRESS (for header stats)
// ============================================

/**
 * Mock user progress data
 * Should be replaced by real data from useAuth and database
 */
export const MOCK_USER_PROGRESS = {
  /** Current SunDrops balance (total across all trees) */
  sunDrops: 127,
  /** Current Gem balance (global shop currency) */
  gems: 85,
  /** Current streak in days */
  streak: 5,
  /** Total XP earned */
  totalXP: 340,
};
