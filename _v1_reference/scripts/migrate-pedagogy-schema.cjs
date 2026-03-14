/**
 * LingoFriends - Pedagogy Schema Migration Script
 * 
 * Migrates Pocketbase schema for Phase 1.2 Pedagogy Engine.
 * Creates collections for: topics, chunk_library, user_chunks, learner_profiles
 * 
 * Run with: node scripts/migrate-pedagogy-schema.cjs
 * 
 * Prerequisites:
 * - Pocketbase instance running
 * - Admin credentials set in environment variables
 * - Phase 1.1 collections already exist (profiles, etc.)
 * 
 * @see docs/phase-1.2/task-1.2-1-learner-model-schema.md
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// ============================================
// FIELD BUILDER (v0.36.2 format)
// ============================================

let fieldIdCounter = 1;
const generateFieldId = () => `pedagogy_field_${Date.now()}_${fieldIdCounter++}`;

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
 * Topics - Thematic organization for chunks
 * 
 * Topics are flexible pools of chunks (not fixed paths).
 * The Pedagogy Engine draws from topics based on learner interests.
 * 
 * API Rules:
 * - Read: Any authenticated user
 * - Write: Admin only (curated content)
 * 
 * Note: parent_topic relation is added in a second pass after collection exists.
 */
const topicsCollection = {
  name: 'topics',
  type: 'base',
  fields: [
    buildField('name', 'text', true, { min: 1, max: 100 }),
    buildField('icon', 'text', true, { min: 1, max: 10 }), // Emoji
    buildField('description', 'text', false, { max: 500 }),
    // parent_topic added after collection exists (self-referential)
    buildField('target_language', 'text', true, { min: 2, max: 5 }), // "fr", "es", "de", "en"
    buildField('difficulty_range', 'text', true, { min: 3, max: 5 }), // "1-3", "2-4", etc.
    buildField('tags', 'json', false), // Array of strings
    buildField('chunk_count', 'number', true, { min: 0, noDecimal: true }),
  ],
  rules: {
    listRule: '', // Public read (authenticated)
    viewRule: '', // Public read (authenticated)
    createRule: null, // Admin only
    updateRule: null, // Admin only
    deleteRule: null, // Admin only
  },
  indexes: [
    'CREATE INDEX idx_topics_language ON topics (target_language)',
  ],
};

/**
 * Chunk Library - Master library of lexical chunks
 * 
 * The fundamental content unit for the Lexical Approach.
 * Each chunk is a whole phrase/pattern that native speakers use as a unit.
 * 
 * API Rules:
 * - Read: Any authenticated user
 * - Write: Admin only (curated content)
 * 
 * Note: topics relation is added in a second pass after topics collection exists.
 */
const chunkLibraryCollection = {
  name: 'chunk_library',
  type: 'base',
  fields: [
    // Core content
    buildField('text', 'text', true, { min: 1, max: 500 }), // Target language text
    buildField('translation', 'text', true, { min: 1, max: 500 }), // Native language translation
    buildField('chunk_type', 'select', true, { maxSelect: 1, values: ['polyword', 'collocation', 'utterance', 'frame'] }),
    
    // Language info
    buildField('target_language', 'text', true, { min: 2, max: 5 }),
    buildField('native_language', 'text', true, { min: 2, max: 5 }),
    
    // For sentence frames (variable slots)
    buildField('slots', 'json', false), // Array of ChunkSlot
    
    // Difficulty and categorization
    buildField('difficulty', 'number', true, { min: 1, max: 5, noDecimal: true }),
    // topics relation added after topics collection exists
    buildField('frequency', 'number', true, { min: 0, noDecimal: true }), // Corpus frequency rank
    
    // SRS defaults
    buildField('base_interval', 'number', true, { min: 1, noDecimal: true }), // Default first review interval (days)
    
    // Metadata
    buildField('notes', 'text', false, { max: 1000 }), // Usage notes for AI
    buildField('cultural_context', 'text', false, { max: 500 }), // Cultural usage notes
    buildField('age_appropriate', 'json', false), // Array: ["7-10", "11-14", "15-18"]
    
    // Audio (Phase 2)
    buildField('audio_url', 'text', false, { max: 500 }),
  ],
  rules: {
    listRule: '', // Public read (authenticated)
    viewRule: '', // Public read (authenticated)
    createRule: null, // Admin only
    updateRule: null, // Admin only
    deleteRule: null, // Admin only
  },
  indexes: [
    'CREATE INDEX idx_chunks_language_diff ON chunk_library (target_language, difficulty)',
    'CREATE INDEX idx_chunks_type ON chunk_library (chunk_type)',
    'CREATE INDEX idx_chunks_frequency ON chunk_library (frequency)',
  ],
};

