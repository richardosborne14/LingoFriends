/**
 * LingoFriends - Game Schema Migration Script
 * 
 * Migrates Pocketbase schema for Phase 1.1 game-based learning.
 * Adds collections for: skill_paths, user_trees, gifts, decorations
 * Updates existing collections: profiles, daily_progress
 * 
 * Run with: node scripts/migrate-game-schema.cjs
 * 
 * Prerequisites:
 * - Pocketbase instance running
 * - Admin credentials set in environment variables
 * 
 * @see docs/phase-1.1/task-1-1-7-pocketbase-schema.md
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// ============================================
// FIELD BUILDER (v0.36.2 format)
// ============================================

let fieldIdCounter = 1;
const generateFieldId = () => `game_field_${Date.now()}_${fieldIdCounter++}`;

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

// ============================================
// NEW COLLECTION DEFINITIONS
// ============================================

/**
 * Skill paths - Predefined learning content
 * These are created by admins, not users
 */
const skillPathsCollection = {
  name: 'skill_paths',
  type: 'base',
  fields: [
    buildField('name', 'text', true, { min: 1, max: 100 }),
    buildField('icon', 'text', true, { min: 1, max: 10 }), // Emoji
    buildField('description', 'text', true, { min: 1, max: 500 }),
    buildField('category', 'select', true, { maxSelect: 1, values: ['beginner', 'intermediate', 'advanced'] }),
    buildField('language', 'text', true, { min: 2, max: 20 }), // "fr", "es", "de", "en"
    buildField('lessons', 'json', true), // Array of lesson definitions
  ],
  rules: {
    listRule: '', // Public read
    viewRule: '', // Public read
    createRule: null, // Admin only
    updateRule: null, // Admin only
    deleteRule: null, // Admin only
  },
  indexes: [
    'CREATE INDEX idx_skill_paths_language ON skill_paths (language)',
    'CREATE INDEX idx_skill_paths_category ON skill_paths (category)',
  ],
};

/**
 * User trees - Player's garden trees
 * Each tree represents a skill path the user is learning
 */
const userTreesCollection = {
  name: 'user_trees',
  type: 'base',
  fields: [
    buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
    buildField('skillPath', 'relation', true, { collectionId: 'skill_paths', cascadeDelete: false, maxSelect: 1 }),
    buildField('status', 'select', true, { maxSelect: 1, values: ['seed', 'growing', 'bloomed'] }),
    buildField('health', 'number', true, { min: 0, max: 100, noDecimal: true }),
    buildField('sunDropsTotal', 'number', true, { min: 0, noDecimal: true }),
    buildField('lessonsCompleted', 'number', true, { min: 0, noDecimal: true }),
    buildField('lessonsTotal', 'number', true, { min: 0, noDecimal: true }),
    buildField('lastRefreshDate', 'date', false),
    buildField('position', 'json', true), // { x: number, y: number }
    buildField('decorations', 'json', false), // Array of decoration IDs
  ],
  rules: {
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },
  indexes: [
    'CREATE INDEX idx_user_trees_user ON user_trees (user)',
    'CREATE INDEX idx_user_trees_skillpath ON user_trees (skillPath)',
  ],
};

/**
 * Gifts - Social gifting between friends
 * Tracks sent and received gifts
 */
