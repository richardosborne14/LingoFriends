/**
 * SDK-based fix with proper auth header
 * 
 * Run with: node scripts/impersonate-fix.mjs
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SDK Schema Fix with Debug');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 Connecting to ${POCKETBASE_URL}`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Login
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Logged in as admin');
  console.log(`   Token: ${pb.authStore.token?.substring(0, 20)}...`);
  
  // Get collections using SDK
  const collections = await pb.collections.getFullList();
  const learnerProfiles = collections.find(c => c.name === 'learner_profiles');
  const chunkLibrary = collections.find(c => c.name === 'chunk_library');
  const userChunks = collections.find(c => c.name === 'user_chunks');
  const topics = collections.find(c => c.name === 'topics');
  const users = collections.find(c => c.name === 'users');
  
  const usersId = users?.id || '_pb_users_auth_';
  
  console.log(`\n📋 Users collection ID: ${usersId}`);
  console.log(`📋 learner_profiles ID: ${learnerProfiles.id}`);
  
  // Now let's try using the admin token with direct fetch
  const token = pb.authStore.token;
  
  // First, let's see what's ACTUALLY in the collection via raw fetch
  console.log('\n\n📋 Fetching raw collection data...');
  const rawResponse = await fetch(`${POCKETBASE_URL}/api/collections/${learnerProfiles.id}`, {
    headers: {
      'Authorization': token
    }
  });
  
  const rawData = await rawResponse.json();
  console.log(`Raw schema length: ${rawData.schema?.length || 0}`);
  
  if (rawData.schema?.length) {
    console.log('\nCurrent schema fields:');
    rawData.schema.forEach(f => {
      console.log(`  - ${f.name} (${f.type}) required=${f.required}`);
      if (f.type === 'text' && f.options?.max) {
        console.log(`    ⚠️ MAX LENGTH: ${f.options.max}`);
      }
    });
  }
  
  // Now update via raw fetch with admin token
  console.log('\n\n🔧 Updating via raw fetch...');
  
  const newSchema = [
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
  
  const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${learnerProfiles.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schema: newSchema
    })
  });
  
  console.log(`Update response status: ${updateResponse.status}`);
  const updateResult = await updateResponse.json();
  
  if (!updateResponse.ok) {
    console.log('❌ Update failed');
    console.log(JSON.stringify(updateResult, null, 2));
  } else {
    console.log('✅ Update succeeded');
    console.log(`New schema length: ${updateResult.schema?.length || 0}`);
  }
  
  // Verify
  console.log('\n\n📋 Verifying...');
  const verifyResponse = await fetch(`${POCKETBASE_URL}/api/collections/${learnerProfiles.id}`, {
    headers: { 'Authorization': token }
  });
  const verifyData = await verifyResponse.json();
  console.log(`Verified schema length: ${verifyData.schema?.length || 0}`);
  
  if (verifyData.schema?.length) {
    console.log('\nVerified schema fields:');
    verifyData.schema.forEach(f => {
      console.log(`  - ${f.name} (${f.type}) required=${f.required}`);
    });
  }
  
  // Test creating a record
  console.log('\n\n🧪 Testing record creation...');
  try {
    // First get a real user ID
    const userList = await pb.collection('users').getList(1, 1);
    const testUserId = userList.items[0]?.id;
    
    if (testUserId) {
      await pb.collection('learner_profiles').create({
        user: testUserId,
        native_language: 'English',
        target_language: 'Spanish'
      });
      console.log('✅ Test record created successfully!');
    } else {
      console.log('⚠️ No users found to test with');
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