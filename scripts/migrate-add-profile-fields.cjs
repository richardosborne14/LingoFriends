/**
 * LingoFriends - Migration Script: Add Profile Fields
 * 
 * Adds the missing fields to the profiles collection:
 * - subject_type (select)
 * - target_subject (text)
 * - selected_interests (json)
 * 
 * Run with: node scripts/migrate-add-profile-fields.cjs
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

/**
 * Helper to generate unique field IDs
 */
let fieldIdCounter = 1;
const generateFieldId = () => `field_${Date.now()}_${fieldIdCounter++}`;

/**
 * Build a field object for Pocketbase v0.36.2
 */
function buildField(name, type, required, options = {}) {
  const base = {
    id: generateFieldId(),
    name,
    type,
    required: required || false,
    presentable: false,
    hidden: false,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        min: options.min || 0,
        max: options.max || 0,
        pattern: options.pattern || '',
      };
    
    case 'select':
      return {
        ...base,
        maxSelect: options.maxSelect || 1,
        values: options.values || [],
      };
    
    case 'json':
      return {
        ...base,
        maxSize: options.maxSize || 2000000,
      };
    
    default:
      return base;
  }
}

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🚀 LingoFriends Migration: Add Profile Fields');
  console.log('═══════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log('');
  
  try {
    // Authenticate
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated');
    console.log('');
    
    // Get the profiles collection
    console.log('📦 Getting profiles collection...');
    const profiles = await pb.collections.getOne('profiles');
    console.log(`   Found: ${profiles.name} (id: ${profiles.id})`);
    console.log(`   Current fields: ${profiles.fields.length}`);
    
    // Check which fields are missing
    const existingFieldNames = profiles.fields.map(f => f.name);
    const newFields = [];
    
    // subject_type
    if (!existingFieldNames.includes('subject_type')) {
      console.log('   + Adding: subject_type');
      newFields.push(buildField('subject_type', 'select', false, { 
        maxSelect: 1, 
        values: ['language', 'maths', 'coding'] 
      }));
    } else {
      console.log('   ✓ subject_type already exists');
    }
    
    // target_subject
    if (!existingFieldNames.includes('target_subject')) {
      console.log('   + Adding: target_subject');
      newFields.push(buildField('target_subject', 'text', false, { max: 50 }));
    } else {
      console.log('   ✓ target_subject already exists');
    }
    
    // selected_interests
    if (!existingFieldNames.includes('selected_interests')) {
      console.log('   + Adding: selected_interests');
      newFields.push(buildField('selected_interests', 'json', false));
    } else {
      console.log('   ✓ selected_interests already exists');
    }
    
    console.log('');
    
    if (newFields.length === 0) {
      console.log('✅ All fields already exist! No migration needed.');
      return;
    }
    
    // Apply the migration
    console.log(`📝 Adding ${newFields.length} new field(s)...`);
    
    const updatedFields = [...profiles.fields, ...newFields];
    
    await pb.collections.update(profiles.id, {
      fields: updatedFields,
    });
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎉 Migration complete!');
    console.log(`   Added ${newFields.length} new field(s) to profiles collection`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify in Pocketbase Admin UI');
    console.log(`   ${PB_URL}/_/`);
    console.log('2. Restart your app to test the changes');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

runMigration();
