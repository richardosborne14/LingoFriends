/**
 * Migration: Fix question_reports collection schema
 *
 * Adds missing fields that suite 05 sends but the schema doesn't have:
 *   lesson_id, step_index, activity_type, issue_type, description, activity_data
 *
 * Also ensures the `user` field exists as a proper relation field,
 * and sets the list rule so admin can read all reports.
 *
 * Run with: node scripts/migrate-fix-question-reports.cjs
 *
 * @see docs/phase-2.2-fixes/task-2.2.2-question-reports-fix.md
 */

const PocketBase = require('pocketbase');

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

// These are the fields the test (and app) expects to send/read.
// If the collection already has some of these, we skip them.
const REQUIRED_FIELDS = [
  // Who reported (relation to users)
  {
    name: 'user',
    type: 'relation',
    required: false,
    options: {
      collectionId: 'users', // resolved at runtime
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1,
    },
  },
  // Lesson identifier (just a string ID, not a relation — avoids cascading issues)
  { name: 'lesson_id',     type: 'text',   required: false, options: { min: 0, max: 200 } },
  // Which step index in the lesson triggered the report
  { name: 'step_index',    type: 'number', required: false, options: { min: 0 } },
  // e.g. "multiple_choice", "fill_blank"
  { name: 'activity_type', type: 'text',   required: false, options: { min: 0, max: 50 } },
  // e.g. "wrong_answer", "unclear", "inappropriate"
  { name: 'issue_type',    type: 'text',   required: false, options: { min: 0, max: 50 } },
  // User's free-text description of the problem
  { name: 'description',   type: 'text',   required: false, options: { min: 0, max: 2000 } },
  // Full serialised activity JSON for debugging
  { name: 'activity_data', type: 'text',   required: false, options: { min: 0, max: 10000 } },
];

async function run() {
  const pb = new PocketBase(PB_URL);

  try {
    console.log(`[migrate-fix-question-reports] Connecting to ${PB_URL}...`);
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
    console.log('[migrate-fix-question-reports] Authenticated as admin');

    const collections = await pb.collections.getFullList();

    // Resolve real users collection ID for relation
    const usersCollection = collections.find(c => c.name === 'users');
    const usersId = usersCollection?.id ?? '_pb_users_auth_';
    console.log(`[migrate-fix-question-reports] Users collection ID: ${usersId}`);

    // Patch the user field with the real collection ID
    const userField = REQUIRED_FIELDS.find(f => f.name === 'user');
    if (userField && userField.options) {
      userField.options.collectionId = usersId;
    }

    const existing = collections.find(c => c.name === 'question_reports');

    if (!existing) {
      // Collection doesn't exist — create it from scratch
      console.log('[migrate-fix-question-reports] question_reports does not exist — creating...');
      await pb.collections.create({
        name: 'question_reports',
        type: 'base',
        schema: REQUIRED_FIELDS,
        // Admin can read all; authenticated users can create; nobody can update/delete
        listRule:   '',
        viewRule:   '',
        createRule: '@request.auth.id != ""',
        updateRule: null,
        deleteRule: null,
      });
      console.log('[migrate-fix-question-reports] ✅ Created question_reports collection');
      return;
    }

    // Collection exists — add only the missing fields
    console.log('[migrate-fix-question-reports] question_reports exists — checking for missing fields...');
    const existingFieldNames = new Set(existing.schema.map(f => f.name));
    const fieldsToAdd = REQUIRED_FIELDS.filter(f => !existingFieldNames.has(f.name));

    if (fieldsToAdd.length === 0) {
      console.log('[migrate-fix-question-reports] All required fields already present');
    } else {
      console.log(`[migrate-fix-question-reports] Adding ${fieldsToAdd.length} missing fields: ${fieldsToAdd.map(f => f.name).join(', ')}`);
      const updatedSchema = [...existing.schema, ...fieldsToAdd];
      await pb.collections.update(existing.id, {
        schema: updatedSchema,
        // Open list rule so admin can read; user can still read their own
        listRule:   '',
        viewRule:   '',
      });
      console.log('[migrate-fix-question-reports] ✅ Updated question_reports schema');
    }

    // Always ensure the list rule is open for admin reads
    if (existing.listRule !== '' && existing.listRule !== null) {
      console.log(`[migrate-fix-question-reports] Updating list rule from "${existing.listRule}" to "" (admin-readable)`);
      await pb.collections.update(existing.id, { listRule: '', viewRule: '' });
    }

    console.log('[migrate-fix-question-reports] Done');

  } catch (err) {
    console.error('[migrate-fix-question-reports] ❌ Error:', err.message || err);
    process.exit(1);
  }
}

run();
