/**
 * LingoFriends - PocketBase Schema Diagnostic Script
 * 
 * This script audits the PocketBase collections used by the pedagogy engine
 * and identifies schema mismatches that cause 400 errors.
 * 
 * Usage: node scripts/diagnose-pb-schema.mjs
 * 
 * @module diagnose-pb-schema
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

// Load environment variables
dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

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
// MAIN DIAGNOSTIC
// ============================================

async function runDiagnostics() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LingoFriends PocketBase Schema Diagnostic');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n🔗 PocketBase URL: ${POCKETBASE_URL}`);

  const issues = [];
  const fixes = [];
  const pb = new PocketBase(POCKETBASE_URL);

  try {
    // Step 1: Authenticate
    console.log('\n📋 Authenticating with PocketBase...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');

    // Step 2: Get all collections
    console.log('\n📋 Fetching collections...');
    const collections = await pb.collections.getFullList();
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
      const collection = collections.find(c => c.name === collectionName);
      if (!collection) {
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

      const existingFields = collection.schema?.map(f => f.name) || [];
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
      for (const fieldDef of (collection.schema || [])) {
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

      // Check API rules
      console.log(`\nChecking API rules:`);
      console.log(`  listRule: ${collection.listRule === '' ? '(public)' : collection.listRule || '(admin only)'}`);
      console.log(`  viewRule: ${collection.viewRule === '' ? '(public)' : collection.viewRule || '(admin only)'}`);
      console.log(`  createRule: ${collection.createRule === '' ? '(public)' : collection.createRule || '(admin only)'}`);
      console.log(`  updateRule: ${collection.updateRule === '' ? '(public)' : collection.updateRule || '(admin only)'}`);
      console.log(`  deleteRule: ${collection.deleteRule === '' ? '(public)' : collection.deleteRule || '(admin only)'}`);
    }

    // Step 4: Test actual operations
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('  OPERATION TESTS');
    console.log('═══════════════════════════════════════════════════════════════');

    // Test learner_profiles creation
    console.log('\n\n🧪 Testing learner_profiles creation...');
    try {
      const testProfile = await pb.collection('learner_profiles').create({
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
      console.log('✅ Test profile created successfully');
      // Clean up
      await pb.collection('learner_profiles').delete(testProfile.id);
      console.log('  🧹 Test record cleaned up');
    } catch (error) {
      console.log(`❌ Failed to create test profile: ${error.status}`);
      console.log('Error details:', JSON.stringify(error.data || error.response || error.message, null, 2));
      issues.push({
        collection: 'learner_profiles',
        type: 'create_failed',
        status: error.status,
        error: error.data || error.response || error.message,
      });
    }

    // Test chunk_library creation
    console.log('\n\n🧪 Testing chunk_library creation...');
    try {
      const testChunk = await pb.collection('chunk_library').create({
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
      console.log('✅ Test chunk created successfully');
      // Clean up
      await pb.collection('chunk_library').delete(testChunk.id);
      console.log('  🧹 Test record cleaned up');
    } catch (error) {
      console.log(`❌ Failed to create test chunk: ${error.status}`);
      console.log('Error details:', JSON.stringify(error.data || error.response || error.message, null, 2));
      issues.push({
        collection: 'chunk_library',
        type: 'create_failed',
        status: error.status,
        error: error.data || error.response || error.message,
      });
    }

    // Test chunk_library query with filter (this is what fails in the app)
    console.log('\n\n🧪 Testing chunk_library filter query...');
    try {
      const result = await pb.collection('chunk_library').getList(1, 5, {
        filter: 'target_language = "French" && difficulty >= 1 && difficulty <= 3',
      });
      console.log('✅ Filter query works');
      console.log(`  Found ${result.items?.length || 0} records`);
    } catch (error) {
      console.log(`❌ Filter query failed: ${error.status}`);
      console.log('Error details:', JSON.stringify(error.data || error.response || error.message, null, 2));
      issues.push({
        collection: 'chunk_library',
        type: 'query_failed',
        status: error.status,
        error: error.data || error.response || error.message,
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
    writeFileSync(
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