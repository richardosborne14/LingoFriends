/**
 * Garden Utilities — client-safe helpers for the garden UI.
 *
 * WHY THIS FILE EXISTS: getHealthBarColor is used in TreePanel.svelte (a
 * client component) but was originally in $lib/server/lessons/treeHealthService.ts.
 * SvelteKit forbids importing $lib/server/ into browser code. This file holds
 * the pure display helpers that the garden UI needs on the client side.
 */

/**
 * Maps a tree's health percentage to a Tailwind background colour class.
 * Thresholds: ≥70 = green (healthy), ≥30 = yellow (warning), <30 = red (critical).
 *
 * @param health - Health percentage 0–100
 * @returns Tailwind bg colour class
 */
export function getHealthBarColor(health: number): string {
	if (health >= 70) return 'bg-forest-400';
	if (health >= 30) return 'bg-sundrop-500';
	return 'bg-red-500';
}
