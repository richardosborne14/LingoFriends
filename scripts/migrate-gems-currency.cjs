/**
 * Migration Script: Add Gems Currency to Profiles
 * 
 * This script adds the `gems` and `seeds` fields to the profiles collection
 * for the new reward economy system (Phase 1.1.11).
 * 
 * Run with: node scripts/migrate-gems-currency.cjs
 * 
 * Changes:
 * - Adds `gems` field (number, default 0) - Currency for shop purchases
 * - Adds `seeds` field (number, default 0) - Earned from pathway completion
 * - Adds `currentStreak` field (number, default 0) - For streak tracking
 * - Adds `lastLessonDate` field (date, optional) - For streak calculation
 * 
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// ============================================
// FIELD BUILDER (v0.36.2 format)
// ============================================

let fieldIdCounter = 1;
const generateFieldId = () => `gems_field_${Date.now()}_${fieldIdCounter++}`;

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
    case 'number':
      return {
        ...base,
        min: options.min ?? null,
        max: options.max ?? null,
        onlyInt: options.noDecimal || true,
      };
    
    case 'date':
      return {
        ...base,
        min: '',
        max: '',
      };
    
    default:
      return base;
  }
}

// Fields to add for gems currency
const gemsCurrencyFields = [
  buildField('gems', 'number', false, { min: 0 }),
  buildField('seeds', 'number', false, { min: 0 }),
  buildField('currentStreak', 'number', false, { min: 0 }),
  buildField('lastLessonDate', 'date', false),
];

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function authenticate(pb) {
  console.log('🔐 Authenticating as admin...');
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Add fields to an existing collection
 */
async function addFieldsToCollection(pb, collectionName, newFields) {
  console.log(`➕ Adding fields to: ${collectionName}`);
  
  try {
    const collection = await pb.collections.getOne(collectionName);
    
    // Check which fields already exist
    const existingFieldNames = collection.fields.map(f => f.name);
    const fieldsToAdd = newFields.filter(f => !existingFieldNames.includes(f.name));
    
    if (fieldsToAdd.length === 0) {
      console.log(`   ⚠️  All fields already exist in "${collectionName}", skipping...`);
      return { added: 0, skipped: newFields.length };
    }
    
    // Merge existing fields with new fields
    const updatedFields = [...collection.fields, ...fieldsToAdd];
    
    await pb.collections.update(collection.id, {
      fields: updatedFields,
    });
    
    console.log(`   ✅ Added ${fieldsToAdd.length} fields to "${collectionName}": ${fieldsToAdd.map(f => f.name).join(', ')}`);
    return { added: fieldsToAdd.length, skipped: 0 };
    
  } catch (error) {
    console.error(`   ❌ Error adding fields to "${collectionName}":`, error.message);
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

/**
 * Set default values for existing profiles
 */
async function setDefaultValues(pb) {
  console.log('📊 Setting default values for existing profiles...');
  
  try {
    const profiles = await pb.collection('profiles').getFullList();
    
    let updated = 0;
    for (const profile of profiles) {
      const updates = {};
      
      // Only set defaults if fields are undefined or null
      if (profile.gems === undefined || profile.gems === null) {
        updates.gems = 0;
      }
      if (profile.seeds === undefined || profile.seeds === null) {
        updates.seeds = 0;
      }
      if (profile.currentStreak === undefined || profile.currentStreak === null) {
        updates.currentStreak = 0;
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await pb.collection('profiles').update(profile.id, updates);
        updated++;
      }
    }
    
    console.log(`   ✅ Updated ${updated} existing profiles with default values`);
    return updated;
    
  } catch (error) {
    console.error(`   ⚠️  Could not set default values:`, error.message);
    return 0;
  }
}

// ============================================
// MAIN MIGRATION
// ============================================

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('💎 LingoFriends Gems Currency Migration');
  console.log('═════════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log(`   Admin: ${PB_ADMIN_EMAIL}`);
  console.log('');
  
  // Authenticate
  if (!await authenticate(pb)) {
    process.exit(1);
  }
  console.log('');
  
  // ============================================
  // STEP 1: Add gems currency fields to profiles
  // ============================================
  console.log('📋 Step 1: Adding gems currency fields...');
  console.log('───────────────────────────────────────');
  
  await addFieldsToCollection(pb, 'profiles', gemsCurrencyFields);
  
  console.log('');
  
  // ============================================
  // STEP 2: Set default values for existing profiles
  // ============================================
  console.log('📋 Step 2: Setting default values...');
  console.log('───────────────────────────────────────');
  
  await setDefaultValues(pb);
  
  console.log('');
  
  // ============================================
  // DONE
  // ============================================
  console.log('═════════════════════════════════════════');
  console.log('🎉 Migration complete!');
  console.log('');
  console.log('Fields added to profiles:');
  console.log('   ✅ gems (number, default 0) - Shop currency');
  console.log('   ✅ seeds (number, default 0) - Pathway rewards');
  console.log('   ✅ currentStreak (number, default 0) - Streak tracking');
  console.log('   ✅ lastLessonDate (date) - Streak calculation');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test gem earning in LessonComplete component');
  console.log('2. Test the shop with the new currency');
  console.log('3. Verify streak tracking works correctly');
  console.log('');
}

runMigration().catch(console.error);