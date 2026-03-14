/**
 * LingoFriends V2 — Avatar Builder
 *
 * Builds player and NPC avatars from Three.js geometry (Phase 4 MVP).
 * No external model files required — instant load, consistent style.
 *
 * WHY geometry avatars now, glTF later:
 *   Geometry loads instantly (no network request), works offline, and
 *   is consistent with the toon-shaded tree aesthetic. When we upgrade
 *   to Quaternius CC0 glTF models in Phase 5, the AvatarOptions interface
 *   stays the same — we just swap the builder implementation. All profile
 *   colour data (skinTone, hairColor, shirtColor) will map to glTF material
 *   overrides using the same hex values.
 *
 * Avatar anatomy (all geometry):
 *   - Head: SphereGeometry, skinTone colour
 *   - Eyes: two small SphereGeometry (dark)
 *   - Body/shirt: CylinderGeometry, shirtColor
 *   - Arms: two CylinderGeometry, shirtColor
 *   - Legs: two CylinderGeometry, dark colour
 *   - Hair: SphereGeometry cap, hairColor
 *   - Hat (optional): varies by type — ATTACHED TO headGroup so it moves with head
 *
 * TASK-V2-07 fixes:
 *   - Hat is now a child of headGroup (not root group) so it bobs with the head
 *   - Added 'headband' hat type to match StepAvatar.svelte options
 *   - Added gender-based body proportions (boy/girl/neutral affect body width/height)
 *
 * Animations (frame-based, no AnimationMixer — simple and predictable):
 *   - Idle: gentle Y bobbing (breathing effect)
 *   - Walk: oscillating leg rotation
 *
 * @module three/avatars/AvatarBuilder
 */

import * as THREE from 'three';
import type { AvatarOptions } from '$lib/types/garden';

/** How fast the idle breathing bob animates */
const IDLE_BOB_SPEED = 0.04;
/** Amplitude of breathing bob (metres) */
const IDLE_BOB_AMPLITUDE = 0.015;
/** How fast legs swing during walking */
const WALK_SWING_SPEED = 0.12;
/** Amplitude of leg swing (radians) */
const WALK_SWING_AMPLITUDE = 0.4;

/** Dark colour for legs, eyes, and shadow areas */
const DARK_COLOR = new THREE.Color('#2A2A2A');
/** Default pants colour — dark navy/charcoal */
const PANTS_COLOR = new THREE.Color('#3A3D6B');

/**
 * Gender-based body proportion presets.
 *
 * These are subtle cosmetic differences — the same colours and accessories
 * are available to all genders. Only width/height proportions differ.
 *
 * Why subtle differences: We want gentle visual differentiation without
 * enforcing stereotypes. The proportions are deliberately close together.
 * See PEDAGOGY.md — inclusive design.
 */
const GENDER_PRESETS = {
	boy: {
		bodyRadiusTop: 0.13,    // Slightly wider shoulders
		bodyRadiusBottom: 0.15,
		bodyHeight: 0.40,       // Slightly taller torso
	},
	girl: {
		bodyRadiusTop: 0.11,    // Slightly narrower shoulders
		bodyRadiusBottom: 0.13,
		bodyHeight: 0.37,       // Slightly shorter torso
	},
	neutral: {
		bodyRadiusTop: 0.12,    // Average of boy and girl
		bodyRadiusBottom: 0.14,
		bodyHeight: 0.38,
	},
} as const;

/** Shape of a gender body preset — numbers not literals */
interface BodyPreset {
	bodyRadiusTop: number;
	bodyRadiusBottom: number;
	bodyHeight: number;
}

/** Fallback to neutral proportions for unrecognised gender strings */
function getGenderPreset(gender: string): BodyPreset {
	if (gender === 'boy') return GENDER_PRESETS.boy;
	if (gender === 'girl') return GENDER_PRESETS.girl;
	return GENDER_PRESETS.neutral;
}

