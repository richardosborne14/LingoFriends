/**
 * Procedural Animals for Garden World
 * 
 * Cute, boxy animals that wander outside the garden fence.
 * Minecraft-inspired low-poly style, each under 200 triangles.
 * 
 * Animal Types:
 * - Sheep: Woolly body, small head, slow wander
 * - Rabbit: Tall ears, hopping movement, fast pauses
 * - Deer: Slender body, optional antlers, slow pace
 * - Butterfly: Animated wing flap, sine-wave flight
 * - Bird: Flying path, higher Y position
 * 
 * @module renderer/objects/animals
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Animal types available for the garden world.
 */
export type AnimalType = 'sheep' | 'rabbit' | 'deer' | 'butterfly' | 'bird';

/**
 * State for an individual animal instance.
 */
export interface AnimalState {
  /** Type of animal */
  type: AnimalType;
  /** Three.js group containing the animal mesh */
  mesh: THREE.Group;
  /** Current world position */
  position: THREE.Vector3;
  /** Target position for movement (null when idle) */
  target: THREE.Vector3 | null;
  /** Movement speed in world units per second */
  speed: number;
  /** Seconds until next movement decision */
  pauseTimer: number;
  /** Whether this animal can enter the garden */
  canEnterGarden: boolean;
  /** Whether currently inside the garden fence */
  isInsideGarden: boolean;
  /** Animation phase offset (for variety) */
  animPhase: number;
}

/**
 * Configuration for spawning animals.
 */
export interface AnimalSpawnConfig {
  /** Garden size (for boundary calculation) */
  gardenSize: number;
  /** World size (for spawn area) */
  worldSize: number;
  /** Number of each animal type to spawn */
  counts: {
    sheep: number;
    rabbit: number;
    deer: number;
    butterfly: number;
    bird: number;
  };
}

/**
 * Default spawn configuration.
 */
export const DEFAULT_ANIMAL_CONFIG: AnimalSpawnConfig = {
  gardenSize: 10,
  worldSize: 30,
  counts: {
    sheep: 2,
    rabbit: 2,
    deer: 1,
    butterfly: 3,
    bird: 2,
  },
};

// ============================================================================
// ANIMAL BUILDERS
// ============================================================================

/**
 * Build a sheep mesh - woolly body with small head.
 * ~150 triangles
 */
function buildSheep(): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const woolMat = new THREE.MeshLambertMaterial({ color: 0xFFFAF0 }); // Off-white
  const faceMat = new THREE.MeshLambertMaterial({ color: 0x2C2C2C }); // Dark face
  const legMat = new THREE.MeshLambertMaterial({ color: 0x4A4A4A }); // Dark legs
  
  // Body (rounded box approximation using box)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.5),
    woolMat
  );
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);
  
  // Head (small box)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.18, 0.2),
    faceMat
  );
  head.position.set(0.35, 0.45, 0);
  head.castShadow = true;
  group.add(head);
  
  // Eyes (tiny white dots)
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.46, 0.48, 0.06);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.46, 0.48, -0.06);
  group.add(rightEye);
  
  // Legs (4 thin boxes)
  const legGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
  const legPositions = [
    { x: 0.2, z: 0.15 },
    { x: 0.2, z: -0.15 },
    { x: -0.2, z: 0.15 },
    { x: -0.2, z: -0.15 },
  ];
  
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(pos.x, 0.12, pos.z);
    leg.castShadow = true;
    group.add(leg);
  }
  
  return group;
}

/**
 * Build a rabbit mesh - tall ears, hopping pose.
 * ~100 triangles
 */