/**
 * User Chunks - Per-user progress on each chunk
 * 
 * The heart of the spaced repetition system.
 * Each chunk a learner encounters gets a UserChunk record.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only (via API, not direct user input)
 * 
 * Note: Relations are added in a second pass after collections exist.
 */
const userChunksCollection = {
  name: 'user_chunks',
  type: 'base',
  fields: [
    // Relations added after collections exist
    // user relation added after users collection exists
    // chunk relation added after chunk_library collection exists
    
    // Acquisition status
    buildField('status', 'select', true, { maxSelect: 1, values: ['new', 'learning', 'acquired', 'fragile'] }),
    
    // SM-2 Spaced Repetition parameters
    buildField('ease_factor', 'number', true, { min: 1.3, max: 2.5 }), // Float: 1.3-2.5
    buildField('interval', 'number', true, { min: 0, noDecimal: true }), // Days until next review
    buildField('next_review_date', 'date', true),
    buildField('repetitions', 'number', true, { min: 0, noDecimal: true }), // Consecutive successful reviews
    
    // Performance tracking
    buildField('total_encounters', 'number', true, { min: 0, noDecimal: true }), // Times seen
    buildField('correct_first_try', 'number', true, { min: 0, noDecimal: true }), // Got it right immediately
    buildField('wrong_attempts', 'number', true, { min: 0, noDecimal: true }), // Total wrong attempts
    buildField('help_used_count', 'number', true, { min: 0, noDecimal: true }), // Times help was used
    
    // Context tracking
    buildField('first_encountered_in', 'text', false, { max: 100 }), // Topic or lesson ID
    buildField('first_encountered_at', 'date', false),
    buildField('last_encountered_in', 'text', false, { max: 100 }), // Topic or lesson ID
    buildField('last_encountered_at', 'date', false),
    
    // Derived metrics
    buildField('confidence_score', 'number', true, { min: 0, max: 1 }), // Float: 0-1
  ],
  rules: {
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },
  indexes: [
    'CREATE INDEX idx_user_status ON user_chunks (status)',
    'CREATE INDEX idx_user_review ON user_chunks (next_review_date)',
  ],
};

/**
 * Learner Profiles - Aggregated learner data
 * 
 * The "brain" of personalization.
 * Tracks level, interests, confidence, engagement, and affective filter risk.
 * 
 * API Rules:
 * - Read: Owner only
 * - Write: Owner only (via API, not direct user input)
 */
