/**
 * LingoFriends V2 — Garden Service
 *
 * Server-side DB queries for the garden page.
 * Fetches trees, skill paths, and lesson history, then assembles
 * the TreeData objects needed by GardenCanvas and TreePanel.
 *
 * Responsibilities:
 *   - getUserTrees: fetch + enrich tree rows with health and lesson steps
 *   - getGardenProfile: fetch profile + map to AvatarOptions
 *   - buildLessonSteps: determine completed/current/locked states from history
 *
 * This module ONLY reads data — no mutations.
 * Tree health is calculated here (on-the-fly), not stored in DB.
 *
 * @module server/garden/gardenService
 */

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { profiles, userTrees, skillPaths, lessonHistory } from '$lib/server/db/schema';
import type { SkillPath, UserTree } from '$lib/server/db/schema';
import { calculateTreeHealthFromRow } from '$lib/server/lessons/treeHealthService';
import type { AvatarOptions, GardenStats, TreeData, LessonStep } from '$lib/types/garden';

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the user's profile and maps it to AvatarOptions + GardenStats.
 * Returns null if profile not found (shouldn't happen post-onboarding).
 */
export async function getGardenProfile(
	userId: string
): Promise<{ avatar: AvatarOptions; stats: GardenStats } | null> {
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	if (!profile) return null;

	const avatar: AvatarOptions = {
		skinTone: profile.avatarSkinTone ?? '#F5D0A9',
		hairColor: profile.avatarHairColor ?? '#4A3728',
		shirtColor: profile.avatarShirtColor ?? '#FF8A6A',
		hat: profile.avatarHat ?? 'none',
		gender: profile.avatarGender ?? 'neutral',
	};

	const stats: GardenStats = {
		totalSunDrops: profile.totalSunDrops ?? 0,
		currentStreak: profile.currentStreak ?? 0,
		// Gems aren't on the profiles table yet — default to 0
		// TODO: add gems column to profiles in Phase 5
		gems: 0,
	};

	return { avatar, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// TREES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all trees for a user and enriches them with:
 *   - Calculated health (from treeHealthService, not DB value)
 *   - Skill path name and icon
 *   - Lesson step trail (completed/current/locked states)
 *
 * @param userId - The authenticated user's UUID
 * @returns Array of TreeData ready for the garden scene
 */
export async function getUserTrees(userId: string): Promise<TreeData[]> {
	// Explicit join — avoids needing Drizzle relations defined in schema
	const treeRows = await db
		.select({
			tree: userTrees,
			path: skillPaths,
		})
		.from(userTrees)
		.leftJoin(skillPaths, eq(userTrees.skillPathId, skillPaths.id))
		.where(eq(userTrees.userId, userId));

	// Fetch lesson history for this user (to determine step states)
	const history = await db
		.select({
			treeId: lessonHistory.treeId,
			lessonIndex: lessonHistory.lessonIndex,
		})
		.from(lessonHistory)
		.where(eq(lessonHistory.userId, userId));

	// Index history by treeId → Set of completed lessonIndexes
	const completedByTree = new Map<string, Set<number>>();
	for (const h of history) {
		if (!completedByTree.has(h.treeId)) {
			completedByTree.set(h.treeId, new Set());
		}
		completedByTree.get(h.treeId)!.add(h.lessonIndex);
	}

	return treeRows.map(({ tree, path }) => {
		const health = calculateTreeHealthFromRow(tree);
		const completedIndexes = completedByTree.get(tree.id) ?? new Set<number>();
		const lessonDefs = (path?.lessonDefinitions ?? []) as {
			title: string;
			icon: string;
			topic: string;
			order: number;
		}[];
		const lessonSteps = buildLessonSteps(tree.id, lessonDefs, completedIndexes);

		return {
			id: tree.id,
			positionX: tree.positionX ?? 0,
			positionY: tree.positionY ?? 0,
			growthStage: tree.growthStage ?? 0,
			health,
			pathName: path?.name ?? 'Unknown Path',
			pathIcon: path?.icon ?? '🌱',
			lessonsCompleted: tree.lessonsCompleted ?? 0,
			sunDropsEarned: tree.sunDropsEarned ?? 0,
			lessonSteps,
		};
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON STEPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the lesson step trail for a tree.
 *
 * State rules:
 *   - completed: lessonIndex is in completedIndexes
 *   - current: the first lesson NOT completed (can be done now)
 *   - locked: everything after the current lesson
 *
 * This is a simple linear progression — each lesson unlocks the next.
 * No branching or optional steps in Phase 4.
 *
 * @param treeId - The tree's UUID (used to build lessonId)
 * @param lessonDefs - Array from skillPath.lessonDefinitions
 * @param completedIndexes - Set of completed lessonIndex values
 * @returns Array of LessonStep objects
 */
export function buildLessonSteps(
	treeId: string,
	lessonDefs: { title: string; icon: string; topic: string; order: number }[],
	completedIndexes: Set<number>
): LessonStep[] {
	// Sort by order field to ensure correct sequence
	const sorted = [...lessonDefs].sort((a, b) => a.order - b.order);

	let foundCurrent = false;

	return sorted.map((def, index) => {
		const isCompleted = completedIndexes.has(index);

		if (isCompleted) {
			return {
				index,
				title: def.title,
				icon: def.icon,
				state: 'completed' as const,
				// Completed lessons are replayable
				lessonId: `${treeId}-${index}`,
			};
		}

		if (!foundCurrent) {
			// First uncompleted lesson = current
			foundCurrent = true;
			return {
				index,
				title: def.title,
				icon: def.icon,
				state: 'current' as const,
				lessonId: `${treeId}-${index}`,
			};
		}

		// Everything after current = locked
		return {
			index,
			title: def.title,
			icon: def.icon,
			state: 'locked' as const,
		};
	});
}
