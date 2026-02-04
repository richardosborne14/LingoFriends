/**
 * LingoFriends - Pocketbase Schema Setup Script
 * 
 * This script creates all required collections in Pocketbase.
 * Run with: node scripts/setup-pocketbase.js
 * 
 * Prerequisites:
 * - Pocketbase instance running
 * - Admin credentials set in environment variables
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'your-admin-password';

// Collection schemas
const collections = [
  // ============================================
  // PROFILES - User profile data (extends auth)
  // ============================================
  {
    name: 'profiles',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'display_name', type: 'text', required: true, options: { min: 1, max: 50 } },
      { name: 'native_language', type: 'select', required: true, options: { values: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'] } },
      { name: 'target_language', type: 'select', required: true, options: { values: ['English', 'French'] } },
      { name: 'level', type: 'select', required: true, options: { values: ['A1', 'A2', 'B1', 'B2', 'C1'] } },
      { name: 'goals', type: 'json', required: false }, // string[]
      { name: 'interests', type: 'json', required: false }, // string[]
      { name: 'traits', type: 'json', required: false }, // UserTrait[]
      { name: 'xp', type: 'number', required: true, options: { min: 0 } },
      { name: 'streak', type: 'number', required: true, options: { min: 0 } },
      { name: 'last_activity', type: 'date', required: false },
      { name: 'daily_xp_today', type: 'number', required: true, options: { min: 0 } },
      { name: 'daily_cap', type: 'number', required: true, options: { min: 50 } }, // default 100
      { name: 'onboarding_complete', type: 'bool', required: true },
    ],
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: null, // No deletion allowed
  },

  // ============================================
  // SESSIONS - Chat sessions (Main Hall + Lessons)
  // ============================================
  {
    name: 'sessions',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'session_type', type: 'select', required: true, options: { values: ['MAIN', 'LESSON'] } },
      { name: 'status', type: 'select', required: true, options: { values: ['ACTIVE', 'COMPLETED', 'PAUSED'] } },
      { name: 'title', type: 'text', required: true, options: { max: 200 } },
      { name: 'objectives', type: 'json', required: false }, // string[]
      { name: 'messages', type: 'json', required: false }, // Message[]
      { name: 'draft', type: 'json', required: false }, // LessonDraft | null
      { name: 'parent_session', type: 'relation', required: false, options: { collectionId: 'sessions', maxSelect: 1 } },
      { name: 'target_language', type: 'select', required: true, options: { values: ['English', 'French'] } },
    ],
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },

  // ============================================
  // FRIENDSHIPS - Friend relationships
  // ============================================
  {
    name: 'friendships',
    type: 'base',
    schema: [
      { name: 'user_a', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'user_b', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'status', type: 'select', required: true, options: { values: ['PENDING', 'ACCEPTED', 'DECLINED'] } },
      { name: 'initiated_by', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
    ],
    // Both users can view their friendships
    listRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
    viewRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
    // Only authenticated users can create
    createRule: '@request.auth.id != ""',
    // Only involved users can update (accept/decline)
    updateRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
    // Only involved users can delete
    deleteRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
  },

  // ============================================
  // FRIEND_CODES - Temporary codes for adding friends
  // ============================================
  {
    name: 'friend_codes',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'code', type: 'text', required: true, options: { min: 6, max: 6 } },
      { name: 'expires_at', type: 'date', required: true },
    ],
    // Anyone can look up a code (to add friend)
    listRule: '',
    viewRule: '',
    // Only authenticated users can create their own codes
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: null, // No updates
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    indexes: [
      'CREATE UNIQUE INDEX idx_friend_code ON friend_codes (code)',
    ],
  },

  // ============================================
  // DAILY_PROGRESS - Daily learning stats
  // ============================================
  {
    name: 'daily_progress',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'date', type: 'date', required: true },
      { name: 'xp_earned', type: 'number', required: true, options: { min: 0 } },
      { name: 'lessons_completed', type: 'number', required: true, options: { min: 0 } },
      { name: 'activities_completed', type: 'number', required: true, options: { min: 0 } },
      { name: 'time_spent_seconds', type: 'number', required: true, options: { min: 0 } },
    ],
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: null,
    indexes: [
      'CREATE UNIQUE INDEX idx_user_date ON daily_progress (user, date)',
    ],
  },

  // ============================================
  // VOCABULARY - For spaced repetition (Phase 2)
  // ============================================
  {
    name: 'vocabulary',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
      { name: 'term', type: 'text', required: true, options: { max: 500 } },
      { name: 'translation', type: 'text', required: true, options: { max: 500 } },
      { name: 'language', type: 'select', required: true, options: { values: ['English', 'French'] } },
      { name: 'context', type: 'text', required: false, options: { max: 1000 } }, // Example sentence
      { name: 'times_seen', type: 'number', required: true, options: { min: 0 } },
      { name: 'times_correct', type: 'number', required: true, options: { min: 0 } },
      { name: 'last_reviewed', type: 'date', required: false },
      { name: 'next_review', type: 'date', required: false },
      { name: 'growth_stage', type: 'number', required: true, options: { min: 0, max: 5 } }, // 0=seed, 5=tree
    ],
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },
];

// ============================================
// SETUP FUNCTIONS
// ============================================

async function authenticate(pb) {
  console.log('🔐 Authenticating as admin...');
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log('✅ Authenticated successfully');
}

async function createCollection(pb, schema) {
  console.log(`📦 Creating collection: ${schema.name}`);
  
  try {
    // Check if collection exists
    const existing = await pb.collections.getList(1, 1, {
      filter: `name = "${schema.name}"`
    });
    
    if (existing.totalItems > 0) {
      console.log(`   ⚠️  Collection ${schema.name} already exists, skipping...`);
      return;
    }
    
    // Create collection
    await pb.collections.create(schema);
    console.log(`   ✅ Created ${schema.name}`);
    
  } catch (error) {
    console.error(`   ❌ Error creating ${schema.name}:`, error.message);
    throw error;
  }
}

async function setupPocketbase() {
  // Dynamic import for ESM compatibility
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('🚀 LingoFriends Pocketbase Setup');
  console.log(`   URL: ${PB_URL}`);
  console.log('');
  
  try {
    await authenticate(pb);
    console.log('');
    
    for (const collection of collections) {
      await createCollection(pb, collection);
    }
    
    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify collections in Pocketbase Admin UI');
    console.log('2. Update .env with VITE_POCKETBASE_URL');
    console.log('3. Start the LingoFriends app');
    
  } catch (error) {
    console.error('');
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupPocketbase();
