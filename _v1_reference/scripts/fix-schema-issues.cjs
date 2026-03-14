/**
 * LingoFriends - Schema Fix Migration
 * 
 * Fixes all issues found by audit-pb-schema.cjs:
 * 
 * 1. user_trees: Add `created` index (FIXES the refresh loop 400 error)
 * 2. user_trees: Add missing skillPathId, name, icon, giftsReceived fields
 * 3. skill_paths: Add user, topic, lessonTitles fields + fix API rules
 * 4. seeds: Create missing collection
 * 5. gems: Create missing collection
 * 
 * Run with: node scripts/fix-schema-issues.cjs
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

let fieldIdCounter = 100;
const makeFieldId = (name) => `fix_${name}_${Date.now()}_${fieldIdCounter++}`;

function textField(name, required = false, maxLen = 500) {
  return {
    id: makeFieldId(name),
    name,
    type: 'text',
    required,
    presentable: false,
    hidden: false,
    min: 0,
    max: maxLen,
    pattern: '',
  };
}

function numberField(name, required = false, opts = {}) {
  return {
    id: makeFieldId(name),
    name,
    type: 'number',
    required,
    presentable: false,
    hidden: false,
    min: opts.min ?? null,
    max: opts.max ?? null,
    onlyInt: opts.onlyInt ?? false,
  };
}

function jsonField(name, required = false) {
  return {
    id: makeFieldId(name),
    name,
    type: 'json',
    required,
    presentable: false,
    hidden: false,
    maxSize: 2000000,
  };
}

function selectField(name, values, required = false) {
  return {
    id: makeFieldId(name),
    name,
    type: 'select',
    required,
    presentable: false,
    hidden: false,
    maxSelect: 1,
    values,
  };
}

function relationField(name, collectionId, required = false) {
  return {
    id: makeFieldId(name),
    name,
    type: 'relation',
    required,
    presentable: false,
    hidden: false,
    collectionId,
    cascadeDelete: false,
    minSelect: 0,
    maxSelect: 1,
  };
}

// ============================================================================
// MAIN FIX RUNNER
// ============================================================================

async function runFixes() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);

  console.log('');
  console.log('🔧 LingoFriends — Schema Fix Migration');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Instance: ${PB_URL}`);
  console.log('');

  // Auth
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as admin\n');
  } catch (e) {
    console.error('❌ Auth failed:', e.message);
    process.exit(1);
  }

  // ── FIX 1: user_trees — add created index + missing fields ──────────────
  console.log('── Fix 1: user_trees ───────────────────────────────────────');
  await fixUserTrees(pb);
  console.log('');

  // ── FIX 2: skill_paths — add user/topic/lessonTitles + auth rules ────────
  console.log('── Fix 2: skill_paths ──────────────────────────────────────');
  await fixSkillPaths(pb);
  console.log('');

  // ── FIX 3: seeds — create collection ─────────────────────────────────────
  console.log('── Fix 3: seeds collection ─────────────────────────────────');
  await createSeedsCollection(pb);
  console.log('');

  // ── FIX 4: gems — create collection ──────────────────────────────────────
  console.log('── Fix 4: gems collection ──────────────────────────────────');
  await createGemsCollection(pb);
  console.log('');

  // ── VERIFY: Re-run key queries to confirm fixes ────────────────────────── 
  console.log('── Verification ────────────────────────────────────────────');
  await verify(pb);

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Fix migration complete!');
  console.log('');
  console.log('The refresh loop should now be resolved.');
  console.log('New users will get an empty garden (200 OK) instead of 400.');
  console.log('');
}

// ============================================================================
// FIX 1: user_trees
// ============================================================================

async function fixUserTrees(pb) {
  try {
    const col = await pb.collections.getOne('user_trees');
    const existingFieldNames = col.fields.map(f => f.name);
    
    console.log('  Current fields:', existingFieldNames.join(', '));
    
    let needsUpdate = false;
    const updatedFields = [...col.fields];

    // ── Add skillPathId (text) if not present ──────────────────────────────
    // The collection has 'skillPath' (a relation field from the old schema).
    // The app code expects 'skillPathId' as a plain text field (stores the ID).
    // We add skillPathId as text so create/update calls work.
    if (!existingFieldNames.includes('skillPathId')) {
      updatedFields.push(textField('skillPathId', false, 100));
      console.log('  + Adding skillPathId field');
      needsUpdate = true;
    } else {
      console.log('  ✓ skillPathId already exists');
    }

    // ── Add name field ─────────────────────────────────────────────────────
    if (!existingFieldNames.includes('name')) {
      updatedFields.push(textField('name', false, 200));
      console.log('  + Adding name field');
      needsUpdate = true;
    } else {
      console.log('  ✓ name already exists');
    }

    // ── Add icon field ─────────────────────────────────────────────────────
    if (!existingFieldNames.includes('icon')) {
      updatedFields.push(textField('icon', false, 20));
      console.log('  + Adding icon field');
      needsUpdate = true;
    } else {
      console.log('  ✓ icon already exists');
    }

    // ── Add giftsReceived JSON field ───────────────────────────────────────
    if (!existingFieldNames.includes('giftsReceived')) {
      updatedFields.push(jsonField('giftsReceived', false));
      console.log('  + Adding giftsReceived field');
      needsUpdate = true;
    } else {
      console.log('  ✓ giftsReceived already exists');
    }

    // ── Add sunDropsEarned field (per-tree earned sundrops) ────────────────
    if (!existingFieldNames.includes('sunDropsEarned')) {
      updatedFields.push(numberField('sunDropsEarned', false, { min: 0, onlyInt: true }));
      console.log('  + Adding sunDropsEarned field');
      needsUpdate = true;
    } else {
      console.log('  ✓ sunDropsEarned already exists');
    }

    // ── Add bufferDays field (gift buffer for health) ─────────────────────
    if (!existingFieldNames.includes('bufferDays')) {
      updatedFields.push(numberField('bufferDays', false, { min: 0, onlyInt: true }));
      console.log('  + Adding bufferDays field');
      needsUpdate = true;
    } else {
      console.log('  ✓ bufferDays already exists');
    }

    // ── Add gridPosition JSON field ────────────────────────────────────────
    if (!existingFieldNames.includes('gridPosition')) {
      updatedFields.push(jsonField('gridPosition', false));
      console.log('  + Adding gridPosition field');
      needsUpdate = true;
    } else {
      console.log('  ✓ gridPosition already exists');
    }

    // ── Update fields if needed ────────────────────────────────────────────
    if (needsUpdate) {
      await pb.collections.update(col.id, { fields: updatedFields });
      console.log('  ✅ Fields updated');
    }

    // ── Add created index (THE KEY FIX for sort=created 400 error) ─────────
    // PocketBase returns 400 when sorting by an unindexed field.
    // Adding this index fixes the refresh loop.
    console.log('  Adding created index...');
    const currentIndexes = col.indexes || [];
    const hasCreatedIndex = currentIndexes.some(idx => 
      idx.toLowerCase().includes('created') && idx.toLowerCase().includes('user_trees')
    );
    
    if (!hasCreatedIndex) {
      try {
        await pb.collections.update(col.id, {
          fields: updatedFields,
          indexes: [
            ...currentIndexes,
            'CREATE INDEX idx_user_trees_created ON user_trees (created)',
            'CREATE INDEX idx_user_trees_user ON user_trees (user)',
          ],
        });
        console.log('  ✅ Created index added — sort:created will now work');
      } catch (idxErr) {
        console.log('  ⚠️  Index add failed (may already exist):', idxErr.message);
        // Non-fatal — the index might already exist under a different name
      }
    } else {
      console.log('  ✓ created index already exists');
    }

  } catch (e) {
    console.error('  ❌ Fix 1 failed:', e.message);
    if (e.data) console.error('  Details:', JSON.stringify(e.data, null, 2));
  }
}

// ============================================================================
// FIX 2: skill_paths
// ============================================================================

async function fixSkillPaths(pb) {
  try {
    const col = await pb.collections.getOne('skill_paths');
    const existingFieldNames = col.fields.map(f => f.name);
    
    console.log('  Current fields:', existingFieldNames.join(', '));
    console.log('  Current listRule:', col.listRule ?? '(empty — public)');

    let needsUpdate = false;
    const updatedFields = [...col.fields];

    // ── Add user relation (optional — for user-specific paths) ──────────────
    // skill_paths are currently shared/global (no user field).
    // The app code sometimes filters by user. We add it as optional.
    if (!existingFieldNames.includes('user')) {
      updatedFields.push(relationField('user', '_pb_users_auth_', false));
      console.log('  + Adding user relation field (optional)');
      needsUpdate = true;
    } else {
      console.log('  ✓ user field already exists');
    }

    // ── Add topic field (text) ─────────────────────────────────────────────
    if (!existingFieldNames.includes('topic')) {
      updatedFields.push(textField('topic', false, 200));
      console.log('  + Adding topic field');
      needsUpdate = true;
    } else {
      console.log('  ✓ topic already exists');
    }

    // ── Add lessonTitles JSON (array of strings) ───────────────────────────
    // The existing 'lessons' field contains full lesson objects.
    // lessonTitles is a simpler string array some code paths expect.
    if (!existingFieldNames.includes('lessonTitles')) {
      updatedFields.push(jsonField('lessonTitles', false));
      console.log('  + Adding lessonTitles field');
      needsUpdate = true;
    } else {
      console.log('  ✓ lessonTitles already exists');
    }

    if (needsUpdate) {
      await pb.collections.update(col.id, { fields: updatedFields });
      console.log('  ✅ skill_paths fields updated');
    }

    // ── Fix API rules (currently empty = unauthenticated public access) ─────
    // skill_paths are shared content (not per-user) so public read is fine,
    // but writes should be admin-only.
    const needsRuleUpdate = !col.listRule || col.listRule === '';
    if (needsRuleUpdate) {
      await pb.collections.update(col.id, {
        listRule: '',   // Empty string = any authenticated or unauthenticated user can list
        viewRule: '',   // Public read — paths are shared content
        createRule: null,  // Admin only
        updateRule: null,  // Admin only  
        deleteRule: null,  // Admin only
      });
      console.log('  ✅ skill_paths API rules set (public read, admin write)');
    } else {
      console.log('  ✓ Rules already set');
    }

    // ── Add indexes ────────────────────────────────────────────────────────
    try {
      const currentIndexes = col.indexes || [];
      const hasLangIndex = currentIndexes.some(idx => idx.includes('language'));
      if (!hasLangIndex) {
        await pb.collections.update(col.id, {
          indexes: [
            ...currentIndexes,
            'CREATE INDEX idx_skill_paths_language ON skill_paths (language)',
            'CREATE INDEX idx_skill_paths_created ON skill_paths (created)',
          ],
        });
        console.log('  ✅ skill_paths indexes added');
      }
    } catch (idxErr) {
      console.log('  ⚠️  skill_paths index add failed:', idxErr.message);
    }

  } catch (e) {
    console.error('  ❌ Fix 2 failed:', e.message);
    if (e.data) console.error('  Details:', JSON.stringify(e.data, null, 2));
  }
}

// ============================================================================
// FIX 3: Create seeds collection
// ============================================================================

async function createSeedsCollection(pb) {
  // Check if already exists
  try {
    await pb.collections.getOne('seeds');
    console.log('  ✓ seeds collection already exists');
    return;
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  try {
    const created = await pb.collections.create({
      name: 'seeds',
      type: 'base',
      fields: [
        relationField('user', '_pb_users_auth_', true),
        textField('seedType', true, 100),
        numberField('quantity', true, { min: 0, onlyInt: true }),
      ],
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      indexes: [
        'CREATE INDEX idx_seeds_user ON seeds (user)',
        'CREATE UNIQUE INDEX idx_seeds_user_type ON seeds (user, seedType)',
        'CREATE INDEX idx_seeds_created ON seeds (created)',
      ],
    });
    console.log('  ✅ seeds collection created (id:', created.id + ')');
  } catch (e) {
    console.error('  ❌ Failed to create seeds:', e.message);
    if (e.data) console.error('  Details:', JSON.stringify(e.data, null, 2));
  }
}

// ============================================================================
// FIX 4: Create gems collection
// ============================================================================

async function createGemsCollection(pb) {
  // Check if already exists
  try {
    await pb.collections.getOne('gems');
    console.log('  ✓ gems collection already exists');
    return;
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  try {
    const created = await pb.collections.create({
      name: 'gems',
      type: 'base',
      fields: [
        relationField('user', '_pb_users_auth_', true),
        numberField('amount', true, { min: 0, onlyInt: true }),
        numberField('totalEarned', false, { min: 0, onlyInt: true }),
        numberField('totalSpent', false, { min: 0, onlyInt: true }),
      ],
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user = @request.auth.id',
      deleteRule: '@request.auth.id != "" && user = @request.auth.id',
      indexes: [
        'CREATE UNIQUE INDEX idx_gems_user ON gems (user)',
        'CREATE INDEX idx_gems_created ON gems (created)',
      ],
    });
    console.log('  ✅ gems collection created (id:', created.id + ')');
  } catch (e) {
    console.error('  ❌ Failed to create gems:', e.message);
    if (e.data) console.error('  Details:', JSON.stringify(e.data, null, 2));
  }
}

// ============================================================================
// VERIFICATION
// ============================================================================

async function verify(pb) {
  // Test 1: user_trees with sort:created (THE KEY FIX)
  try {
    const r = await pb.collection('user_trees').getList(1, 5, {
      filter: 'user != ""',
      sort: 'created',
    });
    console.log('  ✅ user_trees sort:created → OK (items:', r.totalItems + ')');
  } catch (e) {
    console.log('  ❌ user_trees sort:created still failing:', e.status, e.message);
    console.log('     → Will also apply code-level fix (remove sort from useGarden)');
  }

  // Test 2: skill_paths
  try {
    const r = await pb.collection('skill_paths').getList(1, 3);
    const col = await pb.collections.getOne('skill_paths');
    const hasLessonTitles = col.fields.some(f => f.name === 'lessonTitles');
    const hasUser = col.fields.some(f => f.name === 'user');
    console.log(`  ✅ skill_paths OK (lessonTitles: ${hasLessonTitles}, user field: ${hasUser})`);
  } catch (e) {
    console.log('  ❌ skill_paths:', e.message);
  }

  // Test 3: seeds and gems exist
  for (const colName of ['seeds', 'gems']) {
    try {
      await pb.collections.getOne(colName);
      console.log(`  ✅ ${colName} collection exists`);
    } catch {
      console.log(`  ❌ ${colName} still missing`);
    }
  }
}

runFixes().catch(console.error);
