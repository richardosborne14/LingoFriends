/**
 * LingoFriends - PocketBase Schema Audit
 * 
 * Checks all collections needed by the app against what actually exists in PB.
 * Run with: node scripts/audit-pb-schema.cjs
 */

const PB_URL = process.env.PB_URL || 'https://pocketbase-story.digitalbricks.io';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'richard@digitalbricks.io';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '6gSe5B7N6dPgkCtiMaTfYFDJ';

// All collections the app expects to exist, with their critical fields
const EXPECTED_COLLECTIONS = {
  // ── Phase 1.0 core ─────────────────────────────────────────
  profiles: {
    phase: '1.0',
    criticalFields: ['user', 'displayName', 'targetLanguage', 'nativeLanguage'],
  },
  sessions: {
    phase: '1.0',
    criticalFields: ['user', 'language', 'messages'],
  },
  // ── Phase 1.1 game ─────────────────────────────────────────
  user_trees: {
    phase: '1.1',
    criticalFields: ['user', 'skillPathId', 'name', 'icon', 'status', 'health', 'lastRefreshDate', 'position'],
  },
  garden_objects: {
    phase: '1.1',
    criticalFields: ['user', 'objectType', 'position'],
  },
  seeds: {
    phase: '1.1',
    criticalFields: ['user', 'seedType', 'quantity'],
  },
  gems: {
    phase: '1.1',
    criticalFields: ['user', 'amount'],
  },
  friendships: {
    phase: '1.1',
    criticalFields: ['user1', 'user2', 'status'],
  },
  friend_codes: {
    phase: '1.1',
    criticalFields: ['user', 'code'],
  },
  gifts: {
    phase: '1.1',
    criticalFields: ['sender', 'recipient', 'giftType'],
  },
  daily_progress: {
    phase: '1.1',
    criticalFields: ['user', 'date', 'sunDropsEarned'],
  },
  // ── Phase 1.2 pedagogy ─────────────────────────────────────
  topics: {
    phase: '1.2',
    criticalFields: ['name', 'target_language', 'chunk_count'],
  },
  chunk_library: {
    phase: '1.2',
    criticalFields: ['text', 'translation', 'chunk_type', 'target_language', 'difficulty', 'frequency'],
  },
  user_chunks: {
    phase: '1.2',
    // These are the ones causing 400 errors — user and chunk are RELATION fields
    criticalFields: ['user', 'chunk', 'status', 'ease_factor', 'interval', 'next_review_date', 'confidence_score'],
  },
  learner_profiles: {
    phase: '1.2',
    criticalFields: ['user', 'native_language', 'target_language', 'current_level'],
  },
  skill_paths: {
    phase: '1.2',
    criticalFields: ['user', 'language', 'topic', 'lessonTitles'],
  },
};

