/**
 * LingoFriends V2 — Garden & Avatar Types
 *
 * Shared interfaces for the Three.js garden scene, avatar system,
 * and tree panel. These are pure data types — no DB imports.
 *
 * Kept separate from lesson.ts because the garden domain is distinct:
 * it maps DB state to visual state, not to pedagogical state.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TREE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Visual health states for trees — maps from numeric health (0-100)
 * to a display tier used to select colours and geometry variants.
 *
 * Intentionally coarser than a raw percentage — 5 distinct visual states
 * are enough for kids to read at a glance.
 */
export type TreeHealthState = 'full' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Data needed to render a single tree in the garden scene.
 * Derived from userTrees DB row + calculated health (from treeHealthService).
 */
export interface TreeData {
	/** DB UUID — used as raycasting hit ID */
	id: string;
	/** Garden grid position (metres, centred on origin) */
	positionX: number;
	positionY: number;
	/** Growth stage 0-14 (see sunDropService.calculateGrowthStage) */
	growthStage: number;
	/** Calculated health 0-100 (may differ from DB value post-decay) */
	health: number;
	/** Name of the skill path this tree represents */
	pathName: string;
	/** Icon emoji for the skill path */
	pathIcon: string;
	/** Number of lessons completed on this tree */
	lessonsCompleted: number;
	/** Total SunDrops earned from this tree */
	sunDropsEarned: number;
	/** Lesson steps for the trail in TreePanel */
	lessonSteps: LessonStep[];
}

/**
 * One step in the lesson trail shown inside TreePanel.
 * The `state` is derived from lesson history at load time.
 */
export interface LessonStep {
	/** Numeric index (0-based) in the skill path */
	index: number;
	title: string;
	icon: string;
	/** 'completed' = done; 'current' = next to do; 'locked' = not yet unlocked */
	state: 'completed' | 'current' | 'locked';
	/**
	 * The lesson ID to pass to /lesson/[id] — only present for current/completed.
	 * Uses format: `{treeId}-{index}` to reconstruct context on the lesson API.
	 */
	lessonId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for building a geometry avatar.
 * Maps directly to profile columns.
 *
 * NOTE: These are geometry-based avatars for Phase 4 MVP.
 * Phase 5+ will upgrade to Quaternius glTF models — these fields
 * will still be used for material swaps on the glTF.
 */
export interface AvatarOptions {
	skinTone: string;   // hex colour, e.g. '#F5D0A9'
	hairColor: string;  // hex colour, e.g. '#4A3728'
	shirtColor: string; // hex colour, e.g. '#FF8A6A'
	hat: string;        // 'none' | 'cap' | 'beanie' | 'crown'
	gender: string;     // 'masculine' | 'feminine' | 'neutral'
}

// ─────────────────────────────────────────────────────────────────────────────
// NPC TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for building an NPC in the lesson coaching scene.
 * Generated deterministically from lesson seed + step index.
 */
export interface NPCConfig {
	/** Body colour (shirt equivalent) */
	bodyColor: string;
	/** Skin tone */
	skinTone: string;
	/** Hair colour */
	hairColor: string;
	/** Scale multiplier — boss NPCs are 1.3× size */
	scale: number;
	/** Boss NPCs get a cone crown and gold tint */
	isBoss: boolean;
	/** Emotion state drives head tilt / eye position */
	emotion: 'happy' | 'thinking' | 'surprised';
}

// ─────────────────────────────────────────────────────────────────────────────
// GARDEN PAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data returned from the garden page server load.
 * Subset of DB data enriched with calculated health.
 */
export interface GardenPageData {
	trees: TreeData[];
	avatar: AvatarOptions;
	stats: GardenStats;
}

/** Stats shown in the floating garden header */
export interface GardenStats {
	totalSunDrops: number;
	currentStreak: number;
	gems: number;
}
