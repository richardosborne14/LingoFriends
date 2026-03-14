/**
 * SvelteKit App Type Declarations
 *
 * Defines the shape of `locals`, `pageData`, `pageState`, and `platform`.
 * `locals` is populated in hooks.server.ts on every request.
 */

import type { User, Session } from 'lucia';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// Available as `event.locals` in server load functions and endpoints
		interface Locals {
			user: User | null;
			session: Session | null;
		}

		// Available as `$page.data` — populated by root +layout.server.ts
		interface PageData {
			user?: User | null;
		}

		// interface Error {}
		// interface Platform {}
		// interface PageState {}
	}
}

export {};