function buildRabbit(): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xD4A574 }); // Brown
  const earMat = new THREE.MeshLambertMaterial({ color: 0xE8C9A0 }); // Inner ear pink
  const noseMat = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 }); // Pink nose
  
  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.2, 0.2),
    bodyMat
  );
  body.position.y = 0.15;
  body.castShadow = true;
  group.add(body);
  
  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.15, 0.15),
    bodyMat
  );
  head.position.set(0.15, 0.28, 0);
  head.castShadow = true;
  group.add(head);
  
  // Ears (tall thin boxes)
  const earGeo = new THREE.BoxGeometry(0.03, 0.15, 0.04);
  const leftEar = new THREE.Mesh(earGeo, bodyMat);
  leftEar.position.set(0.15, 0.42, 0.04);
  leftEar.rotation.z = 0.1;
  group.add(leftEar);
  
  const rightEar = new THREE.Mesh(earGeo, bodyMat);
  rightEar.position.set(0.15, 0.42, -0.04);
  rightEar.rotation.z = -0.1;
  group.add(rightEar);
  
  // Nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.03, 0.03),
    noseMat
  );
  nose.position.set(0.25, 0.28, 0);
  group.add(nose);
  
  // Hind legs (larger, at back)
  const hindLegGeo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
  const leftHind = new THREE.Mesh(hindLegGeo, bodyMat);
  leftHind.position.set(-0.08, 0.05, 0.06);
  group.add(leftHind);
  const rightHind = new THREE.Mesh(hindLegGeo, bodyMat);
  rightHind.position.set(-0.08, 0.05, -0.06);
  group.add(rightHind);
  
  // Front legs (smaller)
  const frontLegGeo = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  const leftFront = new THREE.Mesh(frontLegGeo, bodyMat);
  leftFront.position.set(0.1, 0.04, 0.05);
  group.add(leftFront);
  const rightFront = new THREE.Mesh(frontLegGeo, bodyMat);
  rightFront.position.set(0.1, 0.04, -0.05);
  group.add(rightFront);
  
  // Tail (small white ball)
  const tail = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
  );
  tail.position.set(-0.15, 0.18, 0);
  group.add(tail);
  
  return group;
}

/**
 * Build a deer mesh - slender body, optional antlers.
 * ~160 triangles
 */
function buildDeer(hasAntlers: boolean = true): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 }); // Brown
  const antlerMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 }); // Dark brown
  
  // Body (elongated box)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.25, 0.25),
    bodyMat
  );
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);
  
  // Head (elongated)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.12),
    bodyMat
  );
  head.position.set(0.32, 0.6, 0);
  head.castShadow = true;
  group.add(head);
  
  // Snout
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.06),
    bodyMat
  );
  snout.position.set(0.43, 0.57, 0);
  group.add(snout);
  
  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.BoxGeometry(0.02, 0.02, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.38, 0.62, 0.05);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.38, 0.62, -0.05);
  group.add(rightEye);
  
  // Antlers (if male)
  if (hasAntlers) {
    const antlerGeo = new THREE.ConeGeometry(0.02, 0.15, 4);
    const leftAntler = new THREE.Mesh(antlerGeo, antlerMat);
    leftAntler.position.set(0.28, 0.75, 0.05);
    leftAntler.rotation.z = 0.2;
    group.add(leftAntler);
    
    const rightAntler = new THREE.Mesh(antlerGeo, antlerMat);
    rightAntler.position.set(0.28, 0.75, -0.05);
    rightAntler.rotation.z = -0.2;
    group.add(rightAntler);
    
    // Antler branches
    const branchGeo = new THREE.ConeGeometry(0.015, 0.08, 4);
    const leftBranch = new THREE.Mesh(branchGeo, antlerMat);
    leftBranch.position.set(0.25, 0.72, 0.08);
    leftBranch.rotation.z = 0.6;
    group.add(leftBranch);
    
    const rightBranch = new THREE.Mesh(branchGeo, antlerMat);
    rightBranch.position.set(0.25, 0.72, -0.08);
    rightBranch.rotation.z = -0.6;
    group.add(rightBranch);
  }
  
  // Legs (tall and thin)
  const legGeo = new THREE.BoxGeometry(0.05, 0.35, 0.05);
  const legPositions = [
    { x: 0.18, z: 0.08 },
    { x: 0.18, z: -0.08 },
    { x: -0.18, z: 0.08 },
    { x: -0.18, z: -0.08 },
  ];
  
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(pos.x, 0.18, pos.z);
    leg.castShadow = true;
    group.add(leg);
  }
  
  // Tail (small)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.04),
    bodyMat
  );
  tail.position.set(-0.28, 0.5, 0);
  group.add(tail);
  
  return group;
}

/**
 * Build a butterfly mesh - animated wing flap.
 * ~50 triangles (very simple)
 */