/**
 * Builds and animates geometry-based avatars.
 * One instance shared across all avatars in the scene.
 * State per-avatar is stored in group.userData to avoid
 * needing a separate registry.
 */
export class AvatarBuilder {
	/**
	 * Creates a complete avatar THREE.Group from profile options.
	 *
	 * The group's userData contains:
	 *   - animState: 'idle' | 'walk'
	 *   - animFrame: number (incremented each tick)
	 *   - parts: named sub-groups for easy animation access
	 *
	 * TASK-V2-07: Hat is now a child of headGroup so it moves with the head
	 * during idle animation. Gender preset affects body proportions.
	 *
	 * @param options - Avatar customisation from user profile
	 * @returns THREE.Group ready to be added to a scene
	 */
	buildAvatar(options: AvatarOptions): THREE.Group {
		const group = new THREE.Group();
		group.userData.animState = 'idle';
		group.userData.animFrame = 0;
		group.userData.type = 'avatar';

		const skinColor = new THREE.Color(options.skinTone || '#F5D0A9');
		const hairColor = new THREE.Color(options.hairColor || '#4A3728');
		const shirtColor = new THREE.Color(options.shirtColor || '#FF8A6A');

		const skinMat = new THREE.MeshToonMaterial({ color: skinColor });
		const hairMat = new THREE.MeshToonMaterial({ color: hairColor });
		const shirtMat = new THREE.MeshToonMaterial({ color: shirtColor });
		const pantsMat = new THREE.MeshToonMaterial({ color: PANTS_COLOR });
		const darkMat = new THREE.MeshToonMaterial({ color: DARK_COLOR });

		// Resolve gender-based body proportions
		const bodyPreset = getGenderPreset(options.gender || 'neutral');

		// ── HEAD ──────────────────────────────────────────────────────────
		const headGroup = new THREE.Group();
		headGroup.name = 'head';

		const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
		const head = new THREE.Mesh(headGeo, skinMat);
		head.name = 'face';
		headGroup.add(head);

		// Eyes — two small dark spheres
		[-0.07, 0.07].forEach((x, i) => {
			const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
			const eye = new THREE.Mesh(eyeGeo, darkMat);
			eye.name = `eye-${i}`;
			eye.position.set(x, 0.04, 0.15);
			headGroup.add(eye);
		});

		// Hair cap — slightly larger sphere on top, clipping gives hairline effect
		const hairGeo = new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
		const hair = new THREE.Mesh(hairGeo, hairMat);
		hair.name = 'hair';
		hair.position.y = 0.06;
		headGroup.add(hair);

		// Girl gender preset: add longer hair strands on the sides
		if (options.gender === 'girl') {
			[-0.12, 0.12].forEach((x, i) => {
				const strandGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.18, 6);
				const strand = new THREE.Mesh(strandGeo, hairMat);
				strand.name = `hair-strand-${i}`;
				// Position strands hanging down from sides of head
				strand.position.set(x, -0.09, 0);
				headGroup.add(strand);
			});
		}

		// ── OPTIONAL HAT — ATTACHED TO headGroup (TASK-V2-07 fix) ───────
		// CRITICAL: hat must be a child of headGroup, NOT the root group.
		// This ensures the hat bobs with the head during idle animation.
		// Previous bug: hat was added to `group` at a fixed world Y=1.28,
		// so it hovered independently when the head moved.
		if (options.hat && options.hat !== 'none') {
			const hat = this.buildHat(options.hat, hairMat, shirtMat);
			if (hat) {
				// Position relative to head top (head sphere radius = 0.18, so top ≈ +0.18)
				// Each hat type may fine-tune this Y further in buildHat()
				hat.position.y = 0.16;
				headGroup.add(hat); // ← child of headGroup, not root group
			}
		}

		headGroup.position.y = 1.15;
		group.add(headGroup);

