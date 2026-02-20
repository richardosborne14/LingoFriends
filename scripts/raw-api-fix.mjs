/**
 * Raw API Fix: Use fetch directly to fix schema
 * The PocketBase SDK isn't returning schema properly
 * 
 * Run with: node scripts/raw-api-fix.mjs
 */

import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Raw API Schema Fix');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 Connecting to ${POCKETBASE_URL}`);
  
  // Step 1: Login as superuser to get token (PocketBase 0.23+ uses superusers)
  // Try superusers endpoint first, then fall back to admins
  let authResponse = await fetch(`${POCKETBASE_URL}/api/superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  
  // Fall back to old admins endpoint for older PocketBase versions
  if (!authResponse.ok) {
    authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
  }
  
  if (!authResponse.ok) {
    const error = await authResponse.json();
    throw new Error(`Auth failed: ${error.message}`);
  }
  
  const authData = await authResponse.json();
  const token = authData.token;
  console.log('✅ Logged in as admin');
  
  // Step 2: Get all collections
  const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
    headers: { Authorization: token }
  });
  
  const collections = await collectionsResponse.json();
  console.log(`📋 Found ${collections.length} collections`);
  
  // Find our target collections
  const learnerProfiles = collections.find(c => c.name === 'learner_profiles');
  const chunkLibrary = collections.find(c => c.name === 'chunk_library');
  const userChunks = collections.find(c => c.name === 'user_chunks');
  const topics = collections.find(c => c.name === 'topics');
  const users = collections.find(c => c.name === 'users');
  
  const usersId = users?.id || '_pb_users_auth_';
  
  console.log('\n\n📋 Current collection states:');
  for (const col of [learnerProfiles, chunkLibrary, userChunks, topics]) {
    if (!col) continue;
    console.log(`\n${col.name}:`);
    console.log(`  ID: ${col.id}`);
    console.log(`  Schema fields: ${col.schema?.length || 0}`);
    if (col.schema?.length) {
      col.schema.forEach(f => {
        console.log(`    - ${f.name} (${f.type})${f.required ? ' *' : ''}`);
        if (f.options && Object.keys(f.options).length > 0) {
          console.log(`      Options: ${JSON.stringify(f.options)}`);
        }
      });
    }
  }
  
  // Step 3: Update learner_profiles with correct schema
  console.log('\n\n🔧 Updating learner_profiles...');
  
  const learnerProfileSchema = [
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
    {
      name: 'current_level',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'level_history',
      type: 'json',
      required: false,
      options: {}
    },
    {
      name: 'total_chunks_encountered',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'chunks_acquired',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'chunks_learning',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'chunks_fragile',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'explicit_interests',
      type: 'json',
      required: false,
      options: {}
    },
    {
      name: 'detected_interests',
      type: 'json',
      required: false,
      options: {}
    },
    {
      name: 'average_confidence',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'confidence_history',
      type: 'json',
      required: false,
      options: {}
    },
    {
      name: 'total_sessions',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'total_time_minutes',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'average_session_length',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'help_request_rate',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'wrong_answer_rate',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'preferred_activity_types',
      type: 'json',
      required: false,
      options: {}
    },
    {
      name: 'preferred_session_length',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'last_reflection_prompt',
      type: 'text',
      required: false,
      options: {}
    },
    {
      name: 'coaching_notes',
      type: 'text',
      required: false,
      options: {}
    },
    {
      name: 'filter_risk_score',
      type: 'number',
      required: false,
      options: {}
    },
    {
      name: 'last_struggle_date',
      type: 'text',
      required: false,
      options: {}
    }
  ];
  
  // Update via raw API
  const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${learnerProfiles.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schema: learnerProfileSchema
    })
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    console.log('❌ Update failed:', JSON.stringify(error, null, 2));
  } else {
    const result = await updateResponse.json();
    console.log('✅ Updated learner_profiles');
    console.log(`   Schema fields: ${result.schema?.length || 0}`);
  }
  
  // Update chunk_library
  console.log('\n🔧 Updating chunk_library...');
  
  const chunkLibrarySchema = [
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
  ];
  
  const chunkResponse = await fetch(`${POCKETBASE_URL}/api/collections/${chunkLibrary.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schema: chunkLibrarySchema
    })
  });
  
  if (!chunkResponse.ok) {
    const error = await chunkResponse.json();
    console.log('❌ Update failed:', JSON.stringify(error, null, 2));
  } else {
    const result = await chunkResponse.json();
    console.log('✅ Updated chunk_library');
    console.log(`   Schema fields: ${result.schema?.length || 0}`);
  }
  
  // Update user_chunks
  console.log('\n🔧 Updating user_chunks...');
  
  const userChunksSchema = [
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
  ];
  
  const userChunksResponse = await fetch(`${POCKETBASE_URL}/api/collections/${userChunks.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schema: userChunksSchema
    })
  });
  
  if (!userChunksResponse.ok) {
    const error = await userChunksResponse.json();
    console.log('❌ Update failed:', JSON.stringify(error, null, 2));
  } else {
    const result = await userChunksResponse.json();
    console.log('✅ Updated user_chunks');
    console.log(`   Schema fields: ${result.schema?.length || 0}`);
  }
  
  // Update topics
  console.log('\n🔧 Updating topics...');
  
  const topicsSchema = [
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
  ];
  
  const topicsResponse = await fetch(`${POCKETBASE_URL}/api/collections/${topics.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schema: topicsSchema
    })
  });
  
  if (!topicsResponse.ok) {
    const error = await topicsResponse.json();
    console.log('❌ Update failed:', JSON.stringify(error, null, 2));
  } else {
    const result = await topicsResponse.json();
    console.log('✅ Updated topics');
    console.log(`   Schema fields: ${result.schema?.length || 0}`);
  }
  
  // Verify the updates
  console.log('\n\n📋 Verifying updates...');
  
  const verifyResponse = await fetch(`${POCKETBASE_URL}/api/collections/${learnerProfiles.id}`, {
    headers: { Authorization: token }
  });
  const verifyData = await verifyResponse.json();
  console.log(`\nlearner_profiles schema: ${verifyData.schema?.length || 0} fields`);
  if (verifyData.schema?.length) {
    verifyData.schema.forEach(f => console.log(`  - ${f.name} (${f.type})${f.required ? ' *' : ''}`));
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  Raw API fix complete!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);