function buildButterfly(): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const wingColors = [0xFF6B9D, 0xFFD93D, 0xC084FC, 0xFF8A65, 0x81D4FA];
  const wingColor = wingColors[Math.floor(Math.random() * wingColors.length)];
  const wingMat = new THREE.MeshLambertMaterial({ 
    color: wingColor,
    side: THREE.DoubleSide,
  });
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2C2C2C });
  
  // Body (thin cylinder)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6),
    bodyMat
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);
  
  // Wings (two flat planes that will be animated)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.12, 0.06);
  wingShape.lineTo(0.1, 0.14);
  wingShape.lineTo(0.04, 0.1);
  wingShape.lineTo(0, 0.15);
  wingShape.lineTo(0, 0);
  
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  
  // Left wing
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.name = 'leftWing';
  leftWing.position.set(0.01, 0, 0);
  leftWing.rotation.y = -Math.PI / 2;
  group.add(leftWing);
  
  // Right wing
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.name = 'rightWing';
  rightWing.position.set(-0.01, 0, 0);
  rightWing.rotation.y = Math.PI / 2;
  rightWing.scale.x = -1; // Mirror
  group.add(rightWing);
  
  // Antennae
  const antennaGeo = new THREE.BoxGeometry(0.01, 0.04, 0.01);
  const leftAntenna = new THREE.Mesh(antennaGeo, bodyMat);
  leftAntenna.position.set(0.04, 0.08, 0);
  leftAntenna.rotation.z = 0.3;
  group.add(leftAntenna);
  
  const rightAntenna = new THREE.Mesh(antennaGeo, bodyMat);
  rightAntenna.position.set(-0.04, 0.08, 0);
  rightAntenna.rotation.z = -0.3;
  group.add(rightAntenna);
  
  return group;
}

/**
 * Build a bird mesh - simple flying bird.
 * ~80 triangles
 */
function buildBird(): THREE.Group {
  const group = new THREE.Group();
  
  // Materials
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4169E1 }); // Royal blue
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x6495ED }); // Lighter blue
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xFFA500 }); // Orange beak
  
  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.1),
    bodyMat
  );
  body.castShadow = true;
  group.add(body);
  
  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.06),
    bodyMat
  );
  head.position.set(0.1, 0.02, 0);
  group.add(head);
  
  // Beak (small cone)
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.05, 4),
    beakMat
  );
  beak.position.set(0.18, 0.02, 0);
  beak.rotation.z = -Math.PI / 2;
  group.add(beak);
  
  // Eye
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.015, 0.01),
    new THREE.MeshLambertMaterial({ color: 0x000000 })
  );
  eye.position.set(0.14, 0.04, 0.03);
  group.add(eye);
  
  // Wings (animated flat planes)
  const wingGeo = new THREE.PlaneGeometry(0.2, 0.06);
  
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.name = 'leftWing';
  leftWing.position.set(-0.02, 0.04, 0.06);
  leftWing.rotation.x = 0.3;
  group.add(leftWing);
  
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.name = 'rightWing';
  rightWing.position.set(-0.02, 0.04, -0.06);
  rightWing.rotation.x = -0.3;
  group.add(rightWing);
  
  // Tail
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.02, 0.06),
    bodyMat
  );
  tail.position.set(-0.12, 0, 0);
  group.add(tail);
  
  return group;
}

// ============================================================================
// ANIMAL MANAGEMENT
// ============================================================================

/**
 * Create an animal of the specified type.
 */
export function buildAnimal(type: AnimalType): THREE.Group {
  switch (type) {
    case 'sheep':
      return buildSheep();
    case 'rabbit':
      return buildRabbit();
    case 'deer':
      return buildDeer(Math.random() > 0.5); // 50% chance of antlers
    case 'butterfly':
      return buildButterfly();
    case 'bird':
      return buildBird();
    default:
      return buildSheep();
  }
}

/**
 * Get movement parameters for an animal type.
 */
function getAnimalParams(type: AnimalType): {
  speed: number;
  pauseMin: number;
  pauseMax: number;
  canEnterGarden: boolean;
  yOffset: number;
} {
  switch (type) {
    case 'sheep':
      return { speed: 0.8, pauseMin: 2, pauseMax: 6, canEnterGarden: true, yOffset: 0 };
    case 'rabbit':
      return { speed: 1.5, pauseMin: 1, pauseMax: 3, canEnterGarden: true, yOffset: 0 };
    case 'deer':
      return { speed: 0.6, pauseMin: 3, pauseMax: 8, canEnterGarden: false, yOffset: 0 };
    case 'butterfly':
      return { speed: 1.0, pauseMin: 0.5, pauseMax: 2, canEnterGarden: true, yOffset: 0.5 };
    case 'bird':
      return { speed: 2.0, pauseMin: 0, pauseMax: 1, canEnterGarden: true, yOffset: 1.2 };
    default:
      return { speed: 1.0, pauseMin: 2, pauseMax: 5, canEnterGarden: false, yOffset: 0 };
  }
}

/**
 * Create an initial animal state with a spawn position.
 */