		// ── BODY / SHIRT — gender-proportioned ────────────────────────────
		const bodyGeo = new THREE.CylinderGeometry(
			bodyPreset.bodyRadiusTop,
			bodyPreset.bodyRadiusBottom,
			bodyPreset.bodyHeight,
			10
		);
		const body = new THREE.Mesh(bodyGeo, shirtMat);
		body.name = 'body';
		// Adjust body Y based on height so feet stay on the ground
		body.position.y = 0.58 + bodyPreset.bodyHeight / 2;
		group.add(body);

		// ── ARMS ──────────────────────────────────────────────────────────
		const armGroup = new THREE.Group();
		armGroup.name = 'arms';

		[-0.18, 0.18].forEach((x, i) => {
			const armGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.3, 8);
			const arm = new THREE.Mesh(armGeo, shirtMat);
			arm.name = `arm-${i}`;
			arm.position.set(x, 0.8, 0);
			// Tilt arms slightly outward
			arm.rotation.z = i === 0 ? 0.25 : -0.25;
			armGroup.add(arm);
		});

		group.add(armGroup);

		// ── LEGS ──────────────────────────────────────────────────────────
		const legGroup = new THREE.Group();
		legGroup.name = 'legs';

		[-0.07, 0.07].forEach((x, i) => {
			const legGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.4, 8);
			const leg = new THREE.Mesh(legGeo, pantsMat);
			leg.name = `leg-${i}`;
			// Pivot at hip — position so leg hangs down from body base
			leg.position.set(x, 0.38, 0);
			legGroup.add(leg);
		});

		group.add(legGroup);

		// Feet (small flattened spheres)
		[-0.07, 0.07].forEach((x, i) => {
			const footGeo = new THREE.SphereGeometry(0.065, 8, 6);
			footGeo.scale(1, 0.5, 1.2);
			const foot = new THREE.Mesh(footGeo, darkMat);
			foot.name = `foot-${i}`;
			foot.position.set(x, 0.17, 0.02);
			group.add(foot);
		});

		return group;
	}

	/**
	 * Builds an optional hat for the avatar.
	 * Returns null for unknown hat types (graceful degradation).
	 *
	 * The hat group's local origin is at the hat's base, so positioning
	 * within headGroup at y=0.16 (head top) places it correctly.
	 *
	 * TASK-V2-07: Added 'headband' type to match StepAvatar.svelte options.
	 *
	 * @param hatType - 'cap' | 'beanie' | 'crown' | 'headband' | 'none'
	 * @param hairMat - Used for beanie colour
	 * @param accentMat - Used for cap/headband colour
	 */
	buildHat(
		hatType: string,
		hairMat: THREE.Material,
		accentMat: THREE.Material
	): THREE.Group | null {
		const group = new THREE.Group();

		switch (hatType) {
			case 'cap': {
				// Baseball cap — cylinder top + flat brim
				const capGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.14, 12);
				const cap = new THREE.Mesh(capGeo, accentMat);
				cap.name = 'cap-top';
				group.add(cap);

				const brimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.025, 12);
				const brim = new THREE.Mesh(brimGeo, accentMat);
				brim.name = 'cap-brim';
				// Brim is offset forward (z) and slightly down (y) from cap body
				brim.position.set(0.04, -0.07, 0.1);
				group.add(brim);
				break;
			}
			case 'beanie': {
				// Beanie — dome with folded cuff
				const beanieDomeGeo = new THREE.SphereGeometry(
					0.2,
					12,
					8,
					0,
					Math.PI * 2,
					0,
					Math.PI * 0.6
				);
				const beanie = new THREE.Mesh(beanieDomeGeo, hairMat);
				beanie.name = 'beanie';
				group.add(beanie);
				break;
			}
			case 'crown': {
				// Crown — ring with cone spikes (boss/special reward hat)
				// Uses a gold material regardless of avatar colours
				const crownMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#FFD84A') });
				const ringGeo = new THREE.TorusGeometry(0.19, 0.035, 6, 12);
				const ring = new THREE.Mesh(ringGeo, crownMat);
				ring.name = 'crown-ring';
				ring.rotation.x = Math.PI / 2;
				group.add(ring);

				// Three crown points evenly spaced around the ring
				for (let i = 0; i < 3; i++) {
					const angle = (i / 3) * Math.PI * 2;
					const spikeGeo = new THREE.ConeGeometry(0.04, 0.12, 6);
					const spike = new THREE.Mesh(spikeGeo, crownMat);
					spike.name = `crown-spike-${i}`;
					spike.position.set(Math.cos(angle) * 0.18, 0.08, Math.sin(angle) * 0.18);
					group.add(spike);
				}
				break;
			}
			case 'headband': {
				// Headband — flat torus band sitting across the forehead
				// Uses accentMat (shirt colour) for a coordinated look.
				// Positioned slightly forward (z) and angled to sit on the forehead,
				// not the crown of the head.
				const bandMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#FF8A6A') });
				const bandGeo = new THREE.TorusGeometry(
					0.20,   // ring radius — matches head sphere radius + small gap
					0.028,  // tube radius — thin band
					6,
					12
				);
				const band = new THREE.Mesh(bandGeo, bandMat);
				band.name = 'headband';
				// Tilt the torus to lie flat around the head (like a headband)
				band.rotation.x = Math.PI / 2;
				// Move slightly up so it sits at mid-forehead, not chin
				band.position.y = 0.02;
				group.add(band);
				break;
			}
			default:
				// Unknown hat type — return null for graceful degradation
				return null;
		}

		return group;
	}

	/**
	 * Applies the idle breathing animation for one frame tick.
	 * Call this from the render loop when avatar state is 'idle'.
	 *
	 * Stores animation frame state in group.userData.animFrame.
	 *
	 * @param group - The avatar group to animate
	 */
	tickIdle(group: THREE.Group): void {
		group.userData.animFrame = (group.userData.animFrame || 0) + IDLE_BOB_SPEED;
		const bob = Math.sin(group.userData.animFrame) * IDLE_BOB_AMPLITUDE;
		group.position.y = bob;
	}

	/**
	 * Applies the walking leg-swing animation for one frame tick.
	 * Call from the render loop when avatar is moving.
	 *
	 * @param group - The avatar group to animate
	 */
	tickWalk(group: THREE.Group): void {
		group.userData.animFrame = (group.userData.animFrame || 0) + WALK_SWING_SPEED;

		const legGroup = group.getObjectByName('legs') as THREE.Group | undefined;
		if (!legGroup) return;

		const legLeft = legGroup.getObjectByName('leg-0');
		const legRight = legGroup.getObjectByName('leg-1');
		const swing = Math.sin(group.userData.animFrame) * WALK_SWING_AMPLITUDE;

		if (legLeft) legLeft.rotation.x = swing;
		if (legRight) legRight.rotation.x = -swing;
	}

	/**
	 * Sets the avatar's animation state to 'idle'.
	 * Resets legs to neutral position.
	 *
	 * @param group - The avatar group
	 */
	playIdle(group: THREE.Group): void {
		group.userData.animState = 'idle';

		// Reset leg positions
		const legGroup = group.getObjectByName('legs') as THREE.Group | undefined;
		if (legGroup) {
			legGroup.children.forEach((leg) => {
				leg.rotation.x = 0;
			});
		}
	}

	/**
	 * Sets the avatar's animation state to 'walk'.
	 *
	 * @param group - The avatar group
	 */
	playWalk(group: THREE.Group): void {
		group.userData.animState = 'walk';
	}

	/**
	 * Updates avatar animations for one frame. Call from the render loop.
	 * Dispatches to tickIdle or tickWalk based on animState.
	 *
	 * @param group - The avatar group
	 */
	tick(group: THREE.Group): void {
		if (group.userData.animState === 'walk') {
			this.tickWalk(group);
		} else {
			this.tickIdle(group);
		}
	}
}
