/**
 * Fix Script: Add Missing Fields to Pedagogy Collections
 * 
 * This script adds all missing fields to:
 * - learner_profiles
 * - chunk_library
 * - user_chunks
 * - topics
 * 
 * Run with: node scripts/fix-pedagogy-schema.mjs
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LingoFriends PocketBase Schema Fix');
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

  // Fix each collection
  await fixLearnerProfiles(pb, usersCollectionId);
  await fixChunkLibrary(pb);
  await fixUserChunks(pb, usersCollectionId);
  await fixTopics(pb);
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  Schema fix complete!');
  console.log('═══════════════════════════════════════════════════════════════');
}

/**
 * Fix learner_profiles collection
 */
async function fixLearnerProfiles(pb, usersCollectionId) {
  console.log('\n\n📁 Fixing learner_profiles collection...');
  
  try {
    const collection = await pb.collections.getOne('learner_profiles');
    
    const schema = [
      // User relation
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
      
      // Language settings
      { name: 'native_language', type: 'text', required: true },
      { name: 'target_language', type: 'text', required: true },
      
      // Level tracking
      { name: 'current_level', type: 'number', required: false },
      { name: 'level_history', type: 'json', required: false },
      
      // Chunk statistics
      { name: 'total_chunks_encountered', type: 'number', required: false },
      { name: 'chunks_acquired', type: 'number', required: false },
      { name: 'chunks_learning', type: 'number', required: false },
      { name: 'chunks_fragile', type: 'number', required: false },
      
      // Interests
      { name: 'explicit_interests', type: 'json', required: false },
      { name: 'detected_interests', type: 'json', required: false },
      
      // Confidence
      { name: 'average_confidence', type: 'number', required: false },
      { name: 'confidence_history', type: 'json', required: false },
      
      // Engagement
      { name: 'total_sessions', type: 'number', required: false },
      { name: 'total_time_minutes', type: 'number', required: false },
      { name: 'average_session_length', type: 'number', required: false },
      { name: 'help_request_rate', type: 'number', required: false },
      { name: 'wrong_answer_rate', type: 'number', required: false },
      
      // Preferences
      { name: 'preferred_activity_types', type: 'json', required: false },
      { name: 'preferred_session_length', type: 'number', required: false },
      
      // Coaching
      { name: 'last_reflection_prompt', type: 'text', required: false },
      { name: 'coaching_notes', type: 'text', required: false },
      
      // Affective filter
      { name: 'filter_risk_score', type: 'number', required: false },
      { name: 'last_struggle_date', type: 'text', required: false },
    ];

    await pb.collections.update(collection.id, { schema });
    console.log('✅ Updated learner_profiles schema with', schema.length, 'fields');
    
  } catch (error) {
    console.error('❌ Error updating learner_profiles:', error.message);
    console.error('Details:', error.data);
  }
}

/**
 * Fix chunk_library collection
 */
async function fixChunkLibrary(pb) {
  console.log('\n\n📁 Fixing chunk_library collection...');
  
  try {
    const collection = await pb.collections.getOne('chunk_library');
    
    const schema = [
      // Core fields
      { name: 'text', type: 'text', required: true },
      { name: 'translation', type: 'text', required: true },
      
      // Chunk classification
      { 
        name: 'chunk_type', 
        type: 'select', 
        required: true,
        options: { 
          maxSelect: 1, 
          values: ['polyword', 'collocation', 'utterance', 'frame', 'sentence'] 
        }
      },
      
      // Language
      { name: 'target_language', type: 'text', required: true },
      { name: 'native_language', type: 'text', required: true },
      
      // Difficulty
      { name: 'difficulty', type: 'number', required: true },
      
      // Topics (relation to topics collection)
      { name: 'topics', type: 'json', required: false },
      
      // Frequency
      { name: 'frequency', type: 'number', required: false },
      
      // SRS
      { name: 'base_interval', type: 'number', required: false },
      
      // Frame slots
      { name: 'slots', type: 'json', required: false },
      
      // Metadata
      { name: 'notes', type: 'text', required: false },
      { name: 'cultural_context', type: 'text', required: false },
      { name: 'age_appropriate', type: 'json', required: false },
      
      // Audio
      { name: 'audio_url', type: 'text', required: false },
    ];

    await pb.collections.update(collection.id, { schema });
    console.log('✅ Updated chunk_library schema with', schema.length, 'fields');
    
  } catch (error) {
    console.error('❌ Error updating chunk_library:', error.message);
    console.error('Details:', error.data);
  }
}

