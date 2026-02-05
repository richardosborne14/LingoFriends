/**
 * LingoFriends - Pocketbase Schema Setup Script
 * 
 * Creates all required collections in Pocketbase v0.36.2
 * Run with: node scripts/setup-pocketbase.js
 * 
 * Prerequisites:
 * - Pocketbase instance running
 * - Admin credentials set in environment variables or passed as args
 * 
 * IMPORTANT: In Pocketbase v0.36+, collections use 'fields' (not 'schema')
 * and each field type has specific structure requirements.
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

/**
 * Helper to generate unique field IDs
 * Pocketbase requires unique IDs for each field
 */
let fieldIdCounter = 1;
const generateFieldId = () => `field_${Date.now()}_${fieldIdCounter++}`;

/**
 * Build a field object for Pocketbase v0.36.2
 * Each field type has specific properties
 */
function buildField(name, type, required, options = {}) {
  const base = {
    id: generateFieldId(),
    name,
    type,
    required: required || false,
    presentable: false,
    hidden: false,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        min: options.min || 0,
        max: options.max || 0,
        pattern: options.pattern || '',
      };
    
    case 'number':
      return {
        ...base,
        min: options.min ?? null,
        max: options.max ?? null,
        onlyInt: options.noDecimal || false,
      };
    
    case 'bool':
      return base;
    
    case 'date':
      return {
        ...base,
        min: '',
        max: '',
      };
    
    case 'select':
      return {
        ...base,
        maxSelect: options.maxSelect || 1,
        values: options.values || [],
      };
    
    case 'relation':
      return {
        ...base,
        collectionId: options.collectionId,
        cascadeDelete: options.cascadeDelete || false,
        minSelect: options.minSelect || 0,
        maxSelect: options.maxSelect || 1,
      };
    
    case 'json':
      return {
        ...base,
        maxSize: options.maxSize || 2000000,
      };
    
    default:
      return base;
  }
}

/**
 * Collection definitions for LingoFriends
 */
