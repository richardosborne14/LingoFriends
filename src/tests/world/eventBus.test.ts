/**
 * Tests for EventBus — TASK-FUN-02.
 *
 * The bus is the only channel between Phaser and Svelte, so its semantics
 * (dedup, off, clear, mid-emit mutation safety) must be nailed down.
 */

import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '$lib/world/EventBus';

describe('createEventBus', () => {
	it('delivers payloads to listeners', () => {
		const bus = createEventBus();
		const fn = vi.fn();
		bus.on('tree-selected', fn);
		bus.emit('tree-selected', 'tree-42');
		expect(fn).toHaveBeenCalledOnce();
		expect(fn).toHaveBeenCalledWith('tree-42');
	});

	it('supports void events (no payload)', () => {
		const bus = createEventBus();
		const fn = vi.fn();
		bus.on('world-ready', fn);
		bus.emit('world-ready');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('delivers structured payloads intact', () => {
		const bus = createEventBus();
		const fn = vi.fn();
		bus.on('ground-tap', fn);
		bus.emit('ground-tap', { tileX: 3, tileY: 7 });
		expect(fn).toHaveBeenCalledWith({ tileX: 3, tileY: 7 });
	});

	it('dedupes double-registration of the same listener', () => {
		const bus = createEventBus();
		const fn = vi.fn();
		bus.on('tree-selected', fn);
		bus.on('tree-selected', fn); // Set semantics — registered once
		bus.emit('tree-selected', 'x');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('off() removes a listener; other listeners keep firing', () => {
		const bus = createEventBus();
		const a = vi.fn();
		const b = vi.fn();
		bus.on('tree-selected', a);
		bus.on('tree-selected', b);
		bus.off('tree-selected', a);
		bus.emit('tree-selected', 'x');
		expect(a).not.toHaveBeenCalled();
		expect(b).toHaveBeenCalledOnce();
	});

	it('clear() removes everything (WorldCanvas teardown path)', () => {
		const bus = createEventBus();
		const fn = vi.fn();
		bus.on('tree-selected', fn);
		bus.on('world-ready', fn);
		bus.clear();
		bus.emit('tree-selected', 'x');
		bus.emit('world-ready');
		expect(fn).not.toHaveBeenCalled();
	});

	it('a listener unsubscribing mid-emit does not break delivery', () => {
		const bus = createEventBus();
		const calls: string[] = [];
		const a = () => {
			calls.push('a');
			bus.off('tree-selected', a); // mutates the set during emit
		};
		const b = () => calls.push('b');
		bus.on('tree-selected', a);
		bus.on('tree-selected', b);
		bus.emit('tree-selected', 'x');
		expect(calls).toEqual(['a', 'b']);

		// a is gone on the next emit
		bus.emit('tree-selected', 'y');
		expect(calls).toEqual(['a', 'b', 'b']);
	});

	it('emitting with no listeners is a no-op (no throw)', () => {
		const bus = createEventBus();
		expect(() => bus.emit('tree-selected', 'x')).not.toThrow();
	});

	it('buses are isolated — one canvas cannot hear another', () => {
		const bus1 = createEventBus();
		const bus2 = createEventBus();
		const fn = vi.fn();
		bus1.on('world-ready', fn);
		bus2.emit('world-ready');
		expect(fn).not.toHaveBeenCalled();
	});
});
