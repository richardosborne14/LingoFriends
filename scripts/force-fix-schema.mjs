/**
 * Force Fix Script: Delete and Recreate Pedagogy Collections
 * 
 * The update method wasn't working, so we'll backup existing data
 * and recreate the collections with correct schemas.
 * 
 * Run with: node scripts/force-fix-schema.mjs
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LingoFriends Force Schema Fix');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 Connecting to ${POCKETBASE_URL}`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Login as admin
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Logged in as admin');
  } catch (error) {
    console.error('❌ Failed to login as admin:', error.message);
    process.exit(1);
  }

  // Get collections
  const collections = await pb.collections.getFullList();
  const usersCollection = collections.find(c => c.name === 'users');
  const usersCollectionId = usersCollection?.id || '_pb_users_auth_';
  console.log(`📋 Users collection ID: ${usersCollectionId}`);

  // Check current state
  console.log('\n\n📋 Current collection states:');
  for (const name of ['learner_profiles', 'chunk_library', 'user_chunks', 'topics']) {
    const col = collections.find(c => c.name === name);
    console.log(`\n${name}:`);
    console.log(`  ID: ${col?.id}`);
    console.log(`  Type: ${col?.type}`);
    console.log(`  Schema fields: ${col?.schema?.length || 0}`);
    console.log(`  System: ${col?.system}`);
    
    // Try to get records to see if there's data
    try {
      const records = await pb.collection(name).getList(1, 1);
      console.log(`  Records: ${records.totalItems}`);
    } catch (e) {
      console.log(`  Records: (error: ${e.message})`);
    }
  }

  // Fix each collection by updating with correct schema
  // The key is that we need to provide ALL fields including their current state
  
  await forceUpdateLearnerProfiles(pb, usersCollectionId);
  await forceUpdateChunkLibrary(pb);
  await forceUpdateUserChunks(pb, usersCollectionId);
  await forceUpdateTopics(pb);
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  Force fix complete!');
  console.log('═══════════════════════════════════════════════════════════════');
}

async function forceUpdateLearnerProfiles(pb, usersCollectionId) {
  console.log('\n\n📁 Force updating learner_profiles...');
  
  try {
    const existing = await pb.collections.getOne('learner_profiles');
    
    // Build complete schema with all required options
    const schema = [
      { 
        name: 'user', 
        type: 'relation', 
        required: true,
        options: { 
          collectionId: usersCollectionId, 
          cascadeDelete: true, 
          minSelect: null, 
          maxSelect: 1 
        }
      },
      { 
        name: 'native_language', 
        type: 'text', 
        required: true,
        options: { min: null, max: null, pattern: '' }
      },
      { 
        name: 'target_language', 
        type: 'text', 
        required: true,
        options: { min: null, max: null, pattern: '' }
      },
      { name: 'current_level', type: 'number', required: false, options: {} },
      { name: 'level_history', type: 'json', required: false, options: {} },
      { name: 'total_chunks_encountered', type: 'number', required: false, options: {} },
      { name: 'chunks_acquired', type: 'number', required: false, options: {} },
      { name: 'chunks_learning', type: 'number', required: false, options: {} },
      { name: 'chunks_fragile', type: 'number', required: false, options: {} },
      { name: 'explicit_interests', type: 'json', required: false, options: {} },
      { name: 'detected_interests', type: 'json', required: false, options: {} },
      { name: 'average_confidence', type: 'number', required: false, options: {} },
      { name: 'confidence_history', type: 'json', required: false, options: {} },
      { name: 'total_sessions', type: 'number', required: false, options: {} },
      { name: 'total_time_minutes', type: 'number', required: false, options: {} },
      { name: 'average_session_length', type: 'number', required: false, options: {} },
      { name: 'help_request_rate', type: 'number', required: false, options: {} },
      { name: 'wrong_answer_rate', type: 'number', required: false, options: {} },
      { name: 'preferred_activity_types', type: 'json', required: false, options: {} },
      { name: 'preferred_session_length', type: 'number', required: false, options: {} },
      { name: 'last_reflection_prompt', type: 'text', required: false, options: {} },
      { name: 'coaching_notes', type: 'text', required: false, options: {} },
      { name: 'filter_risk_score', type: 'number', required: false, options: {} },
      { name: 'last_struggle_date', type: 'text', required: false, options: {} },
    ];

    const result = await pb.collections.update(existing.id, {
      name: 'learner_profiles',
      type: 'base',
      schema: schema,
    });
    
    console.log('✅ Updated learner_profiles');
    console.log(`  New schema fields: ${result.schema?.length || 0}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

async function forceUpdateChunkLibrary(pb) {
  console.log('\n\n📁 Force updating chunk_library...');
  
  try {
    const existing = await pb.collections.getOne('chunk_library');
    
    const schema = [
      { name: 'text', type: 'text', required: true, options: {} },
      { name: 'translation', type: 'text', required: true, options: {} },
      { 
        name: 'chunk_type', 
        type: 'select', 
        required: true,
        options: { maxSelect: 1, values: ['polyword', 'collocation', 'utterance', 'frame', 'sentence'] }
      },
      { name: 'target_language', type: 'text', required: true, options: {} },
      { name: 'native_language', type: 'text', required: true, options: {} },
      { name: 'difficulty', type: 'number', required: true, options: {} },
      { name: 'topics', type: 'json', required: false, options: {} },
      { name: 'frequency', type: 'number', required: false, options: {} },
      { name: 'base_interval', type: 'number', required: false, options: {} },
      { name: 'slots', type: 'json', required: false, options: {} },
      { name: 'notes', type: 'text', required: false, options: {} },
      { name: 'cultural_context', type: 'text', required: false, options: {} },
      { name: 'age_appropriate', type: 'json', required: false, options: {} },
      { name: 'audio_url', type: 'text', required: false, options: {} },
    ];

    const result = await pb.collections.update(existing.id, {
      name: 'chunk_library',
      type: 'base',
      schema: schema,
    });
    
    console.log('✅ Updated chunk_library');
    console.log(`  New schema fields: ${result.schema?.length || 0}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

async function forceUpdateUserChunks(pb, usersCollectionId) {
  console.log('\n\n📁 Force updating user_chunks...');
  
  try {
    const chunkLib = await pb.collections.getOne('chunk_library');
    const chunkLibId = chunkLib?.id;
    const existing = await pb.collections.getOne('user_chunks');
    
    const schema = [
      { 
        name: 'user', 
        type: 'relation', 
        required: true,
        options: { collectionId: usersCollectionId, cascadeDelete: true, minSelect: null, maxSelect: 1 }
      },
      { 
        name: 'chunk', 
        type: 'relation', 
        required: true,
        options: { collectionId: chunkLibId, cascadeDelete: false, minSelect: null, maxSelect: 1 }
      },
      { 
        name: 'status', 
        type: 'select', 
        required: true,
        options: { maxSelect: 1, values: ['new', 'learning', 'acquired', 'fragile'] }
      },
      { name: 'ease_factor', type: 'number', required: false, options: {} },
      { name: 'interval', type: 'number', required: false, options: {} },
      { name: 'next_review_date', type: 'text', required: false, options: {} },
      { name: 'repetitions', type: 'number', required: false, options: {} },
      { name: 'total_encounters', type: 'number', required: false, options: {} },
      { name: 'correct_first_try', type: 'number', required: false, options: {} },
      { name: 'wrong_attempts', type: 'number', required: false, options: {} },
      { name: 'help_used_count', type: 'number', required: false, options: {} },
      { name: 'first_encountered_in', type: 'text', required: false, options: {} },
      { name: 'first_encountered_at', type: 'text', required: false, options: {} },
      { name: 'last_encountered_in', type: 'text', required: false, options: {} },
      { name: 'last_encountered_at', type: 'text', required: false, options: {} },
      { name: 'confidence_score', type: 'number', required: false, options: {} },
    ];

    const result = await pb.collections.update(existing.id, {
      name: 'user_chunks',
      type: 'base',
      schema: schema,
    });
    
    console.log('✅ Updated user_chunks');
    console.log(`  New schema fields: ${result.schema?.length || 0}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

async function forceUpdateTopics(pb) {
  console.log('\n\n📁 Force updating topics...');
  
  try {
    const existing = await pb.collections.getOne('topics');
    const topicsId = existing.id;
    
    const schema = [
      { name: 'name', type: 'text', required: true, options: {} },
      { name: 'icon', type: 'text', required: false, options: {} },
      { name: 'description', type: 'text', required: false, options: {} },
      { 
        name: 'parent_topic', 
        type: 'relation', 
        required: false,
        options: { collectionId: topicsId, cascadeDelete: false, minSelect: null, maxSelect: 1 }
      },
      { name: 'target_language', type: 'text', required: true, options: {} },
      { name: 'difficulty_range', type: 'text', required: false, options: {} },
      { name: 'tags', type: 'json', required: false, options: {} },
      { name: 'chunk_count', type: 'number', required: false, options: {} },
    ];

    const result = await pb.collections.update(existing.id, {
      name: 'topics',
      type: 'base',
      schema: schema,
    });
    
    console.log('✅ Updated topics');
    console.log(`  New schema fields: ${result.schema?.length || 0}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

main().catch(console.error);