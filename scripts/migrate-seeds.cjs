/**
 * Migration: Add Seeds Field to Profiles
 * 
 * This migration adds the `seeds` field to the profiles collection
 * in Pocketbase, enabling the seed earning and planting mechanics.
 * 
 * Run with: node scripts/migrate-seeds.cjs
 * 
 * @see docs/phase-1.1/task-1-1-13-seed-earning.md
 */

const fetch = require('node-fetch');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'changeme';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login as admin to get auth token
 */
async function loginAdmin() {
  console.log('🔐 Logging in as admin...');
  
  const response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to login: ${error}`);
  }

  const data = await response.json();
  console.log('✅ Admin logged in successfully');
  return data.token;
}

/**
 * Get current profiles collection schema
 */
async function getCollectionSchema(token, collectionName) {
  const response = await fetch(`${PB_URL}/api/collections/${collectionName}`, {
    headers: {
      'Authorization': token,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new Error(`Failed to get collection: ${error}`);
  }

  return response.json();
}

/**
 * Update collection schema
 */
async function updateCollection(token, collectionName, schema) {
  const response = await fetch(`${PB_URL}/api/collections/${collectionName}`, {
    method: 'PATCH',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(schema),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update collection: ${error}`);
  }

  return response.json();
}

/**
 * Update existing profiles to have seeds = 0
 */
async function backfillProfiles(token) {
  console.log('📦 Backfilling existing profiles with seeds = 0...');
  
  // Get all profiles
  const response = await fetch(`${PB_URL}/api/collections/profiles/records?perPage=500`, {
    headers: {
      'Authorization': token,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get profiles: ${error}`);
  }

  const data = await response.json();
  const profiles = data.items || [];

  console.log(`Found ${profiles.length} profiles to update`);

  // Update each profile
  let updated = 0;
  for (const profile of profiles) {
    // Only update if seeds field is undefined or null
    if (profile.seeds === undefined || profile.seeds === null) {
      const updateResponse = await fetch(`${PB_URL}/api/collections/profiles/records/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seeds: 0 }),
      });

      if (updateResponse.ok) {
        updated++;
      } else {
        console.warn(`Failed to update profile ${profile.id}`);
      }
    }
  }

  console.log(`✅ Updated ${updated} profiles with seeds = 0`);
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrate() {
  console.log('🌱 Starting Seeds Migration...\n');

  try {
    // Login as admin
    const token = await loginAdmin();

    // Get current profiles collection
    console.log('\n📋 Fetching profiles collection schema...');
    const collection = await getCollectionSchema(token, 'profiles');

    if (!collection) {
      throw new Error('Profiles collection not found!');
    }

    // Check if seeds field already exists
    const existingField = collection.schema?.find(f => f.name === 'seeds');
    
    if (existingField) {
      console.log('✅ Seeds field already exists in profiles collection');
      console.log(`   Type: ${existingField.type}`);
      console.log(`   Default: ${existingField.defaultValue}`);
    } else {
      console.log('➕ Adding seeds field to profiles collection...');

      // Add seeds field
      const newField = {
        system: false,
        id: 'seeds_' + Date.now(),
        name: 'seeds',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: 0,
          max: 10,
          noDecimal: true,
          defaultValue: 0,
        },
      };

      // Update collection with new field
      const updatedSchema = [...(collection.schema || []), newField];

      await updateCollection(token, 'profiles', {
        schema: updatedSchema,
      });

      console.log('✅ Seeds field added successfully!');
    }

    // Backfill existing profiles
    await backfillProfiles(token);

    console.log('\n🎉 Migration complete!');
    console.log('\nField details:');
    console.log('  - Name: seeds');
    console.log('  - Type: number (integer)');
    console.log('  - Min: 0, Max: 10');
    console.log('  - Default: 0');
    console.log('\nNext steps:');
    console.log('  1. Test seed earning in lesson completion');
    console.log('  2. Test seed planting flow');
    console.log('  3. Verify seed count displays correctly');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate();