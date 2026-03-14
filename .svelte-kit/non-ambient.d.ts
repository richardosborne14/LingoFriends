
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(auth)" | "/(app)" | "/" | "/api" | "/(app)/friends" | "/(app)/garden" | "/(app)/lesson" | "/(app)/lesson/[id]" | "/(auth)/login" | "/(auth)/onboarding" | "/(app)/profile" | "/(auth)/register";
		RouteParams(): {
			"/(app)/lesson/[id]": { id: string }
		};
		LayoutParams(): {
			"/(auth)": Record<string, never>;
			"/(app)": { id?: string };
			"/": { id?: string };
			"/api": Record<string, never>;
			"/(app)/friends": Record<string, never>;
			"/(app)/garden": Record<string, never>;
			"/(app)/lesson": { id?: string };
			"/(app)/lesson/[id]": { id: string };
			"/(auth)/login": Record<string, never>;
			"/(auth)/onboarding": Record<string, never>;
			"/(app)/profile": Record<string, never>;
			"/(auth)/register": Record<string, never>
		};
		Pathname(): "/" | "/friends" | "/garden" | `/lesson/${string}` & {} | "/login" | "/onboarding" | "/profile" | "/register";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/audio/.gitkeep" | "/fonts/.gitkeep" | "/models/.gitkeep" | "/sprites/.gitkeep" | string & {};
	}
}