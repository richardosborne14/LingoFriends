/**
 * migrate-fix-profile-required-fields.cjs
 *
 * Removes the `required` flag from `sunDrops` and `giftsReceived` on the
 * `profiles` collection.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * PocketBase uses a falsy check for `required` validation on number fields.
 * A field with `required: true` and `min: 0` will reject `0` as "blank"
 * because `Boolean(0) === false`. This breaks account creation for new users
 * who legitimately start with 0 sun drops and 0 gifts received.
 *
 * The fields were originally added as `required: true` in migrate-game-schema.cjs.
 * This script patches them to `required: false` (optional, default 0).
 *
 * USAGE
 * -----
 *   node scripts/migrate-fix-profile-required-fields.cjs
 *
 * Requires:
 *   VITE_POCKETBASE_URL      — PocketBase instance URL
 *   POCKETBASE_ADMIN_EMAIL   — Admin email
 *   POCKETBASE_ADMIN_PASSWORD — Admin password
 *
 * IDEMPOTENT: safe to run multiple times; exits cleanly if fields are already optional.
 */

const PocketBase = require('pocketbase/cjs');
// dotenv not required — credentials passed as env vars

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const FIELDS_TO_FIX = ['sunDrops', 'giftsReceived'];

async function run() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      '❌  POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set in .env',
    );
    process.exit(1);
  }

  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  // ── Authenticate ────────────────────────────────────────────────────────
  console.log(`Connecting to ${PB_URL} …`);
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅  Admin authenticated');

  // ── Fetch profiles collection schema ───────────────────────────────────
  const collection = await pb.collections.getOne('profiles');
  console.log(`Found collection: ${collection.name} (${collection.id})`);

  // PocketBase v0.21+ uses `fields`; older versions use `schema`
  const fieldsKey = Array.isArray(collection.fields) ? 'fields' : 'schema';
  const fields = collection[fieldsKey];
  console.log(`Using key: ${fieldsKey}, field count: ${fields?.length ?? 'undefined'}`);

  if (!Array.isArray(fields)) {
    // Last resort: dump the collection shape so we can see what's available
    console.error('Could not find fields/schema array. Collection keys:', Object.keys(collection));
    process.exit(1);
  }

  let changed = false;
  const updatedFields = fields.map((field) => {
    if (FIELDS_TO_FIX.includes(field.name)) {
      if (field.required) {
        console.log(`  📝  Setting ${field.name} required → false`);
        changed = true;
        return { ...field, required: false };
      } else {
        console.log(`  ✓   ${field.name} is already optional`);
      }
    }
    return field;
  });

  if (!changed) {
    console.log('\n✅  Nothing to change — all target fields already optional.');
    process.exit(0);
  }

  // ── Apply the schema update — try both `fields` and `schema` keys ──────
  try {
    await pb.collections.update(collection.id, { [fieldsKey]: updatedFields });
  } catch {
    // Fallback: some PB versions accept only `schema`
    await pb.collections.update(collection.id, { schema: updatedFields });
  }
  console.log('\n✅  profiles collection updated — sunDrops and giftsReceived are now optional.');
  console.log('    New users can be created with sunDrops: 0 and giftsReceived: 0.');
}

run().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