const learnerProfilesCollection = {
  name: 'learner_profiles',
  type: 'base',
  fields: [
    // Relation
    buildField('user', 'relation', true, { collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 }),
    
    // Language context
    buildField('native_language', 'text', true, { min: 2, max: 5 }),
    buildField('target_language', 'text', true, { min: 2, max: 5 }),
    
    // Level tracking
    buildField('current_level', 'number', true, { min: 0, max: 100, noDecimal: true }), // 0-100, CEFR-mapped
    buildField('level_history', 'json', false), // Array of {date, value}
    
    // Chunk statistics
    buildField('total_chunks_encountered', 'number', true, { min: 0, noDecimal: true }),
    buildField('chunks_acquired', 'number', true, { min: 0, noDecimal: true }),
    buildField('chunks_learning', 'number', true, { min: 0, noDecimal: true }),
    buildField('chunks_fragile', 'number', true, { min: 0, noDecimal: true }),
    
    // Interests
    buildField('explicit_interests', 'json', false), // Array of strings (from onboarding)
    buildField('detected_interests', 'json', false), // Array of {topic, strength, detectedAt}
    
    // Confidence tracking
    buildField('average_confidence', 'number', true, { min: 0, max: 1 }), // Float: 0-1
    buildField('confidence_history', 'json', false), // Array of {date, value}
    
    // Engagement signals
    buildField('total_sessions', 'number', true, { min: 0, noDecimal: true }),
    buildField('total_time_minutes', 'number', true, { min: 0, noDecimal: true }),
    buildField('average_session_length', 'number', true, { min: 0, noDecimal: true }),
    buildField('help_request_rate', 'number', true, { min: 0, max: 1 }), // Float: 0-1
    buildField('wrong_answer_rate', 'number', true, { min: 0, max: 1 }), // Float: 0-1
    
    // Preferences (learned over time)
    buildField('preferred_activity_types', 'json', false), // Array of strings
    buildField('preferred_session_length', 'number', true, { min: 0, noDecimal: true }), // Minutes
    
    // Coaching state
    buildField('last_reflection_prompt', 'text', false, { max: 500 }),
    buildField('coaching_notes', 'text', false, { max: 2000 }), // AI observations
    
    // Affective filter indicators
    buildField('filter_risk_score', 'number', true, { min: 0, max: 1 }), // Float: 0-1, higher = disengaged
    buildField('last_struggle_date', 'date', false),
  ],
  rules: {
    listRule: '@request.auth.id != "" && user = @request.auth.id',
    viewRule: '@request.auth.id != "" && user = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  },
  indexes: [
    'CREATE UNIQUE INDEX idx_learner_user ON learner_profiles (user)',
    'CREATE INDEX idx_learner_language ON learner_profiles (target_language)',
  ],
};

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
 * Create a new collection with fields
 */
async function createCollection(pb, collectionDef) {
  console.log(`📦 Creating collection: ${collectionDef.name}`);
  
  if (await collectionExists(pb, collectionDef.name)) {
    console.log(`   ⚠️  Collection "${collectionDef.name}" already exists, skipping creation...`);
    return await pb.collections.getOne(collectionDef.name);
  }
  
  try {
    // Create without indexes first (relations need to be resolved)
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
      
      // Handle self-referential relations (like topics → parent_topic)
      if (field.collectionId === collectionDef.name) {
        // Will be resolved in a second pass
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
    
    const resolvedFields = [];
    for (const field of collection.fields) {
      if (field.type === 'relation' && field.collectionId) {
        // Skip users collection (already correct)
        if (field.collectionId === '_pb_users_auth_') {
          resolvedFields.push(field);
          continue;
        }
        
        // Check if collectionId looks like a name (not an ID)
        // PocketBase IDs are 15 chars, names are usually different
        const isName = field.collectionId.length < 15 || !/^[a-z0-9]{15}$/i.test(field.collectionId);
        
        if (isName) {
          try {
            const targetCol = await pb.collections.getOne(field.collectionId);
            if (targetCol.id !== field.collectionId) {
              resolvedFields.push({ ...field, collectionId: targetCol.id });
              needsUpdate = true;
              console.log(`   ✓ Resolved ${field.name}: ${field.collectionId} → ${targetCol.id}`);
            } else {
              resolvedFields.push(field);
            }
          } catch (err) {
            console.log(`   ⚠️  Could not resolve ${field.name}: ${field.collectionId}`);
            resolvedFields.push(field);
          }
        } else {
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

/**
 * Add relation fields to collections after they exist
 * This is needed because relations require target collections to exist first
 */
async function addRelationFields(pb) {
  console.log('📌 Adding relation fields to collections...');
  
  // Get collection IDs
  const collections = {
    topics: null,
    chunk_library: null,
    user_chunks: null,
    users: '_pb_users_auth_',
  };
  
  try {
    collections.topics = await pb.collections.getOne('topics');
    console.log(`   ✓ Found topics: ${collections.topics.id}`);
  } catch {
    console.log('   ⚠️  topics collection not found');
  }
  
  try {
    collections.chunk_library = await pb.collections.getOne('chunk_library');
    console.log(`   ✓ Found chunk_library: ${collections.chunk_library.id}`);
  } catch {
    console.log('   ⚠️  chunk_library collection not found');
  }
  
  try {
    collections.user_chunks = await pb.collections.getOne('user_chunks');
    console.log(`   ✓ Found user_chunks: ${collections.user_chunks.id}`);
  } catch {
    console.log('   ⚠️  user_chunks collection not found');
  }
  
  // Add parent_topic relation to topics (self-referential)
  if (collections.topics) {
    console.log('   Adding parent_topic to topics...');
    try {
      const topicFields = [...collections.topics.fields];
      // Check if parent_topic already exists
      if (!topicFields.find(f => f.name === 'parent_topic')) {
        topicFields.push({
          ...buildField('parent_topic', 'relation', false, { 
            collectionId: collections.topics.id, 
            cascadeDelete: false, 
            maxSelect: 1 
          }),
        });
        await pb.collections.update(collections.topics.id, { fields: topicFields });
        console.log('   ✅ Added parent_topic relation to topics');
      } else {
        console.log('   ✓ parent_topic already exists in topics');
      }
    } catch (error) {
      console.error('   ❌ Error adding parent_topic:', error.message);
    }
  }
  
  // Add topics relation to chunk_library
  if (collections.chunk_library && collections.topics) {
    console.log('   Adding topics relation to chunk_library...');
    try {
      const chunkFields = [...collections.chunk_library.fields];
      if (!chunkFields.find(f => f.name === 'topics')) {
        chunkFields.push({
          ...buildField('topics', 'relation', false, { 
            collectionId: collections.topics.id, 
            cascadeDelete: false, 
            maxSelect: null // Many-to-many
          }),
        });
        await pb.collections.update(collections.chunk_library.id, { fields: chunkFields });
        console.log('   ✅ Added topics relation to chunk_library');
      } else {
        console.log('   ✓ topics already exists in chunk_library');
      }
    } catch (error) {
      console.error('   ❌ Error adding topics:', error.message);
    }
  }
  
  // Add user and chunk relations to user_chunks
  if (collections.user_chunks) {
    console.log('   Adding relations to user_chunks...');
    try {
      const userChunkFields = [...collections.user_chunks.fields];
      let updated = false;
      
      // Add user relation
      if (!userChunkFields.find(f => f.name === 'user')) {
        userChunkFields.unshift({
          ...buildField('user', 'relation', true, { 
            collectionId: '_pb_users_auth_', 
            cascadeDelete: true, 
            maxSelect: 1 
          }),
        });
        updated = true;
        console.log('   ✓ Added user relation');
      }
      
      // Add chunk relation
      if (!userChunkFields.find(f => f.name === 'chunk') && collections.chunk_library) {
        userChunkFields.splice(1, 0, {
          ...buildField('chunk', 'relation', true, { 
            collectionId: collections.chunk_library.id, 
            cascadeDelete: false, 
            maxSelect: 1 
          }),
        });
        updated = true;
        console.log('   ✓ Added chunk relation');
      }
      
      if (updated) {
        await pb.collections.update(collections.user_chunks.id, { fields: userChunkFields });
        console.log('   ✅ Added relations to user_chunks');
      } else {
        console.log('   ✓ user_chunks relations already exist');
      }
      
      // Add unique index for user+chunk
      console.log('   Adding unique index for user+chunk...');
      try {
        await pb.collections.update(collections.user_chunks.id, {
          indexes: [
            ...collections.user_chunks.indexes || [],
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_chunk ON user_chunks (user, chunk)',
          ],
        });
        console.log('   ✅ Added unique index');
      } catch (idxErr) {
        console.log('   ⚠️  Index may already exist:', idxErr.message);
      }
      
    } catch (error) {
      console.error('   ❌ Error adding user_chunks relations:', error.message);
    }
  }
  
  // Add parent_topic index to topics
  if (collections.topics) {
    try {
      const currentIndexes = collections.topics.indexes || [];
      if (!currentIndexes.find(idx => idx.includes('parent_topic'))) {
        await pb.collections.update(collections.topics.id, {
          indexes: [
            ...currentIndexes,
            'CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics (parent_topic)',
          ],
        });
        console.log('   ✅ Added parent_topic index to topics');
      }
    } catch (error) {
      console.log('   ⚠️  Could not add index:', error.message);
    }
  }
}

// ============================================
// MAIN MIGRATION
// ============================================

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🧠 LingoFriends Pedagogy Schema Migration');
  console.log('═══════════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Admin: ${PB_ADMIN_EMAIL}`);
  console.log('');
  
  // Authenticate
  if (!await authenticate(pb)) {
    process.exit(1);
  }
  console.log('');
  
  // ============================================
  // STEP 1: Create new collections (in order for dependencies)
  // ============================================
  console.log('📋 Step 1: Creating new collections...');
  console.log('───────────────────────────────────────');
  
  // Create in order: topics first (chunk_library depends on it)
  const newCollections = [
    topicsCollection,
    chunkLibraryCollection,
    userChunksCollection,
    learnerProfilesCollection,
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
  // STEP 4: Add relation fields (now collections exist)
  // ============================================
  console.log('📋 Step 4: Adding relation fields...');
  console.log('───────────────────────────────────────');
  
  await addRelationFields(pb);
  
  console.log('');
  
  // ============================================
  // DONE
  // ============================================
  console.log('═══════════════════════════════════════════');
  console.log('🎉 Pedagogy schema migration complete!');
  console.log('');
  console.log('New collections created:');
  console.log('   ✅ topics - Thematic organization for chunks');
  console.log('   ✅ chunk_library - Master library of lexical chunks');
  console.log('   ✅ user_chunks - Per-user progress (SRS data)');
  console.log('   ✅ learner_profiles - Aggregated learner data');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify collections in Pocketbase Admin UI');
  console.log(`   ${PB_URL}/_/`);
  console.log('2. Run chunk seeding script (Task 1.2.3)');
  console.log('3. Implement learner profile service (Task 1.2.4)');
  console.log('');
}

runMigration().catch(console.error);