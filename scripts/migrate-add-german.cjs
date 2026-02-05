/**
 * LingoFriends - Pocketbase Migration: Add German to Target Languages
 * 
 * This migration script updates existing collections to support German
 * as a target language, fixing the 400 errors when onboarding with German.
 * 
 * Run with: node scripts/migrate-add-german.cjs
 * 
 * What it does:
 * 1. Updates profiles.target_language field to include 'German'
 * 2. Updates sessions.target_language field to include 'German'
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// All supported target languages (Phase 1 + future)
const TARGET_LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Italian'];

async function authenticate(pb) {
  console.log('🔐 Authenticating as admin...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

/**
 * Update a select field in a collection to have new values
 */
async function updateSelectFieldValues(pb, collectionName, fieldName, newValues) {
  console.log(`\n📝 Updating ${collectionName}.${fieldName}...`);
  
  try {
    // Get the collection
    const collection = await pb.collections.getOne(collectionName);
    console.log(`   Found collection: ${collection.id}`);
    
    // Find the field
    const fieldIndex = collection.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) {
      console.log(`   ⚠️  Field "${fieldName}" not found in ${collectionName}`);
      return false;
    }
    
    const field = collection.fields[fieldIndex];
    console.log(`   Current values: [${field.values?.join(', ') || 'none'}]`);
    
    // Check if update is needed
    const currentValues = new Set(field.values || []);
    const needsUpdate = newValues.some(v => !currentValues.has(v));
    
    if (!needsUpdate) {
      console.log(`   ✅ Already has all values, no update needed`);
      return true;
    }
    
    // Update the field with new values
    const updatedFields = [...collection.fields];
    updatedFields[fieldIndex] = {
      ...field,
      values: newValues,
    };
    
    // Apply the update
    await pb.collections.update(collection.id, {
      fields: updatedFields,
    });
    
    console.log(`   ✅ Updated to: [${newValues.join(', ')}]`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error updating ${collectionName}.${fieldName}:`, error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    return false;
  }
}

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🚀 LingoFriends Migration: Add German Support');
  console.log('═══════════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Target languages: [${TARGET_LANGUAGES.join(', ')}]`);
  console.log('');
  
  try {
    await authenticate(pb);
    
    let success = true;
    
    // Update profiles collection
    const profilesUpdated = await updateSelectFieldValues(
      pb, 
      'profiles', 
      'target_language', 
      TARGET_LANGUAGES
    );
    success = success && profilesUpdated;
    
    // Update sessions collection
    const sessionsUpdated = await updateSelectFieldValues(
      pb, 
      'sessions', 
      'target_language', 
      TARGET_LANGUAGES
    );
    success = success && sessionsUpdated;
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    
    if (success) {
      console.log('🎉 Migration complete!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Clear your browser localStorage (or use incognito)');
      console.log('2. Log out and log back in to the app');
      console.log('3. Complete onboarding with German');
      console.log('');
    } else {
      console.log('⚠️  Migration completed with some issues');
      console.log('   Check the logs above for details');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