async function runAudit() {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase(PB_URL);

  console.log('');
  console.log('🔍 LingoFriends — PocketBase Schema Audit');
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

  // Fetch all collections
  let allCollections = [];
  try {
    allCollections = await pb.collections.getFullList();
  } catch (e) {
    console.error('❌ Failed to list collections:', e.message);
    process.exit(1);
  }

  const collectionMap = {};
  for (const col of allCollections) {
    collectionMap[col.name] = col;
  }

  // ── Audit each expected collection ─────────────────────────
  const issues = [];
  let passCount = 0;
  let failCount = 0;

  const phases = ['1.0', '1.1', '1.2'];
  for (const phase of phases) {
    const phaseCollections = Object.entries(EXPECTED_COLLECTIONS)
      .filter(([, v]) => v.phase === phase);
    
    console.log(`── Phase ${phase} ────────────────────────────────────────────`);
    
    for (const [name, spec] of phaseCollections) {
      const col = collectionMap[name];
      
      if (!col) {
        console.log(`  ❌ MISSING   ${name}`);
        issues.push({ collection: name, issue: 'Collection does not exist', severity: 'CRITICAL' });
        failCount++;
        continue;
      }

      // Map field names from this collection
      const fieldNames = col.fields.map(f => f.name);
      
      // Check critical fields
      const missingFields = spec.criticalFields.filter(f => !fieldNames.includes(f));
      
      if (missingFields.length > 0) {
        console.log(`  ⚠️  PARTIAL   ${name}`);
        console.log(`             Missing fields: ${missingFields.join(', ')}`);
        missingFields.forEach(f => {
          issues.push({ collection: name, issue: `Missing field: ${f}`, severity: 'HIGH' });
        });
        failCount++;
      } else {
        console.log(`  ✅ OK        ${name}`);
        passCount++;
      }

      // Extra detail for critical collections
      if (name === 'user_trees' || name === 'user_chunks' || name === 'skill_paths') {
        console.log(`             Fields: ${fieldNames.join(', ')}`);
        console.log(`             listRule: ${col.listRule ?? '(null/open)'}`);
        console.log(`             viewRule: ${col.viewRule ?? '(null/open)'}`);
        
        // Check if 'user' field is a relation (not just text)
        const userField = col.fields.find(f => f.name === 'user');
        if (userField) {
          const isRelation = userField.type === 'relation';
          console.log(`             user field type: ${userField.type}${isRelation ? ' ✅' : ' ⚠️ (should be relation)'}`);
          if (!isRelation) {
            issues.push({ 
              collection: name, 
              issue: `'user' field is type '${userField.type}' — should be 'relation' to _pb_users_auth_`, 
              severity: 'HIGH' 
            });
          }
        }

        // For user_chunks, also check chunk relation
        if (name === 'user_chunks') {
          const chunkField = col.fields.find(f => f.name === 'chunk');
          if (chunkField) {
            console.log(`             chunk field type: ${chunkField.type}${chunkField.type === 'relation' ? ' ✅' : ' ⚠️'}`);
          }
        }
      }
    }
    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 Results: ${passCount} OK, ${failCount} with issues`);
  console.log('');
  
  if (issues.length === 0) {
    console.log('🎉 Schema looks healthy! The 400 errors may be API rule issues.');
    console.log('');
    console.log('Next step: Check API rules on user_trees and user_chunks in PB Admin UI.');
  } else {
    console.log(`⚠️  Found ${issues.length} issue(s):\n`);
    
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    const high = issues.filter(i => i.severity === 'HIGH');
    
    if (critical.length > 0) {
      console.log('🔴 CRITICAL (collections missing — need migration):');
      critical.forEach(i => console.log(`   • [${i.collection}] ${i.issue}`));
      console.log('');
    }
    
    if (high.length > 0) {
      console.log('🟡 HIGH (fields missing or wrong type):');
      high.forEach(i => console.log(`   • [${i.collection}] ${i.issue}`));
      console.log('');
    }
    
    // Recommend fix scripts
    const missingCollections = critical.map(i => i.collection);
    const scripts = new Set();
    
    if (missingCollections.some(c => ['profiles', 'sessions'].includes(c))) {
      scripts.add('node scripts/setup-pocketbase.cjs');
    }
    if (missingCollections.some(c => ['user_trees', 'garden_objects', 'seeds', 'gems', 'friendships', 'friend_codes', 'gifts', 'daily_progress'].includes(c))) {
      scripts.add('node scripts/migrate-game-schema.cjs');
    }
    if (missingCollections.some(c => ['topics', 'chunk_library', 'user_chunks', 'learner_profiles'].includes(c)) ||
        issues.some(i => ['user_chunks', 'chunk_library', 'topics', 'learner_profiles'].includes(i.collection))) {
      scripts.add('node scripts/migrate-pedagogy-schema.cjs');
    }
    if (missingCollections.some(c => ['skill_paths'].includes(c))) {
      scripts.add('node scripts/migrate-skill-paths-collection.cjs');
    }
    if (issues.some(i => i.collection === 'gems')) {
      scripts.add('node scripts/migrate-gems-currency.cjs');
    }
    if (issues.some(i => i.collection === 'seeds')) {
      scripts.add('node scripts/migrate-seeds.cjs');
    }
    
    if (scripts.size > 0) {
      console.log('🔧 Run these migration scripts to fix:');
      [...scripts].forEach(s => console.log(`   ${s}`));
    }
  }

  console.log('');
  
  // Also list ALL collections found in PB (useful for spotting orphans/typos)
  console.log('── All collections in PocketBase ──────────────────');
  const nonSystem = allCollections.filter(c => !c.name.startsWith('_'));
  nonSystem.forEach(c => {
    const isExpected = !!EXPECTED_COLLECTIONS[c.name];
    console.log(`  ${isExpected ? '  ' : '❓'} ${c.name} (${c.fields.length} fields)`);
  });
  console.log('');
}

runAudit().catch(console.error);
