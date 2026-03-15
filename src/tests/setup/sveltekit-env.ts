/**
 * Mock for SvelteKit's `$env/static/private` in the Vitest environment.
 *
 * WHY THIS EXISTS:
 * SvelteKit's `$env/static/private` is a virtual module provided by Vite's
 * plugin at runtime. In Vitest (which runs in Node, not inside the SvelteKit
 * server context), the module doesn't exist — any file that imports it causes:
 *   "Failed to resolve import '$env/static/private'"
 *
 * This stub file is aliased in vitest.config.ts so that all server-side modules
 * (db/index.ts, ai/router.ts, etc.) can be imported in unit tests without
 * requiring a real .env file or live database connection.
 *
 * SAFETY: These are placeholder values. No real credentials, no real DB.
 * The actual values are injected by SvelteKit at runtime — this file
 * is ONLY loaded during Vitest runs (via the alias in vitest.config.ts).
 *
 * @module tests/setup/sveltekit-env
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stub database URL — satisfies modules that import it at the top level
 * (e.g. src/lib/server/db/index.ts). No actual DB connection is made in tests
 * because the db client itself is mocked via vi.mock('$lib/server/db') in
 * individual test files.
 */
export const DATABASE_URL = 'postgres://test:test@localhost:5432/lingofriends_test';

// ─────────────────────────────────────────────────────────────────────────────
// AI PROVIDER KEYS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stub Groq key — used by ai/router.ts when building a GroqProvider.
 * The actual provider classes are mocked in router.test.ts so this
 * value is never sent over the network.
 */
export const GROQ_API_KEY = 'test-groq-key-not-real';

/**
 * Stub Anthropic key — must start with 'sk-ant-' AND be > 20 chars for
 * hasAnthropicKey() to return true (which the router tests rely on).
 * The HaikuProvider class is mocked in router.test.ts so no API call is made.
 */
export const ANTHROPIC_API_KEY = 'sk-ant-test-placeholder-not-a-real-key-at-all';

// ─────────────────────────────────────────────────────────────────────────────
// TTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stub Google TTS key — used by server/tts/googleTTS.ts.
 * The TTS module is mocked in its own test file so this never reaches Google.
 */
export const GOOGLE_TTS_API_KEY = 'test-google-tts-key-not-real';
