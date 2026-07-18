/**
 * EventBus.ts — Typed event bridge between Svelte and Phaser.
 *
 * WHY this exists (TASK-FUN-02 locked decision):
 * Svelte owns all UI (panels, modals, HUD); Phaser only renders the world.
 * The two sides never hold references to each other's internals — they talk
 * exclusively through this bus:
 *
 *   Phaser → Svelte: world events ('tree-selected', 'ground-tap', …)
 *   Svelte → Phaser: (future) commands via scene registry — NOT via this bus,
 *                    so the bus stays a one-way "things happened" channel and
 *                    we never build a two-way spaghetti protocol.
 *
 * WHY a hand-rolled 30-line emitter instead of mitt/nanoevents:
 * Zero dependencies, full TypeScript inference on event payloads, and we
 * control the semantics (e.g. clear() for scene teardown). mitt would give
 * us the same thing minus the typed `clear`, at the cost of a dependency.
 *
 * WHY a factory (createEventBus) instead of a module-level singleton:
 * Each WorldCanvas instance gets its OWN bus, so navigating
 * garden → lesson → garden can never leak listeners from a destroyed
 * canvas into a fresh one (the leak class of bug we hit with Three.js).
 */

/**
 * Every event the world can emit, with its payload type.
 * `void` = no payload.
 *
 * Add new events HERE first — the compiler then enforces correct payloads
 * on both the Phaser (emit) and Svelte (on) sides.
 */
export interface WorldEvents {
	/** A learning tree was tapped/clicked. Payload = tree DB id. */
	'tree-selected': string;
	/** Empty ground was tapped — avatar starts walking there. Payload = tile coords. */
	'ground-tap': { tileX: number; tileY: number };
	/** BootScene finished loading + compositing — world is visible. */
	'world-ready': void;
	/** Reserved for TASK-FUN-04/05 (visiting + battles). */
	'plot-entered': string;
	'npc-reached': string;
}

/** Listener signature for a given event key. */
type Listener<K extends keyof WorldEvents> = (payload: WorldEvents[K]) => void;

/** The bus object — see createEventBus() for semantics. */
export interface WorldEventBus {
	on<K extends keyof WorldEvents>(event: K, fn: Listener<K>): void;
	off<K extends keyof WorldEvents>(event: K, fn: Listener<K>): void;
	emit<K extends keyof WorldEvents>(
		event: K,
		...payload: WorldEvents[K] extends void ? [] : [WorldEvents[K]]
	): void;
	/** Removes every listener — called from WorldCanvas onDestroy. */
	clear(): void;
}

/**
 * Creates a fresh, isolated event bus.
 *
 * Listeners are stored in a Map<eventName, Set<fn>> — Set gives us free
 * dedup (double-`on` with the same fn fires once) and O(1) `off`.
 */
export function createEventBus(): WorldEventBus {
	// Map value is a Set of untyped listeners; the public API layer above
	// guarantees payload/listener agreement, so the internal cast is safe.
	const listeners = new Map<string, Set<(payload: unknown) => void>>();

	return {
		on(event, fn) {
			if (!listeners.has(event)) listeners.set(event, new Set());
			listeners.get(event)!.add(fn as (payload: unknown) => void);
		},

		off(event, fn) {
			listeners.get(event)?.delete(fn as (payload: unknown) => void);
		},

		emit(event, ...payload) {
			// Copy to array before iterating — a listener that calls off()
			// mid-emit must not mutate the set we're iterating over.
			const fns = listeners.get(event);
			if (!fns) return;
			for (const fn of [...fns]) {
				fn(payload[0]);
			}
		},

		clear() {
			listeners.clear();
		},
	};
}
