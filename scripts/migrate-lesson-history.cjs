/**
 * Migration: Create lesson_history collection
 *
 * Stores completed lesson records per user so the app can show past lesson history.
 * Required for test suite 04 to pass WARN → PASS.
 *
 * Run with: node scripts/migrate-lesson-history.cjs
 *
 * @see docs/phase-2.2-fixes/task-2.2.1-lesson-history-collection.md
 * @see src/types/pocketbase.ts for LessonHistory interface
 */

const PocketBase = require('pocketbase');

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

const LESSON_HISTORY_SCHEMA = {
  name: 'lesson_history',
  type: 'base',
  schema: [
    // Who completed the lesson
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: {
        collectionId: 'users',
        cascadeDelete: true,
        minSelect: null,
        maxSelect: 1,
      },
    },
    { name: 'lesson_title',     type: 'text',   required: true, options: { min: 1, max: 200 } },
    { name: 'target_language',  type: 'text',   required: true, options: { min: 1, max: 50 } },
    { name: 'native_language',  type: 'text',   required: true, options: { min: 1, max: 50 } },
    { name: 'xp_earned',        type: 'number', required: true, options: { min: 0, max: 10000 } },
    { name: 'sun_drops_earned', type: 'number', required: true, options: { min: 0, max: 1000 } },
    { name: 'total_steps',      type: 'number', required: true, options: { min: 1, max: 100 } },
    { name: 'completed_steps',  type: 'number', required: true, options: { min: 0, max: 100 } },
    // 0-100 percentage score
    { name: 'score_percentage', type: 'number', required: true, options: { min: 0, max: 100 } },
    { name: 'completed_at',     type: 'date',   required: true },
  ],
  // Append-only: only the owning user can read/create, nobody can update/delete
  listRule:   '@request.auth.id = user',
  viewRule:   '@request.auth.id = user',
  createRule: '@request.auth.id != ""',
  updateRule: null,
  deleteRule: null,
  indexes: [
    'CREATE INDEX idx_lesson_history_user ON lesson_history (user)',
    'CREATE INDEX idx_lesson_history_completed ON lesson_history (completed_at)',
  ],
};

async function run() {
  const pb = new PocketBase(PB_URL);

  try {
    console.log(`[migrate-lesson-history] Connecting to ${PB_URL}...`);
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
    console.log('[migrate-lesson-history] Authenticated as admin');

    // Check if collection already exists
    const collections = await pb.collections.getFullList();
    const existing = collections.find(c => c.name === 'lesson_history');

    if (existing) {
      console.log('[migrate-lesson-history] Collection lesson_history already exists — skipping creation');
      console.log('[migrate-lesson-history] If you need to update the schema, delete the collection first');
      return;
    }

    // Resolve the real users collection ID (PocketBase requires actual ID, not name)
    const usersCollection = collections.find(c => c.name === 'users');
    if (usersCollection) {
      const userField = LESSON_HISTORY_SCHEMA.schema.find(f => f.name === 'user');
      if (userField && userField.options) {
        userField.options.collectionId = usersCollection.id;
        console.log(`[migrate-lesson-history] Resolved users collection ID: ${usersCollection.id}`);
      }
    } else {
      console.warn('[migrate-lesson-history] WARNING: users collection not found — relation may not work');
    }

    // Create the collection
    await pb.collections.create(LESSON_HISTORY_SCHEMA);
    console.log('[migrate-lesson-history] ✅ Created lesson_history collection');
    console.log('[migrate-lesson-history] Fields:');
    for (const field of LESSON_HISTORY_SCHEMA.schema) {
      console.log(`  - ${field.name} (${field.type})`);
    }

  } catch (err) {
    console.error('[migrate-lesson-history] ❌ Error:', err.message || err);
    process.exit(1);
  }
}

run();
