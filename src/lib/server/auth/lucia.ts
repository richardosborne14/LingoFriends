/**
 * Lucia Auth — Session Management
 *
 * Lucia v3 handles session creation, validation, and deletion.
 * We use the Drizzle adapter so sessions live in Postgres alongside user data.
 *
 * Usage (in server files):
 *   import { lucia } from '$lib/server/auth/lucia';
 *   const session = await lucia.createSession(userId, {});
 *   const cookie = lucia.createSessionCookie(session.id);
 */

import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db, sessions, users } from '../db';

// Wire Lucia to the Drizzle sessions + users tables
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		// Session cookies never expire — they're cleared on logout
		attributes: {
			secure: process.env.NODE_ENV === 'production',
		},
	},
	getUserAttributes(attributes) {
		// These fields are available on session.user in hooks/endpoints
		return {
			email: attributes.email,
			username: attributes.username,
			displayName: attributes.displayName,
			friendCode: attributes.friendCode,
		};
	},
});

// Extend Lucia's types to include our user attributes (required by Lucia v3)
declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	email: string;
	username: string;
	displayName: string;
	friendCode: string;
}
