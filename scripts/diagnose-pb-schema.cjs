/**
 * LingoFriends - PocketBase Schema Diagnostic Script
 * 
 * This script audits the PocketBase collections used by the pedagogy engine
 * and identifies schema mismatches that cause 400 errors.
 * 
 * Usage: node scripts/diagnose-pb-schema.cjs
 * 
 * @module diagnose-pb-schema
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

// ============================================
// CONFIGURATION
// ============================================

const PB_URL = process.env.VITE_POCKETBASE_URL;
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

// Expected schemas based on src/types/pocketbase.ts
const EXPECTED_SCHEMAS = {
  learner_profiles: {
    required: [
      'user',
      'native_language',
      'target_language',
      'current_level',
      'total_chunks_encountered',
      'chunks_acquired',
      'chunks_learning',
      'chunks_fragile',
      'average_confidence',
      'total_sessions',
      'total_time_minutes',
      'average_session_length',
      'help_request_rate',
      'wrong_answer_rate',
      'preferred_session_length',
      'filter_risk_score',
    ],
    optional: [
      'level_history',
      'explicit_interests',
      'detected_interests',
      'confidence_history',
      'preferred_activity_types',
      'last_reflection_prompt',
      'coaching_notes',
      'last_struggle_date',
    ],
    types: {
      user: 'relation',
      native_language: 'text',
      target_language: 'text',
      current_level: 'number',
      total_chunks_encountered: 'number',
      chunks_acquired: 'number',
      chunks_learning: 'number',
      chunks_fragile: 'number',
      average_confidence: 'number',
      total_sessions: 'number',
      total_time_minutes: 'number',
      average_session_length: 'number',
      help_request_rate: 'number',
      wrong_answer_rate: 'number',
      preferred_session_length: 'number',
      filter_risk_score: 'number',
      explicit_interests: 'json',
      detected_interests: 'json',
      level_history: 'json',
      confidence_history: 'json',
      preferred_activity_types: 'json',
      last_reflection_prompt: 'text',
      coaching_notes: 'text',
      last_struggle_date: 'text',
    },
  },
  chunk_library: {
    required: [
      'text',
      'translation',
      'chunk_type',
      'target_language',
      'native_language',
      'difficulty',
      'topics',
      'frequency',
      'base_interval',
      'age_appropriate',
    ],
    optional: [
      'slots',
      'notes',
      'cultural_context',
      'audio_url',
    ],
    types: {
      text: 'text',
      translation: 'text',
      chunk_type: 'select',
      target_language: 'text',
      native_language: 'text',
      slots: 'json',
      difficulty: 'number',
      topics: 'json',
      frequency: 'number',
      base_interval: 'number',
      notes: 'text',
      cultural_context: 'text',
      age_appropriate: 'json',
      audio_url: 'text',
    },
  },
  user_chunks: {
    required: [
      'user',
      'chunk',
      'status',
      'ease_factor',
      'interval',
      'next_review_date',
      'repetitions',
      'total_encounters',
      'correct_first_try',
      'wrong_attempts',
      'help_used_count',
      'confidence_score',
    ],
    optional: [
      'first_encountered_in',
      'first_encountered_at',
      'last_encountered_in',
      'last_encountered_at',
    ],
    types: {
      user: 'relation',
      chunk: 'relation',
      status: 'select',
      ease_factor: 'number',
      interval: 'number',
      next_review_date: 'text',
      repetitions: 'number',
      total_encounters: 'number',
      correct_first_try: 'number',
      wrong_attempts: 'number',
      help_used_count: 'number',
      first_encountered_in: 'text',
      first_encountered_at: 'text',
      last_encountered_in: 'text',
      last_encountered_at: 'text',
      confidence_score: 'number',
    },
  },
  topics: {
    required: [
      'name',
      'icon',
      'description',
      'target_language',
      'difficulty_range',
      'tags',
      'chunk_count',
    ],
    optional: ['parent_topic'],
    types: {
      name: 'text',
      icon: 'text',
      description: 'text',
      parent_topic: 'relation',
      target_language: 'text',
      difficulty_range: 'text',
      tags: 'json',
      chunk_count: 'number',
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Authenticate with PocketBase and get admin token
 */
async function authenticate() {
  console.log('\n📋 Authenticating with PocketBase...');
  
  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PB_ADMIN_EMAIL,
      password: PB_ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('✅ Authenticated successfully');
  return data.token;
}

/**
 * Get list of all collections
 */
