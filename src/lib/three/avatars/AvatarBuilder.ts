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
 *   - Hat (optional): varies by type
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

		headGroup.position.y = 1.15;
		group.add(headGroup);

		// ── OPTIONAL HAT ─────────────────────────────────────────────────
		if (options.hat && options.hat !== 'none') {
			const hat = this.buildHat(options.hat, hairMat, shirtMat);
			if (hat) {
				hat.position.y = 1.28;
				group.add(hat);
			}
		}

		// ── BODY / SHIRT ──────────────────────────────────────────────────
		const bodyGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.38, 10);
		const body = new THREE.Mesh(bodyGeo, shirtMat);
		body.name = 'body';
		body.position.y = 0.78;
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
	 * @param hatType - 'cap' | 'beanie' | 'crown' | 'none'
	 * @param hairMat - Used for beanie colour
	 * @param accentMat - Used for cap peak colour
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
				const crownMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#FFD84A') });
				const ringGeo = new THREE.TorusGeometry(0.19, 0.035, 6, 12);
				const ring = new THREE.Mesh(ringGeo, crownMat);
				ring.name = 'crown-ring';
				ring.rotation.x = Math.PI / 2;
				group.add(ring);

				// Three crown points
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
			default:
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
