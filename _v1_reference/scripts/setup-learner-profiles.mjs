#!/usr/bin/env node
/**
 * LingoFriends — Setup learner_profiles collection
 *
 * Creates the learner_profiles PocketBase collection required by the
 * Phase 1.2 pedagogy pipeline. Safe to re-run — skips if already exists.
 *
 * Usage:
 *   node scripts/setup-learner-profiles.mjs
 *
 * Requires:
 *   VITE_POCKETBASE_URL    — your PocketBase instance URL
 *   PB_ADMIN_EMAIL         — admin email (or set in .env)
 *   PB_ADMIN_PASSWORD      — admin password (or set in .env)
 *
 * Environment variables are loaded from .env automatically.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env not found — use existing env vars
  }
}

loadEnv();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!PB_URL) {
  console.error('❌  VITE_POCKETBASE_URL is not set');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌  PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD are not set');
  console.error('    Add them to your .env file:');
  console.error('      PB_ADMIN_EMAIL=admin@example.com');
  console.error('      PB_ADMIN_PASSWORD=yourpassword');
  process.exit(1);
}

// ── PocketBase Admin API helpers ─────────────────────────────────

let adminToken = null;

async function adminLogin() {
  // PocketBase v0.22+ moved admin auth from /api/admins/ to /api/collections/_superusers/
  // Try new path first, fall back to legacy path.
  const newPath = `${PB_URL}/api/collections/_superusers/auth-with-password`;
  const legacyPath = `${PB_URL}/api/admins/auth-with-password`;

  for (const [label, url] of [['v0.22+', newPath], ['legacy', legacyPath]]) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (res.ok) {
      const data = await res.json();
      // v0.22+ returns { token, record } — legacy returns { token, admin }
      adminToken = data.token;
      console.log(`✅  Logged in as admin (${label} API)`);
      return;
    }
    const body = await res.text();
    console.log(`   ↳ ${label} path: ${res.status} — ${body.slice(0, 80)}`);
  }
  throw new Error('Admin login failed on both v0.22+ and legacy paths. Check credentials.');
}

async function apiCall(method, path, body) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': adminToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} /${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function collectionExists(name) {
  try {
    await apiCall('GET', `collections/${name}`);
    return true;
  } catch {
    return false;
  }
}

// ── Collection definitions ────────────────────────────────────────

/**
 * learner_profiles collection schema.
 *
 * Stores per-user pedagogy state: level, confidence, interests, etc.
 * One record per user. Owner read/write only.
 */
