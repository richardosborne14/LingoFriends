/**
 * Migration: Create question_reports collection
 * 
 * This collection stores user reports about broken/incorrect questions
 * to help improve question quality over time.
 * 
 * @run node scripts/migrate-question-reports.mjs
 */

import PocketBase from 'pocketbase';

// ============================================
// CONFIGURATION
// ============================================

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'adminpassword';

// ============================================
// COLLECTION SCHEMA
// ============================================

const questionReportsSchema = {
  name: 'question_reports',
  type: 'base',
  system: false,
  schema: [
    // User who reported (can be empty for anonymous)
    {
      name: 'user',
      type: 'relation',
      required: false,
      options: {
        collectionId: '_pb_users_auth_', // Standard users collection
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: ['username'],
      },
    },
    // The lesson step where the issue occurred
    {
      name: 'lesson_step',
      type: 'relation',
      required: false,
      options: {
        collectionId: null, // Will be set dynamically
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: ['id'],
      },
    },
    // Question type (multiple_choice, fill_blank, etc.)
    {
      name: 'activity_type',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: 50,
      },
    },
    // Issue category
    {
      name: 'issue_type',
      type: 'select',
      required: true,
      options: {
        values: [
          'incorrect_answer',      // The "correct" answer is wrong
          'typo',                  // Spelling or grammar error
          'confusing',             // Question is unclear or ambiguous
          'translation_error',     // Translation is incorrect
          'audio_issue',           // Audio pronunciation problem
          'missing_context',       // Question lacks necessary context
          'inappropriate',         // Content is age-inappropriate
          'other',                 // Any other issue
        ],
      },
    },
    // User's description of the problem
    {
      name: 'description',
      type: 'text',
      required: false,
      options: {
        min: null,
        max: 1000,
      },
    },
    // The original question content (serialized JSON)
    {
      name: 'question_data',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: null,
      },
    },
    // Target language
    {
      name: 'target_language',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: 20,
      },
    },
    // Native language
    {
      name: 'native_language',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: 20,
      },
    },
    // Subject area
    {
      name: 'subject',
      type: 'text',
      required: false,
      options: {
        min: null,
        max: 50,
      },
    },
    // Resolution status
    {
      name: 'status',
      type: 'select',
      required: true,
      options: {
        values: [
          'pending',       // Awaiting review
          'reviewing',     // Under investigation
          'fixed',         // Issue resolved
          'wont_fix',      // No fix planned (by design, etc.)
          'invalid',       // Not a real issue
        ],
      },
    },
    // Admin notes on resolution
    {
      name: 'resolution_notes',
      type: 'text',
      required: false,
      options: {
        min: null,
        max: null,
      },
    },
    // Auto-generated from AI teacher
    {
      name: 'generated_by_ai',
      type: 'bool',
      required: false,
      options: {
        default: true,
      },
    },
  ],
  // Rule: Users can create reports, only admins can read/update
  listRule: null,  // Only admins
  viewRule: null,  // Only admins
  createRule: '', // Empty string = allow all (anonymous reports allowed)
  updateRule: null, // Only admins
  deleteRule: null, // Only admins
  indexes: [], // Indexes can be added later via PocketBase admin UI
};

// ============================================
// MIGRATION FUNCTION
// ============================================

async function migrate() {
  console.log('🚀 Starting question_reports migration...');
  console.log(`   PocketBase URL: ${POCKETBASE_URL}`);
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  try {
    // Authenticate as admin
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('   ✅ Authenticated successfully');
    
    // Check if collection already exists
    const collections = await pb.collections.getList(1, 100);
    const existingCollection = collections.items.find(c => c.name === 'question_reports');
    
    if (existingCollection) {
      console.log('⚠️  Collection question_reports already exists.');
      console.log('   Updating existing collection...');
      
      // Update existing collection
      const updatedCollection = await pb.collections.update(existingCollection.id, {
        ...existingCollection,
        schema: questionReportsSchema.schema,
      });
      
      console.log('   ✅ Collection updated successfully');
      console.log(`   Collection ID: ${updatedCollection.id}`);
    } else {
      console.log('📦 Creating new collection question_reports...');
      
      // Find lesson_steps collection ID for relation
      const lessonStepsCollection = collections.items.find(c => c.name === 'lesson_steps');
      if (lessonStepsCollection) {
        const lessonStepField = questionReportsSchema.schema.find(f => f.name === 'lesson_step');
        if (lessonStepField && lessonStepField.options) {
          lessonStepField.options.collectionId = lessonStepsCollection.id;
        }
      }
      
      // Find users collection ID for relation
      const usersCollection = collections.items.find(c => c.name === 'users');
      if (usersCollection) {
        const userField = questionReportsSchema.schema.find(f => f.name === 'user');
        if (userField && userField.options) {
          userField.options.collectionId = usersCollection.id;
        }
      }
      
      // Create collection
      const newCollection = await pb.collections.create({
        name: questionReportsSchema.name,
        type: questionReportsSchema.type,
        system: questionReportsSchema.system,
        schema: questionReportsSchema.schema,
        listRule: questionReportsSchema.listRule,
        viewRule: questionReportsSchema.viewRule,
        createRule: questionReportsSchema.createRule,
        updateRule: questionReportsSchema.updateRule,
        deleteRule: questionReportsSchema.deleteRule,
        indexes: questionReportsSchema.indexes,
      });
      
      console.log('   ✅ Collection created successfully');
      console.log(`   Collection ID: ${newCollection.id}`);
    }
    
    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📋 Notes:');
    console.log('   - Users can create reports (anonymous or logged in)');
    console.log('   - Only admins can read, update, or delete reports');
    console.log('   - Status defaults to "pending"');
    console.log('');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run migration
migrate();