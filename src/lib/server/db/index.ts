/**
 * Database Client — Drizzle ORM over Postgres
 *
 * Single export: `db` — use this everywhere server-side.
 * Never import this from client-side code (SvelteKit enforces this via
 * the $lib/server/ path restriction).
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection pool — postgres-js manages the pool automatically
const client = postgres(process.env.DATABASE_URL!);

/**
 * Drizzle ORM instance.
 * All queries use this — e.g. `db.select().from(users).where(...)`
 */
export const db = drizzle(client, { schema });

// Re-export schema for convenience — callers can `import { db, users } from '$lib/server/db'`
export * from './schema';