const collections = [
  // ============================================
  // PROFILES - User profile data
  // ============================================
  {
    name: 'profiles',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('display_name', 'text', true, { min: 1, max: 50 }),
      buildField('native_language', 'select', true, { maxSelect: 1, values: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Ukrainian', 'Italian', 'Chinese', 'Japanese', 'Hindi', 'Romanian'] }),
      buildField('target_language', 'select', true, { maxSelect: 1, values: ['English', 'French', 'German', 'Spanish', 'Italian'] }),
      buildField('age_group', 'select', true, { maxSelect: 1, values: ['7-10', '11-14', '15-18'] }),
      buildField('level', 'select', true, { maxSelect: 1, values: ['A1', 'A2', 'B1', 'B2', 'C1'] }),
      buildField('goals', 'json', false),
      buildField('interests', 'json', false),
      buildField('traits', 'json', false),
      buildField('xp', 'number', true, { min: 0, noDecimal: true }),
      buildField('streak', 'number', true, { min: 0, noDecimal: true }),
      buildField('last_activity', 'date', false),
      buildField('daily_xp_today', 'number', true, { min: 0, noDecimal: true }),
      buildField('daily_cap', 'number', true, { min: 50, noDecimal: true }),
      buildField('onboarding_complete', 'bool', true),
      // NEW: Subject-based learning fields (Phase 1 Task 5)
      buildField('subject_type', 'select', false, { maxSelect: 1, values: ['language', 'maths', 'coding'] }),
      buildField('target_subject', 'text', false, { max: 50 }), // 'English', 'German', 'Maths', 'Scratch'
      buildField('selected_interests', 'json', false), // Array of user-selected interests from onboarding
    ],
    rules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: null,
    }
  },

  // ============================================
  // SESSIONS - Chat sessions (Main Hall + Lessons)
  // NOTE: Must be created before ai_profile_fields (which references it)
  // ============================================
  {
    name: 'sessions',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('session_type', 'select', true, { maxSelect: 1, values: ['MAIN', 'LESSON'] }),
      buildField('status', 'select', true, { maxSelect: 1, values: ['ACTIVE', 'COMPLETED', 'PAUSED'] }),
      buildField('title', 'text', true, { max: 200 }),
      buildField('objectives', 'json', false),
      buildField('messages', 'json', false),
      buildField('draft', 'json', false),
      buildField('parent_session', 'relation', false, { collectionId: 'sessions', maxSelect: 1 }),
      buildField('target_language', 'select', true, { maxSelect: 1, values: ['English', 'French', 'German', 'Spanish', 'Italian'] }),
    ],
    rules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    }
  },

  // ============================================
  // FRIENDSHIPS - Friend relationships
  // ============================================
  {
    name: 'friendships',
    type: 'base',
    fields: [
      buildField('user_a', 'relation', true, { collectionId: '_pb_users_auth_', maxSelect: 1 }),
      buildField('user_b', 'relation', true, { collectionId: '_pb_users_auth_', maxSelect: 1 }),
      buildField('status', 'select', true, { maxSelect: 1, values: ['PENDING', 'ACCEPTED', 'DECLINED'] }),
      buildField('initiated_by', 'relation', true, { collectionId: '_pb_users_auth_', maxSelect: 1 }),
    ],
    rules: {
      listRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
      viewRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
      deleteRule: '@request.auth.id != "" && (user_a = @request.auth.id || user_b = @request.auth.id)',
    }
  },

  // ============================================
  // FRIEND_CODES - Temporary codes for adding friends
  // ============================================
  {
    name: 'friend_codes',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('code', 'text', true, { min: 6, max: 6 }),
      buildField('expires_at', 'date', true),
    ],
    rules: {
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: null,
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    },
    indexes: ['CREATE UNIQUE INDEX idx_friend_code ON friend_codes (code)'],
  },

  // ============================================
  // DAILY_PROGRESS - Daily learning stats
  // ============================================
  {
    name: 'daily_progress',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('date', 'date', true),
      buildField('xp_earned', 'number', true, { min: 0, noDecimal: true }),
      buildField('lessons_completed', 'number', true, { min: 0, noDecimal: true }),
      buildField('activities_completed', 'number', true, { min: 0, noDecimal: true }),
      buildField('time_spent_seconds', 'number', true, { min: 0, noDecimal: true }),
    ],
    rules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: null,
    },
    indexes: ['CREATE UNIQUE INDEX idx_user_date ON daily_progress (user, date)'],
  },

  // ============================================
  // VOCABULARY - For spaced repetition (Phase 2)
  // ============================================
  {
    name: 'vocabulary',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('term', 'text', true, { max: 500 }),
      buildField('translation', 'text', true, { max: 500 }),
      buildField('language', 'select', true, { maxSelect: 1, values: ['English', 'French'] }),
      buildField('context', 'text', false, { max: 1000 }),
      buildField('times_seen', 'number', true, { min: 0, noDecimal: true }),
      buildField('times_correct', 'number', true, { min: 0, noDecimal: true }),
      buildField('last_reviewed', 'date', false),
      buildField('next_review', 'date', false),
      buildField('growth_stage', 'number', true, { min: 0, max: 5, noDecimal: true }),
    ],
    rules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    }
  },

  // ============================================
  // AI_PROFILE_FIELDS - Facts learned about user during conversations
  // Separate from traits (coach observations) - these are specific facts
  // e.g. "favorite_kpop_group: BTS", "learning_motivation: talk to Korean friends"
  // NOTE: Must be created AFTER sessions (it references sessions collection)
  // ============================================
  {
    name: 'ai_profile_fields',
    type: 'base',
    fields: [
      buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
      buildField('field_name', 'text', true, { min: 1, max: 100 }), // e.g. "favorite_kpop_group"
      buildField('field_value', 'text', true, { min: 1, max: 500 }), // e.g. "BTS"
      buildField('confidence', 'number', true, { min: 0, max: 1 }), // 0.0 to 1.0
      buildField('source_session', 'relation', false, { collectionId: 'sessions', maxSelect: 1 }), // Where this was learned
      buildField('learned_at', 'date', true), // When this fact was learned
    ],
    rules: {
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
    }
  },
];

// ============================================
// SETUP FUNCTIONS
// ============================================

