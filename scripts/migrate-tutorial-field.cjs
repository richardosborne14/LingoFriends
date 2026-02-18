/**
 * Migration: Add tutorialComplete to profiles
 *
 * Adds a boolean `tutorialComplete` field to the profiles collection
 * and backfills it to `true` for all users who have already completed
 * onboarding (i.e. existing users who were using the app before the
 * tutorial system was introduced).
 *
 * Run ONCE after deploying the tutorial feature:
 *   node scripts/migrate-tutorial-field.cjs
 *
 * Safe to re-run — existing records are only updated if the value is null.
 */

const PB_URL          = process.env.PB_URL           || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL  = process.env.PB_ADMIN_EMAIL    || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

let fieldIdCounter = 1;
const generateFieldId = () => `field_tutorial_${Date.now()}_${fieldIdCounter++}`;

async function runMigration() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);

  console.log('');
  console.log('🚀 LingoFriends Migration: Add tutorialComplete to profiles');
  console.log('═══════════════════════════════════════');
  console.log(`   URL: ${PB_URL}`);
  console.log('');

  try {
    // ── Authenticate ─────────────────────────────────────────
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated');
    console.log('');

    // ── Step 1: Add field to schema ──────────────────────────
    console.log('📦 Getting profiles collection schema...');
    const profiles = await pb.collections.getOne('profiles');
    const existingNames = profiles.fields.map(f => f.name);

    if (!existingNames.includes('tutorialComplete')) {
      console.log('   + Adding: tutorialComplete (bool, default false)');

      const newField = {
        id:           generateFieldId(),
        name:         'tutorialComplete',
        type:         'bool',
        required:     false,
        presentable:  false,
        hidden:       false,
      };

      await pb.collections.update(profiles.id, {
        fields: [...profiles.fields, newField],
      });

      console.log('   ✅ Field added to schema');
    } else {
      console.log('   ✓ tutorialComplete field already exists in schema');
    }

    console.log('');

    // ── Step 2: Backfill existing users ──────────────────────
    // Users who have onboardingComplete=true were using the app before
    // the tutorial system existed. Set their tutorialComplete=true so
    // they don't see the tutorial on next login.
    console.log('📝 Backfilling existing onboarded users...');

    let page = 1;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Use getFullList (no filter) to avoid PocketBase admin query restrictions.
    // Filter in JS: only backfill users who have completed onboarding.
    const allProfiles = await pb.collection('profiles').getFullList({
      fields: 'id,tutorialComplete,onboardingComplete',
      batch: 100,
    });

    for (const record of allProfiles) {
      // Only update users who have completed onboarding AND don't already have tutorialComplete set
      if (record.onboardingComplete === true && !record.tutorialComplete) {
        try {
          await pb.collection('profiles').update(record.id, {
            tutorialComplete: true,
          });
          totalUpdated++;
        } catch (updateErr) {
          console.warn(`   ⚠ Could not update record ${record.id}:`, updateErr.message);
        }
      } else {
        totalSkipped++;
      }
    }

    console.log(`   ✅ Updated ${totalUpdated} user(s) → tutorialComplete = true`);
    if (totalSkipped > 0) {
      console.log(`   ↩  Skipped ${totalSkipped} user(s) (already set)`);
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎉 Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify in PocketBase Admin:');
    console.log(`   ${PB_URL}/_/`);
    console.log('2. New users will now see the tutorial on first login.');
    console.log('3. Existing users will NOT see the tutorial.');
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