async function getCollections(token) {
  const response = await fetch(`${PB_URL}/api/collections`, {
    headers: {
      Authorization: token,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch collections: ${response.status}`);
  }

  return response.json();
}

/**
 * Get schema for a specific collection
 */
async function getCollectionSchema(token, collectionName) {
  const response = await fetch(`${PB_URL}/api/collections/${collectionName}`, {
    headers: {
      Authorization: token,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Try to create a test record to see what fields are missing
 */
async function testCreate(token, collectionName, testData) {
  const response = await fetch(`${PB_URL}/api/collections/${collectionName}/records`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData),
  });

  const data = await response.json();
  
  return {
    success: response.ok,
    status: response.status,
    data,
  };
}

/**
 * Try to query with filter to check filter syntax
 */
async function testQuery(token, collectionName, filter) {
  const response = await fetch(
    `${PB_URL}/api/collections/${collectionName}/records?filter=${encodeURIComponent(filter)}`,
    {
      headers: {
        Authorization: token,
      },
    }
  );

  const data = await response.json();
  
  return {
    success: response.ok,
    status: response.status,
    data,
  };
}

// ============================================
// MAIN DIAGNOSTIC
// ============================================

async function runDiagnostics() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LingoFriends PocketBase Schema Diagnostic');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 PocketBase URL: ${PB_URL}`);

  const issues = [];
  const fixes = [];

  try {
    // Step 1: Authenticate
    const token = await authenticate();

    // Step 2: Get all collections
    console.log('\n📋 Fetching collections...');
    const collections = await getCollections(token);
    const collectionNames = collections.map(c => c.name);
    console.log(`Found ${collectionNames.length} collections: ${collectionNames.join(', ')}`);

    // Step 3: Check each required collection
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  COLLECTION AUDIT');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const [collectionName, expected] of Object.entries(EXPECTED_SCHEMAS)) {
      console.log(`\n\n📁 Collection: ${collectionName}`);
      console.log('─────────────────────────────────────────────────────────────');

      // Check if collection exists
      if (!collectionNames.includes(collectionName)) {
        console.log(`❌ MISSING: Collection does not exist!`);
        issues.push({
          collection: collectionName,
          type: 'missing_collection',
          message: `Collection "${collectionName}" does not exist`,
        });
        fixes.push({
          collection: collectionName,
          action: 'create_collection',
          reason: 'Collection is required for pedagogy engine',
        });
        continue;
      }

      console.log(`✅ Collection exists`);

      // Get schema
      const schema = await getCollectionSchema(token, collectionName);
      if (!schema) {
        console.log(`❌ Could not fetch schema`);
        continue;
      }

      const existingFields = schema.schema?.map(f => f.name) || [];
      console.log(`\nExisting fields (${existingFields.length}): ${existingFields.join(', ')}`);

      // Check required fields
      console.log(`\nChecking required fields:`);
      for (const field of expected.required) {
        if (existingFields.includes(field)) {
          console.log(`  ✅ ${field}`);
        } else {
          console.log(`  ❌ ${field} - MISSING`);
          issues.push({
            collection: collectionName,
            type: 'missing_field',
            field,
            required: true,
          });
          fixes.push({
            collection: collectionName,
            action: 'add_field',
            field,
            type: expected.types[field] || 'text',
            required: true,
          });
        }
      }

      // Check optional fields
      console.log(`\nChecking optional fields:`);
      for (const field of expected.optional) {
        if (existingFields.includes(field)) {
          console.log(`  ✅ ${field}`);
        } else {
          console.log(`  ⚠️  ${field} - Missing (optional)`);
          fixes.push({
            collection: collectionName,
            action: 'add_field',
            field,
            type: expected.types[field] || 'text',
            required: false,
          });
        }
      }

      // Check field types
      console.log(`\nChecking field types:`);
      for (const fieldDef of (schema.schema || [])) {
        const expectedType = expected.types[fieldDef.name];
        if (expectedType && fieldDef.type !== expectedType) {
          console.log(`  ⚠️  ${fieldDef.name}: expected ${expectedType}, got ${fieldDef.type}`);
          issues.push({
            collection: collectionName,
            type: 'type_mismatch',
            field: fieldDef.name,
            expected: expectedType,
            actual: fieldDef.type,
          });
        }
      }
    }

    // Step 4: Test actual operations
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('  OPERATION TESTS');
    console.log('═══════════════════════════════════════════════════════════════');

    // Test learner_profiles creation
    console.log('\n\n🧪 Testing learner_profiles creation...');
    const testProfileResult = await testCreate(token, 'learner_profiles', {
      user: 'test_user_id',
      native_language: 'English',
      target_language: 'French',
      current_level: 1,
      total_chunks_encountered: 0,
      chunks_acquired: 0,
      chunks_learning: 0,
      chunks_fragile: 0,
      average_confidence: 0.5,
      total_sessions: 0,
      total_time_minutes: 0,
      average_session_length: 0,
      help_request_rate: 0,
      wrong_answer_rate: 0,
      preferred_session_length: 10,
      filter_risk_score: 0,
    });

    if (testProfileResult.success) {
      console.log('✅ Test profile created successfully');
      // Clean up
      if (testProfileResult.data?.id) {
        await fetch(`${PB_URL}/api/collections/learner_profiles/records/${testProfileResult.data.id}`, {
          method: 'DELETE',
          headers: { Authorization: token },
        });
        console.log('  🧹 Test record cleaned up');
      }
    } else {
      console.log(`❌ Failed to create test profile: ${testProfileResult.status}`);
      console.log('Error details:', JSON.stringify(testProfileResult.data, null, 2));
      issues.push({
        collection: 'learner_profiles',
        type: 'create_failed',
        status: testProfileResult.status,
        error: testProfileResult.data,
      });
    }

    // Test chunk_library creation
    console.log('\n\n🧪 Testing chunk_library creation...');
    const testChunkResult = await testCreate(token, 'chunk_library', {
      text: 'Bonjour',
      translation: 'Hello',
      chunk_type: 'polyword',
      target_language: 'French',
      native_language: 'English',
      difficulty: 1,
      topics: [],
      frequency: 1,
      base_interval: 1,
      age_appropriate: ['7-10', '11-14'],
    });

    if (testChunkResult.success) {
      console.log('✅ Test chunk created successfully');
      // Clean up
      if (testChunkResult.data?.id) {
        await fetch(`${PB_URL}/api/collections/chunk_library/records/${testChunkResult.data.id}`, {
          method: 'DELETE',
          headers: { Authorization: token },
        });
        console.log('  🧹 Test record cleaned up');
      }
    } else {
      console.log(`❌ Failed to create test chunk: ${testChunkResult.status}`);
      console.log('Error details:', JSON.stringify(testChunkResult.data, null, 2));
      issues.push({
        collection: 'chunk_library',
        type: 'create_failed',
        status: testChunkResult.status,
        error: testChunkResult.data,
      });
    }

    // Test chunk_library query with filter (this is what fails in the app)
    console.log('\n\n🧪 Testing chunk_library filter query...');
    const filterTest = await testQuery(token, 'chunk_library', 'target_language = "French" && difficulty >= 1 && difficulty <= 3');
    
    if (filterTest.success) {
      console.log('✅ Filter query works');
      console.log(`  Found ${filterTest.data.items?.length || 0} records`);
    } else {
      console.log(`❌ Filter query failed: ${filterTest.status}`);
      console.log('Error details:', JSON.stringify(filterTest.data, null, 2));
      issues.push({
        collection: 'chunk_library',
        type: 'query_failed',
        status: filterTest.status,
        error: filterTest.data,
      });
    }

    // Step 5: Summary
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('  DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');

    if (issues.length === 0) {
      console.log('\n✅ No issues found! The schema looks correct.');
    } else {
      console.log(`\n❌ Found ${issues.length} issue(s):\n`);
      
      // Group by collection
      const byCollection = {};
      for (const issue of issues) {
        if (!byCollection[issue.collection]) {
          byCollection[issue.collection] = [];
        }
        byCollection[issue.collection].push(issue);
      }

      for (const [collection, collectionIssues] of Object.entries(byCollection)) {
        console.log(`\n📁 ${collection}:`);
        for (const issue of collectionIssues) {
          if (issue.type === 'missing_collection') {
            console.log(`   ❌ Collection does not exist`);
          } else if (issue.type === 'missing_field') {
            console.log(`   ❌ Missing field: ${issue.field} ${issue.required ? '(required)' : '(optional)'}`);
          } else if (issue.type === 'type_mismatch') {
            console.log(`   ⚠️  Field ${issue.field}: expected ${issue.expected}, got ${issue.actual}`);
          } else if (issue.type === 'create_failed') {
            console.log(`   ❌ Create operation failed (${issue.status})`);
            if (issue.error?.data?.message) {
              console.log(`      Message: ${issue.error.data.message}`);
            }
          } else if (issue.type === 'query_failed') {
            console.log(`   ❌ Query failed (${issue.status})`);
            if (issue.error?.message) {
              console.log(`      Message: ${issue.error.message}`);
            }
          }
        }
      }
    }

    // Output fixes as JSON for the fix script
    if (fixes.length > 0) {
      console.log('\n\n═══════════════════════════════════════════════════════════════');
      console.log('  FIXES NEEDED (for fix script)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('\n' + JSON.stringify(fixes, null, 2));
    }

    // Write results to file
    const fs = require('fs');
    fs.writeFileSync(
      'diagnostic-results.json',
      JSON.stringify({ issues, fixes, timestamp: new Date().toISOString() }, null, 2)
    );
    console.log('\n📄 Results written to diagnostic-results.json');

  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics();