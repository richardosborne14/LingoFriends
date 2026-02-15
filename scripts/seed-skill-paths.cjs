/**
 * LingoFriends - Skill Paths Seed Script
 * 
 * Seeds the skill_paths collection with initial learning content.
 * Run after migrate-game-schema.cjs.
 * 
 * Run with: node scripts/seed-skill-paths.cjs
 * 
 * @see docs/phase-1.1/task-1-1-7-pocketbase-schema.md
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// ============================================
// SKILL PATH DEFINITIONS
// ============================================

/**
 * Initial skill paths for LingoFriends MVP.
 * 
 * Each skill path contains:
 * - name: Display name (kid-friendly)
 * - icon: Emoji for visual identity
 * - description: Short description for tree details
 * - category: Difficulty level
 * - language: Target language code
 * - lessons: Array of lesson definitions
 * 
 * Design principles:
 * - 3-5 lessons per skill path for MVP
 * - 5-8 activities per lesson (set by AI generator)
 * - Kid-friendly themes (sports, food, animals, etc.)
 * - Progressive difficulty within each path
 */
const skillPaths = [
  // ============================================
  // FRENCH SKILL PATHS
  // ============================================
  {
    name: 'Greetings & Basics',
    icon: '👋',
    description: 'Learn how to say hello, goodbye, and introduce yourself in French.',
    category: 'beginner',
    language: 'fr',
    lessons: [
      {
        id: 'fr-greetings-1',
        title: 'Hello & Goodbye',
        icon: '👋',
        vocabulary: ['bonjour', 'salut', 'au revoir', 'à bientôt', 'bonsoir'],
        activities: 6,
        sunDropsMax: 18,
      },
      {
        id: 'fr-greetings-2',
        title: 'Introducing Yourself',
        icon: '🙋',
        vocabulary: ['Je m\'appelle', 'Comment t\'appelles-tu?', 'Enchanté', 'monsieur', 'madame'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'fr-greetings-3',
        title: 'How Are You?',
        icon: '😊',
        vocabulary: ['Ça va?', 'Très bien', 'Comme ci, comme ça', 'mal', 'fatigué'],
        activities: 5,
        sunDropsMax: 16,
      },
    ],
  },
  {
    name: 'Sports Talk',
    icon: '⚽',
    description: 'Learn French vocabulary for sports, games, and physical activities.',
    category: 'beginner',
    language: 'fr',
    lessons: [
      {
        id: 'fr-sports-1',
        title: 'Match Day',
        icon: '⚽',
        vocabulary: ['le but', 'le gardien', 'l\'arbitre', 'le match', 'gagner'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'fr-sports-2',
        title: 'At the Stadium',
        icon: '🏟️',
        vocabulary: ['le stade', 'les spectateurs', 'l\'équipe', 'le joueur', 'le coach'],
        activities: 5,
        sunDropsMax: 18,
      },
      {
        id: 'fr-sports-3',
        title: 'Olympic Games',
        icon: '🏅',
        vocabulary: ['la médaille', 'la compétition', 'le champion', 'l\'athlète', 'la victoire'],
        activities: 6,
        sunDropsMax: 22,
      },
    ],
  },
  {
    name: 'Food & Restaurant',
    icon: '🍽️',
    description: 'Order food, talk about meals, and learn delicious French cuisine vocabulary.',
    category: 'beginner',
    language: 'fr',
    lessons: [
      {
        id: 'fr-food-1',
        title: 'Breakfast Time',
        icon: '🥐',
        vocabulary: ['le croissant', 'le pain', 'le café', 'le jus d\'orange', 'le beurre'],
        activities: 5,
        sunDropsMax: 16,
      },
      {
        id: 'fr-food-2',
        title: 'At the Café',
        icon: '☕',
        vocabulary: ['Je voudrais', 'L\'addition', 'un croissant', 'un sandwich', 'une boisson'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'fr-food-3',
        title: 'Dining Out',
        icon: '🍽️',
        vocabulary: ['le serveur', 'la carte', 'le plat du jour', 'le dessert', 'délicieux'],
        activities: 6,
        sunDropsMax: 22,
      },
    ],
  },
  {
    name: 'Animals & Nature',
    icon: '🐕',
    description: 'Discover French words for animals, plants, and the natural world.',
    category: 'beginner',
    language: 'fr',
    lessons: [
      {
        id: 'fr-nature-1',
        title: 'Pets',
        icon: '🐕',
        vocabulary: ['le chien', 'le chat', 'le lapin', 'le hamster', 'l\'oiseau'],
        activities: 5,
        sunDropsMax: 16,
      },
      {
        id: 'fr-nature-2',
        title: 'At the Zoo',
        icon: '🦁',
        vocabulary: ['le lion', 'l\'éléphant', 'le zèbre', 'le singe', 'la girafe'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'fr-nature-3',
        title: 'In the Garden',
        icon: '🌸',
        vocabulary: ['la fleur', 'l\'arbre', 'le papillon', 'l\'herbe', 'le jardin'],
        activities: 5,
        sunDropsMax: 18,
      },
    ],
  },

  // ============================================
  // SPANISH SKILL PATHS
  // ============================================
  {
    name: 'Saludos y Despedidas',
    icon: '👋',
    description: 'Learn Spanish greetings and how to say goodbye in different situations.',
    category: 'beginner',
    language: 'es',
    lessons: [
      {
        id: 'es-greetings-1',
        title: 'Hola y Adiós',
        icon: '👋',
        vocabulary: ['hola', 'buenos días', 'buenas tardes', 'adiós', 'hasta luego'],
        activities: 6,
        sunDropsMax: 18,
      },
      {
        id: 'es-greetings-2',
        title: 'Presentaciones',
        icon: '🙋',
        vocabulary: ['Me llamo', '¿Cómo te llamas?', 'Mucho gusto', 'Señor', 'Señora'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'es-greetings-3',
        title: '¿Cómo Estás?',
        icon: '😊',
        vocabulary: ['¿Cómo estás?', 'Muy bien', 'Regular', 'mal', 'excelente'],
        activities: 5,
        sunDropsMax: 16,
      },
    ],
  },
  {
    name: 'Comida Deliciosa',
    icon: '🌮',
    description: 'Learn Spanish vocabulary for food, drinks, and ordering at restaurants.',
    category: 'beginner',
    language: 'es',
    lessons: [
      {
        id: 'es-food-1',
        title: 'El Desayuno',
        icon: '🍳',
        vocabulary: ['el desayuno', 'los huevos', 'el pan', 'el café', 'la leche'],
        activities: 5,
        sunDropsMax: 16,
      },
      {
        id: 'es-food-2',
        title: 'En el Restaurante',
        icon: '🍽️',
        vocabulary: ['el menú', 'el camarero', 'la cuenta', 'Quisiera', 'la mesa'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'es-food-3',
        title: 'Frutas y Verduras',
        icon: '🍎',
        vocabulary: ['la manzana', 'el plátano', 'la naranja', 'el tomate', 'la lechuga'],
        activities: 5,
        sunDropsMax: 18,
      },
    ],
  },

  // ============================================
  // GERMAN SKILL PATHS
  // ============================================
  {
    name: 'Begrüßungen',
    icon: '👋',
    description: 'Learn German greetings and essential phrases for daily conversations.',
    category: 'beginner',
    language: 'de',
    lessons: [
      {
        id: 'de-greetings-1',
        title: 'Hallo und Tschüss',
        icon: '👋',
        vocabulary: ['Hallo', 'Guten Morgen', 'Guten Tag', 'Tschüss', 'Auf Wiedersehen'],
        activities: 6,
        sunDropsMax: 18,
      },
      {
        id: 'de-greetings-2',
        title: 'Vorstellung',
        icon: '🙋',
        vocabulary: ['Ich heiße', 'Wie heißt du?', 'Freut mich', 'Herr', 'Frau'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'de-greetings-3',
        title: 'Wie geht\'s?',
        icon: '😊',
        vocabulary: ['Wie geht es dir?', 'Gut', 'Schlecht', 'so lala', 'ausgezeichnet'],
        activities: 5,
        sunDropsMax: 16,
      },
    ],
  },
  {
    name: 'Essen und Trinken',
    icon: '🥨',
    description: 'Learn German vocabulary for food, drinks, and dining.',
    category: 'beginner',
    language: 'de',
    lessons: [
      {
        id: 'de-food-1',
        title: 'Das Frühstück',
        icon: '🥐',
        vocabulary: ['das Frühstück', 'das Brötchen', 'der Käse', 'die Butter', 'die Marmelade'],
        activities: 5,
        sunDropsMax: 16,
      },
      {
        id: 'de-food-2',
        title: 'Im Restaurant',
        icon: '🍽️',
        vocabulary: ['die Speisekarte', 'der Kellner', 'Ich möchte', 'die Rechnung', 'der Tisch'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'de-food-3',
        title: 'Obst und Gemüse',
        icon: '🍎',
        vocabulary: ['der Apfel', 'die Banane', 'die Orange', 'die Tomate', 'die Karotte'],
        activities: 5,
        sunDropsMax: 18,
      },
    ],
  },

  // ============================================
  // ENGLISH (ESL) SKILL PATHS
  // ============================================
  {
    name: 'Getting Started',
    icon: '🌟',
    description: 'Learn essential English phrases for everyday greetings and introductions.',
    category: 'beginner',
    language: 'en',
    lessons: [
      {
        id: 'en-greetings-1',
        title: 'Hello & Goodbye',
        icon: '👋',
        vocabulary: ['hello', 'hi', 'goodbye', 'see you', 'good morning'],
        activities: 6,
        sunDropsMax: 18,
      },
      {
        id: 'en-greetings-2',
        title: 'Meeting People',
        icon: '🙋',
        vocabulary: ['My name is', 'What\'s your name?', 'Nice to meet you', 'Mr.', 'Mrs.'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'en-greetings-3',
        title: 'How Are You?',
        icon: '😊',
        vocabulary: ['How are you?', 'I\'m fine', 'good', 'not bad', 'great'],
        activities: 5,
        sunDropsMax: 16,
      },
    ],
  },
  {
    name: 'Daily Life',
    icon: '🏠',
    description: 'Learn English vocabulary for daily routines, home, and family.',
    category: 'beginner',
    language: 'en',
    lessons: [
      {
        id: 'en-daily-1',
        title: 'My Family',
        icon: '👨‍👩‍👧',
        vocabulary: ['mother', 'father', 'sister', 'brother', 'family'],
        activities: 5,
        sunDropsMax: 16,
      },
      {
        id: 'en-daily-2',
        title: 'At Home',
        icon: '🏠',
        vocabulary: ['kitchen', 'bedroom', 'bathroom', 'living room', 'garden'],
        activities: 6,
        sunDropsMax: 20,
      },
      {
        id: 'en-daily-3',
        title: 'My Day',
        icon: '⏰',
        vocabulary: ['morning', 'afternoon', 'evening', 'breakfast', 'dinner'],
        activities: 5,
        sunDropsMax: 18,
      },
    ],
  },

  // ============================================
  // INTERMEDIATE PATHS (All Languages)
  // ============================================
  {
    name: 'Travel Adventures',
    icon: '✈️',
    description: 'Learn French for travel: at the airport, hotel, and exploring cities.',
    category: 'intermediate',
    language: 'fr',
    lessons: [
      {
        id: 'fr-travel-1',
        title: 'At the Airport',
        icon: '✈️',
        vocabulary: ['l\'aéroport', 'le vol', 'la valise', 'le passeport', 'la porte d\'embarquement'],
        activities: 6,
        sunDropsMax: 22,
      },
      {
        id: 'fr-travel-2',
        title: 'Hotel Check-in',
        icon: '🏨',
        vocabulary: ['l\'hôtel', 'la réservation', 'la chambre', 'la clé', 'le receptionniste'],
        activities: 6,
        sunDropsMax: 22,
      },
      {
        id: 'fr-travel-3',
        title: 'Exploring the City',
        icon: '🗺️',
        vocabulary: ['la carte', 'le musée', 'l\'église', 'le quartier', 'se promener'],
        activities: 7,
        sunDropsMax: 24,
      },
    ],
  },
  {
    name: 'Shopping Spree',
    icon: '🛍️',
    description: 'Learn Spanish for shopping: at the store, asking prices, and making purchases.',
    category: 'intermediate',
    language: 'es',
    lessons: [
      {
        id: 'es-shopping-1',
        title: 'En la Tienda',
        icon: '👕',
        vocabulary: ['la tienda', 'la ropa', 'el precio', '¿Cuánto cuesta?', 'caro'],
        activities: 6,
        sunDropsMax: 22,
      },
      {
        id: 'es-shopping-2',
        title: 'Probadores',
        icon: '👗',
        vocabulary: ['¿Me lo puedo probar?', 'el probador', 'talla', 'me queda', 'apretado'],
        activities: 6,
        sunDropsMax: 22,
      },
      {
        id: 'es-shopping-3',
        title: 'Pagando',
        icon: '💳',
        vocabulary: ['la caja', 'efectivo', 'tarjeta', 'el recibo', 'el cambio'],
        activities: 5,
        sunDropsMax: 20,
      },
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function authenticate(pb) {
  console.log('🔐 Authenticating as admin...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

async function skillPathExists(pb, name, language) {
  try {
    await pb.collection('skill_paths').getFirstListItem(
      `name = "${name}" && language = "${language}"`
    );
    return true;
  } catch {
    return false;
  }
}

async function seedSkillPaths() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🌱 LingoFriends Skill Paths Seed');
  console.log('═══════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Admin: ${PB_ADMIN_EMAIL}`);
  console.log('');
  
  // Authenticate
  if (!await authenticate(pb)) {
    process.exit(1);
  }
  console.log('');
  
  console.log('📦 Seeding skill paths...');
  console.log('───────────────────────────────────────');
  
  let created = 0;
  let skipped = 0;
  
  for (const skillPath of skillPaths) {
    try {
      // Check if already exists
      if (await skillPathExists(pb, skillPath.name, skillPath.language)) {
        console.log(`   ⚠️  "${skillPath.name}" (${skillPath.language}) already exists, skipping...`);
        skipped++;
        continue;
      }
      
      // Create the skill path
      await pb.collection('skill_paths').create({
        name: skillPath.name,
        icon: skillPath.icon,
        description: skillPath.description,
        category: skillPath.category,
        language: skillPath.language,
        lessons: skillPath.lessons,
      });
      
      console.log(`   ✅ Created "${skillPath.name}" (${skillPath.language}) - ${skillPath.lessons.length} lessons`);
      created++;
      
    } catch (error) {
      console.error(`   ❌ Error creating "${skillPath.name}":`, error.message);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Seeding complete!');
  console.log(`   Created: ${created} skill paths`);
  console.log(`   Skipped: ${skipped} (already existed)`);
  console.log(`   Total:   ${skillPaths.length} defined`);
  console.log('');
  console.log('Skill paths by language:');
  console.log('   🇫🇷 French:    ' + skillPaths.filter(sp => sp.language === 'fr').length);
  console.log('   🇪🇸 Spanish:   ' + skillPaths.filter(sp => sp.language === 'es').length);
  console.log('   🇩🇪 German:    ' + skillPaths.filter(sp => sp.language === 'de').length);
  console.log('   🇬🇧 English:   ' + skillPaths.filter(sp => sp.language === 'en').length);
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify skill_paths in Pocketbase Admin UI');
  console.log(`   ${PB_URL}/_/`);
  console.log('2. Trees will be created when users start learning');
  console.log('');
}

seedSkillPaths().catch(console.error);