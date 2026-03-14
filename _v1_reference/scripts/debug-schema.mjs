/**
 * Debug Script: Inspect and Fix Schema via Raw API
 * 
 * Run with: node scripts/debug-schema.mjs
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Debug: Inspect Raw Collection Data');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Login as admin
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Logged in as admin\n');

  // Get the raw collection data
  const collections = await pb.collections.getFullList();
  
  for (const col of collections.filter(c => ['learner_profiles', 'chunk_library', 'user_chunks', 'topics'].includes(c.name))) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Collection: ${col.name}`);
    console.log(`ID: ${col.id}`);
    console.log(`Type: ${col.type}`);
    console.log(`${'═'.repeat(60)}`);
    
    console.log('\nSchema fields:');
    if (col.schema && col.schema.length > 0) {
      col.schema.forEach((f, i) => {
        console.log(`  ${i+1}. ${f.name} (${f.type})${f.required ? ' *' : ''}`);
        if (f.options && Object.keys(f.options).length > 0) {
          console.log(`     Options: ${JSON.stringify(f.options)}`);
        }
      });
    } else {
      console.log('  (none defined)');
    }
    
    console.log('\nAPI Rules:');
    console.log(`  listRule: ${col.listRule || '(none)'}`);
    console.log(`  viewRule: ${col.viewRule || '(none)'}`);
    console.log(`  createRule: ${col.createRule || '(none)'}`);
    console.log(`  updateRule: ${col.updateRule || '(none)'}`);
    console.log(`  deleteRule: ${col.deleteRule || '(none)'}`);
    
    console.log('\nIndexes:');
    if (col.indexes) {
      console.log(`  ${col.indexes}`);
    } else {
      console.log('  (none)');
    }
    
    // Try to create a test record to see what validation happens
    console.log('\nTest create (dry run):');
    try {
      if (col.name === 'learner_profiles') {
        await pb.collection(col.name).create({
          user: 'test-user-id',
          native_language: 'English',
          target_language: 'Spanish',
        });
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      if (error.data && error.data.data) {
        console.log('  Validation errors:');
        for (const [field, err] of Object.entries(error.data.data)) {
          console.log(`    - ${field}: ${err.message}`);
        }
      }
    }
  }
  
  // Now let's see what happens when we update
  console.log('\n\n' + '═'.repeat(60));
  console.log('TESTING UPDATE');
  console.log('═'.repeat(60));
  
  const learnerProfileCol = collections.find(c => c.name === 'learner_profiles');
  
  // Get users collection ID
  const usersCol = collections.find(c => c.name === 'users');
  const usersId = usersCol?.id || '_pb_users_auth_';
  
  // Try a minimal update
  console.log('\nTrying minimal schema update...');
  
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
    }
  ];
  
  console.log('Sending schema:', JSON.stringify(newSchema, null, 2));
  
  try {
    const result = await pb.collections.update(learnerProfileCol.id, {
      schema: newSchema
    });
    console.log('\nResult:');
    console.log('  schema length:', result.schema?.length);
    console.log('  schema:', JSON.stringify(result.schema, null, 2));
  } catch (error) {
    console.log('\nError:', error.message);
    console.log('Data:', JSON.stringify(error.data, null, 2));
  }
  
  // Verify what's actually stored
  console.log('\n\nVerifying stored schema...');
  const verifyCol = await pb.collections.getOne('learner_profiles');
  console.log('Stored schema length:', verifyCol.schema?.length);
  if (verifyCol.schema?.length) {
    verifyCol.schema.forEach(f => console.log(`  - ${f.name}: ${JSON.stringify(f)}`));
  }
}

main().catch(console.error);