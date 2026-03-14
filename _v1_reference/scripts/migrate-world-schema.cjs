/**
 * World Map Schema Migration (Task 2.0.11)
 * 
 * Creates collections for future multiplayer world features:
 * - servers: World/region containers for friend groups
 * - server_members: User membership in servers
 * 
 * NOTE: These collections are for FUTURE implementation.
 * The World Map UI is currently a static prototype.
 * 
 * @see docs/phase-2-world-expansion/task-2.0-11-world-map-prototype.md
 */

const PocketBase = require('pocketbase').default;

// Configuration
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'adminpassword';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Servers collection schema.
 * A server represents a "world" that users can join.
 */
const serversCollection = {
  name: 'servers',
  type: 'base',
  system: false,
  schema: [
    {
      name: 'name',
      type: 'text',
      required: true,
      options: {
        min: null,
        max: 100,
        pattern: '',
      },
    },
    {
      name: 'description',
      type: 'text',
      required: false,
      options: {
        min: null,
        max: 500,
        pattern: '',
      },
    },
    {
      name: 'owner_id',
      type: 'relation',
      required: true,
      options: {
        collectionId: '_pb_users_auth_', // Reference to users collection
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        displayFields: ['id'],
      },
    },
    {
      name: 'invite_code',
      type: 'text',
      required: true,
      options: {
        min: 6,
        max: 6,
        pattern: '^[A-Z0-9]{6}$',
      },
    },
    {
      name: 'max_members',
      type: 'number',
      required: false,
      options: {
        min: 1,
        max: 50,
      },
    },
    {
      name: 'is_public',
      type: 'bool',
      required: false,
      options: {},
    },
    {
      name: 'created',
      type: 'date',
      required: false,
      options: {
        min: '',
        max: '',
      },
    },
    {
      name: 'updated',
      type: 'date',
      required: false,
      options: {
        min: '',
        max: '',
      },
    },
  ],
  indexes: [
    'CREATE INDEX idx_servers_invite_code ON servers (invite_code)',
    'CREATE INDEX idx_servers_owner ON servers (owner_id)',
  ],
  listRule: '@request.auth.id != ""', // Authenticated users can list public servers
  viewRule: '@request.auth.id != ""', // Authenticated users can view servers
  createRule: '@request.auth.id != ""', // Authenticated users can create servers
  updateRule: '@request.auth.id = owner_id', // Only owner can update
  deleteRule: '@request.auth.id = owner_id', // Only owner can delete
};

/**
 * Server members collection schema.
 * Users who have joined a server.
 */
const serverMembersCollection = {
  name: 'server_members',
  type: 'base',
  system: false,
  schema: [
    {
      name: 'server_id',
      type: 'relation',
      required: true,
      options: {
        collectionId: '', // Will be set after servers collection is created
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1,
        displayFields: ['name'],
      },
    },
    {
      name: 'user_id',
      type: 'relation',
      required: true,
      options: {
        collectionId: '_pb_users_auth_',
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1,
        displayFields: ['id'],
      },
    },
    {
      name: 'role',
      type: 'select',
      required: false,
      options: {
        maxSelect: 1,
        values: ['owner', 'member'],
      },
    },
    {
      name: 'garden_x',
      type: 'number',
      required: false,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'garden_y',
      type: 'number',
      required: false,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'joined_at',
      type: 'date',
      required: false,
      options: {
        min: '',
        max: '',
      },
    },
  ],
  indexes: [
    'CREATE INDEX idx_server_members_server ON server_members (server_id)',
    'CREATE INDEX idx_server_members_user ON server_members (user_id)',
    'CREATE UNIQUE INDEX idx_server_members_unique ON server_members (server_id, user_id)',
  ],
  listRule: '@request.auth.id != ""', // Authenticated users can list members
  viewRule: '@request.auth.id != ""', // Authenticated users can view members
  createRule: '@request.auth.id = user_id', // Users can add themselves
  updateRule: '@request.auth.id = user_id', // Users can update their own membership
  deleteRule: '@request.auth.id = user_id || server_id.owner_id = @request.auth.id', // User or server owner can delete
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Generate a random 6-character invite code.
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars: I, L, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Run the migration.
 */
async function runMigration() {
  console.log('🌍 World Map Schema Migration');
  console.log('==============================');
  console.log('');
  console.log('NOTE: This creates collections for FUTURE multiplayer features.');
  console.log('The World Map UI is currently a static prototype.');
  console.log('');

  const pb = new PocketBase(POCKETBASE_URL);

  try {
    // Authenticate as admin
    console.log('📋 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Authenticated successfully');
    console.log('');

    // Check if servers collection already exists
    let serversId = null;
    try {
      const existingServers = await pb.collections.getOne('servers');
      console.log('⚠️  servers collection already exists, skipping...');
      serversId = existingServers.id;
    } catch (e) {
      // Collection doesn't exist, create it
      console.log('📦 Creating servers collection...');
      
      const created = await pb.collections.create(serversCollection);
      serversId = created.id;
      console.log('✅ servers collection created');
    }

    // Check if server_members collection already exists
    try {
      await pb.collections.getOne('server_members');
      console.log('⚠️  server_members collection already exists, skipping...');
    } catch (e) {
      // Collection doesn't exist, create it
      console.log('📦 Creating server_members collection...');
      
      // Set the servers collection ID for the relation
      serverMembersCollection.schema[0].options.collectionId = serversId;
      
      await pb.collections.create(serverMembersCollection);
      console.log('✅ server_members collection created');
    }

    console.log('');
    console.log('🎉 Migration complete!');
    console.log('');
    console.log('Collections created:');
    console.log('  - servers: World/region containers');
    console.log('  - server_members: User membership in servers');
    console.log('');
    console.log('These collections are NOT used in Phase 2.0.');
    console.log('They prepare the schema for future multiplayer implementation.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, serversCollection, serverMembersCollection };