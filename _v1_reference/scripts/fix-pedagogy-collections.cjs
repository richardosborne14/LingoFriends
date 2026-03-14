/**
 * Migration Script: Fix Pedagogy Collection Permissions
 * 
 * This script fixes the API rules for:
 * - chunk_library: Allow authenticated users to read/create chunks
 * - learner_profiles: Fix validation and allow users to manage their own records
 * 
 * Run with: node scripts/fix-pedagogy-collections.cjs
 */

const PocketBase = require('pocketbase');

// Load environment variables from .env
require('dotenv').config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('[FixPedagogyCollections] Starting migration...');
  console.log(`[FixPedagogyCollections] Connecting to ${POCKETBASE_URL}`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Login as admin
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('[FixPedagogyCollections] Logged in as admin');
  } catch (error) {
    console.error('[FixPedagogyCollections] Failed to login as admin:', error.message);
    console.log('[FixPedagogyCollections] Please ensure PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD are set in .env');
    process.exit(1);
  }
  
  // Fix chunk_library collection
  await fixChunkLibrary(pb);
  
  // Fix learner_profiles collection
  await fixLearnerProfiles(pb);
  
  console.log('[FixPedagogyCollections] Migration complete!');
}

/**
 * Fix chunk_library collection permissions
 */
async function fixChunkLibrary(pb) {
  console.log('\n[FixPedagogyCollections] Checking chunk_library collection...');
  
  try {
    // Try to get the collection
    const collection = await pb.collections.getOne('chunk_library');
    console.log('[FixPedagogyCollections] Found chunk_library collection');
    
    // Update API rules to allow authenticated users to read and create
    const updatedCollection = await pb.collections.update(collection.id, {
      // API rules
      listRule: '@request.auth.id != ""',  // Authenticated users can list
      viewRule: '@request.auth.id != ""',  // Authenticated users can view
      createRule: '@request.auth.id != ""',  // Authenticated users can create
      updateRule: '@request.auth.id = user', // Only owner can update their records
      deleteRule: '@request.auth.id = user', // Only owner can delete their records
    });
    
    console.log('[FixPedagogyCollections] Updated chunk_library API rules');
    console.log('[FixPedagogyCollections] listRule:', updatedCollection.listRule);
    console.log('[FixPedagogyCollections] viewRule:', updatedCollection.viewRule);
    console.log('[FixPedagogyCollections] createRule:', updatedCollection.createRule);
    
  } catch (error) {
    if (error.status === 404) {
      console.log('[FixPedagogyCollections] chunk_library collection not found, creating...');
      
      // Create the collection
      await pb.collections.create({
        name: 'chunk_library',
        type: 'base',
        system: false,
        schema: [
          { name: 'text', type: 'text', required: true },
          { name: 'translation', type: 'text', required: true },
          { name: 'target_language', type: 'text', required: true },
          { name: 'native_language', type: 'text', required: true },
          { name: 'cefr_level', type: 'select', required: true, options: { maxSelect: 1, values: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] } },
          { name: 'internal_level', type: 'number', required: false },
          { name: 'topic', type: 'text', required: false },
          { name: 'chunk_type', type: 'select', required: true, options: { maxSelect: 1, values: ['polyword', 'collocation', 'utterance', 'sentence', 'frame'] } },
          { name: 'notes', type: 'text', required: false },
          { name: 'user', type: 'relation', required: false, options: { collectionId: '_pb_users_auth_', cascadeDelete: false, minSelect: null, maxSelect: 1 } },
        ],
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = user',
        deleteRule: '@request.auth.id = user',
      });
      
      console.log('[FixPedagogyCollections] Created chunk_library collection');
    } else {
      console.error('[FixPedagogyCollections] Error with chunk_library:', error.message);
    }
  }
}

/**
 * Fix learner_profiles collection permissions and validation
 */
async function fixLearnerProfiles(pb) {
  console.log('\n[FixPedagogyCollections] Checking learner_profiles collection...');
  
  try {
    // Try to get the collection
    const collection = await pb.collections.getOne('learner_profiles');
    console.log('[FixPedagogyCollections] Found learner_profiles collection');
    
    // Get the current schema
    const currentSchema = collection.schema || [];
    
    // Find fields that might need updating
    const schemaUpdates = currentSchema.map(field => {
      // Make onboarding_complete not required (has default)
      if (field.name === 'onboarding_complete') {
        return { ...field, required: false };
      }
      return field;
    });
    
    // Update the collection
    const updatedCollection = await pb.collections.update(collection.id, {
      schema: schemaUpdates,
      // Update API rules
      listRule: '@request.auth.id = user',
      viewRule: '@request.auth.id = user',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id = user',
      deleteRule: '@request.auth.id = user',
    });
    
    console.log('[FixPedagogyCollections] Updated learner_profiles collection');
    console.log('[FixPedagogyCollections] Schema fields:', updatedCollection.schema.map(f => `${f.name}(${f.type}${f.required ? ', required' : ''})`).join(', '));
    
  } catch (error) {
    if (error.status === 404) {
      console.log('[FixPedagogyCollections] learner_profiles collection not found, creating...');
      
      // Create the collection with proper defaults
      await pb.collections.create({
        name: 'learner_profiles',
        type: 'base',
        system: false,
        schema: [
          { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: null, maxSelect: 1 } },
          { name: 'target_language', type: 'text', required: true },
          { name: 'native_language', type: 'text', required: true },
          { name: 'current_level', type: 'number', required: false },
          { name: 'chunks_acquired', type: 'number', required: false },
          { name: 'chunks_learning', type: 'number', required: false },
          { name: 'average_confidence', type: 'number', required: false },
          { name: 'filter_risk_score', type: 'number', required: false },
          { name: 'explicit_interests', type: 'json', required: false },
          { name: 'detected_interests', type: 'json', required: false },
          { name: 'confidence_history', type: 'json', required: false },
          { name: 'total_sessions', type: 'number', required: false },
          { name: 'total_time_minutes', type: 'number', required: false },
          { name: 'age_group', type: 'select', required: false, options: { maxSelect: 1, values: ['7-10', '11-14', '15-18'] } },
          { name: 'preferred_activity_types', type: 'json', required: false },
        ],
        listRule: '@request.auth.id = user',
        viewRule: '@request.auth.id = user',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id = user',
        deleteRule: '@request.auth.id = user',
      });
      
      console.log('[FixPedagogyCollections] Created learner_profiles collection');
    } else {
      console.error('[FixPedagogyCollections] Error with learner_profiles:', error.message);
    }
  }
}

main().catch(console.error);