export function createAnimalState(
  type: AnimalType,
  gardenSize: number,
  worldSize: number,
  seededRandom: () => number
): AnimalState {
  const params = getAnimalParams(type);
  const mesh = buildAnimal(type);
  
  // Spawn position - outside garden, inside world
  let x: number;
  let z: number;
  
  // Choose a random edge to spawn on
  const edge = Math.floor(seededRandom() * 4);
  const halfGarden = gardenSize / 2;
  const halfWorld = worldSize / 2;
  
  switch (edge) {
    case 0: // North edge
      x = (seededRandom() - 0.5) * worldSize;
      z = -halfWorld + seededRandom() * (halfWorld - halfGarden - 1);
      break;
    case 1: // South edge
      x = (seededRandom() - 0.5) * worldSize;
      z = halfGarden + 1 + seededRandom() * (halfWorld - halfGarden - 1);
      break;
    case 2: // West edge
      x = -halfWorld + seededRandom() * (halfWorld - halfGarden - 1);
      z = (seededRandom() - 0.5) * worldSize;
      break;
    case 3: // East edge
      x = halfGarden + 1 + seededRandom() * (halfWorld - halfGarden - 1);
      z = (seededRandom() - 0.5) * worldSize;
      break;
    default:
      x = 0;
      z = 0;
  }
  
  const position = new THREE.Vector3(x, params.yOffset, z);
  mesh.position.copy(position);
  
  return {
    type,
    mesh,
    position: position.clone(),
    target: null,
    speed: params.speed,
    pauseTimer: seededRandom() * 2, // Start with a short pause
    canEnterGarden: params.canEnterGarden,
    isInsideGarden: false,
    animPhase: seededRandom() * Math.PI * 2, // Random animation offset
  };
}

/**
 * Pick a random wander target for an animal.
 */
export function pickWanderTarget(
  animal: AnimalState,
  gardenSize: number,
  worldSize: number,
  seededRandom: () => number
): THREE.Vector3 {
  const halfWorld = worldSize / 2;
  const halfGarden = gardenSize / 2;
  
  let x: number;
  let z: number;
  
  if (animal.canEnterGarden && seededRandom() > 0.7) {
    // 30% chance to enter garden if allowed
    x = (seededRandom() - 0.5) * gardenSize * 0.8;
    z = (seededRandom() - 0.5) * gardenSize * 0.8;
    animal.isInsideGarden = true;
  } else {
    // Stay outside garden
    do {
      x = (seededRandom() - 0.5) * worldSize;
      z = (seededRandom() - 0.5) * worldSize;
    } while (Math.abs(x) < halfGarden + 1 && Math.abs(z) < halfGarden + 1);
    animal.isInsideGarden = false;
  }
  
  return new THREE.Vector3(x, animal.position.y, z);
}

/**
 * Update an animal's position and animation.
 */
export function updateAnimal(
  animal: AnimalState,
  delta: number,
  elapsed: number,
  gardenSize: number,
  worldSize: number,
  seededRandom: () => number
): void {
  const params = getAnimalParams(animal.type);
  
  if (animal.target) {
    // Move toward target
    const direction = animal.target.clone().sub(animal.position);
    direction.y = 0; // Keep on ground plane
    const distance = direction.length();
    
    if (distance < 0.1) {
      // Arrived at target
      animal.target = null;
      animal.pauseTimer = params.pauseMin + seededRandom() * (params.pauseMax - params.pauseMin);
    } else {
      // Normalize and move
      direction.normalize();
      const moveDistance = Math.min(animal.speed * delta, distance);
      animal.position.add(direction.multiplyScalar(moveDistance));
      animal.mesh.position.copy(animal.position);
      
      // Face movement direction
      animal.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    }
  } else {
    // Pausing
    animal.pauseTimer -= delta;
    if (animal.pauseTimer <= 0) {
      // Pick new target
      animal.target = pickWanderTarget(animal, gardenSize, worldSize, seededRandom);
    }
  }
  
  // Animate wings for flying creatures
  if (animal.type === 'butterfly' || animal.type === 'bird') {
    const wingSpeed = animal.type === 'butterfly' ? 12 : 8;
    const wingAngle = Math.sin(elapsed * wingSpeed + animal.animPhase) * 0.6;
    
    const leftWing = animal.mesh.getObjectByName('leftWing');
    const rightWing = animal.mesh.getObjectByName('rightWing');
    
    if (leftWing) {
      leftWing.rotation.z = wingAngle;
    }
    if (rightWing) {
      rightWing.rotation.z = -wingAngle;
    }
  }
  
  // Subtle idle animation (head bob, breathing)
  if (animal.type === 'sheep' || animal.type === 'deer') {
    const bobAmount = 0.01;
    animal.mesh.position.y = animal.position.y + Math.sin(elapsed * 2 + animal.animPhase) * bobAmount;
  }
}