/**
 * Fix user_chunks collection
 */
async function fixUserChunks(pb, usersCollectionId) {
  console.log('\n\n📁 Fixing user_chunks collection...');
  
  try {
    // Get chunk_library collection ID for relation
    const chunkLibraryCollection = await pb.collections.getOne('chunk_library');
    const chunkLibraryId = chunkLibraryCollection?.id;
    
    const collection = await pb.collections.getOne('user_chunks');
    
    const schema = [
      // User relation
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
      
      // Chunk relation
      { 
        name: 'chunk', 
        type: 'relation', 
        required: true,
        options: { 
          collectionId: chunkLibraryId, 
          cascadeDelete: false, 
          minSelect: null, 
          maxSelect: 1 
        }
      },
      
      // Status
      { 
        name: 'status', 
        type: 'select', 
        required: true,
        options: { 
          maxSelect: 1, 
          values: ['new', 'learning', 'acquired', 'fragile'] 
        }
      },
      
      // SRS fields (SM-2 algorithm)
      { name: 'ease_factor', type: 'number', required: false },
      { name: 'interval', type: 'number', required: false },
      { name: 'next_review_date', type: 'text', required: false },
      { name: 'repetitions', type: 'number', required: false },
      
      // Performance tracking
      { name: 'total_encounters', type: 'number', required: false },
      { name: 'correct_first_try', type: 'number', required: false },
      { name: 'wrong_attempts', type: 'number', required: false },
      { name: 'help_used_count', type: 'number', required: false },
      
      // Encounter context
      { name: 'first_encountered_in', type: 'text', required: false },
      { name: 'first_encountered_at', type: 'text', required: false },
      { name: 'last_encountered_in', type: 'text', required: false },
      { name: 'last_encountered_at', type: 'text', required: false },
      
      // Confidence
      { name: 'confidence_score', type: 'number', required: false },
    ];

    await pb.collections.update(collection.id, { schema });
    console.log('✅ Updated user_chunks schema with', schema.length, 'fields');
    
  } catch (error) {
    console.error('❌ Error updating user_chunks:', error.message);
    console.error('Details:', error.data);
  }
}

/**
 * Fix topics collection
 */
async function fixTopics(pb) {
  console.log('\n\n📁 Fixing topics collection...');
  
  try {
    const collection = await pb.collections.getOne('topics');
    const topicsCollectionId = collection.id;
    
    const schema = [
      // Core fields
      { name: 'name', type: 'text', required: true },
      { name: 'icon', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      
      // Hierarchy
      { 
        name: 'parent_topic', 
        type: 'relation', 
        required: false,
        options: { 
          collectionId: topicsCollectionId, 
          cascadeDelete: false, 
          minSelect: null, 
          maxSelect: 1 
        }
      },
      
      // Language
      { name: 'target_language', type: 'text', required: true },
      
      // Difficulty
      { name: 'difficulty_range', type: 'text', required: false },
      
      // Tags
      { name: 'tags', type: 'json', required: false },
      
      // Stats
      { name: 'chunk_count', type: 'number', required: false },
    ];

    await pb.collections.update(collection.id, { schema });
    console.log('✅ Updated topics schema with', schema.length, 'fields');
    
  } catch (error) {
    console.error('❌ Error updating topics:', error.message);
    console.error('Details:', error.data);
  }
}

main().catch(console.error);