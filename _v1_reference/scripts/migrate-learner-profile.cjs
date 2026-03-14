/**
 * Migration: Create learner_profiles collection
 * 
 * This script creates the learner_profiles collection in Pocketbase
 * for storing learner progress data in Phase 1.2.
 * 
 * Run with: node scripts/migrate-learner-profile.cjs
 * 
 * @see docs/phase-1.2/task-1.2-1-learner-model-schema.md
 * @see src/types/pocketbase.ts for type definitions
 */

const PocketBase = require('pocketbase');

// Configuration
const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

// Collection schema
const LEARNER_PROFILES_SCHEMA = {
  name: 'learner_profiles',
  type: 'base',
  schema: [
    // User relation
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: {
        collectionId: 'users', // Will be resolved to actual ID
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1,
      },
    },
    
    // Languages
    {
      name: 'native_language',
      type: 'text',
      required: true,
    },
    {
      name: 'target_language',
      type: 'text',
      required: true,
    },
    
    // Level tracking
    {
      name: 'current_level',
      type: 'number',
      required: true,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'level_history',
      type: 'json',
      required: false,
    },
    
    // Chunk statistics
    {
      name: 'total_chunks_encountered',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'chunks_acquired',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'chunks_learning',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'chunks_fragile',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    
    // Interests
    {
      name: 'explicit_interests',
      type: 'json',
      required: false,
    },
    {
      name: 'detected_interests',
      type: 'json',
      required: false,
    },
    
    // Confidence
    {
      name: 'average_confidence',
      type: 'number',
      required: true,
      options: {
        min: 0,
        max: 1,
      },
    },
    {
      name: 'confidence_history',
      type: 'json',
      required: false,
    },
    
    // Engagement
    {
      name: 'total_sessions',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'total_time_minutes',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'average_session_length',
      type: 'number',
      required: true,
      options: {
        min: 0,
      },
    },
    {
      name: 'help_request_rate',
      type: 'number',
      required: true,
      options: {
        min: 0,
        max: 1,
      },
    },
    {
      name: 'wrong_answer_rate',
      type: 'number',
      required: true,
      options: {
        min: 0,
        max: 1,
      },
    },
    
    // Preferences
    {
      name: 'preferred_activity_types',
      type: 'json',
      required: false,
    },
    {
      name: 'preferred_session_length',
      type: 'number',
      required: true,
      options: {
        min: 1,
        max: 120,
      },
    },
    
    // Coaching
    {
      name: 'last_reflection_prompt',
      type: 'text',
      required: false,
    },
    {
      name: 'coaching_notes',
      type: 'text',
      required: false,
    },
    
    // Affective filter
    {
      name: 'filter_risk_score',
      type: 'number',
      required: true,
      options: {
        min: 0,
        max: 1,
      },
    },
    {
      name: 'last_struggle_date',
      type: 'date',
      required: false,
    },
  ],
  
  // API rules - owner only access
  listRule: '@request.auth.id != "" && user = @request.auth.id',
  viewRule: '@request.auth.id != "" && user = @request.auth.id',
  createRule: '@request.auth.id != "" && user = @request.auth.id',
  updateRule: '@request.auth.id != "" && user = @request.auth.id',
  deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  
  // Indexes for common queries
  indexes: [
    'CREATE INDEX idx_learner_profiles_user ON learner_profiles (user)',
    'CREATE INDEX idx_learner_profiles_level ON learner_profiles (current_level)',
  ],
};

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting learner_profiles migration...\n');
  
  if (!PB_PASSWORD) {
    console.error('❌ Error: PB_ADMIN_PASSWORD environment variable is required');
    console.log('\nUsage:');
    console.log('  PB_ADMIN_PASSWORD=your_password node scripts/migrate-learner-profile.cjs');
    process.exit(1);
  }
  
  const pb = new PocketBase(PB_URL);
  
  try {
    // Authenticate as admin
    console.log('📡 Authenticating with Pocketbase...');
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
    console.log('✅ Authenticated successfully\n');
    
    // Check if collection already exists
    console.log('🔍 Checking for existing collection...');
    const existingCollections = await pb.collections.getFullList();
    const existing = existingCollections.find(c => c.name === 'learner_profiles');
    
    if (existing) {
      console.log('⚠️  Collection "learner_profiles" already exists');
      console.log('   Updating collection schema...\n');
      
      // Update existing collection
      await pb.collections.update(existing.id, {
        schema: LEARNER_PROFILES_SCHEMA.schema,
        listRule: LEARNER_PROFILES_SCHEMA.listRule,
        viewRule: LEARNER_PROFILES_SCHEMA.viewRule,
        createRule: LEARNER_PROFILES_SCHEMA.createRule,
        updateRule: LEARNER_PROFILES_SCHEMA.updateRule,
        deleteRule: LEARNER_PROFILES_SCHEMA.deleteRule,
      });
      
      console.log('✅ Collection updated successfully!\n');
    } else {
      console.log('📝 Creating new collection...\n');
      
      // Get users collection ID for relation
      const usersCollection = existingCollections.find(c => c.name === 'users');
      if (!usersCollection) {
        throw new Error('Users collection not found. Please create it first.');
      }
      
      // Update user relation to use actual users collection ID
      const schema = LEARNER_PROFILES_SCHEMA.schema.map(field => {
        if (field.name === 'user') {
          return {
            ...field,
            options: {
              ...field.options,
              collectionId: usersCollection.id,
            },
          };
        }
        return field;
      });
      
      // Create collection
      await pb.collections.create({
        name: LEARNER_PROFILES_SCHEMA.name,
        type: LEARNER_PROFILES_SCHEMA.type,
        schema: schema,
        listRule: LEARNER_PROFILES_SCHEMA.listRule,
        viewRule: LEARNER_PROFILES_SCHEMA.viewRule,
        createRule: LEARNER_PROFILES_SCHEMA.createRule,
        updateRule: LEARNER_PROFILES_SCHEMA.updateRule,
        deleteRule: LEARNER_PROFILES_SCHEMA.deleteRule,
      });
      
      console.log('✅ Collection created successfully!\n');
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('\nCollection details:');
    console.log('  - Name: learner_profiles');
    console.log('  - Access: Owner only (authenticated user can only access their own profile)');
    console.log('  - Fields: 25 fields for learner progress tracking');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.data) {
      console.error('\nDetails:', JSON.stringify(error.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Run migration
migrate();