async function authenticate(pb) {
  console.log('🔐 Authenticating as admin...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function collectionExists(pb, name) {
  try {
    await pb.collections.getOne(name);
    return true;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

/**
 * Create a collection with fields (v0.36.2 format)
 */
async function createCollection(pb, collectionDef) {
  console.log(`📦 Creating collection: ${collectionDef.name}`);
  
  if (await collectionExists(pb, collectionDef.name)) {
    console.log(`   ⚠️  Collection "${collectionDef.name}" already exists, skipping...`);
    const existing = await pb.collections.getOne(collectionDef.name);
    return existing;
  }
  
  try {
    // In v0.36.2, use 'fields' directly (not 'schema')
    const collectionData = {
      name: collectionDef.name,
      type: collectionDef.type || 'base',
      fields: collectionDef.fields,
      // Start with no rules - we'll add them after creation
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    };

    const created = await pb.collections.create(collectionData);
    console.log(`   ✅ Created "${collectionDef.name}" (id: ${created.id})`);
    return created;
    
  } catch (error) {
    console.error(`   ❌ Error creating "${collectionDef.name}":`, error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

/**
 * Update collection with access rules
 */
async function updateCollectionRules(pb, collectionDef) {
  if (!collectionDef.rules) return;
  
  console.log(`🔒 Setting rules for: ${collectionDef.name}`);
  
  try {
    const collection = await pb.collections.getOne(collectionDef.name);
    
    await pb.collections.update(collection.id, {
      listRule: collectionDef.rules.listRule,
      viewRule: collectionDef.rules.viewRule,
      createRule: collectionDef.rules.createRule,
      updateRule: collectionDef.rules.updateRule,
      deleteRule: collectionDef.rules.deleteRule,
    });
    
    console.log(`   ✅ Rules set for "${collectionDef.name}"`);
    
  } catch (error) {
    console.error(`   ❌ Error setting rules for "${collectionDef.name}":`, error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

/**
 * Create indexes for a collection
 */
async function createIndexes(pb, collectionDef) {
  if (!collectionDef.indexes || collectionDef.indexes.length === 0) return;
  
  console.log(`📇 Creating indexes for: ${collectionDef.name}`);
  
  try {
    const collection = await pb.collections.getOne(collectionDef.name);
    
    await pb.collections.update(collection.id, {
      indexes: collectionDef.indexes,
    });
    
    console.log(`   ✅ Indexes created for "${collectionDef.name}"`);
    
  } catch (error) {
    console.error(`   ❌ Error creating indexes for "${collectionDef.name}":`, error.message);
  }
}

/**
 * Resolve collection name to actual ID for relations
 */
async function resolveCollectionId(pb, nameOrId) {
  // If it's the built-in users collection, return as-is
  if (nameOrId === '_pb_users_auth_') {
    return nameOrId;
  }
  
  try {
    const collection = await pb.collections.getOne(nameOrId);
    return collection.id;
  } catch {
    // Return name as fallback (for collections being created in same run)
    return nameOrId;
  }
}

/**
 * Process a collection definition to resolve relation IDs
 */
async function processCollectionForRelations(pb, collectionDef) {
  const processedFields = [];
  
  for (const field of collectionDef.fields) {
    if (field.type === 'relation' && field.collectionId) {
      const resolvedId = await resolveCollectionId(pb, field.collectionId);
      processedFields.push({
        ...field,
        collectionId: resolvedId,
      });
    } else {
      processedFields.push(field);
    }
  }
  
  return {
    ...collectionDef,
    fields: processedFields,
  };
}

async function setupPocketbase() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🚀 LingoFriends Pocketbase Setup (v0.36.2)');
  console.log('═══════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Admin: ${PB_ADMIN_EMAIL}`);
  console.log('');
  
  try {
    await authenticate(pb);
    console.log('');
    
    // Phase 1: Create all collections with fields
    console.log('📋 Phase 1: Creating collections with fields...');
    console.log('───────────────────────────────────────');
    
    const createdCollections = [];
    for (const collection of collections) {
      try {
        // Resolve any relation collection IDs before creating
        const processed = await processCollectionForRelations(pb, collection);
        const created = await createCollection(pb, processed);
        createdCollections.push({ def: processed, created });
      } catch (e) {
        console.error(`   Skipping ${collection.name} due to error`);
      }
    }
    
    console.log('');
    
    // Phase 2: Update self-referencing relations (sessions.parent_session)
    // This needs to happen after the sessions collection exists
    console.log('📋 Phase 2: Updating self-references...');
    console.log('───────────────────────────────────────');
    
    try {
      const sessionsCol = await pb.collections.getOne('sessions');
      const parentField = sessionsCol.fields.find(f => f.name === 'parent_session');
      if (parentField && parentField.collectionId === 'sessions') {
        // Update to use actual ID
        parentField.collectionId = sessionsCol.id;
        await pb.collections.update(sessionsCol.id, { fields: sessionsCol.fields });
        console.log('   ✅ Updated sessions.parent_session relation');
      }
    } catch (e) {
      console.log('   ⚠️  Self-reference update skipped');
    }
    
    console.log('');
    
    // Phase 3: Set access rules
    console.log('📋 Phase 3: Setting access rules...');
    console.log('───────────────────────────────────────');
    
    for (const collection of collections) {
      await updateCollectionRules(pb, collection);
    }
    
    console.log('');
    
    // Phase 4: Create indexes
    console.log('📋 Phase 4: Creating indexes...');
    console.log('───────────────────────────────────────');
    
    for (const collection of collections) {
      await createIndexes(pb, collection);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎉 Setup complete!');
    console.log(`   Processed: ${createdCollections.length}/${collections.length} collections`);
    console.log('');
    console.log('Next steps:');
    console.log('1. ✅ Verify collections in Pocketbase Admin UI');
    console.log(`   ${PB_URL}/_/`);
    console.log('2. ✅ .env already has VITE_POCKETBASE_URL');
    console.log('3.  Start the LingoFriends app');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupPocketbase();
