/**
 * Garden Page — Universal load (TASK-FUN-03).
 *
 * Merges the server load data with the post-lesson celebration stashed in
 * sessionStorage by CompletionScreen. Read HERE (not in the component) so
 * the value exists before WorldCanvas mounts — the Phaser scene needs it at
 * boot to render the tree at its PRE-lesson stage and play the growth.
 *
 * The stash is cleared on read: refreshing the garden replays nothing.
 */

import { browser } from '$app/environment';
import type { PageLoad } from './$types';

/** Celebration payload written by CompletionScreen after a lesson save. */
export interface GardenCelebration {
	treeId: string;
	fromStage: number;
	toStage: number;
	sunDrops: number;
}

const STORAGE_KEY = 'lf-garden-celebration';

export const load: PageLoad = async ({ data }) => {
	let celebration: GardenCelebration | null = null;

	if (browser) {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (raw) {
				sessionStorage.removeItem(STORAGE_KEY); // one-shot
				const parsed = JSON.parse(raw);
				// Validate shape — a stale/corrupt stash must not break the garden
				if (parsed && typeof parsed.treeId === 'string' && typeof parsed.toStage === 'number') {
					celebration = parsed as GardenCelebration;
				}
			}
		} catch {
			// Storage unavailable (private mode) — garden simply skips the celebration
		}
	}

	return { ...data, celebration };
};