const giftsCollection = {
  name: 'gifts',
  type: 'base',
  fields: [
    buildField('type', 'select', true, { maxSelect: 1, values: ['water_drop', 'sparkle', 'seed', 'ribbon', 'golden_flower'] }),
    buildField('fromUser', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 }),
    buildField('toUser', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 }),
    buildField('toItem', 'relation', false, { collectionId: 'user_trees', cascadeDelete: false, maxSelect: 1 }),
    buildField('message', 'text', false, { max: 200 }),
    buildField('unlockedAt', 'date', true),
    buildField('sentAt', 'date', true),
    buildField('appliedAt', 'date', false),
  ],
  rules: {
    // User can see gifts they sent or received
    listRule: '@request.auth.id != "" && (fromUser = @request.auth.id || toUser = @request.auth.id)',
    viewRule: '@request.auth.id != "" && (fromUser = @request.auth.id || toUser = @request.auth.id)',
    // Only sender can create
    createRule: '@request.auth.id != "" && fromUser = @request.auth.id',
    // Only recipient can update (to apply gift)
    updateRule: '@request.auth.id != "" && toUser = @request.auth.id',
    deleteRule: null, // Admin only
  },
  indexes: [
    'CREATE INDEX idx_gifts_fromuser ON gifts (fromUser)',
    'CREATE INDEX idx_gifts_touser ON gifts (toUser)',
    'CREATE INDEX idx_gifts_toitem ON gifts (toItem)',
  ],
};

/**
 * Decorations - Garden customization items
 * Unlocked decorations that can be placed in garden
 */
const decorationsCollection = {
  name: 'decorations',
  type: 'base',
  fields: [
    buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
    buildField('itemType', 'select', true, { maxSelect: 1, values: ['hedge', 'bench', 'lantern', 'pond', 'fountain', 'butterfly', 'birdhouse', 'flower_bed', 'garden_gnome', 'stepping_stone'] }),
    buildField('position', 'json', false), // { x: number, y: number }
    buildField('placed', 'bool', true),
    buildField('unlockedAt', 'date', true),
  ],
  rules: {
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },
  indexes: [
    'CREATE INDEX idx_decorations_user ON decorations (user)',
  ],
};

// ============================================
// EXISTING COLLECTION UPDATES
// ============================================

/**
 * Fields to add to profiles collection for game features
 */
const profileGameFields = [
  buildField('avatar', 'select', false, { maxSelect: 1, values: ['fox', 'cat', 'panda', 'rabbit', 'owl', 'bear', 'deer', 'squirrel'] }),
  buildField('avatarEmoji', 'text', false, { min: 1, max: 4 }), // Unicode emoji
  buildField('sunDrops', 'number', true, { min: 0, noDecimal: true }),
  buildField('friendCode', 'text', false, { min: 6, max: 6 }), // 6-char code for sharing
  buildField('giftsReceived', 'number', true, { min: 0, noDecimal: true }),
];

/**
 * Fields to add to daily_progress collection for game features
 * Note: Renaming xp_earned to sunDropsEarned requires data migration
 */
const dailyProgressGameFields = [
  buildField('sunDropsEarned', 'number', true, { min: 0, noDecimal: true }),
  buildField('streak', 'number', true, { min: 0, noDecimal: true }),
  buildField('lastActivityDate', 'date', false),
];

// ============================================
// MIGRATION FUNCTIONS
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
 * Create a new collection with fields and rules
 */
