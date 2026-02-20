/**
 * Import Schema Fix: Use the imports API
 * Hosted PocketBase may have caching or different behavior
 * 
 * Run with: node scripts/import-schema-fix.mjs
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Import Schema Fix');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 Connecting to ${POCKETBASE_URL}`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Login
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Logged in as admin');
  
  const token = pb.authStore.token;
  
  // Get current collections
  const collections = await pb.collections.getFullList();
  const learnerProfiles = collections.find(c => c.name === 'learner_profiles');
  const chunkLibrary = collections.find(c => c.name === 'chunk_library');
  const userChunks = collections.find(c => c.name === 'user_chunks');
  const topics = collections.find(c => c.name === 'topics');
  const users = collections.find(c => c.name === 'users');
  
  const usersId = users?.id || '_pb_users_auth_';
  
  console.log(`\n📋 learner_profiles ID: ${learnerProfiles.id}`);
  console.log(`📋 chunk_library ID: ${chunkLibrary.id}`);
  console.log(`📋 user_chunks ID: ${userChunks.id}`);
  console.log(`📋 topics ID: ${topics.id}`);
  
  // Define the full collections with proper schema
  const collectionsToImport = [
    {
      name: 'learner_profiles',
      type: 'base',
      schema: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          options: {
            collectionId: usersId,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1
          }
        },
        {
          name: 'native_language',
          type: 'text',
          required: true,
          options: {}
        },
        {
          name: 'target_language',
          type: 'text',
          required: true,
          options: {}
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
        { name: 'last_struggle_date', type: 'text', required: false, options: {} }
      ],
      listRule: '@request.auth.id = user',
      viewRule: '@request.auth.id = user',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id = user',
      deleteRule: '@request.auth.id = user'
    },
    {
      name: 'chunk_library',
      type: 'base',
      schema: [
        { name: 'text', type: 'text', required: true, options: {} },
        { name: 'translation', type: 'text', required: true, options: {} },
        {
          name: 'chunk_type',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['polyword', 'collocation', 'utterance', 'frame', 'sentence']
          }
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
        { name: 'audio_url', type: 'text', required: false, options: {} }
      ],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""'
    },
    {
      name: 'user_chunks',
      type: 'base',
      schema: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          options: {
            collectionId: usersId,
            cascadeDelete: true,
            minSelect: null,
            maxSelect: 1
          }
        },
        {
          name: 'chunk',
          type: 'relation',
          required: true,
          options: {
            collectionId: chunkLibrary.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1
          }
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: {
            maxSelect: 1,
            values: ['new', 'learning', 'acquired', 'fragile']
          }
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
        { name: 'confidence_score', type: 'number', required: false, options: {} }
      ],
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id'
    },
    {
      name: 'topics',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true, options: {} },
        { name: 'icon', type: 'text', required: false, options: {} },
        { name: 'description', type: 'text', required: false, options: {} },
        {
          name: 'parent_topic',
          type: 'relation',
          required: false,
          options: {
            collectionId: topics.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1
          }
        },
        { name: 'target_language', type: 'text', required: true, options: {} },
        { name: 'difficulty_range', type: 'text', required: false, options: {} },
        { name: 'tags', type: 'json', required: false, options: {} },
        { name: 'chunk_count', type: 'number', required: false, options: {} }
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: ''
    }
  ];
  
  // Try the collections import endpoint
  console.log('\n\n🔧 Attempting to sync collections via SDK...');
  
  for (const colData of collectionsToImport) {
    console.log(`\n📦 Processing ${colData.name}...`);
    
    try {
      // Use SDK to update
      const existingCol = collections.find(c => c.name === colData.name);
      
      if (existingCol) {
        const result = await pb.collections.update(existingCol.id, colData);
        console.log(`  ✅ Updated via SDK`);
        console.log(`     Schema fields in result: ${result?.schema?.length || 'undefined'}`);
      }
    } catch (error) {
      console.log(`  ❌ SDK update failed: ${error.message}`);
      
      // Try raw fetch
      console.log(`  🔄 Trying raw PATCH...`);
      const existingCol = collections.find(c => c.name === colData.name);
      
      const response = await fetch(`${POCKETBASE_URL}/api/collections/${existingCol.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(colData)
      });
      
      const result = await response.json();
      console.log(`     Status: ${response.status}`);
      console.log(`     Schema fields: ${result?.schema?.length || 'undefined'}`);
    }
  }
  
  // Now let's check if we can access the actual schema
  console.log('\n\n📋 Checking stored schema via /api/collections/importhash...');
  
  // Try to get the actual stored data
  const checkResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
    headers: { 'Authorization': token }
  });
  const checkData = await checkResponse.json();
  
  const lp = checkData.find(c => c.name === 'learner_profiles');
  console.log(`\nlearner_profiles after update:`);
  console.log(`  Schema fields: ${lp?.schema?.length || 0}`);
  
  // Test record creation
  console.log('\n\n🧪 Testing record creation...');
  try {
    const userList = await pb.collection('users').getList(1, 1);
    const testUserId = userList.items[0]?.id;
    
    if (testUserId) {
      // Delete any existing profile for this user
      try {
        const existing = await pb.collection('learner_profiles').getFirstListItem(`user = "${testUserId}"`);
        await pb.collection('learner_profiles').delete(existing.id);
        console.log('  Deleted existing profile');
      } catch (e) {
        // No existing profile
      }
      
      await pb.collection('learner_profiles').create({
        user: testUserId,
        native_language: 'English',
        target_language: 'Spanish'
      });
      console.log('✅ Test record created successfully!');
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.data?.data) {
      console.log('Validation errors:');
      for (const [field, err] of Object.entries(error.data.data)) {
        console.log(`  - ${field}: ${err.message}`);
      }
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  Done!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);