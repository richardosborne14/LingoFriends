/**
 * Database Client — Drizzle ORM over Postgres
 *
 * Single export: `db` — use this everywhere server-side.
 * Never import this from client-side code (SvelteKit enforces this via
 * the $lib/server/ path restriction).
 *
 * WHY $env/static/private: Vite does not inject .env file values into
 * process.env for server-side modules. SvelteKit's $env/static/private
 * is the correct way to access server-side private env vars in SvelteKit.
 * Falls back to process.env for compatibility with CLI tools (drizzle-kit,
 * seed scripts) that run outside of SvelteKit's Vite context.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use SvelteKit's env system in the SvelteKit context; fall back to
// process.env when running via drizzle-kit, seed scripts, or tests.
let databaseUrl: string;
try {
	// Dynamic import to avoid breaking drizzle-kit and seed scripts which
	// run outside SvelteKit's module resolution context
	const { DATABASE_URL } = await import('$env/static/private');
	databaseUrl = DATABASE_URL;
} catch {
	// Outside SvelteKit (drizzle-kit, tsx seed, vitest) — use process.env
	databaseUrl = process.env.DATABASE_URL!;
}

if (!databaseUrl) {
	throw new Error('[db] DATABASE_URL is not set. Check your .env file.');
}

// Connection pool — postgres-js manages the pool automatically
const client = postgres(databaseUrl);

/**
 * Drizzle ORM instance.
 * All queries use this — e.g. `db.select().from(users).where(...)`
 */
export const db = drizzle(client, { schema });

// Re-export schema for convenience — callers can `import { db, users } from '$lib/server/db'`
export * from './schema';