async function createCollection(pb, collectionDef) {
  console.log(`📦 Creating collection: ${collectionDef.name}`);
  
  if (await collectionExists(pb, collectionDef.name)) {
    console.log(`   ⚠️  Collection "${collectionDef.name}" already exists, skipping creation...`);
    return await pb.collections.getOne(collectionDef.name);
  }
  
  try {
    // First create without indexes (relations need to be resolved first)
    const collectionData = {
      name: collectionDef.name,
      type: collectionDef.type || 'base',
      fields: collectionDef.fields,
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
 * Update collection with access rules and indexes
 */
async function updateCollectionRulesAndIndexes(pb, collectionDef) {
  if (!collectionDef.rules && !collectionDef.indexes) return;
  
  console.log(`🔒 Setting rules and indexes for: ${collectionDef.name}`);
  
  try {
    const collection = await pb.collections.getOne(collectionDef.name);
    
    const updates = {};
    
    if (collectionDef.rules) {
      updates.listRule = collectionDef.rules.listRule;
      updates.viewRule = collectionDef.rules.viewRule;
      updates.createRule = collectionDef.rules.createRule;
      updates.updateRule = collectionDef.rules.updateRule;
      updates.deleteRule = collectionDef.rules.deleteRule;
    }
    
    if (collectionDef.indexes) {
      updates.indexes = collectionDef.indexes;
    }
    
    await pb.collections.update(collection.id, updates);
    console.log(`   ✅ Updated "${collectionDef.name}"`);
    
  } catch (error) {
    console.error(`   ❌ Error updating "${collectionDef.name}":`, error.message);
  }
}

/**
 * Add fields to an existing collection
 */
async function addFieldsToCollection(pb, collectionName, newFields) {
  console.log(`➕ Adding fields to: ${collectionName}`);
  
  try {
    const collection = await pb.collections.getOne(collectionName);
    
    // Check which fields already exist
    const existingFieldNames = collection.fields.map(f => f.name);
    const fieldsToAdd = newFields.filter(f => !existingFieldNames.includes(f.name));
    
    if (fieldsToAdd.length === 0) {
      console.log(`   ⚠️  All fields already exist in "${collectionName}", skipping...`);
      return;
    }
    
    // Merge existing fields with new fields
    const updatedFields = [...collection.fields, ...fieldsToAdd];
    
    await pb.collections.update(collection.id, {
      fields: updatedFields,
    });
    
    console.log(`   ✅ Added ${fieldsToAdd.length} fields to "${collectionName}": ${fieldsToAdd.map(f => f.name).join(', ')}`);
    
  } catch (error) {
    console.error(`   ❌ Error adding fields to "${collectionName}":`, error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

/**
 * Migrate xp_earned to sunDropsEarned in daily_progress
 */
async function migrateDailyProgressToSunDrops(pb) {
  console.log('🔄 Migrating daily_progress: xp_earned → sunDropsEarned...');
  
  try {
    // Get all daily_progress records and update
    const records = await pb.collection('daily_progress').getFullList();
    
    let migrated = 0;
    for (const record of records) {
      // If sunDropsEarned doesn't exist but xp_earned does, copy value
      if (record.sunDropsEarned === undefined && record.xp_earned !== undefined) {
        await pb.collection('daily_progress').update(record.id, {
          sunDropsEarned: record.xp_earned,
        });
        migrated++;
      }
    }
    
    console.log(`   ✅ Migrated ${migrated} records`);
    
  } catch (error) {
    console.error(`   ⚠️  Migration skipped (may not have existing data):`, error.message);
  }
}

/**
 * Resolve collection IDs for relation fields
 */
async function resolveCollectionRelations(pb, collectionDef) {
  const processedFields = [];
  
  for (const field of collectionDef.fields) {
    if (field.type === 'relation' && field.collectionId) {
      // Handle special case for users collection
      if (field.collectionId === '_pb_users_auth_') {
        processedFields.push(field);
        continue;
      }
      
      // Try to resolve collection name to ID
      try {
        const targetCollection = await pb.collections.getOne(field.collectionId);
        processedFields.push({
          ...field,
          collectionId: targetCollection.id,
        });
      } catch {
        // Collection doesn't exist yet, keep the name
        // It will be resolved in a second pass
        processedFields.push(field);
      }
    } else {
      processedFields.push(field);
    }
  }
  
  return {
    ...collectionDef,
    fields: processedFields,
  };
}

/**
 * Update relation fields with correct collection IDs after all collections exist
 */
async function updateRelationIds(pb, collectionName) {
  console.log(`🔗 Updating relation IDs in: ${collectionName}`);
  
  try {
    const collection = await pb.collections.getOne(collectionName);
    let needsUpdate = false;
    
    const updatedFields = collection.fields.map(field => {
      if (field.type === 'relation' && field.collectionId) {
        // Check if collectionId is a name (not an ID)
        if (!field.collectionId.startsWith('_') && field.collectionId.length < 15) {
          // It's a collection name, resolve to ID
          return field.collectionId;
        }
      }
      return field;
    });
    
    // Actually resolve the collections
    const resolvedFields = [];
    for (const field of collection.fields) {
      if (field.type === 'relation' && field.collectionId && field.collectionId !== '_pb_users_auth_') {
        try {
          const targetCol = await pb.collections.getOne(field.collectionId);
          if (targetCol.id !== field.collectionId) {
            resolvedFields.push({ ...field, collectionId: targetCol.id });
            needsUpdate = true;
          } else {
            resolvedFields.push(field);
          }
        } catch {
          resolvedFields.push(field);
        }
      } else {
        resolvedFields.push(field);
      }
    }
    
    if (needsUpdate) {
      await pb.collections.update(collection.id, { fields: resolvedFields });
      console.log(`   ✅ Updated relation IDs in "${collectionName}"`);
    } else {
      console.log(`   ✓ Relations already correct in "${collectionName}"`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error updating relations in "${collectionName}":`, error.message);
  }
}

// ============================================
// MAIN MIGRATION
// ============================================

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🌱 LingoFriends Game Schema Migration');
  console.log('═══════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Admin: ${PB_ADMIN_EMAIL}`);
  console.log('');
  
  // Authenticate
  if (!await authenticate(pb)) {
    process.exit(1);
  }
  console.log('');
  
  // ============================================
  // STEP 1: Create new collections
  // ============================================
  console.log('📋 Step 1: Creating new collections...');
  console.log('───────────────────────────────────────');
  
  const newCollections = [
    skillPathsCollection,
    userTreesCollection,
    giftsCollection,
    decorationsCollection,
  ];
  
  for (const collectionDef of newCollections) {
    try {
      const processed = await resolveCollectionRelations(pb, collectionDef);
      await createCollection(pb, processed);
    } catch (error) {
      console.error(`   Skipping ${collectionDef.name} due to error`);
    }
  }
  
  console.log('');
  
  // ============================================
  // STEP 2: Update relation IDs (now all collections exist)
  // ============================================
  console.log('📋 Step 2: Resolving relation IDs...');
  console.log('───────────────────────────────────────');
  
  for (const collectionDef of newCollections) {
    await updateRelationIds(pb, collectionDef.name);
  }
  
  console.log('');
  
  // ============================================
  // STEP 3: Set access rules and indexes
  // ============================================
  console.log('📋 Step 3: Setting access rules and indexes...');
  console.log('───────────────────────────────────────');
  
  for (const collectionDef of newCollections) {
    await updateCollectionRulesAndIndexes(pb, collectionDef);
  }
  
  console.log('');
  
  // ============================================
  // STEP 4: Add game fields to existing collections
  // ============================================
  console.log('📋 Step 4: Adding game fields to existing collections...');
  console.log('───────────────────────────────────────');
  
  await addFieldsToCollection(pb, 'profiles', profileGameFields);
  await addFieldsToCollection(pb, 'daily_progress', dailyProgressGameFields);
  
  console.log('');
  
  // ============================================
  // STEP 5: Migrate existing data
  // ============================================
  console.log('📋 Step 5: Migrating existing data...');
  console.log('───────────────────────────────────────');
  
  await migrateDailyProgressToSunDrops(pb);
  
  console.log('');
  
  // ============================================
  // DONE
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('🎉 Migration complete!');
  console.log('');
  console.log('New collections:');
  console.log('   ✅ skill_paths - Predefined learning content');
  console.log('   ✅ user_trees - Player garden trees');
  console.log('   ✅ gifts - Social gifting');
  console.log('   ✅ decorations - Garden customization');
  console.log('');
  console.log('Updated collections:');
  console.log('   ✅ profiles - Added avatar, sunDrops, friendCode, giftsReceived');
  console.log('   ✅ daily_progress - Added sunDropsEarned, streak, lastActivityDate');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify collections in Pocketbase Admin UI');
  console.log(`   ${PB_URL}/_/`);
  console.log('2. Run seed script: node scripts/seed-skill-paths.cjs');
  console.log('');
}

runMigration().catch(console.error);