/**
 * Migration: Create garden_objects collection
 * 
 * This script creates the garden_objects collection in Pocketbase
 * for persisting placed decorations in the 3D garden.
 * 
 * Collection: garden_objects
 * - user: relation to users (owner)
 * - object_id: string matching ShopItem.id (e.g., "oak", "fountain")
 * - gx: grid X position (0-11)
 * - gz: grid Z position (0-11)
 * - placed_at: timestamp
 * 
 * Run with: node scripts/migrate-garden-objects.cjs
 */

// Configuration - use the same pattern as other migration scripts
const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// ============================================
// FIELD BUILDER (v0.36.2 format)
// ============================================

let fieldIdCounter = 1;
const generateFieldId = () => `garden_field_${Date.now()}_${fieldIdCounter++}`;

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
    
    case 'text':
      return {
        ...base,
        min: options.min ?? null,
        max: options.max ?? null,
        pattern: options.pattern ?? '',
      };
    
    case 'date':
      return {
        ...base,
        min: '',
        max: '',
      };
    
    case 'relation':
      return {
        ...base,
        cascadeDelete: options.cascadeDelete ?? false,
        collectionId: options.collectionId,
        minSelect: null,
        maxSelect: options.maxSelect ?? 1,
        displayFields: ['id'],
      };
    
    default:
      return base;
  }
}

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
 * Create or update the garden_objects collection
 */
async function migrateCollection(pb) {
  console.log('📦 Setting up garden_objects collection...');
  
  // Find the users collection for the relation
  const collections = await pb.collections.getList(1, 100);
  const usersCollection = collections.items.find(
    (c) => c.name === 'users'
  );
  
  if (!usersCollection) {
    throw new Error('Users collection not found. Please run user auth setup first.');
  }
  
  console.log(`   Found users collection: ${usersCollection.id}`);
  
  // Build fields with the correct users collection ID
  const fields = [
    buildField('user', 'relation', true, { 
      collectionId: usersCollection.id, 
      cascadeDelete: true, 
      maxSelect: 1 
    }),
    buildField('object_id', 'text', true, { max: 50, pattern: '^[a-z_]+$' }),
    buildField('gx', 'number', true, { min: 0, max: 11 }),
    buildField('gz', 'number', true, { min: 0, max: 11 }),
    buildField('placed_at', 'date', false),
  ];
  
  // Define the collection schema
  const schema = {
    name: 'garden_objects',
    type: 'base',
    system: false,
    fields: fields,
    indexes: [
      'CREATE INDEX idx_garden_objects_user ON garden_objects (user)',
      'CREATE INDEX idx_garden_objects_position ON garden_objects (gx, gz)',
      'CREATE UNIQUE INDEX idx_garden_objects_user_position ON garden_objects (user, gx, gz)',
    ],
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: 'user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    options: {},
  };
  
  // Check if collection exists
  let collection;
  try {
    collection = await pb.collections.getOne('garden_objects');
    console.log('   Collection exists, updating...');
    await pb.collections.update(collection.id, schema);
    console.log('   ✅ Updated garden_objects collection');
  } catch (e) {
    if (e.status !== 404) throw e;
    console.log('   Collection not found, creating...');
    await pb.collections.create(schema);
    console.log('   ✅ Created garden_objects collection');
  }
  
  // Verify the collection
  const verifyCollection = await pb.collections.getOne('garden_objects');
  console.log('\n📋 Collection schema:');
  console.log(`   Name: ${verifyCollection.name}`);
  console.log(`   Fields: ${verifyCollection.fields.map((f) => f.name).join(', ')}`);
  console.log(`   List rule: ${verifyCollection.listRule}`);
  console.log(`   Create rule: ${verifyCollection.createRule}`);
}

// ============================================
// MAIN MIGRATION
// ============================================

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);
  
  console.log('');
  console.log('🌱 LingoFriends Garden Objects Migration');
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
  // STEP 1: Create garden_objects collection
  // ============================================
  console.log('📋 Step 1: Creating garden_objects collection...');
  console.log('───────────────────────────────────────');
  
  await migrateCollection(pb);
  
  console.log('');
  
  // ============================================
  // DONE
  // ============================================
  console.log('═════════════════════════════════════════');
  console.log('🎉 Migration complete!');
  console.log('');
  console.log('Collection created:');
  console.log('   ✅ garden_objects - Stores placed decorations');
  console.log('');
  console.log('Fields:');
  console.log('   ✅ user (relation) - Owner of the object');
  console.log('   ✅ object_id (text) - Type of decoration');
  console.log('   ✅ gx (number) - Grid X position (0-11)');
  console.log('   ✅ gz (number) - Grid Z position (0-11)');
  console.log('   ✅ placed_at (date) - When it was placed');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test placing objects via ShopPanel');
  console.log('2. Verify persistence across page reloads');
  console.log('3. Test the ShopTestHarness component');
  console.log('');
}

runMigration().catch(console.error);