const LEARNER_PROFILES_SCHEMA = {
  name: 'learner_profiles',
  type: 'base',
  schema: [
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
    },
    { name: 'native_language', type: 'text', required: false, options: { min: null, max: 5, pattern: '' } },
    { name: 'target_language', type: 'text', required: false, options: { min: null, max: 5, pattern: '' } },
    { name: 'current_level', type: 'number', required: false, options: { min: 0, max: 100 } },
    { name: 'level_history', type: 'json', required: false },
    { name: 'total_chunks_encountered', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'chunks_acquired', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'chunks_learning', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'chunks_fragile', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'explicit_interests', type: 'json', required: false },
    { name: 'detected_interests', type: 'json', required: false },
    { name: 'average_confidence', type: 'number', required: false, options: { min: 0, max: 1 } },
    { name: 'confidence_history', type: 'json', required: false },
    { name: 'total_sessions', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'total_time_minutes', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'average_session_length', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'help_request_rate', type: 'number', required: false, options: { min: 0, max: 1 } },
    { name: 'wrong_answer_rate', type: 'number', required: false, options: { min: 0, max: 1 } },
    { name: 'preferred_activity_types', type: 'json', required: false },
    { name: 'preferred_session_length', type: 'number', required: false, options: { min: 1, max: 60 } },
    { name: 'last_reflection_prompt', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
    { name: 'coaching_notes', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
    { name: 'filter_risk_score', type: 'number', required: false, options: { min: 0, max: 1 } },
    { name: 'last_struggle_date', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
  ],
  // Owner can read and write their own record
  listRule: '@request.auth.id != "" && user = @request.auth.id',
  viewRule: '@request.auth.id != "" && user = @request.auth.id',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.id != "" && user = @request.auth.id',
  deleteRule: null,
};

/**
 * chunk_library collection schema.
 *
 * Stores AI-generated lexical chunks for the pedagogy engine.
 * Authenticated users can read; only the system/admin creates chunks.
 */
const CHUNK_LIBRARY_SCHEMA = {
  name: 'chunk_library',
  type: 'base',
  schema: [
    { name: 'text', type: 'text', required: true, options: { min: null, max: 200, pattern: '' } },
    { name: 'translation', type: 'text', required: true, options: { min: null, max: 200, pattern: '' } },
    { name: 'target_language', type: 'text', required: true, options: { min: null, max: 5, pattern: '' } },
    { name: 'native_language', type: 'text', required: false, options: { min: null, max: 5, pattern: '' } },
    { name: 'chunk_type', type: 'text', required: false, options: { min: null, max: 50, pattern: '' } },
    { name: 'difficulty', type: 'number', required: false, options: { min: 1, max: 5 } },
    { name: 'cefr_level', type: 'text', required: false, options: { min: null, max: 10, pattern: '' } },
    { name: 'topic', type: 'text', required: false, options: { min: null, max: 100, pattern: '' } },
    { name: 'example_sentence', type: 'text', required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'notes', type: 'text', required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'tags', type: 'json', required: false },
    { name: 'audio_url', type: 'text', required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'image_url', type: 'text', required: false, options: { min: null, max: 500, pattern: '' } },
    { name: 'usage_count', type: 'number', required: false, options: { min: 0, max: null } },
  ],
  listRule: '@request.auth.id != ""',
  viewRule: '@request.auth.id != ""',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.id != ""',
  deleteRule: null,
};

/**
 * user_chunks collection schema.
 *
 * Tracks per-user chunk learning state (SRS data).
 * Owner read/write only.
 */
const USER_CHUNKS_SCHEMA = {
  name: 'user_chunks',
  type: 'base',
  schema: [
    {
      name: 'user',
      type: 'relation',
      required: true,
      options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
    },
    { name: 'chunk_id', type: 'text', required: true, options: { min: null, max: 50, pattern: '' } },
    { name: 'status', type: 'text', required: false, options: { min: null, max: 20, pattern: '' } },
    { name: 'encounter_count', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'correct_count', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'incorrect_count', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'confidence', type: 'number', required: false, options: { min: 0, max: 1 } },
    { name: 'last_seen', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
    { name: 'next_review', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
    { name: 'srs_interval', type: 'number', required: false, options: { min: 0, max: null } },
    { name: 'srs_ease_factor', type: 'number', required: false, options: { min: 1, max: 5 } },
    { name: 'streak', type: 'number', required: false, options: { min: 0, max: null } },
  ],
  listRule: '@request.auth.id != "" && user = @request.auth.id',
  viewRule: '@request.auth.id != "" && user = @request.auth.id',
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.id != "" && user = @request.auth.id',
  deleteRule: '@request.auth.id != "" && user = @request.auth.id',
};

// ── Main ─────────────────────────────────────────────────────────

const COLLECTIONS = [
  { name: 'learner_profiles', schema: LEARNER_PROFILES_SCHEMA },
  { name: 'chunk_library', schema: CHUNK_LIBRARY_SCHEMA },
  { name: 'user_chunks', schema: USER_CHUNKS_SCHEMA },
];

async function run() {
  console.log(`\n🚀  Setting up pedagogy collections on ${PB_URL}\n`);

  await adminLogin();

  for (const { name, schema } of COLLECTIONS) {
    process.stdout.write(`   ${name.padEnd(25)} ... `);

    const exists = await collectionExists(name);
    if (exists) {
      console.log('✅  already exists (skipped)');
      continue;
    }

    try {
      await apiCall('POST', 'collections', schema);
      console.log('✅  created');
    } catch (err) {
      console.log(`❌  failed`);
      console.error(`      ${err.message}`);
    }
  }

  console.log('\n✅  Done! Refresh the PocketBase Admin UI to see the new collections.\n');
}

run().catch(err => {
  console.error('\n💥  Fatal error:', err.message);
  process.exit(1);
});
