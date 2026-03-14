/**
 * SvelteKit App Type Declarations
 *
 * Typed locals injected by hooks.server.ts on every request.
 * Auth objects come from Lucia — see src/lib/server/auth/lucia.ts (Task 0.4).
 */

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}

		interface Locals {
			/** Authenticated user — null if not logged in */
			user: import('lucia').User | null;
			/** Current session — null if not logged in */
			session: import('lucia').Session | null;
		}

		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
